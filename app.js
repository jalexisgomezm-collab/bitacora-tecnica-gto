// Bitácora Técnica GTO – Laboratorio y Taller
const SB_URL = 'https://ggjhhjqgmarmmhrwsyva.supabase.co';
const SB_KEY = 'sb_publishable_DuWLnCiQGNlTFCZBi44cRQ_ghupPvN2';
const CORREO_DNI = dni => dni + '@usuarios.bitacora-gto.pe';
const TIPO_LINK = new URLSearchParams(location.hash.slice(1)).get('type'); // invite / recovery desde el correo
const sb = supabase.createClient(SB_URL, SB_KEY);
const BUCKET = 'bitacora-fotos';

const TIPOS = { RECEPCION: 'Recepción', DIAGNOSTICO: 'Diagnóstico', REPARACION: 'Reparación', MANTENIMIENTO: 'Mantenimiento', PRUEBAS: 'Pruebas', ARMADO: 'Armado', LIMPIEZA: 'Limpieza', FABRICACION: 'Fabricación', EMBALAJE: 'Embalaje', OTRO: 'Otro' };
const ESTADOS = { EN_PROCESO: ['En proceso', ''], TERMINADO: ['Terminado', ''], PENDIENTE: ['Pendiente', 'amb'], DETENIDO: ['Detenido', 'rojo'] };

let YO = null;            // perfil del usuario
let CACHE = { ot: null, perfiles: null };

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const fdate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fdt = d => d ? new Date(d).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const esSup = () => YO && ['supervisor', 'gerencia', 'admin'].includes(YO.rol);
function toast(m, ms = 3000) { const t = $('#toast'); t.textContent = m; t.classList.remove('hidden'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), ms); }
function modal(html) { $('#modal-body').innerHTML = html; $('#modal').classList.remove('hidden'); }
function cerrarModal() { $('#modal').classList.add('hidden'); $('#modal-body').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') cerrarModal(); });
const chipEstado = e => `<span class="chip ${ESTADOS[e]?.[1] || ''}">${ESTADOS[e]?.[0] || e}</span>`;

async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }

// reduce fotos a 1600 px JPEG para ahorrar espacio
function comprimir(file, max = 1600, q = 0.8) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(b => { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('No se pudo procesar la foto')); }, 'image/jpeg', q);
    };
    img.onerror = () => rej(new Error('Archivo de imagen no válido')); img.src = url;
  });
}

async function cargarOT(force) {
  if (!CACHE.ot || force) { const { data } = await sb.from('ot').select('id,numero,clase,nombre,cliente,estado,estado_operativo,tipo').order('numero', { ascending: false }); CACHE.ot = data || []; }
  return CACHE.ot;
}
async function cargarPerfiles() {
  if (!CACHE.perfiles) { const { data } = await sb.from('perfiles').select('id,nombre,rol,area,cargo,activo'); CACHE.perfiles = Object.fromEntries((data || []).map(p => [p.id, p])); }
  return CACHE.perfiles;
}
const nombreCorto = n => { if (!n) return '—'; const [ap, no] = n.split(','); return no ? (no.trim().split(' ')[0] + ' ' + ap.trim().split(' ')[0]) : n; };
const titleCase = s => String(s || '').toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase());

// ---------- ingreso ----------
async function pantallaIngreso(msg) {
  $('#nav').innerHTML = ''; $('#who').innerHTML = '';
  const { data: lista } = await sb.rpc('lista_ingreso');
  $('#app').innerHTML = `
  <div class="login card">
    <div style="text-align:center"><img src="logo-gto.png" alt="GTO"><h1>Bitácora Técnica</h1><div class="muted">Laboratorio y Taller · GTO PERÚ</div></div>
    <div class="tabs"><button id="t-trab" class="on">Trabajador</button><button id="t-ger">Gerencia</button></div>
    ${msg ? `<p class="chip amb" style="display:block;padding:8px">${esc(msg)}</p>` : ''}
    <div id="f-trab">
      <label>Tu nombre</label>
      <select id="l-nom"><option value="">— Elige tu nombre —</option>${(lista || []).map(p => `<option>${esc(p.nombre)}</option>`).join('')}</select>
      <div style="height:10px"></div><label>Tu DNI</label><input id="l-dni" inputmode="numeric" maxlength="8" placeholder="8 dígitos">
      <div id="l-pinbox" class="hidden"><div style="height:10px"></div><label id="l-pinlbl">PIN (6 números)</label><input id="l-pin" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password">
        <div id="l-pin2box" class="hidden"><div style="height:8px"></div><label>Repite tu nuevo PIN</label><input id="l-pin2" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div></div>
      <div style="height:14px"></div><button class="pri" id="l-ok" style="width:100%;justify-content:center">Continuar</button>
      <p class="muted" style="margin-top:10px">La primera vez crearás un PIN de 6 números que solo tú conocerás. Si lo olvidas, pide al supervisor que lo restablezca.</p>
    </div>
    <div id="f-ger" class="hidden">
      <label>Correo</label><input id="g-mail" type="email" autocomplete="username">
      <div style="height:10px"></div><label>Contraseña</label><input id="g-pass" type="password" autocomplete="current-password">
      <div style="height:14px"></div><button class="pri" id="g-ok" style="width:100%;justify-content:center">Ingresar</button>
      <p><a href="#" id="g-olv" class="muted">Olvidé mi contraseña</a></p>
    </div>
  </div>`;
  const tab = t => { $('#t-trab').classList.toggle('on', t === 'trab'); $('#t-ger').classList.toggle('on', t === 'ger'); $('#f-trab').classList.toggle('hidden', t !== 'trab'); $('#f-ger').classList.toggle('hidden', t !== 'ger'); };
  $('#t-trab').onclick = () => tab('trab'); $('#t-ger').onclick = () => tab('ger');
  let modo = null;
  $('#l-ok').onclick = async () => {
    const nombre = $('#l-nom').value, dni = $('#l-dni').value.trim();
    if (!nombre) return toast('Elige tu nombre'); if (!/^\d{8}$/.test(dni)) return toast('El DNI debe tener 8 dígitos');
    const btn = $('#l-ok'); btn.disabled = true;
    try {
      if (!modo) {
        const { data: st, error } = await sb.rpc('estado_dni', { p_nombre: nombre, p_dni: dni });
        if (error) throw error;
        if (st === 'NO_COINCIDE') throw new Error('El DNI no corresponde a la persona elegida');
        modo = st; $('#l-pinbox').classList.remove('hidden'); $('#l-nom').disabled = true; $('#l-dni').disabled = true;
        if (modo === 'CREAR_PIN') { $('#l-pinlbl').textContent = 'Crea tu PIN (6 números)'; $('#l-pin2box').classList.remove('hidden'); btn.textContent = 'Crear PIN e ingresar'; }
        else btn.textContent = 'Ingresar';
        $('#l-pin').focus(); return;
      }
      const pin = $('#l-pin').value.trim();
      if (!/^\d{6}$/.test(pin)) throw new Error('El PIN debe tener 6 números');
      if (modo === 'CREAR_PIN') {
        if (pin !== $('#l-pin2').value.trim()) throw new Error('Los PIN no coinciden');
        const r = await fetch(SB_URL + '/functions/v1/bitacora-pin', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify({ accion: 'crear', dni, nombre, pin }) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error || 'No se pudo crear el PIN');
      }
      const { error } = await sb.auth.signInWithPassword({ email: CORREO_DNI(dni), password: pin });
      if (error) throw new Error(error.message.includes('Invalid') ? 'PIN incorrecto' : error.message);
      iniciar();
    } catch (e) { toast(e.message, 4500); } finally { btn.disabled = false; }
  };
  $('#g-ok').onclick = async () => {
    const { error } = await sb.auth.signInWithPassword({ email: $('#g-mail').value.trim(), password: $('#g-pass').value });
    if (error) return toast(error.message.includes('Invalid') ? 'Correo o contraseña incorrectos' : error.message);
    iniciar();
  };
  $('#g-olv').onclick = async e => {
    e.preventDefault(); const m = $('#g-mail').value.trim(); if (!m) return toast('Escribe tu correo');
    const { error } = await sb.auth.resetPasswordForEmail(m, { redirectTo: location.origin + '/' });
    toast(error ? error.message : 'Te enviamos un correo para crear una nueva contraseña', 5000);
  };
}

function pantallaClave() {
  $('#app').innerHTML = `<div class="login card"><h1>Crear contraseña</h1><label>Nueva contraseña (mínimo 8 caracteres)</label><input id="c1" type="password" autocomplete="new-password"><div style="height:8px"></div><label>Repítela</label><input id="c2" type="password" autocomplete="new-password"><div style="height:12px"></div><button class="pri" id="c-ok">Guardar</button></div>`;
  $('#c-ok').onclick = async () => {
    const a = $('#c1').value, b = $('#c2').value;
    if (a.length < 8) return toast('Mínimo 8 caracteres'); if (a !== b) return toast('No coinciden');
    const { error } = await sb.auth.updateUser({ password: a }); if (error) return toast(error.message);
    toast('Contraseña guardada'); history.replaceState(null, '', location.pathname + '#/'); location.reload();
  };
}

// ---------- arranque ----------
async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return pantallaIngreso();
  if (TIPO_LINK === 'invite' || TIPO_LINK === 'recovery' || location.hash.startsWith('#/clave')) { history.replaceState(null, '', location.pathname + '#/clave'); return pantallaClave(); }
  const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!p || !p.activo) { await sb.auth.signOut(); return pantallaIngreso('Tu usuario no está activo. Consulta con el supervisor.'); }
  YO = p; CACHE = { ot: null, perfiles: null };
  const links = [['#/', 'Mi día'], ['#/ot', 'OT / PI'], ['#/serie', 'Historial por serie'], ['#/reporte', 'Reporte']];
  if (esSup()) links.push(['#/revision', 'Revisión'], ['#/personal', 'Personal']);
  $('#nav').innerHTML = links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('');
  $('#who').innerHTML = `<span>${esc(titleCase(nombreCorto(p.nombre)))} · ${esc(p.rol)}</span><button class="sm" id="salir">Salir</button>`;
  $('#salir').onclick = async () => { await sb.auth.signOut(); YO = null; location.hash = '#/'; pantallaIngreso(); };
  router();
}
window.addEventListener('hashchange', () => { if (YO) router(); else if (location.hash.startsWith('#/clave')) iniciar(); });
sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') { location.hash = '#/clave'; pantallaClave(); } });

function router() {
  const h = location.hash || '#/';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', h === a.getAttribute('href') || (a.getAttribute('href') !== '#/' && h.startsWith(a.getAttribute('href')))));
  const [, ruta, id] = h.split('/');
  if (ruta === 'clave') return pantallaClave();
  if (ruta === 'ot' && id) return vistaOT(id);
  if (ruta === 'ot') return listaOT();
  if (ruta === 'serie') return vistaSerie(decodeURIComponent(id || ''));
  if (ruta === 'reporte') return vistaReporte(id);
  if (ruta === 'revision' && esSup()) return vistaRevision();
  if (ruta === 'personal' && esSup()) return vistaPersonal();
  return miDia(id);
}

// ---------- tarjetas de avance ----------
async function fotosFirmadas(avs) {
  const ids = avs.map(a => a.id); if (!ids.length) return {};
  const { data: f } = await sb.from('avance_fotos').select('avance_id,storage_path').in('avance_id', ids);
  if (!f || !f.length) return {};
  const { data: urls } = await sb.storage.from(BUCKET).createSignedUrls(f.map(x => x.storage_path), 3600);
  const out = {}; f.forEach((x, i) => { (out[x.avance_id] ||= []).push(urls?.[i]?.signedUrl); });
  return out;
}
function tarjeta(a, per, otMap, fotos, opts = {}) {
  const o = otMap[a.ot_id] || {}; const t = per[a.tecnico_id];
  const puede = esSup() || (a.tecnico_id === YO.id && a.fecha >= new Date(Date.now() - 3 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }));
  return `<div class="av">
    <div class="h"><div><b class="mono">${esc(o.numero || '—')}</b> <span class="muted">${esc(o.nombre || '')}</span></div>
      <div>${chipEstado(a.estado)} <span class="chip gris">${TIPOS[a.tipo_trabajo] || a.tipo_trabajo}</span> ${a.horas != null ? `<span class="chip gris">${a.horas} h</span>` : ''} ${a.revisado_at ? '<span class="chip" title="Revisado por el supervisor">✔ Revisado</span>' : ''}</div></div>
    <div class="muted">${opts.fecha ? fdate(a.fecha) + ' · ' : ''}${esc(titleCase(t?.nombre || ''))}${a.numero_serie ? ` · Serie <a href="#/serie/${encodeURIComponent(a.numero_serie)}" class="mono">${esc(a.numero_serie)}</a>` : ''}${a.equipo ? ' · ' + esc(a.equipo) : ''}</div>
    <p>${esc(a.actividad).replace(/\n/g, '<br>')}</p>
    ${a.hallazgos ? `<p><span class="k">HALLAZGOS:</span> ${esc(a.hallazgos).replace(/\n/g, '<br>')}</p>` : ''}
    ${a.repuestos ? `<p><span class="k">REPUESTOS / MATERIALES:</span> ${esc(a.repuestos)}</p>` : ''}
    ${a.observaciones ? `<p><span class="k">OBSERVACIONES:</span> ${esc(a.observaciones)}</p>` : ''}
    ${(fotos[a.id] || []).length ? `<div class="fotos">${fotos[a.id].map(u => `<img src="${esc(u)}" loading="lazy" onclick="window.open(this.src)">`).join('')}</div>` : ''}
    ${puede && !opts.soloLectura ? `<div style="margin-top:8px;display:flex;gap:6px"><button class="sm" data-edit="${a.id}">Editar</button>${(esSup() || a.fecha === hoyLima()) ? `<button class="sm peligro" data-del="${a.id}">Eliminar</button>` : ''}${esSup() && !a.revisado_at ? `<button class="sm" data-rev="${a.id}">Marcar revisado</button>` : ''}</div>` : ''}
  </div>`;
}
function enlazarTarjetas(cont, avs, recargar) {
  cont.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => formAvance(avs.find(a => a.id === b.dataset.edit), recargar));
  cont.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('¿Eliminar este registro? No se puede deshacer.')) return;
    const { data: f } = await sb.from('avance_fotos').select('storage_path').eq('avance_id', b.dataset.del);
    if (f?.length) await sb.storage.from(BUCKET).remove(f.map(x => x.storage_path));
    const { error } = await sb.from('avances').delete().eq('id', b.dataset.del); if (error) return toast(error.message);
    toast('Registro eliminado'); recargar();
  });
  cont.querySelectorAll('[data-rev]').forEach(b => b.onclick = async () => {
    const { error } = await sb.from('avances').update({ revisado_por: YO.id, revisado_at: new Date().toISOString() }).eq('id', b.dataset.rev);
    if (error) return toast(error.message); toast('Marcado como revisado'); recargar();
  });
}

// ---------- Mi día ----------
async function miDia(fecha) {
  fecha = fecha || hoyLima();
  const per = await cargarPerfiles(); const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o]));
  const tecnicos = Object.values(per).filter(p => p.activo && ['tecnico', 'supervisor'].includes(p.rol));
  const verTodos = esSup();
  $('#app').innerHTML = `<h1>${verTodos ? 'Actividades del día' : 'Mi día'}</h1>
   <div class="card row no-print"><div><label>Fecha</label><input type="date" id="f-fecha" value="${fecha}" max="${hoyLima()}"></div>
   ${verTodos ? `<div><label>Técnico</label><select id="f-tec"><option value="">Todos</option>${tecnicos.map(t => `<option value="${t.id}">${esc(titleCase(t.nombre))}</option>`).join('')}</select></div>` : ''}
   <div style="flex:0 0 auto"><button class="pri" id="nuevo">+ Registrar avance</button></div></div>
   <div id="kp" class="kpis"></div><div id="lista" style="margin-top:12px"><div class="loading">Cargando…</div></div>`;
  $('#f-fecha').onchange = e => { location.hash = '#/dia/' + e.target.value; };
  const cargar = async () => {
    let q = sb.from('avances').select('*').eq('fecha', fecha).order('created_at');
    const tec = verTodos ? $('#f-tec')?.value : YO.id; if (tec) q = q.eq('tecnico_id', tec);
    const { data: avs } = await q; const fotos = await fotosFirmadas(avs || []);
    const horas = (avs || []).reduce((s, a) => s + (+a.horas || 0), 0);
    $('#kp').innerHTML = `<div class="kpi"><b>${(avs || []).length}</b>registros</div><div class="kpi"><b>${horas.toFixed(1)}</b>horas</div><div class="kpi"><b>${new Set((avs || []).map(a => a.ot_id)).size}</b>OT / PI</div>`;
    $('#lista').innerHTML = (avs || []).length ? avs.map(a => tarjeta(a, per, otMap, fotos)).join('') : `<div class="card muted">No hay registros para este día. Usa “Registrar avance”.</div>`;
    enlazarTarjetas($('#lista'), avs || [], cargar);
  };
  if (verTodos) $('#f-tec').onchange = cargar;
  $('#nuevo').onclick = () => formAvance({ fecha }, cargar);
  cargar();
}

// ---------- formulario ----------
async function formAvance(a, despues) {
  a = a || {}; const ots = await cargarOT();
  const activos = ots.filter(o => o.estado !== 'finalizado' && o.estado !== 'cancelado');
  const opt = o => `<option value="${o.id}" ${o.id === a.ot_id ? 'selected' : ''}>${esc(o.numero)} · ${esc((o.nombre || '').slice(0, 70))}${o.cliente ? ' · ' + esc(o.cliente) : ''}</option>`;
  const otros = ots.filter(o => !activos.includes(o));
  modal(`<h1>${a.id ? 'Editar avance' : 'Registrar avance'}</h1>
   <div class="row"><div style="flex:2 1 320px"><label>OT / Proyecto interno *</label><select id="a-ot"><option value="">— Elige —</option>
     <optgroup label="En curso">${activos.map(opt).join('')}</optgroup><optgroup label="Cerradas / historial">${otros.map(opt).join('')}</optgroup></select></div>
     <div><label>Fecha</label><input type="date" id="a-fecha" value="${a.fecha || hoyLima()}" max="${hoyLima()}" ${esSup() ? '' : 'min="' + new Date(Date.now() - 3 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) + '"'}></div></div>
   <div class="row" style="margin-top:8px"><div style="flex:2 1 300px"><label>Equipo / componente</label><select id="a-comp"><option value="">— Sin componente específico —</option></select></div>
     <div><label>N° de serie</label><input id="a-serie" value="${esc(a.numero_serie || '')}" placeholder="Si no está en la lista"></div></div>
   <div style="margin-top:8px"><label>Descripción del equipo / tarjeta</label><input id="a-equipo" value="${esc(a.equipo || '')}" placeholder="Ej. Tarjeta de disparo A5002"></div>
   <div class="row" style="margin-top:8px"><div><label>Tipo de trabajo</label><select id="a-tipo">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}" ${k === (a.tipo_trabajo || 'REPARACION') ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
     <div><label>Horas</label><input id="a-horas" type="number" step="0.25" min="0" max="24" value="${a.horas ?? ''}"></div>
     <div><label>Estado</label><select id="a-estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${k === (a.estado || 'EN_PROCESO') ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>
   <div style="margin-top:8px"><label>Trabajo realizado *</label><textarea id="a-act" placeholder="¿Qué hiciste?">${esc(a.actividad || '')}</textarea></div>
   <div style="margin-top:8px"><label>Hallazgos / fallas encontradas</label><textarea id="a-hal">${esc(a.hallazgos || '')}</textarea></div>
   <div style="margin-top:8px"><label>Repuestos / materiales usados</label><input id="a-rep" value="${esc(a.repuestos || '')}"></div>
   <div style="margin-top:8px"><label>Observaciones</label><input id="a-obs" value="${esc(a.observaciones || '')}"></div>
   <div style="margin-top:8px"><label>Fotos (se reducen automáticamente)</label><input id="a-fotos" type="file" accept="image/*" multiple capture="environment"></div>
   <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end"><button id="a-cancel">Cancelar</button><button class="pri" id="a-ok">Guardar</button></div>`);
  const cargarComp = async () => {
    const id = $('#a-ot').value; const sel = $('#a-comp');
    sel.innerHTML = '<option value="">— Sin componente específico —</option>'; if (!id) return;
    const { data } = await sb.from('componentes').select('id,descripcion,marca,modelo,numero_serie').eq('ot_id', id);
    (data || []).forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}" ${c.id === a.componente_id ? 'selected' : ''} data-serie="${esc(c.numero_serie || '')}">${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}${c.numero_serie ? ' · S/N ' + esc(c.numero_serie) : ''}</option>`));
  };
  $('#a-ot').onchange = cargarComp; await cargarComp();
  $('#a-comp').onchange = e => { const s = e.target.selectedOptions[0]?.dataset.serie; if (s) $('#a-serie').value = s; };
  $('#a-cancel').onclick = cerrarModal;
  $('#a-ok').onclick = async () => {
    const reg = { ot_id: $('#a-ot').value, fecha: $('#a-fecha').value, componente_id: $('#a-comp').value || null, numero_serie: $('#a-serie').value.trim() || null,
      equipo: $('#a-equipo').value.trim() || null, tipo_trabajo: $('#a-tipo').value, horas: $('#a-horas').value === '' ? null : +$('#a-horas').value,
      estado: $('#a-estado').value, actividad: $('#a-act').value.trim(), hallazgos: $('#a-hal').value.trim() || null, repuestos: $('#a-rep').value.trim() || null, observaciones: $('#a-obs').value.trim() || null };
    if (!reg.ot_id) return toast('Elige la OT o proyecto'); if (!reg.actividad) return toast('Describe el trabajo realizado');
    const btn = $('#a-ok'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      let id = a.id;
      if (id) { const { error } = await sb.from('avances').update(reg).eq('id', id); if (error) throw error; }
      else { const { data, error } = await sb.from('avances').insert(reg).select('id').single(); if (error) throw error; id = data.id; }
      const files = [...$('#a-fotos').files];
      for (const f of files) {
        const blob = await comprimir(f); const path = `${id}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' }); if (error) throw error;
        await sb.from('avance_fotos').insert({ avance_id: id, storage_path: path, nombre: f.name });
      }
      cerrarModal(); toast('Avance guardado'); despues && despues();
    } catch (e) { toast(e.message, 5000); btn.disabled = false; btn.textContent = 'Guardar'; }
  };
}

// ---------- OT / PI ----------
async function listaOT() {
  const ots = await cargarOT();
  $('#app').innerHTML = `<h1>OT y Proyectos Internos</h1><div class="card row"><div><label>Buscar</label><input id="q" placeholder="N° de OT, nombre o cliente"></div>
   <div style="flex:0 0 200px"><label>Mostrar</label><select id="fil"><option value="act">En curso</option><option value="">Todas</option></select></div></div>
   <div class="card" style="padding:0;overflow:auto"><table><thead><tr><th>N°</th><th>Servicio / proyecto</th><th>Cliente</th><th>Estado</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const pintar = () => {
    const q = $('#q').value.toLowerCase(), f = $('#fil').value;
    const l = ots.filter(o => (!f || (o.estado !== 'finalizado' && o.estado !== 'cancelado')) && (!q || [o.numero, o.nombre, o.cliente].join(' ').toLowerCase().includes(q)));
    $('#tb').innerHTML = l.map(o => `<tr class="click" data-id="${o.id}"><td class="mono">${esc(o.numero)}</td><td>${esc(o.nombre)}</td><td>${esc(o.cliente || (o.clase === 'INTERNO' ? 'Proyecto interno' : ''))}</td><td><span class="chip gris">${esc(o.estado_operativo || o.estado || '')}</span></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin resultados</td></tr>';
    $('#tb').querySelectorAll('tr[data-id]').forEach(r => r.onclick = () => location.hash = '#/ot/' + r.dataset.id);
  };
  $('#q').oninput = pintar; $('#fil').onchange = pintar; pintar();
}

async function abrirInforme(path) {
  const w = window.open('', '_blank'); if (w) w.document.write('Abriendo informe…');
  const { data, error } = await sb.rpc('informe_url', { p_path: path });
  if (error || !data) { if (w) w.close(); return toast(error?.message || 'No se pudo abrir el informe'); }
  if (w) w.location = data; else location.href = data;
}
function tablaInformes(infs, conOT, otMap) {
  if (!infs.length) return '<div class="muted">Sin informes técnicos registrados.</div>';
  return `<table><thead><tr><th>N°</th>${conOT ? '<th>OT</th>' : ''}<th>Título</th><th>Fecha</th><th></th></tr></thead><tbody>${infs.map(i => `<tr><td class="mono">${esc(i.numero || '')}</td>${conOT ? `<td class="mono">${esc(otMap[i.ot_id]?.numero || '')}</td>` : ''}<td>${esc(i.titulo || '')}</td><td>${i.fecha ? fdate(i.fecha) : ''}</td><td>${(i.archivos || []).map(a => `<button class="sm" data-pdf="${esc(a.path)}">Ver PDF</button>`).join(' ')}</td></tr>`).join('')}</tbody></table>`;
}

async function vistaOT(id) {
  const per = await cargarPerfiles(); const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o])); const o = otMap[id];
  if (!o) { $('#app').innerHTML = '<div class="card">OT no encontrada.</div>'; return; }
  const [{ data: comps }, { data: infs }, { data: avs }] = await Promise.all([
    sb.from('componentes').select('*').eq('ot_id', id), sb.from('informes').select('*').eq('ot_id', id).order('numero'),
    sb.from('avances').select('*').eq('ot_id', id).order('fecha', { ascending: false }).order('created_at', { ascending: false })]);
  const fotos = await fotosFirmadas(avs || []);
  const horas = (avs || []).reduce((s, a) => s + (+a.horas || 0), 0);
  let html = `<p class="no-print"><a href="#/ot">← OT / PI</a></p><h1><span class="mono">${esc(o.numero)}</span> · ${esc(o.nombre)}</h1>
   <div class="muted">${esc(o.cliente || (o.clase === 'INTERNO' ? 'Proyecto interno' : ''))} · ${esc(o.tipo || '')} · ${esc(o.estado_operativo || o.estado || '')}</div>
   <div class="kpis" style="margin-top:10px"><div class="kpi"><b>${(avs || []).length}</b>registros</div><div class="kpi"><b>${horas.toFixed(1)}</b>horas</div><div class="kpi"><b>${new Set((avs || []).map(a => a.tecnico_id)).size}</b>técnicos</div></div>
   <h2>Equipos / componentes</h2><div class="card" style="padding:0;overflow:auto">${(comps || []).length ? `<table><thead><tr><th>Descripción</th><th>N° parte</th><th>N° serie</th></tr></thead><tbody>${comps.map(c => `<tr><td>${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}</td><td class="mono">${esc(c.numero_parte || '')}</td><td>${c.numero_serie ? `<a class="mono" href="#/serie/${encodeURIComponent(c.numero_serie)}">${esc(c.numero_serie)}</a>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">Sin componentes registrados en el Maestro.</div>'}</div>
   <h2>Informes técnicos</h2><div class="card" style="overflow:auto">${tablaInformes(infs || [], false)}</div>
   <h2>Historial de trabajos</h2><div class="no-print" style="margin-bottom:8px"><button class="pri" id="nuevo">+ Registrar avance en esta OT</button></div><div id="tl">`;
  let dia = null;
  for (const a of (avs || [])) { if (a.fecha !== dia) { dia = a.fecha; html += `<div class="dia">${fdate(dia)}</div>`; } html += tarjeta(a, per, otMap, fotos); }
  if (!(avs || []).length) html += '<div class="card muted">Aún no hay trabajos registrados.</div>';
  $('#app').innerHTML = html + '</div>';
  $('#app').querySelectorAll('[data-pdf]').forEach(b => b.onclick = () => abrirInforme(b.dataset.pdf));
  $('#nuevo').onclick = () => formAvance({ ot_id: id, fecha: hoyLima() }, () => vistaOT(id));
  enlazarTarjetas($('#tl'), avs || [], () => vistaOT(id));
}

// ---------- historial por serie ----------
async function vistaSerie(serie) {
  $('#app').innerHTML = `<h1>Historial clínico por N° de serie</h1><div class="card row"><div><label>N° de serie</label><input id="s-q" value="${esc(serie)}" placeholder="Ej. 2143001349"></div><div style="flex:0 0 auto"><button class="pri" id="s-ok">Buscar</button></div></div><div id="s-res"></div>`;
  const ir = () => { const v = $('#s-q').value.trim(); if (v) location.hash = '#/serie/' + encodeURIComponent(v); };
  $('#s-ok').onclick = ir; $('#s-q').onkeydown = e => e.key === 'Enter' && ir();
  if (!serie) return;
  const s = serie.toUpperCase().replace(/[%,()]/g, '');
  const per = await cargarPerfiles(); const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o]));
  const [{ data: comps }, { data: avs }] = await Promise.all([
    sb.from('componentes').select('*').ilike('numero_serie', `%${s}%`),
    sb.from('avances').select('*').ilike('numero_serie', `%${s}%`).order('fecha', { ascending: false })]);
  const otIds = [...new Set([...(comps || []).map(c => c.ot_id), ...(avs || []).map(a => a.ot_id)])];
  const { data: infs } = otIds.length ? await sb.from('informes').select('*').in('ot_id', otIds).order('fecha', { ascending: false }) : { data: [] };
  const fotos = await fotosFirmadas(avs || []);
  let html = `<div class="kpis"><div class="kpi"><b>${otIds.length}</b>OT / ingresos</div><div class="kpi"><b>${(avs || []).length}</b>trabajos registrados</div><div class="kpi"><b>${(infs || []).length}</b>informes técnicos</div></div>`;
  html += `<h2>Ingresos del equipo</h2><div class="card" style="padding:0;overflow:auto">${otIds.length ? `<table><thead><tr><th>OT</th><th>Servicio</th><th>Cliente</th><th>Equipo</th></tr></thead><tbody>${otIds.map(i => { const o = otMap[i] || {}; const c = (comps || []).find(x => x.ot_id === i); return `<tr class="click" onclick="location.hash='#/ot/${i}'"><td class="mono">${esc(o.numero || '')}</td><td>${esc(o.nombre || '')}</td><td>${esc(o.cliente || '')}</td><td>${esc(c ? [c.descripcion, c.numero_serie].filter(Boolean).join(' · ') : '')}</td></tr>`; }).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">No se encontró ese N° de serie.</div>'}</div>`;
  html += `<h2>Informes técnicos de esos ingresos</h2><div class="card" style="overflow:auto">${tablaInformes(infs || [], true, otMap)}</div>`;
  html += `<h2>Trabajos realizados</h2><div id="tl">${(avs || []).map(a => tarjeta(a, per, otMap, fotos, { fecha: true, soloLectura: true })).join('') || '<div class="card muted">Sin trabajos registrados en la bitácora.</div>'}</div>`;
  $('#s-res').innerHTML = html;
  $('#s-res').querySelectorAll('[data-pdf]').forEach(b => b.onclick = () => abrirInforme(b.dataset.pdf));
}

// ---------- reporte ----------
async function vistaReporte(fecha) {
  fecha = fecha || hoyLima();
  $('#app').innerHTML = `<div class="card row no-print"><div><label>Fecha del reporte</label><input type="date" id="r-f" value="${fecha}" max="${hoyLima()}"></div>
    <div style="flex:0 0 auto;display:flex;gap:6px"><button id="r-pdf">Descargar PDF</button><button id="r-xls">Descargar Excel</button></div></div>
   <div class="card no-print row"><div><label>Exportar periodo · desde</label><input type="date" id="r-d" value="${fecha.slice(0, 8)}01"></div><div><label>hasta</label><input type="date" id="r-h" value="${fecha}"></div><div style="flex:0 0 auto"><button id="r-per">Excel del periodo</button></div></div>
   <div id="r-body"><div class="loading">Cargando…</div></div>`;
  $('#r-f').onchange = e => location.hash = '#/reporte/' + e.target.value;
  const { data: r, error } = await sb.rpc('reporte_dia', { p_fecha: fecha });
  if (error) { $('#r-body').innerHTML = `<div class="card">${esc(error.message)}</div>`; return; }
  const tec = r.tecnicos || [];
  $('#r-body').innerHTML = `<div class="rep-h"><img src="logo-gto.png"><div style="text-align:right"><b>REPORTE DIARIO DE ACTIVIDADES</b><br>Laboratorio y Taller · ${fdate(fecha)}</div></div>
   <h1 class="no-print">Reporte diario · ${fdate(fecha)}</h1>
   ${!r.laborable ? `<p><span class="chip amb">${r.feriado ? 'Feriado: ' + esc(r.feriado) : 'Fin de semana'}${r.total_registros ? ' · día extra' : ''}</span></p>` : ''}
   <div class="kpis"><div class="kpi"><b>${r.total_registros}</b>registros</div><div class="kpi"><b>${(+r.total_horas).toFixed(1)}</b>horas</div><div class="kpi"><b>${tec.filter(t => t.registros > 0).length} / ${tec.length}</b>técnicos con registro</div></div>
   ${tec.map(t => `<h2>${esc(titleCase(t.nombre))} <span class="muted">· ${esc(t.cargo || '')} · ${t.registros} registro(s) · ${(+t.horas).toFixed(1)} h</span></h2>
     ${t.items.length ? `<div class="card" style="padding:0;overflow:auto"><table><thead><tr><th>OT / PI</th><th>Equipo / serie</th><th>Tipo</th><th>Trabajo realizado</th><th>Hallazgos</th><th>Repuestos</th><th>Horas</th><th>Estado</th></tr></thead><tbody>${t.items.map(i => `<tr><td class="mono">${esc(i.ot)}<div class="muted">${esc((i.cliente || '').slice(0, 30))}</div></td><td>${esc(i.equipo || '')}${i.serie ? `<div class="mono muted">${esc(i.serie)}</div>` : ''}</td><td>${TIPOS[i.tipo] || i.tipo}</td><td>${esc(i.actividad)}</td><td>${esc(i.hallazgos || '')}</td><td>${esc(i.repuestos || '')}</td><td>${i.horas ?? ''}</td><td>${ESTADOS[i.estado]?.[0] || i.estado}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card muted">Sin registros en el día.</div>'}`).join('')}`;
  $('#r-pdf').onclick = () => window.print();
  $('#r-xls').onclick = () => {
    const rows = []; tec.forEach(t => t.items.forEach(i => rows.push({ Fecha: fecha, Tecnico: t.nombre, Cargo: t.cargo, OT: i.ot, Servicio: i.ot_nombre, Cliente: i.cliente, Equipo: i.equipo, Serie: i.serie, Tipo: TIPOS[i.tipo] || i.tipo, Trabajo: i.actividad, Hallazgos: i.hallazgos, Repuestos: i.repuestos, Horas: i.horas, Estado: ESTADOS[i.estado]?.[0] || i.estado })));
    if (!rows.length) return toast('No hay registros ese día');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Reporte'); XLSX.writeFile(wb, `Reporte_diario_${fecha}.xlsx`);
  };
  $('#r-per').onclick = async () => {
    const d = $('#r-d').value, h = $('#r-h').value; if (!d || !h || d > h) return toast('Revisa el periodo');
    const per = await cargarPerfiles(); const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o]));
    const { data } = await sb.from('avances').select('*').gte('fecha', d).lte('fecha', h).order('fecha').order('created_at');
    if (!data?.length) return toast('Sin registros en el periodo');
    const rows = data.map(a => ({ Fecha: a.fecha, Tecnico: per[a.tecnico_id]?.nombre, OT: otMap[a.ot_id]?.numero, Servicio: otMap[a.ot_id]?.nombre, Cliente: otMap[a.ot_id]?.cliente, Equipo: a.equipo, Serie: a.numero_serie, Tipo: TIPOS[a.tipo_trabajo], Trabajo: a.actividad, Hallazgos: a.hallazgos, Repuestos: a.repuestos, Horas: a.horas, Estado: ESTADOS[a.estado]?.[0], Revisado: a.revisado_at ? 'Sí' : 'No' }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Bitacora'); XLSX.writeFile(wb, `Bitacora_${d}_al_${h}.xlsx`);
  };
}

// ---------- revisión (supervisor / gerencia) ----------
async function vistaRevision() {
  const per = await cargarPerfiles(); const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o]));
  $('#app').innerHTML = `<h1>Revisión de registros</h1><p class="muted">Registros de los últimos 15 días aún no revisados.</p><div id="tl"><div class="loading">Cargando…</div></div>`;
  const cargar = async () => {
    const desde = new Date(Date.now() - 15 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const { data: avs } = await sb.from('avances').select('*').is('revisado_at', null).gte('fecha', desde).order('fecha', { ascending: false });
    const fotos = await fotosFirmadas(avs || []);
    $('#tl').innerHTML = (avs || []).map(a => tarjeta(a, per, otMap, fotos, { fecha: true })).join('') || '<div class="card muted">Todo revisado. ✔</div>';
    enlazarTarjetas($('#tl'), avs || [], cargar);
  };
  cargar();
}

// ---------- personal y feriados ----------
async function vistaPersonal() {
  const { data: pers, error } = await sb.from('personal').select('*').order('nombre');
  const { data: fer } = await sb.from('feriados').select('*').gte('fecha', hoyLima()).order('fecha');
  $('#app').innerHTML = `<h1>Personal de Laboratorio y Taller</h1>
   ${error ? `<div class="card">${esc(error.message)}</div>` : ''}
   <div class="card" style="padding:0;overflow:auto"><table><thead><tr><th>Nombre</th><th>Cargo</th><th>Área</th><th>Rol</th><th>Ingreso</th><th></th></tr></thead><tbody>
   ${(pers || []).map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(p.cargo || '')}</td><td>${esc(p.area)}</td><td>${esc(p.rol)}</td><td>${!p.activo ? '<span class="chip rojo">Inactivo</span>' : p.reset_pendiente ? '<span class="chip amb">Debe crear PIN nuevo</span>' : p.activado ? '<span class="chip">PIN creado</span>' : '<span class="chip gris">Aún no ingresa</span>'}</td>
     <td style="white-space:nowrap">${p.activado ? `<button class="sm" data-reset="${esc(p.dni)}">Restablecer PIN</button>` : ''} <button class="sm" data-act="${esc(p.dni)}" data-v="${p.activo ? 0 : 1}">${p.activo ? 'Desactivar' : 'Activar'}</button></td></tr>`).join('')}</tbody></table></div>
   <h2>Agregar trabajador</h2><div class="card row"><div><label>DNI</label><input id="p-dni" maxlength="8" inputmode="numeric"></div><div style="flex:2 1 260px"><label>Apellidos y nombres</label><input id="p-nom" placeholder="APELLIDOS, NOMBRES"></div>
     <div><label>Cargo</label><input id="p-car"></div><div><label>Área</label><select id="p-area"><option>LABORATORIO</option><option>TALLER</option></select></div><div><label>Rol</label><select id="p-rol"><option value="tecnico">Técnico</option><option value="supervisor">Supervisor</option></select></div><div style="flex:0 0 auto"><button class="pri" id="p-ok">Agregar</button></div></div>
   <h2>Feriados próximos</h2><p class="muted">Esos días no se envía el reporte de las 7:00 pm, salvo que haya registros (día extra).</p>
   <div class="card row"><div><label>Fecha</label><input type="date" id="fe-f"></div><div style="flex:2 1 260px"><label>Descripción</label><input id="fe-d"></div><div style="flex:0 0 auto"><button id="fe-ok">Agregar feriado</button></div></div>
   <div class="card" style="padding:0">${(fer || []).length ? `<table><tbody>${fer.map(f => `<tr><td>${fdate(f.fecha)}</td><td>${esc(f.descripcion)}</td><td style="text-align:right"><button class="sm peligro" data-fer="${f.fecha}">Quitar</button></td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">Sin feriados próximos.</div>'}</div>`;
  $('#app').querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
    if (!confirm('El trabajador deberá crear un PIN nuevo en su próximo ingreso. ¿Continuar?')) return;
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch(SB_URL + '/functions/v1/bitacora-pin', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ accion: 'reset', dni: b.dataset.reset }) });
    const j = await r.json(); if (!r.ok) return toast(j.error || 'Error'); toast('PIN restablecido'); vistaPersonal();
  });
  $('#app').querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
    const { error } = await sb.from('personal').update({ activo: b.dataset.v === '1' }).eq('dni', b.dataset.act); if (error) return toast(error.message);
    const p = (pers || []).find(x => x.dni === b.dataset.act); if (p?.perfil_id) await sb.from('perfiles').update({ activo: b.dataset.v === '1' }).eq('id', p.perfil_id);
    vistaPersonal();
  });
  $('#p-ok').onclick = async () => {
    const reg = { dni: $('#p-dni').value.trim(), nombre: $('#p-nom').value.trim().toUpperCase(), cargo: $('#p-car').value.trim() || null, area: $('#p-area').value, rol: $('#p-rol').value };
    if (!/^\d{8}$/.test(reg.dni)) return toast('DNI de 8 dígitos'); if (!reg.nombre) return toast('Escribe el nombre');
    const { error } = await sb.from('personal').insert(reg); if (error) return toast(error.message); toast('Trabajador agregado'); vistaPersonal();
  };
  $('#fe-ok').onclick = async () => {
    const f = $('#fe-f').value, dsc = $('#fe-d').value.trim(); if (!f || !dsc) return toast('Fecha y descripción');
    const { error } = await sb.from('feriados').insert({ fecha: f, descripcion: dsc }); if (error) return toast(error.message); vistaPersonal();
  };
  $('#app').querySelectorAll('[data-fer]').forEach(b => b.onclick = async () => { await sb.from('feriados').delete().eq('fecha', b.dataset.fer); vistaPersonal(); });
}

iniciar();

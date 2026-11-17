// Bitácora Técnica GTO – Laboratorio y Taller
const SB_URL = 'https://ggjhhjqgmarmmhrwsyva.supabase.co';
const SB_KEY = 'sb_publishable_DuWLnCiQGNlTFCZBi44cRQ_ghupPvN2';
const CORREO_DNI = dni => dni + '@usuarios.bitacora-gto.pe';
const TIPO_LINK = new URLSearchParams(location.hash.slice(1)).get('type'); // invite / recovery desde el correo
const sb = supabase.createClient(SB_URL, SB_KEY);
const BUCKET = 'bitacora-fotos';

const TIPOS = { RECEPCION: 'Recepción', DIAGNOSTICO: 'Diagnóstico', REPARACION: 'Reparación', MANTENIMIENTO: 'Mantenimiento', PRUEBAS: 'Pruebas', ARMADO: 'Armado', LIMPIEZA: 'Limpieza', FABRICACION: 'Fabricación', EMBALAJE: 'Embalaje', OTRO: 'Otro' };
const MOTIVOS = { SECADO: 'Secado / curado', ESPERA_MATERIAL: 'Espera de material', ESPERA_REPUESTO: 'Espera de repuesto', VOLUMEN: 'Alto volumen (varias unidades)', RETRABAJO: 'Retrabajo / corrección', PRUEBAS_LARGAS: 'Pruebas de larga duración', OTRO: 'Otro' };
const ESTADOS = { EN_PROCESO: ['En proceso', ''], TERMINADO: ['Terminado', ''], PENDIENTE: ['Pendiente', 'amb'], DETENIDO: ['Detenido', 'rojo'] };

let YO = null;            // perfil del usuario
let CACHE = { ot: null, perfiles: null };

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const fdate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fdt = d => d ? new Date(d).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const esGer = () => YO && ['gerencia', 'admin'].includes(YO.rol);
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
  document.body.classList.add('en-login');
  const GTO_MENU = 'https://sistema-integrado-gto.vercel.app';
  $('#app').innerHTML = `<div class="gto"><div class="gto-login" style="min-height:100vh">
    <aside class="gto-sector-panel" aria-label="GTO Perú · Minería, industria y ferrovías">
  <div class="gto-logo-placa"><img src="https://sistema-integrado-gto.vercel.app/assets/logo-gto.png" alt="GTO Electrónica y Eléctrico de Potencia"></div>
  <h1 class="gto-sector-title">SISTEMA INTEGRADO<br>GTO <span>PERÚ</span></h1>
  <div class="gto-sectores"><div class="gto-sector gto-sector--mina"><span>MINERÍA</span></div><div class="gto-sector gto-sector--industria"><span>INDUSTRIA</span></div><div class="gto-sector gto-sector--ferrea"><span>FERROVÍAS</span></div></div>
</aside>
    <div class="form"><div class="caja">
      <div class="marca"><img src="${GTO_MENU}/assets/icono-taller.png" alt=""><div><small>Sistema Integrado GTO</small><h2>Bitácora Técnica</h2></div></div>
      <div class="gto-segmento" role="tablist"><button id="t-trab" class="on" type="button">Trabajador</button><button id="t-ger" type="button">Gerencia</button></div>
      ${msg ? `<div class="gto-aviso gto-aviso--info" role="status"><span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg></span><div><p>${esc(msg)}</p></div></div>` : ''}
      <div id="f-trab" style="display:grid;gap:14px">
        <div class="gto-campo"><label for="l-nom">Tu nombre</label><select id="l-nom" class="gto-select"><option value="">— Elige tu nombre —</option>${(lista || []).map(p => `<option>${esc(p.nombre)}</option>`).join('')}</select></div>
        <div class="gto-campo"><label for="l-dni">Tu DNI</label><input id="l-dni" class="gto-input" inputmode="numeric" maxlength="8" placeholder="8 dígitos"></div>
        <div id="l-pinbox" class="hidden" style="display:grid;gap:14px"><div class="gto-campo"><label id="l-pinlbl" for="l-pin">PIN (6 números)</label><input id="l-pin" class="gto-input pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password"></div>
          <div id="l-pin2box" class="hidden gto-campo"><label for="l-pin2">Repite tu nuevo PIN</label><input id="l-pin2" class="gto-input pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div></div>
        <button class="gto-btn gto-btn--primario" id="l-ok" type="button" style="width:100%">Continuar</button>
        <span class="gto-ayuda">La primera vez crearás un PIN de 6 números que solo tú conocerás. Si lo olvidas, pide al supervisor que lo restablezca.</span>
      </div>
      <div id="f-ger" class="hidden" style="display:grid;gap:14px">
        <div class="gto-campo"><label for="g-mail">Correo</label><input id="g-mail" class="gto-input" type="email" autocomplete="username" placeholder="nombre@gtoperu.com"></div>
        <div class="gto-campo"><label for="g-pass">Contraseña</label><input id="g-pass" class="gto-input" type="password" autocomplete="current-password"></div>
        <a href="#" id="g-olv" class="olvido">¿Olvidaste tu contraseña?</a>
        <button class="gto-btn gto-btn--primario" id="g-ok" type="button" style="width:100%">Ingresar</button>
      </div>
      <a class="volver" href="${GTO_MENU}">← Volver al menú</a>
    </div></div></div></div>`;
  const tab = t => { $('#t-trab').classList.toggle('on', t === 'trab'); $('#t-ger').classList.toggle('on', t === 'ger'); $('#f-trab').classList.toggle('hidden', t !== 'trab'); $('#f-ger').classList.toggle('hidden', t !== 'ger'); };
  $('#t-trab').onclick = () => tab('trab'); $('#t-ger').onclick = () => tab('ger');
  if (location.hash.startsWith('#/aprobar')) tab('ger');
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
  document.body.classList.remove('en-login');
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return pantallaIngreso();
  if (TIPO_LINK === 'invite' || TIPO_LINK === 'recovery' || location.hash.startsWith('#/clave')) { history.replaceState(null, '', location.pathname + '#/clave'); return pantallaClave(); }
  const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!p || !p.activo) { await sb.auth.signOut(); return pantallaIngreso('Tu usuario no está activo. Consulta con el supervisor.'); }
  YO = p; CACHE = { ot: null, perfiles: null };
  const links = [['#/', 'Mi día'], ['#/ot', 'OT / PI'], ['#/serie', 'Historial por serie'], ['#/reporte', 'Reporte']];
  if (esSup()) links.push(['#/ingresos', 'Componentes y proyectos'], ['#/borradores', 'Borradores de informes'], ['#/informes', 'Informes técnicos'], ['#/revision', 'Revisión'], ['#/personal', 'Personal']);
  $('#nav').innerHTML = links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('');
  $('#who').innerHTML = `<button class="campana-ot" id="avisos-ot" type="button" title="OT nuevas" aria-label="OT nuevas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="n hidden" id="avisos-n"></span></button><span>${esc(titleCase(nombreCorto(p.nombre)))} · ${esc(p.rol)}</span><button class="sm" id="salir">Salir</button>`;
  $('#avisos-ot').onclick = e => { e.stopPropagation(); panelOT(); };
  $('#salir').onclick = async () => { await sb.auth.signOut(); YO = null; location.hash = '#/'; pantallaIngreso(); };
  router();
  avisoPendientes();
  avisoOT(true);
  clearInterval(window._avisoOT); window._avisoOT = setInterval(() => avisoOT(false), 5 * 60 * 1000);
}
// ---------- avisos de OT nuevas (creadas en el Maestro o aprobadas desde la Bitácora) ----------
const DIAS_OT_NUEVAS = 3;
let OT_NUEVAS = [];
const claveVistas = () => 'bit_ot_vistas_' + (YO ? YO.id : '');
const otVistas = () => { try { return JSON.parse(localStorage.getItem(claveVistas()) || '[]'); } catch { return []; } };
function marcarOTVistas() { try { localStorage.setItem(claveVistas(), JSON.stringify([...new Set([...otVistas(), ...OT_NUEVAS.map(o => o.id)])].slice(-300))); } catch {} pintarAvisoOT(); }
async function avisoOT(inicio) {
  if (!YO) return;
  const desde = new Date(Date.now() - DIAS_OT_NUEVAS * 864e5).toISOString();
  const { data, error } = await sb.from('ot').select('id,numero,clase,nombre,cliente,estado,tipo,created_at').gte('created_at', desde).order('created_at', { ascending: false });
  if (error) return;
  const antes = new Set(OT_NUEVAS.map(o => o.id));
  OT_NUEVAS = (data || []).filter(o => o.estado !== 'cancelado');
  // primera vez en este equipo: solo se avisa lo creado en las últimas 24 h
  let primera = false; try { primera = localStorage.getItem(claveVistas()) === null; } catch {}
  if (primera) { const viejas = OT_NUEVAS.filter(o => Date.now() - new Date(o.created_at) > 864e5).map(o => o.id); try { localStorage.setItem(claveVistas(), JSON.stringify(viejas)); } catch {} }
  const nuevasAhora = OT_NUEVAS.filter(o => !antes.has(o.id));
  if (nuevasAhora.length && !inicio) CACHE.ot = null; // que las listas carguen la OT nueva
  pintarAvisoOT();
  const sinVer = OT_NUEVAS.filter(o => !otVistas().includes(o.id));
  const avisar = inicio ? sinVer : sinVer.filter(o => nuevasAhora.includes(o));
  if (avisar.length) toast(avisar.length === 1 ? `Nueva ${avisar[0].clase === 'INTERNO' ? 'PI' : 'OT'}: ${avisar[0].numero} · ${avisar[0].nombre || avisar[0].cliente || ''}` : `Hay ${avisar.length} OT nuevas. Revisa la campana.`, 7000);
  if (!location.hash || location.hash === '#/' || location.hash.startsWith('#/dia')) bannerOT();
}
function pintarAvisoOT() {
  const n = OT_NUEVAS.filter(o => !otVistas().includes(o.id)).length, el = $('#avisos-n');
  if (el) { el.textContent = n; el.classList.toggle('hidden', !n); }
  bannerOT();
}
const filaOT = (o, vistas) => `<a class="ot-nueva" href="#/ot/${o.id}"><span class="mono">${esc(o.numero)}</span>${vistas.includes(o.id) ? '' : '<span class="chip rojo">Nueva</span>'}<b>${esc(o.nombre || '—')}</b><span class="muted">${esc(o.cliente || '')} · creada ${fdt(o.created_at)}</span></a>`;
function panelOT() {
  let p = document.getElementById('panel-ot');
  if (p) { p.remove(); return; }
  const vistas = otVistas();
  p = document.createElement('div'); p.id = 'panel-ot'; p.className = 'panel-ot';
  p.innerHTML = `<div class="panel-ot-cab"><b>OT nuevas</b><span class="muted">últimos ${DIAS_OT_NUEVAS} días</span></div>` +
    (OT_NUEVAS.length ? OT_NUEVAS.map(o => filaOT(o, vistas)).join('') : '<div class="muted" style="padding:14px">No se crearon OT en los últimos días.</div>');
  document.body.appendChild(p);
  p.onclick = e => { if (e.target.closest('a')) p.remove(); };
  setTimeout(() => document.addEventListener('click', function cerrar(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', cerrar); } }), 0);
  marcarOTVistas();
}
function bannerOT() {
  const caja = document.getElementById('banner-ot'); const vistas = otVistas();
  const sinVer = OT_NUEVAS.filter(o => !vistas.includes(o.id));
  if (!caja) return;
  caja.innerHTML = sinVer.length ? `<div class="card banner-ot"><div class="row" style="justify-content:space-between"><b>${sinVer.length === 1 ? 'Se creó una OT nueva' : `Se crearon ${sinVer.length} OT nuevas`}</b><button class="sm" id="ot-visto" style="flex:0 0 auto">Entendido</button></div>${sinVer.slice(0, 5).map(o => filaOT(o, vistas)).join('')}${sinVer.length > 5 ? `<div class="muted" style="padding:8px 14px">y ${sinVer.length - 5} más en la campana</div>` : ''}</div>` : '';
  const b = document.getElementById('ot-visto'); if (b) b.onclick = marcarOTVistas;
}
// aviso a Gerencia: informes esperando aprobación
async function avisoPendientes() {
  if (!esGer()) return;
  const { count } = await sb.from('informes_borrador').select('id', { count: 'exact', head: true }).eq('estado', 'LISTO');
  const a = document.querySelector('#nav a[href="#/borradores"]'); if (a && count) a.innerHTML = `Borradores de informes <span class="chip rojo">${count}</span>`;
  if (count && !location.hash.startsWith('#/aprobar') && !location.hash.startsWith('#/borradores')) toast(`Tiene ${count} informe(s) técnico(s) pendiente(s) de aprobación`, 6000);
  const { count: ni } = await sb.from('ingresos').select('id', { count: 'exact', head: true }).eq('estado', 'POR_APROBAR');
  const b = document.querySelector('#nav a[href="#/ingresos"]'); if (b && ni) b.innerHTML = `Componentes y proyectos <span class="chip rojo">${ni}</span>`;
  if (ni && !count && !location.hash.startsWith('#/ingresos')) toast(`Tiene ${ni} registro(s) de componentes / proyectos por aprobar`, 6000);
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
  if (ruta === 'informes' && esSup()) return vistaInformes();
  if (ruta === 'borradores' && esSup()) return vistaBorradores();
  if (ruta === 'aprobar' && esSup()) return vistaAprobar(id);
  if (ruta === 'ingresos' && esSup()) return vistaIngresos(id);
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
    <div class="h"><div>${!a.ot_id && a.ingreso ? `<b class="mono">${esc(a.ingreso.codigo)}</b> <span class="chip amb">sin OT · por aprobar</span> <span class="muted">${esc(a.ingreso.nombre || '')}</span>` : `<b class="mono">${esc(o.numero || '—')}</b> <span class="muted">${esc(o.nombre || '')}</span>`}</div>
      <div>${chipEstado(a.estado)} <span class="chip gris">${TIPOS[a.tipo_trabajo] || a.tipo_trabajo}</span> ${a.horas != null ? `<span class="chip gris">${a.horas} h</span>` : ''} ${a.revisado_at ? '<span class="chip" title="Revisado por el supervisor">✔ Revisado</span>' : ''} ${a.dias_repetidos >= 3 ? `<span class="chip rojo" title="Misma actividad varios días seguidos">⚠ Día ${a.dias_repetidos} seguido</span>` : ''}</div></div>
    <div class="muted">${opts.fecha ? fdate(a.fecha) + ' · ' : ''}${esc(titleCase(t?.nombre || ''))}${a.numero_serie ? ` · Serie <a href="#/serie/${encodeURIComponent(a.numero_serie)}" class="mono">${esc(a.numero_serie)}</a>` : ''}${a.equipo ? ' · ' + esc(a.equipo) : ''}</div>
    <p>${esc(a.actividad).replace(/\n/g, '<br>')}</p>
    ${a.hallazgos ? `<p><span class="k">HALLAZGOS:</span> ${esc(a.hallazgos).replace(/\n/g, '<br>')}</p>` : ''}
    ${a.repuestos ? `<p><span class="k">REPUESTOS / MATERIALES:</span> ${esc(a.repuestos)}</p>` : ''}
    ${a.observaciones ? `<p><span class="k">OBSERVACIONES:</span> ${esc(a.observaciones)}</p>` : ''}
    ${a.dias_repetidos >= 3 ? `<p class="alerta"><span class="k">MOTIVO DE REPETICIÓN:</span> ${esc(MOTIVOS[a.motivo_repeticion] || a.motivo_repeticion || '—')}${a.motivo_detalle ? ' · ' + esc(a.motivo_detalle) : ''}${a.comentario_supervisor ? `<br><span class="k">COMENTARIO DEL SUPERVISOR:</span> ${esc(a.comentario_supervisor)}` : ''}</p>` : ''}
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
    const a = avs.find(x => x.id === b.dataset.rev);
    const marcar = async (coment) => {
      const cambios = { revisado_por: YO.id, revisado_at: new Date().toISOString() }; if (coment !== undefined) cambios.comentario_supervisor = coment;
      const { error } = await sb.from('avances').update(cambios).eq('id', b.dataset.rev);
      if (error) return toast(error.message, 5000); cerrarModal(); toast('Marcado como revisado'); recargar();
    };
    if (!(a && a.dias_repetidos >= 3)) return marcar();
    modal(`<h1>Revisar actividad repetida</h1><p>Es el <b>día ${a.dias_repetidos} seguido</b> con la misma actividad en este equipo.</p>
      <p class="muted">Motivo del técnico: <b>${esc(MOTIVOS[a.motivo_repeticion] || '—')}</b>${a.motivo_detalle ? ' · ' + esc(a.motivo_detalle) : ''}</p>
      <label>Tu comentario (qué verificaste / qué acción se toma) *</label><textarea id="rv-c">${esc(a.comentario_supervisor || '')}</textarea>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button id="rv-x">Cancelar</button><button class="pri" id="rv-ok">Marcar revisado</button></div>`);
    $('#rv-x').onclick = cerrarModal;
    $('#rv-ok').onclick = () => { const c = $('#rv-c').value.trim(); if (c.length < 5) return toast('Escribe tu comentario'); marcar(c); };
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
   <div id="banner-ot" class="no-print"></div><div id="kp" class="kpis"></div><div id="lista" style="margin-top:12px"><div class="loading">Cargando…</div></div>`;
  bannerOT();
  $('#f-fecha').onchange = e => { location.hash = '#/dia/' + e.target.value; };
  const cargar = async () => {
    let q = sb.from('avances').select('*, ingreso:ingresos(codigo,nombre,cliente)').eq('fecha', fecha).order('created_at');
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
  const { data: pends } = await sb.from('ingresos').select('id,codigo,nombre,cliente').in('estado', ['BORRADOR', 'POR_APROBAR']).order('codigo');
  const optI = i => `<option value="ing:${i.id}" ${!a.ot_id && i.id === a.ingreso_id ? 'selected' : ''}>${esc(i.codigo)} · ${esc((i.nombre || '').slice(0, 60))}${i.cliente ? ' · ' + esc(i.cliente) : ''}</option>`;
  const activos = ots.filter(o => o.estado !== 'finalizado' && o.estado !== 'cancelado');
  const opt = o => `<option value="${o.id}" ${o.id === a.ot_id ? 'selected' : ''}>${esc(o.numero)} · ${esc((o.nombre || '').slice(0, 70))}${o.cliente ? ' · ' + esc(o.cliente) : ''}</option>`;
  const otros = ots.filter(o => !activos.includes(o));
  modal(`<h1>${a.id ? 'Editar avance' : 'Registrar avance'}</h1>
   <div class="row"><div style="flex:2 1 320px"><label>OT / Proyecto interno *</label><select id="a-ot"><option value="">— Elige —</option>
     ${(pends || []).length ? `<optgroup label="Sin OT todavía (por aprobar)">${pends.map(optI).join('')}</optgroup>` : ''}<optgroup label="En curso">${activos.map(opt).join('')}</optgroup><optgroup label="Cerradas / historial">${otros.map(opt).join('')}</optgroup></select></div>
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
   <div id="a-rep-box" class="card alerta-box hidden" style="margin-top:10px"><b id="a-rep-tit">⚠ Actividad repetida</b>
     <div class="muted" style="margin:4px 0 8px">Registras la misma actividad en este equipo varios días seguidos. Indica por qué continúa (el gerente lo verá en el reporte).</div>
     <div class="row"><div><label>Motivo *</label><select id="a-mot"><option value="">— Elige —</option>${Object.entries(MOTIVOS).map(([k, v]) => `<option value="${k}" ${k === a.motivo_repeticion ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
     <div style="flex:2 1 300px"><label>Explica (avance logrado, qué falta, qué esperas) *</label><input id="a-motd" value="${esc(a.motivo_detalle || '')}" placeholder="Ej. capa 2 de 3; secado 24 h · 6 de 12 tarjetas"></div></div></div>
   <div style="margin-top:8px"><label>Fotos (se reducen automáticamente)</label><input id="a-fotos" type="file" accept="image/*" multiple capture="environment"></div>
   <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end"><button id="a-cancel">Cancelar</button><button class="pri" id="a-ok">Guardar</button></div>`);
  const cargarComp = async () => {
    const id = $('#a-ot').value; const sel = $('#a-comp');
    sel.innerHTML = '<option value="">— Sin componente específico —</option>'; if (!id) return;
    if (id.startsWith('ing:')) {
      const { data } = await sb.from('ingreso_componentes').select('id,descripcion,marca,modelo,numero_serie').eq('ingreso_id', id.slice(4));
      (data || []).forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="ic:${c.id}" data-serie="${esc(c.numero_serie || '')}" data-eq="${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}">${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}${c.numero_serie ? ' · S/N ' + esc(c.numero_serie) : ''}</option>`));
      return;
    }
    const { data } = await sb.from('componentes').select('id,descripcion,marca,modelo,numero_serie').eq('ot_id', id);
    (data || []).forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}" ${c.id === a.componente_id ? 'selected' : ''} data-serie="${esc(c.numero_serie || '')}">${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}${c.numero_serie ? ' · S/N ' + esc(c.numero_serie) : ''}</option>`));
  };
  let racha = (a.dias_repetidos || 1) - 1;
  const verRacha = async () => {
    const ot = $('#a-ot').value.replace(/^ing:/, ''); if (!ot) return;
    const { data } = await sb.rpc('racha_previa', { p_tecnico: a.tecnico_id || YO.id, p_fecha: $('#a-fecha').value, p_ot: ot, p_serie: $('#a-serie').value.trim() || null, p_tipo: $('#a-tipo').value, p_excluir: a.id || null });
    racha = data || 0; const box = $('#a-rep-box'); if (!box) return;
    box.classList.toggle('hidden', racha < 2); if (racha >= 2) $('#a-rep-tit').textContent = `⚠ Actividad repetida: sería el día ${racha + 1} seguido`;
  };
  $('#a-ot').onchange = async () => { await cargarComp(); verRacha(); }; await cargarComp();
  $('#a-comp').onchange = e => { const op = e.target.selectedOptions[0]; const s = op?.dataset.serie; if (s) $('#a-serie').value = s; if (op?.dataset.eq && !$('#a-equipo').value.trim()) $('#a-equipo').value = op.dataset.eq; verRacha(); };
  ['#a-serie', '#a-tipo', '#a-fecha'].forEach(q => $(q).addEventListener('change', verRacha)); verRacha();
  $('#a-cancel').onclick = cerrarModal;
  $('#a-ok').onclick = async () => {
    const selOt = $('#a-ot').value, selC = $('#a-comp').value;
    const reg = { ot_id: selOt.startsWith('ing:') ? null : (selOt || null), ingreso_id: selOt.startsWith('ing:') ? selOt.slice(4) : null, fecha: $('#a-fecha').value, componente_id: selC && !selC.startsWith('ic:') ? selC : null, numero_serie: $('#a-serie').value.trim() || null,
      equipo: $('#a-equipo').value.trim() || null, tipo_trabajo: $('#a-tipo').value, horas: $('#a-horas').value === '' ? null : +$('#a-horas').value,
      estado: $('#a-estado').value, motivo_repeticion: $('#a-mot').value || null, motivo_detalle: $('#a-motd').value.trim() || null, actividad: $('#a-act').value.trim(), hallazgos: $('#a-hal').value.trim() || null, repuestos: $('#a-rep').value.trim() || null, observaciones: $('#a-obs').value.trim() || null };
    if (!reg.ot_id && !reg.ingreso_id) return toast('Elige la OT o proyecto'); if (!reg.actividad) return toast('Describe el trabajo realizado');
    if (racha >= 2 && (!reg.motivo_repeticion || (reg.motivo_detalle || '').length < 10)) { $('#a-rep-box').classList.remove('hidden'); $('#a-rep-box').scrollIntoView({ behavior: 'smooth' }); return toast('Actividad repetida: indica el motivo y explica (mínimo 10 caracteres)', 5000); }
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
    } catch (e) {
      const m = String(e.message || ''); btn.disabled = false; btn.textContent = 'Guardar';
      if (m.startsWith('REPETIDA:')) { racha = parseInt(m.slice(9)) - 1; $('#a-rep-box').classList.remove('hidden'); $('#a-rep-tit').textContent = `⚠ Actividad repetida: sería el día ${racha + 1} seguido`; $('#a-rep-box').scrollIntoView({ behavior: 'smooth' }); return toast('Indica el motivo de la repetición', 5000); }
      toast(m, 5000);
    }
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
    sb.from('componentes').select('*').eq('ot_id', id), esSup() ? sb.from('informes').select('*').eq('ot_id', id).order('numero') : Promise.resolve({ data: [] }),
    sb.from('avances').select('*, ingreso:ingresos(codigo,nombre,cliente)').eq('ot_id', id).order('fecha', { ascending: false }).order('created_at', { ascending: false })]);
  const fotos = await fotosFirmadas(avs || []);
  const horas = (avs || []).reduce((s, a) => s + (+a.horas || 0), 0);
  let html = `<p class="no-print"><a href="#/ot">← OT / PI</a></p><h1><span class="mono">${esc(o.numero)}</span> · ${esc(o.nombre)}</h1>
   <div class="muted">${esc(o.cliente || (o.clase === 'INTERNO' ? 'Proyecto interno' : ''))} · ${esc(o.tipo || '')} · ${esc(o.estado_operativo || o.estado || '')}</div>
   <div class="kpis" style="margin-top:10px"><div class="kpi"><b>${(avs || []).length}</b>registros</div><div class="kpi"><b>${horas.toFixed(1)}</b>horas</div><div class="kpi"><b>${new Set((avs || []).map(a => a.tecnico_id)).size}</b>técnicos</div></div>
   <h2>Equipos / componentes</h2><div class="card" style="padding:0;overflow:auto">${(comps || []).length ? `<table><thead><tr><th>Descripción</th><th>N° parte</th><th>N° serie</th></tr></thead><tbody>${comps.map(c => `<tr><td>${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}</td><td class="mono">${esc(c.numero_parte || '')}</td><td>${c.numero_serie ? `<a class="mono" href="#/serie/${encodeURIComponent(c.numero_serie)}">${esc(c.numero_serie)}</a>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">Sin componentes registrados en el Maestro.</div>'}</div>
   ${esSup() ? `<h2>Informes técnicos</h2><div class="card" style="overflow:auto">${tablaInformes(infs || [], false)}</div>` : ''}
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
    sb.from('avances').select('*, ingreso:ingresos(codigo,nombre,cliente)').ilike('numero_serie', `%${s}%`).order('fecha', { ascending: false })]);
  const otIds = [...new Set([...(comps || []).map(c => c.ot_id), ...(avs || []).map(a => a.ot_id)])];
  const { data: infs } = (otIds.length && esSup()) ? await sb.from('informes').select('*').in('ot_id', otIds).order('fecha', { ascending: false }) : { data: [] };
  const fotos = await fotosFirmadas(avs || []);
  let html = `<div class="kpis"><div class="kpi"><b>${otIds.length}</b>OT / ingresos</div><div class="kpi"><b>${(avs || []).length}</b>trabajos registrados</div>${esSup() ? `<div class="kpi"><b>${(infs || []).length}</b>informes técnicos</div>` : ''}</div>`;
  html += `<h2>Ingresos del equipo</h2><div class="card" style="padding:0;overflow:auto">${otIds.length ? `<table><thead><tr><th>OT</th><th>Servicio</th><th>Cliente</th><th>Equipo</th></tr></thead><tbody>${otIds.map(i => { const o = otMap[i] || {}; const c = (comps || []).find(x => x.ot_id === i); return `<tr class="click" onclick="location.hash='#/ot/${i}'"><td class="mono">${esc(o.numero || '')}</td><td>${esc(o.nombre || '')}</td><td>${esc(o.cliente || '')}</td><td>${esc(c ? [c.descripcion, c.numero_serie].filter(Boolean).join(' · ') : '')}</td></tr>`; }).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">No se encontró ese N° de serie.</div>'}</div>`;
  if (esSup()) html += `<h2>Informes técnicos de esos ingresos</h2><div class="card" style="overflow:auto">${tablaInformes(infs || [], true, otMap)}</div>`;
  html += `<h2>Trabajos realizados</h2><div id="tl">${(avs || []).map(a => tarjeta(a, per, otMap, fotos, { fecha: true, soloLectura: true })).join('') || '<div class="card muted">Sin trabajos registrados en la bitácora.</div>'}</div>`;
  $('#s-res').innerHTML = html;
  $('#s-res').querySelectorAll('[data-pdf]').forEach(b => b.onclick = () => abrirInforme(b.dataset.pdf));
}

// ---------- informes técnicos (solo supervisor / gerencia) ----------
let INFS = null;
async function vistaInformes() {
  $('#app').innerHTML = '<h1>Informes técnicos</h1><div class="card muted">Cargando…</div>';
  const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o]));
  if (!INFS) { const { data, error } = await sb.from('informes').select('*').order('fecha', { ascending: false }).order('numero', { ascending: false }).limit(5000); if (error) { $('#app').innerHTML = '<div class="card">' + esc(error.message) + '</div>'; return; } INFS = data || []; }
  const anios = [...new Set(INFS.map(i => (i.fecha || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const tipos = [...new Set(INFS.map(i => i.tipo).filter(Boolean))].sort();
  $('#app').innerHTML = `<h1>Informes técnicos</h1>
   <div class="muted" style="margin-bottom:8px">Informes emitidos por GTO (todos los años). Busca por N° de informe, cliente, equipo, N° de serie u OT y pulsa "Ver PDF".</div>
   <div class="card row no-print"><div style="flex:3 1 260px"><label>Buscar</label><input id="i-q" placeholder="Ej. 187, Shougang, ACS2000, 2143001349, OT-2026-0019"></div>
    <div><label>Año</label><select id="i-a"><option value="">Todos</option>${anios.map(a => `<option>${a}</option>`).join('')}</select></div>
    <div><label>Tipo</label><select id="i-t"><option value="">Todos</option>${tipos.map(t => `<option>${esc(t)}</option>`).join('')}</select></div></div>
   <div id="i-k" class="muted" style="margin:8px 0"></div><div class="card" style="overflow:auto;padding:0" id="i-res"></div>`;
  const pintar = () => {
    const q = $('#i-q').value.trim().toUpperCase(), a = $('#i-a').value, t = $('#i-t').value;
    const lista = INFS.filter(i => (!a || (i.fecha || '').startsWith(a)) && (!t || i.tipo === t) && (!q || [i.numero, i.titulo, i.cliente, i.tipo, otMap[i.ot_id]?.numero, otMap[i.ot_id]?.nombre, ...(i.archivos || []).map(x => x.nombre || x.path)].join(' ').toUpperCase().includes(q)));
    $('#i-k').textContent = `${lista.length} de ${INFS.length} informes`;
    $('#i-res').innerHTML = lista.length ? `<table><thead><tr><th>N°</th><th>Tipo</th><th>Título</th><th>Cliente</th><th>OT</th><th>Fecha</th><th></th></tr></thead><tbody>${lista.slice(0, 300).map(i => `<tr><td class="mono">${esc(i.numero || '')}</td><td>${esc(i.tipo || '')}</td><td>${esc(i.titulo || '')}</td><td>${esc(i.cliente || '')}</td><td class="mono">${i.ot_id && otMap[i.ot_id] ? `<a href="#/ot/${i.ot_id}">${esc(otMap[i.ot_id].numero)}</a>` : ''}</td><td style="white-space:nowrap">${i.fecha ? fdate(i.fecha) : ''}</td><td style="white-space:nowrap">${(i.archivos || []).map((x, n) => `<button class="sm" data-pdf="${esc(x.path)}">Ver PDF${(i.archivos.length > 1) ? ' ' + (n + 1) : ''}</button>`).join(' ')}</td></tr>`).join('')}</tbody></table>${lista.length > 300 ? '<div class="muted" style="padding:10px">Se muestran 300; afina la búsqueda.</div>' : ''}` : '<div class="muted" style="padding:10px">Sin resultados.</div>';
    $('#i-res').querySelectorAll('[data-pdf]').forEach(b => b.onclick = () => abrirInforme(b.dataset.pdf));
  };
  $('#i-q').oninput = pintar; $('#i-a').onchange = pintar; $('#i-t').onchange = pintar; pintar();
}

// ---------- borradores de informes técnicos (supervisor sube → revisión automática → Gerencia aprueba) ----------
const EST_INF = { PENDIENTE: ['En cola de revisión', 'gris'], EN_PROCESO: ['En revisión', 'amb'], LISTO: ['Por aprobar', 'amb'], APROBADO: ['Aprobado', ''], DEVUELTO: ['Devuelto', 'rojo'], ANULADO: ['Anulado', 'gris'] };
const BINF = 'bitacora-informes';
async function urlInf(path, descarga) {
  if (!path) return null;
  const { data } = await sb.storage.from(BINF).createSignedUrl(path, 600, descarga ? { download: descarga } : undefined);
  return data?.signedUrl || null;
}
async function vistaBorradores() {
  const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o])); const per = await cargarPerfiles();
  const { data: bs, error } = await sb.from('informes_borrador').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) { $('#app').innerHTML = `<div class="card">${esc(error.message)}</div>`; return; }
  const por = (bs || []).filter(b => b.estado === 'LISTO');
  $('#app').innerHTML = `<h1>Borradores de informes técnicos</h1>
   <div class="muted" style="margin-bottom:8px">El supervisor sube el borrador en Word. Se revisa y formatea automáticamente (formato GTO, datos del Maestro, observaciones de lo que falte) y llega a Gerencia en PDF y Word para aprobar. Al aprobar se registra en la OT del sistema de gestión.</div>
   ${YO.rol === 'supervisor' || esGer() ? '<div class="no-print" style="margin-bottom:10px"><button class="pri" id="b-nuevo">+ Subir borrador de informe</button></div>' : ''}
   ${por.length ? `<div class="card alerta-box"><b style="color:#C0392B">${por.length} informe(s) pendiente(s) de aprobación</b>${esGer() ? ' — pulse uno para revisarlo.' : ''}</div>` : ''}
   <div class="card" style="padding:0;overflow:auto">${(bs || []).length ? `<table><thead><tr><th>Subido</th><th>OT</th><th>Tipo</th><th>N° informe</th><th>Versión</th><th>Estado</th><th>Resultado</th></tr></thead><tbody>${bs.map(b => `<tr class="click" onclick="location.hash='#/aprobar/${b.id}'"><td style="white-space:nowrap">${fdt(b.created_at)}<div class="muted">${esc(titleCase(per[b.subido_por]?.nombre || ''))}</div></td><td class="mono">${esc(otMap[b.ot_id]?.numero || '')}<div class="muted">${esc((otMap[b.ot_id]?.cliente || '').slice(0, 30))}</div></td><td>${b.tipo === 'INICIAL' ? 'Inicial' : 'Final'}</td><td class="mono">${esc(b.numero || '—')}</td><td>${b.version}</td><td><span class="chip ${EST_INF[b.estado][1]}">${EST_INF[b.estado][0]}</span></td><td>${b.resultado === 'COMPLETO' ? '<span class="chip">✔ Completo</span>' : b.resultado ? `<span class="chip rojo">⚠ ${(b.observaciones || []).length} observación(es)</span>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">Aún no hay borradores.</div>'}</div>`;
  if ($('#b-nuevo')) $('#b-nuevo').onclick = () => formBorrador({});
}

async function formBorrador(prev) {
  const ots = await cargarOT(); const activas = ots.filter(o => o.estado === 'activo');
  const corr = !!prev.raiz_id;
  modal(`<h1>${corr ? 'Subir corrección' : 'Subir borrador de informe técnico'}</h1>
   ${corr ? `<p class="alerta">Corrección del informe <b class="mono">${esc(prev.numero || '')}</b> devuelto por Gerencia: "${esc(prev.decision_comentario || '')}". Se mantiene el mismo número.</p>` : ''}
   <div class="row"><div style="flex:2 1 300px"><label>OT / PI *</label><select id="bf-ot" ${corr ? 'disabled' : ''}><option value="">— Elige —</option>${(corr ? ots : activas).map(o => `<option value="${o.id}" ${o.id === prev.ot_id ? 'selected' : ''}>${esc(o.numero)} · ${esc((o.nombre || '').slice(0, 60))}${o.cliente ? ' · ' + esc(o.cliente) : ''}</option>`).join('')}</select></div>
   <div style="flex:0 0 180px"><label>Tipo de informe *</label><select id="bf-tipo" ${corr ? 'disabled' : ''}><option value="INICIAL" ${prev.tipo === 'INICIAL' ? 'selected' : ''}>Inicial (ITI)</option><option value="FINAL" ${prev.tipo === 'FINAL' ? 'selected' : ''}>Final (ITF)</option></select></div></div>
   <div style="margin-top:8px"><label>Borrador en Word (.docx) *</label><input type="file" id="bf-arch" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
   <div style="margin-top:8px"><label>Comentario para la revisión (opcional)</label><textarea id="bf-com" placeholder="Ej. es un informe por cada módulo; falta foto de placa del MOD4; la atención es el Ing. ..."></textarea></div>
   <p class="muted">Se revisa en el siguiente turno de revisión (10:00, 13:00 o 17:00 de lunes a viernes). El número de informe lo asigna el sistema.</p>
   <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button id="bf-x">Cancelar</button><button class="pri" id="bf-ok">Subir borrador</button></div>`);
  $('#bf-x').onclick = cerrarModal;
  $('#bf-ok').onclick = async () => {
    const ot = corr ? prev.ot_id : $('#bf-ot').value, tipo = corr ? prev.tipo : $('#bf-tipo').value, f = $('#bf-arch').files[0];
    if (!ot) return toast('Elige la OT'); if (!f) return toast('Adjunta el borrador en Word');
    if (!/\.docx$/i.test(f.name)) return toast('El borrador debe ser un archivo Word .docx');
    if (f.size > 50 * 1024 * 1024) return toast('El archivo supera 50 MB');
    const btn = $('#bf-ok'); btn.disabled = true; btn.textContent = 'Subiendo…';
    try {
      const path = `borradores/${crypto.randomUUID()}.docx`;
      const up = await sb.storage.from(BINF).upload(path, f, { contentType: f.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); if (up.error) throw up.error;
      const reg = { ot_id: ot, tipo, archivo_path: path, archivo_nombre: f.name, comentario: $('#bf-com').value.trim() || null };
      if (corr) reg.raiz_id = prev.raiz_id;
      const { error } = await sb.from('informes_borrador').insert(reg); if (error) throw error;
      cerrarModal(); toast('Borrador subido. Se revisará en el próximo turno.', 5000); vistaBorradores();
    } catch (e) { toast(e.message, 6000); btn.disabled = false; btn.textContent = 'Subir borrador'; }
  };
}

async function vistaAprobar(id) {
  const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o])); const per = await cargarPerfiles();
  const { data: b } = await sb.from('informes_borrador').select('*').eq('id', id).maybeSingle();
  if (!b) { $('#app').innerHTML = '<div class="card">Informe no encontrado.</div>'; return; }
  const o = otMap[b.ot_id] || {};
  const [pdf, docx, orig] = await Promise.all([urlInf(b.pdf_path), urlInf(b.docx_path, (b.docx_path || '').split('/').pop()), urlInf(b.archivo_path, b.archivo_nombre)]);
  const { data: hist } = await sb.from('informes_borrador').select('id,version,estado,decision_comentario,decision_at,created_at').eq('raiz_id', b.raiz_id).order('version');
  const obs = b.observaciones || [];
  $('#app').innerHTML = `<p class="no-print"><a href="#/borradores">← Borradores de informes</a></p>
   <h1>${esc(b.titulo || ('Informe técnico ' + (b.tipo === 'INICIAL' ? 'inicial' : 'final')))} ${b.numero ? `<span class="mono muted">${esc(b.numero)}</span>` : ''}</h1>
   <div class="muted">${esc(o.numero || '')} · ${esc(o.cliente || '')} · ${esc(o.nombre || '')}</div>
   <p><span class="chip ${EST_INF[b.estado][1]}">${EST_INF[b.estado][0]}</span> ${b.resultado === 'COMPLETO' ? '<span class="chip">✔ Completo</span>' : b.resultado ? '<span class="chip rojo">⚠ Con observaciones</span>' : ''} <span class="muted">· Versión ${b.version} · subido por ${esc(titleCase(per[b.subido_por]?.nombre || ''))} el ${fdt(b.created_at)}</span></p>
   ${b.comentario ? `<p><span class="k">COMENTARIO DEL SUPERVISOR:</span> ${esc(b.comentario)}</p>` : ''}
   ${['PENDIENTE', 'EN_PROCESO'].includes(b.estado) ? '<div class="card muted">El borrador está en cola de revisión. Se procesa en el próximo turno (10:00, 13:00 o 17:00, lunes a viernes).</div>' : ''}
   ${b.resumen ? `<div class="card">${esc(b.resumen)}</div>` : ''}
   ${obs.length ? `<div class="card alerta-box"><b style="color:#C0392B">Falta completar / revisar</b><ul style="margin:6px 0">${obs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
   <div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
     ${pdf ? `<a class="btn pri" href="${pdf}" target="_blank">Ver PDF</a>` : ''}${docx ? `<a class="btn" href="${docx}">Descargar Word</a>` : ''}${orig ? `<a class="btn" href="${orig}">Borrador original</a>` : ''}</div>
   ${b.estado === 'LISTO' && esGer() ? `<div class="card"><h2 style="margin-top:0">Decisión de Gerencia</h2><label>Comentario (obligatorio si devuelve)</label><textarea id="ap-com" placeholder="Ej. completar atención del cliente y foto de placa"></textarea>
       <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end"><button class="peligro" id="ap-dev">Devolver al supervisor</button><button class="pri" id="ap-ok">Aprobar informe</button></div></div>` : ''}
   ${b.estado === 'LISTO' && !esGer() ? '<div class="card muted">Pendiente de aprobación por Gerencia.</div>' : ''}
   ${b.estado === 'APROBADO' ? `<div class="card">✔ Aprobado por ${esc(titleCase(per[b.decision_por]?.nombre || ''))} el ${fdt(b.decision_at)}${b.decision_comentario ? ' — ' + esc(b.decision_comentario) : ''}. ${b.maestro_ok ? 'Registrado en la OT del sistema de gestión.' : (b.maestro_error ? '<span class="alerta">Pendiente de registrar en el sistema de gestión: ' + esc(b.maestro_error) + '</span>' : 'Se registrará en la OT del sistema de gestión en los próximos minutos.')}</div>` : ''}
   ${b.estado === 'DEVUELTO' ? `<div class="card alerta-box"><b>Devuelto por ${esc(titleCase(per[b.decision_por]?.nombre || ''))}</b> el ${fdt(b.decision_at)}: ${esc(b.decision_comentario || '')}
       ${!(hist || []).some(h => h.version > b.version) ? '<div style="margin-top:8px"><button class="pri" id="ap-corr">Subir corrección</button></div>' : ''}</div>` : ''}
   ${b.estado === 'PENDIENTE' ? '<div class="no-print"><button class="peligro sm" id="ap-anu">Anular borrador</button></div>' : ''}
   ${(hist || []).length > 1 ? `<h2>Versiones</h2><div class="card" style="padding:0"><table><tbody>${hist.map(h => `<tr class="click" onclick="location.hash='#/aprobar/${h.id}'"><td>Versión ${h.version}</td><td>${fdt(h.created_at)}</td><td><span class="chip ${EST_INF[h.estado][1]}">${EST_INF[h.estado][0]}</span></td><td>${esc(h.decision_comentario || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  const decidir = async (apr) => {
    const c = ($('#ap-com').value || '').trim();
    if (!apr && c.length < 5) return toast('Escriba qué debe corregir el supervisor');
    if (apr && !confirm('¿Aprobar el informe? Se registrará en la OT del sistema de gestión.')) return;
    const { error } = await sb.rpc('decidir_informe', { p_id: b.id, p_aprobar: apr, p_comentario: c || null });
    if (error) return toast(error.message, 6000);
    toast(apr ? 'Informe aprobado' : 'Informe devuelto al supervisor'); vistaAprobar(b.id); avisoPendientes();
  };
  if ($('#ap-ok')) $('#ap-ok').onclick = () => decidir(true);
  if ($('#ap-dev')) $('#ap-dev').onclick = () => decidir(false);
  if ($('#ap-corr')) $('#ap-corr').onclick = () => formBorrador(b);
  if ($('#ap-anu')) $('#ap-anu').onclick = async () => { if (!confirm('¿Anular este borrador?')) return; const { error } = await sb.rpc('anular_borrador', { p_id: b.id }); if (error) return toast(error.message); vistaAprobar(b.id); };
}

// ---------- alertas del reporte ----------
function htmlAlertas(al) {
  if (!al) return '';
  const rep = al.repetidas || [], sa = al.sin_avance || [], sr = al.sin_registro || [], sv = al.sin_revisar || { total: 0, dias: [] }, ia = al.informes_por_aprobar || [];
  if (!rep.length && !sa.length && !sr.length && !sv.total && !ia.length) return '<div class="card alerta-ok">✔ Sin alertas en el día.</div>';
  let h = '<div class="card alerta-box"><b style="color:#C0392B">⚠ ALERTAS DEL DÍA</b>';
  if (rep.length) h += `<h3>Actividades repetidas (3 días o más seguidos)</h3><table><thead><tr><th>Técnico</th><th>OT</th><th>Equipo / serie</th><th>Actividad</th><th>Días</th><th>Motivo</th><th>Comentario supervisor</th></tr></thead><tbody>${rep.map(x => `<tr><td>${esc(titleCase(x.tecnico))}</td><td class="mono">${esc(x.ot)}</td><td>${esc(x.equipo || '')}${x.serie ? '<br><span class="muted">S/N ' + esc(x.serie) + '</span>' : ''}</td><td>${esc(TIPOS[x.tipo] || x.tipo)}: ${esc((x.actividad || '').slice(0, 120))}</td><td><b>${x.dias}</b></td><td>${esc(MOTIVOS[x.motivo] || '—')}${x.detalle ? '<br><span class="muted">' + esc(x.detalle) + '</span>' : ''}</td><td>${esc(x.comentario || 'Pendiente de revisión')}</td></tr>`).join('')}</tbody></table>`;
  if (sa.length) h += `<h3>OT / PI en curso sin avance (3 días o más)</h3><table><thead><tr><th>OT</th><th>Servicio</th><th>Cliente</th><th>Último registro</th><th>Días sin avance</th><th>Último estado</th></tr></thead><tbody>${sa.map(x => `<tr><td class="mono">${esc(x.ot)}</td><td>${esc(x.nombre || '')}</td><td>${esc(x.cliente || '')}</td><td>${fdate(x.ultimo)}</td><td><b>${x.dias}</b></td><td>${esc(ESTADOS[x.estado]?.[0] || x.estado || '')}</td></tr>`).join('')}</tbody></table>`;
  if (ia.length) h += `<h3>Informes técnicos pendientes de aprobación de Gerencia</h3><p>${ia.map(x => `<b class="mono">${esc(x.numero || '')}</b> (${esc(x.ot)}, ${x.dias} día(s))`).join(' · ')}</p>`;
  if (sv.total) h += `<h3>Registros sin revisar por el supervisor (últimos 7 días)</h3><p><b>${sv.total}</b> registro(s) pendiente(s): ${(sv.dias || []).map(x => `${fdate(x.fecha)} — ${x.pendientes} de ${x.total}`).join(' · ')}</p>`;
  if (sr.length) h += `<h3>Técnicos sin registro en el día</h3><p>${sr.map(n => { const m = String(n).match(/^(.*?)( \(.*\))?$/); return esc(titleCase(m[1])) + esc(m[2] || ''); }).join(' · ')}</p>`;
  return h + '</div>';
}

// ---------- componentes y proyectos (registro del supervisor → Maestro) ----------
const TIPOS_OT = { REPARACION: 'Reparación', MANTENIMIENTO: 'Mantenimiento', DIAGNOSTICO: 'Diagnóstico', FABRICACION: 'Fabricación', OTRO: 'Otro' };
const EST_LAB = { EN_ESPERA: ['En espera', 'gris'], DIAGNOSTICO: ['Diagnóstico', 'amb'], REPARACION: ['Reparación', 'amb'], PRUEBAS: ['Pruebas', 'amb'], TERMINADO: ['Terminado', ''], DESPACHADO: ['Despachado', 'gris'] };
const EST_ING = { BORRADOR: ['Borrador', 'gris'], POR_APROBAR: ['Por aprobar (Gerencia)', 'amb'], ENVIADO: ['En el Maestro', ''], ANULADO: ['Anulado', 'rojo'] };
const diasDesde = d => d ? Math.max(0, Math.round((new Date(hoyLima() + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5)) : '';

async function vistaIngresos(tab) {
  tab = tab || 'inventario';
  $('#app').innerHTML = `<h1>Componentes y proyectos</h1>
   <div class="muted" style="margin-bottom:8px">Registra los componentes que llegan al laboratorio y los proyectos internos. El supervisor los guarda como <b>borrador</b> y los <b>envía a Gerencia</b>; recién cuando Gerencia los <b>aprueba</b> se crea la OT / PI en el Maestro. Si varios componentes son del mismo servicio, <b>únelos en un solo registro</b> antes de aprobar.</div>
   <div class="row no-print" style="margin-bottom:10px"><div style="flex:0 0 auto;display:flex;gap:6px;flex-wrap:wrap">
     <a class="btn ${tab === 'inventario' ? 'pri' : ''}" href="#/ingresos/inventario">Inventario del laboratorio</a>
     <a class="btn ${tab === 'registros' ? 'pri' : ''}" href="#/ingresos/registros">Registros</a></div>
     <div style="flex:1 1 auto"></div><div style="flex:0 0 auto;display:flex;gap:6px;flex-wrap:wrap">
     <button class="pri" id="n-serv">+ Componentes (OT de servicio)</button><button id="n-pi">+ Proyecto interno</button></div></div>
   <div id="ing-res"><div class="loading">Cargando…</div></div>`;
  $('#n-serv').onclick = () => formIngreso({ clase: 'SERVICIO', modo: 'NUEVA' });
  $('#n-pi').onclick = () => formIngreso({ clase: 'INTERNO', modo: 'NUEVA', tipo: 'OTRO' });
  const { data: ings, error } = await sb.from('ingresos').select('*, ingreso_componentes(*)').order('created_at', { ascending: false }).limit(500);
  if (error) { $('#ing-res').innerHTML = `<div class="card">${esc(error.message)}</div>`; return; }
  if (tab === 'registros') return pintarRegistros(ings || []);
  pintarInventario(ings || []);
}

function pintarRegistros(ings) {
  const pend = ings.filter(i => i.estado === 'POR_APROBAR');
  $('#ing-res').innerHTML = (pend.length ? `<div class="card alerta-box" style="margin-bottom:10px"><b>${pend.length} registro(s) por aprobar.</b> ${esGer() ? 'Ábrelos para unirlos, aprobarlos (se crea la OT en el Maestro) o devolverlos al supervisor.' : 'Gerencia debe aprobarlos para que se cree la OT en el Maestro.'}</div>` : '') + `<div class="card" style="padding:0;overflow:auto">${ings.length ? `<table><thead><tr><th>Código</th><th>Tipo</th><th>Servicio / proyecto</th><th>Cliente</th><th>Comp.</th><th>Recepción</th><th>Estado</th><th>OT / PI</th></tr></thead><tbody>${ings.map(i => `<tr class="click" data-ing="${i.id}"><td class="mono">${esc(i.codigo)}</td><td>${i.clase === 'INTERNO' ? 'Proyecto interno' : (i.modo === 'AGREGAR' ? 'Agregar a OT' : 'OT de servicio')}</td><td>${esc(i.nombre || '')}</td><td>${esc(i.cliente || '')}</td><td>${(i.ingreso_componentes || []).length}</td><td>${i.fecha_recepcion ? fdate(i.fecha_recepcion) : ''}</td><td><span class="chip ${EST_ING[i.estado][1]}">${EST_ING[i.estado][0]}</span></td><td class="mono">${esc(i.ot_numero || '')}</td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">Aún no hay registros. Usa los botones de arriba.</div>'}</div>`;
  $('#ing-res').querySelectorAll('[data-ing]').forEach(r => r.onclick = () => detalleIngreso(ings.find(i => i.id === r.dataset.ing)));
}

function pintarInventario(ings) {
  const filas = []; ings.filter(i => i.estado !== 'ANULADO').forEach(i => (i.ingreso_componentes || []).forEach(c => filas.push({ i, c })));
  $('#ing-res').innerHTML = `<div class="card row no-print"><div><label>Buscar</label><input id="iv-q" placeholder="Equipo, N° de serie, cliente, OT"></div>
     <div style="flex:0 0 200px"><label>Estado</label><select id="iv-e"><option value="act">En laboratorio</option><option value="">Todos</option>${Object.entries(EST_LAB).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></div></div>
   <div id="iv-k" class="kpis" style="margin-bottom:10px"></div><div class="card" style="padding:0;overflow:auto" id="iv-t"></div>`;
  const pintar = () => {
    const q = $('#iv-q').value.trim().toUpperCase(), e = $('#iv-e').value;
    const l = filas.filter(({ i, c }) => (e === 'act' ? c.estado_lab !== 'DESPACHADO' : (!e || c.estado_lab === e)) && (!q || [c.descripcion, c.marca, c.modelo, c.numero_serie, c.numero_parte, i.cliente, i.nombre, i.ot_numero, i.codigo].join(' ').toUpperCase().includes(q)));
    const enLab = filas.filter(f => f.c.estado_lab !== 'DESPACHADO');
    $('#iv-k').innerHTML = `<div class="kpi"><b>${enLab.length}</b>en laboratorio</div><div class="kpi"><b>${enLab.filter(f => !f.i.ot_numero).length}</b>sin OT (borrador)</div><div class="kpi"><b>${enLab.filter(f => diasDesde(f.i.fecha_recepcion) > 30).length}</b>con más de 30 días</div>`;
    $('#iv-t').innerHTML = l.length ? `<table><thead><tr><th>OT / código</th><th>Cliente</th><th>Equipo</th><th>N° serie</th><th>Falla reportada</th><th>Ubicación</th><th>Días</th><th>Estado</th></tr></thead><tbody>${l.map(({ i, c }) => `<tr><td class="mono">${i.ot_id ? `<a href="#/ot/${i.ot_id}">${esc(i.ot_numero)}</a>` : esc(i.codigo)}</td><td>${esc(i.cliente || (i.clase === 'INTERNO' ? 'Proyecto interno' : ''))}</td><td>${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}${+c.cantidad !== 1 ? ` <span class="muted">× ${c.cantidad}</span>` : ''}</td><td>${c.numero_serie ? `<a class="mono" href="#/serie/${encodeURIComponent(c.numero_serie)}">${esc(c.numero_serie)}</a>` : ''}</td><td>${esc(c.falla || '')}</td><td><input class="sm-in" data-ub="${c.id}" value="${esc(c.ubicacion || '')}" placeholder="—"></td><td>${diasDesde(i.fecha_recepcion)}</td><td><select class="sm-in" data-est="${c.id}">${Object.entries(EST_LAB).map(([k, v]) => `<option value="${k}" ${k === c.estado_lab ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="padding:10px">Sin componentes para mostrar. Registra los que llegan con "+ Componentes (OT de servicio)".</div>';
    $('#iv-t').querySelectorAll('[data-est]').forEach(s => s.onchange = async () => { const { error } = await sb.from('ingreso_componentes').update({ estado_lab: s.value }).eq('id', s.dataset.est); if (error) return toast(error.message); filas.find(f => f.c.id === s.dataset.est).c.estado_lab = s.value; toast('Estado actualizado'); });
    $('#iv-t').querySelectorAll('[data-ub]').forEach(s => s.onchange = async () => { const { error } = await sb.from('ingreso_componentes').update({ ubicacion: s.value.trim() || null }).eq('id', s.dataset.ub); if (error) return toast(error.message); filas.find(f => f.c.id === s.dataset.ub).c.ubicacion = s.value.trim(); toast('Ubicación guardada'); });
  };
  $('#iv-q').oninput = pintar; $('#iv-e').onchange = pintar; pintar();
}

function detalleIngreso(i) {
  const comps = i.ingreso_componentes || [];
  const abierto = ['BORRADOR', 'POR_APROBAR'].includes(i.estado);
  modal(`<h1><span class="mono">${esc(i.codigo)}</span> · ${esc(i.nombre || (i.modo === 'AGREGAR' ? 'Agregar componentes a OT' : ''))}</h1>
   <p><span class="chip ${EST_ING[i.estado][1]}">${EST_ING[i.estado][0]}</span> ${i.ot_numero ? `<a class="mono" href="#/ot/${i.ot_id}" onclick="cerrarModal()">${esc(i.ot_numero)}</a>` : ''}</p>
   <div class="muted">${i.clase === 'INTERNO' ? 'Proyecto interno' : 'Cliente: ' + esc(i.cliente || '—')} · ${esc(TIPOS_OT[i.tipo] || i.tipo || '')} · Prioridad ${esc(i.prioridad)}${i.guia ? ' · Guía ' + esc(i.guia) : ''}${i.fecha_recepcion ? ' · Recepción ' + fdate(i.fecha_recepcion) : ''}${i.fecha_entrega ? ' · Entrega estimada ' + fdate(i.fecha_entrega) : ''}</div>
   ${i.descripcion ? `<p>${esc(i.descripcion)}</p>` : ''}${i.estado === 'ANULADO' && i.error ? `<p class="alerta">Motivo de anulación: ${esc(i.error)}</p>` : ''}
   ${i.aprobacion_comentario && ['BORRADOR', 'POR_APROBAR'].includes(i.estado) ? `<p class="alerta">Nota de Gerencia: ${esc(i.aprobacion_comentario)}</p>` : ''}
   <div style="overflow:auto">${comps.length ? `<table><thead><tr><th>Equipo</th><th>N° parte</th><th>N° serie</th><th>Cant.</th><th>Falla</th></tr></thead><tbody>${comps.map(c => `<tr><td>${esc([c.descripcion, c.marca, c.modelo].filter(Boolean).join(' '))}</td><td class="mono">${esc(c.numero_parte || '')}</td><td class="mono">${esc(c.numero_serie || '')}</td><td>${c.cantidad}</td><td>${esc(c.falla || '')}</td></tr>`).join('')}</tbody></table>` : '<div class="muted">Sin componentes.</div>'}</div>
   <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
    ${abierto ? '<button id="d-edit">Editar</button><button id="d-unir">Unir con otros registros</button><button class="peligro" id="d-anu">Anular</button>' : ''}
    ${i.estado === 'BORRADOR' && !esGer() ? '<button class="pri" id="d-sol">Enviar a Gerencia</button>' : ''}
    ${i.estado === 'POR_APROBAR' && esGer() ? '<button id="d-dev">Devolver</button>' : ''}
    ${abierto && esGer() ? '<button class="pri" id="d-env">Aprobar y crear en el Maestro</button>' : ''}
    ${i.estado === 'ENVIADO' && i.modo === 'NUEVA' && esGer() ? '<button class="peligro" id="d-anu">Anular OT</button>' : ''}<button id="d-x">Cerrar</button></div>`);
  $('#d-x').onclick = cerrarModal;
  if ($('#d-edit')) $('#d-edit').onclick = () => formIngreso(i);
  if ($('#d-env')) $('#d-env').onclick = () => enviarIngreso(i);
  if ($('#d-anu')) $('#d-anu').onclick = () => anularIngreso(i);
  if ($('#d-sol')) $('#d-sol').onclick = () => solicitarAprobacion(i.id);
  if ($('#d-dev')) $('#d-dev').onclick = () => devolverIngreso(i);
  if ($('#d-unir')) $('#d-unir').onclick = () => unirIngresos(i);
}

async function formIngreso(i) {
  const ots = await cargarOT(); const activas = ots.filter(o => o.estado === 'activo');
  const pi = i.clase === 'INTERNO';
  const comps = (i.ingreso_componentes || []).length ? i.ingreso_componentes : [{}];
  const filaC = c => `<tr><td><input data-k="descripcion" value="${esc(c.descripcion || '')}" placeholder="Ej. Módulo de fase"></td><td><input data-k="marca" value="${esc(c.marca || '')}"></td><td><input data-k="modelo" value="${esc(c.modelo || '')}"></td><td><input data-k="numero_parte" value="${esc(c.numero_parte || '')}"></td><td><input data-k="numero_serie" value="${esc(c.numero_serie || '')}"></td><td style="width:70px"><input data-k="cantidad" type="number" min="1" step="1" value="${c.cantidad || 1}"></td><td><input data-k="falla" value="${esc(c.falla || '')}"></td><td><button class="sm peligro" data-delc>✕</button></td></tr>`;
  modal(`<h1>${i.id ? 'Editar ' + esc(i.codigo) : (pi ? 'Nuevo proyecto interno' : 'Registrar componentes')}</h1>
   ${pi ? '' : `<div class="tabs"><button id="m-nueva" class="${i.modo !== 'AGREGAR' ? 'on' : ''}">Nueva OT</button><button id="m-agr" class="${i.modo === 'AGREGAR' ? 'on' : ''}">Agregar a OT existente</button></div>`}
   <div id="f-agr" class="${i.modo === 'AGREGAR' ? '' : 'hidden'}"><label>OT / PI existente *</label><select id="f-ot"><option value="">— Elige —</option>${activas.map(o => `<option value="${o.id}" ${o.id === i.ot_destino ? 'selected' : ''}>${esc(o.numero)} · ${esc((o.nombre || '').slice(0, 60))}${o.cliente ? ' · ' + esc(o.cliente) : ''}</option>`).join('')}</select></div>
   <div id="f-nueva" class="${i.modo === 'AGREGAR' ? 'hidden' : ''}">
     <div class="row">${pi ? '' : `<div><label>Cliente *</label><input id="f-cli" value="${esc(i.cliente || '')}" placeholder="Ej. SHOUGANG HIERRO PERU"></div>`}
       <div style="flex:2 1 300px"><label>${pi ? 'Nombre del proyecto *' : 'Servicio *'}</label><input id="f-nom" value="${esc(i.nombre || '')}" placeholder="${pi ? 'Ej. Banco de pruebas para módulos ACS2000' : 'Ej. Reparación de 2 módulos ACS2000'}"></div>
       <div style="flex:0 0 170px"><label>Tipo</label><select id="f-tipo">${Object.entries(TIPOS_OT).map(([k, v]) => `<option value="${k}" ${k === (i.tipo || 'REPARACION') ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
     <div style="margin-top:8px"><label>${pi ? 'Objetivo / alcance técnico' : 'Descripción técnica / alcance'}</label><textarea id="f-desc">${esc(i.descripcion || '')}</textarea></div>
     <div class="row" style="margin-top:8px"><div><label>Responsable</label><input id="f-resp" value="${esc(i.responsable || '')}"></div>
       <div><label>${pi ? 'Fecha de inicio' : 'Fecha de inicio (opcional)'}</label><input type="date" id="f-ini" value="${i.fecha_inicio || ''}"></div>
       <div><label>Entrega estimada</label><input type="date" id="f-ent" value="${i.fecha_entrega || ''}"></div></div>
   </div>
   <div class="row" style="margin-top:8px">${pi ? '' : `<div><label>Guía de entrada</label><input id="f-guia" value="${esc(i.guia || '')}" placeholder="Ej. EG07-00018776"></div>
     <div><label>Fecha de recepción</label><input type="date" id="f-rec" value="${i.fecha_recepcion || hoyLima()}" max="${hoyLima()}"></div>`}
     <div style="flex:0 0 150px"><label>Prioridad</label><select id="f-pri">${['BAJA', 'NORMAL', 'ALTA', 'URGENTE'].map(p => `<option ${p === (i.prioridad || 'NORMAL') ? 'selected' : ''}>${p}</option>`).join('')}</select></div></div>
   <h2>${pi ? 'Componentes / materiales del proyecto (opcional)' : 'Componentes recibidos *'}</h2>
   <div style="overflow:auto"><table class="tabla-in"><thead><tr><th>Descripción *</th><th>Marca</th><th>Modelo</th><th>N° parte</th><th>N° serie</th><th>Cant.</th><th>Falla reportada</th><th></th></tr></thead><tbody id="f-comps">${comps.map(filaC).join('')}</tbody></table></div>
   <button class="sm" id="f-addc" style="margin-top:6px">+ Otro componente</button>
   <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button id="f-x">Cancelar</button><button id="f-bor">Guardar borrador</button><button class="pri" id="f-env">${esGer() ? 'Guardar, aprobar y crear en el Maestro' : 'Guardar y enviar a Gerencia'}</button></div>`);
  let modo = pi ? 'NUEVA' : (i.modo || 'NUEVA');
  if (!pi) {
    $('#m-nueva').onclick = () => { modo = 'NUEVA'; $('#m-nueva').classList.add('on'); $('#m-agr').classList.remove('on'); $('#f-nueva').classList.remove('hidden'); $('#f-agr').classList.add('hidden'); };
    $('#m-agr').onclick = () => { modo = 'AGREGAR'; $('#m-agr').classList.add('on'); $('#m-nueva').classList.remove('on'); $('#f-agr').classList.remove('hidden'); $('#f-nueva').classList.add('hidden'); };
  }
  const enlazarDel = () => $('#f-comps').querySelectorAll('[data-delc]').forEach(b => b.onclick = () => { b.closest('tr').remove(); if (!$('#f-comps').children.length) $('#f-comps').insertAdjacentHTML('beforeend', filaC({})), enlazarDel(); });
  enlazarDel();
  $('#f-addc').onclick = () => { $('#f-comps').insertAdjacentHTML('beforeend', filaC({})); enlazarDel(); };
  $('#f-x').onclick = cerrarModal;
  const val = id => ($(id)?.value ?? '').trim() || null;
  const guardar = async (enviar) => {
    const reg = { clase: i.clase, modo, ot_destino: modo === 'AGREGAR' ? val('#f-ot') : null, prioridad: $('#f-pri').value,
      guia: val('#f-guia'), fecha_recepcion: pi ? null : val('#f-rec') };
    if (modo === 'NUEVA') Object.assign(reg, { nombre: val('#f-nom'), cliente: pi ? null : val('#f-cli'), tipo: $('#f-tipo').value, descripcion: val('#f-desc'), responsable: val('#f-resp'), fecha_inicio: val('#f-ini'), fecha_entrega: val('#f-ent') });
    else { const o = ots.find(x => x.id === reg.ot_destino); Object.assign(reg, { nombre: o ? 'Agregar a ' + o.numero : null, cliente: o?.cliente || null }); }
    const cs = [...$('#f-comps').children].map(tr => { const c = {}; tr.querySelectorAll('[data-k]').forEach(inp => c[inp.dataset.k] = inp.value.trim() || null); c.cantidad = +c.cantidad || 1; return c; }).filter(c => c.descripcion);
    if (modo === 'AGREGAR' && !reg.ot_destino) return toast('Elige la OT a la que se agregan los componentes');
    if (modo === 'NUEVA' && !reg.nombre) return toast(pi ? 'Escribe el nombre del proyecto' : 'Escribe el servicio');
    if (modo === 'NUEVA' && !pi && !reg.cliente) return toast('Escribe el cliente');
    if (!pi && !cs.length) return toast('Agrega al menos un componente (descripción)');
    // aviso de N° de serie que ya están en una OT activa
    const series = cs.map(c => (c.numero_serie || '').toUpperCase()).filter(Boolean);
    if (enviar && series.length) {
      const { data: dup } = await sb.from('componentes').select('numero_serie, ot_id').in('numero_serie', series);
      const act = (dup || []).filter(d => ots.find(o => o.id === d.ot_id && o.estado === 'activo') && d.ot_id !== reg.ot_destino);
      if (act.length && !confirm('Atención: estos N° de serie ya están en una OT activa:\n' + act.map(d => d.numero_serie + ' → ' + (ots.find(o => o.id === d.ot_id)?.numero || '')).join('\n') + '\n\n¿Crear de todos modos?')) return;
    }
    const b1 = $('#f-bor'), b2 = $('#f-env'); b1.disabled = b2.disabled = true;
    try {
      let id = i.id;
      if (id) { const { error } = await sb.from('ingresos').update(reg).eq('id', id); if (error) throw error;
        const { error: e2 } = await sb.from('ingreso_componentes').delete().eq('ingreso_id', id); if (e2) throw e2; }
      else { const { data, error } = await sb.from('ingresos').insert(reg).select('id').single(); if (error) throw error; id = data.id; }
      if (cs.length) { const { error } = await sb.from('ingreso_componentes').insert(cs.map(c => ({ ...c, ingreso_id: id }))); if (error) throw error; }
      if (!enviar) { cerrarModal(); toast('Borrador guardado'); return vistaIngresos('registros'); }
      if (!esGer()) return solicitarAprobacion(id);
      await enviarIngreso({ id, codigo: '' }, true);
    } catch (e) { toast(e.message, 6000); b1.disabled = b2.disabled = false; }
  };
  $('#f-bor').onclick = () => guardar(false);
  $('#f-env').onclick = () => guardar(true);
}

async function enviarIngreso(i, sinConfirmar) {
  if (!sinConfirmar && !confirm('Se creará la OT / PI en el Maestro con su número oficial (o se agregarán los componentes a la OT elegida). Revisa antes que los componentes del mismo servicio estén unidos en este registro. ¿Continuar?')) return;
  modal('<div class="loading">Creando en el Maestro…</div>');
  const { data, error } = await sb.rpc('enviar_ingreso', { p_id: i.id });
  if (error) { cerrarModal(); toast('No se pudo crear: ' + error.message, 7000); return vistaIngresos('registros'); }
  CACHE.ot = null;
  modal(`<h1>✔ Registrado en el Maestro</h1><p style="font-size:18px">OT / PI: <b class="mono">${esc(data.numero)}</b></p>
    <p class="muted">Los avances registrados mientras esperaba aprobación ya quedaron en esta OT. Completa la parte comercial (cotización, OC) en el Maestro.</p>
    <div style="display:flex;gap:8px;justify-content:flex-end"><a class="btn" href="#/ot/${esc(data.ot_id || '')}" onclick="cerrarModal()">Ver OT</a><button class="pri" id="ok-x">Aceptar</button></div>`);
  $('#ok-x').onclick = () => { cerrarModal(); vistaIngresos('registros'); };
}

async function solicitarAprobacion(id) {
  const { error } = await sb.rpc('solicitar_aprobacion', { p_id: id });
  cerrarModal();
  if (error) { toast('No se pudo enviar: ' + error.message, 7000); return vistaIngresos('registros'); }
  toast('Enviado a Gerencia para su aprobación', 5000); vistaIngresos('registros');
}

function devolverIngreso(i) {
  modal(`<h1>Devolver ${esc(i.codigo)} al supervisor</h1><label>¿Qué debe corregir? *</label><textarea id="dv-c" placeholder="Ej. Une los 4 componentes de GPR en un solo registro"></textarea>
   <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button id="dv-x">Cancelar</button><button class="pri" id="dv-ok">Devolver</button></div>`);
  $('#dv-x').onclick = cerrarModal;
  $('#dv-ok').onclick = async () => {
    const c = $('#dv-c').value.trim(); if (!c) return toast('Escribe el comentario');
    const { error } = await sb.rpc('devolver_ingreso', { p_id: i.id, p_comentario: c });
    if (error) return toast(error.message, 6000);
    cerrarModal(); toast('Devuelto al supervisor'); vistaIngresos('registros');
  };
}

async function unirIngresos(i) {
  const { data } = await sb.from('ingresos').select('id,codigo,nombre,cliente,estado,ingreso_componentes(descripcion,numero_serie)').in('estado', ['BORRADOR', 'POR_APROBAR']).eq('clase', i.clase).neq('id', i.id).order('created_at');
  const otros = (data || []).sort((a, b) => ((b.cliente || '') === (i.cliente || '')) - ((a.cliente || '') === (i.cliente || '')));
  if (!otros.length) return toast('No hay otros registros en borrador o por aprobar para unir');
  modal(`<h1>Unir con ${esc(i.codigo)}</h1><p class="muted">Los componentes y los trabajos registrados de los registros marcados pasan a <b>${esc(i.codigo)}</b> (${esc(i.nombre || '')}); esos registros quedan anulados como "Unido a ${esc(i.codigo)}". Así se crea <b>una sola OT</b> para todo el servicio.</p>
   <div style="overflow:auto"><table><thead><tr><th></th><th>Código</th><th>Servicio</th><th>Cliente</th><th>Componentes</th></tr></thead><tbody>${otros.map(o => `<tr><td><input type="checkbox" data-u="${o.id}" ${(o.cliente || '') === (i.cliente || '') && i.cliente ? 'checked' : ''}></td><td class="mono">${esc(o.codigo)}</td><td>${esc(o.nombre || '')}</td><td>${esc(o.cliente || '')}</td><td>${esc((o.ingreso_componentes || []).map(c => [c.descripcion, c.numero_serie].filter(Boolean).join(' · ')).join(' / '))}</td></tr>`).join('')}</tbody></table></div>
   <div style="margin-top:8px"><label>Nombre del servicio para la OT única (opcional)</label><input id="u-nom" value="${esc(i.nombre || '')}"></div>
   <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button id="u-x">Cancelar</button><button class="pri" id="u-ok">Unir</button></div>`);
  $('#u-x').onclick = cerrarModal;
  $('#u-ok').onclick = async () => {
    const ids = [...document.querySelectorAll('[data-u]:checked')].map(x => x.dataset.u);
    if (!ids.length) return toast('Marca al menos un registro');
    const { error } = await sb.rpc('unir_ingresos', { p_destino: i.id, p_otros: ids });
    if (error) return toast(error.message, 6000);
    const nom = $('#u-nom').value.trim();
    if (nom && nom !== i.nombre) await sb.from('ingresos').update({ nombre: nom }).eq('id', i.id);
    cerrarModal(); toast(`${ids.length} registro(s) unidos en ${i.codigo}`, 5000); vistaIngresos('registros');
  };
}

function anularIngreso(i) {
  modal(`<h1>Anular ${esc(i.ot_numero || i.codigo)}</h1>
   <p class="muted">${i.estado === 'ENVIADO' ? 'La OT se marcará como cancelada en el Maestro. Solo es posible si aún no tiene trabajos, cotización ni OC.' : 'El borrador quedará anulado.'}</p>
   <label>Motivo *</label><input id="an-m"><div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button id="an-x">Cancelar</button><button class="peligro" id="an-ok">Anular</button></div>`);
  $('#an-x').onclick = cerrarModal;
  $('#an-ok').onclick = async () => {
    const m = $('#an-m').value.trim(); if (!m) return toast('Escribe el motivo');
    const { error } = await sb.rpc('anular_ingreso', { p_id: i.id, p_motivo: m });
    if (error) return toast(error.message, 6000);
    CACHE.ot = null; cerrarModal(); toast('Anulado'); vistaIngresos('registros');
  };
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
   ${htmlAlertas(r.alertas)}
   ${!r.laborable ? `<p><span class="chip amb">${r.feriado ? 'Feriado: ' + esc(r.feriado) : 'Fin de semana'}${r.total_registros ? ' · día extra' : ''}</span></p>` : ''}
   <div class="kpis"><div class="kpi"><b>${r.total_registros}</b>registros</div><div class="kpi"><b>${(+r.total_horas).toFixed(1)}</b>horas</div><div class="kpi"><b>${r.revisados ?? 0} / ${r.total_registros}</b>revisados por el supervisor</div><div class="kpi"><b>${tec.filter(t => t.registros > 0).length} / ${tec.length}</b>técnicos con registro</div></div>
   ${tec.map(t => `<h2>${esc(titleCase(t.nombre))} <span class="muted">· ${esc(t.cargo || '')} · ${t.registros} registro(s) · ${(+t.horas).toFixed(1)} h</span></h2>
     ${t.items.length ? `<div class="card" style="padding:0;overflow:auto"><table><thead><tr><th>OT / PI</th><th>Equipo / serie</th><th>Tipo</th><th>Trabajo realizado</th><th>Hallazgos</th><th>Repuestos</th><th>Horas</th><th>Estado</th></tr></thead><tbody>${t.items.map(i => `<tr><td class="mono">${esc(i.ot)}<div class="muted">${esc((i.cliente || '').slice(0, 30))}</div></td><td>${esc(i.equipo || '')}${i.serie ? `<div class="mono muted">${esc(i.serie)}</div>` : ''}</td><td>${TIPOS[i.tipo] || i.tipo}</td><td>${esc(i.actividad)}${i.dias_repetidos >= 3 ? `<div class="alerta">⚠ Día ${i.dias_repetidos} seguido · ${esc(MOTIVOS[i.motivo] || '')}${i.motivo_detalle ? ': ' + esc(i.motivo_detalle) : ''}</div>` : ''}</td><td>${esc(i.hallazgos || '')}</td><td>${esc(i.repuestos || '')}</td><td>${i.horas ?? ''}</td><td>${ESTADOS[i.estado]?.[0] || i.estado}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card muted">Sin registros en el día.</div>'}`).join('')}`;
  $('#r-pdf').onclick = () => window.print();
  $('#r-xls').onclick = () => {
    const rows = []; tec.forEach(t => t.items.forEach(i => rows.push({ Fecha: fecha, Tecnico: t.nombre, Cargo: t.cargo, OT: i.ot, Servicio: i.ot_nombre, Cliente: i.cliente, Equipo: i.equipo, Serie: i.serie, Tipo: TIPOS[i.tipo] || i.tipo, Trabajo: i.actividad, Hallazgos: i.hallazgos, Repuestos: i.repuestos, Horas: i.horas, Estado: ESTADOS[i.estado]?.[0] || i.estado })));
    if (!rows.length) return toast('No hay registros ese día');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Reporte'); XLSX.writeFile(wb, `Reporte_diario_${fecha}.xlsx`);
  };
  $('#r-per').onclick = async () => {
    const d = $('#r-d').value, h = $('#r-h').value; if (!d || !h || d > h) return toast('Revisa el periodo');
    const per = await cargarPerfiles(); const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o]));
    const { data } = await sb.from('avances').select('*, ingreso:ingresos(codigo,nombre,cliente)').gte('fecha', d).lte('fecha', h).order('fecha').order('created_at');
    if (!data?.length) return toast('Sin registros en el periodo');
    const rows = data.map(a => ({ Fecha: a.fecha, Tecnico: per[a.tecnico_id]?.nombre, OT: otMap[a.ot_id]?.numero || (a.ingreso ? a.ingreso.codigo + ' (por aprobar)' : ''), Servicio: otMap[a.ot_id]?.nombre || a.ingreso?.nombre, Cliente: otMap[a.ot_id]?.cliente || a.ingreso?.cliente, Equipo: a.equipo, Serie: a.numero_serie, Tipo: TIPOS[a.tipo_trabajo], Trabajo: a.actividad, Hallazgos: a.hallazgos, Repuestos: a.repuestos, Horas: a.horas, Estado: ESTADOS[a.estado]?.[0], Revisado: a.revisado_at ? 'Sí' : 'No' }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Bitacora'); XLSX.writeFile(wb, `Bitacora_${d}_al_${h}.xlsx`);
  };
}

// ---------- revisión (supervisor / gerencia) ----------
async function vistaRevision() {
  const per = await cargarPerfiles(); const ots = await cargarOT(); const otMap = Object.fromEntries(ots.map(o => [o.id, o]));
  $('#app').innerHTML = `<h1>Revisión de registros</h1><p class="muted">Registros de los últimos 15 días aún no revisados.</p><div id="tl"><div class="loading">Cargando…</div></div>`;
  const cargar = async () => {
    const desde = new Date(Date.now() - 15 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const { data: avs } = await sb.from('avances').select('*, ingreso:ingresos(codigo,nombre,cliente)').is('revisado_at', null).gte('fecha', desde).order('fecha', { ascending: false });
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


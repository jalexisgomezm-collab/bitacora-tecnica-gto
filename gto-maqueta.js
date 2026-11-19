/* Maqueta Sistema Integrado GTO aplicada a la Bitácora (18/11/2026). Solo presentación: reubica en pantalla
   los mismos enlaces y botones (el menú, la campana de OT y Salir siguen siendo los originales, con sus funciones). */
(() => {
  const MENU = 'https://sistema-integrado-gto.vercel.app';
  const P = {
    herr: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    portapapeles: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 13l2 2 4-4',
    dia: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
    ot: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4',
    serie: 'M12 3a9 9 0 1 0 9 9M12 7v5l3 2M21 3v5h-5',
    reporte: 'M4 20V11M10 20V5M16 20v-6M3 20h18',
    ingresos: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
    borradores: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
    informes: 'M6 2h9l5 5v15H6zM14 2v6h6M9 12h6M9 16h6',
    revision: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
    campana: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a2 2 0 0 0 3.4 0',
    personal: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-4.9',
  };
  const svg = (k, cls = 'gto-maq-ic') => {
    const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    for (const [a, b] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) s.setAttribute(a, b);
    if (cls) s.setAttribute('class', cls);
    p.setAttribute('d', P[k]); s.append(p); return s;
  };
  const ICONO_NAV = { '#/': 'dia', '#/ot': 'ot', '#/serie': 'serie', '#/reporte': 'reporte', '#/ingresos': 'ingresos', '#/borradores': 'borradores', '#/informes': 'informes', '#/revision': 'revision', '#/personal': 'personal' };

  /* ---------- Bandeja de avisos del taller (solo lectura) ----------
     Junta: avisos manuales de avisos-taller.js, entregas próximas o atrasadas, OT registradas
     esta semana y los recordatorios generales. Solo consulta; la marca de leído queda en este navegador. */
  const VISTOS = 'gto_bit_avisos_vistos';
  const fDia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' });
  const hoy = () => fDia.format(new Date());
  const sumar = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const dif = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const ddmm = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
  const vistos = () => { try { const v = JSON.parse(localStorage.getItem(VISTOS) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const marcar = keys => { try { localStorage.setItem(VISTOS, JSON.stringify([...new Set([...vistos(), ...keys])].slice(-600))); } catch {} };
  const ETIQ = { visita: 'Visita del cliente', urgente: 'Cliente pide apurar', recojo: 'Recojo', entrega: 'Entrega', aviso: 'Aviso' };
  let avisos = [], cargando = false, errorTxt = '', ultimo = 0;
  function cargarArchivo() {
    if (window.AVISOS_TALLER || document.getElementById('gto-avisos-taller')) return;
    const s = document.createElement('script'); s.id = 'gto-avisos-taller'; s.src = '/avisos-taller.js?t=' + Math.floor(Date.now() / 600000);
    s.onload = () => { pintarBandeja(); }; document.head.append(s);
  }
  async function consultar() {
    if (cargando || typeof sb === 'undefined') return;
    cargando = true; pintarBandeja();
    const d = hoy(); const lunes = sumar(d, -((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7));
    const lista = [];
    try {
      const [sem, ent] = await Promise.all([
        sb.from('ot').select('id,numero,nombre,cliente,estado,created_at').gte('created_at', lunes + 'T05:00:00Z').order('created_at', { ascending: false }).limit(40),
        sb.from('ot').select('id,numero,nombre,cliente,estado,estado_operativo,fecha_entrega').gte('fecha_entrega', sumar(d, -30)).lte('fecha_entrega', sumar(d, 7)).order('fecha_entrega').limit(60),
      ]);
      if (sem.error && ent.error) throw sem.error;
      for (const o of ent.data || []) {
        if (o.estado !== 'activo' || o.estado_operativo === 'ENTREGADO' || !o.fecha_entrega) continue;
        const n = dif(d, o.fecha_entrega);
        const cuando = n === 0 ? 'se entrega hoy' : n === 1 ? 'se entrega mañana' : n > 1 ? `se entrega en ${n} días (${ddmm(o.fecha_entrega)})` : `entrega atrasada ${-n} día${n === -1 ? '' : 's'} (era el ${ddmm(o.fecha_entrega)})`;
        lista.push({ key: `ent-${o.id}-${o.fecha_entrega}`, grupo: 'entregas', titulo: `${o.numero} ${cuando}`, texto: [o.nombre, o.cliente].filter(Boolean).join(' · '), href: `#/ot/${o.id}`, alerta: n < 0 });
      }
      for (const o of sem.data || []) {
        if (o.estado === 'cancelado') continue;
        const f = new Date(o.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        lista.push({ key: `sem-${o.id}`, grupo: 'semana', titulo: `${o.numero} · ${o.nombre || ''}`.trim(), texto: [o.cliente, 'registrada ' + f].filter(Boolean).join(' · '), href: `#/ot/${o.id}` });
      }
      // Revisión de registros: aviso al supervisor (y a Gerencia, que puede revisar en su lugar)
      if (typeof esSup === 'function' && esSup()) {
        const { data: sinRev } = await sb.from('avances').select('id,fecha').is('revisado_at', null).gte('fecha', sumar(d, -15)).lt('fecha', d).order('fecha');
        const n = (sinRev || []).length;
        if (n) {
          const ger = typeof esGer === 'function' && esGer();
          lista.push({ key: `rev-${d}-${n}`, grupo: 'revision', titulo: `${n} registro(s) de días anteriores sin revisar`, texto: ger ? 'Le corresponde revisarlos al supervisor. Puedes revisarlos tú; quedará tu nombre como revisor.' : 'Revísalos desde Revisión.', etiqueta: `El más antiguo es del ${ddmm(sinRev[0].fecha)}`, href: '#/revision', alerta: n >= 10, aviso: n < 10 });
        }
      }
      errorTxt = '';
    } catch (e) { errorTxt = 'No se pudieron consultar las OT. Recarga la página para reintentar.'; }
    avisos = lista; cargando = false; ultimo = Date.now(); pintarBandeja();
  }
  function manuales() {
    const d = hoy();
    return (window.AVISOS_TALLER || []).filter(a => a && /^\d{4}-\d{2}-\d{2}$/.test(a.fecha) && a.fecha >= d && a.fecha <= sumar(d, 7)).map(a => {
      const n = dif(d, a.fecha); const cuando = n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : ddmm(a.fecha);
      return { key: `man-${a.fecha}-${a.titulo}`, grupo: 'taller', titulo: a.titulo || ETIQ[a.tipo] || 'Aviso', texto: [a.texto, a.ot].filter(Boolean).join(' · '), etiqueta: `${ETIQ[a.tipo] || 'Aviso'} · ${cuando}${a.hora ? ' · ' + a.hora : ''}`, alerta: a.tipo === 'urgente' };
    }).sort((x, y) => x.etiqueta.localeCompare(y.etiqueta));
  }
  function generales() {
    try {
      if (!window.GTOStatus || !window.GTOStatus.notices || !window.FIJOS) return [];
      return window.GTOStatus.notices(new Date(), { events: window.EVENTOS, fixed: window.FIJOS, safety: window.SEGURIDAD })
        .filter(x => x.active).map(x => ({ key: 'gen-' + x.id, grupo: 'general', titulo: x.title, texto: x.text, etiqueta: x.label }));
    } catch { return []; }
  }
  let boton = null, panel = null, fondo = null, lista = null, contador = null;
  function crearBandeja() {
    if (boton) return;
    boton = document.createElement('button'); boton.type = 'button'; boton.className = 'gto-bit-campana';
    boton.append(svg('campana', '')); contador = document.createElement('span'); contador.className = 'gto-bit-n'; boton.append(contador);
    fondo = document.createElement('div'); fondo.className = 'gto-bit-fondo'; fondo.hidden = true;
    panel = document.createElement('section'); panel.className = 'gto-bit-bandeja'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Bandeja de avisos');
    const cab = document.createElement('header'); const h = document.createElement('h2'); h.textContent = 'Bandeja de avisos';
    const cerrar = document.createElement('button'); cerrar.type = 'button'; cerrar.textContent = 'Cerrar';
    cab.append(h, cerrar); lista = document.createElement('div'); lista.className = 'gto-bit-lista'; panel.append(cab, lista);
    document.body.append(fondo, panel);
    const ocultar = () => { panel.hidden = fondo.hidden = true; };
    boton.onclick = () => { panel.hidden = fondo.hidden = false; pintarBandeja(); if (Date.now() - ultimo > 120000) consultar(); };
    cerrar.onclick = ocultar; fondo.onclick = ocultar;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) ocultar(); });
    lista.addEventListener('click', e => { const a = e.target.closest('a[data-key]'); if (a) { marcar([a.dataset.key]); ocultar(); pintarBandeja(); } });
    setInterval(consultar, 10 * 60 * 1000);
  }
  function pintarBandeja() {
    if (!boton) return;
    const todos = [...manuales(), ...avisos, ...generales()];
    const v = vistos(); const n = todos.filter(a => !v.includes(a.key)).length;
    contador.textContent = n ? String(n) : ''; boton.setAttribute('aria-label', `Bandeja de avisos, ${n} sin leer`); boton.title = 'Bandeja de avisos';
    if (panel.hidden) return;
    lista.replaceChildren();
    const sec = (titulo, items, vacio) => {
      const h = document.createElement('h3'); h.textContent = titulo + (items.length ? ` · ${items.length}` : ''); lista.append(h);
      if (!items.length) { if (vacio) { const p = document.createElement('p'); p.className = 'gto-bit-vacio'; p.textContent = vacio; lista.append(p); } return; }
      for (const a of items) {
        const art = document.createElement(a.href ? 'a' : 'article');
        art.className = 'gto-bit-item' + (v.includes(a.key) ? '' : ' nuevo') + (a.alerta ? ' alerta' : '');
        if (a.href) { art.href = a.href; art.dataset.key = a.key; }
        if (a.etiqueta) { const s = document.createElement('small'); s.textContent = a.etiqueta; art.append(s); }
        const b = document.createElement('strong'); b.textContent = a.titulo; const p = document.createElement('p'); p.textContent = a.texto || '';
        art.append(b, p); lista.append(art);
      }
    };
    if (errorTxt) { const p = document.createElement('p'); p.className = 'gto-bit-error'; p.textContent = errorTxt; lista.append(p); }
    if (cargando && !avisos.length) { const p = document.createElement('p'); p.className = 'gto-bit-vacio'; p.textContent = 'Consultando OT…'; lista.append(p); }
    const rev = todos.filter(a => a.grupo === 'revision'); if (rev.length) sec('Revisión de registros', rev);
    sec('Visitas y pedidos de clientes', todos.filter(a => a.grupo === 'taller'), 'Sin visitas ni pedidos de urgencia registrados para estos días.');
    sec('Entregas próximas y atrasadas', todos.filter(a => a.grupo === 'entregas'), 'Ninguna OT con entrega en los próximos 7 días.');
    sec('OT registradas esta semana', todos.filter(a => a.grupo === 'semana'), 'Aún no se registran OT esta semana.');
    sec('Recordatorios generales', todos.filter(a => a.grupo === 'general'));
    if (todos.some(a => !v.includes(a.key))) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gto-bit-leer'; b.textContent = 'Marcar todo como leído';
      b.onclick = () => { marcar(todos.map(a => a.key)); pintarBandeja(); }; lista.append(b);
    }
  }
  function ubicarBandeja(bar2) {
    crearBandeja();
    if (boton.parentElement !== bar2) {
      const general = bar2.querySelector('.gto-shared-bell, .gto-status-bell-only');
      const sitio = general ? (general.closest('.gto-shared-bell') || general) : null;
      if (sitio) sitio.after(boton); else bar2.append(boton);
    }
  }
  let side = null;
  function lateral(header) {
    const nav = document.getElementById('nav');
    if (!nav) return;
    if (!side) {
      side = document.createElement('aside');
      side.className = 'gto-bit-side no-print';
      side.setAttribute('aria-label', 'Navegación de la Bitácora');
      side.innerHTML = `<div class="gto-bit-mod"><img src="${MENU}/assets/icono-taller.png" alt=""><strong>Bitácora Técnica</strong></div>`;
      const foot = document.createElement('p'); foot.className = 'gto-bit-foot'; foot.textContent = 'GTO PERÚ · Laboratorio y taller';
      side.append(foot);
    }
    if (!side.isConnected) header.after(side);
    if (nav.parentElement !== side) side.insertBefore(nav, side.querySelector('.gto-bit-foot'));
    // Íconos en los enlaces (el texto y el enlace siguen siendo los del sistema)
    nav.querySelectorAll('a').forEach(a => {
      if (a.querySelector(':scope > svg.gto-bit-ic')) return;
      const k = ICONO_NAV[a.getAttribute('href')]; if (k) a.prepend(svg(k, 'gto-bit-ic'));
    });
  }
  function barra(header) {
    const bar = header.querySelector('.gto-shared-toolbar'); if (!bar) return;
    const img = bar.querySelector('.gto-toolbar-brand img');
    if (img && !img.dataset.maq) { img.dataset.maq = '1'; img.src = '/logo-gto-blanco.png'; }
    const span = bar.querySelector('.gto-toolbar-brand span');
    if (span && !span.dataset.maq) { span.dataset.maq = '1'; span.replaceChildren(svg('herr'), document.createTextNode('Bitácora Técnica')); }
    const quick = bar.querySelector('.gto-toolbar-quick');
    if (quick) {
      quick.querySelectorAll('.gto-toolbar-action:not(.gto-maq-portal)').forEach(a => a.classList.add('gto-maq-oculto'));
      if (!quick.querySelector('.gto-maq-portal')) {
        const a = document.createElement('a'); a.className = 'gto-toolbar-action gto-maq-portal'; a.href = MENU;
        a.append(svg('grid'), document.createTextNode('Menú GTO')); quick.append(a); quick.hidden = false;
      }
    }
    const bar2 = bar.querySelector('.barra'); const reloj = bar2 && bar2.querySelector('.chip.reloj');
    const ind = bar.querySelector('.gto-toolbar-indicators');
    if (reloj && ind) {
      ind.querySelectorAll('.gto-toolbar-popover > .chip').forEach(c => reloj.before(c));
      if (!ind.querySelector('.gto-toolbar-popover > *')) ind.classList.add('gto-maq-oculto');
    }
    // Una sola campana: la bandeja de avisos del taller (la campana general y la de OT nuevas quedan ocultas)
    if (bar2) { bar2.querySelectorAll(':scope > .campana-ot').forEach(b => b.remove()); ubicarBandeja(bar2); }
    // Mi cuenta: nombre del usuario y Salir (el botón Salir original hace el cierre de sesión)
    const menus = bar.querySelectorAll('.gto-toolbar-menu:not(.gto-toolbar-indicators)');
    const cuenta = menus[menus.length - 1];
    const salir = document.getElementById('salir');
    const who = document.getElementById('who');
    if (cuenta && salir && !cuenta.dataset.maq) {
      cuenta.dataset.maq = '1';
      const sum = cuenta.querySelector('summary');
      if (sum) sum.replaceChildren(svg('usuario'), document.createTextNode('Mi cuenta'));
      const pop = cuenta.querySelector('.gto-toolbar-popover');
      if (pop) {
        const nombre = who ? Array.from(who.querySelectorAll(':scope > span')).map(s => s.textContent.trim()).filter(Boolean).join(' ') : '';
        if (nombre) { const s = document.createElement('strong'); s.className = 'gto-toolbar-account'; s.textContent = nombre; pop.prepend(s); }
        pop.querySelectorAll('a.gto-toolbar-action').forEach(a => { if (/men[uú] gto/i.test(a.textContent)) a.classList.add('gto-maq-oculto'); });
        const b = document.createElement('button'); b.type = 'button'; b.className = 'gto-toolbar-action'; b.textContent = 'Salir';
        b.addEventListener('click', () => salir.click()); pop.append(b);
      }
    }
  }
  function aplicar() {
    try {
      const header = document.querySelector('body > header.top');
      const dentro = !!document.getElementById('salir') && !document.body.classList.contains('en-login');
      document.body.classList.toggle('gto-bit-shell', dentro);
      if (!header || !dentro) return;
      lateral(header);
      barra(header);
      cargarArchivo();
      if (!ultimo && !cargando) consultar();
      const h = header.getBoundingClientRect().height; if (h) document.documentElement.style.setProperty('--gto-bit-top', Math.round(h) + 'px');
    } catch (e) { /* solo diseño: si algo falla, la pantalla sigue igual */ }
  }
  new MutationObserver(aplicar).observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', aplicar);
  aplicar();
})();

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
    personal: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-4.9',
  };
  const svg = (k, cls = 'gto-maq-ic') => {
    const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    for (const [a, b] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) s.setAttribute(a, b);
    if (cls) s.setAttribute('class', cls);
    p.setAttribute('d', P[k]); s.append(p); return s;
  };
  const ICONO_NAV = { '#/': 'dia', '#/ot': 'ot', '#/serie': 'serie', '#/reporte': 'reporte', '#/ingresos': 'ingresos', '#/borradores': 'borradores', '#/informes': 'informes', '#/revision': 'revision', '#/personal': 'personal' };
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
    // Campana de OT nuevas (botón original de la Bitácora) junto a la campana general
    const campana = document.getElementById('avisos-ot');
    const general = bar2 && bar2.querySelector('.gto-shared-bell, .gto-status-bell-only');
    if (bar2) bar2.querySelectorAll(':scope > .campana-ot').forEach(b => { if (b !== campana) b.remove(); });
    if (campana && bar2 && campana.parentElement !== bar2) {
      campana.title = 'Avisos de OT nuevas';
      const old = campana.querySelector(':scope > svg'); if (old && !campana.dataset.maq) { campana.dataset.maq = '1'; old.replaceWith(svg('portapapeles', '')); }
      const sitio = general ? (general.closest('.gto-shared-bell') || general) : null;
      if (sitio) sitio.before(campana); else bar2.append(campana);
    }
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
      const h = header.getBoundingClientRect().height; if (h) document.documentElement.style.setProperty('--gto-bit-top', Math.round(h) + 'px');
    } catch (e) { /* solo diseño: si algo falla, la pantalla sigue igual */ }
  }
  new MutationObserver(aplicar).observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', aplicar);
  aplicar();
})();

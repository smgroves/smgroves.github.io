/* ============================================================ */
/*  DS 6042 — shared lab JS                                      */
/*  Every lab page MUST link this file BEFORE its own viz.js:    */
/*    <script src="../shared/lab-base.js?v=N"></script>         */
/*    <script src="viz.js?v=N"></script>                         */
/*                                                                */
/*  Owns: the presentation-mode toggle, TOC active-link tracking,*/
/*  and a tiny `LabBase` namespace with helpers labs can reuse.  */
/* ============================================================ */

(function () {
  'use strict';

  const NS = (window.LabBase = window.LabBase || {});

  // ----- Tiny utilities reused across labs ----- ----- ----- -----
  NS.makeLcg = function (seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  };

  NS.softmax = function (s, t) {
    t = t || 1.0;
    const scaled = s.map(v => v / t);
    const m = Math.max.apply(null, scaled);
    const e = scaled.map(v => Math.exp(v - m));
    const Z = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / Z);
  };

  NS.downloadBlob = function (filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  // ----- Presentation-mode toggle + navigation ----- ----- -----
  // Implementation contract from CLAUDE.md:
  //   - one #present-toggle button in the lab HTML (top-left, fixed)
  //   - this module wraps it in a .present-controls container and auto-
  //     injects Back / Forward navigation buttons
  //   - toggles body.presentation-mode
  //   - persisted in localStorage
  //   - keyboard: P toggles, Esc exits, ← PageUp = back, → PageDown = forward
  //               (↑ / ↓ scroll the page as usual)
  //
  // Labs only need:  <button id="present-toggle" class="present-toggle">…</button>
  (function initPresentationMode() {
    const btn = document.getElementById('present-toggle');
    if (!btn) return;
    const STORAGE_KEY = 'lab.presentationMode';

    // Wrap the toggle in a .present-controls container (idempotent — if the
    // page already has its own container, we reuse it).
    let wrap = btn.parentElement;
    if (!wrap || !wrap.classList.contains('present-controls')) {
      wrap = document.createElement('div');
      wrap.className = 'present-controls';
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);
    }

    // Inject Back / Forward buttons (hidden by CSS until in presentation mode).
    function makeNavBtn(id, glyph, label, ariaLabel) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = id;
      b.className = 'present-toggle present-nav';
      b.title = label;
      b.setAttribute('aria-label', ariaLabel);
      b.innerHTML = '<span class="present-icon">' + glyph + '</span>';
      return b;
    }
    const backBtn = makeNavBtn('present-back',    '◀', 'Previous slide (←)', 'Previous slide');
    const fwdBtn  = makeNavBtn('present-forward', '▶', 'Next slide (→)',     'Next slide');
    wrap.insertBefore(backBtn, btn);   // [◀ Back] [Present/Exit]
    wrap.appendChild(fwdBtn);          // … [Forward ▶]

    // Move to the previous / next h2 anchor in the main content.
    //
    // Strategy: identify the index of the "current" slide as the latest
    // heading whose top is at or above the viewport (scrollY + small margin),
    // then step +1 / -1 from it. Avoids the off-by-one where Back used to
    // re-target the current heading.
    function moveSlide(forward) {
      const heads = Array.from(document.querySelectorAll('main h2[id]'));
      if (!heads.length) return;
      // Use a small margin so a heading that's already at the top of the
      // viewport is treated as "current", not "above current".
      const probe = window.scrollY + 40;
      let cur = -1;
      for (let i = 0; i < heads.length; i++) {
        if (heads[i].offsetTop <= probe) cur = i;
        else break;
      }
      const target = forward
        ? Math.min(heads.length - 1, cur + 1)
        : Math.max(0, cur - 1);
      if (heads[target]) window.scrollTo({ top: heads[target].offsetTop - 24, behavior: 'smooth' });
    }
    backBtn.addEventListener('click', () => moveSlide(false));
    fwdBtn.addEventListener('click',  () => moveSlide(true));

    function apply(on) {
      document.body.classList.toggle('presentation-mode', on);
      const labelEl = btn.querySelector('.present-label');
      if (labelEl) labelEl.textContent = on ? 'Exit' : 'Present';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
    }

    function toggle() { apply(!document.body.classList.contains('presentation-mode')); }

    btn.addEventListener('click', toggle);

    document.addEventListener('keydown', (e) => {
      // Don't intercept while typing in inputs.
      if (e.target.matches && e.target.matches('input, textarea, [contenteditable]')) return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); toggle(); return; }
      const inPresent = document.body.classList.contains('presentation-mode');
      if (e.key === 'Escape' && inPresent) { apply(false); return; }
      // ↑ / ↓ are intentionally left alone so they scroll the page in
      // presentation mode. Use ← / → (or PageUp / PageDown) for slide nav.
      if (inPresent && ['ArrowRight','ArrowLeft','PageDown','PageUp'].includes(e.key)) {
        e.preventDefault();
        const forward = e.key === 'ArrowRight' || e.key === 'PageDown';
        moveSlide(forward);
      }
    });

    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    if (saved === '1') apply(true);
  })();

  // ----- Index / prev / next lab navigation ----- ----- ----- -----
  //
  // Injects:
  //   (a) a fixed "← Index" link in the top-left, sharing the
  //       .present-controls row with the Present toggle
  //   (b) a prev/next/index nav strip at the end of <main>, so readers
  //       can hop between consecutive labs without going back to the index
  //
  // Course sequence is the source of truth here. Adding a lab means adding
  // one entry (in class order). Only list labs that actually exist on disk —
  // the prev/next strip links straight to these files, so a phantom entry
  // would 404. Folders are named class-NN-slug and match the /class-NN/ route.
  const LAB_SEQUENCE = [
    { num: '01', slug: 'class-01-wrangling',    file: 'wrangling.html',  title: 'Wrangling & Robust Statistics' },
    { num: '02', slug: 'class-02-vectors',      file: 'vectors.html',    title: 'Vectors, Distance & the Inner Product' },
    { num: '03', slug: 'class-03-probability',  file: 'binomial.html',   title: 'Coins, trials & the binomial' },
    { num: '04', slug: 'class-04-rng',          file: 'rng.html',        title: 'Random Numbers & the Sample Mean' },
    { num: '05', slug: 'class-05-eda',          file: 'eda.html',        title: 'Proportions, One-Hot Encoding & the ECDF' },
    { num: '06', slug: 'class-06-cdf',          file: 'cdf.html',        title: 'The CDF & inverse transform'  },
    { num: '07', slug: 'class-07-kde',          file: 'kde.html',        title: 'Kernel Density Estimation'    },
    { num: '09', slug: 'class-09-monte-carlo',  file: 'montecarlo.html', title: 'Monte Carlo & the WLLN'       },
    { num: '10', slug: 'class-10-bootstrap',    file: 'bootstrap.html',  title: 'The Bootstrap'                },
    { num: '11', slug: 'class-11-clt',          file: 'clt.html',        title: 'The Central Limit Theorem'    },
  ];

  function currentLabIndex() {
    // URL shapes we accept: .../labs/class-NN-slug/file.html (also lab-NN for
    // any legacy folders). file:/// and http(s):// both work.
    const m = location.pathname.match(/\/(?:class|lab)-(\d{2})/);
    if (!m) return -1;
    const num = m[1];
    return LAB_SEQUENCE.findIndex(l => l.num === num);
  }

  (function initIndexButton() {
    const wrap = document.querySelector('.present-controls');
    if (!wrap) return;
    if (document.getElementById('lab-back-index')) return;
    const a = document.createElement('a');
    a.id = 'lab-back-index';
    a.className = 'present-toggle lab-index-link';
    a.href = '/teaching/2026_fall_ds5030/';
    a.title = 'Back to course index';
    a.setAttribute('aria-label', 'Back to course index');
    a.innerHTML = '<span class="present-icon">⌂</span><span class="present-label">Index</span>';
    wrap.insertBefore(a, wrap.firstChild);  // sits leftmost in the bar
  })();

  (function initPrevNextNav() {
    const main = document.querySelector('main');
    if (!main) return;
    if (main.querySelector('.lab-prev-next')) return;
    const i = currentLabIndex();
    if (i < 0) return;

    const prev = i > 0 ? LAB_SEQUENCE[i - 1] : null;
    const next = i < LAB_SEQUENCE.length - 1 ? LAB_SEQUENCE[i + 1] : null;

    function makeLink(lab, dir) {
      if (!lab) return `<div class="lab-prev-next-empty"></div>`;
      const arrow = dir === 'prev' ? '←' : '→';
      return `
        <a class="lab-prev-next-card lab-prev-next-${dir}" href="../${lab.slug}/${lab.file}">
          <span class="lab-prev-next-dir">${dir === 'prev' ? `${arrow} Previous` : `Next ${arrow}`}</span>
          <span class="lab-prev-next-num">Lab ${lab.num}</span>
          <span class="lab-prev-next-title">${lab.title}</span>
        </a>`;
    }

    const nav = document.createElement('nav');
    nav.className = 'lab-prev-next';
    nav.setAttribute('aria-label', 'Lab navigation');
    nav.innerHTML = `
      ${makeLink(prev, 'prev')}
      <a class="lab-prev-next-card lab-prev-next-home" href="/teaching/2026_fall_ds5030/">
        <span class="lab-prev-next-dir">⌂ Course</span>
        <span class="lab-prev-next-num">Index</span>
        <span class="lab-prev-next-title">All labs · schedule · quizzes</span>
      </a>
      ${makeLink(next, 'next')}
    `;
    // Place before the lab's existing <footer> if there is one, else at the end of <main>.
    const footer = main.querySelector(':scope > footer');
    if (footer) main.insertBefore(nav, footer);
    else main.appendChild(nav);
  })();

  // ----- Inline glossary (contract from CLAUDE.md) ----- ----- --
  // Shared across every lab AND lecture page, so no per-page viz.js needs
  // to redefine this wiring. A page just sets `window.GLOSSARY = {...}`
  // (a lab's viz.js does this at its own top level; a lecture page with no
  // viz.js sets it in an inline <script>) before DOMContentLoaded fires -
  // script tags run in document order, so by DOMContentLoaded every plain
  // <script src> on the page has already executed, GLOSSARY included.
  function initGlossary() {
    const GLOSSARY = window.GLOSSARY || {};
    const panel = document.getElementById('glossary-panel');
    const content = document.getElementById('glossary-content');
    const closeBtn = document.getElementById('glossary-close');
    if (!panel || !content) return;
    const terms = Array.from(document.querySelectorAll('.gloss[data-gloss]'));
    if (!terms.length) return;
    let activeTerm = null;

    function blockFor(node) {
      let n = node;
      while (n && n !== document.body) {
        if (n.tagName && /^(P|LI|H2|H3|H4|FIGURE|TABLE|BLOCKQUOTE|PRE)$/.test(n.tagName)) {
          if (n.tagName === 'LI') {
            const list = n.closest('ul, ol');
            if (list) return list;
          }
          return n;
        }
        n = n.parentElement;
      }
      return node;
    }
    function show(term) {
      const key = term.getAttribute('data-gloss');
      const g = GLOSSARY[key];
      if (!g) return;
      const block = blockFor(term);
      block.parentNode.insertBefore(panel, block.nextSibling);
      content.innerHTML = '<div class="glossary-panel-title">' + g.title + '</div><div class="glossary-content">' + g.body + '</div>';
      panel.hidden = false;
      terms.forEach(t => t.classList.toggle('active', t === term));
      activeTerm = term;
    }
    function hide() {
      panel.hidden = true;
      terms.forEach(t => t.classList.remove('active'));
      activeTerm = null;
    }
    terms.forEach(term => {
      term.setAttribute('tabindex', '0');
      term.setAttribute('role', 'button');
      term.addEventListener('mouseenter', () => show(term));
      term.addEventListener('click', () => (activeTerm === term ? hide() : show(term)));
      term.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activeTerm === term ? hide() : show(term); }
      });
    });
    if (closeBtn) closeBtn.addEventListener('click', hide);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !panel.hidden) {
        if (e.target.matches && e.target.matches('input, textarea')) return;
        hide();
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlossary);
  } else {
    initGlossary();
  }

  // ----- TOC active-link tracking ----- ----- ----- ----- ----- -
  (function initToc() {
    const links = Array.from(document.querySelectorAll('aside.toc a'));
    if (!links.length) return;
    const heads = links.map(a => ({
      a,
      el: document.getElementById(a.getAttribute('href').slice(1)),
    })).filter(h => h.el);
    if (!heads.length) return;
    function update() {
      const y = window.scrollY + 120;
      let active = heads[0];
      for (const h of heads) if (h.el.offsetTop <= y) active = h;
      heads.forEach(h => h.a.classList.toggle('active', h === active));
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();
})();

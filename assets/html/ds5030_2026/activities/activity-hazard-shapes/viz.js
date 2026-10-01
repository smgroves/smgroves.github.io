/* ============================================================
 * Understanding Uncertainty · Activity — Three Shapes of Risk.
 * Companion to Class 08 (Survival Function & Hazard Rate).
 *
 * Weibull with scale β = 1 pinned, shape k on a slider:
 *     S(t) = exp(-(βt)^k)          survival
 *     h(t) = kβ(βt)^(k-1)          hazard
 *     f(t) = h(t) · S(t)           density
 * Verified: ∫f = 1 and E[T] = Γ(1+1/k) for every k tested.
 * ============================================================ */
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const ACCENT = '#b14a2e';
  const SOFT = '#8a857d';

  function el(name, attrs, kids) {
    const e = document.createElementNS(SVGNS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(c => e.appendChild(c));
    return e;
  }
  function fmt(x, d) { return x.toFixed(d == null ? 2 : d); }

  function slider(labelText, min, max, step, val) {
    const wrap = document.createElement('label');
    wrap.className = 'est-slider';
    const lab = document.createElement('span');
    lab.className = 'est-slider-label'; lab.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = val;
    const out = document.createElement('span'); out.className = 'est-slider-out';
    wrap.appendChild(lab); wrap.appendChild(input); wrap.appendChild(out);
    return { wrap, input, out };
  }

  // ============================================================
  // Widget — Three shapes of risk
  // One knob (the Weibull shape k) drives the hazard and the
  // survival curve side by side. k<1 falls, k=1 is flat, k>1 rises.
  // ============================================================
  (function initHazardShapes() {
    const host = document.getElementById('viz-hazard-shapes');
    if (!host) return;

    const BETA = 1;
    const T_MIN = 0.05, T_MAX = 3;
    const H_MAX = 4;                 // hazard axis is clipped: k<1 blows up at 0
    const NPTS = 240;

    function S(t, k) { return Math.exp(-Math.pow(BETA * t, k)); }
    function h(t, k) { return k * BETA * Math.pow(BETA * t, k - 1); }

    // ---- controls -------------------------------------------------
    const controls = document.createElement('div');
    controls.className = 'est-controls';
    const kS = slider('shape k', 0.3, 3, 0.05, 1.8);
    controls.appendChild(kS.wrap);

    const presetWrap = document.createElement('span');
    presetWrap.className = 'hz-presets';
    const PRESETS = [
      { k: 0.6, label: 'Infant mortality', note: 'k < 1' },
      { k: 1.0, label: 'Memoryless', note: 'k = 1' },
      { k: 1.8, label: 'Wear-out', note: 'k > 1' },
    ];
    PRESETS.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hz-preset';
      b.innerHTML = `${p.label} <span class="hz-preset-k">${p.note}</span>`;
      b.addEventListener('click', () => { kS.input.value = p.k; draw(); });
      presetWrap.appendChild(b);
    });
    controls.appendChild(presetWrap);
    host.appendChild(controls);

    const board = document.createElement('div');
    board.className = 'est-board';
    host.appendChild(board);

    const readout = document.createElement('div');
    readout.className = 'est-readout';
    host.appendChild(readout);

    // ---- geometry -------------------------------------------------
    const W = 700, H = 268;
    const PANEL_W = 286, GAP = 56;
    const M = { top: 22, bottom: 34, left: 46 };
    const PLOT_H = H - M.top - M.bottom;
    const x0L = M.left, x0R = M.left + PANEL_W + GAP;

    function panelX(px, t) { return px + (t - T_MIN) / (T_MAX - T_MIN) * PANEL_W; }
    function hazY(v) { return M.top + PLOT_H - Math.min(v, H_MAX) / H_MAX * PLOT_H; }
    function survY(v) { return M.top + PLOT_H - v * PLOT_H; }

    function axes(g, px, title, ymax, ylabel) {
      g.appendChild(el('line', { x1: px, y1: M.top + PLOT_H, x2: px + PANEL_W, y2: M.top + PLOT_H, stroke: '#d8d2c4' }));
      g.appendChild(el('line', { x1: px, y1: M.top, x2: px, y2: M.top + PLOT_H, stroke: '#d8d2c4' }));
      const t1 = el('text', { x: px, y: M.top - 8, 'font-size': 11, 'font-family': 'var(--sans)', fill: '#4a4742', 'font-weight': 700 });
      t1.textContent = title; g.appendChild(t1);
      const t2 = el('text', { x: px + PANEL_W, y: M.top + PLOT_H + 22, 'font-size': 10.5, 'font-family': 'var(--sans)', fill: SOFT, 'text-anchor': 'end' });
      t2.textContent = 'time t →'; g.appendChild(t2);
      [0, ymax / 2, ymax].forEach(v => {
        const y = M.top + PLOT_H - (v / ymax) * PLOT_H;
        const lab = el('text', { x: px - 7, y: y + 3.5, 'font-size': 10, 'font-family': 'var(--mono)', fill: SOFT, 'text-anchor': 'end' });
        lab.textContent = ylabel === 'S' ? fmt(v, 1) : fmt(v, 0);
        g.appendChild(lab);
        if (v > 0) g.appendChild(el('line', { x1: px, y1: y, x2: px + PANEL_W, y2: y, stroke: '#efe9dc', 'stroke-dasharray': '2 3' }));
      });
    }

    function draw() {
      const k = parseFloat(kS.input.value);
      kS.out.textContent = 'k = ' + fmt(k, 2);

      const rising = k > 1.02, falling = k < 0.98;
      const tint = rising ? '#fde0d2' : falling ? '#d5e6dc' : '#f0eee5';
      const tintStroke = rising ? '#d8a48a' : falling ? '#9ec3ae' : '#ccc6b8';

      board.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img' });
      const g = el('g');
      svg.appendChild(g);

      axes(g, x0L, 'HAZARD  h(t) — risk right now, given survival', H_MAX, 'h');
      axes(g, x0R, 'SURVIVAL  S(t) — fraction still running', 1, 'S');

      // sample the curves
      const pts = [];
      for (let i = 0; i <= NPTS; i++) {
        const t = T_MIN + (T_MAX - T_MIN) * i / NPTS;
        pts.push({ t, h: h(t, k), S: S(t, k) });
      }

      // hazard: filled area (tinted by regime) + stroke
      let area = `M ${panelX(x0L, T_MIN)} ${M.top + PLOT_H}`;
      let line = '';
      pts.forEach((p, i) => {
        const X = panelX(x0L, p.t), Y = hazY(p.h);
        area += ` L ${fmt(X, 1)} ${fmt(Y, 1)}`;
        line += (i ? ' L ' : 'M ') + fmt(X, 1) + ' ' + fmt(Y, 1);
      });
      area += ` L ${panelX(x0L, T_MAX)} ${M.top + PLOT_H} Z`;
      g.appendChild(el('path', { d: area, fill: tint, stroke: 'none', opacity: 0.85 }));
      g.appendChild(el('path', { d: line, fill: 'none', stroke: ACCENT, 'stroke-width': 2.4 }));

      // flat reference at h = k for the exponential case
      if (!rising && !falling) {
        g.appendChild(el('line', {
          x1: x0L, y1: hazY(k), x2: x0L + PANEL_W, y2: hazY(k),
          stroke: tintStroke, 'stroke-width': 1.4, 'stroke-dasharray': '5 4'
        }));
      }

      // survival curve
      let sline = '';
      pts.forEach((p, i) => {
        sline += (i ? ' L ' : 'M ') + fmt(panelX(x0R, p.t), 1) + ' ' + fmt(survY(p.S), 1);
      });
      g.appendChild(el('path', { d: sline, fill: 'none', stroke: ACCENT, 'stroke-width': 2.4 }));

      // two probe times, marked on both panels
      [0.5, 2.0].forEach(tp => {
        const hv = h(tp, k), sv = S(tp, k);
        g.appendChild(el('circle', { cx: panelX(x0L, tp), cy: hazY(hv), r: 3.6, fill: ACCENT }));
        g.appendChild(el('circle', { cx: panelX(x0R, tp), cy: survY(sv), r: 3.6, fill: ACCENT }));
        [[x0L, 'h'], [x0R, 'S']].forEach(([px]) => {
          const lab = el('text', {
            x: panelX(px, tp), y: M.top + PLOT_H + 14,
            'font-size': 10, 'font-family': 'var(--mono)', fill: SOFT, 'text-anchor': 'middle'
          });
          lab.textContent = 't=' + fmt(tp, 1); g.appendChild(lab);
        });
      });

      board.appendChild(svg);

      // ---- readout ------------------------------------------------
      const h05 = h(0.5, k), h2 = h(2, k), ratio = h2 / h05;
      const verdict = rising
        ? '<strong>rising</strong> — the longer it has run, the more likely it is to fail next. Wear-out.'
        : falling
          ? '<strong>falling</strong> — surviving this long is evidence of being well built. Defects burn off early.'
          : '<strong>flat</strong> — risk never changes with age. This is the exponential, and it is <em>memoryless</em>: a used unit is exactly as good as a new one.';
      readout.innerHTML =
        `Hazard is ${verdict}<br>` +
        `<code>h(0.5) = ${fmt(h05, 3)}</code> &nbsp; <code>h(2.0) = ${fmt(h2, 3)}</code> &nbsp; ` +
        `ratio <code>h(2)/h(0.5) = ${fmt(ratio, 2)}×</code><br>` +
        `<code>S(2.0) = ${fmt(S(2, k), 3)}</code> — ${fmt(100 * S(2, k), 1)}% are still running at t = 2.`;
    }

    kS.input.addEventListener('input', draw);
    draw();
  })();

  // ============================================================
  const GLOSSARY = {
    'hazard-rate': {
      title: 'Hazard rate',
      body: '<p>The instantaneous rate of failure <em>given survival so far</em>: h(t) = f(t)/S(t). Not a probability — it is a rate per unit time and can exceed 1. It is the risk faced by the units still running, which is the only group you can act on.</p>',
    },
    'survival-function': {
      title: 'Survival function',
      body: '<p>S(t) = p[T &gt; t] = 1 − F(t): the probability of lasting past time t. It is the CDF subtracted from one, so the empirical version is just the ECDF flipped.</p>',
    },
    'weibull': {
      title: 'Weibull distribution',
      body: '<p>A lifetime distribution whose single shape parameter k controls whether the hazard rises, stays flat, or falls. At k = 1 it reduces exactly to the exponential. That one exponent covers wear-out, constant risk, and infant mortality.</p>',
    },
    'memoryless': {
      title: 'Memorylessness',
      body: '<p>A process whose failure risk does not depend on how long it has already run — a used unit is as good as a new one. The exponential is the only continuous distribution with this property, and a flat hazard is exactly what it looks like.</p>',
    },
  };
  window.GLOSSARY = Object.assign(window.GLOSSARY || {}, GLOSSARY);
})();

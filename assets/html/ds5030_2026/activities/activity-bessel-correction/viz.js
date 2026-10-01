/* ============================================================
 * Understanding Uncertainty · Activity — Why the Sample
 * Variance Undershoots. Part 3 of the Estimator Properties
 * mini-series.
 *
 * True die variance σ² = Var(X) = 35/12 ≈ 2.9167.
 * ============================================================ */
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const ACCENT = '#b14a2e';

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
    const lab = document.createElement('span'); lab.className = 'est-slider-label'; lab.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = val;
    const out = document.createElement('span'); out.className = 'est-slider-out';
    wrap.appendChild(lab); wrap.appendChild(input); wrap.appendChild(out);
    return { wrap, input, out };
  }

  // ============================================================
  // Widget — Why the naive sample variance undershoots
  // Repeatedly draws samples of size n, computes Σ(xᵢ−x̄)²
  // divided by n (naive) or n−1 (Bessel-corrected), and plots
  // the resulting histogram of 500 replicate estimates against
  // the true die variance σ² = 35/12.
  // ============================================================
  (function initBesselBias() {
    const host = document.getElementById('viz-bessel-bias');
    if (!host) return;

    const TRUE_VAR = 35 / 12; // fair-die population variance ≈ 2.9167
    const R = 500;

    host.innerHTML = '';
    const title = document.createElement('div'); title.className = 'viz-title';
    title.textContent = 'Distribution of the variance estimate across 500 fresh samples';
    host.appendChild(title);

    const controls = document.createElement('div'); controls.className = 'est-controls';
    const nSlider = slider('Sample size n', 2, 30, 1, 5);
    const checkWrap = document.createElement('label'); checkWrap.className = 'est-check-btn';
    const check = document.createElement('input'); check.type = 'checkbox';
    checkWrap.appendChild(check);
    checkWrap.appendChild(document.createTextNode("Apply Bessel's correction (divide by n − 1)"));
    const redrawBtn = document.createElement('button');
    redrawBtn.type = 'button'; redrawBtn.className = 'btn'; redrawBtn.textContent = 'Resample';
    controls.appendChild(nSlider.wrap);
    controls.appendChild(checkWrap);
    controls.appendChild(redrawBtn);
    host.appendChild(controls);

    const svgWrap = document.createElement('div'); svgWrap.className = 'est-board';
    host.appendChild(svgWrap);
    const readout = document.createElement('div'); readout.className = 'est-readout';
    host.appendChild(readout);

    const width = 640, height = 270, ml = 44, mr = 20, mt = 44, mb = 32;
    const plotW = width - ml - mr, plotH = height - mt - mb;
    const xmin = 0, xmax = 10;
    const x2px = x => ml + (x - xmin) / (xmax - xmin) * plotW;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'display:block; height:auto', role: 'img' });
    svgWrap.appendChild(svg);

    let rng = LabBase.makeLcg(918273645);
    function rollDie() { return 1 + Math.min(5, Math.floor(rng() * 6)); }

    function simulate(n, corrected) {
      const ests = [];
      for (let r = 0; r < R; r++) {
        const xs = [];
        for (let i = 0; i < n; i++) xs.push(rollDie());
        const m = xs.reduce((a, b) => a + b, 0) / n;
        const ss = xs.reduce((a, b) => a + (b - m) * (b - m), 0);
        ests.push(ss / (corrected ? (n - 1) : n));
      }
      return ests;
    }

    function draw() {
      const n = parseInt(nSlider.input.value, 10);
      nSlider.out.textContent = 'n = ' + n;
      const corrected = check.checked;
      const ests = simulate(n, corrected);
      const avg = ests.reduce((a, b) => a + b, 0) / ests.length;

      svg.textContent = '';
      svg.appendChild(el('line', { x1: ml, y1: mt + plotH, x2: ml + plotW, y2: mt + plotH, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let xv = 0; xv <= xmax; xv += 2) {
        const px = x2px(xv);
        svg.appendChild(el('line', { x1: px, y1: mt + plotH, x2: px, y2: mt + plotH + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: mt + plotH + 16, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = xv; svg.appendChild(t);
      }

      const bins = 40, bw = (xmax - xmin) / bins;
      const counts = new Array(bins).fill(0);
      ests.forEach(v => { const b = Math.min(bins - 1, Math.max(0, Math.floor((v - xmin) / bw))); counts[b]++; });
      const maxCount = Math.max.apply(null, counts) || 1;
      const y2px = c => mt + plotH - (c / maxCount) * plotH;
      counts.forEach((c, b) => {
        if (!c) return;
        const x0 = x2px(xmin + b * bw), x1 = x2px(xmin + (b + 1) * bw);
        svg.appendChild(el('rect', { x: x0 + 0.5, y: y2px(c), width: Math.max(0, x1 - x0 - 1), height: (mt + plotH) - y2px(c), fill: '#efe9dc', stroke: '#e0d8c6' }));
      });

      const truePx = x2px(Math.min(TRUE_VAR, xmax));
      svg.appendChild(el('line', { x1: truePx, y1: mt, x2: truePx, y2: mt + plotH, stroke: ACCENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const trueLabel = el('text', { x: truePx, y: 18, 'text-anchor': 'middle', fill: ACCENT, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      trueLabel.textContent = 'true σ² ≈ ' + fmt(TRUE_VAR, 2);
      svg.appendChild(trueLabel);

      const avgPx = x2px(Math.min(avg, xmax));
      svg.appendChild(el('line', { x1: avgPx, y1: mt, x2: avgPx, y2: mt + plotH, stroke: '#1f1d1a', 'stroke-width': 1.5 }));
      const avgLabel = el('text', { x: avgPx, y: 34, 'text-anchor': 'middle', fill: '#1f1d1a', 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      avgLabel.textContent = 'avg ' + fmt(avg, 2);
      svg.appendChild(avgLabel);

      const formula = corrected
        ? '(1/(n−1)) Σ(xᵢ − x̄)²'
        : '(1/n) Σ(xᵢ − x̄)²';
      readout.innerHTML = 'Formula in use: <code>' + formula + '</code>, averaged over ' + R + ' fresh samples of size n = ' + n +
        '. This run\'s average estimate is <strong>' + fmt(avg, 3) + '</strong> — the true population variance is <strong>' + fmt(TRUE_VAR, 3) + '</strong>' +
        (corrected ? '. Correcting the divisor re-centers the histogram on the true value.' : '. The uncorrected histogram sits systematically left of the true value.');
    }

    nSlider.input.addEventListener('input', draw);
    check.addEventListener('change', draw);
    redrawBtn.addEventListener('click', () => { rng = LabBase.makeLcg(Date.now() % 2147483647); draw(); });

    draw();
  })();

  // ============================================================
  // Inline glossary (contract from CLAUDE.md / lab-01)
  // ============================================================
  const GLOSSARY = {
    'bessel': {
      title: "Bessel's correction",
      body: '<p>Dividing a sample\'s sum of squared deviations by (n − 1) instead of n. Fixes the fact that centering on the sample mean (rather than the true, unknown mean) always makes the spread look a little smaller than it really is.</p>',
    },
  };
  window.GLOSSARY = GLOSSARY;

})();

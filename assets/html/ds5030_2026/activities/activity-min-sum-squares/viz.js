/* ============================================================
 * Understanding Uncertainty · Activity — What the Sample Mean
 * Minimizes. Part 2 of the Estimator Properties mini-series.
 *
 * Pinned toy sample {2, 6, 4, 3, 5} — five valid die rolls,
 * sample mean X̄ = 4, true die mean θ = 3.5.
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
  // Widget — What the sample mean minimizes
  // Drag a candidate center c and watch SS(c) = Σ(xᵢ − c)²
  // trace a parabola with its floor at X̄.
  // ============================================================
  (function initMinSS() {
    const host = document.getElementById('viz-min-ss');
    if (!host) return;

    const XBAR_COLOR = '#b5601f';
    const SAMPLE = [2, 6, 4, 3, 5];
    const N = SAMPLE.length;
    const SUM = SAMPLE.reduce((a, b) => a + b, 0);         // 20
    const SUMSQ = SAMPLE.reduce((a, b) => a + b * b, 0);   // 90
    const XBAR = SUM / N;                                   // 4
    const THETA = 3.5;
    function SS(c) { return SUMSQ - 2 * c * SUM + N * c * c; }

    host.innerHTML = '';
    const title = document.createElement('div'); title.className = 'viz-title';
    title.textContent = 'Sum of squared deviations, sample {2, 6, 4, 3, 5}';
    host.appendChild(title);

    const controls = document.createElement('div'); controls.className = 'est-controls';
    const cSlider = slider('Candidate center c', 1, 6, 0.05, 2);
    controls.appendChild(cSlider.wrap);
    host.appendChild(controls);

    const svgWrap = document.createElement('div'); svgWrap.className = 'est-board';
    host.appendChild(svgWrap);
    const readout = document.createElement('div'); readout.className = 'est-readout';
    host.appendChild(readout);

    const width = 640, height = 280, ml = 48, mr = 20, mt = 44, mb = 34;
    const plotW = width - ml - mr, plotH = height - mt - mb;
    const xmin = 1, xmax = 6, ymin = 0, ymax = 60;
    const x2px = x => ml + (x - xmin) / (xmax - xmin) * plotW;
    const y2px = y => mt + plotH - (y - ymin) / (ymax - ymin) * plotH;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'display:block; height:auto', role: 'img' });
    svgWrap.appendChild(svg);

    function draw() {
      const c = parseFloat(cSlider.input.value);
      cSlider.out.textContent = 'c = ' + fmt(c, 2);
      svg.textContent = '';

      svg.appendChild(el('line', { x1: ml, y1: mt + plotH, x2: ml + plotW, y2: mt + plotH, stroke: '#cfc9bd', 'stroke-width': 1 }));
      svg.appendChild(el('line', { x1: ml, y1: mt, x2: ml, y2: mt + plotH, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let v = 1; v <= 6; v++) {
        const px = x2px(v);
        svg.appendChild(el('line', { x1: px, y1: mt + plotH, x2: px, y2: mt + plotH + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: mt + plotH + 16, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = v; svg.appendChild(t);
      }
      [0, 10, 20, 30, 40, 50, 60].forEach(yv => {
        const py = y2px(yv);
        svg.appendChild(el('line', { x1: ml - 4, y1: py, x2: ml, y2: py, stroke: '#cfc9bd' }));
        const t = el('text', { x: ml - 8, y: py + 3, 'text-anchor': 'end', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = yv; svg.appendChild(t);
      });

      SAMPLE.forEach(v => {
        svg.appendChild(el('line', { x1: x2px(v), y1: mt + plotH, x2: x2px(v), y2: mt + plotH - 7, stroke: '#8a857d', 'stroke-width': 1.5, opacity: 0.6 }));
      });

      const NPTS = 100; let d = '';
      for (let i = 0; i <= NPTS; i++) {
        const x = xmin + (xmax - xmin) * i / NPTS;
        const y = SS(x);
        d += (i === 0 ? 'M ' : ' L ') + fmt(x2px(x), 1) + ' ' + fmt(y2px(y), 1);
      }
      svg.appendChild(el('path', { d, fill: 'none', stroke: '#8a8577', 'stroke-width': 2 }));

      const xbarPx = x2px(XBAR);
      svg.appendChild(el('line', { x1: xbarPx, y1: mt, x2: xbarPx, y2: mt + plotH, stroke: XBAR_COLOR, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const xbarLabel = el('text', { x: xbarPx, y: 18, 'text-anchor': 'middle', fill: XBAR_COLOR, 'font-family': 'var(--mono)', 'font-size': 12, 'font-weight': 700 });
      xbarLabel.textContent = 'X̄';
      svg.appendChild(xbarLabel);

      const thetaPx = x2px(THETA);
      svg.appendChild(el('line', { x1: thetaPx, y1: mt, x2: thetaPx, y2: mt + plotH, stroke: ACCENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const thetaLabel = el('text', { x: thetaPx, y: 34, 'text-anchor': 'middle', fill: ACCENT, 'font-family': 'var(--mono)', 'font-size': 12, 'font-weight': 700 });
      thetaLabel.textContent = 'θ';
      svg.appendChild(thetaLabel);

      const cx = x2px(c), cy = y2px(SS(c));
      svg.appendChild(el('line', { x1: cx, y1: cy, x2: cx, y2: mt + plotH, stroke: '#1f1d1a', 'stroke-width': 1, 'stroke-dasharray': '2 2', opacity: 0.6 }));
      svg.appendChild(el('circle', { cx, cy, r: 5, fill: '#1f1d1a' }));

      readout.innerHTML = 'SS(c) = Σ(xᵢ − c)² at c = ' + fmt(c, 2) + ' is <strong>' + fmt(SS(c), 2) + '</strong>. ' +
        'The minimum over every possible c sits at c = X̄ = 4, where SS = <strong>10</strong> — strictly less than SS(θ) = <strong>' + fmt(SS(THETA), 2) + '</strong> at the true mean θ = 3.5.';
    }

    cSlider.input.addEventListener('input', draw);
    draw();
  })();

  // ============================================================
  // Inline glossary (contract from CLAUDE.md / lab-01)
  // ============================================================
  const GLOSSARY = {
    'sum-of-squares': {
      title: 'Sum of squared deviations',
      body: '<p><code>SS(c) = Σ(xᵢ − c)²</code>, the total squared distance from every data point to a candidate center c. It is a parabola in c, uniquely minimized at c = the sample mean — a fact of algebra, true for any data.</p>',
    },
  };
  window.GLOSSARY = GLOSSARY;

})();

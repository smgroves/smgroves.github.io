/* ============================================================
 * Understanding Uncertainty · Activity — How Bad Is My
 * Estimator? The Standard Error of the Mean.
 * A standalone mini-lesson in the Estimator Properties set.
 *
 * True die mean θ = 3.5, true die std σ = sqrt(35/12) ≈ 1.708.
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
  // Widget — How far should you expect to be off?
  // One highlighted "your sample" estimate with its ±1 SE error
  // bar, plus 250 replicate X̄_n values swarmed against shaded
  // ±1 SE / ±2 SE bands around the true θ.
  // ============================================================
  (function initStandardError() {
    const host = document.getElementById('viz-standard-error');
    if (!host) return;

    const XBAR_FILL = '#f7c9a6', XBAR_STROKE = '#b5601f';
    const THETA = 3.5;
    const SIGMA = Math.sqrt(35 / 12); // ≈ 1.7078
    const R = 250;

    host.innerHTML = '';
    const title = document.createElement('div'); title.className = 'viz-title';
    title.textContent = 'Your sample vs. 250 hypothetical replications';
    host.appendChild(title);

    const controls = document.createElement('div'); controls.className = 'est-controls';
    const nSlider = slider('Sample size n', 1, 100, 1, 5);
    const redrawBtn = document.createElement('button');
    redrawBtn.type = 'button'; redrawBtn.className = 'btn'; redrawBtn.textContent = 'Redraw samples';
    controls.appendChild(nSlider.wrap);
    controls.appendChild(redrawBtn);
    host.appendChild(controls);

    const svgWrap = document.createElement('div'); svgWrap.className = 'est-board';
    host.appendChild(svgWrap);
    const readout = document.createElement('div'); readout.className = 'est-readout';
    host.appendChild(readout);
    const legend = document.createElement('div'); legend.className = 'est-legend';
    legend.innerHTML =
      '<span><span class="swatch" style="background:' + XBAR_FILL + ';border:1px solid ' + XBAR_STROKE + '"></span>Each dot is one replication\'s X&#772;<sub>n</sub></span>' +
      '<span>Darker band = within 1 SE of θ · lighter band = within 2 SE</span>';
    host.appendChild(legend);

    const width = 640, height = 290, ml = 40, mr = 20, mt = 66, mb = 30;
    const plotW = width - ml - mr, plotH = height - mt - mb;
    const xmin = 1, xmax = 6.2;
    const x2px = x => ml + (x - xmin) / (xmax - xmin) * plotW;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'display:block; height:auto', role: 'img' });
    svgWrap.appendChild(svg);

    let rng = LabBase.makeLcg(20260807);
    function rollDie() { return 1 + Math.min(5, Math.floor(rng() * 6)); }

    function simulate(n) {
      const xbars = [];
      for (let r = 0; r < R; r++) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += rollDie();
        xbars.push(sum / n);
      }
      return xbars;
    }

    function draw() {
      const n = parseInt(nSlider.input.value, 10);
      nSlider.out.textContent = 'n = ' + n;
      const SE = SIGMA / Math.sqrt(n);
      const xbars = simulate(n);
      const yours = xbars[0];

      svg.textContent = '';

      // shaded ±2 SE band (lighter), then ±1 SE band on top (darker)
      const band2x0 = x2px(Math.max(xmin, THETA - 2 * SE)), band2x1 = x2px(Math.min(xmax, THETA + 2 * SE));
      svg.appendChild(el('rect', { x: band2x0, y: mt, width: Math.max(0, band2x1 - band2x0), height: plotH, fill: '#fde0d2', opacity: 0.35 }));
      const band1x0 = x2px(Math.max(xmin, THETA - SE)), band1x1 = x2px(Math.min(xmax, THETA + SE));
      svg.appendChild(el('rect', { x: band1x0, y: mt, width: Math.max(0, band1x1 - band1x0), height: plotH, fill: '#fde0d2', opacity: 0.55 }));

      // axis
      svg.appendChild(el('line', { x1: ml, y1: mt + plotH, x2: ml + plotW, y2: mt + plotH, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let v = 1; v <= 6; v++) {
        const px = x2px(v);
        svg.appendChild(el('line', { x1: px, y1: mt + plotH, x2: px, y2: mt + plotH + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: mt + plotH + 16, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = v; svg.appendChild(t);
      }

      // θ reference line, through both rows
      const thetaPx = x2px(THETA);
      svg.appendChild(el('line', { x1: thetaPx, y1: mt - 26, x2: thetaPx, y2: mt + plotH, stroke: ACCENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const thetaLabel = el('text', { x: thetaPx, y: mt - 30, 'text-anchor': 'middle', fill: ACCENT, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      thetaLabel.textContent = 'θ = 3.5';
      svg.appendChild(thetaLabel);

      // "your sample" row — one highlighted estimate with its ±1 SE error bar
      const yourY = mt - 10;
      const lo = x2px(yours - SE), hi = x2px(yours + SE), yp = x2px(yours);
      svg.appendChild(el('line', { x1: lo, y1: yourY, x2: hi, y2: yourY, stroke: XBAR_STROKE, 'stroke-width': 2 }));
      svg.appendChild(el('line', { x1: lo, y1: yourY - 5, x2: lo, y2: yourY + 5, stroke: XBAR_STROKE, 'stroke-width': 2 }));
      svg.appendChild(el('line', { x1: hi, y1: yourY - 5, x2: hi, y2: yourY + 5, stroke: XBAR_STROKE, 'stroke-width': 2 }));
      svg.appendChild(el('circle', { cx: yp, cy: yourY, r: 5, fill: XBAR_STROKE }));
      const yourLabel = el('text', { x: ml, y: yourY - 10, 'text-anchor': 'start', fill: XBAR_STROKE, 'font-family': 'var(--sans)', 'font-size': 11, 'font-weight': 700 });
      yourLabel.textContent = 'your one sample, X̄ₙ ± 1 SE';
      svg.appendChild(yourLabel);

      // swarm of all 250 replicate X̄_n values
      const bandTop = mt + plotH * 0.20, bandBot = mt + plotH * 0.92;
      let within1 = 0, within2 = 0;
      xbars.forEach(v => {
        const jitter = bandTop + rng() * (bandBot - bandTop);
        svg.appendChild(el('circle', { cx: x2px(v), cy: jitter, r: 2.6, fill: XBAR_FILL, stroke: XBAR_STROKE, 'stroke-width': 0.6, opacity: 0.8 }));
        if (Math.abs(v - THETA) <= SE) within1++;
        if (Math.abs(v - THETA) <= 2 * SE) within2++;
      });

      readout.innerHTML = 'SE = σ/√n = ' + fmt(SIGMA, 3) + '/√' + n + ' = <strong>' + fmt(SE, 3) + '</strong>. ' +
        'Your one sample: X̄ₙ = ' + fmt(yours, 2) + ', off from θ by ' + fmt(Math.abs(yours - THETA), 2) + '. ' +
        'Across these 250 replications: <strong>' + fmt(100 * within1 / R, 0) + '%</strong> land within 1 SE of θ, <strong>' + fmt(100 * within2 / R, 0) + '%</strong> within 2 SE.';
    }

    nSlider.input.addEventListener('input', draw);
    redrawBtn.addEventListener('click', () => { rng = LabBase.makeLcg(Date.now() % 2147483647); draw(); });

    draw();
  })();

  // ============================================================
  // Inline glossary (contract from CLAUDE.md / lab-01)
  // ============================================================
  const GLOSSARY = {
    'se-mean': {
      title: 'Standard error of the mean (SEM)',
      body: '<p>SE(X̄ₙ) = σ/√n — the standard deviation of the sampling distribution of X̄ₙ. It measures the typical distance between a computed sample mean and the true θ, not a guarantee for any one sample.</p>',
    },
    'sampling-dist-se': {
      title: 'Sampling distribution',
      body: '<p>The distribution of a statistic across hypothetical repeated samples — not the distribution of the original data. Every dot in the swarm below is one replication\'s X̄ₙ, a whole sample collapsed into a single number; the spread of those dots, not the die\'s own spread, is what SE measures.</p>',
    },
  };
  window.GLOSSARY = GLOSSARY;

})();

/* ============================================================
 * Understanding Uncertainty · Activity — Unbiased, but Never
 * Consistent. Part 1 of the Estimator Properties mini-series.
 *
 * Running toy example: a fair six-sided die, θ = E[X] = 3.5.
 * ============================================================ */
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const ACCENT = '#b14a2e';

  // ---------- tiny DOM/SVG helpers (mirror class-07-kde/viz.js) ----------
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
  // Widget — Unbiased, but never consistent
  // Compares X̄_n (sample mean of n die rolls) against
  // T_n = X_1 (always just the first roll, data beyond it ignored).
  // ============================================================
  (function initUnbiasedConsistent() {
    const host = document.getElementById('viz-unbiased-consistent');
    if (!host) return;

    const XBAR_FILL = '#f7c9a6', XBAR_STROKE = '#b5601f';
    const T1_FILL = '#bfe0cd', T1_STROKE = '#4a7a5e';
    const THETA = 3.5;
    const R = 250;

    host.innerHTML = '';
    const title = document.createElement('div'); title.className = 'viz-title';
    title.textContent = 'Two die-roll estimators of θ = 3.5, replicated 250 times';
    host.appendChild(title);

    const controls = document.createElement('div'); controls.className = 'est-controls';
    const nSlider = slider('Sample size n', 1, 200, 1, 5);
    const redrawBtn = document.createElement('button');
    redrawBtn.type = 'button'; redrawBtn.className = 'btn'; redrawBtn.textContent = 'Redraw samples';
    controls.appendChild(nSlider.wrap);
    controls.appendChild(redrawBtn);
    host.appendChild(controls);

    const svgWrap = document.createElement('div'); svgWrap.className = 'est-board';
    host.appendChild(svgWrap);

    const width = 640, height = 220, ml = 40, mr = 20, mt = 34, mb = 30;
    const plotW = width - ml - mr, plotH = height - mt - mb;
    const xmin = 1, xmax = 6.2;
    const x2px = x => ml + (x - xmin) / (xmax - xmin) * plotW;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'display:block; height:auto', role: 'img' });
    svgWrap.appendChild(svg);

    const readout = document.createElement('div'); readout.className = 'est-readout';
    host.appendChild(readout);
    const legend = document.createElement('div'); legend.className = 'est-legend';
    legend.innerHTML =
      '<span><span class="swatch" style="background:' + XBAR_FILL + ';border:1px solid ' + XBAR_STROKE + '"></span>X&#772;<sub>n</sub> (average of n rolls)</span>' +
      '<span><span class="swatch" style="background:' + T1_FILL + ';border:1px solid ' + T1_STROKE + '"></span>T<sub>n</sub> (just the first roll, rest ignored)</span>';
    host.appendChild(legend);

    let rng = LabBase.makeLcg(20260806);
    function rollDie() { return 1 + Math.min(5, Math.floor(rng() * 6)); }

    function simulate(n) {
      const xbars = [], t1s = [];
      for (let r = 0; r < R; r++) {
        let sum = 0, first = 0;
        for (let i = 0; i < n; i++) {
          const roll = rollDie();
          if (i === 0) first = roll;
          sum += roll;
        }
        xbars.push(sum / n);
        t1s.push(first);
      }
      return { xbars, t1s };
    }

    function meanStd(arr) {
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      const v = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length;
      return { mean: m, std: Math.sqrt(v) };
    }

    function draw() {
      const n = parseInt(nSlider.input.value, 10);
      nSlider.out.textContent = 'n = ' + n;
      const { xbars, t1s } = simulate(n);
      svg.textContent = '';

      svg.appendChild(el('line', { x1: ml, y1: mt + plotH, x2: ml + plotW, y2: mt + plotH, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let v = 1; v <= 6; v++) {
        const px = x2px(v);
        svg.appendChild(el('line', { x1: px, y1: mt + plotH, x2: px, y2: mt + plotH + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: mt + plotH + 16, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = v;
        svg.appendChild(t);
      }

      const thetaPx = x2px(THETA);
      svg.appendChild(el('line', { x1: thetaPx, y1: mt, x2: thetaPx, y2: mt + plotH, stroke: ACCENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const thetaLabel = el('text', { x: thetaPx, y: mt - 10, 'text-anchor': 'middle', fill: ACCENT, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      thetaLabel.textContent = 'θ = 3.5';
      svg.appendChild(thetaLabel);

      const bandTop = mt + plotH * 0.30, bandBot = mt + plotH * 0.78;
      xbars.forEach(v => {
        const jitter = (rng() - 0.5) * plotH * 0.22;
        svg.appendChild(el('circle', { cx: x2px(v), cy: bandTop + jitter, r: 3, fill: XBAR_FILL, stroke: XBAR_STROKE, 'stroke-width': 0.75, opacity: 0.85 }));
      });
      t1s.forEach(v => {
        const jitter = (rng() - 0.5) * plotH * 0.22;
        svg.appendChild(el('circle', { cx: x2px(v), cy: bandBot + jitter, r: 3, fill: T1_FILL, stroke: T1_STROKE, 'stroke-width': 0.75, opacity: 0.85 }));
      });

      const xs = meanStd(xbars), ts = meanStd(t1s);
      readout.innerHTML = 'Across ' + R + ' replications at n = ' + n + ': ' +
        'X&#772;<sub>n</sub> mean <strong>' + fmt(xs.mean, 2) + '</strong>, std <strong>' + fmt(xs.std, 2) + '</strong> &nbsp;·&nbsp; ' +
        'T<sub>n</sub> mean <strong>' + fmt(ts.mean, 2) + '</strong>, std <strong>' + fmt(ts.std, 2) + '</strong> ' +
        '&nbsp;(true die std ≈ 1.71). Both are centered near 3.5 at every n — only one of them tightens as n grows.';
    }

    nSlider.input.addEventListener('input', draw);
    redrawBtn.addEventListener('click', () => { rng = LabBase.makeLcg(Date.now() % 2147483647); draw(); });

    draw();
  })();

  // ============================================================
  // Inline glossary (contract from CLAUDE.md / lab-01)
  // ============================================================
  const GLOSSARY = {
    'sampling-dist': {
      title: 'Sampling distribution',
      body: '<p>The distribution of a statistic — not of the original data. Draw a fresh sample, compute the statistic (a mean, a max, anything), get one number; repeat many times and those numbers pile up into their own distribution, sitting one level above the population you sampled from.</p>',
    },
    'unbiased-est': {
      title: 'Unbiased estimator',
      body: '<p>An estimator whose expectation equals the target parameter at every sample size: <code>E[θ̂] = θ</code>. Says nothing about how spread out θ̂ is — only that it is centered correctly, even at n = 1.</p>',
    },
    'consistent-est': {
      title: 'Consistent estimator',
      body: '<p>An estimator that converges in probability to the target parameter as n → ∞: for any tolerance ε, <code>P(|θ̂ₙ − θ| &gt; ε) → 0</code>. A statement about shrinking spread, independent of whether the estimator is unbiased.</p>',
    },
  };
  window.GLOSSARY = GLOSSARY;

})();

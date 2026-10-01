/* ============================================================
 * Understanding Uncertainty · Activity — One Sample, One Point:
 * Estimating Variance. Same mechanic as the mean versions, but
 * the collapse now targets σ², not θ — and the top and bottom
 * panels live on genuinely different scales (die faces vs.
 * squared-deviation units), so the connector has to bridge two
 * different axes instead of sharing one.
 *
 * A standalone mini-lesson in the Estimator Properties set.
 * True die mean θ = 3.5, true die variance σ² = 35/12 ≈ 2.9167.
 * ============================================================ */
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const ACCENT = '#b14a2e';
  const XBAR_FILL = '#f7c9a6', XBAR_STROKE = '#b5601f';
  const INK = '#1f1d1a';

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

  (function initTwoDistributionsVariance() {
    const host = document.getElementById('viz-two-distributions-variance');
    if (!host) return;

    const TRUE_VAR = 35 / 12; // ≈ 2.9167

    host.innerHTML = '';
    const title = document.createElement('div'); title.className = 'viz-title';
    title.textContent = 'One sample\'s N events, collapsed to one variance estimate — click any dot below';
    host.appendChild(title);

    const controls = document.createElement('div'); controls.className = 'est-controls';
    const nSlider = slider('Sample size N', 2, 100, 1, 10);
    const checkWrap = document.createElement('label'); checkWrap.className = 'est-check-btn';
    const check = document.createElement('input'); check.type = 'checkbox';
    checkWrap.appendChild(check);
    checkWrap.appendChild(document.createTextNode("Apply Bessel's correction (÷ n − 1)"));
    const drawBtn = document.createElement('button');
    drawBtn.type = 'button'; drawBtn.className = 'btn'; drawBtn.textContent = 'Draw a new sample';
    const draw10Btn = document.createElement('button');
    draw10Btn.type = 'button'; draw10Btn.className = 'btn'; draw10Btn.textContent = 'Draw 10 new samples';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button'; resetBtn.className = 'btn ghost'; resetBtn.textContent = 'Reset';
    controls.appendChild(nSlider.wrap);
    controls.appendChild(checkWrap);
    controls.appendChild(drawBtn);
    controls.appendChild(draw10Btn);
    controls.appendChild(resetBtn);
    host.appendChild(controls);

    const svgWrap = document.createElement('div'); svgWrap.className = 'est-board';
    host.appendChild(svgWrap);
    const readout = document.createElement('div'); readout.className = 'est-readout';
    host.appendChild(readout);

    const width = 680, height = 430;
    const ml = 48, mr = 20;
    const topMt = 16, topPlotH = 130;              // histogram of one sample's N rolls (die-face units)
    const topBaseline = topMt + topPlotH;
    const botMt = topBaseline + 30, botPlotH = 200; // strip of T variance estimates (squared-deviation units)
    const botBaseline = botMt + botPlotH;
    const plotW = width - ml - mr;

    // Two different domains sharing the same pixel column — the whole
    // point of this widget is that they are NOT the same scale.
    const topXmin = 1, topXmax = 6.2;
    const topX2px = x => ml + (x - topXmin) / (topXmax - topXmin) * plotW;
    const botXmin = 0, botXmax = 10;
    const botX2px = x => ml + (x - botXmin) / (botXmax - botXmin) * plotW;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'display:block; height:auto', role: 'img' });
    svgWrap.appendChild(svg);

    let rng = LabBase.makeLcg(20260810);
    function rollDie() { return 1 + Math.min(5, Math.floor(rng() * 6)); }

    let samples = [];      // { rolls, mean, ss, jitter }
    let currentIndex = -1;

    function s2(sample, n) {
      const corrected = check.checked;
      return sample.ss / (corrected ? (n - 1) : n);
    }

    function drawNewSample(n) {
      const rolls = [];
      for (let i = 0; i < n; i++) rolls.push(rollDie());
      const mean = rolls.reduce((a, b) => a + b, 0) / n;
      const ss = rolls.reduce((a, b) => a + (b - mean) * (b - mean), 0);
      samples.push({ rolls, mean, ss, jitter: rng() });
      currentIndex = samples.length - 1;
    }

    function resetAll() {
      samples = [];
      currentIndex = -1;
      drawNewSample(parseInt(nSlider.input.value, 10));
    }

    function render() {
      const n = parseInt(nSlider.input.value, 10);
      nSlider.out.textContent = 'N = ' + n;
      const current = samples[currentIndex];

      svg.textContent = '';

      // ---------- top panel: histogram of the current sample's N rolls (die-face units) ----------
      const counts = new Array(6).fill(0);
      current.rolls.forEach(v => counts[v - 1]++);
      const maxCount = Math.max.apply(null, counts) || 1;
      const barW = plotW / 6 * 0.6;
      for (let face = 1; face <= 6; face++) {
        const cx = topX2px(face);
        const h = (counts[face - 1] / maxCount) * topPlotH;
        svg.appendChild(el('rect', {
          x: cx - barW / 2, y: topBaseline - h, width: barW, height: h,
          fill: XBAR_FILL, stroke: XBAR_STROKE, 'stroke-width': 1,
        }));
        const t = el('text', { x: cx, y: topBaseline + 14, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = face;
        svg.appendChild(t);
      }
      svg.appendChild(el('line', { x1: ml, y1: topBaseline, x2: ml + plotW, y2: topBaseline, stroke: '#cfc9bd', 'stroke-width': 1 }));
      const topLabel = el('text', { x: ml, y: topMt - 2, 'text-anchor': 'start', fill: '#5b564c', 'font-family': 'var(--sans)', 'font-size': 11, 'font-weight': 700 });
      topLabel.textContent = 'This sample: ' + n + ' events (die-face units)';
      svg.appendChild(topLabel);

      // ---------- bottom panel: σ² line, σ̂² line, strip of every sample's variance estimate ----------
      const truePx = botX2px(TRUE_VAR);
      svg.appendChild(el('line', { x1: truePx, y1: botMt, x2: truePx, y2: botBaseline, stroke: ACCENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const trueLabel = el('text', { x: truePx, y: botMt - 6, 'text-anchor': 'middle', fill: ACCENT, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      trueLabel.textContent = 'σ² ≈ 2.92';
      svg.appendChild(trueLabel);

      const estimates = samples.map(s => s2(s, n));
      const sigmaHat = estimates.reduce((a, b) => a + b, 0) / estimates.length;
      const sigmaHatPx = botX2px(Math.min(botXmax, sigmaHat));
      svg.appendChild(el('line', { x1: sigmaHatPx, y1: botMt, x2: sigmaHatPx, y2: botBaseline, stroke: INK, 'stroke-width': 1.5 }));

      svg.appendChild(el('line', { x1: ml, y1: botBaseline, x2: ml + plotW, y2: botBaseline, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let xv = 0; xv <= botXmax; xv += 2) {
        const px = botX2px(xv);
        svg.appendChild(el('line', { x1: px, y1: botBaseline, x2: px, y2: botBaseline + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: botBaseline + 16, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = xv; svg.appendChild(t);
      }
      const botAxisLabel = el('text', { x: ml, y: botBaseline + 32, 'text-anchor': 'start', fill: '#5b564c', 'font-family': 'var(--sans)', 'font-size': 10.5 });
      botAxisLabel.textContent = 'S²ₙ (squared-deviation units) — a different scale from the panel above';
      svg.appendChild(botAxisLabel);
      const sigmaHatLabel = el('text', { x: sigmaHatPx, y: botBaseline + 48, 'text-anchor': 'middle', fill: INK, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      sigmaHatLabel.textContent = 'σ̂² = ' + fmt(sigmaHat, 2);
      svg.appendChild(sigmaHatLabel);

      let dotY = botMt + botPlotH / 2, currentS2Px = sigmaHatPx;
      samples.forEach((s, i) => {
        const isCurrent = i === currentIndex;
        const y = botMt + 12 + s.jitter * (botPlotH - 24);
        const cx = botX2px(Math.min(botXmax, s2(s, n)));
        if (isCurrent) { dotY = y; currentS2Px = cx; }
        const c = el('circle', {
          cx, cy: y, r: isCurrent ? 6 : 3,
          fill: isCurrent ? XBAR_STROKE : XBAR_FILL,
          stroke: isCurrent ? INK : XBAR_STROKE,
          'stroke-width': isCurrent ? 1.5 : 0.75,
          opacity: isCurrent ? 1 : 0.85,
          style: 'cursor:pointer',
        });
        c.addEventListener('click', () => { currentIndex = i; render(); });
        svg.appendChild(c);
      });

      // curved connector — the two panels are on different scales, so
      // instead of a straight vertical thread (only valid when both
      // panels share one axis), this is an S-curve bridging the mean's
      // position up top to the variance estimate's position down below.
      const startX = topX2px(current.mean), startY = topBaseline;
      const endX = currentS2Px, endY = dotY;
      const midY = (startY + endY) / 2;
      svg.appendChild(el('circle', { cx: startX, cy: startY, r: 3, fill: XBAR_STROKE }));
      svg.appendChild(el('path', {
        d: `M ${fmt(startX, 1)} ${fmt(startY, 1)} C ${fmt(startX, 1)} ${fmt(midY, 1)}, ${fmt(endX, 1)} ${fmt(midY, 1)}, ${fmt(endX, 1)} ${fmt(endY, 1)}`,
        fill: 'none', stroke: XBAR_STROKE, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.55,
      }));

      const formula = check.checked ? '(1/(n−1)) Σ(xᵢ − x̄)²' : '(1/n) Σ(xᵢ − x̄)²';
      readout.innerHTML = 'Formula: <code>' + formula + '</code>. T = <strong>' + samples.length + '</strong> sample' + (samples.length === 1 ? '' : 's') + ' drawn so far. ' +
        'Viewing sample #' + (currentIndex + 1) + ': its ' + n + ' rolls give S²ₙ = <strong>' + fmt(s2(current, n), 2) + '</strong>. ' +
        'The average of all ' + samples.length + ' collapsed dots so far is σ̂² = <strong>' + fmt(sigmaHat, 2) + '</strong> (true σ² ≈ 2.92). ' +
        'Click any dot below to inspect a different sample\'s own histogram.';
    }

    nSlider.input.addEventListener('input', () => { resetAll(); render(); });
    check.addEventListener('change', render);
    drawBtn.addEventListener('click', () => { drawNewSample(parseInt(nSlider.input.value, 10)); render(); });
    draw10Btn.addEventListener('click', () => { for (let i = 0; i < 10; i++) drawNewSample(parseInt(nSlider.input.value, 10)); render(); });
    resetBtn.addEventListener('click', () => { resetAll(); render(); });

    resetAll();
    render();
  })();

  // ============================================================
  // Inline glossary (contract from CLAUDE.md / lab-01)
  // ============================================================
  const GLOSSARY = {
    'variance-estimator-td': {
      title: 'Sample variance, S²ₙ',
      body: '<p>The collapse of one sample\'s N events into a single number measuring spread instead of center: <code>S²ₙ = (1/n)Σ(xᵢ − x̄)²</code>, or divided by (n − 1) with Bessel\'s correction. It lives on a different scale than the raw data — squared-deviation units, not the data\'s own units.</p>',
    },
    'sigma-hat-td': {
      title: 'σ̂² (sigma-hat squared)',
      body: '<p>The average of every collapsed variance estimate drawn so far — an estimate of σ² built from T samples. Toggling Bessel\'s correction shifts every dot (and σ̂²) at once, since it changes the divisor applied to the same stored sum of squares.</p>',
    },
  };
  window.GLOSSARY = GLOSSARY;

})();

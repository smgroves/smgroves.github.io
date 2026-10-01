/* ============================================================
 * Understanding Uncertainty · Activity — One Sample, One Point:
 * A Skewed Population. Same layout and mechanic as the die
 * version, swapped onto a right-skewed continuous population —
 * customer wait times, Exponential(mean θ = 2 minutes).
 *
 * A standalone mini-lesson in the Estimator Properties set.
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

  (function initTwoDistributionsSkewed() {
    const host = document.getElementById('viz-two-distributions-skewed');
    if (!host) return;

    const THETA = 2; // true mean wait time, minutes (Exponential(mean=2))

    host.innerHTML = '';
    const title = document.createElement('div'); title.className = 'viz-title';
    title.textContent = 'One sample\'s N wait times, collapsed to one point — click any dot below';
    host.appendChild(title);

    const controls = document.createElement('div'); controls.className = 'est-controls';
    const nSlider = slider('Sample size N', 1, 100, 1, 10);
    const drawBtn = document.createElement('button');
    drawBtn.type = 'button'; drawBtn.className = 'btn'; drawBtn.textContent = 'Draw a new sample';
    const draw10Btn = document.createElement('button');
    draw10Btn.type = 'button'; draw10Btn.className = 'btn'; draw10Btn.textContent = 'Draw 10 new samples';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button'; resetBtn.className = 'btn ghost'; resetBtn.textContent = 'Reset';
    controls.appendChild(nSlider.wrap);
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
    const topMt = 16, topPlotH = 130;              // histogram of one sample's N wait times
    const topBaseline = topMt + topPlotH;
    const botMt = topBaseline + 20, botPlotH = 200; // strip of T sample means
    const botBaseline = botMt + botPlotH;
    const plotW = width - ml - mr;
    const xmin = 0, xmax = 10;
    const x2px = x => ml + (x - xmin) / (xmax - xmin) * plotW;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'display:block; height:auto', role: 'img' });
    svgWrap.appendChild(svg);

    let rng = LabBase.makeLcg(20260809);
    function drawWait() { return -THETA * Math.log(Math.max(1e-9, 1 - rng())); }

    let samples = [];      // { draws: [...], mean, jitter }
    let currentIndex = -1;

    function drawNewSample(n) {
      const draws = [];
      for (let i = 0; i < n; i++) draws.push(drawWait());
      const mean = draws.reduce((a, b) => a + b, 0) / n;
      samples.push({ draws, mean, jitter: rng() });
      currentIndex = samples.length - 1;
    }

    function resetAll() {
      samples = [];
      currentIndex = -1;
      drawNewSample(parseInt(nSlider.input.value, 10));
    }

    const NBINS = 14;
    const binW = (xmax - xmin) / NBINS;

    function render() {
      const n = parseInt(nSlider.input.value, 10);
      nSlider.out.textContent = 'N = ' + n;
      const current = samples[currentIndex];

      svg.textContent = '';

      // ---------- top panel: histogram of the current sample's N wait times ----------
      const counts = new Array(NBINS).fill(0);
      current.draws.forEach(v => {
        let b = Math.floor((v - xmin) / binW);
        if (b < 0) b = 0; if (b >= NBINS) b = NBINS - 1;
        counts[b]++;
      });
      const maxCount = Math.max.apply(null, counts) || 1;
      for (let b = 0; b < NBINS; b++) {
        const x0 = x2px(xmin + b * binW), x1 = x2px(xmin + (b + 1) * binW);
        const h = (counts[b] / maxCount) * topPlotH;
        svg.appendChild(el('rect', {
          x: x0 + 0.5, y: topBaseline - h, width: Math.max(0, x1 - x0 - 1), height: h,
          fill: XBAR_FILL, stroke: XBAR_STROKE, 'stroke-width': 1,
        }));
      }
      svg.appendChild(el('line', { x1: ml, y1: topBaseline, x2: ml + plotW, y2: topBaseline, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let xv = 0; xv <= xmax; xv += 2) {
        const px = x2px(xv);
        svg.appendChild(el('line', { x1: px, y1: topBaseline, x2: px, y2: topBaseline + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: topBaseline + 14, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = xv; svg.appendChild(t);
      }
      const topLabel = el('text', { x: ml, y: topMt - 2, 'text-anchor': 'start', fill: '#5b564c', 'font-family': 'var(--sans)', 'font-size': 11, 'font-weight': 700 });
      topLabel.textContent = 'This sample: ' + n + ' wait times (minutes)';
      svg.appendChild(topLabel);

      // ---------- bottom panel: θ line, θ̂ line, and strip of every sample's mean ----------
      const thetaPx = x2px(THETA);
      svg.appendChild(el('line', { x1: thetaPx, y1: botMt, x2: thetaPx, y2: botBaseline, stroke: ACCENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const thetaLabel = el('text', { x: thetaPx, y: botMt - 6, 'text-anchor': 'middle', fill: ACCENT, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      thetaLabel.textContent = 'θ = 2';
      svg.appendChild(thetaLabel);

      const thetaHat = samples.reduce((a, s) => a + s.mean, 0) / samples.length;
      const thetaHatPx = x2px(thetaHat);
      svg.appendChild(el('line', { x1: thetaHatPx, y1: botMt, x2: thetaHatPx, y2: botBaseline, stroke: INK, 'stroke-width': 1.5 }));

      svg.appendChild(el('line', { x1: ml, y1: botBaseline, x2: ml + plotW, y2: botBaseline, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let xv = 0; xv <= xmax; xv += 2) {
        const px = x2px(xv);
        svg.appendChild(el('line', { x1: px, y1: botBaseline, x2: px, y2: botBaseline + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: botBaseline + 16, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = xv; svg.appendChild(t);
      }
      const thetaHatLabel = el('text', { x: thetaHatPx, y: botBaseline + 32, 'text-anchor': 'middle', fill: INK, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      thetaHatLabel.textContent = 'θ̂ = ' + fmt(thetaHat, 2);
      svg.appendChild(thetaHatLabel);

      let dotY = botMt + botPlotH / 2;
      samples.forEach((s, i) => {
        const isCurrent = i === currentIndex;
        const y = botMt + 12 + s.jitter * (botPlotH - 24);
        if (isCurrent) dotY = y;
        const cx = x2px(Math.min(xmax, s.mean));
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

      const meanPx = x2px(Math.min(xmax, current.mean));
      svg.appendChild(el('circle', { cx: meanPx, cy: topBaseline, r: 3, fill: XBAR_STROKE }));
      svg.appendChild(el('line', {
        x1: meanPx, y1: topBaseline, x2: meanPx, y2: dotY,
        stroke: XBAR_STROKE, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.55,
      }));

      readout.innerHTML = 'T = <strong>' + samples.length + '</strong> sample' + (samples.length === 1 ? '' : 's') + ' drawn so far. ' +
        'Viewing sample #' + (currentIndex + 1) + ': its ' + n + ' wait time' + (n === 1 ? '' : 's') + ' average' + (n === 1 ? 's' : '') + ' to X̄ₙ = <strong>' + fmt(current.mean, 2) + '</strong>. ' +
        'The average of all ' + samples.length + ' collapsed dots so far is θ̂ = <strong>' + fmt(thetaHat, 2) + '</strong>. ' +
        'Click any dot below to inspect a different sample\'s own histogram.';
    }

    nSlider.input.addEventListener('input', () => { resetAll(); render(); });
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
    'skewed-pop': {
      title: 'Right-skewed distribution',
      body: '<p>A distribution with a long tail stretching toward large values and most of its mass piled up near zero — most wait times are short, a few are very long. The Exponential distribution is the classic example: mean and standard deviation are both equal to θ.</p>',
    },
    'sampling-distribution-2d-skew': {
      title: 'Sampling distribution',
      body: '<p>The distribution of a statistic (like X̄ₙ) across many hypothetical samples — not the distribution of the raw data. Each sample\'s N wait times collapse into a single number; the spread of those collapsed numbers, across many samples, is the sampling distribution.</p>',
    },
    'theta-hat-skew': {
      title: 'θ̂ (theta-hat)',
      body: '<p>The average of every collapsed dot drawn so far — an estimate of θ built from T samples, not from N events. Growing T tightens θ̂ around θ, a different knob from growing N, which tightens each individual X̄ₙ instead.</p>',
    },
  };
  window.GLOSSARY = GLOSSARY;

})();

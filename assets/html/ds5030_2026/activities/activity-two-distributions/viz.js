/* ============================================================
 * Understanding Uncertainty · Activity — One Sample, One Point.
 * A standalone mini-lesson in the Estimator Properties set.
 *
 * Directly builds the sketch: a histogram of the N raw events
 * inside one sample collapses, via X̄_n, into a single point in
 * the distribution of estimators over T samples. Click any dot
 * below to see exactly which N events produced it.
 *
 * True die mean θ = 3.5.
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

  (function initTwoDistributions() {
    const host = document.getElementById('viz-two-distributions');
    if (!host) return;

    const THETA = 3.5;

    host.innerHTML = '';
    const title = document.createElement('div'); title.className = 'viz-title';
    title.textContent = 'One sample\'s N events, collapsed to one point — click any dot below';
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

    // Generous panel sizes so the swarm of samples has room to spread
    // out without dots or labels overlapping as T grows.
    const width = 680, height = 430;
    const ml = 48, mr = 20;
    const topMt = 16, topPlotH = 130;              // histogram of one sample's N events
    const topBaseline = topMt + topPlotH;
    const botMt = topBaseline + 20, botPlotH = 200; // strip of T sample means
    const botBaseline = botMt + botPlotH;
    const plotW = width - ml - mr;
    const xmin = 1, xmax = 6.2;
    const x2px = x => ml + (x - xmin) / (xmax - xmin) * plotW;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'display:block; height:auto', role: 'img' });
    svgWrap.appendChild(svg);

    let rng = LabBase.makeLcg(20260808);
    function rollDie() { return 1 + Math.min(5, Math.floor(rng() * 6)); }

    let samples = [];      // { rolls: [...], mean, jitter }
    let currentIndex = -1;

    function drawNewSample(n) {
      const rolls = [];
      for (let i = 0; i < n; i++) rolls.push(rollDie());
      const mean = rolls.reduce((a, b) => a + b, 0) / n;
      samples.push({ rolls, mean, jitter: rng() });
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

      // ---------- top panel: histogram of the current sample's N rolls ----------
      const counts = new Array(6).fill(0);
      current.rolls.forEach(v => counts[v - 1]++);
      const maxCount = Math.max.apply(null, counts) || 1;
      const barW = plotW / 6 * 0.6;
      for (let face = 1; face <= 6; face++) {
        const cx = x2px(face);
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
      topLabel.textContent = 'This sample: ' + n + ' events';
      svg.appendChild(topLabel);

      // ---------- bottom panel: θ line, θ̂ line, and strip of every sample's mean ----------
      const thetaPx = x2px(THETA);
      svg.appendChild(el('line', { x1: thetaPx, y1: botMt, x2: thetaPx, y2: botBaseline, stroke: ACCENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const thetaLabel = el('text', { x: thetaPx, y: botMt - 6, 'text-anchor': 'middle', fill: ACCENT, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      thetaLabel.textContent = 'θ = 3.5';
      svg.appendChild(thetaLabel);

      const thetaHat = samples.reduce((a, s) => a + s.mean, 0) / samples.length;
      const thetaHatPx = x2px(thetaHat);
      svg.appendChild(el('line', { x1: thetaHatPx, y1: botMt, x2: thetaHatPx, y2: botBaseline, stroke: INK, 'stroke-width': 1.5 }));

      svg.appendChild(el('line', { x1: ml, y1: botBaseline, x2: ml + plotW, y2: botBaseline, stroke: '#cfc9bd', 'stroke-width': 1 }));
      for (let v = 1; v <= 6; v++) {
        const px = x2px(v);
        svg.appendChild(el('line', { x1: px, y1: botBaseline, x2: px, y2: botBaseline + 4, stroke: '#cfc9bd' }));
        const t = el('text', { x: px, y: botBaseline + 16, 'text-anchor': 'middle', fill: '#8a857d', 'font-family': 'var(--sans)', 'font-size': 10 });
        t.textContent = v; svg.appendChild(t);
      }
      // θ̂'s label sits below the tick row — a fixed band, so it never
      // collides with θ's label above the panel even when the two
      // lines land close together.
      const thetaHatLabel = el('text', { x: thetaHatPx, y: botBaseline + 32, 'text-anchor': 'middle', fill: INK, 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700 });
      thetaHatLabel.textContent = 'θ̂ = ' + fmt(thetaHat, 2);
      svg.appendChild(thetaHatLabel);

      let dotY = botMt + botPlotH / 2;
      samples.forEach((s, i) => {
        const isCurrent = i === currentIndex;
        const y = botMt + 12 + s.jitter * (botPlotH - 24);
        if (isCurrent) dotY = y;
        const c = el('circle', {
          cx: x2px(s.mean), cy: y, r: isCurrent ? 6 : 3,
          fill: isCurrent ? XBAR_STROKE : XBAR_FILL,
          stroke: isCurrent ? INK : XBAR_STROKE,
          'stroke-width': isCurrent ? 1.5 : 0.75,
          opacity: isCurrent ? 1 : 0.85,
          style: 'cursor:pointer',
        });
        c.addEventListener('click', () => { currentIndex = i; render(); });
        svg.appendChild(c);
      });

      // connector thread from the histogram baseline down to the highlighted dot
      const meanPx = x2px(current.mean);
      svg.appendChild(el('circle', { cx: meanPx, cy: topBaseline, r: 3, fill: XBAR_STROKE }));
      svg.appendChild(el('line', {
        x1: meanPx, y1: topBaseline, x2: meanPx, y2: dotY,
        stroke: XBAR_STROKE, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.55,
      }));

      readout.innerHTML = 'T = <strong>' + samples.length + '</strong> sample' + (samples.length === 1 ? '' : 's') + ' drawn so far. ' +
        'Viewing sample #' + (currentIndex + 1) + ': its ' + n + ' roll' + (n === 1 ? '' : 's') + ' average' + (n === 1 ? 's' : '') + ' to X̄ₙ = <strong>' + fmt(current.mean, 2) + '</strong>. ' +
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
    'one-sample': {
      title: 'A sample (of size N)',
      body: '<p>N individual draws from the population, e.g. N die rolls. It has its own shape — a histogram of raw values, one bar per possible outcome. Every one of those N values is a real, separate observation.</p>',
    },
    'sampling-distribution-2d': {
      title: 'Sampling distribution',
      body: '<p>The distribution of a statistic (like X̄ₙ) across many hypothetical samples — not the distribution of the raw data. Each sample\'s N events collapse into a single number; the spread of those collapsed numbers, across many samples, is the sampling distribution.</p>',
    },
    'theta-hat-td': {
      title: 'θ̂ (theta-hat)',
      body: '<p>The average of every collapsed dot drawn so far — an estimate of θ built from T samples, not from N events. It gets more precise as T grows, which is a different knob from N: N controls how tightly one dot (X̄ₙ) clusters around θ; T controls how tightly θ̂ (the average of the dots) clusters around θ.</p>',
    },
  };
  window.GLOSSARY = GLOSSARY;

})();

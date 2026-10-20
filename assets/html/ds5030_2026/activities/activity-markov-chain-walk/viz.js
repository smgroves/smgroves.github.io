// Markov Chain Walk — one IIFE, no libraries.
// Input table (any nonnegative entries) -> row-normalize -> transition matrix P.
// A seeded random walk draws each step from the current row of P.
(function () {
  'use strict';

  const MAX_N = 10;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const CX = 300, CY = 300;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- examples
  const PRESETS = [
    {
      id: 'class-weather', label: 'Class example: rain or shine (joint table)',
      names: ['S', 'R'],
      table: [['3/9', '2/9'], ['1/9', '3/9']],
      note: 'The joint table of (today, tomorrow) from the 10 days S S S R R R S S R R. Rows normalize to pr[S | S] = 3/5 and pr[R | R] = 3/4, matching the cross tab from class.'
    },
    {
      id: 'cville', label: 'Charlottesville precipitation: Dry / Rainy (counts)',
      names: ['Dry', 'Rainy'],
      table: [['86', '35'], ['37', '98']],
      note: 'Raw counts of (current, next) observations at station US1VACRC002, 2024–2025. Rainy spells persist: pr[Rainy next | Rainy] ≈ 0.73.'
    },
    {
      id: 'market', label: 'Daily market returns: Down / Up (counts)',
      names: ['Down', 'Up'],
      table: [['5909', '5999'], ['5999', '8388']],
      note: 'Pairs of consecutive trading days, 1926–2026. The rows are close to each other: today tells you little about tomorrow’s direction.'
    },
    {
      id: 'precip5', label: 'Precipitation, five categories (conditional PMF)',
      names: ['Dry', 'Drizzle', 'Light', 'Heavy', 'Extreme'],
      table: [
        ['0.711', '0.132', '0.074', '0.066', '0.017'],
        ['0.372', '0.163', '0.256', '0.047', '0.163'],
        ['0.192', '0.192', '0.327', '0.192', '0.096'],
        ['0.417', '0.208', '0.292', '0.083', '0'],
        ['0.063', '0.313', '0.375', '0.188', '0.063']
      ],
      note: 'pr[next category | current category] for the Charlottesville station, from the crosstab with normalize="index".'
    },
    {
      id: 'ruin', label: 'Gambler’s ruin: $0 to $4 (absorbing ends)',
      names: ['$0', '$1', '$2', '$3', '$4'],
      table: [
        ['1', '0', '0', '0', '0'],
        ['1/2', '0', '1/2', '0', '0'],
        ['0', '1/2', '0', '1/2', '0'],
        ['0', '0', '1/2', '0', '1/2'],
        ['0', '0', '0', '0', '1']
      ],
      note: 'Bet $1 on a fair coin until you hit $0 or $4. Once the walk reaches an end it never leaves, so the long run depends on where you start. Try starting in $1 and in $3.'
    },
    {
      id: 'cycle', label: 'A deterministic cycle: A → B → C → A',
      names: ['A', 'B', 'C'],
      table: [['0', '1', '0'], ['0', '0', '1'], ['1', '0', '0']],
      note: 'Every row has a single 1, so there is no randomness at all: the walk goes around the loop. Each state still gets 1/3 of the time.'
    },
    {
      id: 'random', label: 'Random 6-state chain',
      names: ['A', 'B', 'C', 'D', 'E', 'F'],
      table: null,
      note: 'Random entries from the seed. Change the seed and reload this example for a different chain.'
    }
  ];

  // ---------------------------------------------------------------- state
  let names = [];
  let raw = [];          // n x n strings, exactly as typed
  let P = null;          // n x n row-normalized, or null if invalid
  let longRun = [];
  let cur = 0, steps = 0, counts = [], history = [];
  let rng = null;
  let playing = false, timer = null, anim = null;
  let edgePaths = {};    // "i-j" -> SVG path element

  const $ = (id) => document.getElementById(id);
  const svg = $('mc-diagram');
  const color = (i) => `var(--s${i % 10})`;

  // Seeded RNG (mulberry32), so a seed reproduces the same walk.
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // "1/3" -> 0.333, "0.25" -> 0.25, "86" -> 86, "" -> 0, anything else -> NaN
  function parseEntry(s) {
    s = String(s).trim();
    if (s === '') return 0;
    let v;
    if (s.includes('/')) {
      const [a, b] = s.split('/');
      v = Number(a) / Number(b);
    } else {
      v = Number(s);
    }
    return Number.isFinite(v) && v >= 0 ? v : NaN;
  }

  const fmt = (p, d = 2) => (Math.abs(p) < 0.0005 ? '0' : p.toFixed(d).replace(/^0\./, '.').replace(/^\./, '0.'));

  // ---------------------------------------------------------------- matrix
  function computeP() {
    const n = names.length;
    const errs = [];
    const out = [];
    for (let i = 0; i < n; i++) {
      const row = raw[i].map(parseEntry);
      if (row.some(Number.isNaN)) { errs.push(`Row ${names[i] || i + 1} has an entry that isn't a nonnegative number or fraction.`); out.push(null); continue; }
      const sum = row.reduce((a, b) => a + b, 0);
      if (sum <= 0) { errs.push(`Row ${names[i] || i + 1} is all zeros. Give it at least one positive entry, or a 1 on the diagonal to make it absorbing.`); out.push(null); continue; }
      out.push(row.map((v) => v / sum));
    }
    const seen = new Set();
    names.forEach((nm) => { if (seen.has(nm)) errs.push(`Two states are named "${nm}". Give each state its own name.`); seen.add(nm); });
    return { P: errs.length ? null : out, errs: [...new Set(errs)] };
  }

  // Long-run share of time from the start state: the Cesàro average of the
  // distributions after 1, 2, ..., K steps. Equals the stationary distribution
  // for an irreducible chain, and still makes sense for periodic or absorbing ones.
  function computeLongRun(Pm, start) {
    const n = Pm.length, K = 4000;
    let d = new Array(n).fill(0); d[start] = 1;
    const avg = new Array(n).fill(0);
    for (let k = 0; k < K; k++) {
      const nd = new Array(n).fill(0);
      for (let i = 0; i < n; i++) if (d[i]) for (let j = 0; j < n; j++) nd[j] += d[i] * Pm[i][j];
      d = nd;
      for (let j = 0; j < n; j++) avg[j] += d[j];
    }
    return avg.map((v) => v / K);
  }

  // ---------------------------------------------------------------- input UI
  function renderInput() {
    const n = names.length;
    const t = $('mc-input');
    t.innerHTML = '';
    const head = t.insertRow();
    const corner = document.createElement('th'); corner.className = 'corner'; corner.textContent = 'today ↓  tomorrow →'; head.appendChild(corner);
    names.forEach((nm, j) => { const th = document.createElement('th'); th.innerHTML = `<span class="mc-swatch" style="background:${color(j)}"></span>`; th.appendChild(document.createTextNode(nm)); head.appendChild(th); });
    const sumh = document.createElement('th'); sumh.textContent = 'row sum'; head.appendChild(sumh);

    for (let i = 0; i < n; i++) {
      const tr = t.insertRow();
      const th = document.createElement('th');
      const nameIn = document.createElement('input');
      nameIn.className = 'name'; nameIn.id = `name-${i}`; nameIn.value = names[i]; nameIn.maxLength = 12;
      nameIn.setAttribute('aria-label', `Name of state ${i + 1}`);
      nameIn.addEventListener('change', () => {
        names[i] = nameIn.value.trim() || `S${i + 1}`;
        rebuild(true);
      });
      th.appendChild(nameIn); tr.appendChild(th);
      for (let j = 0; j < n; j++) {
        const td = tr.insertCell();
        const inp = document.createElement('input');
        inp.id = `cell-${i}-${j}`; inp.value = raw[i][j]; inp.inputMode = 'decimal';
        inp.setAttribute('aria-label', `From ${names[i]} to ${names[j]}`);
        inp.addEventListener('input', () => { raw[i][j] = inp.value; inp.classList.toggle('bad', Number.isNaN(parseEntry(inp.value))); scheduleRebuild(); });
        td.appendChild(inp);
      }
      const sc = tr.insertCell(); sc.className = 'rowsum mono'; sc.id = `rowsum-${i}`;
    }
    updateRowSums();
    $('n-out').textContent = n;
    $('n-minus').disabled = n <= 1;
    $('n-plus').disabled = n >= MAX_N;
  }

  function updateRowSums() {
    for (let i = 0; i < names.length; i++) {
      const s = raw[i].map(parseEntry).reduce((a, b) => a + b, 0);
      const el = $(`rowsum-${i}`);
      if (el) el.textContent = Number.isNaN(s) ? '?' : (Math.abs(s - Math.round(s)) < 1e-9 ? String(Math.round(s)) : s.toFixed(3));
    }
  }

  function renderP() {
    const t = $('mc-p');
    t.innerHTML = '';
    if (!P) return;
    const head = t.insertRow();
    const c = document.createElement('th'); c.className = 'corner'; c.textContent = 'today \\ tomorrow'; head.appendChild(c);
    names.forEach((nm) => { const th = document.createElement('th'); th.textContent = nm; head.appendChild(th); });
    const s = document.createElement('th'); s.textContent = 'sum'; head.appendChild(s);
    P.forEach((row, i) => {
      const tr = t.insertRow();
      const th = document.createElement('th'); th.className = 'rowh';
      th.innerHTML = `<span class="mc-swatch" style="background:${color(i)}"></span>`; th.appendChild(document.createTextNode(names[i]));
      tr.appendChild(th);
      row.forEach((p) => {
        const td = tr.insertCell();
        td.textContent = fmt(p, 3);
        td.style.background = `color-mix(in srgb, var(--accent) ${Math.round(p * 55)}%, var(--bg))`;
      });
      const sc = tr.insertCell(); sc.className = 'sum'; sc.textContent = '1';
    });
  }

  function renderStartSelect() {
    const sel = $('start-state');
    const prev = Math.min(cur, names.length - 1);
    sel.innerHTML = '';
    names.forEach((nm, i) => { const o = document.createElement('option'); o.value = i; o.textContent = nm; sel.appendChild(o); });
    sel.value = String(prev >= 0 ? prev : 0);
  }

  // ---------------------------------------------------------------- diagram
  function layout(n) {
    const r = n <= 3 ? 38 : n <= 5 ? 33 : n <= 7 ? 28 : 24;
    const ring = 300 - (r * 3.3 + 26);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? -Math.PI / 2 : n === 2 ? (i === 0 ? Math.PI : 0) : -Math.PI / 2 + (2 * Math.PI * i) / n;
      pos.push({ x: CX + (n === 1 ? 0 : ring * Math.cos(a)), y: CY + (n === 1 ? 0 : ring * Math.sin(a)), a });
    }
    return { pos, r };
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function drawDiagram() {
    svg.innerHTML = '';
    edgePaths = {};
    const n = names.length;
    if (!P) {
      const t = el('text', { x: CX, y: CY, 'text-anchor': 'middle', class: 'edge-label' }, svg);
      t.textContent = 'Fix the table to draw the chain';
      return;
    }
    const { pos, r } = layout(n);
    // Two states sit side by side: crop the empty top and bottom of the square.
    svg.setAttribute('viewBox', n <= 2 ? `0 ${CY - 150} 600 300` : '0 0 600 600');
    const showLabels = $('show-labels').checked;

    const defs = el('defs', {}, svg);
    const mk = (id, fill) => {
      const m = el('marker', { id, viewBox: '0 0 10 10', refX: '8.5', refY: '5', markerWidth: '9', markerHeight: '9', markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 z', style: `fill:${fill}` }, m);
    };
    mk('arr-dim', 'var(--edge)');
    for (let i = 0; i < n; i++) mk(`arr-${i}`, color(i));

    const gEdges = el('g', {}, svg), gLabels = el('g', {}, svg), gNodes = el('g', {}, svg);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const p = P[i][j];
        if (p < 1e-9) continue;
        const live = i === cur;
        let d, lx, ly;
        if (i === j) {
          const a = n === 1 ? -Math.PI / 2 : pos[i].a;
          const pt = (ang, rad) => ({ x: pos[i].x + rad * Math.cos(ang), y: pos[i].y + rad * Math.sin(ang) });
          const s = pt(a - 0.5, r), e = pt(a + 0.5, r + 2);
          const c1 = pt(a - 0.75, r * 2.75), c2 = pt(a + 0.75, r * 2.75);
          d = `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`;
          const lp = pt(a, r * 2.55 + 14);
          lx = lp.x; ly = lp.y;
        } else {
          const p0 = pos[i], p1 = pos[j];
          const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy);
          const nx = -dy / L, ny = dx / L, bow = Math.min(0.2 * L, 60);
          const c = { x: (p0.x + p1.x) / 2 + nx * bow, y: (p0.y + p1.y) / 2 + ny * bow };
          const unit = (from, to) => { const ux = to.x - from.x, uy = to.y - from.y, m = Math.hypot(ux, uy); return { x: ux / m, y: uy / m }; };
          const u0 = unit(p0, c), u1 = unit(p1, c);
          const s = { x: p0.x + u0.x * r, y: p0.y + u0.y * r };
          const e = { x: p1.x + u1.x * (r + 2), y: p1.y + u1.y * (r + 2) };
          d = `M${s.x},${s.y} Q${c.x},${c.y} ${e.x},${e.y}`;
          lx = 0.25 * s.x + 0.5 * c.x + 0.25 * e.x + nx * 11;
          ly = 0.25 * s.y + 0.5 * c.y + 0.25 * e.y + ny * 11;
        }
        const path = el('path', {
          d, class: 'edge',
          'stroke-width': (1.2 + 6 * p).toFixed(2),
          'marker-end': `url(#${live ? 'arr-' + i : 'arr-dim'})`,
          style: live ? `stroke:${color(i)}` : `opacity:${n > 5 ? 0.45 : 0.75}`
        }, gEdges);
        edgePaths[`${i}-${j}`] = path;
        // With more than 3 states, label only the current row's arrows to keep the diagram readable.
        if (showLabels && p >= 0.005 && (live || n <= 3)) {
          const t = el('text', { x: lx.toFixed(1), y: (ly + 4).toFixed(1), 'text-anchor': 'middle', class: 'edge-label' + (live ? '' : ' dim') }, gLabels);
          t.textContent = fmt(p);
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const g = el('g', { class: 'node' + (i === cur ? ' current' : '') }, gNodes);
      el('circle', { cx: pos[i].x, cy: pos[i].y, r, style: `fill:${color(i)}` }, g);
      if (i === cur) el('circle', { cx: pos[i].x, cy: pos[i].y, r: r + 5, class: 'ring' }, g);
      const label = names[i].length > 5 ? names[i].slice(0, 5) + '…' : names[i];
      const t = el('text', { x: pos[i].x, y: pos[i].y + 5, 'text-anchor': 'middle', 'font-size': label.length > 3 ? 12 : 16 }, g);
      t.textContent = label;
    }
    el('circle', { id: 'token', r: 9, cx: pos[cur].x, cy: pos[cur].y, class: 'token', style: `fill:${color(cur)};opacity:0` }, svg);
  }

  // ---------------------------------------------------------------- walk
  let walkId = 0;
  function resetWalk() {
    stop();
    walkId += 1;
    rng = makeRng(parseInt($('seed').value, 10) || 0);
    cur = Math.min(parseInt($('start-state').value, 10) || 0, names.length - 1);
    steps = 0;
    counts = new Array(names.length).fill(0);
    history = [cur];
    if (P) longRun = computeLongRun(P, cur);
    drawDiagram();
    renderHistory();
  }

  function draw() {
    const u = rng();
    const row = P[cur];
    let acc = 0, next = row.length - 1;
    for (let j = 0; j < row.length; j++) { acc += row[j]; if (u < acc) { next = j; break; } }
    return { u, next };
  }

  function step(animate) {
    if (!P) return;
    const from = cur;
    const { u, next } = draw();
    cur = next; steps += 1; counts[next] += 1;
    history.push(next); if (history.length > 200) history.shift();
    if (animate) {
      moveToken(from, next);
    }
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function moveToken(from, to) {
    const path = edgePaths[`${from}-${to}`];
    const token = document.getElementById('token');
    const finish = () => { anim = null; drawDiagram(); renderHistory(); };
    if (!path || !token || reduceMotion || stepInterval() < 160) { finish(); return; }
    if (anim) cancelAnimationFrame(anim);
    path.style.stroke = color(from); path.style.opacity = 1;
    token.style.opacity = 1;
    const L = path.getTotalLength();
    const dur = Math.min(650, stepInterval() * 0.75);
    const t0 = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const pt = path.getPointAtLength(e * L);
      token.setAttribute('cx', pt.x); token.setAttribute('cy', pt.y);
      if (k < 1) anim = requestAnimationFrame(frame); else finish();
    };
    anim = requestAnimationFrame(frame);
  }



  // Scrolling strip of visited states: the newest state enters on the right and
  // everything slides left one slot, like a ticker. Jumps and fast play redraw it whole.
  const TICK_W = 29, TICK_KEEP = 80;
  let tickerShown = -1, tickerWalk = -1;
  function tickerChip(s) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.style.background = color(s);
    c.textContent = names[s].slice(0, 3);
    c.title = names[s];
    return c;
  }
  function renderTicker() {
    const row = $('seq');
    const fresh = steps - tickerShown;
    if (fresh === 0 && tickerWalk === walkId) return;
    const slide = tickerWalk === walkId && fresh === 1 && !reduceMotion && stepInterval() >= 120;
    if (slide) {
      row.appendChild(tickerChip(history[history.length - 1]));
      while (row.children.length > TICK_KEEP) row.firstChild.remove();
      row.style.transition = 'none';
      row.style.transform = `translateX(${TICK_W}px)`;
      void row.offsetWidth;                       // commit the start position before animating
      row.style.transition = `transform ${Math.min(350, stepInterval() * 0.6)}ms ease-out`;
      row.style.transform = 'translateX(0)';
    } else {
      row.innerHTML = '';
      history.slice(-TICK_KEEP).forEach((st) => row.appendChild(tickerChip(st)));
      row.style.transition = 'none';
      row.style.transform = 'translateX(0)';
    }
    Array.from(row.children).forEach((c, k, all) => c.classList.toggle('latest', k === all.length - 1));
    tickerShown = steps; tickerWalk = walkId;
  }

  function renderHistory() {
    $('step-count').textContent = steps.toLocaleString();
    renderTicker();
    const bars = $('share-bars');
    bars.innerHTML = '';
    if (!P) return;
    names.forEach((nm, i) => {
      const share = steps ? counts[i] / steps : 0;
      const row = document.createElement('div'); row.className = 'mc-bar-row';
      row.innerHTML = `<div class="mc-bar-name"><span class="mc-swatch" style="background:${color(i)}"></span>${esc(nm)}</div>
        <div class="mc-bar-track"><div class="mc-bar-fill" style="width:${(100 * share).toFixed(2)}%;background:${color(i)}"></div>
        <div class="mc-bar-tick" style="left:${(100 * longRun[i]).toFixed(2)}%" title="long run ${fmt(longRun[i], 3)}"></div></div>
        <div class="mc-bar-num">${fmt(share, 3)} <span style="color:var(--ink-mute)">/ ${fmt(longRun[i], 3)}</span></div>`;
      bars.appendChild(row);
    });
  }

  // ---------------------------------------------------------------- play loop
  function stepInterval() {
    const v = Number($('speed').value);           // 0..100 -> 0.5 .. 30 steps per second (log scale)
    const rate = 0.5 * Math.pow(60, v / 100);
    return 1000 / rate;
  }
  function updateSpeedLabel() {
    const rate = 1000 / stepInterval();
    $('speed-out').textContent = (rate < 10 ? rate.toFixed(1).replace(/\.0$/, '') : Math.round(rate)) + '/s';
  }
  function tick() {
    step(true);
    if (stepInterval() < 160) { drawDiagram(); renderHistory(); }
    timer = setTimeout(tick, stepInterval());
  }
  function play() {
    if (!P) return;
    playing = true; $('btn-play').textContent = 'Pause';
    tick();
  }
  function stop() {
    playing = false; $('btn-play').textContent = 'Play';
    clearTimeout(timer); timer = null;
    if (anim) { cancelAnimationFrame(anim); anim = null; }
  }

  // ---------------------------------------------------------------- rebuild
  let rebuildTimer = null;
  function scheduleRebuild() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(() => rebuild(false), 250); updateRowSums(); }

  function rebuild(reRenderInput) {
    if (reRenderInput) renderInput();
    const { P: newP, errs } = computeP();
    P = newP;
    const box = $('mc-error');
    if (errs.length) { box.hidden = false; box.innerHTML = errs.map(esc).join('<br>'); } else { box.hidden = true; }
    ['btn-play', 'btn-step', 'btn-jump'].forEach((id) => { $(id).disabled = !P; });
    renderP();
    renderStartSelect();
    resetWalk();
  }

  function loadPreset(id) {
    const pr = PRESETS.find((p) => p.id === id) || PRESETS[0];
    names = pr.names.slice();
    if (pr.table) raw = pr.table.map((r) => r.slice());
    else {
      const g = makeRng(parseInt($('seed').value, 10) || 1);
      raw = names.map(() => names.map(() => (g() < 0.35 ? '0' : (Math.round(g() * 9) + 1).toString())));
      raw.forEach((r, i) => { if (r.every((v) => v === '0')) r[i] = '1'; });
    }
    $('preset-note').textContent = pr.note;
    cur = 0;
    rebuild(true);
  }

  function resize(n) {
    n = Math.max(1, Math.min(MAX_N, n));
    const old = names.length;
    if (n > old) {
      for (let k = old; k < n; k++) {
        let nm = String.fromCharCode(65 + k); if (names.includes(nm)) nm = `S${k + 1}`;
        names.push(nm);
        raw.forEach((r) => r.push('0'));
        const row = new Array(n).fill('0'); row[k] = '1';
        raw.push(row);
      }
    } else {
      names = names.slice(0, n);
      raw = raw.slice(0, n).map((r) => r.slice(0, n));
    }
    $('preset-note').textContent = 'Your own table. New states start as absorbing (a 1 on the diagonal) until you fill in their row.';
    $('preset').value = '';
    rebuild(true);
  }

  // ---------------------------------------------------------------- wire up
  const presetSel = $('preset');
  const blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Your own table'; blank.disabled = true; presetSel.appendChild(blank);
  PRESETS.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.label; presetSel.appendChild(o); });
  presetSel.addEventListener('change', () => { if (presetSel.value) loadPreset(presetSel.value); });

  $('n-minus').addEventListener('click', () => resize(names.length - 1));
  $('n-plus').addEventListener('click', () => resize(names.length + 1));
  $('btn-play').addEventListener('click', () => (playing ? stop() : play()));
  $('btn-step').addEventListener('click', () => { stop(); step(true); });
  $('btn-jump').addEventListener('click', () => {
    stop();
    for (let k = 0; k < 1000; k++) step(false); drawDiagram(); renderHistory();
  });
  $('btn-reset').addEventListener('click', resetWalk);
  $('start-state').addEventListener('change', resetWalk);
  $('seed').addEventListener('change', resetWalk);
  $('show-labels').addEventListener('change', drawDiagram);
  $('speed').addEventListener('input', updateSpeedLabel);

  updateSpeedLabel();
  presetSel.value = 'class-weather';
  loadPreset('class-weather');

  // exposed for testing in the console
  window.MarkovWalk = { get P() { return P; }, get longRun() { return longRun; }, get counts() { return counts; }, get steps() { return steps; }, step, computeLongRun, parseEntry };
})();

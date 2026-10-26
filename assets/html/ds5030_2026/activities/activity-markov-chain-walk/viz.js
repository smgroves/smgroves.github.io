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
    },
    {
      id: 'bach', label: 'Bach chorales, order 1: the state is one chord',
      chords: true, start: 'D7',
      note: 'Counts of (current chord, next chord) in 62 Bach chorales: 99 chords, 5,603 moves. Too many states to type in, so the table on the right shows only the current chord\'s row. The walk starts in D7, whose row is G 0.34, D7 0.33, Gm 0.19. Tick "Play the chords" under the chain to hear the walk.'
    },
    {
      id: 'bach2', label: 'Bach chorales, order 2: the state is two chords',
      chords: true, pairs: true, start: 'D D7',
      note: 'The same chorales with a bigger state: the last two chords. 747 pairs, 5,532 moves from (a, b) to (b, c). The next chord depends on the previous chord as well as the current one: compare the row of (D, D7) with order 1\'s D7 row. 10 pairs that only end a chorale, or lead only to such a pair, are left out, with the 11 moves into them, so every pair has somewhere to go.'
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
  let soundable = false; // true while the loaded example's states are chord names
  let pairMode = false;  // true for the order-2 Bach example: each state is "previous current"

  const $ = (id) => document.getElementById(id);
  const svg = $('mc-diagram');
  // More than MAX_N states (the Bach chorales): no diagram, no editable table.
  const isBig = () => names.length > MAX_N;
  // With 99 chords, color by chord quality instead of by state index.
  function qualityColor(nm) {
    const q = String(nm).replace(/^[A-G][#-]?/, '');
    if (q === '') return 'var(--s3)';                              // major
    if (q === 'm' || q === 'm6' || q === 'm7') return 'var(--s1)'; // minor
    if (q === '7') return 'var(--s7)';                             // dominant seventh
    if (q === 'dim' || q === 'dim7') return 'var(--s9)';           // diminished
    return 'var(--s6)';                                            // sus4, added sixth
  }
  const color = (i) => (isBig() ? qualityColor(String(names[i]).split(' ').pop()) : `var(--s${i % 10})`);

  // ---------------------------------------------------------------- sound
  // Chord name -> MIDI notes: root in the bass (E2 to D#3), the chord tones
  // close together from G3 up to F#4. Qualities follow the cleaned Bach labels.
  const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const QUALITY = {
    '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10],
    dim: [0, 3, 6], dim7: [0, 3, 6, 9], '4': [0, 5, 7], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9]
  };
  function chordMidi(nm) {
    const m = /^([A-G])([#-]?)(.*)$/.exec(nm);
    if (!m || !(m[3] in QUALITY)) return null;
    const pc = (PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === '-' ? -1 : 0) + 12) % 12;
    let bass = 36 + pc; if (bass < 40) bass += 12;
    const upper = QUALITY[m[3]].map((iv) => 55 + (((pc + iv - 55) % 12) + 12) % 12).sort((a, b) => a - b);
    return [bass].concat(upper);
  }

  let actx = null, voices = [];
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function silence() {
    if (!actx) return;
    const t = actx.currentTime;
    voices.forEach((v) => { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.02); v.o.stop(t + 0.15); });
    voices = [];
  }
  function playChord(nm, dur) {
    const notes = chordMidi(nm);
    const ctx = audio();
    if (!notes || !ctx) return;
    silence();
    const t = ctx.currentTime + 0.01;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    lp.connect(ctx.destination);
    notes.forEach((midi, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      const peak = (k === 0 ? 0.16 : 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.02);
      g.gain.setTargetAtTime(peak * 0.6, t + 0.05, 0.2);
      g.gain.setTargetAtTime(0, t + dur * 0.8, dur * 0.12);
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + dur + 0.4);
      voices.push({ o, g });
    });
  }
  const soundOn = () => soundable && $('play-chords').checked;

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
    // Only the non-zero entries of each row: the Bach chains are 92% to 99.7% zeros.
    const nz = Pm.map((row) => row.reduce((acc, p, j) => { if (p > 0) acc.push([j, p]); return acc; }, []));
    let d = new Array(n).fill(0); d[start] = 1;
    const avg = new Array(n).fill(0);
    for (let k = 0; k < K; k++) {
      const nd = new Array(n).fill(0);
      for (let i = 0; i < n; i++) if (d[i]) for (const [j, p] of nz[i]) nd[j] += d[i] * p;
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
    document.querySelector('.mc-n-row').hidden = isBig();
    if (isBig()) {
      const td = t.insertRow().insertCell();
      td.className = 'mc-big-note';
      td.textContent = `${n} states: too many to type in or edit here. The counts are loaded from bach.js. The row for the current chord is shown below.`;
      $('n-out').textContent = n;
      return;
    }
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

  // Big chains: show one row of P, the current chord's, as next | count | p̂.
  function renderCurrentRow() {
    const t = $('mc-p');
    t.innerHTML = '';
    const counts = raw[cur].map(parseEntry);
    const total = counts.reduce((a, b) => a + b, 0);
    const head = t.insertRow();
    [pairMode ? 'next pair' : 'next chord', 'count', `p̂(next | ${pairMode ? '(' + names[cur].replace(' ', ', ') + ')' : names[cur]})`].forEach((h) => { const th = document.createElement('th'); th.textContent = h; head.appendChild(th); });
    counts.map((c, j) => ({ c, j })).filter((e) => e.c > 0).sort((a, b) => b.c - a.c).forEach(({ c, j }) => {
      const tr = t.insertRow();
      const th = document.createElement('th'); th.className = 'rowh';
      th.innerHTML = `<span class="mc-swatch" style="background:${color(j)}"></span>`; th.appendChild(document.createTextNode(names[j]));
      tr.appendChild(th);
      const tc = tr.insertCell(); tc.textContent = c;
      const tp = tr.insertCell(); tp.textContent = `${c}/${total} = ${fmt(P[cur][j], 2)}`;
      tp.style.background = `color-mix(in srgb, var(--accent) ${Math.round(P[cur][j] * 55)}%, var(--bg))`;
    });
    const tr = t.insertRow();
    const th = document.createElement('th'); th.className = 'rowh'; th.textContent = 'total'; tr.appendChild(th);
    tr.insertCell().textContent = total;
    const ts = tr.insertCell(); ts.className = 'sum'; ts.textContent = '1';
  }

  function renderP() {
    const t = $('mc-p');
    t.innerHTML = '';
    if (!P) return;
    if (isBig()) { renderCurrentRow(); return; }
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
    if (isBig()) { drawNetwork(); renderP(); return; }
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

  // Big chains (the Bach chorales): a network of the 99 chords, laid out by music theory.
  // Angle: the chord's root on the circle of fifths, C at the top, then G, D, A, ...
  // Radius: its quality, major on the outside down to diminished seventh in the middle.
  // Sharp and flat spellings of one root (A# and B-) sit just either side of it.
  // The nodes are always chords. In the order-2 example the state is a pair of
  // chords, so the walk is drawn as two highlighted nodes: previous and current.
  const RING = { '': 250, '7': 224, '6': 202, '4': 182, m: 158, m7: 136, m6: 116, dim: 94, dim7: 72 };
  const FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#/D♭', 'G#/A♭', 'D#/E♭', 'A#/B♭', 'F'];
  const BG_EDGE = 0.10;                        // faint background edges: order-1 moves with p >= 0.10
  let net = null;                              // { chords, index, pos, bg }, built once
  function network() {
    if (net) return net;
    const B = window.MC_BACH;
    const chords = B.states;
    const index = {};
    chords.forEach((c, k) => { index[c] = k; });
    const totals = chords.map((c) => Object.values(B.rows[c] || {}).reduce((a, b) => a + b, 0));
    const tmax = Math.max(...totals);
    const pos = chords.map((nm, i) => {
      const m = /^([A-G])([#-]?)(.*)$/.exec(nm);
      const pc = (PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === '-' ? -1 : 0) + 12) % 12;
      const slot = (pc * 7) % 12;              // position on the circle of fifths
      const a = -Math.PI / 2 + (2 * Math.PI * slot) / 12 + (m[2] === '#' ? 0.09 : m[2] === '-' ? -0.09 : 0);
      const rr = RING[m[3]] || 250;
      return { x: CX + rr * Math.cos(a), y: CY + rr * Math.sin(a), a, r: 3 + 9 * Math.sqrt(totals[i] / tmax), n: totals[i] };
    });
    // Background edges come from the order-1 chord counts in both examples.
    const bg = [];
    chords.forEach((c, i) => {
      const row = B.rows[c] || {}, tot = totals[i];
      for (const d in row) { const j = index[d], p = row[d] / tot; if (j !== i && p >= BG_EDGE) bg.push({ i, j, p }); }
    });
    net = { chords, index, pos, bg };
    return net;
  }
  // A state's chords: [previous, current] for pairs, [null, chord] otherwise.
  const stateChords = (s) => (pairMode ? names[s].split(' ') : [null, names[s]]);
  const curChord = (s) => stateChords(s)[1];

  function drawNetwork() {
    const { chords, index, pos, bg } = network();
    const nC = chords.length;
    const [prevName, curName] = stateChords(cur);
    const cc = index[curName], pc = prevName === null ? -1 : index[prevName];
    svg.setAttribute('viewBox', '-30 0 660 600');   // a little wider: the root names at 9 and 3 o'clock
    const showLabels = $('show-labels').checked;
    const defs = el('defs', {}, svg);
    const m = el('marker', { id: 'arr-cur', viewBox: '0 0 10 10', refX: '8.5', refY: '5', markerWidth: '7', markerHeight: '7', markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', style: `fill:${color(cur)}` }, m);

    // Root names around the outside.
    FIFTHS.forEach((root, k) => {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / 12;
      const side = Math.cos(a) < -0.3 ? 'end' : Math.cos(a) > 0.3 ? 'start' : 'middle';
      const t = el('text', { x: (CX + 274 * Math.cos(a)).toFixed(1), y: (CY + 278 * Math.sin(a) + 5).toFixed(1), 'text-anchor': side, class: 'net-root' }, svg);
      t.textContent = root;
    });
    if (pairMode) {
      const t = el('text', { x: -22, y: 22, class: 'net-state' }, svg);
      t.textContent = `State: (${prevName}, ${curName})`;
      const t2 = el('text', { x: -22, y: 40, class: 'net-state-sub' }, svg);
      t2.textContent = 'previous chord dashed, current chord solid';
    }

    // Curved edge from chord i to chord j, bowed toward the center; self-moves are small outward loops.
    const edgeD = (i, j) => {
      const p0 = pos[i], p1 = pos[j];
      if (i === j) {
        const a = p0.a, R = p0.r;
        const pt = (ang, rad) => ({ x: p0.x + rad * Math.cos(ang), y: p0.y + rad * Math.sin(ang) });
        const s = pt(a - 0.6, R), e = pt(a + 0.6, R + 1.5), c1 = pt(a - 0.9, R + 22), c2 = pt(a + 0.9, R + 22);
        return `M${s.x.toFixed(1)},${s.y.toFixed(1)} C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      }
      const c = { x: (p0.x + p1.x) / 2 * 0.6 + CX * 0.4, y: (p0.y + p1.y) / 2 * 0.6 + CY * 0.4 };
      const unit = (f, t) => { const dx = t.x - f.x, dy = t.y - f.y, L = Math.hypot(dx, dy) || 1; return { x: dx / L, y: dy / L }; };
      const u0 = unit(p0, c), u1 = unit(p1, c);
      const s = { x: p0.x + u0.x * p0.r, y: p0.y + u0.y * p0.r };
      const e = { x: p1.x + u1.x * (p1.r + 1.5), y: p1.y + u1.y * (p1.r + 1.5) };
      return `M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${e.x.toFixed(1)},${e.y.toFixed(1)}`;
    };

    const gBg = el('g', { class: 'net-bg' }, svg), gCur = el('g', {}, svg), gNodes = el('g', {}, svg), gLab = el('g', {}, svg);
    bg.forEach(({ i, j, p }) => {
      if (i === cc) return;
      el('path', { d: edgeD(i, j), class: 'edge net-faint', 'stroke-width': (0.5 + 1.5 * p).toFixed(2) }, gBg);
    });
    // The current state's row: every move out of it, drawn from the current chord to the
    // next chord (for a pair state (a, b), the next state (b, c) is drawn as b -> c).
    const pNext = {};
    P[cur].forEach((p, j) => {
      if (p <= 0) return;
      const tc = index[curChord(j)];
      pNext[tc] = (pNext[tc] || 0) + p;
      const path = el('path', { d: edgeD(cc, tc), class: 'edge', 'stroke-width': (0.8 + 6 * p).toFixed(2), 'marker-end': 'url(#arr-cur)', style: `stroke:${color(cur)};opacity:${(0.35 + 0.65 * Math.min(1, p * 3)).toFixed(2)}` }, gCur);
      edgePaths[`${cur}-${j}`] = path;
    });
    const labelled = new Set(Object.keys(pNext).map(Number).sort((a, b) => pNext[b] - pNext[a]).slice(0, 6));

    for (let i = 0; i < nC; i++) {
      const isCur = i === cc, isPrev = i === pc && !isCur;
      const g = el('g', { class: 'node' + (isCur ? ' current' : '') }, gNodes);
      el('circle', { cx: pos[i].x.toFixed(1), cy: pos[i].y.toFixed(1), r: pos[i].r.toFixed(1), style: `fill:${qualityColor(chords[i])}` }, g);
      if (isCur) el('circle', { cx: pos[i].x.toFixed(1), cy: pos[i].y.toFixed(1), r: (pos[i].r + 4).toFixed(1), class: 'ring' }, g);
      // Previous chord of a pair state: a dashed ring (inside the solid one if it is also current).
      if (i === pc) el('circle', { cx: pos[i].x.toFixed(1), cy: pos[i].y.toFixed(1), r: (pos[i].r + (isCur ? 8 : 4)).toFixed(1), class: 'ring prev' }, g);
      el('title', {}, g).textContent = `${chords[i]}: ${pos[i].n} moves out in the chorales`;
      // Name the current chord, the previous one, the likeliest next chords, and the common chords.
      // Common major chords sit next to their root's name already, so skip those.
      const major = /^[A-G][#-]?$/.test(chords[i]);
      if (isCur || isPrev || labelled.has(i) || (pos[i].n >= 120 && !major)) {
        // Labels sit on the outer side of the dot: left of it on the left half.
        const left = Math.cos(pos[i].a) < -0.2, gap = pos[i].r + (isCur || isPrev ? 8 : 3);
        const t = el('text', { x: (pos[i].x + (left ? -gap : gap)).toFixed(1), y: (pos[i].y + 4).toFixed(1), 'text-anchor': left ? 'end' : 'start', class: 'net-label' + (isCur ? ' cur' : isPrev ? ' prev' : '') }, gLab);
        // The current and previous chords get a second, smaller line, so long labels
        // near the left and right edges stay inside the frame.
        let line2 = '';
        if (isCur) line2 = showLabels && pNext[cc] ? `stays ${fmt(pNext[cc])}` : '';
        else if (isPrev) line2 = 'previous';
        t.textContent = chords[i] + (!isCur && showLabels && labelled.has(i) ? ` ${fmt(pNext[i])}` : '');
        if (line2) {
          const ts = el('tspan', { x: t.getAttribute('x'), dy: 13, class: 'net-label-sub' }, t);
          ts.textContent = line2;
        }
      }
    }
    el('circle', { id: 'token', r: 7, cx: pos[cc].x, cy: pos[cc].y, class: 'token', style: `fill:${color(cur)};opacity:0` }, svg);
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
      // Sound plays only on Step and Play, never during +1,000 steps.
      if (soundOn()) playChord(curChord(next), Math.min(1.4, stepInterval() / 1000 * 0.95));
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
  const TICK_KEEP = 80;
  const tickW = () => (isBig() ? 45 : 29);   // chip width + gap; chord names need wider chips
  let tickerShown = -1, tickerWalk = -1;
  function tickerChip(s) {
    const c = document.createElement('span');
    c.className = 'chip' + (isBig() ? ' wide' : '');
    c.style.background = color(s);
    c.textContent = isBig() ? curChord(s) : names[s].slice(0, 3);
    c.title = names[s];
    return c;
  }
  // Pairs: the start state's first chord gets its own chip, so the strip reads as the chord sequence.
  function chordChip(nm) {
    const c = document.createElement('span');
    c.className = 'chip wide';
    c.style.background = qualityColor(nm);
    c.textContent = nm; c.title = nm;
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
      row.style.transform = `translateX(${tickW()}px)`;
      void row.offsetWidth;                       // commit the start position before animating
      row.style.transition = `transform ${Math.min(350, stepInterval() * 0.6)}ms ease-out`;
      row.style.transform = 'translateX(0)';
    } else {
      row.innerHTML = '';
      if (pairMode && history.length < 200) row.appendChild(chordChip(stateChords(history[0])[0]));
      history.slice(-TICK_KEEP).forEach((st) => row.appendChild(tickerChip(st)));
      row.style.transition = 'none';
      row.style.transform = 'translateX(0)';
    }
    Array.from(row.children).forEach((c, k, all) => {
      c.classList.toggle('latest', k === all.length - 1);
      c.classList.toggle('prev', pairMode && k === all.length - 2);
    });
    tickerShown = steps; tickerWalk = walkId;
  }

  function renderHistory() {
    $('step-count').textContent = steps.toLocaleString();
    renderTicker();
    const bars = $('share-bars');
    bars.innerHTML = '';
    if (!P) return;
    // Big chains: only the states with the largest long-run share get a bar.
    const BAR_SHOW = 12;
    let idx = names.map((_, i) => i);
    if (isBig()) idx = idx.sort((a, b) => longRun[b] - longRun[a]).slice(0, BAR_SHOW);
    idx.forEach((i) => {
      const nm = names[i];
      const share = steps ? counts[i] / steps : 0;
      const row = document.createElement('div'); row.className = 'mc-bar-row';
      row.innerHTML = `<div class="mc-bar-name"><span class="mc-swatch" style="background:${color(i)}"></span>${esc(nm)}</div>
        <div class="mc-bar-track"><div class="mc-bar-fill" style="width:${(100 * share).toFixed(2)}%;background:${color(i)}"></div>
        <div class="mc-bar-tick" style="left:${(100 * longRun[i]).toFixed(2)}%" title="long run ${fmt(longRun[i], 3)}"></div></div>
        <div class="mc-bar-num">${fmt(share, 3)} <span style="color:var(--ink-mute)">/ ${fmt(longRun[i], 3)}</span></div>`;
      bars.appendChild(row);
    });
    if (isBig()) {
      const more = document.createElement('div'); more.className = 'mc-bar-more';
      more.textContent = `The ${idx.length} chords with the largest long-run share, of ${names.length}.`;
      bars.appendChild(more);
    }
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
    silence();
  }

  // Panel titles and captions that differ between drawn chains and big ones.
  // Panel text for [small chains, Bach order 1, Bach order 2].
  const NET_DESC = 'Each dot is a chord. Its angle is its root on the circle of fifths (C at the top, then G, D, A, ...); its distance from the center is its quality, from major on the outside through dominant seventh, added sixth, sus4, minor, minor seventh, minor sixth and diminished to diminished seventh in the middle. Bigger dots are more common chords. Faint lines are the likelier moves (p ≥ 0.10). Colors mark quality: blue major, cyan minor, red dominant seventh, gray diminished, gold sus4 or added sixth.';
  const TEXTS = [
    ['#viz-chain > .viz-title', 'The chain', 'The chain: 99 chords', 'The chain: pairs of chords (order 2)'],
    ['#viz-chain > .viz-description', null,
      NET_DESC + ' The colored arrows leave the current chord: they are the row the next step is drawn from, and the six likeliest are labeled.',
      'The state is the last two chords: the solid ring is the current chord, the dashed ring the chord before it. The same chord can have different next chords depending on what came before, so the arrows change with both. ' + NET_DESC + ' The colored arrows leave the current chord: they are the row of the current pair, and the six likeliest are labeled.'],
    ['.mc-walk .mc-stat-row > span.mc-unit', null, null, 'newest on the right · the state is the last two chords (outlined)'],
    ['#viz-matrix > .viz-title', 'Transition matrix used', 'Row of the transition matrix for the current chord', 'Row of the transition matrix for the current pair'],
    ['#viz-matrix > .viz-caption', null,
      'Each count divided by the row total, as on the "Where does D7 go?" slide. The row changes every time the walk moves.',
      'Each count divided by the row total for the current pair (previous chord, current chord). The next state is (current chord, next chord).']
  ];
  function setModeText() {
    TEXTS.forEach((t) => {
      const node = document.querySelector(t[0]);
      if (!node) return;
      if (t[1] === null) t[1] = node.textContent;   // remember the original once
      const pick = pairMode ? t[3] : isBig() ? t[2] : t[1];
      node.textContent = pick === null ? t[1] : pick;
    });
    $('play-chords-wrap').hidden = !soundable;
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
    setModeText();
    renderP();
    renderStartSelect();
    resetWalk();
  }

  function loadPreset(id) {
    const pr = PRESETS.find((p) => p.id === id) || PRESETS[0];
    soundable = !!pr.chords;
    pairMode = !!pr.pairs;
    if (pr.chords) {
      // Dense count tables built from the sparse rows in bach.js:
      // 99 x 99 chords for order 1, 747 x 747 pairs for order 2.
      const B = window.MC_BACH;
      const rows = pairMode ? B.pairRows : B.rows;
      names = (pairMode ? B.pairs : B.states).slice();
      raw = names.map((a) => { const r = rows[a] || {}; return names.map((b) => (r[b] ? String(r[b]) : '0')); });
    } else if (pr.table) {
      names = pr.names.slice();
      raw = pr.table.map((r) => r.slice());
    } else {
      names = pr.names.slice();
      const g = makeRng(parseInt($('seed').value, 10) || 1);
      raw = names.map(() => names.map(() => (g() < 0.35 ? '0' : (Math.round(g() * 9) + 1).toString())));
      raw.forEach((r, i) => { if (r.every((v) => v === '0')) r[i] = '1'; });
    }
    $('preset-note').textContent = pr.note;
    cur = pr.start ? Math.max(0, names.indexOf(pr.start)) : 0;
    rebuild(true);
    setLink(pr.id);
  }

  // Deep links: index.html#bach (or #bach2, #cville, ...) opens that example,
  // and the address bar follows the menu so its URL can be copied and shared.
  function setLink(id) {
    // window.history: `history` in this file is the walk's list of visited states.
    try { window.history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search); } catch (e) { /* file:// or sandboxed */ }
  }
  function linkedPreset() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    return PRESETS.some((p) => p.id === id) ? id : null;
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
    soundable = false;
    pairMode = false;
    setLink('');
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
  // Ticking the box is a user gesture, which browsers require before audio
  // can start; play the current chord so the reader hears that sound is on.
  $('play-chords').addEventListener('change', () => {
    if ($('play-chords').checked) playChord(curChord(cur), 1.0); else silence();
  });
  $('speed').addEventListener('input', updateSpeedLabel);

  updateSpeedLabel();
  const first = linkedPreset() || 'class-weather';
  presetSel.value = first;
  loadPreset(first);
  window.addEventListener('hashchange', () => { const id = linkedPreset(); if (id && id !== presetSel.value) { presetSel.value = id; loadPreset(id); } });

  // exposed for testing in the console
  window.MarkovWalk = { get P() { return P; }, get names() { return names; }, get cur() { return cur; }, get pairMode() { return pairMode; }, get longRun() { return longRun; }, get counts() { return counts; }, get steps() { return steps; }, get audioState() { return actx ? actx.state : null; }, step, computeLongRun, parseEntry, chordMidi, loadPreset };
})();

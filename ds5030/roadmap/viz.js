/* ============================================================
 * Roadmap · UU and SDS — concept boxes.
 * Presentation mode, TOC tracking, nav, and the glossary are owned
 * by ../shared/lab-base.js. This file opens each
 * <span class="def" id="def-…"> term's concept box (filled from
 * #concept-data) on hover.
 * ============================================================ */

window.GLOSSARY = {
  // key: { title: '…', body: '…' },
};

// ----- Concept box -----
// Hover (or focus / tap) a term: open its concept box under the paragraph it
// sits in (pushing content down, never overlaying). The box stays open until
// another term is hovered, × is clicked, or Esc.
(function () {
  const main = document.querySelector('main');
  if (!main) return;

  const defs = Array.from(main.querySelectorAll('.def[id]'));
  const byId = new Map(defs.map(d => [d.id, d]));

  const FIELDS = [
    ['definition', 'Definition'],
    ['why', 'Why you\'ll use it'],
    ['where', 'Where you\'ll see it'],
    ['example', 'Example'],
  ];
  const conceptData = new Map();
  document.querySelectorAll('#concept-data .concept[data-for]').forEach(c => {
    conceptData.set(c.getAttribute('data-for'), c);
  });

  const box = document.createElement('div');
  box.className = 'concept-box';
  box.hidden = true;
  box.setAttribute('role', 'region');
  box.setAttribute('aria-live', 'polite');

  function blockFor(node) {
    const b = node.closest('p, li, h2, h3, h4, td, blockquote');
    if (b && b.tagName === 'LI') return b.closest('ul, ol') || b;
    return b || node;
  }
  // A repeat mention can share another term's box: data-concept="def-…".
  const conceptKey = def => def.getAttribute('data-concept') || def.id;
  function termName(def) {
    const c = conceptData.get(conceptKey(def));
    return (c && c.getAttribute('data-title')) || def.textContent.trim();
  }

  let active = null;
  function open(def) {
    if (active === def) return;
    if (active) active.classList.remove('def-active');
    active = def;
    def.classList.add('def-active');

    const c = conceptData.get(conceptKey(def));
    let html = '<button type="button" class="concept-close" aria-label="Close">×</button>' +
      '<div class="concept-title">' + termName(def) + '</div><dl class="concept-fields">';
    FIELDS.forEach(([key, label]) => {
      const f = c && c.querySelector('[data-field="' + key + '"]');
      const body = f && f.innerHTML.trim();
      html += '<dt>' + label + '</dt><dd' + (body ? '' : ' class="concept-empty"') + '>' +
        (body || '') + '</dd>';
    });
    box.innerHTML = html + '</dl>';

    const block = blockFor(def);
    block.parentNode.insertBefore(box, block.nextSibling);
    box.hidden = false;
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([box]).catch(() => {});
  }
  function close() {
    if (active) active.classList.remove('def-active');
    active = null;
    box.hidden = true;
  }

  // A link like <a href="#def-ecdf">ECDF</a> inside a field jumps to that
  // concept and opens its box.
  box.addEventListener('click', e => {
    if (e.target.closest('.concept-close')) { close(); return; }
    const a = e.target.closest('a[href^="#def-"]');
    if (!a) return;
    const tgt = byId.get(a.getAttribute('href').slice(1));
    if (!tgt) return;
    e.preventDefault();
    open(tgt);
    tgt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tgt.focus({ preventScroll: true });
  });
  defs.forEach(def => {
    def.setAttribute('tabindex', '0');
    def.setAttribute('role', 'button');
    def.addEventListener('mouseenter', () => open(def));
    def.addEventListener('focus', () => open(def));
    def.addEventListener('click', () => (active === def ? close() : open(def)));
    def.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active === def ? close() : open(def); }
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !active) return;
    if (e.target.matches && e.target.matches('input, textarea')) return;
    close();
  });
})();

// ----- Roadmap network -----
// One box per <h3 id> under #roadmap; edges from each h3's data-next ids.
// Rows: longest path from a box with no incoming edges (data-row overrides);
// columns from data-col when every box has one. Boxes sharing a data-group
// are drawn inside one frame; data-next="group:NAME" points at that frame.
(function () {
  const host = document.getElementById('viz-roadmap-network');
  const start = document.getElementById('roadmap');
  if (!host || !start) return;
  const NS = 'http://www.w3.org/2000/svg';

  // Collect the h3s between the roadmap h2 and the next h2.
  const heads = [];
  for (let n = start.nextElementSibling; n && n.tagName !== 'H2' && n.id !== 'concept-data'; n = n.nextElementSibling) {
    if (n.tagName === 'H3' && n.id) heads.push(n);
  }
  if (!heads.length) return;

  const nodes = heads.map(h => ({
    id: h.id,
    label: h.getAttribute('data-node-label') || h.textContent.trim(),
    sub: h.getAttribute('data-node-sub'),
    fixedRow: h.hasAttribute('data-row') ? +h.getAttribute('data-row') : null,
    col: h.hasAttribute('data-col') ? +h.getAttribute('data-col') : null,
    next: (h.getAttribute('data-next') || '').split(/\s+/).filter(Boolean),
    group: h.getAttribute('data-group'),
    enter: h.getAttribute('data-enter'),
    regions: (h.getAttribute('data-region') || '').split(/\s+/).filter(Boolean),
    dotted: (h.getAttribute('data-region-dotted') || '').split(/\s+/).filter(Boolean),
    groupLabel: h.getAttribute('data-group-label'),
  }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges = [], groupEdges = [];
  const groupNames = new Set(nodes.map(n => n.group).filter(Boolean));
  nodes.forEach(n => n.next.forEach(t => {
    if (t.startsWith('group:') && groupNames.has(t.slice(6))) groupEdges.push({ src: n, group: t.slice(6) });
    else if (byId.has(t)) edges.push({ src: n, tgt: byId.get(t) });
    else console.warn('roadmap network: data-next on #' + n.id + ' names missing #' + t);
  }));

  // Longest-path rows; capped passes so a cycle can't loop forever.
  nodes.forEach(n => { n.row = n.fixedRow != null ? n.fixedRow : 0; });
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    edges.forEach(({ src, tgt }) => {
      if (tgt.fixedRow == null && tgt.row < src.row + 1) { tgt.row = src.row + 1; changed = true; }
    });
    groupEdges.forEach(({ src, group }) => nodes.forEach(m => {
      if (m.group === group && m.fixedRow == null && m.row < src.row + 1) { m.row = src.row + 1; changed = true; }
    }));
    if (!changed) break;
  }

  // Wrap a label into lines of at most ~22 characters.
  function wrap(text, max) {
    const lines = [''];
    text.split(/\s+/).forEach(w => {
      const cur = lines[lines.length - 1];
      if (cur && (cur + ' ' + w).length > max) lines.push(w);
      else lines[lines.length - 1] = cur ? cur + ' ' + w : w;
    });
    return lines;
  }

  const BOX_W = 180, GAP_X = 28, ROW_GAP = 46, LINE_H = 17, PAD_Y = 12;
  // Frames leave extra room when school regions sit inside them.
  const FRAME_PAD = nodes.some(n => n.regions.length || n.dotted.length) ? 24 : 14;
  const MARGIN = groupNames.size ? 10 + FRAME_PAD : 10;
  // data-node-sub adds a smaller italic second line (e.g. notation) under the label.
  const SUB_H = 16;
  nodes.forEach(n => { n.lines = wrap(n.label, 22); n.h = n.lines.length * LINE_H + (n.sub ? SUB_H : 0) + 2 * PAD_Y; });
  const rows = [];
  nodes.forEach(n => (rows[n.row] = rows[n.row] || []).push(n));  // document order within a row
  // Grid mode (every box has data-col): x comes from the column. Otherwise
  // each row is centred.
  const grid = nodes.every(n => n.col != null);
  const STEP = BOX_W + GAP_X;
  let W;
  if (grid) {
    const maxCol = Math.max(...nodes.map(n => n.col));
    W = 2 * MARGIN + maxCol * STEP + BOX_W;
  } else {
    const maxPerRow = Math.max(...rows.filter(Boolean).map(r => r.length));
    W = Math.max(600, maxPerRow * BOX_W + (maxPerRow - 1) * GAP_X + 2 * MARGIN);
  }

  let y = MARGIN;
  rows.forEach(r => {
    if (!r) return;
    const rowH = Math.max(...r.map(n => n.h));
    const total = r.length * BOX_W + (r.length - 1) * GAP_X;
    r.forEach((n, i) => {
      n.x = grid ? MARGIN + n.col * STEP : (W - total) / 2 + i * STEP;
      n.y = y + (rowH - n.h) / 2;
    });
    y += rowH + ROW_GAP;
  });
  const H = y - ROW_GAP + MARGIN;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'roadmap-net');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.maxWidth = Math.round(W * 1.1) + 'px';  // don't blow a narrow diagram up
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Roadmap network of course sections');
  svg.innerHTML =
    '<defs><marker id="net-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
    '<path d="M0,0 L10,5 L0,10 z" class="net-head"/></marker></defs>';

  const cx = n => n.x + BOX_W / 2;

  // An edge between two boxes in the same column with boxes in between
  // loops out on the left: it leaves the source's left side and comes back
  // into the target's left side, so it never runs behind the boxes between.
  const BRACKET = 36;
  const isBracket = o => Math.abs(cx(o.src) - cx(o.tgt)) < 20 && Math.abs(o.tgt.row - o.src.row) > 1 &&
    nodes.some(m => Math.abs(cx(m) - cx(o.src)) < 20 && m.row > Math.min(o.src.row, o.tgt.row) &&
      m.row < Math.max(o.src.row, o.tgt.row));
  // The loop goes out on the right instead when the target takes its other
  // arrows on its left side (data-enter="left"), to keep clear of them.
  const loopsRight = o => o.tgt.enter === 'left';
  const bracketLeft = n => Math.min(n.x, ...edges.filter(o => isBracket(o) && !loopsRight(o) && (o.src === n || o.tgt === n))
    .map(o => Math.min(o.src.x, o.tgt.x) - 0.75 * BRACKET - 4));
  const bracketRight = n => Math.max(n.x + BOX_W, ...edges.filter(o => isBracket(o) && loopsRight(o) && (o.src === n || o.tgt === n))
    .map(o => Math.max(o.src.x, o.tgt.x) + BOX_W + 0.75 * BRACKET + 4));

  // Group frames: a padded rectangle around every box in the group.
  const frames = new Map();
  const frameLayer = document.createElementNS(NS, 'g');
  svg.appendChild(frameLayer);
  groupNames.forEach(name => {
    const ms = nodes.filter(n => n.group === name);
    const f = {
      x: Math.min(...ms.map(n => bracketLeft(n))) - FRAME_PAD,
      y: Math.min(...ms.map(n => n.y)) - FRAME_PAD,
      r: Math.max(...ms.map(n => bracketRight(n))) + FRAME_PAD,
      b: Math.max(...ms.map(n => n.y + n.h)) + FRAME_PAD,
    };
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('class', 'net-frame');
    rect.setAttribute('x', f.x); rect.setAttribute('y', f.y);
    rect.setAttribute('width', f.r - f.x); rect.setAttribute('height', f.b - f.y);
    rect.setAttribute('rx', 10);
    frameLayer.appendChild(rect);
    const label = (ms.find(n => n.groupLabel) || {}).groupLabel;
    if (label) {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('class', 'net-frame-label');
      t.setAttribute('x', f.x + 10); t.setAttribute('y', f.y + 16);
      t.textContent = label;
      frameLayer.appendChild(t);
    }
    f.el = rect;
    frames.set(name, f);
  });

  // School regions (data-region on a box): a rounded blob hugging its boxes
  // where they sit. Each box gets a padded rounded rectangle; two boxes are
  // bridged by the rectangle spanning both whenever that span covers no box
  // outside the region, so neighbours merge into one shape. The outline is
  // drawn by stroking every piece, then filling every piece on top, which
  // hides the inner seams. data-region-dotted gives a dotted outline only.
  // Listed outermost first, so a nested region draws on top.
  const REGIONS = [
    { key: 'frequentist', label: 'Frequentist', fill: '#e6eefa', stroke: '#8fb3dd', pad: 12 },
    { key: 'fisherian', label: 'Fisherian (part of frequentist)', fill: '#dcece2', stroke: '#86b59a', pad: 6 },
    { key: 'bayesian', label: 'Bayesian', fill: '#fde7db', stroke: '#e2a07f', pad: 12 },
  ];
  const regionLayer = document.createElementNS(NS, 'g');
  svg.appendChild(regionLayer);
  const padded = (n, p) => ({ x: n.x - p, y: n.y - p, r: n.x + BOX_W + p, b: n.y + n.h + p });
  const hull = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) });
  const overlaps = (q, n) => q.x < n.x + BOX_W + 4 && q.r > n.x - 4 && q.y < n.y + n.h + 4 && q.b > n.y - 4;
  function rectEl(q, cls, attrs) {
    const el = document.createElementNS(NS, 'rect');
    el.setAttribute('x', q.x); el.setAttribute('y', q.y);
    el.setAttribute('width', q.r - q.x); el.setAttribute('height', q.b - q.y);
    el.setAttribute('rx', 10);
    el.setAttribute('class', cls);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }
  const legend = [];
  REGIONS.forEach(R => {
    const ms = nodes.filter(n => n.regions.includes(R.key));
    const dotted = nodes.filter(n => n.dotted.includes(R.key));
    if (!ms.length && !dotted.length) return;
    const pieces = ms.map(n => padded(n, R.pad));
    ms.forEach((a, i) => ms.slice(i + 1).forEach(b => {
      const q = hull(padded(a, R.pad), padded(b, R.pad));
      if (!nodes.some(n => !ms.includes(n) && overlaps(q, n))) pieces.push(q);
    }));
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'net-region');
    pieces.forEach(q => g.appendChild(rectEl(q, 'net-region-edge', { fill: R.stroke, stroke: R.stroke, 'stroke-width': 3 })));
    pieces.forEach(q => g.appendChild(rectEl(q, 'net-region-fill', { fill: R.fill })));
    dotted.forEach(n => g.appendChild(rectEl(padded(n, R.pad - 4), 'net-region-dotted',
      { fill: 'none', stroke: R.stroke, 'stroke-width': 1.75, 'stroke-dasharray': '5 4' })));
    regionLayer.appendChild(g);
    if (ms.length) legend.push({ label: R.label, fill: R.fill, stroke: R.stroke });
    if (dotted.length) legend.push({ label: 'Used in ' + R.label + ' computing', stroke: R.stroke, dotted: true });
  });

  const minX = Math.min(0, ...[...frames.values()].map(f => f.x - 4));
  const maxX = Math.max(W, ...[...frames.values()].map(f => f.r + 4));
  svg.setAttribute('viewBox', minX + ' 0 ' + (maxX - minX) + ' ' + H);
  svg.style.maxWidth = Math.round((maxX - minX) * 1.1) + 'px';

  // Ports: several edges on the same side of a box are spread across it,
  // ordered by where the other end sits, so edges meeting at a box don't
  // cross. Ties (two targets in one column) put the nearer row outermost.
  function port(n, list, e) {
    const k = list.indexOf(e), m = list.length;
    return n.x + BOX_W * (k + 1) / (m + 1);
  }
  function byOther(n, end) {
    return (p, q) => {
      const a = p[end], b = q[end];
      if (cx(a) !== cx(b)) return cx(a) - cx(b);
      const left = cx(a) < cx(n);
      return left ? a.row - b.row : b.row - a.row;
    };
  }

  // Each edge is one cubic curve. It leaves its box straight down and arrives
  // angled along its own direction, so the arrowhead follows the line. Among
  // a few control-point choices, the gentlest one that clears every other
  // box is used.
  function cubicAt(p, t) {
    const u = 1 - t;
    return [
      u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6],
      u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7],
    ];
  }
  function hitsBox(p, skip) {
    for (let i = 1; i < 48; i++) {
      const [x, y] = cubicAt(p, i / 48);
      if (nodes.some(o => !skip.includes(o) &&
          x > o.x - 6 && x < o.x + BOX_W + 6 && y > o.y - 6 && y < o.y + o.h + 6)) return true;
    }
    return false;
  }
  function curve(x1, y1, x2, y2, skip) {
    const dx = x2 - x1, dy = y2 - y1;
    const tries = [];
    // Start handle: how far down the curve keeps heading before it turns.
    // End handle: pulled back toward the source by a fraction of dx (that
    // angles the arrival) and up by a fraction of dy, or a short fixed rise.
    [0.5, 0.75, 0.9].forEach(f1 => [0.25, 0.45, 0.65, 0.85, 1.05].forEach(g =>
      [0.5, 0.3, 46 / Math.abs(dy || 1), 30 / Math.abs(dy || 1)].forEach(h =>
        tries.push([x1, y1, x1, y1 + f1 * dy, x2 - g * dx, y2 - h * dy, x2, y2]))));
    return tries.find(p => !hitsBox(p, skip)) || tries[0];
  }

  const edgeLayer = document.createElementNS(NS, 'g');
  svg.appendChild(edgeLayer);
  // Arrows into a frame drop straight from the box's bottom to the frame's top edge.
  groupEdges.forEach(e => {
    const f = frames.get(e.group);
    const x = cx(e.src), y1 = e.src.y + e.src.h;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M' + x + ',' + y1 + ' L' + x + ',' + (f.y - 2));
    path.setAttribute('class', 'net-edge');
    path.setAttribute('marker-end', 'url(#net-head)');
    edgeLayer.appendChild(path);
    e.el = path;
  });
  // Boxes with data-enter="left" take their incoming arrows on the left
  // side, spread top to bottom. A source sitting above and straddling the
  // spot 26px left of the box sends a "trunk": one vertical line with a
  // rounded turn into the box (several children share the trunk, like a
  // file tree). A source in the same row runs straight across. Any other
  // source gets one smooth curve that arrives level; if leaving from the
  // source's bottom would cut through a box, it leaves from the source's
  // right side instead. A source straight above still drops into the top.
  // Mirror image: a source above and to the right whose box straddles the
  // spot 26px right of the target runs its trunk down the right side.
  const rTrunkX = n => n.x + BOX_W + 26;
  const isRight = o => o.tgt.enter === 'left' && o.src.row < o.tgt.row && cx(o.src) > cx(o.tgt) + 20 &&
    rTrunkX(o.tgt) > o.src.x + 8 && rTrunkX(o.tgt) < o.src.x + BOX_W - 8;
  const rightIns = n => edges.filter(o => o.tgt === n && isRight(o)).sort((p, q) => p.src.y - q.src.y);
  const isLeft = o => o.tgt.enter === 'left' && !isRight(o) && Math.abs(cx(o.src) - cx(o.tgt)) > 20 &&
    (o.src.row !== o.tgt.row || cx(o.src) < cx(o.tgt));
  const leftIns = n => edges.filter(o => o.tgt === n && isLeft(o))
    .sort((p, q) => (p.src.y - q.src.y) || (cx(p.src) - cx(q.src)));
  // Edges that don't use a bottom port (trunks, side exits) are left out
  // when a box's bottom ports are shared out.
  const bottomOuts = (n, more) => edges.filter(o => o.src === n && !isBracket(o) && !isRight(o) && !o.side && !o.trunk && more(o))
    .sort(byOther(n, 'tgt'));
  const pathOf = p => 'M' + p[0] + ',' + p[1] + ' C' + p[2] + ',' + p[3] + ' ' + p[4] + ',' + p[5] + ' ' + p[6] + ',' + p[7];

  const trunkX = n => n.x - 26;
  const straddles = (src, tgt) => src.row < tgt.row && trunkX(tgt) > src.x + 8 && trunkX(tgt) < src.x + BOX_W - 8;
  const slotY = e => {
    const list = leftIns(e.tgt);
    return e.tgt.y + e.tgt.h * (list.indexOf(e) + 1) / (list.length + 1);
  };
  // Points along every trunk into box n, so side curves can keep clear of them.
  function trunkPoints(n) {
    const pts = [];
    leftIns(n).filter(o => straddles(o.src, n)).forEach(o => {
      const x = trunkX(n), y0 = o.src.y + o.src.h, y1 = slotY(o);
      for (let y = y0; y <= y1; y += 4) pts.push([x, y]);
      for (let x2 = x; x2 <= n.x; x2 += 4) pts.push([x2, y1]);
    });
    return pts;
  }
  const samples = p => Array.from({ length: 41 }, (_, i) => cubicAt(p, i / 40));
  const placed = new Map();   // target -> sampled points of side curves already routed into it

  function leftEntry(e) {
    if (e.d) return e.d;
    const { src, tgt } = e;
    const ye = slotY(e);
    const xe = tgt.x - 2, trunk = trunkX(tgt);
    if (src.row === tgt.row) {
      e.side = true;
      return (e.d = 'M' + (src.x + BOX_W) + ',' + (src.y + src.h / 2) + ' L' + xe + ',' + ye);
    }
    if (straddles(src, tgt)) {
      e.trunk = true;
      const r = 10, y1 = src.y + src.h;
      return (e.d = 'M' + trunk + ',' + y1 + ' L' + trunk + ',' + (ye - r) +
             ' Q' + trunk + ',' + ye + ' ' + (trunk + r) + ',' + ye + ' L' + xe + ',' + ye);
    }
    // Side exit: one S-curve from the source's right side to the slot. Its
    // turning point X is searched across the gap; the winner clears every
    // box and stays farthest from the trunks and the side curves already
    // routed into this target (ignoring the last stretch, where all arrows
    // into the box must meet).
    const sx = src.x + BOX_W, sy = src.y + src.h / 2;
    const avoid = trunkPoints(tgt).concat(placed.get(tgt) || []);
    let best = null, bestScore = -1;
    for (let X = sx + 12; X <= xe - 6; X += 3) {
      const p = [sx, sy, X, sy, X, ye, xe, ye];
      if (hitsBox(p, [src, tgt])) continue;
      const pts = samples(p).filter(([x]) => x < tgt.x - 14);
      let near = Infinity;
      pts.forEach(([x, y]) => avoid.forEach(([ax, ay]) => { near = Math.min(near, Math.hypot(x - ax, y - ay)); }));
      const score = Math.min(near, 40);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (src.row > tgt.row || best) {
      e.side = true;
      const p = best || [sx, sy, (sx + xe) / 2, sy, (sx + xe) / 2, ye, xe, ye];
      placed.set(tgt, (placed.get(tgt) || []).concat(samples(p)));
      return (e.d = pathOf(p));
    }
    // No clear side route: fall back to a curve from the bottom port.
    const x1 = port(src, bottomOuts(src, o => o.tgt.row > src.row), e), y1 = src.y + src.h;
    return (e.d = pathOf([x1, y1, x1, (y1 + ye) / 2, xe - 40, ye, xe, ye]));
  }
  // Ordinary top-entry edges: if every bottom-port curve would cut through
  // a box, leave from the source's side (the side facing the target) and
  // arc over into the target's top instead.
  const isPlainDown = o => !isBracket(o) && !isRight(o) && !isLeft(o) && o.tgt.row > o.src.row;
  const topIns = n => n.topOrder ? n.topOrder.slice() :
    edges.filter(o => o.tgt === n && !isLeft(o) && !isRight(o) && !isBracket(o) && o.src.row < n.row)
      .sort(byOther(n, 'src'));
  // Side-exit arcs: many shapes, from a high sweep to a dip into the row gap.
  function sideCandidates(e) {
    const { src, tgt } = e;
    const right = cx(tgt) > cx(src);
    const sx = right ? src.x + BOX_W : src.x, sy = src.y + src.h / 2;
    const x2 = port(tgt, topIns(tgt), e), y2 = tgt.y - 2, dx = x2 - sx, dy = y2 - sy;
    const out = [];
    [1, 0.8, 0.6, 0.4, 0.25].forEach(k => [0, 0.2, 0.35, 0.5].forEach(j => [0.5, 0.7, 0.3].forEach(f =>
      out.push([sx, sy, sx + k * dx, sy + j * dy, x2, y2 - f * dy, x2, y2]))));
    return out.filter(q => !hitsBox(q, [src, tgt]));
  }
  function sideTop(e) {
    return e.sideChoice || sideCandidates(e)[0];
  }
  function plainPath(e) {
    const { src, tgt } = e;
    if (e.side) return sideTop(e);
    const x1 = port(src, bottomOuts(src, o => o.tgt.row > src.row), e);
    return curve(x1, src.y + src.h, port(tgt, topIns(tgt), e), tgt.y - 2, [src, tgt]);
  }
  edges.filter(isPlainDown).forEach(e => {
    if (hitsBox(plainPath(e), [e.src, e.tgt]) && sideCandidates(e).length) e.side = true;
  });
  // Where several arrows land on one box's top, try every left-to-right
  // order of their landing slots and keep the one with the fewest crossings.
  function permutations(a) {
    if (a.length < 2) return [a];
    return a.flatMap((x, i) => permutations(a.slice(0, i).concat(a.slice(i + 1))).map(r => [x].concat(r)));
  }
  // Two sampled curves "touch" if any of their segments cross, or if they
  // pass within 8px of each other (closer than that reads as overlapping).
  function segsCross(a, b, c, d) {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  }
  function touches(P, Q) {
    for (let i = 1; i < P.length; i++) for (let j = 1; j < Q.length; j++) {
      if (segsCross(P[i - 1], P[i], Q[j - 1], Q[j])) return true;
      if (Math.hypot(P[i][0] - Q[j][0], P[i][1] - Q[j][1]) < 8) return true;
    }
    return false;
  }
  const trim = p => samples(p).slice(2, -2);
  // For one slot order: fixed-shape arrows first, then each side arc picks
  // the shape that crosses the fewest of the arrows already placed.
  function scoreOrder(order) {
    const placedPts = order.filter(o => !o.side).map(o => trim(plainPath(o)));
    let c = 0;
    for (let i = 0; i < placedPts.length; i++) for (let j = i + 1; j < placedPts.length; j++)
      if (touches(placedPts[i], placedPts[j])) c++;
    const choices = new Map();
    order.filter(o => o.side).forEach(o => {
      let best = null, bestC = Infinity;
      sideCandidates(o).forEach(q => {
        const pts = trim(q);
        const k = placedPts.filter(P => touches(P, pts)).length;
        if (k < bestC) { bestC = k; best = q; }
      });
      if (best) { choices.set(o, best); placedPts.push(trim(best)); c += bestC; }
    });
    return { c, choices };
  }
  nodes.forEach(n => {
    const list = topIns(n).filter(isPlainDown);
    if (list.length < 2 || list.length > 5) return;
    let best = null;
    permutations(list).forEach(order => {
      n.topOrder = order;
      list.forEach(o => { o.sideChoice = null; });
      const r = scoreOrder(order);
      if (!best || r.c < best.c) best = { order, ...r };
    });
    n.topOrder = best.order;
    best.choices.forEach((q, o) => { o.sideChoice = q; });
  });

  // Decide every left-entry route once (marking trunks and side exits),
  // so the bottom ports below are shared only among edges that use them.
  edges.filter(isLeft).forEach(leftEntry);

  edges.forEach(e => {
    const { src, tgt } = e;
    let d;
    if (isBracket(e)) {
      const ys = src.y + src.h / 2, yt = tgt.y + tgt.h / 2;
      if (loopsRight(e)) {
        const sx = src.x + BOX_W, tx = tgt.x + BOX_W;
        d = 'M' + sx + ',' + ys + ' C' + (sx + BRACKET) + ',' + ys + ' ' +
            (tx + BRACKET) + ',' + yt + ' ' + (tx + 2) + ',' + yt;
      } else {
        d = 'M' + src.x + ',' + ys + ' C' + (src.x - BRACKET) + ',' + ys + ' ' +
            (tgt.x - BRACKET) + ',' + yt + ' ' + (tgt.x - 2) + ',' + yt;
      }
    } else if (isRight(e)) {
      const list = rightIns(tgt), r = 10, x = rTrunkX(tgt), y1 = src.y + src.h;
      const ye = tgt.y + tgt.h * (list.indexOf(e) + 1) / (list.length + 1);
      d = 'M' + x + ',' + y1 + ' L' + x + ',' + (ye - r) + ' Q' + x + ',' + ye + ' ' + (x - r) + ',' + ye +
          ' L' + (tgt.x + BOX_W + 2) + ',' + ye;
    } else if (isLeft(e)) {
      d = leftEntry(e);
    } else if (tgt.row === src.row) {
      const left = tgt.x > src.x;
      const x1 = left ? src.x + BOX_W : src.x, x2 = left ? tgt.x : tgt.x + BOX_W;
      const y1 = src.y + src.h / 2, y2 = tgt.y + tgt.h / 2;
      d = 'M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2;
    } else if (isPlainDown(e)) {
      d = pathOf(plainPath(e));
    } else {
      const down = tgt.row > src.row;
      const outs = bottomOuts(src, o => o.tgt.row !== src.row && (o.tgt.row > src.row) === down);
      const ins = edges.filter(o => o.tgt === tgt && !isLeft(o) && !isRight(o) && !isBracket(o) && o.src.row !== tgt.row && (o.src.row < tgt.row) === down)
        .sort(byOther(tgt, 'src'));
      const x1 = port(src, outs, e), x2 = port(tgt, ins, e);
      const y1 = down ? src.y + src.h : src.y, y2 = down ? tgt.y - 2 : tgt.y + tgt.h + 2;
      d = pathOf(curve(x1, y1, x2, y2, [src, tgt]));
    }
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'net-edge');
    path.setAttribute('marker-end', 'url(#net-head)');
    edgeLayer.appendChild(path);
    e.el = path;
  });

  const accentQueue = [];
  nodes.forEach(n => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'net-node');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'link');
    g.setAttribute('aria-label', 'Jump to ' + n.label);
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', n.x); rect.setAttribute('y', n.y);
    rect.setAttribute('width', BOX_W); rect.setAttribute('height', n.h);
    rect.setAttribute('rx', 6);
    g.appendChild(rect);
    n.lines.forEach((line, i) => {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', n.x + BOX_W / 2);
      t.setAttribute('y', n.y + PAD_Y + LINE_H * (i + 0.75));
      t.setAttribute('text-anchor', 'middle');
      t.textContent = line;
      g.appendChild(t);
    });
    if (n.sub) {
      // Combining bars/hats (x̄, θ̂) sit off-centre in italic fonts, so they
      // are stripped from the text and drawn as strokes over their letter
      // once the text has been laid out (see placeAccents below).
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('class', 'net-node-sub');
      t.setAttribute('x', n.x + BOX_W / 2);
      t.setAttribute('y', n.y + PAD_Y + LINE_H * n.lines.length + SUB_H * 0.75);
      t.setAttribute('text-anchor', 'middle');
      // Subscripts: x_{t+1} or x_t (one character) become a smaller,
      // lowered run in the same font (Unicode subscript glyphs like ₜ are
      // missing from most fonts and fall back to a mismatched one).
      const src = [...n.sub], runs = [];
      let plainLen = 0, plain = [];
      const accents = [];
      const push = (ch, sub) => {
        if (ch === '\u0304' || ch === '\u0302') { accents.push({ i: plainLen - 1, kind: ch === '\u0304' ? 'bar' : 'hat' }); return; }
        const last = runs[runs.length - 1];
        if (last && last.sub === sub) last.text += ch; else runs.push({ text: ch, sub });
        plain.push(ch); plainLen++;
      };
      for (let k = 0; k < src.length; k++) {
        if (src[k] === '_' && src[k + 1] === '{') {
          const end = src.indexOf('}', k + 2);
          src.slice(k + 2, end < 0 ? src.length : end).forEach(ch => push(ch, true));
          k = end < 0 ? src.length : end;
        } else if (src[k] === '_' && k + 1 < src.length) {
          push(src[++k], true);
        } else push(src[k], false);
      }
      let shifted = false;
      runs.forEach(r => {
        const ts = document.createElementNS(NS, 'tspan');
        if (r.sub !== shifted) { ts.setAttribute('dy', r.sub ? '0.3em' : '-0.3em'); shifted = r.sub; }
        if (r.sub) ts.setAttribute('font-size', '75%');
        ts.textContent = r.text;
        t.appendChild(ts);
      });
      g.appendChild(t);
      if (accents.length) accentQueue.push({ g, t, accents, chars: plain });
    }
    function light(on) {
      g.classList.toggle('lit', on);
      edges.forEach(e => { if (e.src === n || e.tgt === n) e.el.classList.toggle('lit', on); });
      groupEdges.forEach(e => {
        if (e.src !== n) return;
        e.el.classList.toggle('lit', on);
        frames.get(e.group).el.classList.toggle('lit', on);
      });
    }
    function go() { document.getElementById(n.id).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    g.addEventListener('mouseenter', () => light(true));
    g.addEventListener('mouseleave', () => light(false));
    g.addEventListener('focus', () => light(true));
    g.addEventListener('blur', () => light(false));
    g.addEventListener('click', go);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    svg.appendChild(g);
  });

  host.insertBefore(svg, host.firstChild);
  // Short letters (x, a, …) get their mark just above x-height; tall ones
  // (θ, F) above cap height. Marks shift right a little to follow the slant.
  (function placeAccents() {
    const SHORT = new Set('acemnorsuvwxz');
    accentQueue.forEach(({ g, t, accents, chars }) => {
      const fs = parseFloat(getComputedStyle(t).fontSize) || 13;
      accents.forEach(({ i, kind }) => {
        if (i < 0) return;
        let x0, x1, base;
        try {
          x0 = t.getStartPositionOfChar(i).x; x1 = t.getEndPositionOfChar(i).x;
          base = t.getStartPositionOfChar(i).y;
        } catch (err) { return; }
        const lift = SHORT.has(chars[i]) ? 0.62 * fs : 0.88 * fs;
        const y = base - lift, slant = 0.2 * lift, w = x1 - x0;
        const mid = (x0 + x1) / 2 + slant;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('class', 'net-accent');
        path.setAttribute('d', kind === 'bar'
          ? 'M' + (mid - w * 0.38) + ',' + y + ' L' + (mid + w * 0.38) + ',' + y
          : 'M' + (mid - w * 0.32) + ',' + (y + 1.2) + ' L' + mid + ',' + (y - 1.8) + ' L' + (mid + w * 0.32) + ',' + (y + 1.2));
        g.appendChild(path);
      });
    });
  })();
  if (legend.length) {
    const lg = document.createElement('div');
    lg.className = 'net-legend';
    lg.innerHTML = legend.map(l => '<span class="net-legend-item"><span class="net-legend-swatch" style="' +
      (l.dotted ? 'border: 1.75px dashed ' + l.stroke + ';' : 'background:' + l.fill + '; border: 1.5px solid ' + l.stroke + ';') +
      '"></span>' + l.label + '</span>').join('');
    svg.after(lg);
  }
})();

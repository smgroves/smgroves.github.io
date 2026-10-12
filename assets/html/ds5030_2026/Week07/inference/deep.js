/* Shared helpers for the expanded inference pages. Plain JS, no libraries.
   UU.* : random numbers, distributions, summaries, and a tiny SVG plotting kit. */
(function () {
  const UU = {};

  // ---------- data
  // 92 Charlottesville craigslist used-car prices, in $1000s (course dataset cville_cars.csv)
  UU.CARS = [1.2,17.5,9.5,1,6.25,4.7,2.8,3.5,4.5,1.5,12.5,4.7,4,3.5,1.5,5.5,7,30.75,3.3,2.5,3.5,15,6,5.8,2,3.5,1.5,15,8.7,11.5,12,6.2,2,5.5,1,4,1.35,26,4.95,2.25,3.5,6.5,25,10,3,7.25,8.3,6.5,6,2.899,20,2.8,9.5,3.5,3.9,11.665,3,3.6,31.95,11,8.5,3.5,8.9,2.1,3.25,23.5,10,28.5,5,7.5,38,4.5,18.5,18.5,13,1,10,3,2.5,10.5,16.9,2,7.999,35,18.995,5.3,10.495,7.5,1.8,12.5,4.95,1.25];
  UU.BOARD = [2, 4, 5, 6, 8];

  // ---------- random numbers (seeded, so results are reproducible)
  UU.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  UU.randn = function (r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  UU.pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  UU.resample = (arr, r) => arr.map(() => arr[Math.floor(r() * arr.length)]);

  // ---------- summaries
  UU.mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  UU.variance = (a, ddof = 1) => { const m = UU.mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - ddof); };
  UU.sd = (a, ddof = 1) => Math.sqrt(UU.variance(a, ddof));
  UU.median = a => { const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
  UU.quantile = (a, p) => { const b = [...a].sort((x, y) => x - y); const h = (b.length - 1) * p, lo = Math.floor(h); return b[lo] + (h - lo) * ((b[Math.min(lo + 1, b.length - 1)]) - b[lo]); };
  UU.fmt = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "—");

  // ---------- distributions
  UU.normPdf = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  UU.normCdf = function (x) { // Abramowitz-Stegun 7.1.26 via erf, |error| < 1.5e-7
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  };
  UU.normInv = function (p) { // Acklam's rational approximation
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  UU.lgamma = function (z) { // Lanczos
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - UU.lgamma(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  };
  UU.tPdf = (x, k) => Math.exp(UU.lgamma((k + 1) / 2) - UU.lgamma(k / 2) - 0.5 * Math.log(k * Math.PI) - (k + 1) / 2 * Math.log(1 + x * x / k));
  function betacf(a, b, x) { // continued fraction for the incomplete beta (Numerical Recipes)
    const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  UU.ibeta = function (x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(UU.lgamma(a + b) - UU.lgamma(a) - UU.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  UU.tCdf = function (t, k) { const x = k / (k + t * t); const tail = 0.5 * UU.ibeta(x, k / 2, 0.5); return t >= 0 ? 1 - tail : tail; };
  UU.tInv = function (p, k) { let lo = -60, hi = 60; for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (UU.tCdf(mid, k) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; };

  // ---------- SVG plotting kit
  const NS = "http://www.w3.org/2000/svg";
  UU.el = function (tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  UU.lin = (d0, d1, r0, r1) => { const f = x => r0 + (x - d0) / (d1 - d0) * (r1 - r0); f.inv = y => d0 + (y - r0) / (r1 - r0) * (d1 - d0); return f; };
  UU.ticks = function (lo, hi, n = 5) {
    const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || step0;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out;
  };
  // Create a plot frame; returns {svg, g, x, y, W, H}
  UU.frame = function (svg, opts) {
    const W = opts.W || 640, H = opts.H || 260, m = Object.assign({ l: 46, r: 14, t: 14, b: 34 }, opts.m || {});
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.classList.add("plot");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const x = UU.lin(opts.x[0], opts.x[1], m.l, W - m.r), y = UU.lin(opts.y[0], opts.y[1], H - m.b, m.t);
    const g = UU.el("g", {}, svg);
    if (opts.grid !== false) for (const v of UU.ticks(opts.y[0], opts.y[1], opts.yn || 4)) UU.el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "grid" }, g);
    UU.el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "axis" }, g);
    for (const v of (opts.xt || UU.ticks(opts.x[0], opts.x[1], opts.xn || 6))) {
      UU.el("line", { x1: x(v), x2: x(v), y1: H - m.b, y2: H - m.b + 4, class: "axis" }, g);
      UU.el("text", { x: x(v), y: H - m.b + 16, "text-anchor": "middle" }, g).textContent = opts.xfmt ? opts.xfmt(v) : v;
    }
    if (opts.yaxis !== false) for (const v of UU.ticks(opts.y[0], opts.y[1], opts.yn || 4)) UU.el("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, g).textContent = opts.yfmt ? opts.yfmt(v) : v;
    if (opts.xlabel) UU.el("text", { x: (m.l + W - m.r) / 2, y: H - 3, "text-anchor": "middle" }, g).textContent = opts.xlabel;
    if (opts.ylabel) { const t = UU.el("text", { x: 12, y: (m.t + H - m.b) / 2, "text-anchor": "middle", transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})` }, g); t.textContent = opts.ylabel; }
    return { svg, g, x, y, W, H, m };
  };
  UU.path = function (f, pts, attrs) { const d = pts.map((p, i) => (i ? "L" : "M") + f.x(p[0]).toFixed(1) + "," + f.y(p[1]).toFixed(1)).join(""); return UU.el("path", Object.assign({ d, fill: "none" }, attrs), f.g); };
  // Histogram as density; returns max density
  UU.hist = function (vals, lo, hi, nb) {
    const w = (hi - lo) / nb, c = new Array(nb).fill(0);
    for (const v of vals) { const i = Math.floor((v - lo) / w); if (i >= 0 && i < nb) c[i]++; }
    return c.map((k, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, d: k / (vals.length * w), k }));
  };
  UU.bars = function (f, bins, attrs) { for (const b of bins) if (b.k > 0) UU.el("rect", Object.assign({ x: f.x(b.x0) + 0.5, y: f.y(b.d), width: Math.max(0.5, f.x(b.x1) - f.x(b.x0) - 1), height: f.y(0) - f.y(b.d) }, attrs), f.g); };
  UU.vline = (f, v, attrs) => UU.el("line", Object.assign({ x1: f.x(v), x2: f.x(v), y1: f.m.t, y2: f.H - f.m.b }, attrs), f.g);
  UU.text = (f, x, y, s, attrs) => { const t = UU.el("text", Object.assign({ x: f.x(x), y: f.y(y) }, attrs), f.g); t.textContent = s; return t; };

  // ---------- slider binding: <input type=range id=..> + <output for=..>
  UU.bind = function (ids, fn) {
    const go = () => { ids.forEach(id => { const o = document.querySelector(`output[for="${id}"]`); const el = document.getElementById(id); if (o && el) o.textContent = UU.fmts[id] ? UU.fmts[id](+el.value) : (el.dataset.dec ? (+el.value).toFixed(+el.dataset.dec) : el.value); }); fn(); };
    ids.forEach(id => document.getElementById(id).addEventListener("input", go));
    go();
  };
  UU.fmts = {};
  UU.val = id => +document.getElementById(id).value;
  UU.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  window.UU = UU;
})();

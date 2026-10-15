// A tiny stand-in for the pptxgenjs slide API, so the deck's own plot code (scenarios.js)
// can draw into an SVG. Coordinates are slide inches; font sizes and line widths are points.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const shapes = { LINE: "line", OVAL: "oval", RECTANGLE: "rect", ROUNDED_RECTANGLE: "rect", DIAMOND: "diamond", CUSTOM_GEOMETRY: "custom" };
  // 1 slide inch = U user units; HTML text inside foreignObject won't render at sub-pixel font sizes
  const U = 100, u = v => v * U;
  const pt = v => (v / 72) * U;
  const hex = c => (c ? "#" + c : "none");
  const op = t => (t == null ? 1 : 1 - t / 100);

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }

  function paint(e, o) {
    const fill = o.fill && o.fill.type !== "none" ? o.fill : null;
    e.setAttribute("fill", fill ? hex(fill.color) : "none");
    if (fill) e.setAttribute("fill-opacity", op(fill.transparency));
    const ln = o.line && o.line.type !== "none" ? o.line : null;
    if (ln) {
      e.setAttribute("stroke", hex(ln.color));
      e.setAttribute("stroke-width", pt(ln.width ?? 1));
      e.setAttribute("stroke-opacity", op(ln.transparency));
      if (ln.dashType === "dash") e.setAttribute("stroke-dasharray", `${pt(4)} ${pt(3)}`);
    } else e.setAttribute("stroke", "none");
    return e;
  }

  function Slide(svg) {
    this.svg = svg;
    this.blocks = null;
  }

  Slide.prototype.addShape = function (type, o) {
    let e;
    if (type === "line") {
      const [y1, y2] = o.flipV ? [o.y + o.h, o.y] : [o.y, o.y + o.h];
      e = paint(el("line", { x1: u(o.x), y1: u(y1), x2: u(o.x + o.w), y2: u(y2), "stroke-linecap": "butt" }), { ...o, fill: null });
    } else if (type === "oval") {
      e = paint(el("ellipse", { cx: u(o.x + o.w / 2), cy: u(o.y + o.h / 2), rx: u(o.w / 2), ry: u(o.h / 2) }), o);
    } else if (type === "rect") {
      e = paint(el("rect", { x: u(o.x), y: u(o.y), width: u(o.w), height: u(o.h) }), o);
    } else if (type === "diamond") {
      const p = [[o.x + o.w / 2, o.y], [o.x + o.w, o.y + o.h / 2], [o.x + o.w / 2, o.y + o.h], [o.x, o.y + o.h / 2]];
      e = paint(el("polygon", { points: p.map(q => q.map(u).join(",")).join(" ") }), o);
    } else if (type === "custom") {
      let d = "";
      o.points.forEach((q, i) => { d += q.close ? " Z" : `${i ? " L" : "M"}${u(o.x + q.x)},${u(o.y + q.y)}`; });
      e = paint(el("path", { d }), o);
    } else return;
    this.svg.appendChild(e);
  };

  // text boxes become foreignObject <div>s so long text wraps like it does in PowerPoint
  Slide.prototype.addText = function (text, o) {
    const fo = el("foreignObject", { x: u(o.x), y: u(o.y), width: u(o.w), height: u(o.h), overflow: "visible" });
    if (o.rotate) fo.setAttribute("transform", `rotate(${o.rotate - 360} ${u(o.x + o.w / 2)} ${u(o.y + o.h / 2)})`);
    const box = document.createElement("div");
    box.className = "slide-text";
    box.style.justifyContent = { top: "flex-start", bottom: "flex-end" }[o.valign] || "center";
    box.style.textAlign = o.align || "left";
    // labels the quiz rewords (see RELABEL in quiz.js); the deck's plot code stays untouched
    const swap = t => (window.SlideSVG.relabel || {})[t] ?? t;
    const runs = Array.isArray(text) ? text.map(r => ({ ...r, text: swap(r.text) })) : [{ text: swap(text), options: {} }];
    let line = document.createElement("div");
    box.appendChild(line);
    runs.forEach(r => {
      const ro = { ...o, ...(r.options || {}) };
      const span = document.createElement("span");
      span.textContent = r.text;
      span.style.fontSize = pt(ro.fontSize ?? 14) + "px";
      if (ro.bold) span.style.fontWeight = "700";
      if (ro.color) span.style.color = hex(ro.color);
      line.appendChild(span);
      if (ro.breakLine) { line = document.createElement("div"); box.appendChild(line); }
    });
    fo.appendChild(box);
    this.svg.appendChild(fo);
  };

  // draw(slide) into a new SVG; crop to the drawn content plus a margin
  function render(draw, pad = 0.12) {
    const svg = el("svg", { class: "slide-svg", viewBox: `0 0 ${u(10)} ${u(5.625)}`, role: "img" });
    const s = new Slide(svg);
    draw(s);
    return { svg, slide: s, crop() {
      const b = svg.getBBox();
      const m = u(pad);
      svg.setAttribute("viewBox", `${b.x - m} ${b.y - m} ${b.width + 2 * m} ${b.height + 2 * m}`);
    } };
  }

  window.SlideSVG = { shapes, render };
})();

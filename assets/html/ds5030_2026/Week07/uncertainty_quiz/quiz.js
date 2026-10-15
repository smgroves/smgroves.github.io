// Live true/false quiz for the "Reading uncertainty plots" deck.
// Students: open the page, pick an example, tap T or F. Host: add ?host to the URL and sign in.
// Database layout (Firebase Realtime Database):
//   quiz/state/<ex>               { round, show, reveal }   written only by the host
//   quiz/votes/<ex>/<round>/<uid> { "0": true, "1": false } written only by that student

const Q = window.QUIZ;

// The live quiz skips statements that can only be judged by calculating; the deck keeps them.
const NEEDS_MATH = [
  "The 95% CI for the difference B − A is [0.23, 5.77], which excludes 0.",
  "If the effect is 0, P(any interval excludes 0) = 1 − .90·.95·.99 ≈ 15%.",
  "Reporting only the best of 5 outcomes raises the false-positive rate to about 23%.",
];
const dropped = Q.scenarios.reduce((n, sc) => n + sc.items.filter(it => NEEDS_MATH.includes(it.s)).length, 0);
if (dropped !== NEEDS_MATH.length) console.warn(`quiz: expected to skip ${NEEDS_MATH.length} statements, matched ${dropped}`);
Q.scenarios.forEach(sc => { sc.items = sc.items.filter(it => !NEEDS_MATH.includes(it.s)); });

// The quiz frames example 4 as a business problem (the deck uses fertilizer); same numbers and lesson.
{
  const sc = Q.scenarios.find(x => x.title === "Barely overlapping sampling distributions");
  const data = Q.DATA[sc.title];
  sc.cap = "Sales training A vs B: average monthly sales of 25 reps each, SE = $1k.";
  sc.story = [
    ["The question", "Does sales training program B produce reps who sell more than program A?"],
    ["The data", "25 reps per program. A’s reps average $10k a month in sales and B’s $15k. Single reps vary a lot: SD = $5k."],
    ["The plot", "Each curve shows where that program’s average sales would land if you trained 25 new reps: spread SE = 5/√25 = $1k."],
  ];
  const [, i2, i3] = sc.items;
  Object.assign(i2, { s: "A random B rep almost certainly outsells a random A rep.",
    why: "Single reps have SD 5, not 1, so P(B rep sells more) = Φ(5/√50) ≈ 0.76." });
  Object.assign(i3, { s: "With 4× as many reps per program, each curve would be half as wide." });
  SlideSVG.relabel = {
    "average plant height (cm)": "average monthly sales ($ thousand)",
    "plant height (cm)": "monthly sales ($ thousand)",
  };
  data.blocks = [
    ["Averages", "Clearly apart: the black bars don’t come close."],
    ["Single reps", "Overlap heavily. A random B rep outsells a random A rep only about 76% of the time."],
  ];
}
const app = document.getElementById("app");
const HOST = new URLSearchParams(location.search).has("host");
const FB_VER = "10.12.2";

// ---------- backend: Firebase if configured, otherwise this device only ----------
const backend = await (window.FIREBASE_CONFIG ? firebaseBackend(window.FIREBASE_CONFIG) : localBackend());

async function firebaseBackend(config) {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const { initializeApp } = await import(base + "firebase-app.js");
  const db_ = await import(base + "firebase-database.js");
  const au = await import(base + "firebase-auth.js");
  const fb = initializeApp(config), db = db_.getDatabase(fb), auth = au.getAuth(fb);
  const user = await new Promise(res => {
    const off = au.onAuthStateChanged(auth, u => { if (u) { off(); res(u); } else au.signInAnonymously(auth).catch(() => res(null)); });
  });
  return {
    live: true,
    uid: () => auth.currentUser && auth.currentUser.uid,
    hostName: () => (auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.email : null),
    async signInHost() { await au.signInWithPopup(auth, new au.GoogleAuthProvider()); },
    onState(ex, cb) { return db_.onValue(db_.ref(db, `quiz/state/${ex}`), s => cb(s.val() || {})); },
    onVotes(ex, round, cb) { return db_.onValue(db_.ref(db, `quiz/votes/${ex}/${round}`), s => cb(s.val() || {})); },
    vote(ex, round, answers) { return db_.set(db_.ref(db, `quiz/votes/${ex}/${round}/${auth.currentUser.uid}`), answers); },
    setState(ex, patch) { return db_.update(db_.ref(db, `quiz/state/${ex}`), patch); },
    ok: !!user,
  };
}

function localBackend() {
  const state = {}, votes = {}, subs = [];
  const fire = () => subs.forEach(f => f());
  return {
    live: false, ok: true,
    uid: () => "me",
    hostName: () => "this device",
    async signInHost() {},
    onState(ex, cb) { const f = () => cb(state[ex] || {}); subs.push(f); f(); return () => subs.splice(subs.indexOf(f), 1); },
    onVotes(ex, round, cb) { const f = () => cb((votes[ex] || {})[round] || {}); subs.push(f); f(); return () => subs.splice(subs.indexOf(f), 1); },
    async vote(ex, round, answers) { ((votes[ex] ||= {})[round] ||= {}).me = answers; fire(); },
    async setState(ex, patch) { state[ex] = { ...(state[ex] || {}), ...patch }; fire(); },
  };
}

// ---------- helpers ----------
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : String(k));
  return e;
};
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const studentURL = () => location.origin + location.pathname + location.hash;

function plot(draw, pad) {
  const r = SlideSVG.render(draw, pad);
  // getBBox needs the SVG in the document; crop once it is attached
  requestAnimationFrame(() => r.crop());
  return r;
}

const show = (...kids) => app.replaceChildren(...kids.filter(k => k != null));
let unsubs = [];
const clearSubs = () => { unsubs.forEach(f => f && f()); unsubs = []; };

// ---------- index ----------
function renderIndex() {
  clearSubs();
  document.body.classList.remove("on-example");
  show(
    h("p", { class: "eyebrow" }, "DS 5030 · Week 7 · Live quiz"),
    h("h1", {}, "Reading uncertainty plots"),
    h("p", { class: "sub" }, "True or false? Error bars, confidence intervals, and sampling distributions. Throughout: estimates are approximately normal, SEs are known, and “significant” means at α = 0.05."),
    banner(),
    HOST ? hostIndexNote() : null,
    h("div", { class: "grid" }, Q.scenarios.map((sc, i) => {
      const a = h("a", { class: "card", href: `#/${i + 1}` },
        h("span", { class: "num" }, `Example ${i + 1}`),
        h("span", { class: "t" }, sc.title),
        h("div", { class: "thumb" }));
      const r = plot(s => sc.draw(s, { ...Q.P0 }, false));
      a.querySelector(".thumb").append(r.svg);
      a.append(h("span", { class: "meta" }, `${sc.items.length} statements`));
      return a;
    })),
  );
  document.title = "Reading Uncertainty Plots";
}

function banner() {
  if (backend.live && backend.ok) return null;
  if (backend.live) return h("p", { class: "banner" }, "Couldn't connect to live voting. Check your connection and reload.");
  return h("p", { class: "banner" }, "Live voting isn't set up yet, so votes stay on this device. (Instructor: add the Firebase config to firebase-config.js.)");
}

function hostIndexNote() {
  return h("div", { class: "host" },
    h("span", {}, "Host view. Open an example to run it. Students use this page without ", h("code", {}, "?host"), "."),
    h("span", { class: "link" }, location.origin + location.pathname));
}

// ---------- example ----------
function renderExample(ex) {
  clearSubs();
  const sc = Q.scenarios[ex - 1];
  const dv = Q.DATA[sc.title];
  let state = {}, votes = {}, roundSub = null, hostErr = "";
  const key = r => `uuquiz:${ex}:${r}`;

  const fig = h("div", { class: "figure" });
  const dataBox = h("section", { class: "data" });
  const list = h("ol", { class: "stmts" });
  const saved = h("p", { class: "saved", "aria-live": "polite" });
  const hostBar = HOST ? h("div", { class: "host" }) : null;
  let qsEl;

  document.body.classList.add("on-example");
  show(
    h("header", { class: "ex-head" },
      h("div", {}, h("p", { class: "eyebrow" }, `Example ${ex} of ${Q.scenarios.length}`), h("h1", {}, sc.title)),
      h("nav", { class: "crumbs" },
        h("a", { href: "#/" }, "All examples"),
        ex > 1 ? h("a", { href: `#/${ex - 1}` }, "← Previous") : null,
        ex < Q.scenarios.length ? h("a", { href: `#/${ex + 1}` }, "Next →") : null)),
    hostBar,
    banner(),
    // plots on the left (sticky on wide screens), story and statements on the right
    h("div", { class: "example" },
      h("div", { class: "plots" }, h("p", { class: "cap" }, sc.cap), fig, dataBox),
      qsEl = h("div", { class: "qs" },
        h("div", { class: "story" }, sc.story.map(([label, text]) => h("p", label === "The question" ? { class: "the-q" } : {}, h("b", {}, label), text))),
        h("h2", {}, "True or false?"),
        list,
        saved)),
  );
  document.title = `${sc.title} · Reading Uncertainty Plots`;

  function drawFigure() {
    fig.replaceChildren(plot(s => sc.draw(s, { ...Q.P0 }, !!state.reveal)).svg);
  }

  function drawData() {
    const showData = dv && (dv.when === "story" || state.reveal);
    if (!showData) { dataBox.replaceChildren(); return; }
    const r = plot(s => dv.render(s));
    const blocks = dv.blocks || r.slide.blocks;
    const side = blocks ? h("div", { class: "story" }, blocks.map(([l, t]) => h("p", {}, h("b", {}, l), t))) : null;
    dataBox.replaceChildren(...[
      h("h2", {}, dv.heading || "The data behind the plot"),
      // with side notes: plot and notes side by side, so the plot can use the full height
      side ? h("div", { class: "data-row" }, h("div", { class: "figure data-fig" }, r.svg), side) : h("div", { class: "figure data-fig" }, r.svg)]);
  }

  function myAnswers() { return store.get(key(state.round || 0)) || {}; }

  // worst = draw as if results and answers were both showing (used only to size the text)
  function drawStatements(worst = false) {
    const mine = myAnswers();
    const voters = Object.values(votes);
    const showTally = worst || !!state.show;   // hidden from everyone, host included, until the host clicks Show results
    const reveal = worst || !!state.reveal;
    list.replaceChildren(...sc.items.map((it, i) => {
      const li = h("li", { class: "stmt" }, h("div", { class: "row" }, h("span", { class: "n" }, i + 1), h("span", { class: "s" }, it.s)));
      if (!HOST) {
        const pick = v => () => {
          const a = { ...myAnswers(), [i]: v };
          store.set(key(state.round || 0), a);
          backend.vote(ex, state.round || 0, a).then(() => { saved.textContent = "Your answers are saved."; },
            () => { saved.textContent = "Couldn't save your answer. Check your connection."; });
          drawStatements();
        };
        const btn = (v, label, cls) => h("button", { type: "button", class: cls, "aria-pressed": String(mine[i] === v), onclick: pick(v), ...(reveal ? { disabled: "" } : {}) }, label);
        li.append(h("div", { class: "tf", role: "group", "aria-label": `Statement ${i + 1}` }, btn(true, "True", "t"), btn(false, "False", "f")));
      }
      if (showTally) {
        const answered = voters.filter(v => v && v[i] != null);
        const t = answered.filter(v => v[i] === true).length, n = answered.length;
        li.append(h("div", { class: "tally" },
          n ? `${t}/${n} students thought statement ${i + 1} was true` : "No votes yet",
          h("div", { class: "bar" }, h("span", { class: "bt", style: `width:${n ? (100 * t) / n : 0}%` }), h("span", { class: "bf", style: `width:${n ? (100 * (n - t)) / n : 0}%` }))));
      }
      if (reveal) {
        const right = !HOST && mine[i] != null ? (mine[i] === it.ans ? " You got it." : " Not this time.") : "";
        li.append(h("div", { class: "answer" }, h("span", { class: `pill ${it.ans ? "t" : "f"}` }, it.ans ? "TRUE" : "FALSE"), h("span", { class: "why" }, it.why + right)));
      }
      return li;
    }));
  }

  // wide screens: the largest text size at which the right column fits with results and answers showing,
  // so the text doesn't change size when the host reveals them
  const wide = matchMedia("(min-width: 861px) and (min-height: 520px)");
  // largest font size (px) at which el's content fits its own height
  function fitBox(el, lo, hi) {
    for (let k = 0; k < 9; k++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + "px";
      if (el.scrollHeight <= el.clientHeight) lo = mid; else hi = mid;
    }
    el.style.fontSize = Math.floor(lo * 2) / 2 + "px";
  }
  function fitNotes() {
    const notes = dataBox.querySelector(".data-row .story");
    if (!notes) return;
    if (!wide.matches) { notes.style.fontSize = ""; return; }
    fitBox(notes, 12, 20);
  }
  function fitText() {
    fitNotes();
    if (!wide.matches) { qsEl.style.fontSize = ""; drawStatements(); return; }
    drawStatements(true);
    fitBox(qsEl, 13, 30);
    drawStatements();
  }
  let fitTimer;
  const onResize = () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitText, 120); };
  addEventListener("resize", onResize);
  unsubs.push(() => removeEventListener("resize", onResize));

  function drawHost() {
    if (!hostBar) return;
    const who = backend.hostName();
    // keep the error outside the bar: Firebase applies a write locally, then reverts it (and redraws) if the rules reject it
    const fail = msg => { hostErr = msg; drawHost(); };
    const set = patch => { hostErr = ""; return backend.setState(ex, patch).catch(() => fail(`Only the instructor account can control the quiz. Click "Sign in as instructor" (signed in as ${who || "an anonymous student"}).`)); };
    const toggle = (k, on, off) => h("button", { type: "button", class: state[k] ? "on" : "", onclick: () => set({ [k]: !state[k] }) }, state[k] ? off : on);
    hostBar.replaceChildren(...[
      h("span", { class: "count" }, `${Object.keys(votes).length} responding`),
      toggle("show", "Show results", "Hide results"),
      toggle("reveal", "Reveal answers", "Hide answers"),
      h("button", { type: "button", onclick: () => { if (confirm("Start a new round? Current votes will be cleared from the tally.")) set({ round: (state.round || 0) + 1, show: false, reveal: false }); } }, "New round"),
      backend.live && !who ? h("button", { type: "button", onclick: () => backend.signInHost().then(() => { hostErr = ""; drawHost(); }, e => fail("Sign-in failed: " + e.message)) }, "Sign in as instructor") : h("span", {}, `Signed in: ${who}`),
      h("span", { class: "link" }, "Students: " + studentURL()),
      hostErr ? h("span", { class: "err" }, hostErr) : null].filter(Boolean));
    // keep the sticky plot column below the sticky host bar
    document.documentElement.style.setProperty("--stick", hostBar.offsetHeight + 12 + "px");
  }

  unsubs.push(backend.onState(ex, s => {
    const roundChanged = (s.round || 0) !== (state.round || 0) || !roundSub;
    state = s;
    if (roundChanged) {
      if (roundSub) roundSub();
      roundSub = backend.onVotes(ex, state.round || 0, v => { votes = v; drawStatements(); drawHost(); });
      unsubs.push(() => roundSub && roundSub());
      saved.textContent = "";
    }
    drawFigure(); drawData(); drawHost(); fitText();
  }));
}

// ---------- routing ----------
function route() {
  const m = location.hash.match(/^#\/(\d+)/);
  const ex = m && +m[1];
  if (ex >= 1 && ex <= Q.scenarios.length) renderExample(ex); else renderIndex();
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route);
route();

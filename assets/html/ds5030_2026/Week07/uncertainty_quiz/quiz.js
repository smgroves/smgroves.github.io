// Live true/false quiz for the "Reading uncertainty plots" deck.
// Students: open the page, pick their section, pick an example, tap T or F. Host: add ?host to the URL and sign in.
// Each section (sections.js) is its own room: its own votes, results, reveal and rounds.
// Database layout (Firebase Realtime Database):
//   quiz/state/<sec>/<ex>               { round, show, reveal, endsAt }   written only by the host
//                                       (endsAt: server time in ms when the answer clock runs out)
//   quiz/votes/<sec>/<ex>/<round>/<uid> { "0": true, "1": false } written only by that student

const Q = window.QUIZ;

// The live quiz skips statements that can only be judged by calculating; the deck keeps them.
const NEEDS_MATH = [
  "The 95% CI for the difference B − A is [0.23, 5.77], which excludes 0.",
  "If the effect is 0, P(any interval excludes 0) = 1 − .90·.95·.99 ≈ 15%.",
  "Reporting only the best of 5 outcomes raises the false-positive rate to about 23%.",
  "The SE of the gap is 1 + 1 = 2.",   // dropped by request
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
// Example 5 comes right after example 4 (not a drug trial), so say which trial it returns to.
{
  const sc = Q.scenarios.find(x => x.title === "Sampling distribution of the difference");
  const [first] = sc.story;
  if (first[0] !== "Same data, one curve") console.warn("quiz: example 5 story changed in the deck; check the override");
  sc.cap = "The drug trial from Examples 2 and 3 (A = 10, B = 13 months). Curve: the gap B − A. Pink: below 0.";
  sc.story = [["The data", "Patients on drug A live an average of 10 months and on drug B 13, SE = 1 each. What we care about is the gap: B − A = 13 − 10 = 3 extra months."], ...sc.story.slice(1)]
    // the "SE of the gap" statement is skipped, so don't point the reader at it
    .map(([l, t]) => [l, t.replace(" How wide is it? That’s statement 1.", "")]);
}
// Every example opens with a highlighted question; these two reuse the drug trial and had none.
const ADD_QUESTION = {
  "Overlapping sampling distributions": "Same drug trial as Example 2: do patients on drug B live longer than patients on drug A?",
  "Sampling distribution of the difference": "Same drug trial as Examples 2 and 3: how many extra months does drug B give, and could the true gap be 0?",
};
Q.scenarios.forEach(sc => {
  if (!sc.story.some(([l]) => l === "The question") && ADD_QUESTION[sc.title]) sc.story = [["The question", ADD_QUESTION[sc.title]], ...sc.story];
});
const missingQ = Q.scenarios.filter(sc => !sc.story.some(([l]) => l === "The question")).map(sc => sc.title);
if (missingQ.length) console.warn("quiz: examples without a question:", missingQ);

// Reworded statements (the deck keeps its original wording)
const REWORD = {
  "If we redid the study many times, about 68% of bars built this way would cover the route’s true average.": "If we redid each study many times, about 68% of the bars would cover each route’s true average.",
  "The CIs overlap a lot, so the drug made no significant difference.": "Because the CIs overlap a lot, the drug made no significant difference.",
};
Q.scenarios.forEach(sc => sc.items.forEach(it => { if (REWORD[it.s]) it.s = REWORD[it.s]; }));
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const HOST = params.has("host");
const SECTIONS = window.QUIZ_SECTIONS || [{ id: "s1", name: "Section 1" }];
const sectionById = id => SECTIONS.find(s => s.id === id);
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
  let offset = 0;   // local clock vs Firebase server clock, so every device counts down together
  db_.onValue(db_.ref(db, ".info/serverTimeOffset"), s => { offset = s.val() || 0; });
  return {
    live: true,
    now: () => Date.now() + offset,
    uid: () => auth.currentUser && auth.currentUser.uid,
    hostName: () => (auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.email : null),
    async signInHost() { await au.signInWithPopup(auth, new au.GoogleAuthProvider()); },
    onState(sec, ex, cb) { return db_.onValue(db_.ref(db, `quiz/state/${sec}/${ex}`), s => cb(s.val() || {})); },
    onVotes(sec, ex, round, cb) { return db_.onValue(db_.ref(db, `quiz/votes/${sec}/${ex}/${round}`), s => cb(s.val() || {})); },
    vote(sec, ex, round, answers) { return db_.set(db_.ref(db, `quiz/votes/${sec}/${ex}/${round}/${auth.currentUser.uid}`), answers); },
    setState(sec, ex, patch) { return db_.update(db_.ref(db, `quiz/state/${sec}/${ex}`), patch); },
    ok: !!user,
  };
}

function localBackend() {
  const state = {}, votes = {}, subs = [];
  const fire = () => subs.forEach(f => f());
  return {
    live: false, ok: true,
    now: () => Date.now(),
    uid: () => "me",
    hostName: () => "this device",
    async signInHost() {},
    onState(sec, ex, cb) { const k = `${sec}/${ex}`, f = () => cb(state[k] || {}); subs.push(f); f(); return () => subs.splice(subs.indexOf(f), 1); },
    onVotes(sec, ex, round, cb) { const k = `${sec}/${ex}`, f = () => cb((votes[k] || {})[round] || {}); subs.push(f); f(); return () => subs.splice(subs.indexOf(f), 1); },
    async vote(sec, ex, round, answers) { ((votes[`${sec}/${ex}`] ||= {})[round] ||= {}).me = answers; fire(); },
    async setState(sec, ex, patch) { const k = `${sec}/${ex}`; state[k] = { ...(state[k] || {}), ...patch }; fire(); },
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
// the section a visitor belongs to: from the link (?section=s1), else remembered on this device
let SECTION = null;
{
  const fromURL = sectionById(params.get("section"));
  if (fromURL) store.set("uuquiz:section", fromURL.id);
  SECTION = fromURL ? fromURL.id : (sectionById(store.get("uuquiz:section")) || {}).id || null;
}
function setSection(id) {
  SECTION = id;
  store.set("uuquiz:section", id);
  const u = new URL(location.href);
  if (id) u.searchParams.set("section", id); else u.searchParams.delete("section");
  history.replaceState(null, "", u);
  route();
}
const studentURL = () => `${location.origin}${location.pathname}?section=${SECTION}${location.hash}`;

// share of answers that were correct, per section, for one example (each section's current round)
function score(ex, votes) {
  const items = Q.scenarios[ex - 1].items;
  let c = 0, a = 0, n = 0;
  for (const v of Object.values(votes || {})) {
    if (!v) continue;
    let any = false;
    items.forEach((it, i) => { if (v[i] != null) { a++; any = true; if (v[i] === it.ans) c++; } });
    if (any) n++;
  }
  return { c, a, n };
}
function watchScores(ex, cb) {
  const scores = {}, offs = [];
  for (const sec of SECTIONS) {
    let offVotes = null;
    offs.push(backend.onState(sec.id, ex, st => {
      if (offVotes) offVotes();
      offVotes = backend.onVotes(sec.id, ex, st.round || 0, v => { scores[sec.id] = score(ex, v); cb({ ...scores }); });
    }));
    offs.push(() => offVotes && offVotes());
  }
  return () => offs.forEach(f => f && f());
}
const pct = s => (s && s.a ? Math.round((100 * s.c) / s.a) : null);

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
    h("p", { class: "eyebrow" }, "DS 5030 · Week 8 · In class challenge"),
    h("h1", {}, "Reading uncertainty plots"),
    h("p", { class: "sub" }, "True or false? Error bars, confidence intervals, and sampling distributions. Throughout: estimates are approximately normal, SEs are known, all sampling distributions were generated with an appropriately high number of bootstraps, and “significant” means at α = 0.05."),
    banner(),
    rulesBox(),
    SECTION ? sectionChip() : sectionPicker(),
    HOST && SECTION ? hostIndexNote() : null,
    HOST ? leaderboard() : null,
    !SECTION ? null : h("div", { class: "grid" }, Q.scenarios.map((sc, i) => {
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

// the rules of the challenge, in the instructor's words
function rulesBox() {
  return h("section", { class: "rules" },
    h("h2", {}, "How the challenge works"),
    h("ul", {},
      h("li", {}, "You may collaborate with anyone else to decide your answer. (My hope is that if you use someone else’s answer, they explain it to you!)"),
      h("li", {}, "The final score for our section will be % correct answers, so only one person per group needs to submit or everyone can (but of course, many correct answers will outweigh incorrect answers)."),
      h("li", {}, "There will be a timer for each example; votes can't be input when the timer is up or when I reveal the answers."),
      h("li", {}, "You shouldn't need to do math, except possibly a z-score calculation with estimate, mean, and SE given."),
      h("li", {}, "You can reference the slides.")),
    h("p", { class: "fun" }, "This is supposed to be fun, not stressful! The time limit is purposefully short. Take advantage of being able to work together. If something still confuses you after the game, take a look at additional slides I’ll post after class for more in-depth answers."));
}

function sectionPicker() {
  return h("section", { class: "picker" },
    h("h2", {}, HOST ? "Which section are you running?" : "Which section are you in?"),
    h("div", { class: "picks" }, SECTIONS.map(sec => h("button", { type: "button", onclick: () => setSection(sec.id) }, sec.name))));
}

function sectionChip() {
  return h("p", { class: "chip" }, "Your section: ", h("b", {}, sectionById(SECTION).name), " ",
    h("button", { type: "button", class: "linkish", onclick: () => setSection(null) }, "change"));
}

function hostIndexNote() {
  const bar = h("div", { class: "host" });
  let msg = "";
  const once = ex => new Promise(res => { let off = null, done = false; off = backend.onState(SECTION, ex, st => { if (done) return; done = true; res(st); setTimeout(() => off && off()); }); });
  async function newRoundAll() {
    const name = sectionById(SECTION).name;
    if (!confirm(`Start a new round on all ${Q.scenarios.length} examples for ${name}? Current votes are cleared from every tally, and results, answers and timers are reset.`)) return;
    msg = "Clearing…"; draw();
    try {
      for (let ex = 1; ex <= Q.scenarios.length; ex++) {
        const st = await once(ex);
        await backend.setState(SECTION, ex, { round: (st.round || 0) + 1, show: false, reveal: false, endsAt: null });
      }
      msg = `New round started on all examples for ${name}.`;
    } catch {
      msg = "Only the instructor account can do this. Sign in as instructor first.";
    }
    draw();
  }
  function draw() {
    const who = backend.hostName();
    bar.replaceChildren(...[
      h("span", {}, `Host view for ${sectionById(SECTION).name}. Open an example to run it.`),
      h("button", { type: "button", onclick: newRoundAll }, "New round for all examples"),
      backend.live && !who ? h("button", { type: "button", onclick: () => backend.signInHost().then(draw, e => { msg = "Sign-in failed: " + e.message; draw(); }) }, "Sign in as instructor") : h("span", {}, `Signed in: ${who}`),
      h("span", { class: "link" }, `Students: ${location.origin}${location.pathname}?section=${SECTION}`),
      msg ? h("span", { class: msg.startsWith("New round") ? "ok" : "err" }, msg) : null].filter(Boolean));
  }
  draw();
  return bar;
}

// every section's % correct on every example, live; for projecting the competition
function leaderboard() {
  const box = h("section", { class: "board" });
  const all = {};
  const draw = () => {
    const total = id => Q.scenarios.reduce((t, _, i) => { const s = (all[i + 1] || {})[id]; return s ? { c: t.c + s.c, a: t.a + s.a } : t; }, { c: 0, a: 0 });
    const rows = SECTIONS.map(sec => ({ sec, tot: total(sec.id) })).sort((x, y) => (pct(y.tot) ?? -1) - (pct(x.tot) ?? -1));
    box.replaceChildren(
      h("h2", {}, "Section leaderboard"),
      h("p", { class: "note" }, "Share of answers that were correct, each section's current round."),
      h("div", { class: "tablewrap" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Section"), Q.scenarios.map((_, i) => h("th", {}, `Ex ${i + 1}`)), h("th", {}, "Overall"))),
        h("tbody", {}, rows.map(({ sec, tot }) => h("tr", sec.id === SECTION ? { class: "mine" } : {},
          h("td", {}, sec.name),
          Q.scenarios.map((_, i) => { const s = (all[i + 1] || {})[sec.id]; const p = pct(s); return h("td", {}, p == null ? "–" : `${p}%`, s && s.n ? h("small", {}, ` (${s.n})`) : null); }),
          h("td", { class: "tot" }, pct(tot) == null ? "–" : `${pct(tot)}%`)))))));
  };
  Q.scenarios.forEach((_, i) => unsubs.push(watchScores(i + 1, s => { all[i + 1] = s; draw(); })));
  draw();
  return box;
}

// ---------- example ----------
function renderExample(ex) {
  clearSubs();
  const sec = SECTION;
  const sc = Q.scenarios[ex - 1];
  const dv = Q.DATA[sc.title];
  let state = {}, votes = {}, roundSub = null, hostErr = "", scores = {};
  const key = r => `uuquiz:${sec}:${ex}:${r}`;

  const fig = h("div", { class: "figure" });
  const dataBox = h("section", { class: "data" });
  const list = h("ol", { class: "stmts" });
  const saved = h("p", { class: "saved", "aria-live": "polite" });
  const scoreLine = h("p", { class: "scores" });
  const timerEl = h("div", { class: "timer", role: "timer" });
  const hostBar = HOST ? h("div", { class: "host" }) : null;
  let qsEl;

  document.body.classList.add("on-example");
  show(
    h("header", { class: "ex-head" },
      h("div", {}, h("p", { class: "eyebrow" }, `Example ${ex} of ${Q.scenarios.length} · ${sectionById(sec).name}`), h("h1", {}, sc.title)),
      timerEl,
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
        scoreLine,
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
  const timeLeft = () => (state.endsAt ? state.endsAt - backend.now() : null);
  const timeUp = () => state.endsAt != null && timeLeft() <= 0;
  const locked = () => !!state.reveal || timeUp();

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
          if (locked()) return;
          const a = { ...myAnswers(), [i]: v };
          store.set(key(state.round || 0), a);
          backend.vote(sec, ex, state.round || 0, a).then(() => { saved.textContent = "Your answers are saved."; },
            () => { saved.textContent = "Couldn't save your answer. Check your connection."; });
          drawStatements();
        };
        const btn = (v, label, cls) => h("button", { type: "button", class: cls, "aria-pressed": String(mine[i] === v), onclick: pick(v), ...(reveal || locked() ? { disabled: "" } : {}) }, label);
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
    drawScores(worst);
  }

  // after the reveal: how every section did on this example (the competition)
  function drawScores(worst = false) {
    if (!(worst || state.reveal)) { scoreLine.replaceChildren(); return; }
    const parts = SECTIONS.map(s => ({ s, p: pct(scores[s.id]), n: (scores[s.id] || {}).n || 0 }))
      .sort((x, y) => (y.p ?? -1) - (x.p ?? -1))
      .map(({ s, p, n }) => h("span", s.id === sec ? { class: "mine" } : {}, `${s.name} ${p == null ? "–" : p + "%"}`, n ? h("small", {}, ` (${n})`) : null));
    scoreLine.replaceChildren(h("b", {}, "Sections, % correct: "), ...parts.flatMap((p, i) => (i ? [" · ", p] : [p])));
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

  // ---- answer clock ----
  const DEFAULT_DUR = 120;                 // seconds; the host can pick another length per device
  const DUR_KEY = "uuquiz:duration-v2";    // new key so an older saved 3:00 choice doesn't override the 2:00 default
  const fmt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  let wasLocked = null;
  function tick() {
    const left = timeLeft();
    timerEl.className = "timer" + (left == null ? " idle" : left <= 0 ? " up" : left <= 30000 ? " urgent" : "");
    timerEl.textContent = left == null ? (HOST ? "Clock not started" : "") : left > 0 ? fmt(left) : "Time's up";
    const now = locked();
    if (wasLocked !== null && now !== wasLocked) {
      drawStatements(); drawHost();
      if (!HOST && timeUp() && !state.reveal) saved.textContent = "Time's up. Your answers are locked in.";
    }
    wasLocked = now;
  }
  const clock = setInterval(tick, 250);
  unsubs.push(() => clearInterval(clock));
  function timerControls(set) {
    const dur = store.get(DUR_KEY) || DEFAULT_DUR;
    const left = timeLeft();
    if (left != null && left > 0) return [
      h("button", { type: "button", onclick: () => set({ endsAt: state.endsAt + 30000 }) }, "+30 s"),
      h("button", { type: "button", onclick: () => set({ endsAt: backend.now() }) }, "End now"),
    ];
    const pickDur = h("select", { "aria-label": "Answer time", onchange: e => store.set(DUR_KEY, +e.target.value) },
      [60, 90, 120, 180, 240, 300].map(v => h("option", { value: v, ...(v === dur ? { selected: "" } : {}) }, fmt(v * 1000))));
    return [pickDur, h("button", { type: "button", class: "start", onclick: () => set({ endsAt: backend.now() + (store.get(DUR_KEY) || DEFAULT_DUR) * 1000 }) }, timeUp() ? "Restart timer" : "Start timer")];
  }

  function drawHost() {
    if (!hostBar) return;
    const who = backend.hostName();
    // keep the error outside the bar: Firebase applies a write locally, then reverts it (and redraws) if the rules reject it
    const fail = msg => { hostErr = msg; drawHost(); };
    const set = patch => { hostErr = ""; return backend.setState(sec, ex, patch).catch(() => fail(`Only the instructor account can control the quiz. Click "Sign in as instructor" (signed in as ${who || "an anonymous student"}).`)); };
    const toggle = (k, on, off) => h("button", { type: "button", class: state[k] ? "on" : "", onclick: () => set({ [k]: !state[k] }) }, state[k] ? off : on);
    hostBar.replaceChildren(...[
      h("span", { class: "count" }, `${sectionById(sec).name}: ${Object.keys(votes).length} responding`),
      ...timerControls(set),
      toggle("show", "Show results", "Hide results"),
      toggle("reveal", "Reveal answers", "Hide answers"),
      h("button", { type: "button", onclick: () => { if (confirm("Start a new round? Current votes will be cleared from the tally.")) set({ round: (state.round || 0) + 1, show: false, reveal: false, endsAt: null }); } }, "New round"),
      backend.live && !who ? h("button", { type: "button", onclick: () => backend.signInHost().then(() => { hostErr = ""; drawHost(); }, e => fail("Sign-in failed: " + e.message)) }, "Sign in as instructor") : h("span", {}, `Signed in: ${who}`),
      h("span", { class: "link" }, "Students: " + studentURL()),
      hostErr ? h("span", { class: "err" }, hostErr) : null].filter(Boolean));
    // keep the sticky plot column below the sticky host bar
    document.documentElement.style.setProperty("--stick", hostBar.offsetHeight + 12 + "px");
  }

  unsubs.push(watchScores(ex, s => { scores = s; drawScores(); }));
  unsubs.push(backend.onState(sec, ex, s => {
    const roundChanged = (s.round || 0) !== (state.round || 0) || !roundSub;
    state = s;
    if (roundChanged) {
      if (roundSub) roundSub();
      roundSub = backend.onVotes(sec, ex, state.round || 0, v => { votes = v; drawStatements(); drawHost(); });
      unsubs.push(() => roundSub && roundSub());
      saved.textContent = "";
    }
    drawFigure(); drawData(); drawHost(); fitText(); tick();
  }));
}

// ---------- routing ----------
function route() {
  const m = location.hash.match(/^#\/(\d+)/);
  const ex = m && +m[1];
  if (ex >= 1 && ex <= Q.scenarios.length && SECTION) renderExample(ex); else renderIndex();
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route);
route();

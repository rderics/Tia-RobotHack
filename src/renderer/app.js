// Tia's screen: 3D stage + phone + list. Talks to the brain only through window.tia
// (preload.js in the desktop app, web-bridge.js on the website, static-bridge.js on the public replay site).
const $ = (id) => document.getElementById(id);
const state = { handled: 0, needs: 0, done: 0, total: 0, running: false };
const CHANNEL_LABEL = { email: "Email", whatsapp: "WhatsApp", instagram: "Instagram", slack: "Slack" };
const params = new URLSearchParams(location.search);
const SHOT = !!params.get("shot");
const reducedMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- 3D stage ----------
let stage3d = null;
try {
  stage3d = window.TiaScene.createScene($("stage"), { reducedMotion });
  if (SHOT) stage3d.setSpeed(0.05);
  window.__tiaStage = stage3d; // handy for testing (e.g. __tiaStage.setSpeed(0.3))
} catch (e) {
  console.warn("3D stage unavailable", e); // the rest of the screen still works without WebGL
}
function phoneTarget() {
  if (!stage3d) return null;
  const s = $("stage").getBoundingClientRect();
  const p = $("phone").getBoundingClientRect();
  return stage3d.screenToWorld(p.left + p.width / 2 - s.left, p.top + p.height * 0.45 - s.top);
}
const animate = (r) => (stage3d ? stage3d.play(r, { phoneTarget }).catch(() => {}) : Promise.resolve());

// ---------- voice (built-in voices, offline) ----------
const voice = { on: true, chosen: null };
try {
  voice.on = localStorage.getItem("tia.voice") !== "off";
} catch {}
function pickVoice() {
  if (!window.speechSynthesis) return;
  const all = speechSynthesis.getVoices();
  const en = all.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  const preferred = ["Aria", "Jenny", "Zira", "Hazel", "Susan", "Libby", "Sonia", "Female"];
  voice.chosen = preferred.map((p) => en.find((v) => v.name.includes(p))).find(Boolean) || en[0] || all[0] || null;
}
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = pickVoice;
  pickVoice();
}
function speakAloud(text) {
  if (!voice.on || !text || !window.speechSynthesis) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice.chosen) u.voice = voice.chosen;
    u.rate = 1.05;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      stage3d && stage3d.setTalking(false);
      resolve();
    };
    const timer = setTimeout(done, 2000 + text.length * 90); // never get stuck if the voice fails
    u.onstart = () => stage3d && stage3d.setTalking(true);
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}
function stopSpeaking() {
  if (window.speechSynthesis) speechSynthesis.cancel();
}
function say(text, { speak = true } = {}) {
  $("speech").textContent = text;
  if (speak && voice.on) return speakAloud(text);
  if (stage3d && speak) {
    stage3d.setTalking(true);
    setTimeout(() => stage3d.setTalking(false), 1400);
  }
  return Promise.resolve();
}
function setVoice(on, persist = true) {
  voice.on = on;
  if (persist) {
    try {
      localStorage.setItem("tia.voice", on ? "on" : "off");
    } catch {}
  }
  $("voiceBtn").textContent = on ? "Voice on" : "Voice off";
  if (!on) stopSpeaking();
}

// ---------- phone notifications: no spam ----------
// Urgent (fraud, complaints) buzz right away. Everything else that needs the owner is collected into
// ONE summary notification. Work Tia finished herself never buzzes.
const phone = { digest: [], silent: 0 };
function isUrgent(r) {
  const p = r.proposal || {};
  const text = `${p.summary || ""} ${p.reason || ""}`.toLowerCase();
  return p.category === "payment_change" || p.category === "complaint" || /phish|fraud|scam|suspicious/.test(text);
}
function pushNote({ title, body, urgent, itemId }) {
  const n = document.createElement("div");
  n.className = "note" + (urgent ? " urgent" : "");
  const head = document.createElement("div");
  head.className = "note-head";
  const img = document.createElement("img");
  img.src = "assets/favicon-32.png";
  img.alt = "";
  head.append(img, document.createTextNode(urgent ? "Tia · urgent · now" : "Tia · now"));
  const t = document.createElement("div");
  t.className = "note-title";
  t.textContent = title;
  const b = document.createElement("div");
  b.textContent = body;
  n.append(head, t, b);
  n.onclick = () => focusItem(itemId);
  $("notes").prepend(n);
  const ph = $("phone");
  ph.classList.remove("buzz");
  void ph.offsetWidth;
  ph.classList.add("buzz");
}
function phoneOnResult(r) {
  if (r.decision === "handle") {
    phone.silent++;
    $("phoneQuiet").textContent = `${phone.silent} handled – none sent to your phone`;
    return;
  }
  if (isUrgent(r)) pushNote({ title: r.message.from, body: r.proposal ? r.proposal.summary : "Needs a look", urgent: true, itemId: r.message.id });
  else phone.digest.push(r);
}
function phoneOnDone() {
  if (!phone.digest.length) return;
  const n = phone.digest.length;
  const lines = phone.digest.slice(0, 3).map((r) => `• ${r.message.from}`);
  if (n > 3) lines.push(`+${n - 3} more`);
  pushNote({ title: `${n} things need you`, body: lines.join("\n"), urgent: false, itemId: null });
  phone.digest = [];
}
function resetPhone() {
  $("notes").innerHTML = "";
  phone.digest = [];
  phone.silent = 0;
  $("phoneQuiet").textContent = "Handled work stays silent.";
}

// ---------- list ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  $("needs").hidden = name !== "needs";
  $("handled").hidden = name !== "handled";
}
function focusItem(id) {
  showTab("needs");
  const item = id ? document.querySelector(`.item[data-id="${id}"]`) : $("needs").firstElementChild;
  if (!item) return;
  item.classList.add("open", "flash");
  item.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setTimeout(() => item.classList.remove("flash"), 1500);
}

function renderItem(r) {
  const node = $("itemTpl").content.firstElementChild.cloneNode(true);
  const m = r.message;
  const p = r.proposal || {};
  node.dataset.id = m.id;
  node.querySelector(".dot").classList.add(m.channel);
  node.querySelector(".who").textContent = `${m.from}`;
  node.querySelector(".when").textContent = `${CHANNEL_LABEL[m.channel] || m.channel} · ${m.time}`;
  node.querySelector(".what").textContent = r.error ? `Couldn't process: ${r.error}` : p.summary;
  node.querySelector(".item-head").onclick = () => node.classList.toggle("open");
  if (p.draft_reply) node.querySelector(".draft-text").textContent = p.draft_reply;
  else node.querySelector(".draft").remove();
  const ul = node.querySelector(".actions");
  for (const a of p.actions || []) ul.appendChild(el("li", null, `${a.type}: ${a.detail}`));
  if (!ul.children.length) ul.remove();
  node.querySelector(".reason").textContent = p.reason || "";
  const g = node.querySelector(".guard");
  g.textContent = (r.guardNotes || []).join(" ");
  if ((r.guardNotes || []).some((n) => n.startsWith("Learned"))) g.classList.add("learned");
  if (p.vault_sources && p.vault_sources.length) node.querySelector(".sources").textContent = "From your notes: " + p.vault_sources.join(", ");
  if (r.decision === "escalate" && !r.error) addOwnerButtons(node, r);
  return node;
}

function addOwnerButtons(node, r) {
  const box = node.querySelector(".buttons");
  const p = r.proposal;
  const approve = el("button", "btn small ok", p.draft_reply ? "Approve & send" : "Approve");
  const edit = el("button", "btn small", "Edit");
  const reject = el("button", "btn small ghost", "Reject");
  box.append(approve, edit, reject);
  const resolve = async (verdict, editedReply) => {
    const res = await window.tia.feedback({ message: r.message, proposal: p, verdict, editedReply });
    box.innerHTML = "";
    box.appendChild(
      el(
        "span",
        verdict === "reject" ? "resolved rejected" : "resolved",
        verdict === "reject" ? "Rejected – I'll be more careful with this kind." : `Done${p.draft_reply ? " – reply sent (simulated)" : ""} · learned ${Math.min(res.approvals, res.needed)}/${res.needed}`
      )
    );
    node.classList.add("done");
    node.classList.remove("open");
    if (verdict !== "reject" && res.approvals === res.needed && p.category === "new_lead") say("Got it. I'll answer new leads like this myself from now on. Start the day again to see.");
    else say(verdict === "reject" ? "Okay, I won't do that. Noted in your notes." : "Thanks, noted in your notes so I learn from it.");
  };
  approve.onclick = () => resolve("approve");
  reject.onclick = () => resolve("reject");
  edit.onclick = () => {
    const d = node.querySelector(".draft");
    if (!d) return resolve("approve");
    node.classList.add("open");
    const ta = document.createElement("textarea");
    ta.value = p.draft_reply;
    d.querySelector(".draft-text").replaceWith(ta);
    ta.focus();
    edit.textContent = "Save & send";
    edit.classList.add("ok");
    approve.remove();
    edit.onclick = () => resolve("edit", ta.value);
  };
}

function updateStats() {
  $("statHandled").textContent = state.handled;
  $("statNeeds").textContent = state.needs;
  $("countHandled").textContent = state.handled;
  $("countNeeds").textContent = state.needs;
  $("statMinutes").textContent = state.handled * 4;
  $("progressBar").style.width = (state.total ? Math.round((state.done / state.total) * 100) : 0) + "%";
}
function clearBoard() {
  $("handled").innerHTML = "";
  $("needs").innerHTML = "";
  Object.assign(state, { handled: 0, needs: 0, done: 0, total: 0 });
  resetPhone();
  updateStats();
  $("progressLabel").textContent = "Inbox waiting";
}
function setRunning(on) {
  state.running = on;
  for (const id of ["runBtn", "replayBtn", "resetBtn"]) $(id).disabled = on;
}

// ---------- events from the brain: one at a time, animated ----------
const queue = [];
let draining = false;
let runId = 0;
function onEvent(ev) {
  if (ev.type === "thinking") return; // the stage shows what Tia is reading, in step with the animation
  queue.push({ ev, run: runId });
  drain();
}
async function drain() {
  if (draining) return;
  draining = true;
  while (queue.length) {
    const { ev, run } = queue.shift();
    if (run !== runId) continue;
    await handleEvent(ev);
  }
  draining = false;
}
async function handleEvent(ev) {
  if (ev.type === "start") {
    state.total = ev.total;
    updateStats();
    await say(ev.mode === "replay" ? "Going through today's inbox." : `Reading ${ev.total} new messages.`, { speak: false });
  } else if (ev.type === "result") {
    const r = ev.result;
    const line = r.error
      ? `I couldn't read the message from ${r.message.from}.`
      : r.decision === "handle"
        ? r.proposal.narration || `Handled: ${r.proposal.summary}`
        : `This one needs you: ${r.proposal.summary}`;
    $("speech").textContent = `Reading ${CHANNEL_LABEL[r.message.channel] || r.message.channel} from ${r.message.from}…`;
    $("progressLabel").textContent = `Message ${state.done + 1} of ${state.total}`;
    await animate(r).then(() => null);
    state.done++;
    document.querySelectorAll(".list .empty").forEach((e) => e.remove());
    const item = renderItem(r);
    if (r.decision === "handle") {
      state.handled++;
      $("handled").prepend(item);
    } else {
      state.needs++;
      $("needs").prepend(item);
    }
    phoneOnResult(r);
    updateStats();
    await say(line);
  } else if (ev.type === "done") {
    const s = ev.summary;
    phoneOnDone();
    setRunning(false);
    $("progressLabel").textContent = "Inbox done";
    await say(`Done. I handled ${s.handled} things myself, about ${s.minutesSaved} minutes saved. ${s.needsYou} need you, and my drafts are ready.`);
  } else if (ev.type === "error") {
    setRunning(false);
    await say(`Something went wrong: ${ev.error}`, { speak: false });
  }
}

async function start(mode) {
  if (state.running) return;
  runId++;
  queue.length = 0;
  stopSpeaking();
  clearBoard();
  showTab("needs");
  setRunning(true);
  await window.tia.run(mode);
}

async function init() {
  const info = await window.tia.info();
  $("today").textContent = info.today;
  $("mode").textContent = info.static
    ? "Recorded demo · a real Claude run, replayed"
    : info.provider === "api"
      ? `Claude API · ${info.model}`
      : `Claude subscription · ${info.model}`;
  $("replayBtn").disabled = !info.hasReplay;
  if (info.static) $("replayBtn").hidden = true; // on the public site "Start the day" plays the recording
  window.tia.onEvent(onEvent);
  $("runBtn").onclick = () => start("live");
  $("replayBtn").onclick = () => start("replay");
  $("resetBtn").onclick = async () => {
    await window.tia.reset();
    runId++;
    queue.length = 0;
    stopSpeaking();
    clearBoard();
    say("I've forgotten what you taught me today. Fresh start.");
  };
  $("voiceBtn").onclick = () => setVoice(!voice.on);
  document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));
  $("needs").appendChild(el("div", "empty", "Things that need your decision land here, with my reply ready."));
  $("handled").appendChild(el("div", "empty", "Things I finish on my own land here."));

  setVoice(voice.on, false);
  if (SHOT) {
    document.body.classList.add("no-anim");
    setVoice(false, false); // screenshot test runs silently (not saved)
    setTimeout(() => {
      const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
      console.log(`TIA-VOICES ${vs.length} | chosen: ${voice.chosen ? voice.chosen.name : "none"} | 3D: ${stage3d ? "on" : "off"}`);
    }, 800);
  }
  const autorun = params.get("autorun");
  if (autorun === "replay") start("replay");
  if (autorun === "live") start("live");
}

init();

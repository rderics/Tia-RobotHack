// Tia's screen. Talks to the brain only through window.tia (see preload.js).
const $ = (id) => document.getElementById(id);
const state = { handled: 0, needs: 0, done: 0, total: 0, running: false };
const CHANNEL_LABEL = { email: "Email", whatsapp: "WhatsApp", instagram: "Instagram", slack: "Slack" };

// ---- Voice: Tia reads her updates out loud with the computer's built-in voices (works offline) ----
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
    const av = document.querySelector(".avatar");
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      av.classList.remove("talking");
      resolve();
    };
    const timer = setTimeout(done, 2000 + text.length * 90); // never get stuck if the voice fails
    u.onstart = () => av.classList.add("talking");
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}

function stopSpeaking() {
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// Shows Tia's line in the bubble and (if voice is on) says it. Resolves when she has finished.
function say(text, mood = "talking") {
  $("speech").textContent = text;
  const av = document.querySelector(".avatar");
  av.classList.remove("talking", "thinking");
  if (mood === "thinking") {
    av.classList.add("thinking");
    return Promise.resolve();
  }
  if (voice.on) return speakAloud(text);
  if (mood) {
    av.classList.add(mood);
    setTimeout(() => av.classList.remove("talking"), 2200);
  }
  return Promise.resolve();
}

function setVoice(on) {
  voice.on = on;
  try {
    localStorage.setItem("tia.voice", on ? "on" : "off");
  } catch {}
  $("voiceBtn").textContent = on ? "Voice: on" : "Voice: off";
  if (!on) stopSpeaking();
}

function updateStats() {
  $("statHandled").textContent = state.handled;
  $("statNeeds").textContent = state.needs;
  $("countHandled").textContent = state.handled;
  $("countNeeds").textContent = state.needs;
  $("statMinutes").textContent = state.handled * 4;
  const pct = state.total ? Math.round((state.done / state.total) * 100) : 0;
  $("progressBar").style.width = pct + "%";
  $("progressLabel").textContent = state.total ? `Inbox: ${state.done} of ${state.total} read` : "Inbox: waiting";
}

function clearBoard() {
  $("handled").innerHTML = "";
  $("needs").innerHTML = "";
  Object.assign(state, { handled: 0, needs: 0, done: 0, total: 0 });
  updateStats();
}

function setRunning(on) {
  state.running = on;
  for (const id of ["runBtn", "replayBtn", "resetBtn"]) $(id).disabled = on;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderCard(r) {
  const node = $("cardTpl").content.firstElementChild.cloneNode(true);
  const m = r.message;
  const p = r.proposal || {};
  const chip = node.querySelector(".chip");
  chip.textContent = CHANNEL_LABEL[m.channel] || m.channel;
  chip.classList.add(m.channel);
  node.querySelector(".from").textContent = m.from;
  node.querySelector(".time").textContent = m.time;

  if (r.error) {
    node.querySelector(".summary").textContent = m.subject || m.text.slice(0, 80);
    node.querySelector(".reason").textContent = `Error: ${r.error}`;
    node.querySelector(".draft").remove();
    node.querySelector(".actions").remove();
    return node;
  }

  node.querySelector(".summary").textContent = p.summary;
  const ul = node.querySelector(".actions");
  for (const a of p.actions || []) ul.appendChild(el("li", null, `${a.type}: ${a.detail}`));
  if (!ul.children.length) ul.remove();

  const draft = node.querySelector(".draft");
  if (p.draft_reply) node.querySelector(".draft-text").textContent = p.draft_reply;
  else draft.remove();

  node.querySelector(".reason").textContent = p.reason;
  const g = node.querySelector(".guard");
  g.textContent = (r.guardNotes || []).join(" ");
  if ((r.guardNotes || []).some((n) => n.startsWith("Learned"))) g.classList.add("learned");
  if (p.vault_sources && p.vault_sources.length) node.querySelector(".sources").textContent = "From your notes: " + p.vault_sources.join(", ");

  if (r.decision === "escalate") addOwnerButtons(node, r);
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
    const label =
      verdict === "reject"
        ? "Rejected – I'll be more careful with this kind."
        : `Done${p.draft_reply ? " – reply sent (simulated)" : ""}. Learned ${Math.min(res.approvals, res.needed)}/${res.needed}.`;
    box.appendChild(el("span", verdict === "reject" ? "resolved rejected" : "resolved", label));
    node.classList.add("done");
    if (verdict !== "reject" && res.approvals === res.needed && p.category === "new_lead") {
      say("Got it – I'll answer new leads like this myself from now on. Run the day again to see.");
    } else {
      say(verdict === "reject" ? "Okay, I won't do that. Noted in your vault." : "Thanks – noted in your vault so I learn from it.");
    }
  };

  approve.onclick = () => resolve("approve");
  reject.onclick = () => resolve("reject");
  edit.onclick = () => {
    const d = node.querySelector(".draft");
    if (!d) return resolve("approve");
    d.open = true;
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

// Events from the brain go through a queue, so each card appears while Tia says it (not all at once).
const queue = [];
let draining = false;
let runId = 0;

function onEvent(ev) {
  // "Reading X…" goes to the progress line straight away; it is never spoken.
  if (ev.type === "thinking") {
    $("progressLabel").textContent = `Reading ${CHANNEL_LABEL[ev.message.channel] || ev.message.channel} from ${ev.message.from}…`;
    return;
  }
  queue.push({ ev, run: runId });
  drain();
}

async function drain() {
  if (draining) return;
  draining = true;
  while (queue.length) {
    const { ev, run } = queue.shift();
    if (run !== runId) continue; // left over from a run that was reset
    await handleEvent(ev);
  }
  draining = false;
}

async function handleEvent(ev) {
  if (ev.type === "start") {
    state.total = ev.total;
    updateStats();
    await say(ev.mode === "replay" ? "Replaying my last run of today's inbox." : `Reading ${ev.total} new messages…`, "thinking");
  } else if (ev.type === "result") {
    const r = ev.result;
    state.done++;
    document.querySelectorAll(".empty").forEach((e) => e.remove());
    const card = renderCard(r);
    if (r.decision === "handle") {
      state.handled++;
      $("handled").prepend(card);
    } else {
      state.needs++;
      $("needs").prepend(card);
    }
    updateStats();
    if (r.decision === "handle") await say(r.proposal.narration || `Handled: ${r.proposal.summary}`);
    else await say(r.error ? `I couldn't read the message from ${r.message.from}.` : `This one needs you: ${r.proposal.summary}`);
  } else if (ev.type === "done") {
    const s = ev.summary;
    setRunning(false);
    await say(`Done. I handled ${s.handled} things myself, about ${s.minutesSaved} minutes saved. ${s.needsYou} need you, and my drafts are ready.`);
  } else if (ev.type === "error") {
    setRunning(false);
    await say(`Something went wrong: ${ev.error}`, null);
  }
}

async function start(mode) {
  if (state.running) return;
  runId++;
  queue.length = 0;
  stopSpeaking();
  clearBoard();
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
  $("handled").appendChild(el("div", "empty", "Things I finish on my own show up here."));
  $("needs").appendChild(el("div", "empty", "Things that need your decision show up here, with my draft ready."));

  setVoice(voice.on);
  const params = new URLSearchParams(location.search);
  if (params.get("shot")) {
    document.body.classList.add("no-anim");
    voice.on = false; // screenshot test runs silently (not saved); it only reports which voices exist
    setTimeout(() => {
      const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
      console.log(`TIA-VOICES ${vs.length}: ${vs.map((v) => `${v.name} (${v.lang})`).join(", ")} | chosen: ${voice.chosen ? voice.chosen.name : "none"}`);
    }, 800);
  }
  const autorun = params.get("autorun");
  if (autorun === "replay") start("replay");
  if (autorun === "live") start("live");
}

init();

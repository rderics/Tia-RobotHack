// Tia's big screen: 3D stage + conversation + the desk (Needs you / Done).
// Talks to the brain only through window.tia (web-bridge.js from Tia's server, static-bridge.js on the public replay site).
// The owner's real phone (Expo app) shares the same desk: what is approved there closes here, and the other way round.
const $ = (id) => document.getElementById(id);
const state = { handled: 0, total: 0, done: 0, running: false, live: false };
const CHANNEL_LABEL = { email: "Email", whatsapp: "WhatsApp", instagram: "Instagram", slack: "Slack", voice: "You asked" };
const KIND_LABEL = { offer: "Offer", order: "Order", reply: "Reply", calendar: "Calendar", task: "Task" };
const params = new URLSearchParams(location.search);
const SHOT = !!params.get("shot");
const reducedMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const eur = (n) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const [i, d] = v.toFixed(2).split(".");
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${d === "00" ? "" : "," + d} €`;
};

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
  $("speechText").textContent = text;
  $("speech").classList.remove("pop");
  void $("speech").offsetWidth;
  $("speech").classList.add("pop");
  if (speak && voice.on) return speakAloud(text);
  if (stage3d && speak) {
    stage3d.setTalking(true);
    setTimeout(() => stage3d.setTalking(false), 1400);
  }
  return Promise.resolve();
}
function showSaid(text) {
  $("said").hidden = !text;
  $("saidText").textContent = text ? `“${text}”` : "";
}
function setVoice(on, persist = true) {
  voice.on = on;
  if (persist) {
    try {
      localStorage.setItem("tia.voice", on ? "on" : "off");
    } catch {}
  }
  $("voiceBtn").textContent = on ? "Voice on" : "Voice off";
  $("voiceBtn").classList.toggle("off", !on);
  if (!on) stopSpeaking();
}
function setMode(kind, text) {
  $("mode").className = `mode ${kind}`;
  $("modeText").textContent = text;
}

// ---------- phone mock-up: no spam ----------
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

// ---------- the desk ----------
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
  const item = id ? document.querySelector(`.item[data-id="${id}"]`) : $("needs").querySelector(".item");
  if (!item) return;
  item.classList.add("open", "flash");
  item.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setTimeout(() => item.classList.remove("flash"), 1500);
}
function dropEmpty(list) {
  list.querySelectorAll(".empty").forEach((e) => e.remove());
}
function ensureEmpty() {
  if (!$("needs").querySelector(".item") && !$("needs").querySelector(".empty"))
    $("needs").appendChild(el("div", "empty", state.total || state.owner ? "Nothing needs you right now. Tell me what you need – I'll prepare it here for your OK." : "Things that need your decision land here, with my draft ready."));
  if (!$("handled").querySelector(".item") && !$("handled").querySelector(".empty")) $("handled").appendChild(el("div", "empty", "Things I finish – and things you approve – land here."));
}

// Inbox message (result from the brain)
function renderItem(r) {
  const node = $("itemTpl").content.firstElementChild.cloneNode(true);
  const m = r.message;
  const p = r.proposal || {};
  node.dataset.id = m.id;
  node.dataset.kind = "message";
  node.querySelector(".dot").classList.add(m.channel);
  node.querySelector(".who").textContent = `${m.from}`;
  node.querySelector(".when").textContent = `${CHANNEL_LABEL[m.channel] || m.channel} · ${m.time}`;
  node.querySelector(".what").textContent = r.error ? `Couldn't process: ${r.error}` : p.summary;
  node.querySelector(".item-head").onclick = () => node.classList.toggle("open");
  node.querySelector(".lines").remove();
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
  if (isUrgent(r) && r.decision !== "handle") node.classList.add("urgent");
  if (r.decision === "escalate" && !r.error) addOwnerButtons(node, { id: m.id, hasText: !!p.draft_reply, text: p.draft_reply, legacy: { message: m, proposal: p } });
  if (r.decision === "handle") node.querySelector(".buttons").appendChild(el("span", "resolved", "Handled by Tia"));
  return node;
}

// Proposal Tia prepared from a voice/typed request (offer, order, …)
function renderProposal(c) {
  const node = $("itemTpl").content.firstElementChild.cloneNode(true);
  node.dataset.id = c.id;
  node.dataset.kind = c.kind;
  node.classList.add("proposal", "open");
  node.querySelector(".dot").classList.add("voice");
  node.querySelector(".who").textContent = c.title || c.from;
  node.querySelector(".when").textContent = `${KIND_LABEL[c.kind] || "Task"} · for ${c.from}`;
  node.querySelector(".what").textContent = c.summary;
  node.querySelector(".item-head").onclick = () => node.classList.toggle("open");
  const lines = node.querySelector(".lines");
  if (c.lines && c.lines.length) {
    for (const l of c.lines) {
      const row = el("div", "line");
      row.append(el("span", null, l.item), el("b", null, eur(l.amount_eur)));
      lines.appendChild(row);
    }
    const tot = el("div", "line total");
    tot.append(el("span", null, "Total"), el("b", null, eur(c.total)));
    lines.appendChild(tot);
  } else lines.remove();
  if (c.text) {
    node.querySelector(".label").textContent = "Message";
    node.querySelector(".draft-text").textContent = c.text;
  } else node.querySelector(".draft").remove();
  node.querySelector(".actions").remove();
  node.querySelector(".reason").remove();
  node.querySelector(".guard").textContent = (c.guard || []).join(" ");
  if (c.sources && c.sources.length) node.querySelector(".sources").textContent = "From your notes: " + c.sources.join(", ");
  if (c.state === "open") addOwnerButtons(node, { id: c.id, hasText: !!c.text, text: c.text, kind: c.kind });
  if (c.kind === "offer" && window.tia.docUrl) {
    const view = el("button", "btn small ghost doc-btn", "Open document");
    view.onclick = () => openDoc(c.id, c.title);
    node.querySelector(".buttons").appendChild(view);
  }
  return node;
}

function addOwnerButtons(node, { id, hasText, text, kind, legacy }) {
  const box = node.querySelector(".buttons");
  const approve = el("button", "btn small ok", kind === "order" ? "Approve order" : hasText ? "Approve & send" : "Approve");
  const edit = el("button", "btn small", "Edit");
  const reject = el("button", "btn small ghost", "Reject");
  box.prepend(approve, ...(hasText ? [edit] : []), reject);
  const resolve = async (verdict, editedText) => {
    [approve, edit, reject].forEach((b) => (b.disabled = true));
    const res = window.tia.decide ? await window.tia.decide(id, verdict, editedText) : await window.tia.feedback({ ...legacy, verdict, editedReply: editedText });
    // Tia's server also sends a "decided" event (that is what the phone sees); the public replay site doesn't.
    if (!window.tia.decide) markDecided(id, verdict, { learn: res, line: null, via: "desktop" });
  };
  approve.onclick = () => resolve("approve");
  reject.onclick = () => resolve("reject");
  edit.onclick = () => {
    const d = node.querySelector(".draft");
    if (!d) return resolve("approve");
    node.classList.add("open");
    const ta = document.createElement("textarea");
    ta.value = text || "";
    d.querySelector(".draft-text").replaceWith(ta);
    ta.focus();
    edit.textContent = "Save & send";
    edit.classList.add("ok");
    approve.remove();
    edit.onclick = () => resolve("edit", ta.value);
  };
}

// A decision was made – here or on the phone. Close the card and move it to Done.
function markDecided(id, verdict, { learn, line, via, kind } = {}) {
  const node = document.querySelector(`.item[data-id="${id}"]`);
  if (!node || node.classList.contains("done")) return;
  const box = node.querySelector(".buttons");
  box.querySelectorAll("button:not(.doc-btn)").forEach((b) => b.remove());
  const learned = learn && learn.needed ? ` · learned ${Math.min(learn.approvals, learn.needed)}/${learn.needed}` : "";
  const where = via === "phone" ? " on your phone" : "";
  const text = verdict === "reject" ? `Rejected${where}` : `${verdict === "edit" ? "Edited and approved" : "Approved"}${where}${learned}`;
  box.prepend(el("span", verdict === "reject" ? "resolved rejected" : "resolved", text));
  node.classList.add("done");
  node.classList.remove("open", "urgent");
  dropEmpty($("handled"));
  $("handled").prepend(node);
  ensureEmpty();
  updateStats();
  if (line) say(line, { speak: via !== "phone" });
  else
    say(
      verdict === "reject" ? "Okay, I won't do that. Noted in your notes." : learn && learn.approvals === learn.needed ? "Got it. I'll answer messages like this myself from now on." : "Thanks, noted in your notes so I learn from it."
    );
  if (verdict !== "reject" && (kind || node.dataset.kind) === "offer" && window.tia.docUrl) openDoc(id, node.querySelector(".who").textContent);
}

function updateStats() {
  const needs = $("needs").querySelectorAll(".item").length;
  $("statHandled").textContent = state.handled;
  $("statNeeds").textContent = needs;
  $("countHandled").textContent = $("handled").querySelectorAll(".item").length;
  $("countNeeds").textContent = needs;
  $("statMinutes").textContent = state.handled * 4;
  $("progressBar").style.width = (state.total ? Math.round((state.done / state.total) * 100) : 0) + "%";
  if (stage3d && stage3d.setCounts) stage3d.setCounts({ inbox: Math.max(0, state.total - state.done), sent: $("handled").querySelectorAll(".resolved:not(.rejected)").length });
}
function clearInbox() {
  // A new day: inbox cards go, cards Tia prepared from your requests stay.
  document.querySelectorAll('.item[data-kind="message"]').forEach((n) => n.remove());
  Object.assign(state, { handled: 0, done: 0, total: 0 });
  resetPhone();
  ensureEmpty();
  updateStats();
  $("progressLabel").textContent = "Inbox waiting";
}
function clearAll() {
  $("needs").innerHTML = "";
  $("handled").innerHTML = "";
  clearInbox();
  showSaid("");
}
function setRunning(on) {
  state.running = on;
  for (const id of ["runBtn", "resetBtn"]) $(id).disabled = on;
}

// ---------- documents ----------
function openDoc(id, title) {
  $("docTitle").textContent = title || "Document";
  $("docFrame").src = window.tia.docUrl(id);
  if (!$("docModal").open) $("docModal").showModal();
}

// ---------- phone pairing ----------
async function openPair(ip) {
  const res = await window.tia.pair(ip);
  $("qr").innerHTML = res.svg || "";
  const list = $("addrList");
  list.innerHTML = "";
  for (const a of res.addresses || []) {
    const b = el("button", "addr-btn" + (res.selected && a.ip === res.selected.ip ? " on" : ""), a.ip);
    b.title = a.name;
    b.type = "button";
    b.onclick = () => openPair(a.ip);
    list.appendChild(b);
  }
  $("webLinkRow").hidden = !res.webLink;
  $("copyLink").onclick = async () => {
    try {
      await navigator.clipboard.writeText(res.webLink);
      $("copied").hidden = false;
      setTimeout(() => ($("copied").hidden = true), 1800);
    } catch {}
  };
  if (!$("pairModal").open) $("pairModal").showModal();
}

// ---------- talking to Tia from the big screen ----------
let thinkingTimer = null;
function setThinking(on) {
  $("stage").classList.toggle("thinking", on);
  $("askbar").classList.toggle("busy", on);
  clearTimeout(thinkingTimer);
  if (on) thinkingTimer = setTimeout(() => setThinking(false), 90000);
}
async function ask(text) {
  text = (text || "").trim();
  if (!text) return;
  $("askInput").value = "";
  showSaid(text);
  setThinking(true);
  say("One moment…", { speak: false });
  const res = await window.tia.say(text);
  if (res.error && !res.heard) {
    setThinking(false);
    say(res.say || res.error);
  }
}
const rec = { media: null, chunks: [], stream: null, started: 0 };
async function micDown(e) {
  e.preventDefault();
  if (rec.media || $("askbar").classList.contains("busy")) return;
  stopSpeaking();
  try {
    rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    say("I can't use the microphone here – type instead.", { speak: false });
    return;
  }
  rec.chunks = [];
  rec.media = new MediaRecorder(rec.stream);
  rec.media.ondataavailable = (ev) => ev.data.size && rec.chunks.push(ev.data);
  rec.media.start();
  rec.started = Date.now();
  $("micBtn").classList.add("on");
  $("recNote").hidden = false;
  showSaid("");
  say("Listening…", { speak: false });
}
async function micUp() {
  if (!rec.media) return;
  const media = rec.media;
  rec.media = null;
  $("micBtn").classList.remove("on");
  $("recNote").hidden = true;
  const stopped = new Promise((r) => (media.onstop = r));
  media.stop();
  await stopped;
  rec.stream.getTracks().forEach((t) => t.stop());
  if (Date.now() - rec.started < 600) return say("Hold the mic while you talk, then let go.", { speak: false });
  const blob = new Blob(rec.chunks, { type: media.mimeType || "audio/webm" });
  setThinking(true);
  say("One moment…", { speak: false });
  const res = await window.tia.voice(blob);
  if (res.error && !res.heard) {
    setThinking(false);
    say(res.say || "I didn't catch that.");
  }
}

// ---------- events from the brain ----------
// Inbox events are queued and animated one at a time; conversation and decisions show at once.
const queue = [];
let draining = false;
let runId = 0;
function onEvent(ev) {
  if (ev.type === "thinking") return; // the stage shows what Tia is reading, in step with the animation
  if (ev.type === "heard") {
    showSaid(ev.text);
    setThinking(true);
    if (ev.via === "phone") say("One moment…", { speak: false });
    return;
  }
  if (ev.type === "reply") {
    setThinking(false); // "heard" already showed the owner's own words
    if (ev.mode === "scripted") setMode("script", "Offline demo script");
    else if (ev.mode === "offline") setMode("script", "Claude unavailable right now");
    else if (ev.mode === "live") setMode("live", state.live);
    if (ev.item) {
      dropEmpty($("needs"));
      $("needs").prepend(renderProposal(ev.item));
      showTab("needs");
      focusItem(ev.item.id);
      updateStats();
    }
    say(ev.say, { speak: ev.via !== "phone" }); // the phone speaks its own answers
    return;
  }
  if (ev.type === "decided") return markDecided(ev.id, ev.verdict, ev);
  if (ev.type === "reset") {
    runId++;
    queue.length = 0;
    stopSpeaking();
    clearAll();
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
    if (run !== runId) continue;
    await handleEvent(ev);
  }
  draining = false;
}
async function handleEvent(ev) {
  if (ev.type === "start") {
    clearInbox();
    setRunning(true);
    state.total = ev.total;
    if (ev.mode === "replay" && !state.isStatic) setMode("script", "Saved real run");
    updateStats();
    await say(ev.mode === "replay" ? "Going through today's inbox." : `Reading ${ev.total} new messages.`, { speak: false });
  } else if (ev.type === "result") {
    const r = ev.result;
    const line = r.error
      ? `I couldn't read the message from ${r.message.from}.`
      : r.decision === "handle"
        ? r.proposal.narration || `Handled: ${r.proposal.summary}`
        : `This one needs you: ${r.proposal.summary}`;
    $("speechText").textContent = `Reading ${CHANNEL_LABEL[r.message.channel] || r.message.channel} from ${r.message.from}…`;
    $("progressLabel").textContent = `Message ${state.done + 1} of ${state.total}`;
    await animate(r);
    state.done++;
    const item = renderItem(r);
    if (r.decision === "handle") {
      state.handled++;
      dropEmpty($("handled"));
      $("handled").prepend(item);
    } else {
      dropEmpty($("needs"));
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
    ensureEmpty();
    await say(`Done. I handled ${s.handled} things myself, about ${s.minutesSaved} minutes saved. ${s.needsYou} need you, and my drafts are ready.`);
    if (SHOT) console.log("TIA-DONE");
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
  showTab("needs");
  setRunning(true);
  await window.tia.run(state.isStatic ? "replay" : mode || "auto");
}

// Rebuild the desk after a page reload (the server keeps it).
async function restore() {
  if (!window.tia.state) return;
  const snap = await window.tia.state();
  for (const c of [...snap.done].reverse()) {
    if (c.kind === "message") continue; // inbox cards come back with the next run
    const n = renderProposal(c);
    $("handled").prepend(n);
    markDecidedQuiet(n, c.state);
  }
  for (const c of [...snap.needs].reverse()) if (c.kind !== "message") $("needs").prepend(renderProposal(c));
  if (snap.mode === "scripted") setMode("script", "Offline demo script");
}
function markDecidedQuiet(node, st) {
  node.classList.add("done");
  node.classList.remove("open");
  node.querySelector(".buttons").prepend(el("span", st === "rejected" ? "resolved rejected" : "resolved", st === "rejected" ? "Rejected" : "Approved"));
}

// A real owner: real name and clock, no demo controls, no phone mock-up (the real phone is the phone).
function setupOwner(info) {
  document.body.classList.add("owner");
  $("business").textContent = info.business || info.owner;
  document.title = `Tia · ${info.owner}`;
  $("phone").hidden = true;
  $("resetBtn").hidden = true;
  if (info.inboxSource === "none") {
    $("runBtn").hidden = true;
    $("progressLabel").textContent = "Inbox not connected yet";
  } else $("runBtn").textContent = "Check inbox";
  const first = String(info.owner || "").split(" ")[0];
  const h = new Date().getHours();
  const greet = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  $("speechText").textContent = `${greet}, ${first}. Hold the mic or type what you need – or say “brief me”.`;
  $("askInput").placeholder = "Hold the mic and talk – or type what you need";
  document.querySelector(".rules").innerHTML = "<strong>Tia's rules</strong> · money, sending and anything new wait for your OK · she reads only the notes that match";
  // keep the clock in the header real
  setInterval(async () => {
    try {
      $("today").textContent = (await window.tia.info()).today;
    } catch {}
  }, 60000);
}

async function init() {
  const info = await window.tia.info();
  state.isStatic = !!info.static;
  $("today").textContent = info.today;
  state.live = info.provider === "api" ? `Claude API · ${info.model}` : `Live · ${info.model}`;
  if (info.static) setMode("script", "Recorded demo · a real Claude run, replayed");
  else setMode("live", state.live);

  state.owner = info.profile === "owner";
  if (state.owner) setupOwner(info);

  const canTalk = !!window.tia.say;
  $("askbar").hidden = !canTalk;
  $("pairBtn").hidden = !window.tia.pair;
  document.body.classList.toggle("can-talk", canTalk);

  window.tia.onEvent(onEvent);
  $("runBtn").onclick = () => start("auto");
  $("resetBtn").onclick = async () => {
    await window.tia.reset();
    if (!window.tia.state) {
      runId++;
      queue.length = 0;
      stopSpeaking();
      clearAll();
    }
    say("Fresh start. I've forgotten what you taught me today.");
  };
  $("voiceBtn").onclick = () => setVoice(!voice.on);
  $("pairBtn").onclick = () => openPair();
  $("printBtn").onclick = () => $("docFrame").contentWindow && $("docFrame").contentWindow.print();
  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach((d) => d.addEventListener("click", (e) => e.target === d && d.close()));
  document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));
  $("askbar").onsubmit = (e) => {
    e.preventDefault();
    ask($("askInput").value);
  };
  $("micBtn").addEventListener("pointerdown", micDown);
  window.addEventListener("pointerup", micUp);
  window.addEventListener("pointercancel", micUp);

  ensureEmpty();
  setVoice(voice.on, false);
  await restore().catch(() => {});
  updateStats();
  if (SHOT) {
    document.body.classList.add("no-anim");
    setVoice(false, false); // screenshot test runs silently (not saved)
  }
  const autorun = params.get("autorun");
  if (autorun === "replay" || autorun === "live") start(autorun);
}

init();

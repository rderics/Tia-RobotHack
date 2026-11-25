// One shared "desk" for every screen: the big desktop screen and the owner's phone see the same items,
// the same conversation and the same decisions. Approve on the phone → the card closes on the desktop too.
const engine = require("./brain/engine");
const { loadConfig } = require("./brain/config");
const { contextFor, logActivity } = require("./brain/vault");
const outlook = require("./connectors/outlook");
const { runCommand, liveBlocked } = require("./brain/command");
const { chat: chatModel } = require("./brain/providers");
const actions = require("./actions");
const { offerHtml, contractHtml } = require("./actions/documents");

const URGENT_CATEGORIES = new Set(["payment_change", "complaint"]);

const desk = {
  version: 1,
  items: [], // inbox results and proposals from commands
  feed: [], // conversation: { who: "owner" | "tia", text, at, via }
  run: { running: false, done: 0, total: 0, mode: null },
  thinking: false,
};
let seq = 0;
const listeners = new Set(); // desktop event streams
const waiters = new Set(); // phone long-polls

function bump() {
  desk.version++;
  for (const w of waiters) w();
  waiters.clear();
}
function emit(ev) {
  for (const fn of listeners) fn(ev);
}
function onEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function waitForChange(sinceVersion, ms) {
  if (desk.version !== sinceVersion) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t);
      waiters.delete(done);
      resolve();
    };
    const t = setTimeout(done, ms);
    waiters.add(done);
  });
}
function say(text, via) {
  desk.feed.push({ who: "tia", text, at: Date.now(), via });
  desk.feed = desk.feed.slice(-40);
}

// ---------- the inbox run ----------
function onEngineEvent(ev) {
  if (ev.type === "start") {
    desk.items = desk.items.filter((i) => i.kind !== "message");
    desk.run = { running: true, done: 0, total: ev.total, mode: ev.mode };
  } else if (ev.type === "result") {
    const r = ev.result;
    desk.items.push({
      id: r.message.id,
      kind: "message",
      state: r.decision === "handle" ? "handled" : "open",
      at: Date.now(),
      result: r,
    });
    desk.run.done++;
  } else if (ev.type === "done") {
    desk.run.running = false;
    const s = ev.summary;
    say(`Inbox done. I handled ${s.handled} myself and ${s.needsYou} need you.`, "system");
  } else if (ev.type === "error") {
    desk.run.running = false;
  }
  if (ev.type !== "thinking") bump();
  emit(ev);
}

// mode "auto": live Claude when it is reachable, otherwise the saved real run (replay).
async function runDay(mode) {
  if (desk.run.running) throw new Error("Tia is already working on the inbox");
  const auto = mode === "auto";
  if (auto && loadConfig().profile === "owner") {
    if (liveBlocked()) throw new Error("My Claude allowance is used up for now, so I can't read your inbox yet.");
    mode = "live";
  } else if (auto) mode = loadConfig().commandMode === "scripted" || liveBlocked() || !engine.info().canGoLive ? "replay" : "live";
  desk.run.running = true;
  try {
    try {
      await engine.runDay({ mode, onEvent: onEngineEvent, stopOnLimit: auto });
    } catch (e) {
      if (!(auto && e.code === "LIMIT")) throw e;
      if (loadConfig().profile === "owner") throw new Error("My Claude allowance is used up for now, so I can't read your inbox yet. I'll be able to again when it resets.");
      console.log(`Claude limit reached – playing the saved real run instead (${e.message})`);
      await engine.runDay({ mode: "replay", onEvent: onEngineEvent });
    }
  } catch (e) {
    onEngineEvent({ type: "error", error: String(e.message || e) });
    throw e;
  }
}

// ---------- decisions (from any screen) ----------
async function decide({ id, verdict, editedText, via }) {
  const item = desk.items.find((i) => i.id === id);
  if (!item) throw new Error("That item is gone (the demo was reset).");
  if (item.state !== "open") return { already: true, state: item.state };
  let learn = null;
  let line;
  if (item.kind === "message") {
    const r = item.result;
    const reply = verdict === "edit" ? editedText : r.proposal && r.proposal.draft_reply;
    learn = engine.recordFeedback({ message: r.message, proposal: r.proposal, verdict, editedReply: editedText });
    if (verdict === "reject") line = `Okay, I won't answer ${r.message.from}.`;
    else if (!reply) line = `Noted for ${r.message.from}.`;
    else if (r.message.entryId || r.message.channel === "email") {
      line = `I'm writing my reply to ${r.message.from} in Outlook now – it stays a draft, you press Send.`;
      act(item, async (step) => {
        await actions.outlook(loadConfig(), { to: r.message.address || r.message.from, subject: r.message.subject ? `Re: ${r.message.subject}` : "", text: reply, replyTo: r.message.entryId ? r.message : null, save: !!r.message.entryId }, step);
      });
    } else if (r.message.channel === "whatsapp") {
      line = `I've opened WhatsApp with my reply to ${r.message.from} typed in – you press send.`;
      act(item, async (step) => actions.whatsapp(loadConfig(), { phone: r.message.address, text: reply }, step));
    } else line = `My reply to ${r.message.from} is ready – copy it into ${r.message.channel === "instagram" ? "Instagram" : r.message.channel === "slack" ? "Slack" : "the chat"}; I never post by myself.`;
  } else {
    const p = item.proposal;
    const cfg = loadConfig();
    if (verdict === "reject") {
      logActivity(cfg.notesDir, `Owner rejected: ${p.title}`);
      line = `Okay, I've dropped the ${p.kind}.`;
    } else {
      if (verdict === "edit" && editedText) p.message_text = editedText;
      logActivity(cfg.notesDir, `Owner approved ${p.kind}: ${p.title}${p.total_eur ? ` (${p.total_eur} €)` : ""}`);
      if (p.kind === "offer" || p.kind === "contract") {
        line = `Making the ${p.kind} as a PDF now – then it goes to the printer and into an Outlook draft for ${p.to}. You press Send.`;
        act(item, (step) => documentFlow(cfg, item, step));
      } else {
        const what = { reply: "Reply drafted", calendar: "Booked in the calendar (demo)", order: "Order basket ready – Elīna places and pays it", task: "Task created" }[p.kind] || "Done";
        line = `${what}.`;
      }
    }
  }
  item.state = verdict === "reject" ? "rejected" : verdict === "edit" ? "edited" : "approved";
  item.decidedVia = via;
  say(line, via);
  bump();
  emit({ type: "decided", id, verdict, via, learn, line, kind: item.kind });
  return { ok: true, state: item.state, say: line, learn };
}


// ---------- real actions (Outlook window, PDF, printer, WhatsApp), visible on the owner's computer ----------
// They run after the answer is sent, step by step; every step is an event the screen (and phone) can animate.
function act(item, fn) {
  const steps = (item.actions = []);
  const step = (s) => {
    const prev = steps.find((x) => x.step === s.step);
    if (prev) Object.assign(prev, s);
    else steps.push({ ...s });
    bump();
    emit({ type: "action", id: item.id, ...s });
  };
  Promise.resolve()
    .then(() => fn(step))
    .catch((e) => {
      const msg = String((e && e.message) || e);
      const running = steps.find((x) => x.status === "start");
      step({ step: running ? running.step : "action", status: "error", detail: msg });
      say(/outlook/i.test(msg) ? "Outlook isn't available on this computer, so the draft stays on the screen." : `That step didn't work: ${msg}`, "system");
    });
}

let docCounter = 0;
async function documentFlow(cfg, item, step) {
  const p = item.proposal;
  const info = engine.info();
  const c = card(item);
  const day = new Date(Date.parse(String(info.today || "").replace(/^[A-Za-z]+,?\s*/, "").split(",")[0]) || Date.now()); // the demo's "today"
  const date = day.toLocaleDateString("en-GB").replace(/\//g, ".");
  let html;
  let name;
  if (p.kind === "contract") {
    const no = `OS-${new Date().getFullYear()}-${String(++docCounter + 40).padStart(3, "0")}`;
    html = contractHtml(info, cfg, p, { contractNo: no, date });
    name = `Contract ${no} – ${p.to}`;
  } else {
    html = offerHtml(info, { ...c, state: "approved" });
    name = `Offer – ${p.to} – ${date}`;
  }
  const file = await actions.pdf(cfg, { html, name }, step);
  item.document = file;
  await actions.print(cfg, file, step).catch((e) => step({ step: "print", status: "error", detail: e.message }));
  // the client's email address from their vault note (the model gives the name)
  let to = (p.to_email || "").trim();
  if (!to) {
    try {
      const note = require("fs").readFileSync(require("path").join(cfg.vaultDir, "Clients", `${p.to}.md`), "utf8");
      to = (note.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0] || "";
    } catch {}
  }
  to = to || p.to;
  await actions.outlook(cfg, { to, subject: `${p.kind === "contract" ? "Contract" : "Offer"} – ${info.business}`, text: p.message_text || `Hello,\n\nplease find the ${p.kind} attached.\n\nTia, assistant to ${info.owner}`, attach: [file] }, step);
  logActivity(cfg.notesDir, `${p.kind} PDF made, printed and put in an Outlook draft: ${name}`);
}

// ---------- voice / typed commands ----------
function deskForPrompt() {
  return desk.items.map((i) => {
    const c = card(i);
    return { state: i.state === "open" ? "needs owner" : i.state, from: c.from, summary: c.summary };
  });
}

async function command(text, via) {
  text = String(text || "").trim().slice(0, 600);
  if (!text) throw new Error("I didn't catch anything.");
  if (desk.thinking) throw new Error("One moment – I'm still on the last request.");
  const history = desk.feed.filter((f) => f.via !== "system").slice(-6);
  desk.feed.push({ who: "owner", text, at: Date.now(), via });
  desk.thinking = true;
  bump();
  emit({ type: "heard", text, via });
  try {
    const cfg = loadConfig();
    const ctx = contextFor(cfg, [text, ...history.map((h) => h.text)].join(" "));
    const res = await runCommand(cfg, {
      vaultContext: ctx.text,
      today: engine.info().today,
      desk: deskForPrompt(),
      history,
      text,
    });
    let item = null;
    const p = res.proposal;
    if (p && p.kind !== "none") {
      item = { id: `c${++seq}`, kind: p.kind, state: "open", at: Date.now(), proposal: p, sources: res.vault_sources && res.vault_sources.length ? res.vault_sources : ctx.sources };
      desk.items.push(item);
    }
    say(res.say, via);
    desk.thinking = false;
    bump();
    const out = { heard: res.heard_as || text, say: res.say, question: res.missing_info || "", item: item ? card(item) : null, mode: res.mode };
    desk.mode = res.mode;
    if (res.mode !== "live") console.log(`Command answered without Claude – ${res.mode} (${res.why})`);
    emit({ type: "reply", via, ...out });
    return out;
  } catch (e) {
    desk.thinking = false;
    const msg = "Sorry, I couldn't do that just now.";
    say(msg, via);
    bump();
    emit({ type: "reply", via, heard: text, say: msg, question: "", item: null, error: String(e.message || e) });
    throw e;
  }
}

// Free chat (used by the OpenJarvis-based screens): answers from the owner's notes, says which ones.
async function chat(messages) {
  const cfg = loadConfig();
  const turns = (messages || []).filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content).slice(-12);
  const last = [...turns].reverse().find((m) => m.role === "user");
  if (!last) throw new Error("Nothing to answer.");
  const ctx = contextFor(cfg, turns.filter((m) => m.role === "user").slice(-3).map((m) => m.content).join(" "));
  const owner = cfg.profile === "owner" ? `${cfg.owner}` : `the owner of ${cfg.business}`;
  const system = `You are Tia, the AI personal secretary of ${owner}. Today is ${engine.info().today}.
Use the owner's notes below as your knowledge of their world. Facts about people, projects, dates and money must come from these notes or the conversation; if they are not there, say you don't have it in the notes. Never invent. Never claim to have sent, paid or booked anything – you prepare, the owner approves.
Answer warmly and briefly, in the same language as the owner's last message (even when the notes are in another language). End with "Notes: <names of the notes you used>" when you used any.

THE OWNER'S NOTES:
${ctx.text}`;
  const convo = turns.map((m) => `${m.role === "user" ? "OWNER" : "TIA"}: ${m.content}`).join("\n\n");
  const r = await chatModel(cfg, { system, prompt: `${convo}\n\nReply as TIA to the owner's last message.` });
  return { content: r.text, sources: ctx.sources, via: r.via };
}

function reset() {
  engine.resetDemo();
  desk.items = [];
  desk.feed = [];
  desk.run = { running: false, done: 0, total: 0, mode: null };
  desk.thinking = false;
  bump();
  emit({ type: "reset" });
}

// ---------- what screens get ----------
function isUrgent(r) {
  const p = r.proposal || {};
  return URGENT_CATEGORIES.has(p.category) || /phish|fraud|scam|suspicious/i.test(`${p.summary} ${p.reason}`);
}
function card(i) {
  if (i.kind === "message") {
    const r = i.result;
    const p = r.proposal || {};
    return {
      id: i.id,
      kind: "message",
      state: i.state,
      from: r.message.from,
      channel: r.message.channel,
      time: r.message.time,
      summary: r.error ? "I couldn't process this one" : p.summary,
      reason: p.reason || "",
      text: p.draft_reply || "",
      approveLabel: r.message.entryId ? "Save as draft" : "",
      mailbox: r.message.mailbox || "",
      guard: r.guardNotes || [],
      sources: p.vault_sources || [],
      money: p.money_eur || 0,
      urgent: isUrgent(r),
      narration: p.narration || "",
      actions: i.actions || [],
    };
  }
  const p = i.proposal;
  return {
    id: i.id,
    kind: p.kind,
    state: i.state,
    from: p.to || "You",
    channel: "voice",
    time: new Date(i.at).toTimeString().slice(0, 5),
    title: p.title,
    summary: p.summary,
    reason: "",
    text: p.message_text || "",
    lines: p.lines || [],
    total: p.total_eur || 0,
    validUntil: p.valid_until || "",
    when: p.when || "",
    guard: [p.kind === "offer" || p.kind === "order" || p.kind === "contract" ? "Money involved – nothing goes out without you." : "Waiting for your OK."],
    sources: i.sources || [],
    money: p.total_eur || 0,
    urgent: false,
    actions: i.actions || [],
    document: i.document ? require("path").basename(i.document) : "",
  };
}
function snapshot() {
  const info = engine.info();
  const cards = desk.items.map(card);
  const handled = cards.filter((c) => c.state === "handled").length;
  return {
    version: desk.version,
    business: info.business,
    owner: info.owner,
    profile: info.profile,
    inboxSource: info.inboxSource,
    publicUrl: loadConfig().publicUrl || null,
    suggestions:
      info.profile === "owner"
        ? ["Brief me", "What needs me today?"]
        : ["Prepare Ieva's kitchen offer", "What needs me today?", "Order the team lunch", "Brief me"],
    today: info.today,
    run: desk.run,
    thinking: desk.thinking,
    mode: desk.mode || "live",
    stats: { handled, needs: cards.filter((c) => c.state === "open").length, minutes: handled * loadConfig().minutesSavedPerItem },
    needs: cards.filter((c) => c.state === "open").reverse(),
    done: cards.filter((c) => c.state !== "open").reverse(),
    feed: desk.feed.slice(-20),
  };
}
function getItem(id) {
  const i = desk.items.find((x) => x.id === id);
  return i ? card(i) : null;
}

const rawItem = (id) => desk.items.find((x) => x.id === id) || null;

module.exports = { runDay, decide, command, chat, reset, snapshot, getItem, rawItem, onEvent, waitForChange };

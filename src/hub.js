// One shared "desk" for every screen: the big desktop screen and the owner's phone see the same items,
// the same conversation and the same decisions. Approve on the phone → the card closes on the desktop too.
const engine = require("./brain/engine");
const { loadConfig } = require("./brain/config");
const { contextFor, logActivity } = require("./brain/vault");
const outlook = require("./connectors/outlook");
const { runCommand, liveBlocked } = require("./brain/command");

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
    if (verdict !== "reject" && reply && r.message.entryId) {
      // A real mailbox: the reply goes to Outlook Drafts. Tia never presses Send.
      await outlook.saveDraft(loadConfig(), r.message, reply);
    }
    learn = engine.recordFeedback({ message: r.message, proposal: r.proposal, verdict, editedReply: editedText });
    line =
      verdict === "reject"
        ? `Okay, I won't answer ${r.message.from}.`
        : r.message.entryId
          ? reply
            ? `Saved my reply to ${r.message.from} in your Outlook drafts – you press Send.`
            : `Noted for ${r.message.from}.`
          : `Done, my reply to ${r.message.from} is sent.`;
  } else {
    const p = item.proposal;
    const cfg = loadConfig();
    if (verdict === "reject") {
      logActivity(cfg.notesDir, `Owner rejected: ${p.title}`);
      line = `Okay, I've dropped the ${p.kind}.`;
    } else {
      if (verdict === "edit" && editedText) p.message_text = editedText;
      const what = { offer: "Offer sent", reply: "Reply sent", calendar: "Booked", order: "Order placed", task: "Task created" }[p.kind] || "Done";
      logActivity(cfg.notesDir, `Owner approved ${p.kind}: ${p.title}${p.total_eur ? ` (${p.total_eur} €)` : ""} → ${what.toLowerCase()} (simulated)`);
      line = p.kind === "offer" ? `${what} to ${p.to}. The printable copy is ready on the big screen.` : `${what}.`;
    }
  }
  item.state = verdict === "reject" ? "rejected" : verdict === "edit" ? "edited" : "approved";
  item.decidedVia = via;
  say(line, via);
  bump();
  emit({ type: "decided", id, verdict, via, learn, line, kind: item.kind });
  return { ok: true, state: item.state, say: line, learn };
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
    guard: [p.kind === "offer" || p.kind === "order" ? "Money involved – nothing goes out without you." : "Waiting for your OK."],
    sources: i.sources || [],
    money: p.total_eur || 0,
    urgent: false,
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

module.exports = { runDay, decide, command, reset, snapshot, getItem, onEvent, waitForChange };

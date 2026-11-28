// One shared "desk" for every screen: the big desktop screen and the owner's phone see the same items,
// the same conversation and the same decisions. Approve on the phone → the card closes on the desktop too.
const engine = require("./brain/engine");
const { loadConfig } = require("./brain/config");
const { contextFor, logActivity } = require("./brain/vault");
// Live: every time Tia reads the vault, the screen hears which notes (Business vault tab + graph glow).
require("./brain/vault").onRead(({ query, sources }) => emit({ type: "vault-read", query, sources, at: Date.now() }));
const outlook = require("./connectors/outlook");
const { runCommand, liveBlocked } = require("./brain/command");
const { chat: chatModel } = require("./brain/providers");
const actions = require("./actions");
const leads = require("./leads/finder");
const { offerHtml, contractHtml } = require("./actions/documents");

const URGENT_CATEGORIES = new Set(["payment_change", "complaint"]);

// One desk per screen session. The owner's Tia has one (MAIN); the public demo (TIA_GUEST=1) gives every visitor
// their own desk, event stream and state – picked per request with AsyncLocalStorage (web.js runInSession).
const { AsyncLocalStorage } = require("async_hooks");
const als = new AsyncLocalStorage();
const GUEST = () => process.env.TIA_GUEST === "1";
const newDesk = () => ({ version: 1, items: [], feed: [], run: { running: false, done: 0, total: 0, mode: null }, thinking: false });
const MAIN = { desk: newDesk(), listeners: new Set(), waiters: new Set(), seen: Date.now(), calls: [] };
const sessions = new Map();
const cur = () => als.getStore() || MAIN;
const desk = new Proxy({}, {
  get: (_, k) => cur().desk[k],
  set: (_, k, v) => ((cur().desk[k] = v), true),
});
function session(id) {
  let s = sessions.get(id);
  if (!s) {
    if (sessions.size >= 300) {
      const oldest = [...sessions.entries()].sort((a, b) => a[1].seen - b[1].seen)[0];
      if (oldest) sessions.delete(oldest[0]);
    }
    s = { desk: newDesk(), listeners: new Set(), waiters: new Set(), seen: Date.now(), calls: [] };
    sessions.set(id, s);
  }
  s.seen = Date.now();
  return s;
}
const runInSession = (id, fn) => als.run(session(id), fn);
setInterval(() => {
  for (const [id, s] of sessions) if (Date.now() - s.seen > 45 * 60e3 && !s.listeners.size) sessions.delete(id);
}, 10 * 60e3).unref();
// public demo: at most N AI requests per visitor per hour, and per hour for everyone together
function allowCall(perVisitor = 30, all = 400) {
  const s = cur();
  const hour = Date.now() - 3600e3;
  s.calls = s.calls.filter((t) => t > hour);
  let total = 0;
  for (const x of sessions.values()) total += x.calls.filter((t) => t > hour).length;
  if (s.calls.length >= perVisitor || total >= all) return false;
  s.calls.push(Date.now());
  return true;
}
let seq = 0;

function bump() {
  desk.version++;
  const ws = cur().waiters;
  for (const w of ws) w();
  ws.clear();
}
function emit(ev) {
  for (const fn of cur().listeners) fn(ev);
}
function onEvent(fn) {
  const ls = cur().listeners;
  ls.add(fn);
  return () => ls.delete(fn);
}
function waitForChange(sinceVersion, ms) {
  if (desk.version !== sinceVersion) return Promise.resolve();
  const W = cur().waiters;
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t);
      W.delete(done);
      resolve();
    };
    const t = setTimeout(done, ms);
    W.add(done);
  });
}
function say(text, via) {
  desk.feed.push({ who: "tia", text, at: Date.now(), via });
  desk.feed = desk.feed.slice(-40);
}

// ---------- the inbox run ----------
function onEngineEvent(ev) {
  if (desk.stopped && ev.type !== "start") return; // after Stop nothing more reaches the screens
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
  desk.stopped = false;
  try {
    try {
      await engine.runDay({ mode, onEvent: onEngineEvent, stopOnLimit: auto, shouldStop: () => desk.stopped });
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

// ---------- Stop: the owner's big red button – nothing new starts, waiting screen jobs are dropped ----------
function stop(via = "desktop") {
  desk.stopped = true;
  const wasRunning = desk.run.running;
  desk.run.running = false;
  desk.thinking = false;
  for (const fn of [...screenJobs.values()]) fn({ ok: false, error: "Stopped by the owner" });
  bump();
  emit({ type: "stopped", via, at: Date.now() });
  if (wasRunning) logActivity(loadConfig().notesDir, "Owner pressed Stop – the inbox run was stopped");
  return { ok: true, wasRunning };
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
    else if (r.message.source === "gmail") {
      line = `I'm saving my reply to ${r.message.from} as a Gmail draft and opening it – you press Send.`;
      act(item, async (step) => {
        step({ step: "gmail", status: "start", detail: `Writing the Gmail draft to ${r.message.from}` });
        await require("./connectors/composio").gmailDraft({ to: r.message.address, subject: r.message.subject ? `Re: ${r.message.subject.replace(/^re:\s*/i, "")}` : "", body: reply, threadId: r.message.threadId });
        actions.open(r.message.threadId ? `https://mail.google.com/mail/u/0/#all/${r.message.threadId}` : "https://mail.google.com/mail/u/0/#drafts");
        step({ step: "gmail", status: "done", detail: "Draft saved in Gmail and opened – you press Send" });
      });
    } else if (r.message.entryId || r.message.channel === "email") {
      line = `I'm writing my reply to ${r.message.from} in Outlook now – it stays a draft, you press Send.`;
      act(item, async (step) => {
        await actions.outlook(loadConfig(), { to: r.message.address || r.message.from, subject: r.message.subject ? `Re: ${r.message.subject}` : "", text: reply, replyTo: r.message.entryId ? r.message : null, save: !!r.message.entryId }, step);
      });
    } else if (r.message.channel === "whatsapp" && r.message.waId && require("./connectors/whatsapp").canSend()) {
      // a real WhatsApp Business chat: approved = sent from the business number
      line = `Sending my reply to ${r.message.from} on WhatsApp now.`;
      act(item, async (step) => {
        step({ step: "whatsapp", status: "start", detail: `Sending to ${r.message.from} on WhatsApp` });
        await require("./connectors/whatsapp").send(loadConfig(), r.message.waId, reply);
        step({ step: "whatsapp", status: "done", detail: `Sent on WhatsApp to ${r.message.from}` });
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
      if (p.kind === "whatsapp" && p.message_text && GUEST()) {
        line = `In the public demo nothing is sent – this is the WhatsApp Tia would send to ${p.to} from your number, after your tap.`;
      } else if (p.kind === "whatsapp" && p.message_text) {
        // the owner approved it → it goes out from the business WhatsApp number (or wa.me if this PC can't send)
        const W = require("./connectors/whatsapp");
        const digits = String(p.to || "").replace(/[^\d]/g, "");
        const chat = digits.length >= 8 && !(cfg.whatsappOnly || []).length ? { waId: digits, name: p.to } : W.findChat(cfg, p.to);
        const WL = require("./connectors/wa-link");
        const allowed = chat && W.allowedChat(cfg, chat.waId);
        if (chat && allowed && !WL.connected() && cur().listeners.size) {
          // the owner's WhatsApp Web inside the desktop app: Tia opens the chat on screen, types it and presses Send
          line = `Sending it to ${chat.name || p.to} in WhatsApp now.`;
          act(item, async (step) => {
            step({ step: "whatsapp", status: "start", detail: `Opening ${chat.name || p.to} in WhatsApp` });
            const r = await screenSend(chat.name || p.to, p.message_text);
            if (!r.ok) throw new Error(r.error || "WhatsApp on the screen didn't answer");
            step({ step: "whatsapp", status: "done", detail: `Sent on WhatsApp to ${r.chat || chat.name || p.to}` });
          });
        } else if (W.canSend() && chat && allowed) {
          line = `Sending it to ${p.to} on WhatsApp now.`;
          act(item, async (step) => {
            step({ step: "whatsapp", status: "start", detail: `Sending to ${chat.name || p.to} on WhatsApp` });
            await W.send(cfg, chat.waId, p.message_text);
            emit({ type: "whatsapp-sent", chat: chat.waId, at: Date.now() });
            step({ step: "whatsapp", status: "done", detail: `Sent on WhatsApp to ${chat.name || p.to}` });
          });
        } else if (W.canSend() && (cfg.whatsappOnly || []).length) {
          line = `For the demo I only message ${cfg.whatsappOnly.map((o) => o.name).join(", ")} on WhatsApp – not ${p.to}.`;
        } else if (W.canSend()) {
          line = `I don't have ${p.to}'s WhatsApp yet – they need to message the business number once, or tell me the number.`;
        } else {
          line = `I've opened WhatsApp with the message to ${p.to} typed in – you press send.`;
          act(item, async (step) => actions.whatsapp(cfg, { phone: digits, text: p.message_text }, step));
        }
      } else if (p.kind === "offer" || p.kind === "contract") {
        line = `Making the ${p.kind} as a PDF now – then it goes to the printer and into an Outlook draft for ${p.to}. You press Send.`;
        act(item, (step) => documentFlow(cfg, item, step));
      } else {
        if (p.kind === "reply" && p.message_text) {
          line = `I'm writing the email to ${p.to} in Outlook now – you press Send.`;
          act(item, async (step) => {
            await actions.outlook(cfg, { to: p.to_email || p.to, subject: `${engine.info().business} – kitchens for your clients`, text: p.message_text }, step);
            if ((item.sources || []).includes("CRM")) {
              const { loadCrm, saveCrm } = leads;
              const rows = loadCrm(cfg);
              const row = rows.find((r) => r.name === p.to);
              if (row) (row.status = "draft ready"), saveCrm(cfg, rows);
              await leads.setStatus(p.to, "draft ready").catch(() => {});
              step({ step: "crm", status: "done", detail: `${p.to}: status → draft ready` });
            }
          });
        } else {
          const what = { calendar: "Booked in the calendar (demo)", order: "Order basket ready – Elīna places and pays it", task: "Task created" }[p.kind] || "Done";
          line = `${what}.`;
        }
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


// WhatsApp through the screen: the desktop app types into the real WhatsApp Web and reports back (POST live/whatsapp/screen-result)
const screenJobs = new Map();
function screenSend(name, text) {
  const id = `ws${Date.now()}`;
  return new Promise((resolve) => {
    const t = setTimeout(() => (screenJobs.delete(id), resolve({ ok: false, error: "WhatsApp on the screen didn't answer in time – is WhatsApp logged in inside Tia?" })), 60000);
    screenJobs.set(id, (r) => (clearTimeout(t), screenJobs.delete(id), resolve(r || { ok: false })));
    emit({ type: "ui", tab: "whatsapp", waSend: { id, name, text, dryRun: process.env.TIA_WA_DRYRUN === "1" } }); // dry run = tests only
  });
}
function screenResult(b) {
  const fn = screenJobs.get(String((b && b.id) || ""));
  if (fn) fn({ ok: !!b.ok, error: b.error || "", chat: b.chat || "" });
  return { ok: !!fn };
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
async function makeDocument(cfg, item, step) {
  const p = item.proposal;
  const info = engine.info();
  const c = card(item);
  const day = new Date(Date.parse(String(info.today || "").replace(/^[A-Za-z]+,?\s*/, "").split(",")[0]) || Date.now());
  const date = day.toLocaleDateString("en-GB").replace(/\//g, ".");
  let html;
  let name;
  if (p.kind === "contract") {
    // next free number after the PDFs already made (survives restarts)
    let max = 40 + docCounter;
    try {
      for (const f of require("fs").readdirSync(actions.docsDir(cfg))) {
        const m = f.match(/OS-\d{4}-(\d{3})/);
        if (m) max = Math.max(max, Number(m[1]));
      }
    } catch {}
    docCounter++;
    const no = `OS-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`;
    html = contractHtml(info, cfg, p, { contractNo: no, date });
    name = `${p.lines && p.lines.length ? "Contract" : "Partnership agreement"} ${no} – ${p.to}`;
  } else {
    html = offerHtml(info, { ...c, state: "approved" });
    name = `Offer – ${p.to} – ${date}`;
  }
  const file = await actions.pdf(cfg, { html, name }, step);
  item.document = file;
  return file;
}
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


// ---------- lead finder: web → AI fit score → CRM, visible step by step; outreach only as drafts ----------
function leadSearch(cfg, item, text) {
  // the owner's Google Sheet (or Tia's own /crm page) opens and fills in row by row
  emit({ type: "ui", tab: "leads" }); // the CRM tab inside Tia fills in row by row
  act(item, async (step) => {
    const r = await leads.findLeads(cfg, { text, limit: cfg.leadLimit || 6 }, step);
    item.state = "handled";
    item.result = r;
    const best = r.added.filter((l) => l.fit >= 60 && l.opener).sort((a, b) => b.fit - a.fit).slice(0, 2);
    for (const l of best) {
      const info = engine.info();
      desk.items.push({
        id: `c${++seq}`, kind: "reply", state: "open", at: Date.now(), sources: ["CRM", "OpenStreetMap"],
        proposal: {
          kind: "reply", title: `First email to ${l.name}`, to: l.name, to_email: l.email || "",
          summary: `New ${l.segment.replace(/s$/, "")} lead (fit ${l.fit}%): ${l.why}`,
          message_text: `Hello,\n\n${l.opener}\n\nWe are ${info.business}, a kitchen and built-in furniture studio in Riga. If your clients ever need a kitchen or wardrobes made to measure, we would be glad to help – measurement is free and we keep our dates.\n\nWould a short call next week work for you?\n\nBest regards,\nTia, assistant to ${info.owner} – ${info.business}`,
          lines: [], total_eur: 0, valid_until: "", when: "",
        },
      });
    }
    logActivity(cfg.notesDir, `Lead search "${r.label}": ${r.found} found, ${r.added.length} added to the CRM, ${best.length} outreach drafts waiting for approval`);
    say(`Done: I added ${r.added.length} ${r.label} to the CRM${best.length ? ` – the best ${best.length} have a first email ready for your OK` : ""}.`, "system");
  });
}
const actionsOn = (cfg) => (cfg.actions || {}).show !== false;

// ---------- voice / typed commands ----------
function deskForPrompt(cfg) {
  const out = desk.items.map((i) => {
    const c = card(i);
    return { state: i.state === "open" ? "needs owner" : i.state, from: c.from, summary: c.summary };
  });
  // the CRM's newest leads and the last person/company Tia wrote to – so "the newest lead" / "the latest company" resolve
  try {
    // only leads Tia can actually write to (an email address), newest first – "the newest lead" = the first one here
    for (const r of leads.loadCrm(cfg).filter((x) => x.email).slice(0, 5)) out.push({ state: "CRM lead", from: r.name, summary: `${r.segment || "lead"}, fit ${r.fit || 0}%, ${r.email}, found ${r.found_at || ""}${r.status ? `, status ${r.status}` : ""}${r.why ? `. Why they fit: ${r.why}` : ""}` });
  } catch {}
  if (desk.lastContact) out.push({ state: "LATEST COMPANY WE INTERACTED WITH", from: desk.lastContact.name, summary: `${desk.lastContact.what} ${desk.lastContact.email ? `(${desk.lastContact.email})` : ""}` });
  return out;
}

// who is this? → an email address from the CRM (leads) or the client's vault note
function contactFor(cfg, name) {
  const n = String(name || "").trim().toLowerCase();
  const rows = leads.loadCrm(cfg);
  const row = rows.find((r) => r.name.toLowerCase() === n) || rows.find((r) => n && (r.name.toLowerCase().includes(n) || n.includes(r.name.toLowerCase())));
  if (row) return { name: row.name, email: row.email || "", lead: row };
  try {
    const note = require("fs").readFileSync(require("path").join(cfg.vaultDir, "Clients", `${name}.md`), "utf8");
    return { name, email: (note.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0] || "" };
  } catch {}
  return { name: name || "", email: "" };
}

// "write a draft to …" – the owner asked, so the draft is made right away (a draft is never sent)
function draftNow(cfg, item, app, text) {
  const p = item.proposal;
  if (GUEST()) {
    // public demo: no mail account is connected – the draft is shown on Tia's card, nothing leaves this server
    item.state = "approved";
    act(item, async (step) => step({ step: "draft", status: "done", detail: `Draft ready (public demo – nothing is sent). With your own Tia it lands in your ${app === "gmail" ? "Gmail" : "Outlook"} drafts.` }));
    return;
  }
  const who = contactFor(cfg, p.to);
  const id = `cmd_${Date.now()}`;
  item.state = "approved";
  desk.lastContact = { name: who.name || p.to, email: who.email, what: `${app === "gmail" ? "Gmail" : "Outlook"} draft: ${p.title}` };
  act(item, async (step) => {
    const L = require("./connectors/live");
    step({ step: app, status: "start", detail: app === "gmail" ? `Writing the Gmail draft to ${who.name || p.to}` : `Outlook is opening – writing to ${who.name || p.to}` });
    if (app === "gmail" && !who.email) throw new Error(`I have no email address for ${who.name || p.to} – add it in the CRM, or say "Outlook draft"`);
    if (app === "gmail") emit({ type: "ui", tab: "email", folder: "drafts", acct: "gmail" });
    await L.saveDraft(cfg, { app, id, isNew: true, to: who.email || who.name || p.to, subject: p.title || `Hello from ${cfg.business || engine.info().business}`, text: p.message_text || text, attach: p.attach || [] });
    step({ step: app, status: "done", detail: `Draft saved in ${app === "gmail" ? "Gmail" : "Outlook"} – you press Send` });
    if (who.lead) {
      const rows = leads.loadCrm(cfg);
      const row = rows.find((r) => r.name === who.lead.name);
      if (row) (row.status = "draft ready"), leads.saveCrm(cfg, rows);
    }
    emit({ type: "ui", tab: "email", folder: "drafts", acct: app, select: id });
    logActivity(cfg.notesDir, `${app} draft to ${who.name || p.to}: ${p.title}`);
  });
}

// "write a contract for …" – the PDF is made right away and shown in Docs (printing only when the owner asks)
function contractNow(cfg, item) {
  const p = item.proposal;
  item.state = "approved";
  const who = contactFor(cfg, p.to);
  act(item, async (step) => {
    const file = await makeDocument(cfg, item, step);
    desk.lastDoc = { file, to: who.name || p.to, email: who.email, kind: p.kind, title: p.title, message_text: p.message_text, at: Date.now() };
    desk.lastContact = { name: who.name || p.to, email: who.email, what: `${p.title}` };
    emit({ type: "ui", tab: "docs", doc: require("path").basename(file) });
    logActivity(cfg.notesDir, `${p.title}: PDF made (${require("path").basename(file)})`);
  });
}

// Fast answers that need no AI round-trip: open a page, email the last document, review Instagram, score ads.
const PAGES = { mail: "email", email: "email", inbox: "email", gmail: "email", outlook: "email", vault: "vault", leads: "leads", crm: "leads", whatsapp: "whatsapp", ads: "ads", "ads manager": "ads", slack: "slack", docs: "docs", documents: "docs", contracts: "docs", calendar: "calendar", instagram: "instagram", settings: "settings", tia: "tia" };
async function quick(cfg, text) {
  const t = text.toLowerCase().replace(/[.!?]+$/, "").trim();
  const open = t.match(/^(?:tia,?\s*)?(?:open|show(?: me)?|go to|switch to)\s+(?:my |the )?([a-z ]+?)(?:\s+(?:tab|page|app))?$/);
  if (open && PAGES[open[1].trim()]) {
    const tab = PAGES[open[1].trim()];
    emit({ type: "ui", tab });
    return { say: `Here's ${tab === "email" ? "your mail – Gmail and Outlook together" : `your ${open[1].trim()}`}.` };
  }
  // "email it / put it in a draft / send the contract by email" right after a contract or offer was made
  const d = desk.lastDoc;
  if (d && Date.now() - d.at < 3 * 3600e3 && /\b(e-?mail|mail|draft|outlook)\b/.test(t) && /\b(it|that|contract|agreement|offer|document|pdf)\b/.test(t) && !/\blead/.test(t)) {
    const app = "outlook"; // documents go out through Outlook (Gmail drafts can't carry the PDF here)
    const item = { id: `c${++seq}`, kind: "reply", state: "open", at: Date.now(), sources: ["Docs"], proposal: { kind: "reply", title: `${d.title || "Contract"}`, to: d.to, summary: `Email with ${require("path").basename(d.file)} attached`, message_text: d.message_text || `Hello,\n\nplease find the ${d.kind === "contract" ? "agreement" : d.kind} attached for your review and signature.\n\nBest regards,\n${cfg.owner || engine.info().owner}`, lines: [], total_eur: 0, valid_until: "", when: "", attach: [d.file] } };
    desk.items.push(item);
    draftNow(cfg, item, app, "");
    return { say: `Opening Outlook – I'm writing the email to ${d.to} with the ${d.kind === "contract" ? "agreement" : d.kind} attached. It stays a draft, you press Send.`, item };
  }
  // "find me new leads" – straight to the lead finder; with no kind given, the vault's best partner source (Lead sources 2026)
  if (/\b(find|look for|search|get)\b/.test(t) && /\b(leads?|clients?|partners?|customers?)\b/.test(t)) {
    const kinds = /architect|design|real.?estate|agenc|developer|builder|construct/.test(t) ? "" : "architects and interior design studios";
    const area = /jūrmala|jurmala/.test(t) ? "" : /riga|rīga/.test(t) ? "" : " in Riga";
    const title = `${kinds}${area}`.trim() || t;
    const item = { id: `c${++seq}`, kind: "find_leads", state: "working", at: Date.now(), proposal: { kind: "find_leads", title: title || "new leads", to: "", summary: `New leads: ${title}`, message_text: "", lines: [], total_eur: 0, valid_until: "", when: "" }, sources: ["Lead sources 2026"] };
    desk.items.push(item);
    leadSearch(cfg, item, `${title} ${text}`);
    return { say: `On it – I'm searching for ${title || "new leads"} and adding the good ones to your CRM.`, item };
  }
  if (/instagram/.test(t) && /(review|stat|improv|analy|numbers|doing|insight)/.test(t) && GUEST()) {
    return { say: "Instagram isn't connected in the public demo. Download Tia and connect your own account – then I review your real numbers." };
  }
  if (/instagram/.test(t) && /(review|stat|improv|analy|numbers|doing|insight)/.test(t)) {
    emit({ type: "ui", tab: "instagram", igReview: true });
    const L = require("./connectors/live");
    const r = await L.instagramReview(cfg);
    return { say: `${r.verdict} I'd give it ${r.score} out of 100 – the fixes and your next post are on the right.` };
  }
  if (/\b(ads?|ad account|campaigns?)\b/.test(t) && /(score|review|analy|improv|check|how.*doing|perform)/.test(t)) {
    emit({ type: "ui", tab: "ads", adsReview: true });
    return { say: "Here's your Meta Ads account. I'm scoring your newest ad against its numbers – the better version is on the right." };
  }
  return null;
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
    const fast = await quick(cfg, text).catch((e) => ({ say: `That didn't work: ${String(e.message || e).slice(0, 120)}` }));
    if (fast) {
      say(fast.say, via);
      desk.thinking = false;
      bump();
      const out = { heard: text, say: fast.say, question: "", item: null, mode: "live" };
      emit({ type: "reply", via, ...out });
      return out;
    }
    const ctx = contextFor(cfg, [text, ...history.map((h) => h.text)].join(" "));
    const res = await runCommand(cfg, {
      vaultContext: ctx.text,
      today: engine.info().today,
      desk: deskForPrompt(cfg),
      history,
      text,
    });
    let item = null;
    const p = res.proposal;
    if (p && p.kind === "find_leads") {
      item = { id: `c${++seq}`, kind: "find_leads", state: "working", at: Date.now(), proposal: p, sources: ctx.sources };
      desk.items.push(item);
      leadSearch(cfg, item, `${p.title} ${text}`);
    } else if (p && p.kind !== "none") {
      item = { id: `c${++seq}`, kind: p.kind, state: "open", at: Date.now(), proposal: p, sources: res.vault_sources && res.vault_sources.length ? res.vault_sources : ctx.sources };
      desk.items.push(item);
      // the owner asked for it by voice: drafts and documents are made at once (nothing is sent – he presses Send)
      if (p.kind === "reply" && p.message_text) {
        const app = /outlook/i.test(text) ? "outlook" : "gmail";
        draftNow(cfg, item, app, text);
        res.say = GUEST() ? `Here's my email to ${p.to} – it's on the card. In the public demo nothing is sent.` : app === "gmail" ? `Writing to ${p.to} now – the draft goes into Gmail, Drafts. Nothing is sent until you press Send.` : `Outlook is opening – I'm typing the email to ${p.to}. It stays a draft, you press Send.`;
      } else if (p.kind === "contract" || p.kind === "offer") {
        contractNow(cfg, item);
        res.say = `${p.lines && p.lines.length ? `The contract for ${p.to}` : `A referral partnership agreement for ${p.to}`} is ready in Docs, made from the template in your vault. Say "email it" and I'll put it in an Outlook draft.`;
      }
      else if (p.kind === "whatsapp") {
        let chat = null;
        try {
          chat = require("./connectors/whatsapp").findChat(cfg, p.to);
        } catch {}
        emit({ type: "ui", tab: "whatsapp", chat: chat && chat.waId, number: chat && chat.number });
        res.say = GUEST() ? `Here's my WhatsApp to ${p.to}. In the public demo nothing is sent – with your own Tia it goes out from your number after your tap.` : `Here's my WhatsApp to ${p.to}${chat ? "" : " – I don't have their chat yet"}. Tap Send and it goes out from your number.`;
      }
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
      // the original message, for the channel views (Mail / WhatsApp / Instagram / Slack look-alikes)
      original: { subject: r.message.subject || "", text: r.message.text || "", address: r.message.address || "", time: r.message.time || "", mailbox: r.message.mailbox || "" },
      decision: r.decision || "",
    };
  }
  const p = i.proposal;
  if (i.kind === "find_leads") {
    const r = i.result || {};
    return { id: i.id, kind: "find_leads", state: i.state, from: "Lead finder", channel: "web", time: new Date(i.at).toTimeString().slice(0, 5), title: p.title,
      summary: r.added ? `${r.added.length} new ${r.label} added to the CRM` : `Searching: ${p.title}`, reason: "", text: "", lines: [], total: 0,
      leads: (r.added || []).map((l) => ({ name: l.name, fit: l.fit, segment: l.segment, why: l.why, website: l.website })), guard: ["Read-only: nobody is contacted without your OK."],
      sources: i.sources || [], money: 0, urgent: false, actions: i.actions || [] };
  }
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

module.exports = { runInSession, allowCall, emit, runDay, decide, command, chat, reset, snapshot, getItem, rawItem, onEvent, waitForChange, screenResult, stop };

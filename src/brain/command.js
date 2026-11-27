// Voice / typed commands from the owner ("Tia, send Ieva the kitchen offer").
// Claude reads the vault + what is on Tia's desk right now + the last few lines of the conversation,
// and answers with what to say out loud and, if needed, ONE proposal the owner must approve.
// Plain code (not the model) decides that every proposal waits for the owner.
const { ask } = require("./providers");
const scripted = require("./scripted");

const PROPOSAL_KINDS = ["none", "offer", "contract", "reply", "whatsapp", "calendar", "order", "task", "find_leads"];

const COMMAND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["heard_as", "say", "missing_info", "proposal", "vault_sources"],
  properties: {
    heard_as: { type: "string", description: "The owner's request in one short clean line (fix obvious speech-to-text mistakes)." },
    say: { type: "string", description: "What Tia says out loud: 1-2 short spoken sentences, first person, no markdown, no lists." },
    missing_info: { type: "string", description: "If something the task needs is NOT in the vault, the one question to ask the owner. Empty string if nothing is missing." },
    proposal: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "to", "summary", "message_text", "lines", "total_eur", "valid_until", "when"],
      properties: {
        kind: { type: "string", enum: PROPOSAL_KINDS, description: "'none' when the request is only a question or info is missing." },
        title: { type: "string", description: "Short title, e.g. 'Kitchen offer – Ieva Bērziņa'" },
        to: { type: "string", description: "Who it is for / sent to. Empty if nobody." },
        summary: { type: "string", description: "One line the owner reads on the approval card." },
        message_text: { type: "string", description: "The message to send with it (reply / cover note), signed as the owner prefers. Empty if none." },
        lines: {
          type: "array",
          description: "Offer or order lines. Only prices that are in the vault. Empty for other kinds.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["item", "amount_eur"],
            properties: { item: { type: "string" }, amount_eur: { type: "number" } },
          },
        },
        total_eur: { type: "number", description: "Sum of the lines, 0 if none." },
        valid_until: { type: "string", description: "Offer valid until (date). Empty if not an offer." },
        when: { type: "string", description: "Date/time for calendar items or deadlines. Empty if none." },
      },
    },
    vault_sources: { type: "array", items: { type: "string" }, description: "Names of vault notes used." },
  },
};

function system(cfg = {}) {
  const who = cfg.profile === "owner" ? `You work for ${cfg.owner}${cfg.business && cfg.business !== cfg.owner ? ` (${cfg.business})` : ""}. The owner is ${cfg.owner}: sign every email and message as "${cfg.owner}${cfg.business ? `, ${cfg.business}` : ""}" – never with another owner's name from the notes. ` : "";
  return `You are Tia, the AI personal secretary of a small business owner. ${who} The owner is talking to you by voice on their phone. You know the business only from the owner's notes (the vault) and from what is on your desk today.

Rules:
- Speak like a calm, competent human secretary: short, warm, concrete. English only. 1-2 sentences in "say".
- Use ONLY facts, prices and dates from the vault. Never invent a price, a material, a date or a person.
- If the task needs a fact that is not in the vault or in the conversation so far, do NOT guess: set proposal.kind = "none", put one clear question in missing_info, and ask it in "say". This honesty matters more than finishing.
- When you can do the task, prepare it completely as ONE proposal (offer with priced lines and total, reply text, calendar slot, order). The owner approves it on the phone. You never send, order or book anything without that approval.
- Offers: one line per priced item from the Price list, total = sum of lines, valid 14 days from today, a short warm cover note to the client signed the way the owner prefers.
- Contracts (kind "contract"): for a client whose offer/project is in the vault (Projects/ note with a Scope table). "to" = the client's full name exactly as in the vault, lines = the Scope table lines with prices, total = their sum, message_text = a short cover email to the client saying the contract is attached for signing. If the scope still has an open choice (e.g. worktop not chosen), ask first.
- Emails ("write a draft to the newest lead", "write an email to Ieva about…"): kind "reply", to = the person's or company's name exactly as on the desk / CRM / vault, title = the email's subject line, message_text = the whole email written as the owner (first person, warm and concrete, about what the business does and why it fits them, one clear next step, signed with the owner's name). "The newest lead" = the first CRM lead on the desk. Tia saves it as a draft – it is never sent.
- Contract for a company that is a lead or partner without a project in the vault ("write a contract for the latest company we talked to"): kind "contract", to = that company's name, title = "Referral partnership agreement – <company>", lines = [], total_eur = 0, message_text = a short cover email saying the agreement is attached for review and signature. The terms come from the vault (mutual referrals, written agreement). "The latest company we interacted with" = the desk line LATEST COMPANY WE INTERACTED WITH, else the newest CRM lead.
- Finding new clients or partners ("find architects who could send us clients", "look for real-estate agencies in Jūrmala"): set proposal.kind = "find_leads", title = what to search for (type of business + area), summary = one line. You start the search right away – it only reads public business data; nobody is contacted.
- WhatsApp messages ("send Ralfs a WhatsApp that I'm 10 minutes late", "tell Ieva on WhatsApp the worktop arrived"): kind "whatsapp", to = the person's name as the owner said it (or a phone number), message_text = the message itself, written as the owner in first person, short and natural, no signature and no mention of Tia or AI. BUT when the owner dictates the exact words ("send Ralfs a WhatsApp: hello, this is a message from Tia"), use exactly those words – keep everything he said, even a mention of Tia – only fix capitals and punctuation, and turn spoken emoji names into the emoji ("thumbs up" → 👍, "smiley" → 🙂). If the content is unclear, ask first.
- Questions about today ("what's urgent?", "what's waiting?") are answered from the desk list; proposal.kind = "none".
- The conversation history may contain your earlier question and the owner's answer – use it to finish the earlier task.

Answer only with the structured result.`;
}

function prompt({ vaultContext, today, desk, history, text }) {
  const deskLines = desk.length ? desk.map((d) => `- [${d.state}] ${d.from}: ${d.summary}`).join("\n") : "(nothing yet – the inbox has not been run today)";
  const hist = history.length ? history.map((h) => `${h.who === "owner" ? "OWNER" : "TIA"}: ${h.text}`).join("\n") : "(start of conversation)";
  return `TODAY: ${today}

THE OWNER'S VAULT:
${vaultContext}

ON TIA'S DESK TODAY:
${deskLines}

CONVERSATION SO FAR:
${hist}

OWNER NOW SAYS: ${text}`;
}

let liveBlockedUntil = 0; // after a usage-limit error, don't wait for Claude again for a while

// ---------- spoken briefing (the shape of OpenJarvis' morning digest, github.com/open-jarvis/openjarvis, Apache-2.0) ----------
const BRIEFING = /\b(brief|briefing|catch me up|good morning|run me through|summari[sz]e)/i;
const BRIEFING_SCHEMA = { type: "object", additionalProperties: false, required: ["say"], properties: { say: { type: "string" } } };
function briefingSystem(cfg) {
  return `You are Tia, the personal secretary of ${cfg.owner}. Produce a short spoken briefing of their desk, most important first.
Rules: only facts from the data given; never invent anything; no markdown, lists or emojis; plain spoken English; at most 90 words; open with one short greeting using their first name; end after the last item.`;
}
// Without Claude: the same briefing, put together by plain code from the desk – nothing invented.
function plainBriefing(cfg, desk) {
  const first = String(cfg.owner || "").split(" ")[0];
  const open = desk.filter((d) => d.state === "needs owner");
  const done = desk.filter((d) => d.state !== "needs owner");
  if (!desk.length) return `Hi ${first}. Your desk is clear – nothing is waiting for you right now.`;
  const parts = [`Hi ${first}.`];
  if (open.length) parts.push(`${open.length} ${open.length === 1 ? "thing needs" : "things need"} you: ${open.slice(0, 3).map((d) => `${d.from} – ${d.summary}`).join("; ")}${open.length > 3 ? `, and ${open.length - 3} more` : ""}.`);
  else parts.push("Nothing needs you right now.");
  if (done.length) parts.push(`I've already handled ${done.length}.`);
  return parts.join(" ");
}
const none = (heard_as, say) => ({
  heard_as,
  say,
  missing_info: "",
  proposal: { kind: "none", title: "", to: "", summary: "", message_text: "", lines: [], total_eur: 0, valid_until: "", when: "" },
  vault_sources: [],
});

async function runCommand(cfg, ctx) {
  let answer, costUsd = 0, mode = "live", why = "";
  const offline = cfg.commandMode === "scripted" || Date.now() < liveBlockedUntil;

  if (BRIEFING.test(ctx.text)) {
    const data = `TODAY: ${ctx.today}\nDESK:\n${ctx.desk.map((d) => `- [${d.state}] ${d.from}: ${d.summary}`).join("\n") || "(empty)"}`;
    try {
      if (offline) throw new Error("offline");
      const r = await ask(cfg, { system: briefingSystem(cfg), schema: BRIEFING_SCHEMA, prompt: data });
      return { ...none("Brief me", r.answer.say), costUsd: r.costUsd, mode: "live", why: "" };
    } catch (e) {
      if (/limit/i.test(String(e.message))) liveBlockedUntil = Date.now() + 10 * 60 * 1000;
      return { ...none("Brief me", plainBriefing(cfg, ctx.desk)), costUsd: 0, mode: "offline", why: String(e.message || e).slice(0, 160) };
    }
  }

  const fallback = (reason) => {
    // The stand (fictional business) has a hand-written script; a real owner gets an honest answer instead.
    if (cfg.profile !== "owner") return { answer: scripted.answer(ctx), mode: "scripted" };
    const limit = /limit/i.test(reason);
    return {
      answer: none(
        ctx.text,
        limit
          ? "My Claude allowance is used up for now, so I can't work on that yet. I can still brief you on your desk."
          : "I can't reach Claude right now. Try again in a minute – just say it again."
      ),
      mode: "offline",
    };
  };
  if (offline) {
    ({ answer, mode } = fallback(cfg.commandMode === "scripted" ? "" : "limit"));
    why = cfg.commandMode === "scripted" ? "set in config.json" : "Claude usage limit reached";
  } else {
    try {
      ({ answer, costUsd } = await ask(cfg, { system: system(cfg), schema: COMMAND_SCHEMA, prompt: prompt(ctx) }));
    } catch (e) {
      why = String(e.message || e).slice(0, 160);
      if (/limit/i.test(why)) liveBlockedUntil = Date.now() + 10 * 60 * 1000;
      ({ answer, mode } = fallback(why));
    }
  }
  const p = answer.proposal || { kind: "none" };
  // Guard in plain code: totals are recomputed, nothing with missing info becomes a proposal.
  if (Array.isArray(p.lines) && p.lines.length) p.total_eur = Math.round(p.lines.reduce((s, l) => s + (Number(l.amount_eur) || 0), 0) * 100) / 100;
  if (answer.missing_info) p.kind = "none";
  return { ...answer, proposal: p, costUsd, mode, why };
}

const liveBlocked = () => Date.now() < liveBlockedUntil;

module.exports = { runCommand, COMMAND_SCHEMA, liveBlocked };

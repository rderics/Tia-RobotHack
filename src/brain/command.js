// Voice / typed commands from the owner ("Tia, send Ieva the kitchen offer").
// Claude reads the vault + what is on Tia's desk right now + the last few lines of the conversation,
// and answers with what to say out loud and, if needed, ONE proposal the owner must approve.
// Plain code (not the model) decides that every proposal waits for the owner.
const { ask } = require("./providers");
const scripted = require("./scripted");

const PROPOSAL_KINDS = ["none", "offer", "reply", "calendar", "order", "task"];

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

function system() {
  return `You are Tia, the AI personal secretary of a small business owner. The owner is talking to you by voice on their phone. You know the business only from the owner's notes (the vault) and from what is on your desk today.

Rules:
- Speak like a calm, competent human secretary: short, warm, concrete. English only. 1-2 sentences in "say".
- Use ONLY facts, prices and dates from the vault. Never invent a price, a material, a date or a person.
- If the task needs a fact that is not in the vault or in the conversation so far, do NOT guess: set proposal.kind = "none", put one clear question in missing_info, and ask it in "say". This honesty matters more than finishing.
- When you can do the task, prepare it completely as ONE proposal (offer with priced lines and total, reply text, calendar slot, order). The owner approves it on the phone. You never send, order or book anything without that approval.
- Offers: one line per priced item from the Price list, total = sum of lines, valid 14 days from today, a short warm cover note to the client signed the way the owner prefers.
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

async function runCommand(cfg, ctx) {
  let answer, costUsd = 0, mode = "live", why = "";
  if (cfg.commandMode === "scripted" || Date.now() < liveBlockedUntil) {
    answer = scripted.answer(ctx);
    mode = "scripted";
    why = cfg.commandMode === "scripted" ? "set in config.json" : "Claude usage limit reached";
  } else {
    try {
      ({ answer, costUsd } = await ask(cfg, { system: system(), schema: COMMAND_SCHEMA, prompt: prompt(ctx) }));
    } catch (e) {
      // No Claude right now (limit reached, no internet) → the stand keeps working on the hand-written script.
      answer = scripted.answer(ctx);
      mode = "scripted";
      why = String(e.message || e).slice(0, 160);
      if (/limit/i.test(why)) liveBlockedUntil = Date.now() + 10 * 60 * 1000;
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

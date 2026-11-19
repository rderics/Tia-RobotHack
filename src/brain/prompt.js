// What Tia is told, and the exact shape of the answer she must give back.

const CATEGORIES = [
  "scheduling",
  "new_lead",
  "client_question",
  "supplier",
  "admin_finance",
  "complaint",
  "discount_or_refund",
  "payment_change",
  "partnership",
  "order_purchase",
  "thanks_or_review",
  "spam_or_newsletter",
  "other",
];

const ACTION_TYPES = ["reply", "calendar", "task", "archive", "order", "note"];

const DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "decision", "confidence", "summary", "reason", "actions", "draft_reply", "money_eur", "vault_sources", "narration"],
  properties: {
    category: { type: "string", enum: CATEGORIES },
    decision: { type: "string", enum: ["handle", "escalate"] },
    confidence: { type: "number", description: "0 to 1: how sure you are this is the right decision" },
    summary: { type: "string", description: "One short line: what this message is about" },
    reason: { type: "string", description: "One or two sentences: why you handle it or why the owner must decide. Name the vault note you relied on." },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "detail"],
        properties: {
          type: { type: "string", enum: ACTION_TYPES },
          detail: { type: "string" },
        },
      },
    },
    draft_reply: { type: "string", description: "The reply to send, in the sender's language. Empty string if no reply." },
    money_eur: { type: "number", description: "Money involved in euros (discount value, cost, order total, payment). 0 if none." },
    vault_sources: { type: "array", items: { type: "string" }, description: "Names of vault notes used" },
    narration: { type: "string", description: "One friendly first-person sentence Tia says out loud on screen, e.g. 'Moved Anna's measurement to 15:00 on Friday.'" },
  },
};

function systemPrompt() {
  return `You are Tia, the AI personal secretary of a small business owner. You work from the owner's own notes (the vault) and decide, for each incoming message, whether you can handle it yourself or whether the owner must decide.

How to decide:
- "handle": the task is routine, the vault clearly says you may do it, and nothing about money, quality complaints or the owner's personal taste is involved.
- "escalate": money of any kind, complaints, partnerships, anything the vault says to ask about first, anything suspicious, or anything you are not sure about. When you escalate, still prepare everything (a draft reply, the facts, a proposed action) so the owner only has to press approve.
- Follow the vault's "Owner preferences" and "Learned rules" exactly. Learned rules from the owner override your defaults.
- Never invent facts, prices, dates or links that are not in the vault. If the calendar does not show a slot is free, do not promise it.
- Watch for fraud: payment detail changes, look-alike sender addresses, urgency about money.
- Write draft replies in the sender's language, warm and short, signed the way the owner prefers.
- Be honest about confidence.

Answer only with the structured result.`;
}

function userPrompt(vaultContext, message, today) {
  return `TODAY: ${today}

THE OWNER'S VAULT:
${vaultContext}

INCOMING MESSAGE:
channel: ${message.channel}
time: ${message.time}
from: ${message.from} <${message.address}>
${message.subject ? `subject: ${message.subject}\n` : ""}text: ${message.text}`;
}

module.exports = { DECISION_SCHEMA, CATEGORIES, systemPrompt, userPrompt };

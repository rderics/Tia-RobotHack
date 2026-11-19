// The Guard: plain code that has the final word. The model proposes, the Guard decides what may run without the owner.
// Nothing the model writes can switch these rules off.

const ALWAYS_ASK = new Set(["discount_or_refund", "complaint", "partnership", "order_purchase"]);
const NEVER_ALONE = new Set(["payment_change"]); // not even after learning
const ASK_FIRST_UNTIL_LEARNED = new Set(["new_lead"]); // owner preference: "show me new-lead replies first"

function applyGuard(proposal, message, learning, cfg) {
  const notes = [];
  let decision = proposal.decision;
  const approvals = learning.approvals[proposal.category] || 0;
  const learned = approvals >= cfg.approvalsToLearn;

  if (NEVER_ALONE.has(proposal.category)) {
    decision = "escalate";
    notes.push("Payment details never change without you – possible fraud.");
  } else if (ALWAYS_ASK.has(proposal.category) && !learned) {
    if (decision === "handle") notes.push("Guard: this kind of message always goes to you.");
    decision = "escalate";
  } else if (ASK_FIRST_UNTIL_LEARNED.has(proposal.category)) {
    if (learned) {
      if (decision === "escalate" && proposal.confidence >= cfg.minConfidence) {
        decision = "handle";
      }
      notes.push(`Learned: you approved ${approvals} replies like this, so I sent it myself.`);
    } else {
      decision = "escalate";
      notes.push(`You asked to see new-lead replies first (${approvals}/${cfg.approvalsToLearn} approved so far).`);
    }
  }

  if ((proposal.actions || []).some((a) => a.type === "order") && decision === "handle") {
    decision = "escalate";
    notes.push("Guard: orders and purchases need your approval.");
  }
  if (proposal.money_eur > 0 && decision === "handle" && !learned) {
    decision = "escalate";
    notes.push(`Guard: involves money (${proposal.money_eur} €).`);
  }
  if (proposal.confidence < cfg.minConfidence && decision === "handle") {
    decision = "escalate";
    notes.push(`Guard: I'm only ${Math.round(proposal.confidence * 100)}% sure, so I'm asking.`);
  }

  return { decision, guardNotes: notes, overridden: decision !== proposal.decision };
}

// Works in Node (the app) and in a plain browser (the public replay site).
if (typeof module !== "undefined" && module.exports) module.exports = { applyGuard };
else window.TiaGuard = { applyGuard };

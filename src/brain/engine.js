// Runs Tia's day: every inbox message → Claude proposes → Guard decides → result on screen.
// Owner feedback (approve / edit / reject) is written back to the vault so Tia learns.
const fs = require("fs");
const path = require("path");
const { loadConfig } = require("./config");
const { readVaultContext, logActivity, addLearnedRule, resetVault } = require("./vault");
const { decide } = require("./providers");
const { applyGuard } = require("./guard");

const TODAY = "Thursday 19 November 2026, 13:00";

function learningFile(cfg) {
  return path.join(cfg.dataDir, "learning.json");
}
function loadLearning(cfg) {
  const f = learningFile(cfg);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : { approvals: {}, edits: {}, rejections: {} };
}
function saveLearning(cfg, l) {
  fs.writeFileSync(learningFile(cfg), JSON.stringify(l, null, 2));
}

async function runPool(items, size, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function finish(cfg, message, proposal, learning, extra = {}) {
  const guard = applyGuard(proposal, message, learning, cfg);
  const result = { message, proposal, ...guard, ...extra };
  if (guard.decision === "handle") {
    const acts = (proposal.actions || []).map((a) => `${a.type}: ${a.detail}`).join("; ");
    logActivity(cfg.vaultDir, `Handled ${message.channel} from ${message.from} – ${proposal.summary}${acts ? ` (${acts})` : ""}`);
  }
  return result;
}

// mode: "live" (calls Claude) or "replay" (plays a saved run – for bad venue Wi-Fi)
async function runDay({ mode = "live", onEvent = () => {}, stopOnLimit = false } = {}) {
  const cfg = loadConfig();
  const inbox = JSON.parse(fs.readFileSync(cfg.inboxFile, "utf8"));
  const learning = loadLearning(cfg);
  onEvent({ type: "start", total: inbox.length, mode, provider: cfg.provider, model: cfg.model });

  const results = [];
  if (mode === "replay") {
    if (!fs.existsSync(cfg.replayFile)) throw new Error("No saved run yet – do one live run first.");
    const saved = JSON.parse(fs.readFileSync(cfg.replayFile, "utf8"));
    for (const msg of inbox) {
      const rec = saved[msg.id];
      if (!rec) continue;
      onEvent({ type: "thinking", message: msg });
      await new Promise((r) => setTimeout(r, 450));
      const r = finish(cfg, msg, rec.proposal, learning, { replay: true });
      results.push(r);
      onEvent({ type: "result", result: r });
    }
  } else {
    const vaultContext = readVaultContext(cfg.vaultDir);
    const saved = {};
    let limitHit = null;
    await runPool(inbox, cfg.concurrency, async (msg) => {
      if (limitHit) return;
      onEvent({ type: "thinking", message: msg });
      const t0 = Date.now();
      try {
        const { proposal, costUsd } = await decide(cfg, vaultContext, msg, TODAY);
        saved[msg.id] = { proposal };
        const r = finish(cfg, msg, proposal, learning, { seconds: Math.round((Date.now() - t0) / 1000), costUsd });
        results.push(r);
        onEvent({ type: "result", result: r });
      } catch (e) {
        if (stopOnLimit && /limit/i.test(String(e.message || e))) {
          limitHit = String(e.message || e);
          return;
        }
        const r = { message: msg, error: String(e.message || e), decision: "escalate", guardNotes: ["I couldn't process this one – please look at it yourself."] };
        results.push(r);
        onEvent({ type: "result", result: r });
      }
    });
    if (limitHit) {
      const err = new Error(limitHit);
      err.code = "LIMIT";
      throw err;
    }
    // Keep the newest successful run for replay mode.
    if (Object.keys(saved).length === inbox.length) fs.writeFileSync(cfg.replayFile, JSON.stringify(saved, null, 2));
  }

  const handled = results.filter((r) => r.decision === "handle").length;
  const summary = {
    handled,
    needsYou: results.length - handled,
    minutesSaved: handled * cfg.minutesSavedPerItem,
    costUsd: results.reduce((s, r) => s + (r.costUsd || 0), 0),
  };
  onEvent({ type: "done", summary });
  return { results, summary };
}

// verdict: "approve" | "edit" | "reject"
function recordFeedback({ message, proposal, verdict, editedReply }) {
  const cfg = loadConfig();
  const learning = loadLearning(cfg);
  const cat = proposal.category;
  if (verdict === "approve" || verdict === "edit") {
    learning.approvals[cat] = (learning.approvals[cat] || 0) + 1;
    if (verdict === "edit") learning.edits[cat] = (learning.edits[cat] || 0) + 1;
    const sent = verdict === "edit" ? editedReply : proposal.draft_reply;
    logActivity(cfg.vaultDir, `Owner ${verdict === "edit" ? "edited and approved" : "approved"}: ${message.from} – ${proposal.summary}${sent ? ` → reply sent (simulated)` : ""}`);
    addLearnedRule(
      cfg.vaultDir,
      verdict === "edit"
        ? `${cat}: owner changed my reply to "${message.from}". Owner's version: "${(editedReply || "").replace(/\s+/g, " ").slice(0, 300)}" – write like this next time.`
        : `${cat}: owner approved my proposal for "${message.from}" (${proposal.summary}). Approvals so far: ${learning.approvals[cat]}.`
    );
  } else {
    learning.rejections[cat] = (learning.rejections[cat] || 0) + 1;
    logActivity(cfg.vaultDir, `Owner rejected: ${message.from} – ${proposal.summary}`);
    addLearnedRule(cfg.vaultDir, `${cat}: owner rejected my proposal for "${message.from}" (${proposal.summary}). Be more careful with this kind.`);
  }
  saveLearning(cfg, learning);
  return { approvals: learning.approvals[cat] || 0, needed: cfg.approvalsToLearn };
}

function resetDemo() {
  const cfg = loadConfig();
  resetVault(cfg.vaultDir);
  if (fs.existsSync(learningFile(cfg))) fs.unlinkSync(learningFile(cfg));
}

function info() {
  const cfg = loadConfig();
  // canGoLive = false when config.json says the inbox should always use the saved run
  return { provider: cfg.provider, model: cfg.model, hasReplay: fs.existsSync(cfg.replayFile), today: TODAY, canGoLive: cfg.inboxMode !== "replay" };
}

module.exports = { runDay, recordFeedback, resetDemo, info };

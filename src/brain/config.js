// Settings for Tia. Edit config.json in the project root to change them.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const DEFAULTS = {
  // "claude-code" = runs `claude -p` logged in as the person using this computer (Claude subscription).
  // "api"         = Claude API with an API key (ANTHROPIC_API_KEY). Switch here, nothing else changes.
  provider: "claude-code",
  model: "claude-sonnet-5-5",
  concurrency: 3,
  vaultDir: "demo/vault",
  inboxFile: "demo/inbox.json",
  replayFile: "demo/replay.json",
  dataDir: "data",
  // Guard settings (plain code, the model cannot override these)
  minConfidence: 0.75,
  approvalsToLearn: 2, // owner approvals of one category before Tia may do it alone
  minutesSavedPerItem: 4, // shown on screen as an estimate
};

function loadConfig() {
  const file = path.join(ROOT, "config.json");
  let user = {};
  if (fs.existsSync(file)) user = JSON.parse(fs.readFileSync(file, "utf8"));
  const cfg = { ...DEFAULTS, ...user };
  for (const k of ["vaultDir", "inboxFile", "replayFile", "dataDir"]) cfg[k] = path.resolve(ROOT, cfg[k]);
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  return cfg;
}

module.exports = { loadConfig, ROOT };

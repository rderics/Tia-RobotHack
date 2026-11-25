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
  // Who Tia works for. "stand" = the fictional demo business (AI Studio stand, public repo).
  // "owner" = a real owner's own vault – set in config.json, which is never committed.
  profile: "stand",
  business: "Liepa Interjers",
  owner: "Mārtiņš Ozols",
  timezone: "Europe/Riga",
  notesDir: null, // where Tia writes her activity log + learned rules (default: inside the vault, folder Tia/)
  alwaysNotes: [], // notes always given to Tia in owner mode, e.g. ["System/USER.md"]
  topNotes: 6, // how many matching notes Tia reads per message (owner mode)
  inboxSource: "demo", // "demo" = demo/inbox.json · "none" = no inbox connected yet
  publicUrl: null, // e.g. "https://tia.rderics.id.lv" – the phone pairs to this address first
  // Guard settings (plain code, the model cannot override these)
  minConfidence: 0.75,
  approvalsToLearn: 2, // owner approvals of one category before Tia may do it alone
  minutesSavedPerItem: 4, // shown on screen as an estimate
};

// Secrets (free AI keys etc.) live in .env next to package.json – never committed. KEY=value per line.
function loadDotEnv() {
  try {
    for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

function loadConfig() {
  loadDotEnv();
  // TIA_CONFIG=none runs the fictional stand business even when an owner config.json exists.
  const choice = process.env.TIA_CONFIG;
  const file = choice === "none" ? "" : path.resolve(ROOT, choice || "config.json");
  let user = {};
  if (file && fs.existsSync(file)) user = JSON.parse(fs.readFileSync(file, "utf8"));
  const cfg = { ...DEFAULTS, ...user };
  for (const k of ["vaultDir", "inboxFile", "replayFile", "dataDir"]) cfg[k] = path.resolve(ROOT, cfg[k]);
  cfg.notesDir = cfg.notesDir ? path.resolve(ROOT, cfg.notesDir) : path.join(cfg.vaultDir, "Tia");
  if (cfg.profile === "owner" && !user.replayFile) cfg.replayFile = path.join(cfg.dataDir, "owner-replay.json"); // never mix with the demo recording
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  return cfg;
}

module.exports = { loadConfig, ROOT };

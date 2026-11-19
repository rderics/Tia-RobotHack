// How Tia reaches Claude. Two interchangeable ways, chosen by `provider` in config.json.
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { DECISION_SCHEMA, systemPrompt, userPrompt } = require("./prompt");

// 1) Claude Code in the background, logged in as the person at this computer (their Claude subscription).
//    For testing and the demo only – a shipped product must use the API key provider.
function viaClaudeCode(cfg, prompt) {
  // Run from an empty folder so Claude Code does not pick up this project's files or settings.
  const cwd = path.join(os.tmpdir(), "tia-claude-run");
  fs.mkdirSync(cwd, { recursive: true });
  const args = [
    "-p",
    "--output-format", "json",
    "--model", cfg.model,
    "--tools", "",
    "--setting-sources", "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--system-prompt", systemPrompt(),
    "--json-schema", JSON.stringify(DECISION_SCHEMA),
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(cfg.claudePath || "claude", args, { cwd, windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        const j = JSON.parse(out);
        if (j.is_error || !j.structured_output) return reject(new Error(j.result || `claude exited ${code}: ${err.slice(0, 300)}`));
        resolve({ proposal: j.structured_output, costUsd: j.total_cost_usd || 0 });
      } catch (e) {
        reject(new Error(`claude exited ${code}: ${(err || out).slice(0, 300)}`));
      }
    });
    child.stdin.end(prompt, "utf8");
  });
}

// 2) Claude API with an API key (ANTHROPIC_API_KEY in the environment).
let apiClient = null;
async function viaApi(cfg, prompt) {
  if (!apiClient) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    apiClient = new Anthropic();
  }
  const response = await apiClient.beta.messages.create({
    model: cfg.model,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if the model declines, the API retries on a fallback model in the same call
    system: systemPrompt(),
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: DECISION_SCHEMA } },
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined this message");
  if (response.stop_reason === "max_tokens") throw new Error("Answer was cut off (max_tokens)");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { proposal: JSON.parse(text), costUsd: 0 };
}

async function decide(cfg, vaultContext, message, today) {
  const prompt = userPrompt(vaultContext, message, today);
  if (cfg.provider === "api") return viaApi(cfg, prompt);
  return viaClaudeCode(cfg, prompt);
}

module.exports = { decide };

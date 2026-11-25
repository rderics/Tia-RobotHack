// How Tia reaches Claude. Two interchangeable ways, chosen by `provider` in config.json.
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { DECISION_SCHEMA, systemPrompt, userPrompt } = require("./prompt");

// 1) Claude Code in the background, logged in as the person at this computer (their Claude subscription).
//    For testing and the demo only – a shipped product must use the API key provider.
function viaClaudeCode(cfg, prompt, system = systemPrompt(), schema = DECISION_SCHEMA) {
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
    "--system-prompt", system,
    "--json-schema", JSON.stringify(schema),
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
async function viaApi(cfg, prompt, system = systemPrompt(), schema = DECISION_SCHEMA) {
  if (!apiClient) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    apiClient = new Anthropic();
  }
  const response = await apiClient.beta.messages.create({
    model: cfg.model,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if the model declines, the API retries on a fallback model in the same call
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined this message");
  if (response.stop_reason === "max_tokens") throw new Error("Answer was cut off (max_tokens)");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { proposal: JSON.parse(text), costUsd: 0 };
}

function codexEntry() {
  const js = path.join(process.env.APPDATA || "", "npm", "node_modules", "@openai", "codex", "bin", "codex.js");
  return process.platform === "win32" && fs.existsSync(js) ? js : "codex";
}

// 3) OpenAI models through the Codex CLI, logged in with the owner's ChatGPT account. Used as a stand-in
//    when Claude is unavailable (usage limit) and config.json says "fallbackProvider": "codex".
//    Read-only, no tools, in an empty folder: it only answers.
function viaCodex(cfg, prompt, system = systemPrompt(), schema = DECISION_SCHEMA) {
  const cwd = path.join(os.tmpdir(), "tia-codex-run");
  fs.mkdirSync(cwd, { recursive: true });
  const id = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const outFile = path.join(cwd, `answer-${id}.txt`);
  const args = ["exec", "--skip-git-repo-check", "--ephemeral", "--sandbox", "read-only", "--ignore-rules", "--ignore-user-config", "--color", "never", "-o", outFile];
  let schemaFile = null;
  if (schema) {
    schemaFile = path.join(cwd, `schema-${id}.json`);
    fs.writeFileSync(schemaFile, JSON.stringify(schema));
    args.push("--output-schema", schemaFile);
  }
  args.push("-");
  return new Promise((resolve, reject) => {
    // On Windows "codex" is a .cmd wrapper; run its JavaScript entry with Node directly (no command shell).
    const entry = cfg.codexPath || codexEntry();
    const child = entry.endsWith(".js")
      ? spawn(process.execPath, [entry, ...args], { cwd, windowsHide: true })
      : spawn(entry, args, { cwd, windowsHide: true });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.stdout.on("data", () => {});
    child.on("error", reject);
    child.on("close", (code) => {
      let text = "";
      try {
        text = fs.readFileSync(outFile, "utf8").trim();
      } catch {}
      fs.rm(outFile, { force: true }, () => {});
      if (schemaFile) fs.rm(schemaFile, { force: true }, () => {});
      if (!text) return reject(new Error(`codex exited ${code}: ${err.slice(-300)}`));
      try {
        resolve({ proposal: schema ? JSON.parse(text) : text, costUsd: 0 });
      } catch {
        reject(new Error(`codex gave no valid answer: ${text.slice(0, 200)}`));
      }
    });
    child.stdin.end(`${system}\n\n${prompt}`, "utf8");
  });
}

// Plain-text answer from Claude Code (for chat).
function viaClaudeText(cfg, prompt, system) {
  const cwd = path.join(os.tmpdir(), "tia-claude-run");
  fs.mkdirSync(cwd, { recursive: true });
  const args = ["-p", "--output-format", "json", "--model", cfg.model, "--tools", "", "--setting-sources", "", "--strict-mcp-config", "--no-session-persistence", "--system-prompt", system];
  return new Promise((resolve, reject) => {
    const child = spawn(cfg.claudePath || "claude", args, { cwd, windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        const j = JSON.parse(out);
        if (j.is_error) return reject(new Error(j.result || `claude exited ${code}`));
        resolve({ proposal: j.result || "", costUsd: j.total_cost_usd || 0 });
      } catch {
        reject(new Error(`claude exited ${code}: ${out.slice(0, 200)}`));
      }
    });
    child.stdin.end(prompt, "utf8");
  });
}

// Claude first; when Claude says its usage limit is reached, the configured fallback answers for a while.
let claudeBlockedUntil = 0;
async function withFallback(cfg, primary, fallback) {
  const canFallback = cfg.fallbackProvider === "codex";
  if (canFallback && Date.now() < claudeBlockedUntil) return { ...(await fallback()), via: "codex" };
  try {
    return { ...(await primary()), via: cfg.provider };
  } catch (e) {
    if (!canFallback || !/limit|rate|overloaded|credit/i.test(String(e.message))) throw e;
    claudeBlockedUntil = Date.now() + 10 * 60 * 1000;
    return { ...(await fallback()), via: "codex" };
  }
}

async function decide(cfg, vaultContext, message, today) {
  const prompt = userPrompt(vaultContext, message, today);
  if (cfg.provider === "api") return viaApi(cfg, prompt);
  return withFallback(cfg, () => viaClaudeCode(cfg, prompt), () => viaCodex(cfg, prompt));
}

// Any other structured question (used by voice commands): own system prompt + own answer shape.
async function ask(cfg, { system, schema, prompt }) {
  const r =
    cfg.provider === "api"
      ? await viaApi(cfg, prompt, system, schema)
      : await withFallback(cfg, () => viaClaudeCode(cfg, prompt, system, schema), () => viaCodex(cfg, prompt, system, schema));
  return { answer: r.proposal, costUsd: r.costUsd, via: r.via };
}

// Free-text answer (chat).
async function chat(cfg, { system, prompt }) {
  const r = await withFallback(cfg, () => viaClaudeText(cfg, prompt, system), () => viaCodex(cfg, prompt, system, null));
  return { text: r.proposal, via: r.via };
}

module.exports = { decide, ask, chat };

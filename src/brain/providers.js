// How Tia reaches an AI model. Several interchangeable ways, tried in order (see providerChain below):
// Claude Code (subscription), Claude API (key), Codex CLI (ChatGPT login), and any OpenAI-compatible API –
// free Groq / Gemini / OpenRouter keys, or a local Hermes Agent (its API server speaks the same format).
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

// 4) Any OpenAI-compatible chat API. Presets need only a key in .env or the environment; all have free tiers.
const PRESETS = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], json: "schema" }, // qwen tested weaker on money rules
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyEnv: "GEMINI_API_KEY", models: ["gemini-flash-latest", "gemini-flash-lite-latest"], json: "schema" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY", models: ["openai/gpt-oss-120b:free", "meta-llama/llama-3.3-70b-instruct:free"], json: "prompt" },
  // Hermes Agent (NousResearch/hermes-agent) on this computer: `hermes gateway` with API_SERVER_ENABLED=true.
  hermes: { baseUrl: "http://127.0.0.1:8642/v1", keyEnv: "HERMES_API_KEY", models: ["hermes-agent"], json: "prompt", timeoutMs: 240000, headers: { "X-Hermes-Session-Key": "tia-desk" } },
  // Anything else: TIA_AI_BASE_URL + TIA_AI_KEY + TIA_AI_MODEL
  custom: { baseUrl: "", keyEnv: "TIA_AI_KEY", models: [], json: "prompt" },
};
const OPENAI_STYLE = Object.keys(PRESETS);

function presetFor(cfg, name) {
  const p = { ...PRESETS[name], ...((cfg.aiProviders || {})[name] || {}) };
  if (name === "custom") {
    p.baseUrl = process.env.TIA_AI_BASE_URL || p.baseUrl;
    p.models = [process.env.TIA_AI_MODEL || (p.models || [])[0]].filter(Boolean);
  }
  p.key = process.env[p.keyEnv] || p.apiKey || "";
  return p;
}
function isConfigured(cfg, name, list = cfg.providers || []) {
  const p = presetFor(cfg, name);
  if (!p.baseUrl || !(p.models || []).length) return false;
  return name === "hermes" ? list.includes("hermes") : !!p.key; // Hermes only when chosen on purpose
}

function firstJson(text) {
  const t = String(text || "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`no JSON in the answer: ${t.slice(0, 160)}`);
  }
}

// Free tiers limit tokens per minute (Groq: 8 000 per model). On a limit, try the next model; when every model is
// busy, wait the time the API names (at most ~25 s per round) and go again, up to the provider's deadline.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitFrom(r, j) {
  const h = (k) => r.headers.get(k) || "";
  const sec = (v) => {
    const m = String(v).match(/(?:(\d+)m)?([\d.]+)s/);
    return m ? (Number(m[1] || 0) * 60 + Number(m[2])) : Number(v) || 0;
  };
  const fromMsg = String((j.error && j.error.message) || "").match(/try again in ([\dms.]+)/i);
  return Math.max(sec(h("retry-after")), sec(h("x-ratelimit-reset-tokens")), fromMsg ? sec(fromMsg[1]) : 0) * 1000;
}

async function viaOpenAI(cfg, name, prompt, system = systemPrompt(), schema = DECISION_SCHEMA) {
  const p = presetFor(cfg, name);
  const deadline = Date.now() + (p.timeoutMs || 150000);
  let lastErr = null;
  while (Date.now() < deadline) {
    let shortestWait = Infinity;
    for (const model of p.models) {
      const sys = schema && p.json === "prompt" ? `${system}

Reply with ONLY one JSON object (no prose, no code fence) that matches this JSON schema:
${JSON.stringify(schema)}` : system;
      const body = { model, messages: [{ role: "system", content: sys }, { role: "user", content: prompt }], temperature: 0.3 };
      if (schema && p.json === "schema") body.response_format = { type: "json_schema", json_schema: { name: "answer", schema } };
      try {
        const r = await fetch(`${p.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(p.key ? { Authorization: `Bearer ${p.key}` } : {}), ...(p.headers || {}) },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.max(5000, Math.min(p.requestTimeoutMs || p.timeoutMs || 90000, deadline - Date.now()))),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429) {
          shortestWait = Math.min(shortestWait, waitFrom(r, j) || 10000);
          throw new Error(`${name} ${model}: rate limit`);
        }
        if (!r.ok) throw new Error(`${name} ${model}: ${r.status} ${(j.error && (j.error.message || j.error)) || ""}`.slice(0, 300));
        const text = (((j.choices || [])[0] || {}).message || {}).content || "";
        if (!text) throw new Error(`${name} ${model}: empty answer`);
        return { proposal: schema ? firstJson(text) : text.trim(), costUsd: 0, model };
      } catch (e) {
        lastErr = e; // limit / model gone / bad JSON → next model of the same provider
      }
    }
    if (!Number.isFinite(shortestWait)) break; // not a rate limit – waiting won't help
    const wait = Math.min(shortestWait + 500, 25000, deadline - Date.now());
    if (wait <= 0) break;
    await sleep(wait);
  }
  throw lastErr || new Error(`${name}: no model`);
}

// The order Tia tries. config.json "providers": [...] wins; otherwise: Claude (Code or API), Codex if set as
// fallback, then every free API whose key is present. A provider that fails is skipped for 10 minutes.
// kind "talk" (chat + voice commands) may use its own list, e.g. Hermes Agent first; inbox sorting stays fast.
function providerChain(cfg, kind = "inbox") {
  const list = kind === "talk" && Array.isArray(cfg.talkProviders) && cfg.talkProviders.length ? cfg.talkProviders : cfg.providers;
  if (Array.isArray(list) && list.length) return list.filter((n) => !OPENAI_STYLE.includes(n) || isConfigured(cfg, n, list));
  const chain = [cfg.provider === "api" ? "api" : "claude-code"];
  if (cfg.fallbackProvider === "codex") chain.push("codex");
  for (const n of ["groq", "gemini", "openrouter", "custom"]) if (isConfigured(cfg, n)) chain.push(n);
  return chain;
}
const blockedUntil = {};
let lastVia = null; // the AI that answered last – shown in the header and in Settings
const LABELS = {
  "claude-code": "Claude (Claude subscription on this PC)",
  api: "Claude API (Anthropic key)",
  codex: "OpenAI Codex (ChatGPT login)",
  antigravity: "Google Antigravity (Gemini 4 – your Google login, free, slower)",
  groq: "Groq – free",
  gemini: "Google Gemini – free",
  openrouter: "OpenRouter – free models",
  custom: "Any OpenAI-compatible API",
  hermes: "Hermes Agent (this PC)",
};
const SHORT = { "claude-code": "Claude", api: "Claude API", codex: "Codex", antigravity: "Antigravity", groq: "Groq", gemini: "Gemini", openrouter: "OpenRouter", custom: "Custom AI", hermes: "Hermes" };
function modelOf(cfg, name) {
  if (name === "claude-code" || name === "api") return cfg.model;
  if (name === "codex") return cfg.codexModel || "codex default";
  if (name === "antigravity") return cfg.antigravityModel || "gemini-3.8-flash-low";
  const p = presetFor(cfg, name);
  return (p.models || [])[0] || "";
}
function aiStatus(cfg) {
  const chain = providerChain(cfg, "inbox");
  const all = ["claude-code", "api", "codex", "antigravity", ...OPENAI_STYLE];
  return {
    chain,
    lastVia,
    now: lastVia || chain[0] || null,
    label: (n) => `${SHORT[n] || n} · ${modelOf(cfg, n)}`,
    providers: all.map((n) => ({
      id: n, label: LABELS[n] || n, short: SHORT[n] || n, model: modelOf(cfg, n), inChain: chain.includes(n),
      configured: n === "claude-code" ? true : n === "antigravity" ? hasAntigravity() : n === "codex" ? cfg.fallbackProvider === "codex" || (cfg.providers || []).includes("codex") : n === "api" ? !!process.env.ANTHROPIC_API_KEY : isConfigured(cfg, n, cfg.providers || [n]),
      keyEnv: n === "api" ? "ANTHROPIC_API_KEY" : (PRESETS[n] || {}).keyEnv || "",
      blocked: blockedUntil[n] > Date.now(),
    })),
  };
}
// One quick call to one AI – the Settings "Test" button
async function testProvider(cfg, name) {
  const t0 = Date.now();
  const sys = "Reply with exactly: OK";
  let r;
  if (name === "antigravity") r = await viaAntigravity(cfg, "Say OK", sys, null);
  else if (name === "claude-code") r = await viaClaudeText(cfg, "Say OK", sys);
  else if (name === "codex") r = await viaCodex(cfg, "Say OK", sys, null);
  else if (name === "api") r = await viaApi(cfg, "Say OK", sys, { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] });
  else r = await viaOpenAI(cfg, name, "Say OK", sys, null);
  delete blockedUntil[name];
  return { ok: true, ms: Date.now() - t0, reply: String((r && (r.proposal && (r.proposal.text || r.proposal))) || "").slice(0, 60) };
}
async function tryChain(cfg, run, kind = "inbox") {
  const chain = providerChain(cfg, kind);
  const usable = chain.filter((n) => !(blockedUntil[n] > Date.now()));
  const order = usable.length ? usable : chain; // all blocked → try everything again rather than give up
  let lastErr = null;
  for (const name of order) {
    try {
      const r = await run(name);
      delete blockedUntil[name];
      lastVia = name;
      return { ...r, via: name };
    } catch (e) {
      lastErr = e;
      blockedUntil[name] = Date.now() + 10 * 60 * 1000;
      console.warn(`[ai] ${name} failed, trying the next one: ${String(e.message || e).slice(0, 160)}`);
    }
  }
  throw lastErr || new Error("No AI provider is set up – see README (free Groq key).");
}

// Google Antigravity CLI (agy) – signs in with the owner's Google account, free daily quota, Gemini 4 / 3.8 Flash.
// It is a full agent, so it is slower (~25-45 s a call): good as a high-quality backup, not as the first choice.
function agyExe() {
  const known = [path.join(process.env.LOCALAPPDATA || "", "agy", "bin", "agy.exe"), path.join(os.homedir(), ".local", "bin", "agy.exe")];
  return known.find((p) => fs.existsSync(p)) || "";
}
const hasAntigravity = () => !!agyExe();
function viaAntigravity(cfg, prompt, system, schema) {
  const exe = agyExe();
  if (!exe) return Promise.reject(new Error("Antigravity CLI (agy) isn't installed on this PC"));
  const dir = path.join(os.tmpdir(), "tia-agy");
  fs.mkdirSync(dir, { recursive: true });
  // Windows command lines stop at ~32 000 characters – keep the end of the prompt (the actual message) if it is longer
  let text = `${system || ""}

Do not use any tools, files or the web – answer from this text only.

${prompt}`;
  if (text.length > 26000) text = `${text.slice(0, 9000)}
…
${text.slice(-16000)}`;
  const args = ["--model", cfg.antigravityModel || "gemini-3.8-flash-low", "--output-format", "json", "--disable-slash-commands", "--print-timeout", "150s"];
  if (schema) args.push("--json-schema", JSON.stringify(schema));
  args.push(`-p=${text}`);
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { cwd: dir, windowsHide: true });
    let out = "";
    let err = "";
    const t = setTimeout(() => (child.kill(), reject(new Error("Antigravity took too long"))), 170000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => (clearTimeout(t), reject(e)));
    child.on("close", () => {
      clearTimeout(t);
      let j = null;
      try {
        j = JSON.parse(out.slice(out.indexOf("{")));
      } catch {}
      if (!j || j.status !== "SUCCESS") return reject(new Error(`Antigravity: ${(j && (j.error || j.status)) || (err || out).trim().slice(-200) || "no answer"}`));
      if (!schema) return resolve({ proposal: String(j.response || "").trim(), costUsd: 0 });
      const so = j.structured_output;
      const parsed = so && typeof so === "object" ? so : firstJson(typeof so === "string" ? so : j.response);
      if (!parsed) return reject(new Error("Antigravity didn't return the structured answer"));
      resolve({ proposal: parsed, costUsd: 0 });
    });
  });
}

function structured(cfg, name, prompt, system, schema) {
  if (name === "antigravity") return viaAntigravity(cfg, prompt, system, schema);
  if (name === "claude-code") return viaClaudeCode(cfg, prompt, system, schema);
  if (name === "api") return viaApi(cfg, prompt, system, schema);
  if (name === "codex") return viaCodex(cfg, prompt, system, schema);
  return viaOpenAI(cfg, name, prompt, system, schema);
}

async function decide(cfg, vaultContext, message, today) {
  const prompt = userPrompt(vaultContext, message, today);
  return tryChain(cfg, (name) => structured(cfg, name, prompt, systemPrompt(), DECISION_SCHEMA));
}

// Any other structured question (used by voice commands): own system prompt + own answer shape.
async function ask(cfg, { system, schema, prompt }) {
  const r = await tryChain(cfg, (name) => structured(cfg, name, prompt, system, schema), "talk");
  return { answer: r.proposal, costUsd: r.costUsd, via: r.via };
}

// Free-text answer (chat).
async function chat(cfg, { system, prompt }) {
  const r = await tryChain(cfg, (name) => {
    if (name === "claude-code") return viaClaudeText(cfg, prompt, system);
    if (name === "api") return viaApi(cfg, prompt, system, { type: "object", properties: { text: { type: "string" } }, required: ["text"] }).then((x) => ({ ...x, proposal: x.proposal.text }));
    if (name === "antigravity") return viaAntigravity(cfg, prompt, system, null);
    if (name === "codex") return viaCodex(cfg, prompt, system, null);
    return viaOpenAI(cfg, name, prompt, system, null);
  }, "talk");
  return { text: r.proposal, via: r.via };
}

module.exports = { decide, ask, chat, providerChain, aiStatus, testProvider, PRESETS };

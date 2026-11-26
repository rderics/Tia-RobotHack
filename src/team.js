// Team keys without passing files around: the team code (TIA_TEAM_CODE in .env, typed once in the installer or in
// Settings) fetches the shared keys (free AI, WhatsApp Business) from rderics.id.lv/tia-team – again at every start,
// so a changed key reaches everyone. The keys are written to .env on this PC (never committed).
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const URL_ = process.env.TIA_TEAM_URL || "https://rderics.id.lv/tia-team";
// only these names may come from the team (a personal key the owner set himself is never overwritten by something else)
const TEAM_KEYS = new Set(["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_IDS", "WA_RELAY_URL", "WA_RELAY_TOKEN"]);
let last = { at: 0, keys: 0, error: "" };

function writeEnv(updates) {
  const file = path.join(ROOT, ".env");
  let lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split(/\r?\n/) : [];
  for (const [k, v] of Object.entries(updates)) {
    lines = lines.filter((l) => !l.startsWith(`${k}=`));
    lines.push(`${k}=${v}`);
    process.env[k] = v;
  }
  fs.writeFileSync(file, lines.filter((l) => l.trim()).join("\n") + "\n");
}

async function sync(code = process.env.TIA_TEAM_CODE) {
  if (!code) return { ok: false, error: "no team code" };
  try {
    const r = await fetch(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.env) throw new Error(j.error || `HTTP ${r.status}`);
    const updates = { TIA_TEAM_CODE: String(code).trim() };
    for (const line of String(j.env).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
      if (m && TEAM_KEYS.has(m[1]) && m[2].trim()) updates[m[1]] = m[2].trim();
    }
    writeEnv(updates);
    last = { at: Date.now(), keys: Object.keys(updates).length - 1, error: "" };
    return { ok: true, keys: last.keys };
  } catch (e) {
    last = { ...last, error: String(e.message || e) };
    return { ok: false, error: last.error };
  }
}
const status = () => ({ joined: !!process.env.TIA_TEAM_CODE, ...last });

module.exports = { sync, status };

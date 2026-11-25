// Tia's spoken voice: text -> natural speech (Microsoft neural voices via edge-tts) + word timings for lip-sync.
// Used by the big screen (avatar) and the phone. Python helper: src/tts/edge_voice.py
const { spawn } = require("child_process");
const path = require("path");

const SCRIPT = path.join(__dirname, "tts", "edge_voice.py");
const cache = new Map(); // the same sentence is not generated twice (greetings, standard lines)

function synthesize(cfg, text) {
  text = String(text || "").trim().slice(0, 1500);
  const voice = cfg.ttsVoice || "en-US-AvaNeural";
  const key = `${voice}|${text}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  return new Promise((resolve, reject) => {
    const child = spawn(cfg.pythonPath || "python", ["-X", "utf8", SCRIPT], { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("voice took too long"));
    }, 30000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(out.trim().split("\n").pop());
        if (j.error) return reject(new Error(j.error));
        if (cache.size > 200) cache.delete(cache.keys().next().value);
        cache.set(key, j);
        resolve(j);
      } catch {
        reject(new Error(`voice failed: ${(err || out).slice(0, 200)}`));
      }
    });
    child.stdin.end(JSON.stringify({ text, voice, rate: cfg.ttsRate || "+0%" }), "utf8");
  });
}

module.exports = { synthesize };

// Keeps one local speech-to-text worker (Python + faster-whisper) running and sends it audio files.
// Nothing leaves this computer. Each audio file is deleted right after it is transcribed.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

let worker = null;
let ready = null; // Promise<boolean>
const waiting = new Map();
let seq = 0;

function start(cfg) {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    const script = path.join(__dirname, "stt", "stt_worker.py");
    worker = spawn(cfg.pythonPath || "python", ["-u", script, cfg.sttModel || "base.en"], { windowsHide: true });
    const rl = readline.createInterface({ input: worker.stdout });
    rl.on("line", (line) => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      if ("ready" in msg) {
        if (!msg.ready) console.warn("Speech-to-text unavailable:", msg.error);
        else console.log(`Speech-to-text ready (${msg.model}, on this computer)`);
        return resolve(!!msg.ready);
      }
      const job = waiting.get(msg.id);
      if (!job) return;
      waiting.delete(msg.id);
      msg.error ? job.reject(new Error(msg.error)) : job.resolve(msg);
    });
    worker.stderr.on("data", () => {}); // model download progress etc.
    worker.on("error", (e) => {
      console.warn("Speech-to-text could not start:", e.message);
      resolve(false);
    });
    worker.on("exit", () => {
      for (const job of waiting.values()) job.reject(new Error("speech-to-text stopped"));
      waiting.clear();
      worker = null;
      ready = null;
      resolve(false);
    });
  });
  return ready;
}

// Groq's Whisper large (the team key) – much better than the small offline model with a webcam mic and a noisy room.
// A short word list keeps the names Tia should hear right. Falls back to the offline model on any problem.
const VOCAB = "Tia, Ralfs, Ralfs Jefimovs, WhatsApp, Instagram, Slack, Outlook, Gmail, CRM, leads, Meta Ads, Google Calendar, contract, agreement, Oakline Studio, vault, draft.";
async function viaGroq(buffer, ext) {
  const t0 = Date.now();
  const form = new FormData();
  form.append("file", new Blob([buffer]), `voice.${ext || "webm"}`);
  form.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  form.append("language", "en");
  form.append("prompt", VOCAB);
  form.append("response_format", "json");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || `Groq ${r.status}`);
  const text = String(j.text || "").trim();
  return { id: `g${t0}`, text: /^(you|thank you\.?|\.)$/i.test(text) ? "" : text, ms: Date.now() - t0, via: "groq" }; // Whisper's "you" on silence
}

async function transcribe(cfg, buffer, ext) {
  if (process.env.GROQ_API_KEY && cfg.sttProvider !== "local") {
    try {
      return await viaGroq(buffer, ext);
    } catch (e) {
      console.warn(`[voice] Groq speech-to-text failed (${e.message}) – using the offline model`);
    }
  }
  const ok = await start(cfg);
  if (!ok || !worker) throw new Error("Speech-to-text is not available on this computer – type the command instead.");
  const dir = path.join(cfg.dataDir, "voice");
  fs.mkdirSync(dir, { recursive: true });
  const id = `v${Date.now()}_${++seq}`;
  const file = path.join(dir, `${id}.${ext}`);
  fs.writeFileSync(file, buffer);
  try {
    return await new Promise((resolve, reject) => {
      waiting.set(id, { resolve, reject });
      worker.stdin.write(JSON.stringify({ id, path: file }) + "\n");
      setTimeout(() => {
        if (waiting.delete(id)) reject(new Error("speech-to-text took too long"));
      }, 60000);
    });
  } finally {
    fs.rm(file, { force: true }, () => {}); // recordings are never kept
  }
}

module.exports = { start, transcribe };

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

async function transcribe(cfg, buffer, ext) {
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

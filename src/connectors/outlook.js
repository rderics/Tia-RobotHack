// Node side of the Outlook connector (outlook.py does the Outlook work on Windows).
// fetchInbox → newest mail as Tia messages · saveDraft → a reply draft in Outlook (Tia never sends).
const { spawn } = require("child_process");
const path = require("path");

const SCRIPT = path.join(__dirname, "outlook.py");

function run(cfg, args, timeoutMs = 180000) {
  if (process.env.TIA_GUEST === "1") return Promise.reject(new Error("Outlook is not part of the public demo."));
  return new Promise((resolve, reject) => {
    const child = spawn(cfg.pythonPath || "python", ["-X", "utf8", SCRIPT, ...args], { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Outlook took too long to answer"));
    }, timeoutMs);
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
        if (j.error) return reject(new Error(`Outlook: ${j.error}`));
        resolve(j);
      } catch {
        reject(new Error(`Outlook connector failed: ${(err || out).slice(0, 300)}`));
      }
    });
  });
}

async function fetchInbox(cfg) {
  const args = ["list", "--hours", String(cfg.inboxHours || 48), "--limit", String(cfg.inboxLimit || 12)];
  if (cfg.outlookStores && cfg.outlookStores.length) args.push("--stores", cfg.outlookStores.join(","));
  const { messages } = await run(cfg, args);
  return messages.map((m, i) => ({ ...m, id: `m${String(i + 1).padStart(2, "0")}` }));
}

function saveDraft(cfg, message, text) {
  return run(cfg, ["draft", "--entry", message.entryId, "--store", message.storeId, "--text", text], 120000);
}

module.exports = { fetchInbox, saveDraft };

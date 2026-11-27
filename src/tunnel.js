// A public https address for this PC without any account: a Cloudflare "quick tunnel" (cloudflared, free).
// Used when config.json has no publicUrl (every teammate's PC). It makes the phone QR work on any Wi-Fi
// (hackathon networks often block phone ↔ laptop) and lets the WhatsApp relay reach this Tia.
// The address changes every start; Tia re-registers it with the relay and the QR shows the new one.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

let current = "";
let child = null;
const waiters = new Set();

function exe() {
  const known = [
    "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
    "C:\\Program Files\\cloudflared\\cloudflared.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "cloudflared.exe"),
  ];
  return known.find((p) => p && fs.existsSync(p)) || "cloudflared";
}

function start(port) {
  if (child) return;
  try {
    child = spawn(exe(), ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`], { windowsHide: true });
  } catch {
    child = null;
    return;
  }
  const scan = (d) => {
    const m = String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && m[0] !== current) {
      current = m[0];
      console.log(`Public address (quick tunnel): ${current}`);
      for (const fn of waiters) fn(current);
    }
  };
  child.stdout.on("data", scan);
  child.stderr.on("data", scan);
  child.on("error", () => (child = null)); // cloudflared not installed – Tia still works on the local network
  child.on("exit", () => {
    child = null;
    current = "";
  });
  process.on("exit", () => child && child.kill());
}

// The owner's own named tunnel (scripts/tunnel-setup.ps1 → ~/.cloudflared/tia.yml, e.g. tia.rderics.id.lv):
// at every start check it answers, and start it if not – so the phone app works whenever Tia is open.
// It runs on its own (detached), so the phone keeps working even if the Tia window is closed and reopened.
async function ensureNamed() {
  const yml = path.join(require("os").homedir(), ".cloudflared", "tia.yml");
  if (!fs.existsSync(yml)) return { named: false };
  const host = (fs.readFileSync(yml, "utf8").match(/hostname:\s*(\S+)/) || [])[1];
  const name = (fs.readFileSync(yml, "utf8").match(/^tunnel:\s*(\S+)/m) || [])[1] || "tia";
  const up = async () => {
    try {
      const r = await fetch(`https://${host}/connect`, { method: "HEAD", signal: AbortSignal.timeout(8000) });
      return r.status < 500;
    } catch {
      return false;
    }
  };
  if (!host || (await up())) return { named: true, running: true, host };
  const logs = path.join(__dirname, "..", "data", "logs");
  fs.mkdirSync(logs, { recursive: true });
  const out = fs.openSync(path.join(logs, "tunnel.log"), "a");
  const c = spawn(exe(), ["tunnel", "--no-autoupdate", "--config", yml, "run", name], { detached: true, stdio: ["ignore", out, out], windowsHide: true });
  c.unref();
  console.log(`Started the tunnel for ${host}`);
  return { named: true, started: true, host };
}

const url = () => current;
const onUrl = (fn) => (waiters.add(fn), current && fn(current), () => waiters.delete(fn));

module.exports = { start, url, onUrl, ensureNamed };

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

const url = () => current;
const onUrl = (fn) => (waiters.add(fn), current && fn(current), () => waiters.delete(fn));

module.exports = { start, url, onUrl };

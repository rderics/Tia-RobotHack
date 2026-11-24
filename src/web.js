// Tia's server: the big screen (browser or desktop app) and the owner's phone (Expo app) both talk to it.
//
// Two kinds of callers, two rules:
//  • This computer (localhost)  → the full screen and every /api route, no password.
//  • The phone on the same Wi-Fi → ONLY /api/m/* routes, and only with the pairing token
//    shown as a QR code on the big screen. Everything else is refused.
// It uses the Claude login of the person at this computer, so it is never put on the public internet.
//
// Start: npm run web   →   open http://localhost:4747
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const hub = require("./hub");
const engine = require("./brain/engine");
const stt = require("./stt");
const { loadConfig } = require("./brain/config");

const PORT = Number(process.env.TIA_PORT || 4747);
const STATIC_DIR = path.join(__dirname, "renderer");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

// ---------- pairing ----------
function pairToken() {
  const cfg = loadConfig();
  const file = path.join(cfg.dataDir, "pair.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).token;
  } catch {
    const token = crypto.randomBytes(18).toString("base64url");
    fs.writeFileSync(file, JSON.stringify({ token, created: new Date().toISOString() }));
    return token;
  }
}
// Addresses the phone could reach this computer on. Real Wi-Fi/LAN first; virtual adapters last; Tailscale kept as a backup.
function addresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== "IPv4" || a.internal || a.address.startsWith("169.254.")) continue;
      const virtual = /vEthernet|VMware|VirtualBox|WSL|Hyper-V|Docker|Loopback/i.test(name);
      const tailscale = a.address.startsWith("100.") || /tailscale/i.test(name);
      const score = tailscale ? 2 : virtual ? 3 : /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a.address) ? 0 : 1;
      out.push({ ip: a.address, name: tailscale ? "Tailscale" : name, score });
    }
  }
  if (process.env.TIA_HOST_IP) out.push({ ip: process.env.TIA_HOST_IP, name: "set by TIA_HOST_IP", score: -1 });
  const real = out.filter((a) => a.score < 3); // hide WSL / VMware / Hyper-V adapters unless nothing else exists
  const list = (real.length ? real : out).sort((a, b) => a.score - b.score).map(({ ip, name }) => ({ ip, name, url: `http://${ip}:${PORT}` }));
  const pub = loadConfig().publicUrl;
  if (pub) list.unshift({ ip: new URL(pub).host, name: "Internet (works anywhere)", url: pub.replace(/\/$/, "") });
  return list;
}
const pairCode = (url, token) => `tia:${url}?t=${token}`;

// ---------- helpers ----------
// A request through the Cloudflare tunnel also comes from 127.0.0.1 – Cloudflare's own headers tell them apart.
const viaInternet = (req) => !!(req.headers["cf-ray"] || req.headers["cf-connecting-ip"] || req.headers["cf-visitor"]);
const isLocal = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress) && !viaInternet(req);
// The pairing code is the login for everything that is not this computer itself.
function hasToken(req, url) {
  const token = String(req.headers["x-tia-token"] || url.searchParams.get("t") || "");
  const expected = pairToken();
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function sendJson(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body ?? null));
}
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too big"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
async function readJson(req) {
  const buf = await readRaw(req, 1e6);
  return buf.length ? JSON.parse(buf.toString("utf8")) : {};
}
// Audio arrives either as the raw body (browser) or as one file in multipart form data (phone).
async function readAudio(req) {
  const type = req.headers["content-type"] || "";
  const buf = await readRaw(req, 20e6);
  const m = type.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!type.startsWith("multipart/") || !m) return { audio: buf, ext: /webm/.test(type) ? "webm" : /wav/.test(type) ? "wav" : "m4a" };
  const boundary = Buffer.from(`--${m[1] || m[2]}`);
  let start = buf.indexOf(boundary);
  while (start !== -1) {
    const headEnd = buf.indexOf("\r\n\r\n", start);
    if (headEnd === -1) break;
    const head = buf.slice(start, headEnd).toString("utf8");
    const next = buf.indexOf(boundary, headEnd);
    if (/filename=/i.test(head) && next !== -1) {
      const name = (head.match(/filename="([^"]*)"/i) || [])[1] || "";
      const ext = (path.extname(name).slice(1) || "m4a").toLowerCase().replace(/[^a-z0-9]/g, "");
      return { audio: buf.slice(headEnd + 4, next - 2), ext };
    }
    start = next;
  }
  throw new Error("no audio in the upload");
}

// ---------- offer document (printable) ----------
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const eur = (n) => `${Math.round(n).toLocaleString("en-US").replace(/,/g, " ")} €`;
function docPage(c) {
  const lines = (c.lines || []).map((l) => `<tr><td>${esc(l.item)}</td><td class="n">${eur(l.amount_eur)}</td></tr>`).join("");
  const stamp = c.state === "open" ? `<div class="stamp draft">Draft – waiting for approval</div>` : c.state === "rejected" ? `<div class="stamp draft">Rejected</div>` : `<div class="stamp ok">Approved by Mārtiņš Ozols</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.title)}</title><style>
  @page{size:A4;margin:22mm 20mm}
  *{box-sizing:border-box}body{margin:0;background:#EDEBE6;font:14px/1.55 "Segoe UI",system-ui,sans-serif;color:#1C1B1F}
  .page{max-width:780px;margin:24px auto;background:#fff;padding:56px 60px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #1C1B1F;padding-bottom:18px;margin-bottom:34px}
  .co{font-size:20px;font-weight:600;letter-spacing:-.01em}.co small{display:block;font-size:12px;font-weight:400;color:#6B6870;letter-spacing:0}
  .meta{text-align:right;font-size:12px;color:#6B6870}
  h1{font-size:30px;font-weight:500;letter-spacing:-.02em;margin:0 0 6px}
  .to{color:#6B6870;margin-bottom:28px}
  .note{white-space:pre-wrap;margin:0 0 30px;max-width:60ch}
  table{width:100%;border-collapse:collapse}td{padding:11px 0;border-bottom:1px solid #E4E1DA}td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  tr.total td{border-bottom:0;border-top:1px solid #1C1B1F;font-weight:600;font-size:17px;padding-top:14px}
  .fine{margin-top:34px;font-size:12px;color:#6B6870}
  .stamp{display:inline-block;margin-top:30px;padding:6px 12px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;border:1px solid}
  .stamp.ok{color:#1E6B4A;border-color:#1E6B4A}.stamp.draft{color:#9A5B12;border-color:#9A5B12}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0;padding:0;max-width:none}}
  </style></head><body><div class="page">
  <header><div class="co">Liepa Interjers<small>Custom kitchens · built-in furniture · Riga</small></div>
  <div class="meta">${esc(engine.info().today.split(",")[0])}<br>Prepared by Tia for Mārtiņš Ozols</div></header>
  <h1>${esc(c.title)}</h1><div class="to">For ${esc(c.from)}${c.validUntil ? ` · valid until ${esc(c.validUntil)}` : ""}</div>
  ${c.text ? `<p class="note">${esc(c.text)}</p>` : ""}
  ${lines ? `<table>${lines}<tr class="total"><td>Total</td><td class="n">${eur(c.total)}</td></tr></table>` : ""}
  <div class="fine">Prices include installation. Appliances, plumbing and electrical works not included. Demo document – fictional business.</div>
  ${stamp}</div></body></html>`;
}

// ---------- routes ----------
async function phoneApi(req, res, route, url) {
  if (!hasToken(req, url)) return sendJson(res, 401, { error: "Not paired – scan the QR code on Tia's screen again." });

  if (req.method === "GET" && route === "/api/m/hello") return sendJson(res, 200, { ok: true, business: "Liepa Interjers", owner: "Mārtiņš Ozols" });
  if (req.method === "GET" && route === "/api/m/state") {
    const since = Number(url.searchParams.get("v") || 0);
    await hub.waitForChange(since, 20000); // long-poll: answers as soon as something changes
    return sendJson(res, 200, hub.snapshot());
  }
  const doc = route.match(/^\/api\/m\/doc\/(\w+)$/);
  if (req.method === "GET" && doc) {
    const c = hub.getItem(doc[1]);
    if (!c) return sendJson(res, 404, { error: "not found" });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(docPage(c));
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
  return actions(req, res, route.replace("/api/m/", "/api/"), "phone");
}

// Shared by the big screen (/api/...) and the phone (/api/m/... → same names).
async function actions(req, res, route, via) {
  if (route === "/api/run") {
    const body = await readJson(req);
    hub.runDay(["replay", "live", "auto"].includes(body.mode) ? body.mode : "auto").catch((e) => console.warn(`[inbox] ${e.message}`));
    return sendJson(res, 200, { ok: true });
  }
  if (route === "/api/decide") {
    const body = await readJson(req);
    return sendJson(res, 200, await hub.decide({ id: String(body.id), verdict: body.verdict, editedText: body.editedText, via }));
  }
  if (route === "/api/say") {
    const body = await readJson(req);
    try {
      return sendJson(res, 200, await hub.command(body.text, via));
    } catch (e) {
      return sendJson(res, 200, { error: String(e.message || e), say: String(e.message || e) });
    }
  }
  if (route === "/api/voice") {
    const t0 = Date.now();
    let size = 0;
    try {
      const { audio, ext } = await readAudio(req);
      size = audio.length;
      console.log(`[voice] ${via}: ${Math.round(size / 1024)} KB .${ext}`);
      if (audio.length < 2000) {
        console.warn(`[voice] ${via}: too short (${audio.length} bytes)`);
        return sendJson(res, 200, { error: "too short", say: "I didn't hear anything – hold the button while you talk." });
      }
      const t = await stt.transcribe(loadConfig(), audio, ext);
      if (!t.text) {
        console.warn(`[voice] ${via}: no words found in the audio (${t.ms} ms)`);
        return sendJson(res, 200, { error: "empty", say: "I didn't catch that. Could you say it again?" });
      }
      console.log(`[voice] heard "${t.text}" (${t.ms} ms)`);
      const out = await hub.command(t.text, via);
      return sendJson(res, 200, { ...out, transcript: t.text, sttMs: t.ms });
    } catch (e) {
      console.warn(`[voice] ${via}: failed after ${Date.now() - t0} ms (${Math.round(size / 1024)} KB): ${e.message}`);
      return sendJson(res, 200, { error: String(e.message || e), say: "Sorry, I couldn't hear that properly. Try again or type it." });
    }
  }
  if (route === "/api/reset") {
    hub.reset();
    return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 404, { error: "not found" });
}

async function localApi(req, res, route, url) {
  if (req.method === "GET" && route === "/api/info") return sendJson(res, 200, { ...engine.info(), live: true });
  if (req.method === "GET" && route === "/api/state") return sendJson(res, 200, hub.snapshot());
  if (req.method === "GET" && route === "/api/pair") {
    const list = addresses();
    const pick = list.find((a) => a.ip === url.searchParams.get("ip")) || list[0];
    if (!pick) return sendJson(res, 200, { addresses: [], error: "No network found – connect this computer to Wi-Fi." });
    const code = pairCode(pick.url, pairToken());
    const svg = await QRCode.toString(code, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111013", light: "#ffffff" } });
    const pub = loadConfig().publicUrl;
    return sendJson(res, 200, { addresses: list, selected: pick, svg, webLink: pub ? `${pub.replace(/\/$/, "")}/#t=${pairToken()}` : "" });
  }
  if (req.method === "GET" && route === "/api/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(": connected\n\n");
    const off = hub.onEvent((ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`));
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    req.on("close", () => {
      off();
      clearInterval(ping);
    });
    return;
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
  if (route === "/api/feedback") {
    // older screens: { message, verdict, editedReply }
    const body = await readJson(req);
    return sendJson(res, 200, await hub.decide({ id: body.message.id, verdict: body.verdict, editedText: body.editedReply, via: "desktop" }));
  }
  return actions(req, res, route, "desktop");
}

function serveStatic(req, res, route, url) {
  const doc = route.match(/^\/doc\/(\w+)$/);
  if (doc) {
    if (!isLocal(req) && !hasToken(req, url)) return sendJson(res, 401, { error: "Log in first." });
    const c = hub.getItem(doc[1]);
    if (!c) return sendJson(res, 404, { error: "not found" });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(docPage(c));
  }
  const rel = route === "/" ? "index.html" : decodeURIComponent(route.slice(1));
  const file = path.normalize(path.join(STATIC_DIR, rel));
  if (!file.startsWith(STATIC_DIR + path.sep)) return sendJson(res, 403, { error: "forbidden" });
  fs.readFile(file, (err, buf) => {
    if (err) return sendJson(res, 404, { error: "not found" });
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(buf);
  });
}

function start() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const route = url.pathname;
    const origin = req.headers.origin;
    // Phone routes are protected by the pairing token, so any origin may call them (the phone app, or the
    // same app running in a browser for testing). Browsers first ask with OPTIONS.
    if (route.startsWith("/api/m/")) {
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("access-control-allow-headers", "x-tia-token, content-type");
      res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }
      try {
        return await phoneApi(req, res, route, url);
      } catch (e) {
        return sendJson(res, 500, { error: String(e.message || e) });
      }
    }
    // Browsers send Origin: only Tia's own page may call the rest of the API (blocks other websites from driving Tia).
    const pub = loadConfig().publicUrl;
    const allowed = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, pub && new URL(pub).origin].filter(Boolean);
    if (origin && !allowed.includes(origin)) return sendJson(res, 403, { error: "forbidden origin" });
    try {
      if (route.startsWith("/api/")) {
        // This computer: no login. Anywhere else (the domain, the local network): the pairing code.
        if (!isLocal(req) && !hasToken(req, url)) return sendJson(res, 401, { error: "login", login: true });
        return await localApi(req, res, route, url);
      }
      if (!isLocal(req) && !viaInternet(req)) return sendJson(res, 403, { error: "Use the phone app or the Tia web address." });
      return serveStatic(req, res, route, url);
    } catch (e) {
      return sendJson(res, 500, { error: String(e.message || e) });
    }
  });
  return new Promise((resolve) => {
    server.listen(PORT, "0.0.0.0", () => {
      const first = addresses()[0];
      console.log(`Tia is running: http://localhost:${PORT}  (Ctrl+C to stop)`);
      if (first) console.log(`Phone: scan the QR code on Tia's screen (phone connects to ${first.url})`);
      if (loadConfig().stt !== false) stt.start(loadConfig()); // warm up speech-to-text in the background
      resolve(server);
    });
  });
}

if (require.main === module) start();
module.exports = { start, PORT };

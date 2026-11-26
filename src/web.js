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
const voice = require("./voice");
const { loadConfig } = require("./brain/config");

const PORT = Number(process.env.TIA_PORT || 4747);
const STATIC_DIR = path.join(__dirname, "renderer");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".glb": "model/gltf-binary" };

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
  const pub = publicUrl();
  if (pub) list.unshift({ ip: new URL(pub).host, name: "Internet (works anywhere)", url: pub.replace(/\/$/, "") });
  return list;
}
const pairCode = (url, token) => `tia:${url}?t=${token}`;

// The phone app as published to Expo (npx eas-cli update → data/eas-update.json). Opening this link on a phone
// starts the app in Expo Go; the part after /--/ tells the app where Tia is and her code, so it connects by itself.
function appLink(url, token) {
  try {
    const app = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "mobile", "app.json"), "utf8")).expo;
    const projectId = app.extra.eas.projectId;
    // mobile/eas-update.json is committed (teammates get the app link too); data/ is the local fallback
    const local = [path.join(__dirname, "..", "mobile", "eas-update.json"), path.join(loadConfig().dataDir, "eas-update.json")].find((f) => fs.existsSync(f));
    const updates = JSON.parse(fs.readFileSync(local, "utf8").replace(/^\uFEFF/, ""));
    const group = updates[0].group;
    return `exp://u.expo.dev/${projectId}/group/${group}/--/connect?u=${encodeURIComponent(url)}&t=${token}`;
  } catch {
    return ""; // app not published yet
  }
}

// ---------- /connect: where the QR on Tia's screen leads (any phone camera) ----------
function connectPage(req, res, url) {
  const token = String(url.searchParams.get("t") || "").replace(/[^\w-]/g, "");
  const pub = (publicUrl() || "").replace(/\/$/, "");
  const base = viaInternet(req) && pub ? pub : `http://${String(req.headers.host || "").replace(/[^\w.:-]/g, "")}`;
  const app = token ? appLink(base, token) : "";
  let links = {};
  try {
    links = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "mobile", "app-links.json"), "utf8"));
  } catch {}
  const esc = (v) => String(v || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const info = engine.info();
  const own = [links.tiaAppStore && `<a class="b" href="${esc(links.tiaAppStore)}">Tia for iPhone</a>`, links.tiaPlayStore && `<a class="b" href="${esc(links.tiaPlayStore)}">Tia for Android</a>`, links.tiaAndroidApk && `<a class="b ghost" href="${esc(links.tiaAndroidApk)}">Android app (test build)</a>`].filter(Boolean).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect your phone – Tia</title><style>
*{box-sizing:border-box}body{margin:0;background:#0E0D13;color:#ECEAF2;font:16px/1.5 "Segoe UI",system-ui,-apple-system,sans-serif;display:flex;justify-content:center}
main{width:100%;max-width:420px;padding:36px 22px 40px}h1{font-size:26px;margin:14px 0 4px}p{color:#B5B0BF;margin:0 0 18px}
.logo{width:54px;height:54px;border-radius:16px;background:#221E30;display:flex;align-items:center;justify-content:center;color:#B9A3F2;font-weight:800;font-size:20px}
.step{background:#17151F;border:1px solid #26232F;border-radius:16px;padding:16px;margin-bottom:12px}.step h2{font-size:15px;margin:0 0 4px}.step p{font-size:14px;margin:0 0 12px}
.b{display:block;text-align:center;text-decoration:none;font-weight:700;border-radius:12px;padding:13px;margin-top:8px;background:#B9A3F2;color:#16131F}
.b.ghost{background:transparent;color:#B9A3F2;border:1px solid #3A3450}.row{display:flex;gap:8px}.row .b{flex:1}
.small{font-size:12.5px;color:#8C8796;margin-top:18px}.bad{color:#F2A3A3}
</style></head><body><main>
<div class="logo">T</div><h1>Connect your phone to Tia</h1><p>${esc(info.business)} · ${esc(info.owner)}</p>
${token ? `
${links.tiaAndroidApk ? `<div class="step only-android"><h2>Android · 1 tap install</h2><p>Download the Tia app, open the file and tap <b>Install</b> (allow “install unknown apps” for your browser once). Then come back here and tap <b>Open Tia – connected</b>.</p>
<a class="b" href="${esc(links.tiaAndroidApk)}">Download the Tia app (Android)</a>
<a class="b ghost" href="${esc(`tia://connect?u=${encodeURIComponent(base)}&t=${token}`)}">Open Tia – connected</a></div>` : ""}
<div class="step ${links.tiaAndroidApk ? "only-ios" : ""}"><h2>${links.tiaAndroidApk ? "iPhone · in Expo Go" : "1 · Open the Tia app"}</h2><p>Opens Tia on your phone and connects it to this desk – no typing. It runs inside the free <b>Expo Go</b> app: install it first if you don't have it, then come back and tap the button.</p>
<a class="b" href="${esc(app)}">Open in the Tia app</a>
<div class="row"><a class="b ghost" href="${esc(links.expoGoIos)}">Expo Go – iPhone</a><a class="b ghost" href="${esc(links.expoGoAndroid)}">Expo Go – Android</a></div></div>
<div class="step"><h2>Or use the browser</h2><p>The same desk in your phone's browser.</p><a class="b ghost" href="${esc(base)}/#t=${esc(token)}">Open Tia in the browser</a></div>
<p class="small">This link holds your Tia code – don't share it. Scan the QR on Tia's screen again for a fresh one.</p>`
  : `<p class="bad">This link has no Tia code. Open Tia on the computer → <b>Connect phone</b> → scan the QR code.</p>`}
<script>var A=/android/i.test(navigator.userAgent),I=/iphone|ipad|ipod/i.test(navigator.userAgent);document.querySelectorAll(A?".only-ios":I?".only-android":"._none").forEach(function(e){e.remove()})</script>
</main></body></html>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" });
  return res.end(html);
}

// ---------- helpers ----------
// A request through the Cloudflare tunnel also comes from 127.0.0.1 – Cloudflare's own headers tell them apart.
// The address phones and the WhatsApp relay use: config.json publicUrl, else the quick tunnel (src/tunnel.js)
const publicUrl = () => loadConfig().publicUrl || require("./tunnel").url() || "";
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

// ---------- printable documents (shared with the real PDF actions) ----------
const { offerHtml, contractHtml } = require("./actions/documents");
function docPage(c) {
  const info = engine.info();
  const item = hub.rawItem ? hub.rawItem(c.id) : null;
  if (c.kind === "contract" && item) return contractHtml(info, loadConfig(), item.proposal, { contractNo: "(draft)", date: new Date().toLocaleDateString("en-GB").replace(/\//g, ".") });
  return offerHtml(info, c);
}

// ---------- routes ----------
async function phoneApi(req, res, route, url) {
  if (!hasToken(req, url)) return sendJson(res, 401, { error: "Not paired – scan the QR code on Tia's screen again." });

  if (req.method === "GET" && route === "/api/m/hello") { const i = engine.info(); return sendJson(res, 200, { ok: true, business: i.business, owner: i.owner }); }
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
  if (route === "/api/m/log") {
    const body = await readJson(req);
    console.log(`[phone] ${String(body.event || "").slice(0, 40)} ${String(body.detail || "").slice(0, 300)}`);
    return sendJson(res, 200, { ok: true });
  }
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
  if (route === "/api/tts") {
    const body = await readJson(req);
    try {
      return sendJson(res, 200, await voice.synthesize(loadConfig(), body.text));
    } catch (e) {
      return sendJson(res, 200, { error: String(e.message || e) });
    }
  }
  if (route === "/api/chat") {
    const body = await readJson(req);
    try {
      return sendJson(res, 200, await hub.chat(body.messages));
    } catch (e) {
      return sendJson(res, 200, { error: String(e.message || e), content: "Sorry – I couldn't answer just now." });
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
    const qr = (text) => QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111013", light: "#ffffff" } });
    const svg = await qr(code);
    const open = appLink(pick.url, pairToken());
    // The QR opens a normal web page (works with any phone camera); that page opens the app, offers to install it,
    // or continues in the browser. The same QR will lead to our own store app later.
    const connect = `${pick.url.replace(/\/$/, "")}/connect?t=${pairToken()}`;
    const appSvg = await qr(connect);
    const pub = publicUrl();
    // Through the website only the public address makes sense – the home network addresses are hidden there.
    const shown = isLocal(req) ? list : list.filter((a) => a.url === (pub || "").replace(/\/$/, ""));
    return sendJson(res, 200, { addresses: shown, selected: pick, svg, appSvg, connect, appLink: open, webLink: pub ? `${pub.replace(/\/$/, "")}/#t=${pairToken()}` : "" });
  }
  // ---------- The owner's real accounts through Composio (read + draft only) ----------
  if (route.startsWith("/api/live/")) {
    const L = require("./connectors/live");
    const cfg = loadConfig();
    const fresh = url.searchParams.get("refresh") === "1";
    const app = route.slice("/api/live/".length);
    try {
      if (req.method === "GET") {
        if (app === "img") return L.image(url.searchParams.get("u") || "", res);
        if (app === "whatsapp") return sendJson(res, 200, require("./connectors/whatsapp").data(cfg));
        if (app === "drafts") return sendJson(res, 200, L.drafts(cfg));
        if (["status", "gmail", "slack", "instagram", "linkedin", "ads"].includes(app)) return sendJson(res, 200, await L[app](cfg, fresh));
      }
      if (req.method === "POST") {
        const body = await readJson(req);
        if (app === "draft") return sendJson(res, 200, await L.saveDraft(cfg, body));
        if (app === "whatsapp/send") {
          // the owner pressed Send on a reply (his approval) – Tia never calls this by herself
          const W = require("./connectors/whatsapp");
          const r = await W.send(cfg, String(body.waId || ""), String(body.text || ""));
          hub.emit({ type: "whatsapp-sent", chat: String(body.waId || ""), at: Date.now() });
          return sendJson(res, 200, r);
        }
        if (app === "whatsapp/draft") return sendJson(res, 200, await require("./connectors/whatsapp").draftFor(cfg, String(body.waId || "")));
        if (app === "whatsapp/read") return sendJson(res, 200, (require("./connectors/whatsapp").markRead(cfg, String(body.waId || "")), { ok: true }));
        if (app === "link") return sendJson(res, 200, await require("./connectors/composio").link(body.app === "ads" ? "metaads" : body.app));
        if (app === "suggest") return sendJson(res, 200, await L.suggest(cfg, body));
        if (app === "linkedin/write") return sendJson(res, 200, await L.linkedinPost(cfg, body));
        if (app === "ads/review") return sendJson(res, 200, await L.reviewAd(cfg, body));
      }
      return sendJson(res, 404, { error: "unknown live route" });
    } catch (e) {
      return sendJson(res, 502, { error: String(e.message || e).slice(0, 300) });
    }
  }
  // ---------- Business vault (tab on the screen) ----------
  if (route.startsWith("/api/vault/")) {
    const V = require("./vault-api");
    const cfg = loadConfig();
    if (req.method === "GET" && route === "/api/vault/tree") return sendJson(res, 200, { notes: V.tree(cfg), editable: V.editable(cfg), name: path.basename(cfg.vaultDir) });
    if (req.method === "GET" && route === "/api/vault/note") return sendJson(res, 200, V.read(cfg, url.searchParams.get("path")));
    if (req.method === "GET" && route === "/api/vault/search") return sendJson(res, 200, V.search(cfg, url.searchParams.get("q")));
    if (req.method === "GET" && route === "/api/vault/graph") return sendJson(res, 200, V.graph(cfg));
    if (req.method === "POST" && route === "/api/vault/note") {
      const body = await readJson(req);
      return sendJson(res, 200, V.save(cfg, body.path, body.text));
    }
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

// ---------- CRM (Tia's own; the CSV in data/crm.csv imports into Google Sheets) ----------
function crmPage() {
  const info = engine.info();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>CRM – ${info.business}</title><style>
  body{margin:0;background:#0E0D13;color:#ECEAF2;font:14px/1.5 "Segoe UI",system-ui,sans-serif}
  header{display:flex;justify-content:space-between;align-items:baseline;padding:22px 32px;border-bottom:1px solid #26232F}
  h1{margin:0;font-size:20px;font-weight:600}h1 span{color:#B9A3F2}.sub{color:#8C8796;font-size:12px}
  table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8C8796;padding:12px 16px;border-bottom:1px solid #26232F}
  td{padding:12px 16px;border-bottom:1px solid #1C1A24;vertical-align:top}tr.new{animation:in 1.2s ease}
  @keyframes in{from{background:rgba(185,163,242,.25)}to{background:transparent}}
  .fit{display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}.bar{width:70px;height:6px;border-radius:3px;background:#26232F;overflow:hidden}.bar i{display:block;height:100%;background:#B9A3F2}
  .st{font-size:11px;padding:3px 8px;border-radius:99px;background:#26232F;color:#8C8796;white-space:nowrap}.st.go{background:rgba(76,195,138,.16);color:#4CC38A}
  a{color:#B9A3F2;text-decoration:none}.why{color:#B5B0BF;max-width:46ch}.name{font-weight:600}.seg{color:#8C8796;font-size:12px}
  footer{padding:14px 32px;color:#6B6773;font-size:11px}</style></head><body>
  <header><div><h1><span>CRM</span> · ${info.business}</h1><div class="sub">Leads found by Tia – nobody is contacted without the owner's OK</div></div>
  <div class="sub"><a href="crm/data.csv">Download CSV (Excel / Google Sheets)</a> · <span id="n"></span></div></header>
  <table><thead><tr><th>Business</th><th>Fit</th><th>Why</th><th>Contact</th><th>Status</th><th>Found</th></tr></thead><tbody id="rows"></tbody></table>
  <footer>Business data © OpenStreetMap contributors (ODbL) and each business's own website.</footer>
  <script>
  const seen=new Set();const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  async function load(){try{const rows=await (await fetch("crm/data",{cache:"no-store"})).json();
  document.getElementById("n").textContent=rows.length+" leads";
  document.getElementById("rows").innerHTML=rows.map(r=>'<tr class="'+(seen.has(r.id)?'':'new')+'"><td><div class="name">'+esc(r.name)+'</div><div class="seg">'+esc(r.segment)+(r.address?' · '+esc(r.address):'')+'</div></td>'+
  '<td><div class="fit"><div class="bar"><i style="width:'+(r.fit||0)+'%"></i></div>'+(r.fit||0)+'%</div></td><td class="why">'+esc(r.why)+'</td>'+
  '<td>'+(r.website?'<a href="'+esc(r.website)+'" target="_blank">'+esc(r.website.replace(/^https?:\\/\\//,'').replace(/\\/$/,''))+'</a><br>':'')+esc(r.email)+'</td>'+
  '<td><span class="st '+(r.status==="to contact"?'go':'')+'">'+esc(r.status)+'</span></td><td class="seg">'+esc(r.found_at)+'</td></tr>').join("");
  rows.forEach(r=>seen.add(r.id));}catch(e){}}
  load();setInterval(load,1500);</script></body></html>`;
}

function serveStatic(req, res, route, url) {
  if (route === "/crm" || route === "/crm/data" || route === "/crm/data.csv") {
    if (!isLocal(req) && !hasToken(req, url)) return sendJson(res, 401, { error: "Log in first." });
    const { loadCrm } = require("./leads/finder");
    if (route === "/crm/data") return sendJson(res, 200, loadCrm(loadConfig()));
    if (route === "/crm/data.csv") {
      const f = require("path").join(loadConfig().dataDir, "crm.csv");
      res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=tia-crm.csv" });
      return res.end(require("fs").existsSync(f) ? require("fs").readFileSync(f) : "");
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(crmPage());
  }
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
    const pub = publicUrl();
    const allowed = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, pub && new URL(pub).origin].filter(Boolean);
    if (origin && !allowed.includes(origin)) return sendJson(res, 403, { error: "forbidden origin" });
    try {
      // Meta calls this when someone messages the WhatsApp Business number (public; checked by verify token,
      // the accepted phone-number IDs and – if set – Meta's signature). Server-to-server, so no Origin header.
      if (route === "/webhooks/whatsapp") {
        const W = require("./connectors/whatsapp");
        if (req.method === "GET") return W.verify(url, res);
        if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
        const cfg = loadConfig();
        const fresh = await W.receive(cfg, req, res);
        const chats = [...new Set(fresh.map((f) => f.chat))];
        for (const f of fresh) hub.emit({ type: "whatsapp-in", chat: f.chat, text: f.message.text, at: Date.now() });
        for (const id of chats)
          W.draftFor(cfg, id)
            .then((c) => c && hub.emit({ type: "whatsapp-draft", chat: id, at: Date.now() }))
            .catch((e) => console.warn(`[whatsapp] draft failed: ${e.message || e}`));
        return;
      }
      if (route.startsWith("/api/")) {
        // This computer: no login. Anywhere else (the domain, the local network): the pairing code.
        if (!isLocal(req) && !hasToken(req, url)) return sendJson(res, 401, { error: "login", login: true });
        return await localApi(req, res, route, url);
      }
      if (route === "/connect") return connectPage(req, res, url); // public: holds no secrets, the code comes in the link
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
      startOnline();
      resolve(server);
    });
  });
}

// Public address + WhatsApp: on a PC without config.publicUrl, open a quick tunnel; then tell the WhatsApp relay
// "send messages here" and fetch anything it kept while this PC was off. The Tia that starts last receives WhatsApp.
function startOnline() {
  const cfg = loadConfig();
  const W = require("./connectors/whatsapp");
  const tunnel = require("./tunnel");
  const onMessages = (fresh) => {
    const chats = [...new Set(fresh.map((f) => f.chat))];
    for (const f of fresh) hub.emit({ type: "whatsapp-in", chat: f.chat, text: f.message.text, at: Date.now() });
    for (const id of chats) W.draftFor(loadConfig(), id).then((c) => c && hub.emit({ type: "whatsapp-draft", chat: id, at: Date.now() })).catch(() => {});
  };
  const register = (url) =>
    W.registerWithRelay(url, os.hostname())
      .then((r) => r && r.ok && console.log(`WhatsApp relay: messages now come to ${url}`))
      .catch((e) => console.warn(`[whatsapp] relay registration failed: ${e.message || e}`));
  if (cfg.publicUrl) register(cfg.publicUrl.replace(/\/$/, ""));
  else if (cfg.quickTunnel !== false && process.env.TIA_QUICK_TUNNEL !== "0") {
    tunnel.start(PORT);
    tunnel.onUrl(register);
  }
  const pull = () => W.pullFromRelay(loadConfig(), onMessages).catch(() => {});
  pull();
  setInterval(pull, 20000).unref(); // backup in case a forward was missed
}

if (require.main === module) start();
module.exports = { start, PORT };

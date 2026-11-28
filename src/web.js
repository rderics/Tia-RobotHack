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
  if (route === "/api/stop") return sendJson(res, 200, hub.stop(via));
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
        if (app === "whatsapp/link") {
          const st = require("./connectors/wa-link").status();
          return sendJson(res, 200, { ...st, qrSvg: st.qr ? await QRCode.toString(st.qr, { type: "svg", margin: 1, color: { dark: "#111B21", light: "#FFFFFF" } }) : "" });
        }
        if (app === "whatsapp") return sendJson(res, 200, require("./connectors/whatsapp").data(cfg));
        if (app === "calendar") return sendJson(res, 200, await L.calendar(cfg, url.searchParams.get("week")));
        if (app === "drafts") return sendJson(res, 200, L.drafts(cfg));
        if (["status", "gmail", "outlook", "slack", "instagram", "linkedin", "ads"].includes(app)) return sendJson(res, 200, await L[app](cfg, fresh));
      }
      if (req.method === "POST") {
        const body = await readJson(req);
        if (app === "draft") return sendJson(res, 200, await L.saveDraft(cfg, body));
        if (app === "calendar/add") return sendJson(res, 200, await L.addEvent(cfg, body));
        if (app === "calendar/parse") return sendJson(res, 200, await L.parseEvent(cfg, body));
        if (app === "whatsapp/screen-result") return sendJson(res, 200, hub.screenResult(body));
        if (app === "whatsapp/send") {
          // the owner pressed Send on a reply (his approval) – Tia never calls this by herself
          const W = require("./connectors/whatsapp");
          const r = await W.send(cfg, String(body.waId || ""), String(body.text || ""));
          hub.emit({ type: "whatsapp-sent", chat: String(body.waId || ""), at: Date.now() });
          return sendJson(res, 200, r);
        }
        if (app === "whatsapp/link" || app === "whatsapp/unlink") {
          if (!isLocal(req)) return sendJson(res, 403, { error: "Link WhatsApp on the PC Tia runs on." });
          const WL = require("./connectors/wa-link");
          if (app === "whatsapp/unlink") return sendJson(res, 200, await WL.unlink(cfg));
          await WL.start(cfg, linkedMessages);
          return sendJson(res, 200, WL.status());
        }
        if (app === "whatsapp/draft") return sendJson(res, 200, await require("./connectors/whatsapp").draftFor(cfg, String(body.waId || "")));
        if (app === "whatsapp/read") return sendJson(res, 200, (require("./connectors/whatsapp").markRead(cfg, String(body.waId || "")), { ok: true }));
        if (app === "link") return sendJson(res, 200, await require("./connectors/composio").link({ ads: "metaads", calendar: "googlecalendar" }[body.app] || body.app));
        if (app === "suggest") return sendJson(res, 200, await L.suggest(cfg, body));
        if (app === "linkedin/write") return sendJson(res, 200, await L.linkedinPost(cfg, body));
        if (app === "ads/review") return sendJson(res, 200, await L.reviewAd(cfg, body));
        if (app === "instagram/review") return sendJson(res, 200, await L.instagramReview(cfg, !!body.fresh));
      }
      return sendJson(res, 404, { error: "unknown live route" });
    } catch (e) {
      return sendJson(res, 502, { error: String(e.message || e).slice(0, 300) });
    }
  }
  // ---------- Settings: which AI thinks (order, model, key), test it, see the connections ----------
  if (route.startsWith("/api/settings")) {
    const P = require("./brain/providers");
    const cfg = loadConfig();
    if (req.method === "GET" && route === "/api/settings") {
      const st = P.aiStatus(cfg);
      const keys = {};
      for (const k of ["ANTHROPIC_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY", "TIA_AI_KEY"]) keys[k] = process.env[k] ? `••••${String(process.env[k]).slice(-4)}` : "";
      let live = {};
      try {
        live = await require("./connectors/live").status(cfg);
      } catch {}
      const W = require("./connectors/whatsapp").data(cfg);
      return sendJson(res, 200, {
        canEdit: isLocal(req), // keys are changed only on the PC itself, never over the internet
        ai: { chain: st.chain, now: st.now, nowLabel: st.now ? st.label(st.now) : "", providers: st.providers },
        keys,
        custom: { baseUrl: process.env.TIA_AI_BASE_URL || "", model: process.env.TIA_AI_MODEL || "" },
        business: { name: cfg.business, owner: cfg.owner, profile: cfg.profile, vault: path.basename(cfg.vaultDir) },
        composio: await require("./connectors/composio").whoami(),
        team: require("./team").status(),
        update: require("./updater").status(),
        connections: { ...live, whatsappBusiness: { state: W.canSend ? "connected" : W.relay ? "pending" : "missing", name: W.relay ? "messages arrive via the team relay" : "" } },
        publicUrl: publicUrl(),
      });
    }
    if (req.method === "POST" && route === "/api/settings/signin") {
      // opens the sign-in for an AI that works with an account instead of a key (a window the owner finishes himself)
      if (!isLocal(req)) return sendJson(res, 403, { error: "Sign in on the PC Tia runs on." });
      const body = await readJson(req);
      const { spawn: sp } = require("child_process");
      const win = (title, cmd) => sp("cmd", ["/c", "start", `"${title}"`, "cmd", "/k", cmd], { detached: true, stdio: "ignore", windowsHide: false }).unref();
      if (body.id === "codex") win("ChatGPT sign-in for Tia", "npm install -g @openai/codex && codex login && echo. && echo Signed in - you can close this window.");
      else if (body.id === "claude-code") win("Claude sign-in for Tia", "where claude >nul 2>nul || powershell -NoProfile -Command \"irm https://claude.ai/install.ps1 | iex\" & claude");
      else if (body.id === "antigravity") require("./actions").open("https://antigravity.google/download");
      else return sendJson(res, 400, { error: "unknown" });
      return sendJson(res, 200, { ok: true });
    }
    if (route === "/api/settings/update") {
      const U = require("./updater");
      if (req.method === "GET") return sendJson(res, 200, U.status());
      if (!isLocal(req)) return sendJson(res, 403, { error: "Update on the PC Tia runs on." });
      const body = await readJson(req);
      if (body.restart) {
        sendJson(res, 200, { ok: true, restarting: true });
        return U.restart();
      }
      return sendJson(res, 200, await U.check((u) => hub.emit({ type: "update", ...u })));
    }
    if (req.method === "POST" && route === "/api/settings/team") {
      if (!isLocal(req)) return sendJson(res, 403, { error: "Join the team on the PC Tia runs on." });
      const body = await readJson(req);
      const r = await require("./team").sync(String(body.code || "").trim());
      if (r.ok) require("./connectors/whatsapp").registerWithRelay(publicUrl(), os.hostname()).catch(() => {});
      return sendJson(res, 200, r);
    }
    if (req.method === "POST" && route === "/api/settings/composio-login") {
      if (!isLocal(req)) return sendJson(res, 403, { error: "Sign in on the PC Tia runs on." });
      return sendJson(res, 200, require("./connectors/composio").login());
    }
    if (req.method === "POST" && route === "/api/settings/test") {
      const body = await readJson(req);
      try {
        return sendJson(res, 200, await P.testProvider(cfg, String(body.id || "")));
      } catch (e) {
        return sendJson(res, 200, { ok: false, error: String(e.message || e).slice(0, 240) });
      }
    }
    if (req.method === "POST" && route === "/api/settings") {
      if (!isLocal(req)) return sendJson(res, 403, { error: "Settings can only be changed on the PC Tia runs on." });
      const body = await readJson(req);
      // keys → .env (only the known names)
      const allowed = new Set(["ANTHROPIC_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY", "TIA_AI_KEY", "TIA_AI_BASE_URL", "TIA_AI_MODEL"]);
      const envFile = path.join(__dirname, "..", ".env");
      let lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").split(/\r?\n/) : [];
      for (const [k, v] of Object.entries(body.keys || {})) {
        if (!allowed.has(k) || typeof v !== "string") continue;
        const val = v.trim();
        if (/^••••/.test(val)) continue; // the masked value came back unchanged
        lines = lines.filter((l) => !l.startsWith(`${k}=`));
        if (val) lines.push(`${k}=${val.replace(/[\r\n]/g, "")}`);
        if (val) process.env[k] = val;
        else delete process.env[k];
      }
      fs.writeFileSync(envFile, lines.filter((l, i) => l || i < lines.length - 1).join("\n") + "\n");
      // order + models → config.json
      const cfgFile = path.join(__dirname, "..", "config.json");
      const user = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {};
      if (Array.isArray(body.order) && body.order.length) user.providers = body.order.map(String).slice(0, 8);
      for (const [id, model] of Object.entries(body.models || {})) {
        const m = String(model || "").trim();
        if (!m) continue;
        if (id === "claude-code" || id === "api") user.model = m;
        else if (id === "codex") user.codexModel = m;
        else if (id === "antigravity") user.antigravityModel = m;
        else if (P.PRESETS[id]) user.aiProviders = { ...(user.aiProviders || {}), [id]: { ...((user.aiProviders || {})[id] || {}), models: [m] } };
      }
      if (body.order && body.order[0] === "api") user.provider = "api";
      else if (body.order && body.order[0] === "claude-code") user.provider = "claude-code";
      fs.writeFileSync(cfgFile, JSON.stringify(user, null, 2));
      return sendJson(res, 200, { ok: true });
    }
  }
  // ---------- the demo business's messages in the apps from the start + real actions for answers ----------
  if (route === "/api/demo/inbox" && req.method === "GET") {
    const inbox = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "demo", "inbox.json"), "utf8"));
    let replay = {};
    try {
      replay = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "demo", "replay.json"), "utf8"));
    } catch {}
    return sendJson(res, 200, inbox.map((m) => ({ ...m, draft: (replay[m.id] && replay[m.id].proposal && replay[m.id].proposal.draft_reply) || "" })));
  }
  if (route === "/api/demo/act" && req.method === "POST") {
    // the owner pressed Save draft / send on a message → Outlook draft typed in, or WhatsApp opened with the text
    const body = await readJson(req);
    const A = require("./actions");
    const cfg = loadConfig();
    const steps = [];
    const step = (s) => steps.push(s);
    try {
      if (body.channel === "email") await A.outlook(cfg, { to: String(body.to || ""), subject: String(body.subject || ""), text: String(body.text || "") }, step);
      else if (body.channel === "whatsapp") A.whatsapp(cfg, { phone: String(body.to || ""), text: String(body.text || "") }, step);
      else return sendJson(res, 400, { error: "unknown channel" });
      return sendJson(res, 200, { ok: true, steps });
    } catch (e) {
      return sendJson(res, 200, { error: String(e.message || e), steps });
    }
  }
  // ---------- Documents tab: contracts / offers Tia made → preview, print, email as draft ----------
  if (route.startsWith("/api/docs")) {
    const A = require("./actions");
    const cfg = loadConfig();
    const dir = A.docsDir(cfg);
    const safe = (n) => {
      const f = path.join(dir, path.basename(String(n || "")));
      if (!f.toLowerCase().endsWith(".pdf") || !fs.existsSync(f)) throw new Error("no such document");
      return f;
    };
    try {
      if (req.method === "GET" && route === "/api/docs") {
        const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).map((f) => ({ name: f, at: fs.statSync(path.join(dir, f)).mtimeMs, kb: Math.round(fs.statSync(path.join(dir, f)).size / 1024) }));
        let clients = [];
        try {
          clients = fs.readdirSync(path.join(cfg.vaultDir, "Projects")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).slice(0, 40);
        } catch {}
        let templates = [];
        try {
          templates = fs.readdirSync(path.join(cfg.vaultDir, "Templates")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
        } catch {}
        return sendJson(res, 200, { files: files.sort((a, b) => b.at - a.at), projects: clients, templates });
      }
      if (req.method === "GET" && route === "/api/docs/file") {
        const f = safe(url.searchParams.get("name"));
        res.writeHead(200, { "content-type": "application/pdf", "content-disposition": "inline", "cache-control": "no-store" });
        return fs.createReadStream(f).pipe(res);
      }
      if (req.method === "POST" && route === "/api/docs/print") {
        const body = await readJson(req);
        const f = safe(body.name);
        const steps = [];
        await A.print(cfg, f, (s) => steps.push(s));
        return sendJson(res, 200, { ok: true, steps });
      }
      if (req.method === "POST" && route === "/api/docs/email") {
        const body = await readJson(req);
        const f = safe(body.name);
        const info = engine.info();
        const steps = [];
        await A.outlook(cfg, { to: String(body.to || ""), subject: `${path.basename(f, ".pdf")} – ${info.business}`, text: String(body.text || `Hello,\n\nplease find the document attached.\n\nBest regards,\n${info.owner}`), attach: [f] }, (s) => steps.push(s));
        return sendJson(res, 200, { ok: true, steps });
      }
      if (req.method === "POST" && route === "/api/docs/open") {
        const body = await readJson(req);
        A.open(safe(body.name));
        return sendJson(res, 200, { ok: true });
      }
    } catch (e) {
      return sendJson(res, 400, { error: String(e.message || e) });
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
  footer{padding:14px 32px 320px;color:#6B6773;font-size:11px}
  .tools{display:flex;gap:8px;align-items:center}.btn{border:1px solid #3A3450;background:#1D1A27;color:#ECEAF2;border-radius:8px;padding:6px 12px;font:600 12px "Segoe UI",sans-serif;cursor:pointer;text-decoration:none}.btn:hover{border-color:#B9A3F2}.btn.go{background:#B9A3F2;color:#16131F;border-color:#B9A3F2}
  .act{display:flex;gap:6px;white-space:nowrap}.act button{border:0;border-radius:7px;padding:5px 9px;font:600 12px "Segoe UI",sans-serif;cursor:pointer;background:#2A2538;color:#ECEAF2}.act button:hover{background:#B9A3F2;color:#16131F}</style></head><body>
  <header><div><h1><span>CRM</span> · ${info.business}</h1><div class="sub">Leads found by Tia – nobody is contacted without the owner's OK</div></div>
  <div class="tools"><span id="n" class="sub"></span><button class="btn go" id="more">✦ Find more leads</button><a class="btn" href="crm/data.csv">⬇ Excel</a><button class="btn" id="gs">⬆ Google Sheets</button><span id="gsr" class="sub"></span></div></header>
  <table><thead><tr><th>Business</th><th>Fit</th><th>Why</th><th>Contact</th><th>Status</th><th></th></tr></thead><tbody id="rows"></tbody></table>
  <footer>Business data © OpenStreetMap contributors (ODbL) and each business's own website.</footer>
  <script>
  const seen=new Set();const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  async function load(){try{const rows=await (await fetch("crm/data",{cache:"no-store"})).json();
  document.getElementById("n").textContent=rows.length+" leads";
  document.getElementById("rows").innerHTML=rows.map(r=>'<tr class="'+(seen.has(r.id)?'':'new')+'"><td><div class="name">'+esc(r.name)+'</div><div class="seg">'+esc(r.segment)+(r.address?' · '+esc(r.address):'')+'</div></td>'+
  '<td><div class="fit"><div class="bar"><i style="width:'+(r.fit||0)+'%"></i></div>'+(r.fit||0)+'%</div></td><td class="why">'+esc(r.why)+'</td>'+
  '<td>'+(r.website?'<a href="'+esc(r.website)+'" target="_blank">'+esc(r.website.replace(/^https?:\\/\\//,'').replace(/\\/$/,''))+'</a><br>':'')+esc(r.email)+'</td>'+
  '<td><span class="st '+(r.status==="to contact"?'go':'')+'">'+esc(r.status)+'</span><div class="seg">'+esc(r.found_at)+'</div></td>'+
  '<td><div class="act"><button data-a="mail" data-n="'+esc(r.name)+'">✉ Email</button>'+(r.phone?'<button data-a="wa" data-n="'+esc(r.name)+'" data-p="'+esc(r.phone)+'">WhatsApp</button>':'')+'</div></td></tr>').join("");
  rows.forEach(r=>seen.add(r.id));}catch(e){}}
  // Email / WhatsApp a lead = ask Tia (she writes it; a draft, or a message that waits for your tap)
  document.getElementById("rows").onclick=e=>{const b=e.target.closest("button[data-a]");if(!b)return;const T=parent&&parent.TiaTalk;if(!T)return alert("Open the CRM inside Tia to do this.");
    T.ask(b.dataset.a==="mail"?"Write a Gmail draft to "+b.dataset.n+" introducing us":"Write a WhatsApp message to "+b.dataset.n+" at "+b.dataset.p+" introducing us");};
  document.getElementById("more").onclick=()=>{const T=parent&&parent.TiaTalk;if(!T)return alert("Open the CRM inside Tia to do this.");T.ask("Find me new leads and add them to the CRM");};
  document.getElementById("gs").onclick=async()=>{const r=document.getElementById("gsr");r.textContent="Making the Google Sheet…";
    try{const j=await (await fetch("crm/sheet",{method:"POST"})).json();if(j.error)throw new Error(j.error);r.innerHTML='✓ <a href="'+esc(j.url)+'" target="_blank">Open the Google Sheet ↗</a>';}catch(e){r.textContent="⚠ "+e.message;}};
  load();setInterval(load,1500);</script></body></html>`;
}

function serveStatic(req, res, route, url) {
  if (route === "/crm/sheet" && req.method === "POST") {
    if (!isLocal(req) && !hasToken(req, url)) return sendJson(res, 401, { error: "Log in first." });
    // the CRM as a new Google Sheet in the owner's Drive (Composio, Google Sheets)
    (async () => {
      const C = require("./connectors/composio");
      const rows = require("./leads/finder").loadCrm(loadConfig());
      const info = engine.info();
      const made = await C.execute("GOOGLESHEETS_CREATE_GOOGLE_SHEET1", { title: `Tia CRM – ${info.business} – ${new Date().toISOString().slice(0, 10)}` });
      const id = made.spreadsheetId || made.spreadsheet_id || (made.data && (made.data.spreadsheetId || made.data.spreadsheet_id));
      if (!id) throw new Error("Google Sheets didn't return the new sheet");
      const cols = ["status", "fit", "name", "segment", "address", "website", "email", "phone", "why", "found_at"];
      await C.execute("GOOGLESHEETS_BATCH_UPDATE", { spreadsheet_id: id, sheet_name: "Sheet1", first_cell_location: "A1", value_input_option: "RAW", values: [cols, ...rows.map((r) => cols.map((c) => (r[c] === undefined || r[c] === null ? "" : String(r[c]))))] });
      return { url: made.spreadsheetUrl || (made.data && made.data.spreadsheetUrl) || `https://docs.google.com/spreadsheets/d/${id}/edit`, rows: rows.length };
    })()
      .then((r) => sendJson(res, 200, r))
      .catch((e) => sendJson(res, 502, { error: String(e.message || e).slice(0, 200) }));
    return true;
  }
  if (route === "/crm" || route === "/crm/data" || route === "/crm/data.csv") {
    if (!GUEST && !isLocal(req) && !hasToken(req, url)) return sendJson(res, 401, { error: "Log in first." });
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
    if (!GUEST && !isLocal(req) && !hasToken(req, url)) return sendJson(res, 401, { error: "Log in first." });
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
    if (GUEST && rel === "index.html") buf = Buffer.from(String(buf).replace("<head>", '<head>\n  <meta name="tia-guest" content="1" />'));
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(buf);
  });
}

// ---------- the PUBLIC demo (TIA_GUEST=1): anyone on the internet, so an allow-list – everything else is refused ----------
// Only the fictional business: talk, voice, the demo inbox, decisions, Stop, reading the vault, documents, the CRM.
// No settings, keys, app connections (Composio), Outlook, printer, files on this PC, phone pairing, WhatsApp, vault edits.
const GUEST = process.env.TIA_GUEST === "1";
const GUEST_GET = new Set(["/api/state", "/api/info", "/api/events", "/api/docs", "/api/docs/file", "/api/vault/tree", "/api/vault/note", "/api/vault/search", "/api/vault/graph", "/api/demo/inbox", "/crm", "/crm/data", "/crm/data.csv"]);
const GUEST_POST = new Set(["/api/say", "/api/voice", "/api/run", "/api/decide", "/api/reset", "/api/stop", "/api/tts", "/api/demo/act"]);
const GUEST_AI = { "/api/say": 1, "/api/voice": 1, "/api/run": 6, "/api/tts": 0 }; // AI cost of a request (rate limit)
const SECURITY_HEADERS = { "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "SAMEORIGIN" };
async function guestGate(req, res, url, route) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  // own desk per visitor: a random id in a cookie (no login, nothing personal)
  let sid = ((req.headers.cookie || "").match(/(?:^|;\s*)tia_s=([a-f0-9]{24})/) || [])[1];
  if (!sid) {
    sid = crypto.randomBytes(12).toString("hex");
    res.setHeader("set-cookie", `tia_s=${sid}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`);
  }
  const origin = req.headers.origin;
  const pub = process.env.TIA_GUEST_URL ? new URL(process.env.TIA_GUEST_URL).origin : "";
  // the website (rderics.id.lv/tia-try) may only ask "are you on?" – nothing else from another origin
  if (origin === "https://rderics.id.lv" && req.method === "GET" && route === "/api/info") {
    res.setHeader("access-control-allow-origin", origin);
    return sendJson(res, 200, { ok: true, business: "Oakline Studio" });
  }
  if (origin && ![pub, `http://localhost:${PORT}`].includes(origin)) return sendJson(res, 403, { error: "forbidden origin" });
  const isApi = route.startsWith("/api/") || route.startsWith("/crm") || route.startsWith("/doc/") || route.startsWith("/webhooks/") || route === "/connect";
  if (isApi) {
    const ok = req.method === "GET" ? GUEST_GET.has(route) || /^\/doc\/\w+$/.test(route) : req.method === "POST" && GUEST_POST.has(route);
    if (!ok) return sendJson(res, 403, { error: "Not part of the public demo – download Tia to use it with your own apps." });
  }
  return hub.runInSession(sid, async () => {
    if (GUEST_AI[route] !== undefined && GUEST_AI[route] > 0) {
      let allowed = true;
      for (let i = 0; i < GUEST_AI[route]; i++) allowed = allowed && hub.allowCall();
      if (!allowed) return sendJson(res, 429, { error: "busy", say: "That's enough for this hour in the public demo – download Tia to keep going with your own free AI key." });
    }
    if (route === "/api/run") {
      // the demo inbox only, sorted live by the free AI
      return hub.runDay("auto").catch(() => {}), sendJson(res, 200, { ok: true });
    }
    if (route.startsWith("/api/")) return await localApi(req, res, route, url);
    if (route.startsWith("/crm") || route.startsWith("/doc/")) return serveStatic(req, res, route, url);
    return serveStatic(req, res, route, url);
  });
}

function start() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const route = url.pathname;
    if (GUEST) {
      try {
        return await guestGate(req, res, url, route);
      } catch (e) {
        return sendJson(res, 500, { error: "Something went wrong" }); // no details to the public
      }
    }
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
  return new Promise((resolve, reject) => {
    server.once("error", reject); // e.g. EADDRINUSE: Tia already runs on this PC – the desktop window just opens it
    server.listen(PORT, "0.0.0.0", () => {
      const first = addresses()[0];
      console.log(`Tia is running: http://localhost:${PORT}  (Ctrl+C to stop)`);
      if (first) console.log(`Phone: scan the QR code on Tia's screen (phone connects to ${first.url})`);
      if (loadConfig().stt !== false) stt.start(loadConfig()); // warm up speech-to-text in the background
      if (GUEST) console.log("Public demo (TIA_GUEST=1): fictional business only – no accounts, no keys, nothing sent");
      else startOnline().catch((e) => console.warn(`[online] ${e.message || e}`));
      resolve(server);
    });
  });
}

// New messages from the owner's linked WhatsApp: show them live (no AI draft unless the owner asks – private chats)
const linkedMessages = (fresh) => {
  for (const f of fresh) hub.emit({ type: "whatsapp-in", chat: f.chat, text: f.message.text, at: Date.now() });
};
// Public address + WhatsApp: on a PC without config.publicUrl, open a quick tunnel; then tell the WhatsApp relay
// "send messages here" and fetch anything it kept while this PC was off. The Tia that starts last receives WhatsApp.
// The public demo next to the owner's Tia (config.json "guestServer": true): a separate process on its own port,
// started with a CLEAN environment – only the free AI key, none of the owner's keys or tokens – restarted if it stops.
function startGuestServer(cfg) {
  const keep = ["SystemRoot", "windir", "PATH", "Path", "PATHEXT", "COMSPEC", "TEMP", "TMP", "OS", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE",
    "ProgramFiles", "ProgramFiles(x86)", "ProgramW6432", "LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "SystemDrive"];
  const env = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  Object.assign(env, { TIA_GUEST: "1", TIA_PORT: String(cfg.guestPort || 4848), TIA_GUEST_URL: cfg.guestUrl || "https://tia-try.rderics.id.lv", TIA_AUTO_UPDATE: "0", TIA_QUICK_TUNNEL: "0" });
  if (process.env.GROQ_API_KEY) env.GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { spawn } = require("child_process");
  const logs = path.join(cfg.dataDir, "logs");
  fs.mkdirSync(logs, { recursive: true });
  // inside the desktop app process.execPath is Electron – the demo runs on plain Node
  const nodeExe = process.versions.electron ? "node" : process.execPath;
  let child = null;
  const run = () => {
    const out = fs.openSync(path.join(logs, "guest.log"), "a");
    child = spawn(nodeExe, [path.join(__dirname, "web.js")], { cwd: path.join(__dirname, ".."), env, stdio: ["ignore", out, out], windowsHide: true });
    child.on("exit", (code) => code !== 0 && code !== null && setTimeout(run, 5000)); // e.g. port busy: try again later
  };
  process.on("exit", () => child && child.kill());
  run();
  console.log(`[guest] public demo on port ${env.TIA_PORT} -> ${env.TIA_GUEST_URL}`);
}

async function startOnline() {
  const cfg = loadConfig();
  if (cfg.guestServer) setTimeout(() => startGuestServer(loadConfig()), 8000); // after the team keys are loaded
  // auto-update from GitHub (every 15 min) – the screen shows "Tia was updated"
  require("./updater").start(cfg, (u) => hub.emit({ type: "update", ...u }));
  // team keys (free AI, WhatsApp Business) from the team code – refreshed at every start
  const team = await require("./team").sync().catch(() => null);
  if (team && team.ok) console.log(`Team keys synced (${team.keys})`);
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
  if (cfg.publicUrl) {
    await tunnel.ensureNamed().catch((e) => console.warn(`[tunnel] ${e.message || e}`)); // the phone needs it
    register(cfg.publicUrl.replace(/\/$/, ""));
  }
  else if (cfg.quickTunnel !== false && process.env.TIA_QUICK_TUNNEL !== "0") {
    tunnel.start(PORT);
    tunnel.onUrl(register);
  }
  // the owner's WhatsApp linked before → reconnect by itself
  const WL = require("./connectors/wa-link");
  if (WL.linkedBefore(cfg)) WL.start(cfg, linkedMessages).catch((e) => console.warn(`[whatsapp link] ${e.message || e}`));
  const pull = () => W.pullFromRelay(loadConfig(), onMessages).catch(() => {});
  pull();
  setInterval(pull, 20000).unref(); // backup in case a forward was missed
}

if (require.main === module) start();
module.exports = { start, PORT };

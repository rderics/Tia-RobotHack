// WhatsApp Business (Meta Cloud API) → Tia, by webhook. Meta calls https://tia.rderics.id.lv/webhooks/whatsapp
// whenever someone messages the business number; Tia stores the chat, drafts a reply and the screen shows it live.
// Read + draft only: nothing here sends a message (replying = the owner, in WhatsApp Manager / his own tools).
//
// .env (never committed):
//   WHATSAPP_VERIFY_TOKEN     – any random string, also pasted in the Meta app (WhatsApp → Configuration → Webhook)
//   WHATSAPP_PHONE_NUMBER_IDS – comma list of the business numbers' "Phone number ID"s Tia accepts (others are ignored)
//   WHATSAPP_APP_SECRET       – optional: the Meta app secret, to check Meta's signature on every call
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ROOT } = require("../brain/config");

const file = (cfg) => path.join(cfg.dataDir, "live", "whatsapp.json");
const read = (cfg) => {
  try {
    return JSON.parse(fs.readFileSync(file(cfg), "utf8"));
  } catch {
    return { chats: {}, numbers: {}, lastEvent: null };
  }
};
const write = (cfg, d) => (fs.mkdirSync(path.dirname(file(cfg)), { recursive: true }), fs.writeFileSync(file(cfg), JSON.stringify(d, null, 2)));

// A verify token is made once and kept in .env
function verifyToken() {
  if (process.env.WHATSAPP_VERIFY_TOKEN) return process.env.WHATSAPP_VERIFY_TOKEN;
  const t = `tia-${crypto.randomBytes(12).toString("hex")}`;
  fs.appendFileSync(path.join(ROOT, ".env"), `\nWHATSAPP_VERIFY_TOKEN=${t}\n`);
  process.env.WHATSAPP_VERIFY_TOKEN = t;
  return t;
}
const allowedNumbers = () => (process.env.WHATSAPP_PHONE_NUMBER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);

// GET: Meta checks the address once ("hub.challenge" handshake)
function verify(url, res) {
  const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verifyToken();
  res.writeHead(ok ? 200 : 403, { "content-type": "text/plain" });
  return res.end(ok ? url.searchParams.get("hub.challenge") || "" : "forbidden");
}

function rawBody(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > limit) return reject(new Error("too big")), req.destroy();
      parts.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(parts)));
    req.on("error", reject);
  });
}
function signedOk(req, buf) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  const sig = String(req.headers["x-hub-signature-256"] || "");
  const want = `sha256=${crypto.createHmac("sha256", secret).update(buf).digest("hex")}`;
  return sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}

const textOf = (m) =>
  m.text?.body ||
  m.button?.text ||
  m.interactive?.button_reply?.title ||
  m.interactive?.list_reply?.title ||
  (m.image ? `[photo]${m.image.caption ? ` ${m.image.caption}` : ""}` : "") ||
  (m.document ? `[document] ${m.document.filename || ""}` : "") ||
  (m.audio ? "[voice message]" : "") ||
  (m.video ? "[video]" : "") ||
  (m.location ? `[location] ${m.location.name || ""} ${m.location.latitude},${m.location.longitude}` : "") ||
  (m.sticker ? "[sticker]" : "") ||
  `[${m.type || "message"}]`;

// POST: messages arrive. Returns the new messages (the caller tells the screen and lets Tia draft).
async function receive(cfg, req, res) {
  const buf = await rawBody(req);
  if (!signedOk(req, buf)) {
    res.writeHead(401);
    return res.end(), [];
  }
  res.writeHead(200); // answer Meta at once; Meta retries if we are slow
  res.end("ok");
  let body;
  try {
    body = JSON.parse(buf.toString("utf8"));
  } catch {
    return [];
  }
  const allowed = allowedNumbers();
  const d = read(cfg);
  d.lastEvent = new Date().toISOString();
  const fresh = [];
  for (const entry of body.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      const meta = v.metadata || {};
      if (allowed.length && meta.phone_number_id && !allowed.includes(String(meta.phone_number_id))) continue; // not our number
      if (meta.phone_number_id) d.numbers[meta.phone_number_id] = { display: meta.display_phone_number || "", waba: entry.id };
      const names = Object.fromEntries((v.contacts || []).map((c) => [c.wa_id, c.profile && c.profile.name]));
      for (const m of v.messages || []) {
        const id = m.from;
        const chat = (d.chats[id] = d.chats[id] || { waId: id, name: names[id] || "", number: meta.display_phone_number || "", messages: [] });
        if (names[id]) chat.name = names[id];
        if (chat.messages.some((x) => x.id === m.id)) continue; // Meta retries – keep one copy
        const msg = { id: m.id, dir: "in", text: textOf(m), at: new Date(Number(m.timestamp || Date.now() / 1000) * 1000).toISOString() };
        chat.messages.push(msg);
        chat.messages = chat.messages.slice(-60);
        chat.unread = (chat.unread || 0) + 1;
        chat.suggestion = ""; // a new message → Tia writes a new draft
        fresh.push({ chat: id, message: msg });
      }
      for (const s of v.statuses || []) {
        const chat = d.chats[s.recipient_id];
        const msg = chat && chat.messages.find((x) => x.id === s.id);
        if (msg) msg.status = s.status;
      }
    }
  }
  write(cfg, d);
  return fresh;
}

// Tia's draft for one chat (the last messages as context)
async function draftFor(cfg, waId) {
  const d = read(cfg);
  const chat = d.chats[waId];
  if (!chat) return null;
  const last = chat.messages.slice(-8).map((m) => `${m.dir === "in" ? chat.name || "Customer" : "Us"}: ${m.text}`).join("\n");
  const r = await require("./live").suggest(cfg, { app: "whatsapp", vault: true, from: chat.name || `+${waId}`, address: `+${waId}`, subject: "", text: last });
  const d2 = read(cfg);
  if (!d2.chats[waId]) return null;
  d2.chats[waId].suggestion = r.text || "";
  d2.chats[waId].skip = r.skip || "";
  write(cfg, d2);
  return d2.chats[waId];
}

function data(cfg) {
  const d = read(cfg);
  return { configured: !!process.env.WHATSAPP_VERIFY_TOKEN, numbers: d.numbers, lastEvent: d.lastEvent, chats: Object.values(d.chats).sort((a, b) => String(b.messages.at(-1)?.at).localeCompare(String(a.messages.at(-1)?.at))) };
}
function markRead(cfg, waId) {
  const d = read(cfg);
  if (d.chats[waId]) (d.chats[waId].unread = 0), write(cfg, d);
}

module.exports = { verify, verifyToken, receive, draftFor, data, markRead };

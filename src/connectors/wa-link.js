// The owner's own WhatsApp (or WhatsApp Business) in Tia as a LINKED DEVICE – like WhatsApp Web: scan a QR in
// WhatsApp → Linked devices; the phone keeps working. Library: Baileys (MIT, unofficial WhatsApp Web protocol).
// Chats land in the same store as the WhatsApp Business webhook (connectors/whatsapp.js), so the WhatsApp tab shows them.
// Privacy: nothing is sent to an AI unless the owner presses "Let Tia write"; Tia sends only when the owner taps send.
// Login keys: data/wa-link/ (never committed). Unlink: WhatsApp → Linked devices → Tia → Log out (or the Unlink button).
const fs = require("fs");
const path = require("path");

let sock = null;
let starting = null;
const state = { status: "off", qr: "", me: "", error: "" };
const listeners = new Set();
const silent = { level: "silent", trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {}, child() { return silent; } };
const authDir = (cfg) => path.join(cfg.dataDir, "wa-link");
const linkedBefore = (cfg) => fs.existsSync(path.join(authDir(cfg), "creds.json"));

function textOf(msg) {
  const m = msg && msg.message;
  if (!m) return "";
  const x = m.ephemeralMessage ? m.ephemeralMessage.message : m.viewOnceMessage ? m.viewOnceMessage.message : m;
  return (
    x.conversation ||
    (x.extendedTextMessage && x.extendedTextMessage.text) ||
    (x.imageMessage && `[photo]${x.imageMessage.caption ? ` ${x.imageMessage.caption}` : ""}`) ||
    (x.videoMessage && `[video]${x.videoMessage.caption ? ` ${x.videoMessage.caption}` : ""}`) ||
    (x.audioMessage && "[voice message]") ||
    (x.documentMessage && `[document] ${x.documentMessage.fileName || ""}`) ||
    (x.stickerMessage && "[sticker]") ||
    (x.locationMessage && "[location]") ||
    (x.contactMessage && `[contact] ${x.contactMessage.displayName || ""}`) ||
    ""
  );
}
const personal = (jid) => jid && /@(s\.whatsapp\.net|lid)$/.test(jid); // 1:1 chats only (no groups, status, broadcasts)

function store(cfg, list, { live }) {
  const W = require("./whatsapp");
  const fresh = [];
  for (const msg of list) {
    const jid = msg.key && msg.key.remoteJid;
    if (!personal(jid)) continue;
    const text = textOf(msg);
    if (!text) continue;
    const at = new Date(Number(msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString();
    const added = W.addMessage(cfg, {
      waId: jid.split("@")[0],
      jid,
      name: (!msg.key.fromMe && msg.pushName) || "",
      id: msg.key.id,
      dir: msg.key.fromMe ? "out" : "in",
      text,
      at,
      source: "link",
      unread: live && !msg.key.fromMe,
    });
    if (added && live && !msg.key.fromMe) fresh.push({ chat: jid.split("@")[0], message: { text, at } });
  }
  return fresh;
}

async function start(cfg, onMessages) {
  if (sock) return state;
  if (starting) return starting;
  starting = (async () => {
    const B = await import("@whiskeysockets/baileys");
    const makeWASocket = B.default || B.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = B;
    fs.mkdirSync(authDir(cfg), { recursive: true });
    const { state: auth, saveCreds } = await useMultiFileAuthState(authDir(cfg));
    let version;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {}
    state.status = "starting";
    state.error = "";
    sock = makeWASocket({
      auth, version, logger: silent, printQRInTerminal: false, markOnlineOnConnect: false, syncFullHistory: false,
      browser: Browsers && Browsers.windows ? Browsers.windows("Tia") : ["Tia", "Desktop", "1.0"],
    });
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", (u) => {
      if (u.qr) {
        state.qr = u.qr;
        state.status = "qr";
      }
      if (u.connection === "open") {
        state.status = "connected";
        state.qr = "";
        state.me = (sock && sock.user && (sock.user.name || sock.user.id)) || "";
      }
      if (u.connection === "close") {
        const code = u.lastDisconnect && u.lastDisconnect.error && u.lastDisconnect.error.output && u.lastDisconnect.error.output.statusCode;
        sock = null;
        if (code === DisconnectReason.loggedOut) {
          state.status = "off";
          state.me = "";
          fs.rmSync(authDir(cfg), { recursive: true, force: true });
        } else {
          state.status = "reconnecting";
          setTimeout(() => start(cfg, onMessages).catch((e) => (state.error = String(e.message || e))), 3000);
        }
      }
      for (const fn of listeners) fn({ ...state });
    });
    sock.ev.on("messaging-history.set", ({ messages = [] }) => {
      // first link: the recent chats (kept small – last 40 per chat, newest chats only)
      store(cfg, messages.slice(-1500), { live: false });
    });
    sock.ev.on("messages.upsert", ({ messages = [], type }) => {
      const fresh = store(cfg, messages, { live: type === "notify" });
      if (fresh.length && onMessages) onMessages(fresh);
    });
    sock.ev.on("contacts.upsert", (list) => {
      const W = require("./whatsapp");
      for (const c of list || []) if (personal(c.id) && (c.name || c.notify)) W.setName(cfg, c.id.split("@")[0], c.name || c.notify);
    });
    return state;
  })().finally(() => (starting = null));
  return starting;
}

async function send(jid, text) {
  if (!sock || state.status !== "connected") throw new Error("Your WhatsApp isn't linked right now");
  const r = await sock.sendMessage(jid, { text });
  return { ok: true, id: r && r.key && r.key.id };
}
async function unlink(cfg) {
  try {
    if (sock) await sock.logout();
  } catch {}
  sock = null;
  state.status = "off";
  state.me = "";
  state.qr = "";
  fs.rmSync(authDir(cfg), { recursive: true, force: true });
  return { ok: true };
}
const status = () => ({ ...state });
const connected = () => state.status === "connected";
const onState = (fn) => (listeners.add(fn), () => listeners.delete(fn));

module.exports = { start, send, unlink, status, connected, linkedBefore, onState };

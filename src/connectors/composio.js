// Real apps through Composio (github.com/ComposioHQ/composio, MIT). Tia calls the Composio CLI that the owner
// logged in with (`composio login`), so no API key lives in Tia's code. Connect apps once with `composio link gmail`,
// `composio link slack`, `composio link outlook`, `composio link instagram`.
// Read + DRAFT only: Tia never calls a send/post tool.
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const NEVER = /SEND|POST_MESSAGE|REPLY_TO_THREAD|DELETE|TRASH|FORWARD/i; // hard guard, whatever the caller asks

function cli() {
  const exe = path.join(os.homedir(), ".composio", process.platform === "win32" ? "composio.exe" : "composio");
  return fs.existsSync(exe) ? exe : "composio";
}

function execute(slug, data = {}, { account, timeoutMs = 60000 } = {}) {
  if (NEVER.test(slug)) return Promise.reject(new Error(`Tia never runs ${slug} – she only reads and drafts`));
  const args = ["execute", slug, "-d", JSON.stringify(data)];
  if (account) args.push("--account", account);
  return new Promise((resolve, reject) => {
    const child = spawn(cli(), args, { windowsHide: true });
    let out = "";
    let err = "";
    const t = setTimeout(() => (child.kill(), reject(new Error(`Composio ${slug} took too long`))), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => (clearTimeout(t), reject(e)));
    child.on("close", (code) => {
      clearTimeout(t);
      const start = out.indexOf("{");
      let j = null;
      try {
        j = JSON.parse(out.slice(start));
      } catch {}
      if (!j) return reject(new Error(`Composio ${slug}: ${(err || out).trim().slice(-300) || `exit ${code}`}`));
      if (j.successful === false || j.error) return reject(new Error(`Composio ${slug}: ${String(j.error || "failed").slice(0, 300)}`));
      resolve(j.data !== undefined ? j.data : j);
    });
  });
}

async function connections() {
  return new Promise((resolve) => {
    const child = spawn(cli(), ["connections", "list"], { windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", () => {
      try {
        resolve(JSON.parse(out.slice(out.indexOf("{"))));
      } catch {
        resolve({});
      }
    });
    child.on("error", () => resolve({}));
  });
}

// ---------- Gmail ----------
const header = (m, name) => ((m.payload && m.payload.headers) || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || m[name.toLowerCase()] || "";
async function gmailInbox({ max = 12, query = "in:inbox newer_than:3d" } = {}) {
  const data = await execute("GMAIL_FETCH_EMAILS", { query, max_results: max, include_payload: true, verbose: true });
  const msgs = data.messages || data.emails || [];
  return msgs.map((m, i) => {
    const fromRaw = m.sender || header(m, "From");
    const name = (fromRaw.match(/^"?([^"<]+?)"?\s*</) || [])[1] || fromRaw;
    const address = (fromRaw.match(/<([^>]+)>/) || [])[1] || fromRaw;
    const when = m.messageTimestamp || header(m, "Date");
    const d = when ? new Date(when) : null;
    return {
      id: `m${String(i + 1).padStart(2, "0")}`,
      channel: "email",
      source: "gmail",
      gmailId: m.messageId || m.id,
      threadId: m.threadId || "",
      from: name.trim(),
      address: address.trim(),
      subject: m.subject || header(m, "Subject"),
      text: String(m.messageText || m.preview?.body || m.snippet || "").replace(/\r/g, "").slice(0, 1500),
      time: d && !isNaN(d) ? d.toTimeString().slice(0, 5) : "",
      received: d && !isNaN(d) ? d.toISOString() : "",
    };
  });
}
// A real Gmail draft (in the thread when we have it). Returns the draft id.
async function gmailDraft({ to, subject, body, threadId }) {
  const data = await execute("GMAIL_CREATE_EMAIL_DRAFT", { recipient_email: to, subject, body, ...(threadId ? { thread_id: threadId } : {}) });
  return data.id || (data.response_data && data.response_data.id) || "";
}

// ---------- Outlook (Microsoft 365 / outlook.com) ----------
async function outlookDraft({ to, subject, body }) {
  return execute("OUTLOOK_CREATE_DRAFT", { subject, body, to_recipients: [to].filter(Boolean) });
}

// ---------- Slack (read only) ----------
async function slackHistory(channel, limit = 20) {
  const data = await execute("SLACK_FETCH_CONVERSATION_HISTORY", { channel, limit });
  return data.messages || [];
}

module.exports = { execute, connections, gmailInbox, gmailDraft, outlookDraft, slackHistory, cli };

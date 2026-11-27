// Tia's real-world actions on the owner's computer – the part the audience can SEE:
//   outlook()   opens a real Outlook message window and types the draft into it (never sends)
//   pdf()       turns an offer/contract into a real PDF file (Edge, headless) and opens it
//   print()     sends the document to the Windows default printer (Edge/Chrome silent printing)
//   whatsapp()  opens WhatsApp (app or web) with the reply already typed – the owner presses send
// Every step reports progress through `onStep` so the screen can animate it. Nothing here sends, pays or signs.
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUTLOOK_PY = path.join(ROOT, "src", "connectors", "outlook.py");

const defaults = (cfg) => ({ show: true, typingMs: 14, print: true, printer: "", outlook: true, whatsapp: true, ...(cfg.actions || {}) });
const exists = (p) => p && fs.existsSync(p);
const first = (list) => list.find(exists);

function run(cmd, args, { timeoutMs = 120000, json = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${path.basename(cmd)} took too long`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!json) return code === 0 ? resolve(out) : reject(new Error((err || out).slice(-300) || `exit ${code}`));
      try {
        const j = JSON.parse(out.trim().split("\n").pop());
        if (j.error) return reject(new Error(j.error));
        resolve(j);
      } catch {
        reject(new Error((err || out).slice(-300) || `exit ${code}`));
      }
    });
  });
}

// Opens a file or link with its usual program (PDF viewer, browser, WhatsApp).
// Recording the demo video (TIA_SIMULATE_ACTIONS=1): every step shows on the screen exactly as in real use, but
// nothing prints, no Outlook/WhatsApp window opens. Never set on a real desk.
const SIM = () => process.env.TIA_SIMULATE_ACTIONS === "1";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function simulated(onStep, step, start, done, ms = 1800) {
  onStep({ step, status: "start", detail: start });
  await pause(ms);
  onStep({ step, status: "done", detail: done });
  return { simulated: true };
}

function open(target) {
  if (SIM()) return;
  if (process.platform !== "win32") return spawn(process.platform === "darwin" ? "open" : "xdg-open", [target], { detached: true, stdio: "ignore" }).unref();
  spawn("cmd.exe", ["/c", "start", '""', target], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

// ---------- Outlook ----------
async function outlook(cfg, { to, subject, text, attach = [], replyTo = null, save = false }, onStep = () => {}) {
  if (SIM()) return simulated(onStep, "outlook", `Writing to ${to || "the client"} in Outlook`, `Draft in Outlook${attach.length ? " with the PDF attached" : ""} – you press Send`, 2600);
  const a = defaults(cfg);
  if (!a.outlook || process.platform !== "win32") throw new Error("Outlook isn't set up on this computer");
  onStep({ step: "outlook", status: "start", detail: `Writing to ${to || "the client"} in Outlook` });
  const py = cfg.pythonPath || "python";
  const common = ["--text", text, "--type-ms", String(a.show ? a.typingMs : 0)];
  if (a.show) common.push("--show");
  let args;
  if (replyTo && replyTo.entryId) {
    args = ["-X", "utf8", OUTLOOK_PY, "draft", "--entry", replyTo.entryId, "--store", replyTo.storeId, ...common];
  } else {
    args = ["-X", "utf8", OUTLOOK_PY, "compose", "--to", to || "", "--subject", subject || "", ...common];
    for (const f of attach) args.push("--attach", f);
    if (!save) args.push("--no-save"); // the stand never writes into the owner's real mailbox
    if (cfg.profile !== "owner") args.push("--on-behalf", cfg.businessEmail || "info@oakline-studio.example");
  }
  const r = await run(py, args, { timeoutMs: 180000, json: true });
  onStep({ step: "outlook", status: "done", detail: r.saved ? "Draft saved in Outlook – you press Send" : "Draft open in Outlook – you press Send" });
  return r;
}

// ---------- documents ----------
function edge() {
  return first([
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ]);
}

const docsDir = (cfg) => {
  const d = path.join(cfg.dataDir, "documents");
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

async function pdf(cfg, { html, name }, onStep = () => {}) {
  onStep({ step: "pdf", status: "start", detail: `Making ${name}.pdf` });
  const dir = docsDir(cfg);
  const htmlFile = path.join(dir, `${safeName(name)}.html`);
  const pdfFile = path.join(dir, `${safeName(name)}.pdf`);
  fs.writeFileSync(htmlFile, html, "utf8");
  const browser = edge();
  if (!browser) throw new Error("No Edge or Chrome found to make the PDF");
  try {
    fs.rmSync(pdfFile, { force: true });
  } catch {}
  const profile = path.join(os.tmpdir(), "tia-pdf-profile"); // own profile: never touches the owner's browser
  await run(browser, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`, "--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, `file:///${htmlFile.replace(/\\/g, "/")}`], { timeoutMs: 60000 });
  if (!exists(pdfFile)) throw new Error("The PDF was not created");
  if (defaults(cfg).show) open(pdfFile);
  onStep({ step: "pdf", status: "done", detail: `${path.basename(pdfFile)} saved and opened`, file: pdfFile });
  return pdfFile;
}

// ---------- printing ----------
async function defaultPrinter() {
  if (process.platform !== "win32") return "";
  try {
    const out = await run("powershell", ["-NoProfile", "-Command", "(Get-CimInstance Win32_Printer | Where-Object Default).Name"], { timeoutMs: 20000 });
    return out.trim();
  } catch {
    return "";
  }
}

async function print(cfg, file, onStep = () => {}) {
  if (SIM()) return simulated(onStep, "print", "Sending to the printer", "Printed on the office printer", 2000);
  const a = defaults(cfg);
  if (!a.print) throw new Error("Printing is switched off (config actions.print)");
  const printer = (await defaultPrinter()) || "the default printer"; // silent printing always uses the Windows default
  onStep({ step: "print", status: "start", detail: `Sending to ${printer}` });
  // Silent print with Edge/Chrome: --kiosk + --kiosk-printing → straight to the Windows default printer, no dialogs,
  // no sign-in pop-ups (Acrobat showed those). The document shows full-screen for a few seconds while it prints –
  // the visible moment on the stand – then only OUR window (own profile folder) is closed, never the owner's browser.
  const htmlFile = file.replace(/\.pdf$/i, ".html");
  const browser = edge();
  if (browser && exists(htmlFile)) {
    const printFile = htmlFile.replace(/\.html$/i, ".print.html");
    const html = fs.readFileSync(htmlFile, "utf8").replace("</body>", `<script>addEventListener("load",()=>setTimeout(()=>print(),700))</script></body>`);
    fs.writeFileSync(printFile, html, "utf8");
    const profileDir = path.join(os.tmpdir(), "tia-print-profile");
    spawn(browser, ["--kiosk", "--kiosk-printing", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profileDir}`, `file:///${printFile.replace(/\\/g, "/")}`], { detached: true, stdio: "ignore" }).unref();
    await new Promise((r) => setTimeout(r, 6000)); // the job reaches the Windows queue after ~2 s
    const exe = path.basename(browser);
    await run("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='${exe}'" | Where-Object { $_.CommandLine -like '*tia-print-profile*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { timeoutMs: 20000 }).catch(() => {});
    fs.rm(printFile, { force: true }, () => {});
  } else {
    // no Edge/Chrome: the Windows "print" verb of the PDF app (may show that app's window)
    await run("powershell", ["-NoProfile", "-Command", `Start-Process -FilePath '${file.replace(/'/g, "''")}' -Verb Print`], { timeoutMs: 30000 });
  }
  // Report what Windows says about the printer, so an offline printer is said out loud instead of hidden.
  let state = "";
  try {
    state = (await run("powershell", ["-NoProfile", "-Command", `(Get-Printer -Name '${printer.replace(/'/g, "''")}').PrinterStatus`], { timeoutMs: 15000 })).trim();
  } catch {}
  const offline = /offline|error|paperout/i.test(state);
  onStep({ step: "print", status: "done", detail: offline ? `Sent to ${printer} – the printer is offline, it prints when it's switched on` : `Sent to ${printer}`, printer, offline });
  return { printer, offline };
}

// ---------- WhatsApp ----------
function whatsapp(cfg, { phone = "", text }, onStep = () => {}) {
  if (SIM()) return (onStep({ step: "whatsapp", status: "done", detail: "WhatsApp open with the reply typed – you press send" }), { simulated: true });
  if (!defaults(cfg).whatsapp) throw new Error("WhatsApp actions are switched off");
  const digits = String(phone).replace(/\D/g, "");
  const usable = digits.length >= 8 && !/x/i.test(phone) ? digits : ""; // demo numbers are masked → choose the chat by hand
  const url = `https://wa.me/${usable}?text=${encodeURIComponent(text)}`;
  open(url);
  onStep({ step: "whatsapp", status: "done", detail: usable ? "WhatsApp open with the reply typed – you press send" : "WhatsApp open with the reply typed – pick the chat, you press send", url });
  return { url };
}

module.exports = { outlook, pdf, print, whatsapp, open, docsDir };

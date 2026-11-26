// Auto-update from GitHub: every installed Tia checks github.com/rderics/Tia-RobotHack (main) every 15 minutes,
// pulls new commits, installs new packages when needed and tells the screen ("Tia was updated – restart").
// Never touches a copy with uncommitted changes to tracked files (a developer's PC) – it only reports there.
// Off: config.json "autoUpdate": false, or TIA_AUTO_UPDATE=0.
const { execFile, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const state = { enabled: false, checking: false, behind: 0, lastCheck: 0, updated: null, error: "", version: "" };
const sh = (cmd, args, opts = {}) =>
  new Promise((resolve) => execFile(cmd, args, { cwd: ROOT, windowsHide: true, timeout: opts.timeout || 120000, shell: opts.shell || false }, (e, out, err) => resolve({ ok: !e, out: String(out || "").trim(), err: String(err || (e && e.message) || "").trim() })));

async function version() {
  const r = await sh("git", ["log", "-1", "--format=%h · %cd · %s", "--date=format:%d.%m %H:%M"]);
  return r.ok ? r.out : "";
}

async function check(onUpdated) {
  if (state.checking) return state;
  state.checking = true;
  state.error = "";
  try {
    if (!fs.existsSync(path.join(ROOT, ".git"))) throw new Error("not a git copy – run Update Tia once");
    const f = await sh("git", ["fetch", "--quiet", "origin", "main"], { timeout: 60000 });
    if (!f.ok) throw new Error(`can't reach GitHub (${f.err.slice(0, 120)})`);
    const b = await sh("git", ["rev-list", "--count", "HEAD..origin/main"]);
    state.behind = Number(b.out) || 0;
    state.lastCheck = Date.now();
    if (state.behind > 0) {
      const dirty = !(await sh("git", ["diff", "--quiet", "HEAD"])).ok;
      const ahead = Number((await sh("git", ["rev-list", "--count", "origin/main..HEAD"])).out) || 0;
      if (dirty || ahead) throw new Error(`${state.behind} new update(s) on GitHub – not applied because this copy has its own changes`);
      const before = (await sh("git", ["rev-parse", "HEAD"])).out;
      const p = await sh("git", ["pull", "--ff-only", "--quiet", "origin", "main"], { timeout: 120000 });
      if (!p.ok) throw new Error(`update failed: ${p.err.slice(0, 160)}`);
      const files = (await sh("git", ["diff", "--name-only", before, "HEAD"])).out.split(/\r?\n/).filter(Boolean);
      if (files.some((x) => /^package(-lock)?\.json$/.test(x))) await sh("npm", ["install", "--no-fund", "--no-audit"], { shell: true, timeout: 600000 });
      if (files.includes("requirements.txt")) await sh("python", ["-m", "pip", "install", "-q", "-r", "requirements.txt"], { timeout: 600000 });
      const subject = (await sh("git", ["log", "-1", "--format=%s"])).out;
      // server code changed → restart needed; only screen files → a reload is enough
      const needsRestart = files.some((x) => /^src\//.test(x) && !/^src\/renderer\//.test(x)) || files.some((x) => /^package/.test(x));
      state.updated = { at: Date.now(), count: state.behind, subject, needsRestart, files: files.length };
      state.behind = 0;
      if (onUpdated) onUpdated(state.updated);
    }
  } catch (e) {
    state.error = String(e.message || e);
  }
  state.version = await version();
  state.checking = false;
  return state;
}

function start(cfg, onUpdated) {
  state.enabled = cfg.autoUpdate !== false && process.env.TIA_AUTO_UPDATE !== "0";
  version().then((v) => (state.version = v));
  if (!state.enabled) return;
  setTimeout(() => check(onUpdated), 60 * 1000).unref();
  setInterval(() => check(onUpdated), 15 * 60 * 1000).unref();
}

// Restart Tia with the new code (desktop app: relaunch; plain server: start a new one, then stop this one)
function restart() {
  if (process.versions.electron) {
    const { app } = require("electron");
    app.relaunch();
    setTimeout(() => app.exit(0), 300);
    return;
  }
  const child = spawn("cmd", ["/c", `timeout /t 2 /nobreak >nul & node src\\web.js`], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true, env: process.env });
  child.unref();
  setTimeout(() => process.exit(0), 300);
}

const status = () => ({ ...state });
module.exports = { start, check, status, restart };

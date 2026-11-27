// Electron desktop app: starts Tia's server (src/web.js) in the background and shows its screen in a window.
// Same screen, same brain, same phone pairing as `npm run web` – just in its own window.
const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const fs = require("fs");
const web = require("./web");

const argReplay = process.argv.includes("--replay");
const shotArg = process.argv.find((a) => a.startsWith("--screenshot="));
const screenshotPath = shotArg ? path.resolve(shotArg.split("=")[1]) : null;

let win;

async function createWindow() {
  try {
    await web.start();
  } catch (e) {
    if (e && e.code !== "EADDRINUSE") throw e; // already running (e.g. started at logon) – just show it
  }
  // Only the microphone, and only for Tia's own page (hold-to-talk).
  session.defaultSession.setPermissionRequestHandler((wc, permission, done) => {
    done(permission === "media" && wc.getURL().startsWith(`http://localhost:${web.PORT}`));
  });
  // The real apps shown inside Tia (Instagram) see a normal Chrome, not "Electron" – otherwise they refuse to log in.
  const chromeUA = session.defaultSession.getUserAgent().replace(/\s(Electron|tia)\/\S+/gi, "");
  // Google's own sign-in is not possible inside an app (Google blocks embedded browsers) – Slack: sign in with email.
  for (const p of ["instagram", "whatsapp", "slack"]) session.fromPartition(`persist:${p}`).setUserAgent(chromeUA);
  // every real-app webview: no passkey / "insert your security key" pop-ups (webview-preload.js)
  app.on("web-contents-created", (e, wc) => {
    wc.on("will-attach-webview", (ev, prefs) => {
      prefs.preload = path.join(__dirname, "webview-preload.js");
    });
  });
  app.on("web-contents-created", (e, wc) => {
    if (wc.getType() !== "webview") return;
    wc.setWindowOpenHandler(({ url }) => (wc.loadURL(url), { action: "deny" })); // links stay inside the tab
  });
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: "Tia",
    backgroundColor: "#0C0B0F",
    icon: path.join(__dirname, "renderer", "assets", process.platform === "win32" ? "icon.ico" : "favicon-192.png"),
    show: !screenshotPath,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: true }, // webview = the real Instagram tab
  });
  win.removeMenu();
  // F11 = full screen for the stand / pitch (no window frame, no address bar)
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
  if (screenshotPath) {
    win.webContents.on("console-message", async (e) => {
      if ((e.message || "") !== "TIA-DONE") return;
      setTimeout(async () => {
        const img = await win.webContents.capturePage();
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        fs.writeFileSync(screenshotPath, img.toPNG());
        app.quit();
      }, 2500);
    });
  }
  const autorun = screenshotPath ? "replay" : argReplay ? "replay" : "";
  win.loadURL(`http://localhost:${web.PORT}/?autorun=${autorun}${screenshotPath ? "&shot=1" : ""}`);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

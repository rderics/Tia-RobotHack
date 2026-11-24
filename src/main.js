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
  await web.start();
  // Only the microphone, and only for Tia's own page (hold-to-talk).
  session.defaultSession.setPermissionRequestHandler((wc, permission, done) => {
    done(permission === "media" && wc.getURL().startsWith(`http://localhost:${web.PORT}`));
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
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.removeMenu();
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

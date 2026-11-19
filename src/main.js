// Electron main process: opens Tia's window and connects the screen to the brain.
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const engine = require("./brain/engine");

const argReplay = process.argv.includes("--replay");
const shotArg = process.argv.find((a) => a.startsWith("--screenshot="));
const screenshotPath = shotArg ? path.resolve(shotArg.split("=")[1]) : null;

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: "Tia",
    backgroundColor: "#F6F3FB",
    icon: path.join(__dirname, "renderer", "assets", process.platform === "win32" ? "icon.ico" : "favicon-192.png"),
    show: !screenshotPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.removeMenu();
  if (screenshotPath) {
    win.webContents.on("console-message", (e) => {
      const msg = e.message || "";
      if (msg.startsWith("TIA-")) console.log(msg);
    });
  }
  win.loadFile(path.join(__dirname, "renderer", "index.html"), {
    query: {
      autorun: screenshotPath ? (process.argv.includes("--live") ? "live" : "replay") : argReplay ? "replay-ready" : "",
      shot: screenshotPath ? "1" : "",
    },
  });
}

ipcMain.handle("tia:info", () => engine.info());

ipcMain.handle("tia:run", async (_e, mode) => {
  const send = (ev) => win && !win.isDestroyed() && win.webContents.send("tia:event", ev);
  try {
    await engine.runDay({ mode, onEvent: send });
  } catch (e) {
    send({ type: "error", error: String(e.message || e) });
  }
  if (screenshotPath) {
    setTimeout(async () => {
      const img = await win.webContents.capturePage();
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      fs.writeFileSync(screenshotPath, img.toPNG());
      app.quit();
    }, 2500);
  }
});

ipcMain.handle("tia:feedback", (_e, payload) => engine.recordFeedback(payload));
ipcMain.handle("tia:reset", () => engine.resetDemo());

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

// The only bridge between the screen and the brain. The screen gets these functions and nothing else.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tia", {
  info: () => ipcRenderer.invoke("tia:info"),
  run: (mode) => ipcRenderer.invoke("tia:run", mode),
  feedback: (payload) => ipcRenderer.invoke("tia:feedback", payload),
  reset: () => ipcRenderer.invoke("tia:reset"),
  onEvent: (fn) => ipcRenderer.on("tia:event", (_e, ev) => fn(ev)),
});

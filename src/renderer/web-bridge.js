// When the screen runs in a normal browser (website mode), this gives it the same window.tia
// functions the desktop app gets from preload.js – but over HTTP to src/web.js.
// In the desktop app window.tia already exists, so this file does nothing there.
(function () {
  if (window.tia) return;

  const listeners = [];
  const stream = new EventSource("/api/events");
  const connected = new Promise((resolve) => stream.addEventListener("open", resolve, { once: true }));
  stream.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    for (const fn of listeners) fn(ev);
  };

  async function post(url, body) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
    return res.json();
  }

  window.tia = {
    info: () => fetch("/api/info").then((r) => r.json()),
    run: async (mode) => {
      await connected; // make sure we are listening before Tia starts talking
      return post("/api/run", { mode });
    },
    feedback: (payload) => post("/api/feedback", payload),
    reset: () => post("/api/reset"),
    onEvent: (fn) => listeners.push(fn),
  };
})();

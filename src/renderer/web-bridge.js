// When the screen runs from Tia's server (website or desktop app), this gives it window.tia –
// all over HTTP to src/web.js. On the public replay site, static-bridge.js provides window.tia instead
// (without talking, pairing or documents – the screen hides those parts).
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
    state: () => fetch("/api/state").then((r) => r.json()),
    run: async (mode) => {
      await connected; // make sure we are listening before Tia starts talking
      return post("/api/run", { mode });
    },
    feedback: (payload) => post("/api/feedback", payload),
    decide: (id, verdict, editedText) => post("/api/decide", { id, verdict, editedText }),
    say: (text) => post("/api/say", { text }),
    voice: (blob) => fetch("/api/voice", { method: "POST", headers: { "content-type": blob.type || "audio/webm" }, body: blob }).then((r) => r.json()),
    pair: (ip) => fetch(`/api/pair${ip ? `?ip=${encodeURIComponent(ip)}` : ""}`).then((r) => r.json()),
    docUrl: (id) => `/doc/${id}`,
    reset: () => post("/api/reset"),
    onEvent: (fn) => listeners.push(fn),
  };
})();

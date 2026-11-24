// When the screen runs from Tia's server (this computer, or the Tia web address), this gives it window.tia –
// all over HTTP to src/web.js. On the public replay site, static-bridge.js provides window.tia instead
// (without talking, pairing or documents – the screen hides those parts).
//
// On this computer no login is needed. Anywhere else (the web address) the Tia code is the login:
// it comes from a link (…/#t=CODE) or is typed once, and is kept in this browser.
(function () {
  if (window.tia) return;

  const remote = !["localhost", "127.0.0.1"].includes(location.hostname);
  const KEY = "tia.token";
  let token = "";
  try {
    const fromLink = new URLSearchParams(location.hash.slice(1)).get("t");
    if (fromLink) {
      localStorage.setItem(KEY, fromLink);
      history.replaceState(null, "", location.pathname + location.search); // don't leave the code in the address bar
    }
    token = localStorage.getItem(KEY) || "";
  } catch {}

  function showLogin(message) {
    if (document.getElementById("tiaLogin")) return;
    const box = document.createElement("div");
    box.id = "tiaLogin";
    box.className = "login";
    box.innerHTML = `
      <form class="login-card">
        <img src="assets/logo-light.png" alt="" width="56" height="56" />
        <h1>Tia</h1>
        <p>${message || "Enter your Tia code to open your desk."}</p>
        <input name="code" autocomplete="one-time-code" placeholder="Tia code" required />
        <button class="btn primary" type="submit">Open</button>
        <small>The code is in the Tia app (••• menu) or the QR code on Tia's screen at home.</small>
      </form>`;
    box.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      let code = box.querySelector("input").value.trim();
      const m = code.match(/[?&#]t=([\w-]+)/);
      if (m) code = m[1]; // a whole pairing code or link was pasted
      try {
        localStorage.setItem(KEY, code);
      } catch {}
      location.reload();
    };
    document.body.appendChild(box);
    box.querySelector("input").focus();
  }
  if (remote && !token) {
    document.addEventListener("DOMContentLoaded", () => showLogin());
  }

  const withToken = (url) => (remote && token ? `${url}${url.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}` : url);
  const headers = (extra = {}) => (remote && token ? { ...extra, "x-tia-token": token } : extra);
  async function check(res) {
    if (res.status === 401 && remote) {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      showLogin("That code didn't work – it may be an old one. Enter the current Tia code.");
      throw new Error("login needed");
    }
    return res.json();
  }

  const listeners = [];
  const stream = new EventSource(withToken("api/events"));
  const connected = new Promise((resolve) => stream.addEventListener("open", resolve, { once: true }));
  stream.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    for (const fn of listeners) fn(ev);
  };

  const get = (url) => fetch(url, { headers: headers() }).then(check);
  const post = (url, body) => fetch(url, { method: "POST", headers: headers({ "content-type": "application/json" }), body: JSON.stringify(body || {}) }).then(check);

  window.tia = {
    remote,
    info: () => get("api/info"),
    state: () => get("api/state"),
    run: async (mode) => {
      await connected; // make sure we are listening before Tia starts talking
      return post("api/run", { mode });
    },
    feedback: (payload) => post("api/feedback", payload),
    decide: (id, verdict, editedText) => post("api/decide", { id, verdict, editedText }),
    say: (text) => post("api/say", { text }),
    voice: (blob) => fetch("api/voice", { method: "POST", headers: headers({ "content-type": blob.type || "audio/webm" }), body: blob }).then(check),
    pair: (ip) => get(`api/pair${ip ? `?ip=${encodeURIComponent(ip)}` : ""}`),
    webLink: () => (token ? `${location.origin}${location.pathname}#t=${token}` : ""),
    docUrl: (id) => withToken(`doc/${id}`),
    reset: () => post("api/reset"),
    onEvent: (fn) => listeners.push(fn),
  };
})();

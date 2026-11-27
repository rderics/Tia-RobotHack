// The REAL apps inside the desktop app (Electron <webview>): WhatsApp Web, Slack. (Google Calendar can't be: Google blocks
// its sign-in inside apps – the Calendar tab shows the owner's real events through Composio instead, channels/calendar.js.)
// Each one has its own logged-in session ("persist:<app>") and lives on <body>, laid over the tab's slot, so switching
// tabs never reloads it. Next to it, Tia's panel: she reads the open chat, writes a reply and puts it into the real
// message box – the owner presses Enter. Calendar: one sentence → an event in Google Calendar → the page refreshes.
// A normal browser (phone, public demo) has no <webview> – the look-alike views are used there.
(function () {
  const inElectron = /Electron/i.test(navigator.userAgent);
  const T = () => window.tia || {};
  const APPS = {
    whatsapp: { url: "https://web.whatsapp.com/", name: "WhatsApp" },
    slack: { url: "https://app.slack.com/client", name: "Slack" },
  };
  const webs = {};
  let rerender = () => {};

  function web(key) {
    if (webs[key]) return webs[key];
    const w = document.createElement("webview");
    w.className = "real-web";
    w.setAttribute("partition", `persist:${key}`);
    w.setAttribute("allowpopups", "");
    w.setAttribute("src", APPS[key].url);
    document.body.append(w);
    webs[key] = w;
    return w;
  }
  function place() {
    for (const [key, w] of Object.entries(webs)) {
      const slot = document.querySelector(`.real-slot[data-app="${key}"]`);
      const on = slot && document.body.classList.contains(`tab-${key}`) && !document.querySelector(".chview[hidden]");
      if (!on) {
        w.classList.remove("show");
        continue;
      }
      const r = slot.getBoundingClientRect();
      Object.assign(w.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      w.classList.add("show");
    }
  }
  window.addEventListener("resize", place);
  const run = (key, js) => (webs[key] ? webs[key].executeJavaScript(js, false).catch(() => null) : Promise.resolve(null));

  // ---------- reading / writing inside the real chat apps (their own page, their own DOM) ----------
  const READ = {
    whatsapp: `(() => { const m = document.querySelector("#main"); if (!m) return null;
      const h = m.querySelector("header"); const name = h ? (h.querySelector("span[dir=auto]") || h).innerText.split("\\n")[0] : "";
      const box = m.querySelector("[role=application]") || m; return { chat: name, text: box.innerText.slice(-2500) }; })()`,
    slack: `(() => { const t = document.title.replace(/ - Slack$/, ""); const pane = document.querySelector("[data-qa=message_pane]") || document.querySelector(".p-workspace__primary_view_body");
      if (!pane) return null; return { chat: t.split(" - ")[0].replace(/ \\(.+\\)$/, ""), text: pane.innerText.slice(-2500) }; })()`,
  };
  const COMPOSER = {
    whatsapp: `#main footer div[contenteditable="true"]`,
    slack: `div[data-qa="message_input"] .ql-editor, .ql-editor[contenteditable="true"]`,
  };
  const insertJs = (sel, text) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.focus();
    document.execCommand("insertText", false, ${JSON.stringify(text)}); return true; })()`;

  const st = {}; // per app: { chat, text, draft, busy, note }
  const S = (k) => (st[k] = st[k] || { chat: "", text: "", draft: "", busy: false, note: "" });
  // follow the chat the owner opens in the real app
  setInterval(async () => {
    for (const key of ["whatsapp", "slack"]) {
      if (!webs[key] || !document.body.classList.contains(`tab-${key}`)) continue;
      const r = await run(key, READ[key]);
      const s = S(key);
      const chat = (r && r.chat) || "";
      if (chat !== s.chat) {
        s.chat = chat;
        s.text = (r && r.text) || "";
        s.draft = "";
        s.note = "";
        rerender();
      } else if (r) s.text = r.text;
    }
  }, 1500);

  function chatPanel(h, key, I) {
    const s = S(key);
    const app = APPS[key].name;
    const ta = h("textarea", { class: "am-ta", rows: 8, placeholder: s.chat ? `Tia's reply to ${s.chat} appears here – or write your own` : `Open a chat in ${app} on the left`, oninput: (e) => (s.draft = e.target.value) });
    ta.value = s.draft;
    return [
      h("div", { class: "rp-chat" }, s.chat ? [h("span", {}, "Open chat"), h("b", {}, s.chat)] : h("span", {}, `Open a chat in ${app} – Tia follows it.`)),
      h("div", { class: "igr-t" }, "Reply"),
      ta,
      h("div", { class: "am-row" },
        h("button", { class: "am-btn", disabled: !s.chat || s.busy, onclick: async () => {
          s.busy = true;
          s.note = "";
          rerender();
          try {
            const r = await T().livePost("suggest", { app: key === "whatsapp" ? "whatsapp" : "slack", from: s.chat, address: s.chat, text: `The last messages in this ${app} chat (newest at the end):\n${s.text}` });
            if (r.error) throw new Error(r.error);
            s.draft = r.skip ? "" : r.text;
            s.note = r.skip ? `Tia: no reply needed – ${r.skip}` : "";
          } catch (e) {
            s.note = `⚠ ${e.message || e}`;
          }
          s.busy = false;
          rerender();
        } }, I("sparkle"), s.busy ? "Tia is writing…" : "Let Tia write"),
        h("button", { class: "am-primary", disabled: !s.chat, onclick: async () => {
          const ok = await run(key, insertJs(COMPOSER[key], ta.value));
          s.note = ok ? `✓ It's in the ${app} message box – check it and press Enter to send.` : `Couldn't reach the ${app} message box – click into the chat once and try again.`;
          if (ok && webs[key]) webs[key].focus();
          rerender();
        } }, `Put it in ${app}`)),
      h("div", { class: "am-saved muted" }, s.note || `Tia never sends by herself – you press Enter in ${app}.`),
    ];
  }

  // ---------- Google Calendar: one sentence → an event ----------
  const cal = { text: "", draft: null, busy: "", note: "" };
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function calPanel(h, I) {
    const ta = h("textarea", { class: "am-ta", rows: 3, placeholder: "e.g. Team call tomorrow at 10 for 30 minutes", oninput: (e) => (cal.text = e.target.value) });
    ta.value = cal.text;
    const out = [
      h("div", { class: "igr-t" }, "Add an event"),
      ta,
      h("div", { class: "am-row" },
        h("button", { class: "am-btn", disabled: !!cal.busy, onclick: async () => {
          if (!cal.text.trim()) return ta.focus();
          cal.busy = "Tia is reading it…";
          cal.note = "";
          rerender();
          try {
            const r = await T().livePost("calendar/parse", { text: cal.text, today: ymd(new Date()) });
            if (r.error) throw new Error(r.error);
            cal.draft = r;
          } catch (e) {
            cal.note = `⚠ ${e.message || e}`;
          }
          cal.busy = "";
          rerender();
        } }, I("sparkle"), cal.busy || "Fill in with Tia")),
    ];
    if (cal.draft) {
      const d = cal.draft;
      const f = (k, label, type = "text") => h("label", { class: "rp-f" }, h("span", {}, label), h("input", { type, value: d[k] ?? "", oninput: (e) => (d[k] = type === "number" ? Number(e.target.value) : e.target.value) }));
      out.push(h("div", { class: "rp-ev" }, f("title", "Title"), f("date", "Date", "date"), f("time", "Time", "time"), f("minutes", "Minutes", "number"), f("location", "Where"),
        h("div", { class: "am-row" },
          h("button", { class: "am-primary", disabled: !!cal.busy, onclick: async () => {
            cal.busy = "Adding…";
            rerender();
            try {
              const r = await T().livePost("calendar/add", { title: d.title, start: `${d.date}T${d.time}`, minutes: d.minutes, location: d.location });
              if (r.error) throw new Error(r.error);
              cal.note = `✓ “${d.title}” is in your Google Calendar.`;
              cal.draft = null;
              cal.text = "";
              if (webs.calendar) webs.calendar.reload();
            } catch (e) {
              cal.note = `⚠ ${e.message || e}`;
            }
            cal.busy = "";
            rerender();
          } }, "Add to Google Calendar"),
          h("button", { class: "am-btn", onclick: () => ((cal.draft = null), rerender()) }, "Cancel"))));
    }
    out.push(h("div", { class: "am-saved muted" }, cal.note || "Tia adds it to your real Google Calendar – the page on the left refreshes."));
    return out;
  }

  function view(key, c) {
    const { h } = c;
    const I = window.TiaApps ? window.TiaApps.I : () => document.createElement("span");
    web(key);
    setTimeout(place, 0);
    const panel = h("div", { class: "igr-side real-side" },
      h("div", { class: "igr-hd" }, I("sparkle"), h("b", {}, `Tia · ${APPS[key].name}`), h("span", { class: "sp" }),
        h("button", { class: "igr-ic", title: `Reload ${APPS[key].name}`, onclick: () => webs[key] && webs[key].reload() }, "↻")),
      key === "calendar" ? calPanel(h, I) : chatPanel(h, key, I));
    return h("div", { class: "igr real" }, h("div", { class: "real-slot", "data-app": key }), panel);
  }

  window.TiaReal = {
    has: (key) => inElectron && !!APPS[key],
    view,
    place,
    setRerender: (fn) => (rerender = fn),
    reload: (key) => webs[key] && webs[key].reload(),
    // open a chat in the real app (WhatsApp Web: web.whatsapp.com/send?phone=…)
    open: (key, url) => {
      const w = web(key);
      try {
        w.loadURL(url);
      } catch {
        w.setAttribute("src", url);
      }
    },
  };
})();

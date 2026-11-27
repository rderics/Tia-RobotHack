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
  // (28.11: no reply panel next to WhatsApp / Slack any more – the real app fills the page, Tia's own box sits on the right)

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
    if (key === "calendar") {
      const panel = h("div", { class: "igr-side real-side" }, h("div", { class: "igr-hd" }, I("sparkle"), h("b", {}, `Tia · ${APPS[key].name}`)), calPanel(h, I));
      return h("div", { class: "igr real" }, h("div", { class: "real-slot", "data-app": key }), panel);
    }
    // WhatsApp / Slack: the real app + a slim column that only holds Tia's box (talk to her, approve a send)
    return h("div", { class: "igr real slim" }, h("div", { class: "real-slot", "data-app": key }), h("div", { class: "real-tia" }));
  }

  // Send a WhatsApp in the real WhatsApp Web. Step 1 (page script): find the chat (list or search), open it and check the
  // header IS that person – otherwise nothing happens. Step 2 (real keystrokes from Tia, like a person typing): clear the
  // message box, type the text, check it, press Enter. dryRun = everything but Enter, and the box is cleared again.
  function openChatJs(name) {
    return `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (x) => String(x || "").normalize("NFC").toLowerCase().trim();
      const want = norm(${JSON.stringify(name)});
      const match = (t) => { const v = norm(t); return v === want || v.startsWith(want) || want.startsWith(v + " ") || (want.split(" ")[0].length > 3 && v.split(" ")[0] === want.split(" ")[0]); };
      const titles = () => [...document.querySelectorAll("#pane-side span[title]")];
      const findRow = () => titles().find((x) => norm(x.getAttribute("title")) === want) || titles().find((x) => match(x.getAttribute("title")));
      const header = () => document.querySelector("#main header span[dir=auto]");
      if (!document.querySelector("#pane-side")) return { ok: false, error: "WhatsApp isn't logged in inside Tia – open the WhatsApp tab and scan the QR" };
      if (!(header() && match(header().innerText))) {
        let row = findRow();
        if (!row) {
          const box = document.querySelector("#side [contenteditable=true], #side input");
          if (!box) return { ok: false, error: "WhatsApp search box not found" };
          box.focus();
          if (box.tagName === "INPUT") { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(box, ${JSON.stringify(name)}); box.dispatchEvent(new Event("input", { bubbles: true })); }
          else document.execCommand("insertText", false, ${JSON.stringify(name)});
          for (let i = 0; i < 25 && !(row = findRow()); i++) await sleep(300);
        }
        if (!row) return { ok: false, error: "No chat called " + ${JSON.stringify(name)} + " in WhatsApp" };
        const cell = row.closest("[role=listitem], [role=row], [role=gridcell]") || row;
        for (const t of ["mousedown", "mouseup", "click"]) cell.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
      }
      let comp;
      for (let i = 0; i < 25; i++) {
        comp = document.querySelector("#main footer [contenteditable=true]");
        if (comp && header() && match(header().innerText)) break;
        await sleep(300);
      }
      if (!comp || !header() || !match(header().innerText)) return { ok: false, error: "Couldn't open the chat with " + ${JSON.stringify(name)} + " – nothing was sent" };
      comp.focus();
      return { ok: true, chat: header().innerText };
    })()`;
  }
  const boxText = `(() => { const c = document.querySelector("#main footer [contenteditable=true]"); return c ? c.innerText.replace(/\\n+$/, "") : null; })()`;
  const pause = (ms) => new Promise((x) => setTimeout(x, ms));
  async function clearBox(w) {
    w.focus();
    w.sendInputEvent({ type: "keyDown", keyCode: "A", modifiers: ["control"] });
    w.sendInputEvent({ type: "keyUp", keyCode: "A", modifiers: ["control"] });
    w.sendInputEvent({ type: "keyDown", keyCode: "Backspace" });
    w.sendInputEvent({ type: "keyUp", keyCode: "Backspace" });
    await pause(300);
  }
  async function waSend({ id, name, text, dryRun }) {
    let r;
    try {
      const w = web("whatsapp");
      for (let i = 0; i < 40 && !w.getWebContentsId; i++) await pause(250);
      r = await w.executeJavaScript(openChatJs(name), true);
      if (r && r.ok) {
        await clearBox(w); // an old draft in that chat must never be sent along
        if ((await w.executeJavaScript(boxText)) !== "") r = { ok: false, error: "Couldn't empty the WhatsApp message box – nothing was sent" };
        else {
          w.focus();
          await w.insertText(text);
          await pause(400);
          const typed = await w.executeJavaScript(boxText);
          if (typed !== text) {
            await clearBox(w);
            r = { ok: false, error: "The text didn't land in WhatsApp correctly – nothing was sent" };
          } else if (dryRun) {
            await clearBox(w);
            r = { ...r, dryRun: true, typed, left: await w.executeJavaScript(boxText) };
          } else {
            w.sendInputEvent({ type: "keyDown", keyCode: "Return" });
            w.sendInputEvent({ type: "keyUp", keyCode: "Return" });
            await pause(900);
            const left = await w.executeJavaScript(boxText);
            r = { ok: left === "", chat: r.chat, error: left ? "The message is still in the box – press Enter in WhatsApp" : "" };
          }
        }
      }
    } catch (e) {
      r = { ok: false, error: String((e && e.message) || e) };
    }
    if (id && T().livePost) T().livePost("whatsapp/screen-result", { id, ...(r || {}) }).catch(() => {});
    return r;
  }
  // tidy a chat's message box (e.g. a leftover test draft) – never sends
  async function waClear(name) {
    const w = web("whatsapp");
    const r = await w.executeJavaScript(openChatJs(name), true);
    if (!r || !r.ok) return r;
    await clearBox(w);
    return { ok: true, chat: r.chat, left: await w.executeJavaScript(boxText) };
  }

  window.TiaReal = {
    waSend,
    waClear,
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

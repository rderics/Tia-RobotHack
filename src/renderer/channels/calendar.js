// Calendar tab – a week view like Google Calendar.
// Live: the owner's Google Calendar (Composio) – read the week, click an event, add one (the owner presses Add).
// Demo: Oakline Studio's week, read straight from the vault note "Calendar — this week".
// "Tell Tia" turns a sentence ("measuring at Anna's Friday 10 for an hour") into a ready event to check and add.
(function () {
  const T = () => window.tia || {};
  const I = (n) => (window.TiaApps ? window.TiaApps.I(n) : document.createElement("span"));
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monday = (d) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const DEMO_TODAY = new Date(2026, 10, 19); // the stand's "today" (Thu 19.11.2026)
  let rerender = () => {};
  let week = null; // Date (Monday)
  let weekMode = null;
  let data = null;
  let err = "";
  let loading = false;
  let sel = null;
  let draft = null; // event being added { title, date, time, minutes, location }
  let tiaText = "";
  let busy = "";
  let note = "";
  const demoAdded = [];

  // ---- demo: parse the vault note table "| Thu 19.11 | 09:00–11:00 | What |"
  function parseNote(text) {
    const out = [];
    for (const line of String(text || "").split(/\r?\n/)) {
      const m = line.match(/^\|\s*\w{3}\s+(\d{1,2})\.(\d{1,2})\s*\|\s*(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})\s*\|\s*(.+?)\s*\|\s*$/);
      if (!m) continue;
      const what = m[7].replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1");
      if (/^free$/i.test(what)) continue;
      const s = new Date(2026, +m[2] - 1, +m[1], +m[3], +m[4]);
      const e = new Date(2026, +m[2] - 1, +m[1], +m[5], +m[6]);
      out.push({ id: `d${out.length}`, title: what.split(/\s+–\s+|,\s+/)[0], description: what, location: (what.match(/,\s*([^()]+?)(\s*\(|$)/) || [])[1] || "", start: s.toISOString(), end: e.toISOString(), allDay: false });
    }
    return out;
  }
  async function load(live) {
    loading = true;
    err = "";
    rerender();
    try {
      if (live) data = await T().live(`calendar?week=${ymd(week)}`);
      else {
        let text = "";
        if (T().vaultNote) {
          const n = await T().vaultNote("Calendar — this week.md");
          text = (n && (n.text || n.content || n.body)) || "";
        }
        data = { events: [...parseNote(text), ...demoAdded], account: "Oakline Studio (vault note)" };
      }
      if (data && data.error) throw new Error(data.error);
    } catch (e) {
      err = e.message || String(e);
      data = { events: [] };
    }
    loading = false;
    rerender();
  }

  function view(c) {
    const { h } = c;
    const L = window.TiaLive;
    const live = !!(L && L.isLive("calendar"));
    const modeKey = live ? "live" : "demo";
    if (!week || weekMode !== modeKey) {
      week = monday(live ? new Date() : DEMO_TODAY);
      weekMode = modeKey;
      data = null;
    }
    if (!data && !loading) load(live);
    const days = [...Array(7)].map((_, i) => new Date(week.getFullYear(), week.getMonth(), week.getDate() + i));
    const today = live ? new Date() : DEMO_TODAY;
    const go = (delta) => ((week = new Date(week.getFullYear(), week.getMonth(), week.getDate() + delta)), (data = null), (sel = null), rerender());
    const head = h("div", { class: "gc-top" },
      h("div", { class: "gc-logo" }, I("calendar")), h("div", { class: "gc-title" }, "Calendar"),
      h("button", { class: "gc-btn", onclick: () => ((week = monday(today)), (data = null), rerender()) }, "Today"),
      h("button", { class: "gc-nav", title: "Previous week", onclick: () => go(-7) }, "‹"),
      h("button", { class: "gc-nav", title: "Next week", onclick: () => go(7) }, "›"),
      h("div", { class: "gc-range" }, `${days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`),
      h("span", { class: "sp" }),
      h("button", { class: "gc-create", onclick: () => ((draft = { title: "", date: ymd(today), time: "10:00", minutes: 60, location: "" }), (sel = null), rerender()) }, "+ New event"));
    // grid
    const H0 = 7;
    const H1 = 21;
    const evs = ((data && data.events) || []).map((e) => ({ ...e, s: new Date(e.start), e: new Date(e.end || e.start) }));
    const grid = h("div", { class: "gc-grid" });
    grid.append(h("div", { class: "gc-corner" }), ...days.map((d) => h("div", { class: `gc-dh ${ymd(d) === ymd(today) ? "today" : ""}` }, h("span", {}, d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()), h("b", {}, d.getDate()))));
    // all-day row
    grid.append(h("div", { class: "gc-hr" }, ""), ...days.map((d) => h("div", { class: "gc-allday" }, evs.filter((e) => e.allDay && ymd(e.s) <= ymd(d) && ymd(d) < ymd(e.e)).map((e) => {
      const chip = h("div", { class: `gc-chip ${sel === e.id ? "on" : ""}`, onclick: () => ((sel = e.id), (draft = null), rerender()) }, e.title);
      if (e.color) (chip.style.background = e.color), (chip.style.color = "#fff");
      return chip;
    }))));
    const hours = h("div", { class: "gc-hours" }, [...Array(H1 - H0)].map((_, i) => h("div", { class: "gc-h" }, `${pad(H0 + i)}:00`)));
    const cols = days.map((d) => {
      const col = h("div", { class: `gc-col ${ymd(d) === ymd(today) ? "today" : ""}` });
      for (const e of evs.filter((x) => !x.allDay && ymd(x.s) === ymd(d))) {
        const top = Math.max(0, (e.s.getHours() + e.s.getMinutes() / 60 - H0) * 48);
        const ht = Math.max(22, ((e.e - e.s) / 36e5) * 48 - 2);
        const b = h("div", { class: `gc-ev ${sel === e.id ? "on" : ""}`, title: e.title, onclick: () => ((sel = e.id), (draft = null), rerender()) }, h("b", {}, e.title), h("span", {}, `${e.s.toTimeString().slice(0, 5)} – ${e.e.toTimeString().slice(0, 5)}`));
        if (e.color) b.style.background = e.color; // the event's own Google colour
        b.style.top = `${top}px`;
        b.style.height = `${ht}px`;
        col.append(b);
      }
      return col;
    });
    const body = h("div", { class: "gc-body" }, hours, ...cols);
    const main = h("div", { class: "gc-main" }, grid, body, loading ? h("div", { class: "gc-load" }, "Loading the week…") : "", err ? h("div", { class: "gc-err" }, `Couldn't read the calendar: ${err}`) : "");
    // side panel: event details or new event
    const side = h("div", { class: "gc-side" });
    const ev = evs.find((e) => e.id === sel);
    if (draft) side.append(newEventPanel(c, live, today));
    else if (ev) {
      side.append(h("div", { class: "gc-st" }, ev.title),
        h("div", { class: "gc-sl" }, I("calendar"), ev.allDay ? ev.s.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : `${ev.s.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · ${ev.s.toTimeString().slice(0, 5)} – ${ev.e.toTimeString().slice(0, 5)}`),
        ev.location ? h("div", { class: "gc-sl" }, I("pin"), ev.location) : "",
        ev.description && ev.description !== ev.title ? h("div", { class: "gc-desc" }, ev.description) : "",
        ev.link ? h("a", { class: "gc-btn", href: ev.link, target: "_blank", rel: "noopener" }, "Open in Google Calendar") : "",
        h("button", { class: "gc-btn", onclick: () => ((sel = null), rerender()) }, "Close"));
    } else {
      side.append(h("div", { class: "gc-st" }, "Tell Tia"),
        h("div", { class: "gc-desc" }, "Say what to book – Tia fills in the event, you check it and press Add."),
        tiaBox(c, live, today),
        h("div", { class: "gc-desc muted" }, live ? `Your Google Calendar${data && data.account ? ` · ${data.account}` : ""}. Click an event to see it.` : "Oakline Studio's week, read from the vault note “Calendar — this week”. Click an event to see it."));
    }
    return h("div", { class: "gc" }, head, h("div", { class: "gc-wrap" }, main, side));
  }

  function tiaBox(c, live, today) {
    const { h } = c;
    const ta = h("textarea", { class: "gc-in", rows: 3, placeholder: "e.g. Measuring at Anna Kalniņa's in Teika on Friday at 10 for an hour", oninput: (e) => (tiaText = e.target.value) });
    ta.value = tiaText;
    return h("div", { class: "gc-tia" }, ta,
      h("button", { class: "gc-create", disabled: !!busy, onclick: async () => {
        if (!tiaText.trim()) return ta.focus();
        if (!T().livePost) return ((note = "Tia fills in events on the live Tia."), rerender());
        busy = "parse";
        note = "";
        rerender();
        try {
          const r = await T().livePost("calendar/parse", { text: tiaText, today: ymd(today) });
          if (r.error) throw new Error(r.error);
          draft = { title: r.title, date: r.date, time: r.time, minutes: r.minutes, location: r.location || "" };
        } catch (e) {
          note = e.message || String(e);
        }
        busy = "";
        rerender();
      } }, I("sparkle"), busy === "parse" ? "Tia is filling it in…" : "Fill in with Tia"),
      note ? h("div", { class: "gc-err" }, note) : "");
  }

  function newEventPanel(c, live, today) {
    const { h } = c;
    const d = draft;
    const inp = (k, type, extra = {}) => h("input", { class: "gc-in", type, value: d[k], oninput: (e) => (d[k] = type === "number" ? +e.target.value : e.target.value), ...extra });
    return h("div", { class: "gc-new" },
      h("div", { class: "gc-st" }, "New event"),
      h("label", {}, "Title"), inp("title", "text", { placeholder: "Add title" }),
      h("div", { class: "gc-two" }, h("div", {}, h("label", {}, "Date"), inp("date", "date")), h("div", {}, h("label", {}, "Start"), inp("time", "time"))),
      h("label", {}, "Length (minutes)"), inp("minutes", "number", { min: 15, step: 15 }),
      h("label", {}, "Where"), inp("location", "text", { placeholder: "Add location" }),
      h("div", { class: "gc-row" },
        h("button", { class: "gc-create", disabled: !!busy, onclick: async () => {
          if (!d.title.trim()) return;
          const start = `${d.date}T${d.time}`;
          if (!live) {
            const s = new Date(start);
            demoAdded.push({ id: `n${Date.now()}`, title: d.title, location: d.location, start: s.toISOString(), end: new Date(s.getTime() + d.minutes * 6e4).toISOString(), allDay: false });
            draft = null;
            data = null;
            note = "";
            return rerender();
          }
          busy = "add";
          rerender();
          try {
            const r = await T().livePost("calendar/add", { title: d.title, start, minutes: d.minutes, location: d.location });
            if (r.error) throw new Error(r.error);
            draft = null;
            data = null;
            note = "";
          } catch (e) {
            note = e.message || String(e);
          }
          busy = "";
          rerender();
        } }, busy === "add" ? "Adding…" : live ? "Add to Google Calendar" : "Add"),
        h("button", { class: "gc-btn", onclick: () => ((draft = null), rerender()) }, "Cancel")),
      note ? h("div", { class: "gc-err" }, note) : "",
      h("div", { class: "gc-desc muted" }, live ? "Nobody is invited or emailed – it only goes into your calendar." : "Demo: the event stays on this screen."));
  }

  window.TiaCalendar = { view, setRerender: (fn) => (rerender = fn) };
})();

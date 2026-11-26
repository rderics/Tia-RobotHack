// Settings tab: which AI thinks for Tia (order, model, key – test each one), and which apps are connected.
// Keys are saved in .env on the PC Tia runs on, only from that PC (never over the internet), and shown masked.
(function () {
  const T = () => window.tia || {};
  let rerender = () => {};
  let s = null;
  let err = "";
  let order = null;
  const models = {};
  const keys = {};
  const tests = {};
  let saved = "";

  async function load() {
    if (!T().settings) return;
    try {
      s = await T().settings();
      order = s.ai.providers.filter((p) => s.ai.chain.includes(p.id)).sort((a, b) => s.ai.chain.indexOf(a.id) - s.ai.chain.indexOf(b.id)).map((p) => p.id);
      err = "";
    } catch (e) {
      err = e.message || String(e);
    }
    rerender();
  }
  async function test(id) {
    tests[id] = { busy: true };
    rerender();
    try {
      const r = await T().settingsTest(id);
      tests[id] = r.ok ? { ok: true, text: `Works · ${(r.ms / 1000).toFixed(1)} s` } : { ok: false, text: r.error || "didn't answer" };
    } catch (e) {
      tests[id] = { ok: false, text: e.message || String(e) };
    }
    rerender();
  }
  async function save() {
    saved = "Saving…";
    rerender();
    try {
      const r = await T().settingsSave({ order, models, keys });
      if (r.error) throw new Error(r.error);
      saved = "✓ Saved – Tia uses the new order right away.";
      for (const k of Object.keys(keys)) delete keys[k];
      await load();
    } catch (e) {
      saved = `⚠ ${e.message || e}`;
      rerender();
    }
  }

  function view(c) {
    const { h } = c;
    const root = h("div", { class: "st" });
    if (!T().settings) return root.append(h("div", { class: "ch-empty" }, "Settings are on the live Tia (the PC she runs on).")), root;
    if (!s && !err) load();
    if (err) return root.append(h("div", { class: "ch-empty" }, err)), root;
    if (!s) return root.append(h("div", { class: "ch-empty" }, "Loading…")), root;
    const P = Object.fromEntries(s.ai.providers.map((p) => [p.id, p]));
    const edit = s.canEdit;
    const move = (id, d) => {
      const i = order.indexOf(id);
      const j = i + d;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      rerender();
    };
    const keyInput = (envName, ph) => {
      const inp = h("input", { class: "st-in", type: "password", placeholder: s.keys[envName] ? `saved ${s.keys[envName]}` : ph, disabled: !edit, oninput: (e) => (keys[envName] = e.target.value) });
      inp.value = keys[envName] || "";
      return inp;
    };
    // ---- AI brain
    const chain = h("div", { class: "st-list" });
    order.forEach((id, i) => {
      const p = P[id];
      const t = tests[id];
      const mi = h("input", { class: "st-in sm", value: models[id] ?? p.model, disabled: !edit, oninput: (e) => (models[id] = e.target.value) });
      chain.append(h("div", { class: `st-row ${s.ai.now === id ? "now" : ""}` },
        h("div", { class: "st-n" }, i + 1),
        h("div", { class: "st-main" },
          h("div", { class: "st-name" }, p.label, s.ai.now === id ? h("span", { class: "st-badge" }, "thinking now") : "", p.blocked ? h("span", { class: "st-badge warn" }, "resting 10 min (limit or error)") : ""),
          h("div", { class: "st-sub" }, h("label", {}, "Model"), mi),
          t ? h("div", { class: `st-test ${t.ok ? "ok" : t.busy ? "" : "bad"}` }, t.busy ? "Testing…" : t.text) : ""),
        h("div", { class: "st-acts" },
          h("button", { class: "st-btn", onclick: () => test(id) }, "Test"),
          edit ? h("button", { class: "st-btn", title: "Earlier in the order", disabled: i === 0, onclick: () => move(id, -1) }, "↑") : "",
          edit ? h("button", { class: "st-btn", title: "Later in the order", disabled: i === order.length - 1, onclick: () => move(id, 1) }, "↓") : "",
          edit && order.length > 1 ? h("button", { class: "st-btn", title: "Don't use", onclick: () => ((order = order.filter((x) => x !== id)), rerender()) }, "✕") : "")));
    });
    const notUsed = s.ai.providers.filter((p) => !order.includes(p.id) && p.id !== "hermes");
    const add = edit && notUsed.length
      ? h("div", { class: "st-add" }, h("span", {}, "Add:"), ...notUsed.map((p) => h("button", { class: "st-btn", onclick: () => ((order = [...order, p.id]), rerender()) }, `+ ${p.label}`)))
      : "";
    const keysBox = h("div", { class: "st-card" },
      h("div", { class: "st-h" }, "API keys"),
      h("div", { class: "st-desc" }, "Free keys: Groq (console.groq.com/keys), Gemini (aistudio.google.com/apikey), OpenRouter (openrouter.ai/keys). Saved only in .env on this PC."),
      h("div", { class: "st-grid" },
        h("label", {}, "Groq"), keyInput("GROQ_API_KEY", "gsk_…"),
        h("label", {}, "Google Gemini"), keyInput("GEMINI_API_KEY", "AIza…"),
        h("label", {}, "OpenRouter"), keyInput("OPENROUTER_API_KEY", "sk-or-…"),
        h("label", {}, "Claude API"), keyInput("ANTHROPIC_API_KEY", "sk-ant-…"),
        h("label", {}, "Custom API key"), keyInput("TIA_AI_KEY", "key for any OpenAI-compatible API")),
      h("div", { class: "st-grid" },
        h("label", {}, "Custom API address"), (() => {
          const i = h("input", { class: "st-in", placeholder: "https://…/v1", disabled: !edit, oninput: (e) => (keys.TIA_AI_BASE_URL = e.target.value) });
          i.value = keys.TIA_AI_BASE_URL ?? s.custom.baseUrl;
          return i;
        })(),
        h("label", {}, "Custom model"), (() => {
          const i = h("input", { class: "st-in", placeholder: "model name", disabled: !edit, oninput: (e) => (keys.TIA_AI_MODEL = e.target.value) });
          i.value = keys.TIA_AI_MODEL ?? s.custom.model;
          return i;
        })()));
    const conn = s.connections || {};
    const NAMES = { calendar: "Google Calendar", gmail: "Gmail", slack: "Slack", instagram: "Instagram", linkedin: "LinkedIn", ads: "Meta Ads", whatsappBusiness: "WhatsApp Business" };
    const connBox = h("div", { class: "st-card" },
      h("div", { class: "st-h" }, "Connected apps"),
      composioBox(h, s.composio || {}, edit),
      h("div", { class: "st-conn" }, Object.entries(NAMES).filter(([k]) => conn[k] || CONNECTABLE[k]).map(([k, n]) => {
        const st = (conn[k] || {}).state || "missing";
        const canLink = CONNECTABLE[k] && st !== "connected" && (s.composio || {}).loggedIn && edit;
        return h("div", { class: "st-ci" }, h("span", { class: `dot ${st}` }), h("b", {}, n),
          h("span", {}, st === "connected" ? (conn[k] || {}).name || "connected" : st === "pending" ? (conn[k] || {}).name || "waiting" : "not connected"),
          canLink ? h("button", { class: "st-btn", onclick: (e) => connect(k, e.target) }, "Connect") : st === "connected" && CONNECTABLE[k] ? h("span", { class: "st-ok" }, "✓") : "");
      })),
      h("div", { class: "st-desc" }, "Classic Outlook works directly on this PC – just be signed in to classic Outlook. WhatsApp Business comes with the team keys (tia-team.env)."));
    const biz = h("div", { class: "st-card" },
      h("div", { class: "st-h" }, "Business"),
      h("div", { class: "st-kv" }, h("span", {}, "Business"), h("b", {}, s.business.name), h("span", {}, "Owner"), h("b", {}, s.business.owner), h("span", {}, "Vault"), h("b", {}, s.business.vault), h("span", {}, "Phone address"), h("b", {}, s.publicUrl || "this network only")));
    root.append(
      h("div", { class: "st-top" }, h("div", { class: "st-title" }, "Settings"), h("span", { class: "sp" }), edit ? h("button", { class: "st-save", onclick: save }, "Save") : h("span", { class: "st-desc" }, "View only – change settings on the PC Tia runs on"), saved ? h("span", { class: "st-saved" }, saved) : ""),
      h("div", { class: "st-cols" },
        h("div", {},
          h("div", { class: "st-card" },
            h("div", { class: "st-h" }, "Tia's brain"),
            h("div", { class: "st-desc" }, "Tia asks the first AI; if it is busy, out of credit or fails, she moves to the next one by herself. Change the order, the model, or add a free one."),
            chain, add),
          keysBox),
        h("div", {}, biz, connBox)));
    return root;
  }
  const CONNECTABLE = { calendar: 1, gmail: 1, slack: 1, instagram: 1, linkedin: 1, ads: 1 };
  async function connect(app, btn) {
    btn.disabled = true;
    btn.textContent = "Opening…";
    try {
      const r = await T().livePost("link", { app });
      if (r.error || !r.url) throw new Error(r.error || "no link");
      window.open(r.url, "_blank", "noopener");
      btn.textContent = "Sign in there, then ↻";
      btn.disabled = false;
      btn.onclick = () => load();
    } catch (e) {
      btn.textContent = `Failed: ${e.message || e}`;
    }
  }
  function composioBox(h, c, edit) {
    if (c.loggedIn) return h("div", { class: "st-desc" }, `App connections by Composio · signed in as ${c.email}. Press Connect next to an app and allow it in the browser.`);
    if (!c.installed) return h("div", { class: "st-desc warn" }, "Composio (connects Gmail, Calendar, Slack, Instagram, LinkedIn, Meta Ads) isn't installed – run “Update Tia” on the desktop, then come back.");
    return h("div", { class: "st-cbox" },
      h("div", {}, h("b", {}, "Step 1 · Sign in to Composio (free)"), h("div", { class: "st-desc" }, "It connects your apps safely – Tia never sees your passwords. A browser opens: sign in with Google, then come back and press ↻.")),
      edit ? h("button", { class: "st-save", onclick: async (e) => { e.target.textContent = "Browser opened – sign in, then ↻"; await T().composioLogin(); } }, "Sign in to Composio") : "",
      h("button", { class: "st-btn", onclick: () => load() }, "↻"));
  }
  window.TiaSettings = { view, setRerender: (fn) => (rerender = fn), reload: load };
})();

// Channel store: turns Tia's desk (cards) and live events into per-channel conversations for the familiar
// look-alike views (Mail, WhatsApp, Instagram, Slack). Works the same on the live server and the public replay
// (it only needs window.tia.onEvent; window.tia.state is used when it exists).
(function () {
  const CHANNELS = ["email", "whatsapp", "instagram", "slack"];
  const items = new Map(); // id → { id, channel, from, address, subject, text, time, draft, state, summary, reason, urgent, actions[], decision }
  const subs = new Set();
  const emit = (what, id) => subs.forEach((fn) => fn(what, id));

  function fromCard(c) {
    if (c.kind !== "message" || !CHANNELS.includes(c.channel)) return null;
    const o = c.original || {};
    return {
      id: c.id, channel: c.channel, from: c.from, address: o.address || "", subject: o.subject || "", text: o.text || "", time: o.time || c.time || "",
      draft: c.text || "", state: c.state, summary: c.summary || "", reason: c.reason || "", urgent: !!c.urgent, actions: c.actions || [],
      decision: c.decision || (c.state === "open" ? "escalate" : "handle"), sources: c.sources || [], guard: c.guard || [],
    };
  }
  function fromResult(r) {
    const m = r.message || {};
    const p = r.proposal || {};
    if (!CHANNELS.includes(m.channel)) return null;
    return {
      id: m.id, channel: m.channel, from: m.from, address: m.address || "", subject: m.subject || "", text: m.text || "", time: m.time || "",
      draft: p.draft_reply || "", state: r.decision === "handle" && !r.error ? "handled" : "open", summary: p.summary || "", reason: p.reason || "",
      urgent: ["payment_change", "complaint"].includes(p.category), actions: [], decision: r.decision || "", sources: p.vault_sources || [], guard: r.guardNotes || [],
    };
  }
  function put(x) {
    if (!x) return;
    const prev = items.get(x.id);
    items.set(x.id, prev ? { ...prev, ...x, actions: x.actions && x.actions.length ? x.actions : prev.actions } : x);
    emit("item", x.id);
  }

  async function load() {
    if (!window.tia) return;
    if (window.tia.state) {
      try {
        const s = await window.tia.state();
        for (const c of [...(s.needs || []), ...(s.done || [])]) put(fromCard(c));
      } catch {}
    }
    // The demo business's messages are in the apps from the start (state "new" = Tia hasn't sorted them yet),
    // so every app can be clicked and answered before "Start the day".
    if (window.tia.demoInbox) {
      try {
        for (const m of await window.tia.demoInbox()) {
          if (items.has(m.id) || !CHANNELS.includes(m.channel)) continue;
          items.set(m.id, { id: m.id, channel: m.channel, from: m.from, address: m.address || "", subject: m.subject || "", text: m.text || "", time: m.time || "", draft: "", tiaDraft: m.draft || "", state: "new", summary: "", reason: "", urgent: false, actions: [], decision: "", sources: [], guard: [] });
        }
        emit("item");
      } catch {}
    }
  }

  function onEvent(ev) {
    if (ev.type === "start") {
      items.clear();
      emit("reset");
    } else if (ev.type === "result" && ev.result) {
      put(fromResult(ev.result));
      emit("arrived", ev.result.message && ev.result.message.id);
    } else if (ev.type === "decided" && items.has(ev.id)) {
      const x = items.get(ev.id);
      x.state = ev.verdict === "reject" ? "rejected" : ev.verdict === "edit" ? "edited" : "approved";
      emit("item", ev.id);
    } else if (ev.type === "action" && items.has(ev.id)) {
      const x = items.get(ev.id);
      const prev = x.actions.find((a) => a.step === ev.step);
      if (prev) Object.assign(prev, ev);
      else x.actions.push({ ...ev });
      emit("action", ev.id);
    } else if (ev.type === "reset") {
      items.clear();
      emit("reset");
      load();
    }
  }

  window.TiaChannels = window.TiaChannels || {};
  Object.assign(window.TiaChannels, {
    CHANNELS,
    list: (channel) => [...items.values()].filter((x) => x.channel === channel),
    get: (id) => items.get(id),
    subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)),
    load,
    onEvent,
  });
  if (window.tia && window.tia.onEvent) window.tia.onEvent(onEvent);
})();

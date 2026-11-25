// Public replay site: gives the screen the same window.tia functions, but everything runs in the visitor's
// browser. It plays a recorded real Claude run (data/replay.json) through the same Guard as the app.
// No AI calls, no server, nothing sent anywhere. Learning is kept in this browser only.
(function () {
  if (window.tia) return;

  const CFG = { minConfidence: 0.75, approvalsToLearn: 2, minutesSavedPerItem: 4 };
  const KEY = "tia.demo.learning";
  const listeners = [];
  const emit = (ev) => listeners.forEach((fn) => fn(ev));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fresh = () => ({ approvals: {}, edits: {}, rejections: {} });
  let memory = fresh(); // used when the browser blocks storage

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : memory;
    } catch {
      return memory;
    }
  }
  function save(l) {
    memory = l;
    try {
      localStorage.setItem(KEY, JSON.stringify(l));
    } catch {}
  }

  let voiceIndex = null;
  let dataPromise = null;
  function data() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("data/inbox.json").then((r) => r.json()),
        fetch("data/replay.json").then((r) => r.json()),
      ]);
    }
    return dataPromise;
  }

  window.tia = {
    info: async () => ({ provider: "replay", model: "recorded demo", hasReplay: true, today: "Thursday 19 November 2026, 13:00", static: true }),
    run: async () => {
      const [inbox, saved] = await data();
      const learning = load();
      emit({ type: "start", total: inbox.length, mode: "replay" });
      let handled = 0;
      let count = 0;
      for (const message of inbox) {
        const rec = saved[message.id];
        if (!rec) continue;
        count++;
        emit({ type: "thinking", message });
        await sleep(450);
        const guard = window.TiaGuard.applyGuard(rec.proposal, message, learning, CFG);
        if (guard.decision === "handle") handled++;
        emit({ type: "result", result: { message, proposal: rec.proposal, ...guard, replay: true } });
      }
      emit({ type: "done", summary: { handled, needsYou: count - handled, minutesSaved: handled * CFG.minutesSavedPerItem, costUsd: 0 } });
      return { ok: true };
    },
    feedback: async ({ proposal, verdict }) => {
      const l = load();
      const cat = proposal.category;
      if (verdict === "reject") l.rejections[cat] = (l.rejections[cat] || 0) + 1;
      else {
        l.approvals[cat] = (l.approvals[cat] || 0) + 1;
        if (verdict === "edit") l.edits[cat] = (l.edits[cat] || 0) + 1;
      }
      save(l);
      return { approvals: l.approvals[cat] || 0, needed: CFG.approvalsToLearn };
    },
    reset: async () => save(fresh()),
    // Tia's natural voice, pre-recorded at build time (scripts/demo-voice-lines.json). Unknown text → browser voice.
    tts: async (text) => {
      voiceIndex = voiceIndex || fetch("data/voice/index.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
      const file = (await voiceIndex)[text];
      if (!file) return { error: "not recorded" };
      return fetch(`data/voice/${file}`).then((r) => r.json());
    },
    onEvent: (fn) => listeners.push(fn),
  };
})();

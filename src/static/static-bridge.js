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
  let vaultPromise = null;
  const localEdits = {};
  const vault = () => (vaultPromise = vaultPromise || fetch("data/vault.json").then((r) => r.json()));
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
    // Business vault tab: the fictional demo vault, shipped as one file (data/vault.json); edits stay in this browser
    vaultTree: async () => {
      const v = await vault();
      return { notes: v.notes.map((n) => ({ path: n.path, name: n.path.split("/").pop().replace(/\.md$/, ""), folder: n.path.includes("/") ? n.path.slice(0, n.path.lastIndexOf("/")) : "" })), editable: true, name: "Business vault TIA" };
    },
    vaultNote: async (p) => {
      const v = await vault();
      const n = v.notes.find((x) => x.path === p);
      if (!n) throw new Error("note not found");
      return { path: p, text: localEdits[p] !== undefined ? localEdits[p] : n.text, editable: true };
    },
    vaultSearch: async (q) => {
      const v = await vault();
      const words = String(q).toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      return v.notes
        .map((n) => ({ n, score: words.reduce((s, w) => s + (n.text.toLowerCase().split(w).length - 1) + (n.path.toLowerCase().includes(w) ? 5 : 0), 0) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(({ n, score }) => ({ path: n.path, name: n.path.split("/").pop().replace(/\.md$/, ""), section: "", snippet: n.text.replace(/^---[\s\S]*?---/, "").replace(/\s+/g, " ").slice(0, 160), score }));
    },
    vaultGraph: async () => (await vault()).graph,
    vaultSave: async (p, text) => ((localEdits[p] = text), { ok: true }),
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

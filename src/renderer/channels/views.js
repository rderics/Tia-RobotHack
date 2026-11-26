// Familiar channel views for Tia: Mail (Outlook-style), WhatsApp, Instagram DMs, Slack, Leads.
// Works both ways: Tia opens the tab and types her draft while she works ("Follow Tia"), or the owner opens a tab
// and works there himself – edit the draft or write his own, and Tia makes the real draft (Outlook / WhatsApp).
// Nothing is ever sent by Tia. Data comes from channels/store.js.
(function () {
  const S = window.TiaChannels;
  if (!S) return;
  const $ = (id) => document.getElementById(id);
  const h = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k === "style") n.style.cssText = v; // CSSOM – allowed by the page's CSP (style attributes are not)
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  };
  const ICON = {
    tia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg>',
    slack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
    leads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/></svg>',
    ads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    docs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/></svg>',
    vault: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="17" r="2.6"/><path d="M8 8l2.6 7M16.3 7.6l-3 7.2M8.2 6.8l7.6-.6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>',
  };
  const TABS = [
    ["tia", "Tia"],
    ["email", "Mail"],
    ["calendar", "Calendar"],
    ["whatsapp", "WhatsApp"],
    ["instagram", "Instagram"],
    ["slack", "Slack"],
    ["linkedin", "LinkedIn"],
    ["ads", "Ads"],
    ["docs", "Docs"],
    ["leads", "Leads"],
    ["vault", "Vault"],
    ["settings", "Settings"],
  ];
  const COLORS = ["#4F6BED", "#C239B3", "#E3008C", "#038387", "#CA5010", "#8764B8", "#498205", "#0078D4", "#986F0B", "#D13438"];
  const color = (s) => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const initials = (s) => String(s || "?").replace(/[@#]/g, "").split(/[\s._–-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const avatar = (name, cls = "av") => {
    const n = h("div", { class: cls }, initials(name));
    n.style.background = color(name);
    return n;
  };

  let tab = "tia";
  let follow = true;
  const sel = {}; // channel → selected id
  const typing = {}; // id → true while Tia "types" the draft into the composer
  const userEdited = {}; // id → text the owner typed himself
  let rail;
  let view;
  let pip;

  // ---------- frame: app rail, view area, Tia picture-in-picture ----------
  function build() {
    document.body.classList.add("has-rail");
    rail = h("nav", { class: "apprail", "aria-label": "Apps" });
    for (const [key, label] of TABS) {
      const b = h("button", { "data-tab": key, title: label, onclick: () => showTab(key, { byUser: true }) });
      b.innerHTML = ICON[key] + `<span>${label}</span>`;
      rail.append(b);
    }
    const f = h("button", { class: "follow on", title: "When on, Tia opens the right app herself while she works", onclick: () => setFollow(!follow) }, "Follow Tia");
    rail.append(f);
    view = h("div", { class: "chview", hidden: true });
    pip = h("div", { class: "tia-pip", hidden: true }, h("div", { class: "pipbox", id: "pipBox" }), h("div", { class: "pipcap" }, h("b", {}, "Tia"), h("span", { id: "pipText" }, "")));
    document.body.append(rail, view, pip);
    // mirror Tia's caption and "talking" state into the PiP
    const sync = () => {
      $("pipText").textContent = ($("speechText") && $("speechText").textContent) || "";
      pip.classList.toggle("talking", !!($("stage") && $("stage").classList.contains("talking")));
    };
    if ($("speechText")) new MutationObserver(sync).observe($("speechText"), { childList: true, characterData: true, subtree: true });
    if ($("stage")) new MutationObserver(sync).observe($("stage"), { attributes: true, attributeFilter: ["class"] });
    setTab("tia");
  }
  function setFollow(on) {
    follow = on;
    rail.querySelector(".follow").classList.toggle("on", on);
  }
  function badges() {
    for (const [key] of TABS) {
      if (!S.CHANNELS.includes(key)) continue;
      const b = rail.querySelector(`[data-tab="${key}"]`);
      const n = S.list(key).filter((x) => x.state === "open").length;
      let el = b.querySelector(".badge");
      if (n && !el) b.append((el = h("span", { class: "badge" })));
      if (el) n ? (el.textContent = n) : el.remove();
    }
  }
  function moveAvatar(toPip) {
    const box = $("avatarBox");
    if (!box) return;
    if (toPip && box.parentElement !== $("pipBox")) $("pipBox").append(box);
    if (!toPip && box.parentElement !== $("stage")) $("stage").prepend(box);
  }
  function setTab(key) {
    tab = key;
    rail.querySelectorAll("button[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === key));
    const inChannel = key !== "tia";
    for (const [k] of TABS) document.body.classList.toggle(`tab-${k}`, key === k);
    if (key === "settings" && window.TiaSettings) window.TiaSettings.reload();
    view.hidden = !inChannel;
    pip.hidden = !inChannel;
    moveAvatar(inChannel);
    if (inChannel) render();
  }
  function showTab(key, { byUser = false } = {}) {
    if (byUser && key !== "tia" && follow && document.body.classList.contains("running")) setFollow(false); // owner takes over
    setTab(key);
  }

  // ---------- actions (same desk as everywhere: the phone sees it too) ----------
  // A demo message Tia hasn't sorted yet ("new"): the owner answers it himself or with Tia's help,
  // and the real action runs – Outlook opens and types the draft, WhatsApp opens with the text.
  async function demoReply(x, text) {
    const body = String(text || "").trim();
    if (!body) return alert("Write a reply first – or press “Let Tia write”.");
    x.draft = body;
    userEdited[x.id] = undefined;
    const done = (detail) => ((x.state = "edited"), (x.actions = [{ step: "draft", status: "done", detail }]), render());
    if (x.channel === "instagram" || x.channel === "slack") {
      try {
        await navigator.clipboard.writeText(body);
      } catch {}
      return done(`Copied – paste it in ${x.channel === "slack" ? "Slack" : "Instagram"}. Tia never posts by herself.`);
    }
    if (!window.tia.demoAct) return done(x.channel === "email" ? "On the live Tia: Outlook opens and the reply is typed in – you press Send." : "On the live Tia: WhatsApp opens with the reply typed – you press send.");
    x.actions = [{ step: "draft", status: "start", detail: x.channel === "email" ? "Opening Outlook and typing the reply…" : "Opening WhatsApp with the text…" }];
    render();
    try {
      const r = await window.tia.demoAct({ channel: x.channel, to: x.address, subject: x.subject ? `Re: ${x.subject.replace(/^re:\s*/i, "")}` : "", text: body });
      if (r && r.error) throw new Error(r.error);
      x.state = "edited";
      x.actions = ((r && r.steps) || []).filter((s) => s.detail).map((s) => ({ ...s }));
      if (!x.actions.length) x.actions = [{ step: "draft", status: "done", detail: "Done – you press Send." }];
    } catch (e) {
      x.actions = [{ step: "draft", status: "error", detail: e.message || String(e) }];
    }
    render();
  }
  async function decide(x, text) {
    if (x.state === "new") return demoReply(x, text);
    const changed = text !== undefined && text.trim() && text.trim() !== (x.draft || "").trim();
    if (!window.tia.decide) {
      // public replay (no server): show what the live Tia does, without doing it
      x.state = changed ? "edited" : "approved";
      x.actions = [{ step: "demo", status: "done", detail: x.channel === "email" ? "On the live Tia: Outlook opens and the reply is typed in – you press Send." : x.channel === "whatsapp" ? "On the live Tia: WhatsApp opens with the reply typed – you press send." : "On the live Tia: the reply is ready to paste – Tia never posts herself." }];
      if (changed) x.draft = text;
      return render();
    }
    try {
      await window.tia.decide(x.id, changed ? "edit" : "approve", changed ? text : undefined);
    } catch (e) {
      alert(e.message || e);
    }
  }
  async function reject(x) {
    if (x.state === "new") return ((x.state = "rejected"), render());
    if (!window.tia.decide) return ((x.state = "rejected"), render());
    try {
      await window.tia.decide(x.id, "reject");
    } catch {}
  }
  function typeDraft(x, textarea, onDone) {
    if (!x.draft && x.tiaDraft) x.draft = x.tiaDraft; // the demo's recorded answer – instant
    if (!x.draft && !x.live) {
      // ask Tia now (live server): she answers from the business vault
      if (!window.tia.livePost) return (textarea.placeholder = "Tia writes replies on the live Tia – here press “Start the day” on the Tia tab.");
      textarea.value = "";
      textarea.placeholder = "Tia is writing…";
      window.tia
        .livePost("suggest", { app: x.channel === "email" ? "gmail" : x.channel, vault: true, from: x.from, address: x.address, subject: x.subject, text: x.text })
        .then((r) => {
          if (r.error) throw new Error(r.error);
          if (r.skip) return (textarea.placeholder = `Tia: no reply needed – ${r.skip}`);
          x.draft = r.text;
          typeDraft(x, textarea, onDone);
        })
        .catch((e) => (textarea.placeholder = `Tia couldn't write it: ${e.message || e}`));
      return;
    }
    typing[x.id] = true;
    const words = (x.draft || "").split(/(\s+)/);
    let i = 0;
    textarea.value = "";
    textarea.classList.add("typing-caret");
    const step = () => {
      if (!typing[x.id] || document.activeElement === textarea) return finish(); // owner clicked in → stop typing
      textarea.value += words.slice(i, i + 3).join("");
      textarea.scrollTop = textarea.scrollHeight;
      i += 3;
      if (i < words.length) setTimeout(step, 45);
      else finish();
    };
    const finish = () => {
      typing[x.id] = false;
      textarea.value = userEdited[x.id] !== undefined ? userEdited[x.id] : x.draft || "";
      textarea.classList.remove("typing-caret");
      onDone && onDone();
    };
    setTimeout(step, 250);
  }
  const stepsView = (x) =>
    x.actions && x.actions.length
      ? h("div", { class: "tia-steps" }, x.actions.map((a) => h("div", { class: a.status === "error" ? "err" : "" }, `${a.status === "done" ? "✓" : a.status === "error" ? "⚠" : "…"} ${a.detail}`)))
      : ""; // "" not null – DOM append() would print "null"
  const chip = (x) =>
    (x.live && x.state === "open") || x.state === "new"
      ? "" // the owner's real mail / a demo message not sorted yet: no chip until there is a draft
      : x.state === "open" ? h("span", { class: "tia-chip needs" }, "Needs you") : ["approved", "edited"].includes(x.state) ? h("span", { class: "tia-chip draft" }, "Draft made") : x.state === "rejected" ? h("span", { class: "tia-chip" }, "Skipped") : h("span", { class: "tia-chip done" }, "Handled by Tia");
  const composerValue = (x) => (userEdited[x.id] !== undefined ? userEdited[x.id] : x.draft || "");

  // ---------- views ----------
  function render() {
    badges();
    if (tab === "tia") return;
    view.innerHTML = "";
    if (tab === "leads") return view.append(leadsView());
    if (tab === "docs") return window.TiaDocs ? view.append(window.TiaDocs.view(baseCtx())) : null;
    if (tab === "vault") return window.TiaVault ? view.append(window.TiaVault.el()) : view.append(h("div", { class: "ch-empty" }, "Vault view not loaded."));
    const L = window.TiaLive;
    const LABEL = { calendar: "Google Calendar", email: "Gmail", slack: "Slack", instagram: "Instagram", whatsapp: "WhatsApp", linkedin: "LinkedIn", ads: "Meta Ads" };
    // While Tia runs the stand demo with "Follow Tia" on, the apps show the demo business she is working on
    const live = L && L.isLive(tab) && !(follow && document.body.classList.contains("running"));
    if (L && LABEL[tab]) view.append(L.switcher(h, tab, LABEL[tab]));
    if (tab === "settings") return window.TiaSettings ? view.append(window.TiaSettings.view(baseCtx())) : null;
    if (tab === "calendar") return window.TiaCalendar ? view.append(window.TiaCalendar.view(baseCtx())) : null;
    if (L && (tab === "linkedin" || tab === "ads" || (live && (tab === "instagram" || tab === "whatsapp")))) return view.append(L.views[tab](baseCtx()));
    const items = (live ? L.items(tab) : S.list(tab)).sort((a, b) => (a.placeholder ? -1 : b.placeholder ? 1 : String(b.received || b.time).localeCompare(String(a.received || a.time))));
    if (!sel[tab] || !items.find((x) => x.id === sel[tab])) sel[tab] = items[0] && items[0].id;
    const x = items.find((i) => i.id === sel[tab]);
    const A = window.TiaApps; // high-fidelity look-alikes (channels/apps.js); the simpler views below are the fallback
    if (A) {
      const ctx = live ? L.ctxFor(tab, baseCtx()) : baseCtx();
      view.append({ email: A.mail, whatsapp: A.wa, instagram: A.ig, slack: A.slack }[tab](ctx, items, x));
    } else view.append({ email: mailView, whatsapp: waView, instagram: igView, slack: slackView }[tab](items, x));
  }
  function baseCtx() {
    {
      return {
        h, avatar, chip, steps: stepsView, decide, reject, typeDraft, composerValue, userEdited, render,
        select: (id) => ((sel[tab] = id), render()),
        // New mail (Outlook look-alike): Tia writes it from a few words; Save draft = Outlook draft typed in
        writeNew: async ({ to, subject, notes }) => {
          if (!window.tia.livePost) throw new Error("Tia writes new mails on the live Tia.");
          const r = await window.tia.livePost("suggest", { mode: "compose", vault: true, to, subject, text: notes });
          if (r.error) throw new Error(r.error);
          return r;
        },
        sendNew: async ({ channel, to, subject, text }) => {
          if (!window.tia.demoAct) throw new Error("On the live Tia this opens Outlook and types the mail in.");
          const r = await window.tia.demoAct({ channel, to, subject, text });
          if (r.error) throw new Error(r.error);
          const last = (r.steps || []).filter((s) => s.detail).pop();
          return { detail: last ? last.detail : "Draft saved – you press Send." };
        },
        pendingFor: (id) => (follow && pendingType === id ? ((pendingType = null), true) : false),
        textarea: (x2, placeholder) => {
          const c2 = chatCompose(x2);
          c2.ta.placeholder = placeholder;
          return c2.ta;
        },
      };
    }
  }

  let mailFolder = "inbox";
  function mailView(items, x) {
    const folders = [
      ["inbox", "Inbox", items.length],
      ["needs", "Needs you (Tia)", items.filter((i) => i.state === "open").length],
      ["handled", "Handled by Tia", items.filter((i) => i.state === "handled").length],
      ["drafts", "Drafts", items.filter((i) => ["approved", "edited"].includes(i.state)).length],
      ["sent", "Sent", 0],
    ];
    const shown = items.filter((i) => ({ inbox: true, needs: i.state === "open", handled: i.state === "handled", drafts: ["approved", "edited"].includes(i.state), sent: false })[mailFolder]);
    const list = h("div", { class: "mail-list" }, h("div", { class: "hd" }, h("span", { class: "on" }, "Focused"), h("span", {}, "Other")));
    for (const i of shown) {
      list.append(
        h("div", { class: `mrow ${i.state === "open" ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => ((sel.email = i.id), render()) },
          h("div", { class: "mbar" }), h("div", { class: "who" }, i.from), h("div", { class: "time" }, i.time),
          h("div", { class: "subj" }, i.subject || "(no subject)"), h("div", { class: "prev" }, chip(i), h("span", {}, i.text.slice(0, 80))))
      );
    }
    if (!shown.length) list.append(h("div", { class: "ch-empty" }, mailFolder === "sent" ? "Tia never sends – your drafts wait in Drafts." : "Nothing here."));
    const read = h("div", { class: "mail-read" });
    if (x) {
      read.append(h("h2", {}, x.subject || "(no subject)"), h("div", { class: "mail-from" }, avatar(x.from), h("div", {}, h("div", { class: "n" }, x.from), h("div", { class: "a" }, `<${x.address}> · ${x.time}`))), h("div", { class: "mail-text" }, x.text));
      if (x.draft) {
        const ta = h("textarea", { "aria-label": "Reply", oninput: (e) => (userEdited[x.id] = e.target.value) });
        ta.value = composerValue(x);
        const open = x.state === "open" || x.state === "new" || (x.live && x.state === "edited");
        const box = h("div", { class: "mail-tia" },
          h("div", { class: "top" }, chip(x), h("span", {}, open ? "Tia drafted a reply – edit it or use it" : x.state === "handled" ? "Tia handled this with the reply below" : "Draft made in Outlook")),
          x.reason ? h("div", { class: "why" }, `Why: ${x.reason}`) : null,
          ta,
          h("div", { class: "mt-actions" },
            h("button", { class: "mbtn primary", disabled: !open, onclick: () => decide(x, ta.value) }, "Open in Outlook as draft"),
            h("button", { class: "mbtn", disabled: !open, onclick: () => ((userEdited[x.id] = x.draft), typeDraft(x, ta)) }, "Let Tia write it"),
            h("button", { class: "mbtn", disabled: !open, onclick: () => reject(x) }, "Don't reply"),
            h("span", { class: "note" }, "Tia never sends – you press Send in Outlook")),
          stepsView(x));
        read.append(box);
        if (follow && pendingType === x.id) ((pendingType = null), typeDraft(x, ta));
      }
    } else read.append(h("div", { class: "ch-empty" }, "No mail yet – press “Start the day” on the Tia tab."));
    const fold = h("div", { class: "mail-folders" }, h("button", { class: "mail-new", onclick: () => alert("New mail: ask Tia on the Tia tab – e.g. “Write to Ieva about the worktop”.") }, "New mail"), h("div", { class: "sec" }, "info@oakline-studio"));
    for (const [k, label, n] of folders) fold.append(h("div", { class: `f ${mailFolder === k ? "on" : ""}`, onclick: () => ((mailFolder = k), render()) }, h("span", {}, label), n ? h("span", { class: "n" }, n) : ""));
    return h("div", { class: "mail" }, h("div", { class: "mail-top" }, h("div", { class: "app" }, "Mail"), h("div", { class: "search" }, "Search"), h("div", { class: "me" }, "MO")), h("div", { class: "mail-body" }, fold, list, read));
  }

  function chatCompose(x, cls, sendLabel) {
    if (!x) return null;
    const open = x.state === "open" || x.state === "new" || (x.live && x.state === "edited");
    const ta = h("textarea", { rows: 1, placeholder: "Type a message", oninput: (e) => (userEdited[x.id] = e.target.value) });
    ta.value = open ? composerValue(x) : "";
    const fit = () => (ta.rows = Math.min(7, Math.max(2, ta.value.split("\n").length + Math.floor(ta.value.length / 90)))); // grow with the draft
    fit();
    ta.addEventListener("input", fit);
    if (follow && pendingType === x.id) ((pendingType = null), setTimeout(() => typeDraft(x, ta), 50));
    return { ta, open };
  }

  function waView(items, x) {
    const list = h("div", { class: "wa-list" });
    for (const i of items) {
      list.append(h("div", { class: `wa-row ${i.state === "open" ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => ((sel.whatsapp = i.id), render()) },
        avatar(i.from), h("div", { class: "mid" }, h("div", { class: "l1" }, h("span", { class: "nm" }, i.from), h("span", { class: "tm" }, i.time)),
          h("div", { class: "l2" }, h("span", {}, i.text), i.state === "open" ? h("span", { class: "cnt" }, "1") : null))));
    }
    const main = h("div", { class: "wa-main" });
    if (x) {
      const c = chatCompose(x);
      const msgs = h("div", { class: "wa-msgs" }, h("div", { class: "wa-day" }, "TODAY"), h("div", { class: "bub in" }, x.text, h("span", { class: "t" }, x.time)));
      if (!c.open && x.draft) msgs.append(h("div", { class: "bub out draft" }, h("span", { class: "lbl" }, x.state === "handled" ? "Tia (handled)" : "Tia – draft"), x.draft));
      main.append(h("div", { class: "wa-chathead" }, avatar(x.from), h("div", {}, h("div", {}, x.from), h("div", { class: "s" }, x.address))), msgs);
      if (c.open) {
        main.append(h("div", { class: "wa-hint" }, `Tia's draft is in the box – change it or press send: WhatsApp opens with the text, you press send.`), stepsView(x));
        main.append(h("div", { class: "wa-compose" }, c.ta, h("button", { class: "wa-send", title: "Open in WhatsApp", html: ICON.send, onclick: () => decide(x, c.ta.value) })));
      } else main.append(h("div", { class: "wa-hint" }, chip(x)), stepsView(x));
    } else main.append(h("div", { class: "ch-empty" }, "No chats yet."));
    return h("div", { class: "wa" }, h("div", { class: "wa-side" }, h("div", { class: "wa-head" }, "Chats"), h("div", { class: "wa-search" }, h("div", {}, "Search")), h("div", { class: "wa-filters" }, h("span", { class: "on" }, "All"), h("span", {}, "Unread"), h("span", {}, "Groups")), list), main);
  }

  function igView(items, x) {
    const list = h("div", { class: "ig-list" });
    for (const i of items) {
      list.append(h("div", { class: `ig-row ${i.state === "open" ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => ((sel.instagram = i.id), render()) },
        h("div", { class: "ring" }, avatar(i.from)), h("div", { class: "ig-txt" }, h("div", { class: "nm" }, i.from), h("div", { class: "pv" }, `${i.text.slice(0, 40)} · ${i.time}`)), i.state === "open" ? h("span", { class: "dot" }) : null));
    }
    const main = h("div", { class: "ig-main" });
    if (x) {
      const c = chatCompose(x);
      const msgs = h("div", { class: "ig-msgs" }, h("div", { class: "igb in" }, x.text));
      if (!c.open && x.draft) msgs.append(h("div", { class: "igb draft" }, h("span", { class: "lbl" }, x.state === "handled" ? "Tia (handled)" : "Tia – draft"), x.draft));
      main.append(h("div", { class: "ig-head" }, avatar(x.from), x.from), msgs, stepsView(x));
      if (c.open) main.append(h("div", { class: "ig-compose" }, c.ta, h("button", { onclick: () => decide(x, c.ta.value) }, "Send")));
      else main.append(h("div", { class: "ig-status" }, chip(x)));
    } else main.append(h("div", { class: "ch-empty" }, "Your messages"));
    return h("div", { class: "ig" }, h("div", { class: "ig-nav" }, h("i", {}), h("i", { class: "round" }), h("i", {}), h("i", { class: "on round" })), h("div", { class: "ig-side" }, h("div", { class: "ig-me" }, "oakline.studio"), h("div", { class: "ig-tabs" }, h("span", {}, "Messages"), h("span", {}, "Requests")), list), main);
  }

  function slackView(items, x) {
    const chans = {};
    for (const i of items) (chans[i.address || "#general"] = chans[i.address || "#general"] || []).push(i);
    if (x && !chans[x.address]) x = items[0];
    const side = h("div", { class: "sl-side" }, h("div", { class: "sl-ws" }, "Oakline Studio"), h("div", { class: "sl-sec" }, "▾ Channels"));
    for (const [name, list] of Object.entries(chans)) {
      const open = list.filter((i) => i.state === "open").length;
      side.append(h("div", { class: `sl-ch ${open ? "unread" : ""} ${x && x.address === name ? "on" : ""}`, onclick: () => ((sel.slack = list[list.length - 1].id), render()) }, h("span", {}, name), open ? h("span", { class: "cnt" }, open) : ""));
    }
    side.append(h("div", { class: "sl-sec" }, "▾ Direct messages"), h("div", { class: "sl-ch" }, "Tia (assistant)"), h("div", { class: "sl-ch" }, "Elīna Zariņa"), h("div", { class: "sl-ch" }, "Kaspars Liepiņš"));
    const main = h("div", { class: "sl-main" });
    if (x) {
      const msgs = h("div", { class: "sl-msgs" });
      for (const i of chans[x.address]) {
        msgs.append(h("div", { class: "sl-msg", onclick: () => ((sel.slack = i.id), render()) }, avatar(i.from), h("div", {}, h("span", { class: "nm" }, i.from), h("span", { class: "tm" }, i.time), h("div", { class: "tx" }, i.text))));
        if (i.state !== "open" && i.draft) msgs.append(h("div", { class: "sl-msg draft" }, avatar("Tia"), h("div", {}, h("span", { class: "nm" }, "Tia"), h("span", { class: "tm" }, i.state === "handled" ? "handled" : "draft"), h("div", { class: "tx" }, i.draft))));
      }
      const c = chatCompose(x);
      main.append(h("div", { class: "sl-head" }, x.address), msgs, stepsView(x));
      if (c.open) main.append(h("div", { class: "sl-compose" }, h("div", { class: "fmt" }, h("b", {}, "B"), h("i", {}, "I"), h("s", {}, "S"), h("span", {}, "🔗")), c.ta, h("div", { class: "act" }, h("button", { class: "ghost", onclick: () => reject(x) }, "Not now"), h("button", { onclick: () => decide(x, c.ta.value) }, "Use Tia's reply"))));
    } else main.append(h("div", { class: "ch-empty" }, "No messages yet."));
    return h("div", { class: "sl" }, h("div", { class: "sl-top" }, h("div", {}, "Search Oakline Studio")), h("div", { class: "sl-body" }, side, main));
  }

  function leadsView() {
    const live = !!(window.tia && window.tia.state);
    if (!live) return h("div", { class: "ch-empty" }, "The lead finder runs on the live Tia: ask her “Find architects in Riga who could send us clients” – rows appear in your Google Sheet.");
    return h("iframe", { src: "crm", class: "leads-frame", title: "Leads" });
  }

  // ---------- Tia works: open the right tab and type the draft ----------
  let pendingType = null;
  let renderTimer = null;
  const soon = () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 60);
  };
  S.subscribe((what, id) => {
    if (what === "arrived") return soon(); // the tab switch happens when the main screen starts reading it (tia:reading)
    if (what === "reset") for (const k of Object.keys(userEdited)) delete userEdited[k];
    if (typing[id] && what === "item") return; // don't wipe the box while Tia is typing
    soon();
  });
  // Follow Tia: open the message's app when the main screen starts reading it, then type her draft into the composer
  window.addEventListener("tia:reading", (e) => {
    const x = S.get(e.detail);
    if (!follow || !x) return;
    sel[x.channel] = x.id;
    if (x.channel === "email") mailFolder = "inbox";
    pendingType = x.draft ? x.id : null;
    setTab(x.channel);
  });
  if (window.tia && window.tia.onEvent)
    window.tia.onEvent((ev) => {
      if (ev.type === "start") document.body.classList.add("running");
      if (ev.type === "done" || ev.type === "error") {
        document.body.classList.remove("running");
        if (follow) setTimeout(() => setTab("tia"), 2500); // back to Tia for her summary
      }
    });

  build();
  if (window.TiaSettings) window.TiaSettings.setRerender(() => (tab === "settings" ? render() : null));
  if (window.TiaCalendar) window.TiaCalendar.setRerender(() => (tab === "calendar" ? render() : null));
  if (window.TiaDocs) window.TiaDocs.setRerender(() => (tab === "docs" ? render() : null));
  if (window.TiaLive) window.TiaLive.setRerender(() => (tab !== "tia" ? render() : null));
  S.load().then(render);
  window.TiaChannels.showTab = showTab;
})();

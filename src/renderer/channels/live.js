// The owner's real accounts in the familiar views (Composio, read + draft only) and the new Ads / LinkedIn tabs.
// Each app tab has a switch: "Oakline Studio · demo" (the stand story) or "My account · live" (the owner's own data).
// The owner edits everything on the screen: replies, posts, captions and Tia's improved ads. Saving makes a draft –
// a real Gmail draft, or a Tia draft for apps without drafts. Tia never sends, posts or changes a live ad.
(function () {
  const T = () => window.tia || {};
  const canLive = () => !!T().live;
  const I = (n) => (window.TiaApps ? window.TiaApps.I(n) : document.createElement("span"));
  const D = () => window.TiaDemoData || {};
  const img = (u) => (u && T().liveImg ? T().liveImg(u) : "");
  const eur = (v, cur = "EUR") => (v === null || v === undefined ? "—" : `${Number(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur === "EUR" ? "€" : cur}`);
  const n0 = (v) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-GB"));
  const pct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(2)}%`);

  let rerender = () => {};
  const LIVE_TABS = ["calendar", "email", "slack", "instagram", "whatsapp", "linkedin", "ads"];
  const mode = {};
  for (const t of LIVE_TABS) {
    let saved = null;
    try {
      saved = localStorage.getItem(`tia.src.${t}`);
    } catch {}
    mode[t] = saved || (["linkedin", "ads", "calendar"].includes(t) ? "live" : "demo");
  }
  const isLive = (tab) => canLive() && mode[tab] === "live";

  // ---------- data from the server (cached in memory; refresh button re-reads the app) ----------
  const store = {}; // what → { data, err, loading }
  function load(what, fresh) {
    const s = (store[what] = store[what] || {});
    if (s.loading || (!fresh && (s.data || s.err))) return s;
    s.loading = true;
    T()
      .live(what, fresh)
      .then((d) => {
        if (d && d.error && !d.stale) throw new Error(d.error);
        s.data = d;
        s.err = null;
      })
      .catch((e) => (s.err = e.message || String(e)))
      .finally(() => ((s.loading = false), rerender()));
    return s;
  }
  let drafts = {};
  const loadDrafts = () => (canLive() ? T().live("drafts").then((d) => ((drafts = d || {}), rerender())).catch(() => {}) : null);
  const localDrafts = () => {
    try {
      return JSON.parse(localStorage.getItem("tia.demo.drafts") || "{}");
    } catch {
      return {};
    }
  };
  async function saveDraft(body) {
    if (canLive()) {
      const r = await T().livePost("draft", body);
      if (r && r.error) throw new Error(r.error);
      drafts[body.id] = r;
      return r;
    }
    const all = localDrafts();
    all[body.id] = { ...body, savedAt: new Date().toISOString(), where: "this browser (demo)" };
    try {
      localStorage.setItem("tia.demo.drafts", JSON.stringify(all));
    } catch {}
    return all[body.id];
  }
  const draftOf = (id) => (canLive() ? drafts[id] : localDrafts()[id]);

  // ---------- the source switch on top of every app ----------
  function switcher(h, tab, label) {
    const st = canLive() ? load("status") : {};
    const appKey = tab === "email" ? "gmail" : tab;
    const wa = tab === "whatsapp" && canLive() ? load("whatsapp").data : null; // WhatsApp comes by Meta webhook, not Composio
    const s = wa ? { state: wa.lastEvent ? "connected" : "pending", name: "Meta webhook" } : st.data && st.data[appKey];
    const live = isLive(tab);
    const set = (m) => {
      mode[tab] = m;
      try {
        localStorage.setItem(`tia.src.${tab}`, m);
      } catch {}
      rerender();
    };
    const liveBtn = h("button", { class: live ? "on" : "", disabled: !canLive(), title: canLive() ? (s ? `Composio: ${s.state}${s.name ? ` · ${s.name}` : ""}` : "") : "Your own accounts show on the live Tia (this is the public demo)", onclick: () => set("live") },
      h("span", { class: `dot ${s ? s.state : ""}` }), `My ${label} · live`);
    const box = h("div", { class: "src-sw" }, h("button", { class: live ? "" : "on", onclick: () => set("demo") }, "Oakline Studio · demo"), liveBtn);
    if (live) box.append(h("button", { class: "rf", title: "Read again from the app", onclick: () => (load(tab === "email" ? "gmail" : tab, true), rerender()) }, "↻"));
    return box;
  }
  const notice = (h, tab, s, what) => {
    if (s.loading && !s.data) return h("div", { class: "lv-wait" }, h("div", { class: "spin" }), `Tia is reading your ${what}…`);
    if (s.err && !s.data) return h("div", { class: "lv-wait err" }, `Couldn't read your ${what}: ${s.err}`, h("small", {}, "Check the account in Composio (composio connections list) or switch to the demo."));
    return null;
  };

  // ---------- live Mail (Gmail) and Slack as items for the Outlook / Slack look-alikes ----------
  const suggestions = {}; // id → Tia's text
  const skipped = {};
  function asItem(m) {
    const d = draftOf(m.id);
    const x = { ...m, channel: m.live === "gmail" ? "email" : m.channel, draft: suggestions[m.id] || (d && d.text) || "", state: skipped[m.id] ? "rejected" : d ? "edited" : "open", actions: [], reason: "", summary: "" };
    if (d) x.actions = [{ step: "draft", status: "done", detail: `Saved – ${d.where}${d.link ? ". Open it there to send." : ""}` }];
    return x;
  }
  function items(tab) {
    if (tab === "email") {
      const s = load("gmail");
      return (s.data && s.data.items ? s.data.items : []).map(asItem);
    }
    if (tab === "slack") {
      const s = load("slack");
      if (!s.data) return [];
      const msgs = s.data.items.map((m) => asItem(m));
      // one "new message" item per channel = the composer target
      const blanks = s.data.channels.map((c) => {
        const id = `slk_${c.id}`;
        const d = draftOf(id);
        return { id, live: "slack", channel: "slack", placeholder: true, address: c.name, channelId: c.id, from: "", text: "", time: "", state: "open", draft: suggestions[id] || (d && d.text) || "", actions: d ? [{ step: "draft", status: "done", detail: `Saved in Tia drafts ${new Date(d.savedAt).toTimeString().slice(0, 5)} – open Slack to post it` }] : [], reason: "" };
      });
      return [...blanks, ...msgs];
    }
    return [];
  }
  function acct(tab) {
    if (tab === "email") {
      const a = (store.gmail && store.gmail.data && store.gmail.data.account) || "your Gmail";
      return { live: true, box: a, from: a, me: a, initials: a.slice(0, 2).toUpperCase(), draftWhere: "Gmail", banner: "Write your reply here, or let Tia write it. “Save draft” puts it in Gmail → Drafts.", savedBanner: "Saved in Gmail → Drafts – open Gmail to send it.", note: "Tia never sends – you press Send in Gmail." };
    }
    if (tab === "slack") {
      const s = store.slack && store.slack.data;
      return { live: true, ws: (s && s.workspace) || "Your Slack", initials: "ME", channels: s ? s.channels : [], banner: "Write here or let Tia write it. Saved messages wait in Tia – you post them in Slack. Tia never posts by herself." };
    }
    if (tab === "whatsapp") {
      const can = store.whatsapp && store.whatsapp.data && store.whatsapp.data.canSend;
      return { live: true, banner: can ? "Tia drafted this the moment the message came in – edit it if you like, then ✈ sends it from the business number. Nothing goes out without your tap." : "Tia drafted this the moment the message came in – edit it, then ✈ saves it and copies it for you to send." };
    }
    return null;
  }
  // actions for live items (views.js calls these instead of the desk's decide/reject)
  function ctxFor(tab, base) {
    return {
      ...base,
      acct: acct(tab),
      decide: async (x, text) => {
        const body = { app: x.live, id: x.id, text: text !== undefined ? text : x.draft, to: x.address, subject: x.subject, threadId: x.threadId };
        if (x.live === "slack") {
          const s = store.slack.data;
          Object.assign(body, { team: s.team, channelId: x.channelId, to: x.address });
        }
        if (!String(body.text || "").trim()) return alert("Write something first – or press “Let Tia write”.");
        if (x.live === "whatsapp" && store.whatsapp && store.whatsapp.data && store.whatsapp.data.canSend) {
          // the owner pressed send = his approval → it goes out from the business number
          x.actions = [{ step: "whatsapp", status: "run", detail: "Sending on WhatsApp…" }];
          base.render();
          try {
            const r = await T().livePost("whatsapp/send", { waId: x.waId, text: body.text });
            if (r.error) throw new Error(r.error);
            delete base.userEdited[x.id];
            x.actions = [];
          } catch (e) {
            x.actions = [{ step: "whatsapp", status: "error", detail: e.message || String(e) }];
            return base.render();
          }
          load("whatsapp", true);
          return rerender();
        }
        if (x.live === "whatsapp") {
          body.to = x.address;
          try {
            await navigator.clipboard.writeText(body.text);
          } catch {}
        }
        x.actions = [{ step: "draft", status: "run", detail: x.live === "gmail" ? "Saving the draft in Gmail…" : "Saving the draft…" }];
        base.render();
        try {
          await saveDraft(body);
          delete base.userEdited[x.id];
        } catch (e) {
          alert(e.message || e);
        }
        rerender();
      },
      reject: (x) => ((skipped[x.id] = true), rerender()),
      writeNew: async ({ to, subject, notes }) => {
        const r = await T().livePost("suggest", { mode: "compose", vault: false, to, subject, text: notes });
        if (r.error) throw new Error(r.error);
        return r;
      },
      sendNew: async ({ to, subject, text }) => {
        const r = await saveDraft({ app: "gmail", id: `new_${Date.now()}`, isNew: true, to, subject, text });
        return { detail: `Saved – ${r.where}. Open Gmail to send it.` };
      },
      typeDraft: (x, ta, done) => {
        if (x.live === "whatsapp") {
          // the server keeps the chat's draft; ask for a fresh one
          ta.value = "";
          ta.placeholder = "Tia is writing…";
          return T()
            .livePost("whatsapp/draft", { waId: x.waId })
            .then((chat) => {
              if (!chat || chat.error) throw new Error((chat && chat.error) || "chat not found");
              if (chat.skip && !chat.suggestion) return (ta.placeholder = `Tia: no reply needed – ${chat.skip}`);
              x.draft = chat.suggestion;
              delete base.userEdited[x.id];
              base.typeDraft(x, ta, () => load("whatsapp", true));
            })
            .catch((e) => (ta.placeholder = `Tia couldn't write it: ${e.message || e}`));
        }
        if (suggestions[x.id]) return base.typeDraft(x, ta, done);
        ta.value = "";
        ta.placeholder = "Tia is writing…";
        T()
          .livePost("suggest", { app: x.live, from: x.from, address: x.address, subject: x.subject, text: x.text || `New message in ${x.address}` })
          .then((r) => {
            if (r.error) throw new Error(r.error);
            if (r.skip) return (ta.placeholder = `Tia: no reply needed – ${r.skip} (You can still write one here.)`);
            suggestions[x.id] = r.text;
            x.draft = r.text;
            delete base.userEdited[x.id];
            base.typeDraft(x, ta, done);
          })
          .catch((e) => ((ta.placeholder = `Tia couldn't write it: ${e.message || e}`), 0));
      },
    };
  }

  // ============================ META ADS (Ads Manager look-alike) ============================
  const ads = { acc: null, level: "campaigns", camp: null, ad: null, view: "after", edits: {}, reviews: {}, busy: {} };
  function adsData() {
    if (isLive("ads")) return load("ads");
    return { data: D().ads };
  }
  const flag = (x) => {
    if (!x.impressions || x.impressions < 1000) return ["muted", "Too little data"];
    if (x.ctr >= 2) return ["good", "Strong CTR"];
    if (x.ctr >= 1.2) return ["ok", "OK"];
    return ["bad", "Low CTR"];
  };
  const resultLabel = (x) => (x.leads ? `${x.leads} leads` : x.purchases ? `${x.purchases} purchases` : x.linkClicks ? `${x.linkClicks} link clicks` : "—");
  const costPer = (x, cur) => (x.results ? eur(x.spend / x.results, cur) : "—");
  async function review(ad, campaign, cur, fresh) {
    if (!canLive() || (!isLive("ads") && D().reviews && D().reviews[ad.id] && !fresh)) {
      ads.reviews[ad.id] = D().reviews ? D().reviews[ad.id] : null;
      return rerender();
    }
    ads.busy[ad.id] = true;
    rerender();
    try {
      const r = await T().livePost("ads/review", { ad, campaign, currency: cur, fresh });
      if (r.error) throw new Error(r.error);
      ads.reviews[ad.id] = r;
    } catch (e) {
      ads.reviews[ad.id] = { error: e.message || String(e) };
    }
    ads.busy[ad.id] = false;
    rerender();
  }
  function adPreview(h, a, page, headline, text, picture) {
    const pic = h("div", { class: "fb-img" });
    if (picture) {
      const im = h("img", { alt: "", loading: "lazy" });
      im.src = picture;
      pic.append(im);
    } else pic.append(h("div", { class: "fb-ph" }, I("image"), a.name));
    const cta = String(a.cta || "LEARN_MORE").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
    let host = "";
    try {
      host = a.url ? new URL(a.url).hostname.replace(/^www\./, "").toUpperCase() : "";
    } catch {}
    return h("div", { class: "fb-post" },
      h("div", { class: "fb-head" }, h("div", { class: "fb-av" }, page.slice(0, 1)), h("div", {}, h("div", { class: "fb-pg" }, page), h("div", { class: "fb-sp" }, "Sponsored · ", I("people_community")))),
      h("div", { class: "fb-text" }, text || ""),
      pic,
      h("div", { class: "fb-link" }, h("div", {}, h("div", { class: "fb-host" }, host || (isLive("ads") ? page.toUpperCase() : "OAKLINE-STUDIO.EXAMPLE")), h("div", { class: "fb-hl" }, headline || "")), h("button", {}, cta)),
      h("div", { class: "fb-acts" }, "Preview – how people see the ad in their feed"));
  }
  function adsView(c) {
    const { h } = c;
    const s = adsData();
    const top = h("div", { class: "am-top" }, h("div", { class: "am-logo" }, I("megaphone")), h("div", { class: "am-title" }, "Ads Manager"));
    const root = h("div", { class: "am" }, top);
    const wait = notice(h, "ads", s, "Meta ad accounts");
    if (wait) return root.append(h("div", { class: "am-body" }, wait)), root;
    const data = s.data || { accounts: [] };
    if (ads.acc === null || ads.acc >= data.accounts.length) {
      // start on the account with the most spend
      const sp = data.accounts.map((a) => a.campaigns.reduce((t, x) => t + x.spend, 0));
      ads.acc = Math.max(0, sp.indexOf(Math.max(...sp)));
    }
    const acc = data.accounts[ads.acc];
    if (!acc) return root.append(h("div", { class: "ch-empty" }, "No ad accounts found on this Meta login.")), root;
    const cur = acc.currency;
    const sel = h("select", { class: "am-acc", onchange: (e) => ((ads.acc = +e.target.value), (ads.camp = ads.ad = null), (ads.level = "campaigns"), rerender()) },
      data.accounts.map((a, i) => h("option", { value: i, selected: i === ads.acc ? "selected" : null }, `${a.name} (${a.id.replace(/^act_/, "")})`)));
    top.append(sel, h("span", { class: "sp" }), h("div", { class: "am-range" }, `Results ${data.range.since} – ${data.range.until}`));
    // account summary
    const spend = acc.campaigns.reduce((t, x) => t + x.spend, 0);
    const imp = acc.campaigns.reduce((t, x) => t + x.impressions, 0);
    const clk = acc.campaigns.reduce((t, x) => t + x.clicks, 0);
    const res = acc.campaigns.reduce((t, x) => t + x.results, 0);
    const ctr = imp ? (clk / imp) * 100 : null;
    const tiles = h("div", { class: "am-tiles" },
      [["Amount spent", eur(spend, cur)], ["Results", n0(res)], ["Cost per result", res ? eur(spend / res, cur) : "—"], ["CTR", pct(ctr), ctr === null ? "" : ctr >= 1.5 ? "good" : "bad", "Meta average ≈ 1.5%"], ["Impressions", n0(imp)]].map(([k2, v, cls, hint]) =>
        h("div", { class: `am-tile ${cls || ""}`, title: hint || "" }, h("div", { class: "k" }, k2), h("div", { class: "v" }, v), hint ? h("div", { class: "hint" }, hint) : "")));
    // level tabs
    const camp = ads.camp && acc.campaigns.find((x) => x.id === ads.camp);
    const shownAds = acc.ads.filter((a) => !camp || a.campaignId === camp.id);
    const tabs = h("div", { class: "am-tabs" },
      h("button", { class: ads.level === "campaigns" ? "on" : "", onclick: () => ((ads.level = "campaigns"), (ads.camp = null), rerender()) }, I("folder"), "Campaigns", h("span", { class: "n" }, acc.campaigns.length)),
      h("button", { class: ads.level === "ads" ? "on" : "", onclick: () => ((ads.level = "ads"), rerender()) }, I("image"), camp ? `Ads in “${camp.name}”` : "Ads", h("span", { class: "n" }, shownAds.length)));
    const tools = h("div", { class: "am-tools" },
      h("button", { class: "am-btn", onclick: () => { const first = (ads.level === "ads" ? shownAds : acc.ads)[0]; if (first) { ads.level = "ads"; ads.ad = first.id; review(first, acc.campaigns.find((x) => x.id === first.campaignId), cur); } } }, I("sparkle"), "Ask Tia to review"),
      h("span", { class: "sp" }),
      h("span", { class: "am-note" }, "Read-only from Meta · Tia's changes are drafts"));
    // table
    const T2 = h("table", { class: "am-table" });
    const cols = [ads.level === "ads" ? "Ad" : "Campaign", "Delivery", "Tia", "Results", "Cost per result", "Amount spent", "Impressions", "Reach", "CTR", "CPC"];
    T2.append(h("thead", {}, h("tr", {}, cols.map((t) => h("th", {}, t)))));
    const body = h("tbody");
    const rows = ads.level === "ads" ? shownAds : acc.campaigns;
    for (const x of rows) {
      const [fc, ft] = flag(x);
      const rv = ads.reviews[x.id];
      const parent = ads.level === "ads" && acc.campaigns.find((k2) => k2.id === x.campaignId);
      const on = x.status === "ACTIVE" && (!parent || parent.status === "ACTIVE"); // an ad in a paused campaign doesn't run
      const tr = h("tr", { class: (ads.level === "ads" ? ads.ad === x.id : ads.camp === x.id) ? "sel" : "", onclick: () => {
        if (ads.level === "ads") {
          ads.ad = x.id;
          if (!ads.reviews[x.id]) review(x, acc.campaigns.find((k2) => k2.id === x.campaignId), cur);
        } else ((ads.camp = x.id), (ads.level = "ads"), (ads.ad = null));
        rerender();
      } },
        h("td", { class: "nm" }, h("div", {}, x.name), h("div", { class: "sub" }, ads.level === "ads" ? (x.headline || "").slice(0, 60) : `${x.objective} · ${x.budget}`)),
        h("td", {}, h("span", { class: `am-dl ${on ? "on" : ""}` }, on ? "Active" : "Off")),
        h("td", {}, rv && rv.score !== undefined ? h("span", { class: `am-score s${rv.score >= 70 ? "g" : rv.score >= 45 ? "o" : "b"}` }, rv.score) : h("span", { class: `am-flag ${fc}` }, ft)),
        h("td", {}, resultLabel(x)), h("td", {}, costPer(x, cur)), h("td", {}, eur(x.spend, cur)), h("td", {}, n0(x.impressions)), h("td", {}, n0(x.reach)), h("td", {}, pct(x.ctr)), h("td", {}, x.cpc ? eur(x.cpc, cur) : "—"));
      body.append(tr);
    }
    if (!rows.length) body.append(h("tr", {}, h("td", { colspan: cols.length, class: "empty" }, "Nothing here yet.")));
    T2.append(body);
    const left = h("div", { class: "am-left" }, tiles, tabs, tools, h("div", { class: "am-twrap" }, T2));
    const main = h("div", { class: "am-body" }, left);
    // drawer: ad preview + Tia's review + editable improved version
    const ad = ads.ad && acc.ads.find((x) => x.id === ads.ad);
    if (ad) main.append(adDrawer(c, ad, acc));
    root.append(main);
    return root;
  }
  function adDrawer(c, ad, acc) {
    const { h } = c;
    const cur = acc.currency;
    const rv = ads.reviews[ad.id];
    const ed = (ads.edits[ad.id] = ads.edits[ad.id] || {});
    const after = ads.view === "after" && rv && !rv.error;
    const headline = after ? (ed.headline ?? rv.headline) : ad.headline;
    const text = after ? (ed.text ?? rv.text) : ad.text;
    const page = acc.name;
    const prev = adPreview(h, ad, page, headline, text, img(ad.image));
    const d = h("div", { class: "am-drawer" },
      h("div", { class: "am-dh" }, h("b", {}, ad.name), h("span", { class: "sp" }), h("button", { class: "x", title: "Close", onclick: () => ((ads.ad = null), rerender()) }, "×")),
      h("div", { class: "am-seg" }, h("button", { class: ads.view === "before" ? "on" : "", onclick: () => ((ads.view = "before"), rerender()) }, "Now"), h("button", { class: ads.view === "after" ? "on" : "", disabled: !rv || rv.error, onclick: () => ((ads.view = "after"), rerender()) }, I("sparkle"), "Tia's version")),
      prev);
    const panel = h("div", { class: "am-tia" });
    if (ads.busy[ad.id]) panel.append(h("div", { class: "lv-wait" }, h("div", { class: "spin" }), "Tia is reading the numbers and the text…"));
    else if (!rv) panel.append(h("button", { class: "am-btn big", onclick: () => review(ad, acc.campaigns.find((x) => x.id === ad.campaignId), cur) }, I("sparkle"), "Ask Tia to review this ad"));
    else if (rv.error) panel.append(h("div", { class: "lv-wait err" }, `Tia couldn't review it: ${rv.error}`), h("button", { class: "am-btn", onclick: () => review(ad, acc.campaigns.find((x) => x.id === ad.campaignId), cur, true) }, "Try again"));
    else {
      const cls = rv.score >= 70 ? "g" : rv.score >= 45 ? "o" : "b";
      const list = (title, arr, k2) => (arr && arr.length ? h("div", { class: `am-l ${k2}` }, h("div", { class: "t" }, title), h("ul", {}, arr.map((t) => h("li", {}, t)))) : "");
      const hl = h("input", { class: "am-in", value: headline || "", maxlength: 60, oninput: (e) => ((ed.headline = e.target.value), (prev.querySelector(".fb-hl").textContent = e.target.value)) });
      const tx = h("textarea", { class: "am-ta", rows: 6, oninput: (e) => ((ed.text = e.target.value), (prev.querySelector(".fb-text").textContent = e.target.value)) });
      tx.value = text || "";
      const saved = draftOf(`ad_${ad.id}`);
      panel.append(
        h("div", { class: "am-verdict" }, h("div", { class: `ring ${cls}` }, rv.score), h("div", {}, h("b", {}, rv.verdict), h("div", { class: "via" }, `Compared with Meta averages (CTR ≈ ${rv.bench ? rv.bench.ctr : 1.5}%, CPC ≈ ${rv.bench ? rv.bench.cpc : 1} €) – rough, all industries`))),
        h("div", { class: "am-kpi" }, [["Spent", eur(ad.spend, cur)], ["CTR", pct(ad.ctr)], ["CPC", ad.cpc ? eur(ad.cpc, cur) : "—"], ["Results", resultLabel(ad)]].map(([k2, v]) => h("div", {}, h("span", {}, k2), h("b", {}, v)))),
        list("What works", rv.works, "ok"), list("What hurts", rv.problems, "bad"), list("Tia's next steps", rv.tips, "tip"),
        rv.budget ? h("div", { class: "am-budget" }, I("info"), rv.budget) : "");
      if (after) {
        panel.append(h("div", { class: "am-edit" }, h("div", { class: "t" }, "Tia's improved ad – edit it, the preview follows"), h("label", {}, "Headline"), hl, h("label", {}, "Primary text"), tx,
          h("div", { class: "am-row" },
            h("button", { class: "am-primary", onclick: async (e) => {
              e.target.disabled = true;
              try {
                await saveDraft({ app: "ads", id: `ad_${ad.id}`, account: acc.id, adName: ad.name, subject: hl.value, text: tx.value });
              } catch (err) {
                alert(err.message || err);
              }
              rerender();
            } }, "Save as draft"),
            h("button", { class: "am-btn", onclick: () => (navigator.clipboard && navigator.clipboard.writeText(`${hl.value}\n\n${tx.value}`), window.open(`https://adsmanager.facebook.com/adsmanager/manage/ads?act=${acc.id.replace(/^act_/, "")}`, "_blank", "noopener")) }, "Copy & open Ads Manager"),
            h("button", { class: "am-btn", onclick: () => ((ads.edits[ad.id] = {}), review(ad, acc.campaigns.find((x) => x.id === ad.campaignId), cur, true)) }, "New idea")),
          saved ? h("div", { class: "am-saved" }, `✓ Draft saved ${new Date(saved.savedAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} – ${saved.where}. Tia never changes your live ads.`) : h("div", { class: "am-saved muted" }, "Tia never changes your live ads or budgets – you publish the new version in Ads Manager.")));
      } else panel.append(h("button", { class: "am-btn big", onclick: () => ((ads.view = "after"), rerender()) }, I("sparkle"), "See Tia's improved version"));
    }
    d.append(panel);
    return d;
  }

  // ============================ LINKEDIN (feed + composer) ============================
  const li = { topic: "", text: null, busy: false, err: "" };
  function linkedinView(c) {
    const { h } = c;
    const live = isLive("linkedin");
    const s = live ? load("linkedin") : { data: D().linkedin };
    const wait = notice(h, "linkedin", s, "LinkedIn profile");
    const p = (s.data && s.data.profile) || { name: "", headline: "" };
    const nav = h("div", { class: "li-top" }, h("div", { class: "li-logo" }, "in"), h("div", { class: "li-title" }, "Write a post"), h("span", { class: "sp" }),
      h("a", { class: "li-btn ghost", href: "https://www.linkedin.com/feed/", target: "_blank", rel: "noopener" }, "Open LinkedIn"));
    if (wait) return h("div", { class: "li" }, nav, wait);
    const av = (cls) => {
      const pic = img(p.picture);
      if (pic) {
        const im = h("img", { class: cls, alt: "" });
        im.src = pic;
        return im;
      }
      const d2 = c.avatar(p.name || "Me", cls);
      return d2;
    };
    const left = h("div", { class: "li-card li-me" }, h("div", { class: "cover" }), av("li-av"), h("div", { class: "nm" }, p.name), h("div", { class: "hl" }, p.headline), h("a", { href: p.url || "https://www.linkedin.com/", target: "_blank", rel: "noopener" }, "View profile"));
    const ta = h("textarea", { class: "li-ta", rows: 10, placeholder: "What do you want to talk about?", oninput: (e) => (li.text = e.target.value) });
    ta.value = li.text || "";
    const topic = h("input", { class: "li-topic", placeholder: "Topic for Tia – e.g. “we fitted a kitchen in one day”", value: li.topic, oninput: (e) => (li.topic = e.target.value) });
    const write = async (improve) => {
      if (!improve && !li.topic.trim()) return topic.focus();
      li.busy = true;
      li.err = "";
      rerender();
      try {
        if (!canLive()) {
          await new Promise((r) => setTimeout(r, 900));
          li.text = D().linkedinPost;
        } else {
          const r = await T().livePost("linkedin/write", { topic: li.topic, draft: improve ? li.text : "" });
          if (r.error) throw new Error(r.error);
          li.text = r.text;
        }
      } catch (e) {
        li.err = e.message || String(e);
      }
      li.busy = false;
      rerender();
    };
    const all = canLive() ? drafts : localDrafts();
    const mine = Object.entries(all).filter(([, d]) => d.app === "linkedin").sort((a, b) => String(b[1].savedAt).localeCompare(String(a[1].savedAt)));
    const composer = h("div", { class: "li-card li-compose" },
      h("div", { class: "li-who" }, av("li-av sm"), h("div", {}, h("b", {}, p.name), h("div", { class: "sub" }, "Post to Anyone"))),
      h("div", { class: "li-tia" }, I("sparkle"), topic, h("button", { class: "li-btn", disabled: li.busy, onclick: () => write(false) }, li.busy ? "Writing…" : "Let Tia write")),
      li.err ? h("div", { class: "lv-wait err" }, li.err) : "",
      ta,
      h("div", { class: "li-bar" }, h("span", { class: "sp" }),
        h("button", { class: "li-btn ghost", disabled: li.busy || !(li.text || "").trim(), onclick: () => write(true) }, "Improve with Tia"),
        h("button", { class: "li-btn ghost", disabled: !(li.text || "").trim(), onclick: async () => {
          await saveDraft({ app: "linkedin", id: `li_${Date.now()}`, text: li.text });
          if (canLive()) await loadDrafts();
          rerender();
        } }, "Save draft"),
        h("button", { class: "li-post", disabled: !(li.text || "").trim(), title: "Tia never posts – LinkedIn opens and you paste it", onclick: () => (navigator.clipboard && navigator.clipboard.writeText(li.text || ""), window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener")) }, "Copy & open LinkedIn")));
    const feed = h("div", { class: "li-feed" }, composer, h("div", { class: "li-sort" }, h("span", {}, `Your drafts (${mine.length})`)));
    for (const [id, d] of mine.slice(0, 8)) {
      feed.append(h("div", { class: "li-card li-post-card" },
        h("div", { class: "li-who" }, av("li-av sm"), h("div", {}, h("b", {}, p.name), h("div", { class: "sub" }, `Draft · ${new Date(d.savedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`)), h("span", { class: "sp" }),
          h("button", { class: "li-btn ghost", onclick: () => ((li.text = d.text), rerender()) }, "Edit")),
        h("div", { class: "li-body" }, d.text)));
    }
    const tips = h("div", { class: "li-card li-tips" }, h("b", {}, "Tia's LinkedIn tips"), h("ul", {},
      ["The first 2 lines decide if people click “…more” – lead with the result, not “I'm happy to share”.", "One story, one lesson. Numbers beat adjectives.", "End with a question people can answer in one line.", "Tue–Thu 8:00–10:00 gets the most reach for Latvian audiences.", "Reply to every comment in the first hour."].map((t) => h("li", {}, t))),
      h("div", { class: "sub" }, live ? "LinkedIn doesn't let apps read your feed – Tia writes posts and keeps the drafts." : "Demo profile – on the live Tia this is your own LinkedIn."));
    return h("div", { class: "li" }, nav, h("div", { class: "li-main" }, h("div", { class: "li-col l" }, left), feed, h("div", { class: "li-col r" }, tips)));
  }

  // ============================ INSTAGRAM (live: profile, posts, captions) ============================
  const ig = { post: null, cap: {}, busy: {} };
  function instagramLive(c) {
    const { h } = c;
    const s = load("instagram");
    const nav = "";
    const wait = notice(h, "instagram", s, "Instagram");
    if (wait) return h("div", { class: "ig" }, nav, wait);
    const { profile: p, posts, dmNote } = s.data;
    const pic = (u, cls) => {
      const im = h("img", { class: cls, alt: "", loading: "lazy" });
      if (u) im.src = img(u);
      return im;
    };
    const head = h("div", { class: "igp-head" }, pic(p.picture, "igp-av"),
      h("div", {}, h("div", { class: "igp-un" }, p.username, h("a", { class: "igp-b", href: `https://www.instagram.com/${p.username}/`, target: "_blank", rel: "noopener" }, "Open on Instagram")),
        h("div", { class: "igp-st" }, h("span", {}, h("b", {}, n0(p.posts)), " posts"), h("span", {}, h("b", {}, n0(p.followers)), " followers"), h("span", {}, h("b", {}, n0(p.follows)), " following")),
        h("div", { class: "igp-nm" }, p.name), h("div", { class: "igp-bio" }, p.bio)));
    const grid = h("div", { class: "igp-grid" });
    for (const x of posts) {
      const cell = h("div", { class: `igp-cell ${ig.post === x.id ? "sel" : ""}`, onclick: () => ((ig.post = x.id), rerender()) }, pic(x.image, ""),
        h("div", { class: "ov" }, h("span", {}, I("heart"), n0(x.likes)), h("span", {}, I("chat_multiple"), n0(x.comments)), x.views !== null ? h("span", {}, I("play_circle"), n0(x.views)) : ""));
      if (x.type === "VIDEO") cell.append(h("div", { class: "rl" }, I("play_circle")));
      grid.append(cell);
    }
    const main = h("div", { class: "igp" }, dmNote ? h("div", { class: "igp-note" }, I("info"), dmNote) : "", head, h("div", { class: "igp-tabs" }, h("span", { class: "on" }, I("grid_dots"), "POSTS")), grid);
    const sel = posts.find((x) => x.id === ig.post);
    const side = h("div", { class: "igp-side" });
    if (sel) {
      const stats = `views ${sel.views ?? "-"}, reach ${sel.reach ?? "-"}, likes ${sel.likes}, comments ${sel.comments}, saves ${sel.saved ?? "-"}, shares ${sel.shares ?? "-"}`;
      const ta = h("textarea", { class: "am-ta", rows: 8, oninput: (e) => (ig.cap[sel.id] = e.target.value) });
      ta.value = ig.cap[sel.id] ?? sel.caption;
      const saved = draftOf(`igcap_${sel.id}`);
      side.append(h("div", { class: "am-dh" }, h("b", {}, `Post · ${sel.date}`), h("span", { class: "sp" }), h("a", { href: sel.link, target: "_blank", rel: "noopener" }, "Open on Instagram")),
        h("div", { class: "am-kpi" }, [["Views", n0(sel.views)], ["Reach", n0(sel.reach)], ["Likes", n0(sel.likes)], ["Saves", n0(sel.saved)]].map(([k2, v]) => h("div", {}, h("span", {}, k2), h("b", {}, v)))),
        h("div", { class: "am-edit" }, h("div", { class: "t" }, "Caption – edit it, or let Tia rewrite it"), ta,
          h("div", { class: "am-row" },
            h("button", { class: "am-btn", disabled: ig.busy[sel.id], onclick: async () => {
              ig.busy[sel.id] = true;
              rerender();
              try {
                const r = await T().livePost("suggest", { app: "instagram", mode: "caption", text: ta.value, stats });
                if (r.error) throw new Error(r.error);
                ig.cap[sel.id] = r.text;
              } catch (e) {
                alert(e.message || e);
              }
              ig.busy[sel.id] = false;
              rerender();
            } }, I("sparkle"), ig.busy[sel.id] ? "Tia is writing…" : "Let Tia rewrite"),
            h("button", { class: "am-primary", onclick: async () => (await saveDraft({ app: "instagram", id: `igcap_${sel.id}`, text: ta.value }), rerender()) }, "Save draft")),
          h("div", { class: "am-saved muted" }, saved ? `✓ Saved ${new Date(saved.savedAt).toTimeString().slice(0, 5)} – paste it in Instagram (Edit post). Tia never posts.` : "Tia never posts or edits your posts – you paste the caption in Instagram.")));
    } else side.append(h("div", { class: "ch-empty" }, "Click a post to see its numbers and let Tia improve the caption."));
    return h("div", { class: "ig igp-wrap" }, nav, main, side);
  }

  // ============================ WHATSAPP (live: Business number by Meta webhook) ============================
  let waSel = null;
  function waItems() {
    const s = store.whatsapp && store.whatsapp.data;
    return ((s && s.chats) || []).map((ch) => {
      const id = `wa_${ch.waId}`;
      const last = ch.messages[ch.messages.length - 1] || {};
      const lastIn = [...ch.messages].reverse().find((m) => m.dir === "in") || last;
      const d = draftOf(id);
      const saved = d && Date.parse(d.savedAt) > Date.parse(lastIn.at || 0); // a draft newer than their last message
      return {
        id, waId: ch.waId, live: "whatsapp", channel: "whatsapp", from: ch.name || (/@lid$/.test(ch.jid || "") ? (ch.number ? `+${ch.number}` : "WhatsApp contact") : `+${ch.waId}`), address: /@lid$/.test(ch.jid || "") ? (ch.number ? `+${ch.number}` : "") : `+${ch.waId}`,
        text: last.text || "", time: last.at ? new Date(last.at).toTimeString().slice(0, 5) : "", received: last.at, thread: ch.messages,
        draft: (saved && d.text) || ch.suggestion || "", state: saved ? "edited" : "open", unread: ch.unread || 0, reason: "",
        actions: saved ? [{ step: "draft", status: "done", detail: `Saved ${new Date(d.savedAt).toTimeString().slice(0, 5)} and copied – paste it to the customer. Tia never sends.` }] : ch.skip && !ch.suggestion ? [{ step: "draft", status: "done", detail: `Tia: no reply needed – ${ch.skip}` }] : [],
      };
    });
  }
  function whatsappLive(c) {
    const { h } = c;
    const s = load("whatsapp");
    const data = s.data || {};
    const items = waItems();
    const linking = ["qr", "starting"].includes((linkInfo || data.link || {}).status); // a QR is waiting – show it first
    if (items.length && window.TiaApps && !linking) {
      if (!waSel || !items.find((x) => x.id === waSel)) waSel = items[0].id;
      const x = items.find((i) => i.id === waSel);
      if (x.unread) T().livePost("whatsapp/read", { waId: x.waId }).catch(() => {});
      const ctx = ctxFor("whatsapp", { ...c, select: (id) => ((waSel = id), rerender()) });
      return window.TiaApps.wa(ctx, items, x);
    }
    // not linked yet: link the owner's own WhatsApp like WhatsApp Web (QR → Linked devices)
    const L = linkInfo || data.link || { status: "off" };
    if (["qr", "starting", "reconnecting"].includes(L.status) || linkPolling) pollLink();
    const qr = h("div", { class: "wa-qr" });
    if (L.qrSvg) qr.innerHTML = L.qrSvg; // our own server's QR (SVG made by the qrcode package)
    else if (L.status === "starting" || L.status === "reconnecting") qr.append(h("div", { class: "spin" }));
    const steps = [
      ["Open WhatsApp on your phone", "WhatsApp Business or WhatsApp – the one with the number you want in Tia."],
      ["Settings → Linked devices → Link a device", "On iPhone: Settings → Linked devices. On Android: ⋮ → Linked devices."],
      ["Point the phone at the QR code", "Your chats appear here in a few seconds. The phone keeps working as usual."],
    ];
    return h("div", { class: "wa wa-conn" }, h("div", { class: "wa-card wa-linkcard" },
      h("div", { class: "wa-ttl" }, I("lock_closed"), "Use WhatsApp in Tia"),
      h("div", { class: "wa-state" }, h("span", { class: `dot ${L.status === "connected" ? "connected" : L.status === "qr" ? "pending" : ""}` }),
        L.status === "connected" ? `Linked${L.me ? ` as ${L.me}` : ""} – waiting for chats…` : L.status === "qr" ? "Scan the QR code with your phone" : L.status === "starting" || L.status === "reconnecting" ? "Starting…" : "Not linked"),
      h("div", { class: "wa-linkrow" },
        h("ol", {}, steps.map(([t, d]) => h("li", {}, h("b", {}, t), h("div", {}, d)))),
        L.status === "qr" || L.status === "starting" || L.status === "reconnecting" ? qr : ""),
      h("div", { class: "am-row" },
        L.status === "off" || !L.status ? h("button", { class: "am-primary", onclick: async (e) => {
          e.target.disabled = true;
          e.target.textContent = "Starting…";
          try {
            const r = await T().livePost("whatsapp/link", {});
            if (r.error) throw new Error(r.error);
            linkInfo = r;
            pollLink(true);
          } catch (err) {
            e.target.textContent = err.message || String(err);
          }
        } }, "Link my WhatsApp") : "",
        L.status && L.status !== "off" ? h("button", { class: "am-btn", onclick: async () => ((linkInfo = await T().livePost("whatsapp/unlink", {})), (linkInfo.status = "off"), rerender()) }, "Unlink") : ""),
      h("div", { class: "wa-foot" }, "Works like WhatsApp Web. Tia shows your chats and sends only when you tap send; nothing goes to the AI unless you press “Let Tia write”. To remove Tia: WhatsApp → Linked devices → Tia → Log out.")));
  }
  let linkInfo = null;
  let linkPolling = false;
  let linkTimer = null;
  function pollLink(force) {
    if (linkTimer && !force) return;
    linkPolling = true;
    clearTimeout(linkTimer);
    linkTimer = setTimeout(async () => {
      linkTimer = null;
      try {
        linkInfo = await T().live("whatsapp/link");
      } catch {}
      if (linkInfo && linkInfo.status === "connected") {
        linkPolling = false;
        load("whatsapp", true);
        setTimeout(() => load("whatsapp", true), 4000); // history arrives a moment later
        setTimeout(() => load("whatsapp", true), 12000);
      } else if (linkInfo && linkInfo.status === "off") linkPolling = false;
      rerender();
    }, force ? 300 : 2000);
  }
  // live: a message to the business number → refresh, and with "Follow Tia" on, open the WhatsApp tab
  if (T().onEvent)
    T().onEvent((ev) => {
      if (ev.type !== "whatsapp-in" && ev.type !== "whatsapp-draft") return;
      load("whatsapp", true);
      if (ev.type === "whatsapp-in") {
        waSel = `wa_${ev.chat}`;
        const followOn = document.querySelector(".apprail .follow.on");
        if (followOn && window.TiaChannels && window.TiaChannels.showTab) {
          mode.whatsapp = "live";
          window.TiaChannels.showTab("whatsapp");
        }
      }
    });

  window.TiaLive = {
    LIVE_TABS, canLive, isLive, switcher, items, ctxFor,
    setRerender: (fn) => ((rerender = fn), loadDrafts()),
    views: { ads: adsView, linkedin: linkedinView, instagram: instagramLive, whatsapp: whatsappLive },
  };
})();

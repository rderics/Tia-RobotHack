// Look-alikes of the apps owners use every day: Outlook (web), WhatsApp Web, Instagram Direct, Slack.
// Layout and colours follow the real apps so they feel familiar – but every control on screen WORKS: no decorative
// buttons. Icons: Fluent UI System Icons (MIT). No brand logos. Each view gets a context `c` from views.js.
(function () {
  const ICONS = window.TiaIcons || {};
  const NS = "http://www.w3.org/2000/svg";
  function I(name) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("class", "i");
    for (const d of ICONS[name] || []) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      svg.append(p);
    }
    return svg;
  }
  const tiaBanner = (c, x, text) =>
    c.h("div", { class: "tia-banner" }, I("sparkle"), c.h("div", {}, c.h("b", {}, text), x && x.reason ? c.h("span", { class: "why" }, x.reason) : null));
  // search boxes keep their text across re-renders
  const query = { email: "", whatsapp: "", instagram: "", slack: "" };
  const match = (tab, i) => {
    const q = query[tab].trim().toLowerCase();
    return !q || `${i.from} ${i.subject || ""} ${i.text}`.toLowerCase().includes(q);
  };
  function searchBox(c, tab, cls, placeholder) {
    const inp = c.h("input", { class: cls, placeholder, value: query[tab], oninput: (e) => ((query[tab] = e.target.value), c.render(), refocus(tab)) });
    return inp;
  }
  // after a re-render, put the cursor back into the search box the owner is typing in
  function refocus(tab) {
    setTimeout(() => {
      const el = document.querySelector(`[data-search="${tab}"]`);
      if (el && document.activeElement !== el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
  }
  const isOpen = (x) => x.state === "open" || x.state === "new" || (x.live && x.state === "edited");
  const replyable = (x) => x.draft || x.live || x.state === "new";

  // ============================ OUTLOOK ============================
  let folder = "inbox";
  let mailAcct = "all"; // live: all inboxes, or only Gmail / only Outlook
  let composing = null; // { to, subject, text } while writing a new mail
  function mail(c, items, x) {
    const { h } = c;
    const A = c.acct || {};
    const inAcct = (i, acc = mailAcct) => !A.accounts || acc === "all" || i.live === acc;
    const inF = (i, f) => ({ inbox: !i.draftOnly, unread: isOpen(i) && !i.draftOnly, needs: i.state === "open" && !i.live, handled: i.state === "handled", drafts: ["approved", "edited"].includes(i.state) })[f];
    const shown = items.filter((i) => inAcct(i) && inF(i, folder) && match("email", i));
    if (A.accounts && x && !shown.includes(x)) x = shown[0]; // switching folders opens that folder's first mail
    const n = (f, acc = mailAcct) => items.filter((i) => inAcct(i, acc) && (f === "inbox" ? isOpen(i) && !i.draftOnly : inF(i, f))).length;
    const F = (key, icon, label, extra = "", acc = mailAcct) =>
      h("div", { class: `ol-f ${folder === key && mailAcct === acc ? "on" : ""} ${extra}`, onclick: () => ((folder = key), (mailAcct = acc), (composing = null), c.render()) }, I(icon), h("span", {}, label), n(key, acc) ? h("span", { class: "n" }, n(key, acc)) : "");
    const folders = A.accounts
      ? h("div", { class: "ol-folders" },
          F("inbox", "mail_inbox_filled", "All inboxes", "", "all"),
          A.accounts.map((a) => [h("div", { class: `ol-acct ${a.key}` }, h("span", { class: `ol-app ${a.key}` }, a.label), a.name), F("inbox", "mail_inbox", "Inbox", "", a.key), F("drafts", "drafts", "Drafts", "", a.key)]).flat())
      : h("div", { class: "ol-folders" },
          h("div", { class: "ol-acct" }, A.box || "info@oakline-studio.example"),
          F("inbox", folder === "inbox" ? "mail_inbox_filled" : "mail_inbox", "Inbox"),
          A.live ? "" : F("needs", "sparkle", "Needs you", "tia"),
          A.live ? "" : F("handled", "checkmark", "Handled by Tia", "tia"),
          F("drafts", "drafts", "Drafts"));
    const search = searchBox(c, "email", "ol-search", "Search mail");
    search.setAttribute("data-search", "email");
    const list = h("div", { class: "ol-card" },
      h("div", { class: "ol-lhd" }, A.accounts && mailAcct !== "all" ? `${mailAcct === "outlook" ? "Outlook" : "Gmail"} · ` : "", { inbox: A.accounts && mailAcct === "all" ? "All inboxes" : "Inbox", needs: "Needs you", handled: "Handled by Tia", drafts: "Drafts" }[folder] || "Inbox"),
      shown.map((i) =>
        h("div", { class: `ol-row ${isOpen(i) && i.state !== "edited" ? "unread" : ""} ${x && i.id === x.id && !composing ? "sel" : ""}`, onclick: () => ((composing = null), c.select(i.id)) },
          c.avatar(i.from), h("div", { class: "who" }, i.from), h("div", { class: "time" }, i.time),
          h("div", { class: "subj" }, A.accounts ? h("span", { class: `ol-app ${i.live}` }, i.live === "outlook" ? "Outlook" : "Gmail") : "", i.subject || "(No subject)"), h("div", { class: "prev" }, c.chip(i), h("span", {}, String(i.text || "").slice(0, 90))))),
      shown.length ? null : h("div", { class: "ch-empty" }, query.email ? "No mail matches your search." : folder === "drafts" ? "No drafts yet – answer a mail and press Save draft." : "Nothing here."));
    const read = h("div", { class: "ol-card ol-read" });
    if (composing) read.append(composeView(c, A));
    else if (x) {
      read.append(
        h("div", { class: "ol-subj" }, x.subject || "(No subject)"),
        h("div", { class: "ol-msg" },
          h("div", { class: "ol-from" }, c.avatar(x.from), h("div", { class: "n" }, x.from, " ", h("span", {}, `<${x.address}>`)), h("div", { class: "acts" }, h("div", { class: "t" }, x.time)),
            h("div", { class: "to" }, x.draftOnly ? `Draft in ${x.live === "outlook" ? "Outlook" : "Gmail"} – to ${x.address}` : `To: ${(A.fromOf && A.fromOf(x)) || A.me || "Mārtiņš Ozols"}`)),
          h("div", { class: "ol-body" }, x.text)));
      if (x.draftOnly) read.append(h("div", { class: "ol-reply" }, tiaBanner(c, x, `Tia saved this as a draft in ${x.live === "outlook" ? "Outlook" : "Gmail"} – open it there and press Send.`), c.steps(x)));
      else if (replyable(x)) {
        const open = isOpen(x);
        const ta = h("textarea", { "aria-label": "Message body", placeholder: "Write your reply – or press “Let Tia write”", oninput: (e) => (c.userEdited[x.id] = e.target.value) });
        ta.value = c.composerValue(x);
        read.append(h("div", { class: "ol-reply" },
          tiaBanner(c, x, x.live ? (x.state === "edited" ? (A.savedOf ? A.savedOf(x) : A.savedBanner) : A.bannerOf ? A.bannerOf(x) : A.banner) : x.state === "new" ? "Write your reply, or let Tia write it from the business notes. “Save draft” opens Outlook and types it in – you press Send." : open ? "Tia drafted this reply – edit it, or save it as a draft." : x.state === "handled" ? "Tia handled this message with the reply below." : "Saved as a draft in Outlook."),
          h("div", { class: "ol-line" }, h("span", { class: "k" }, "From"), h("span", {}, (A.fromOf && A.fromOf(x)) || A.from || "info@oakline-studio.example")),
          h("div", { class: "ol-line" }, h("span", { class: "k" }, "To"), h("span", { class: "ol-pill" }, c.avatar(x.from), x.address)),
          ta,
          h("div", { class: "ol-rbar" },
            h("button", { class: "ol-primary", disabled: !open, onclick: () => c.decide(x, ta.value) }, "Save draft"),
            h("button", { class: "ol-btn", disabled: !open, onclick: () => ((c.userEdited[x.id] = undefined), c.typeDraft(x, ta)) }, I("sparkle"), "Let Tia write"),
            h("button", { class: "ol-btn", disabled: !open, onclick: () => c.reject(x) }, "Discard"),
            h("span", { class: "note" }, (A.noteOf && A.noteOf(x)) || A.note || "Tia never sends – you press Send in Outlook.")),
          c.steps(x)));
        if (c.pendingFor(x.id)) c.typeDraft(x, ta);
      }
    } else read.append(h("div", { class: "ch-empty" }, "Select a mail to read it."));
    return h("div", { class: "ol" },
      h("div", { class: "ol-head" }, h("div", { class: "name" }, "Mail"), search, h("div", { class: "right" }, h("div", { class: "me", title: A.box || "" }, A.initials || "MO"))),
      h("div", { class: "ol-work" },
        h("div", { class: "ol-ribbon" },
          h("div", { class: "ol-cmds" },
            h("button", { class: "ol-cmd new", onclick: () => ((composing = { to: "", subject: "", text: "" }), c.render()) }, I("mail"), "New mail"),
            x && !composing && replyable(x) ? h("button", { class: "ol-cmd", onclick: () => document.querySelector(".ol-reply textarea") && document.querySelector(".ol-reply textarea").focus() }, I("arrow_reply"), "Reply") : "",
            x && !composing && isOpen(x) ? h("button", { class: "ol-cmd", onclick: () => c.reject(x) }, I("archive"), "Done – no reply") : "")),
        h("div", { class: "ol-panes" }, folders, list, read)));
  }
  function composeView(c, A) {
    const { h } = c;
    const m = composing;
    const to = h("input", { class: "ol-in", placeholder: "To (name or email)", value: m.to, oninput: (e) => (m.to = e.target.value) });
    const subj = h("input", { class: "ol-in", placeholder: "Add a subject", value: m.subject, oninput: (e) => (m.subject = e.target.value) });
    const ta = h("textarea", { placeholder: "Write the mail – or write a few words about what it should say and press “Let Tia write”", oninput: (e) => (m.text = e.target.value) });
    ta.value = m.text;
    const status = h("div", { class: "tia-steps" });
    m.from = m.from || (mailAcct === "outlook" ? "outlook" : "gmail");
    const fromSel = A.accounts
      ? h("select", { class: "ol-in", onchange: (e) => (m.from = e.target.value) }, A.accounts.map((a) => h("option", { value: a.key, selected: m.from === a.key ? "" : null }, `${a.label} – ${a.name}`)))
      : null;
    return h("div", { class: "ol-reply ol-compose" },
      h("div", { class: "ol-subj" }, "New message"),
      fromSel ? h("div", { class: "ol-line" }, h("span", { class: "k" }, "From"), fromSel) : "",
      tiaBanner(c, null, "Write it yourself, or give Tia a few words and she writes it from the business notes. Save draft = a real draft you send yourself."),
      h("div", { class: "ol-line" }, h("span", { class: "k" }, "To"), to),
      h("div", { class: "ol-line" }, h("span", { class: "k" }, "Subject"), subj),
      ta,
      h("div", { class: "ol-rbar" },
        h("button", { class: "ol-primary", onclick: async () => {
          if (!m.text.trim()) return ta.focus();
          status.textContent = "Saving the draft…";
          try {
            status.textContent = m.from === "outlook" ? "Outlook is opening – Tia types the draft…" : "Saving the draft in Gmail…";
            const r = await c.sendNew({ channel: "email", to: m.to, subject: m.subject, text: m.text, from: m.from });
            status.textContent = `✓ ${(r && r.detail) || "Draft saved – you press Send."}`;
          } catch (e) {
            status.textContent = `⚠ ${e.message || e}`;
          }
        } }, "Save draft"),
        h("button", { class: "ol-btn", onclick: async () => {
          status.textContent = "Tia is writing…";
          try {
            const r = await c.writeNew({ channel: "email", to: m.to, subject: m.subject, notes: m.text });
            m.text = r.text || "";
            if (r.subject && !m.subject) m.subject = r.subject;
            ta.value = m.text;
            subj.value = m.subject;
            status.textContent = "";
          } catch (e) {
            status.textContent = `⚠ ${e.message || e}`;
          }
        } }, I("sparkle"), "Let Tia write"),
        h("button", { class: "ol-btn", onclick: () => ((composing = null), c.render()) }, "Cancel")),
      status);
  }

  // ============================ WHATSAPP ============================
  let waFilter = "all";
  function wa(c, items, x) {
    const { h } = c;
    const shown = items.filter((i) => (waFilter === "all" || isOpen(i)) && match("whatsapp", i));
    const list = h("div", { class: "wa-list" }, shown.map((i) =>
      h("div", { class: `wa-row ${isOpen(i) ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => c.select(i.id) },
        c.avatar(i.from), h("div", { class: "mid" },
          h("div", { class: "l1" }, h("span", { class: "nm" }, i.from), h("span", { class: "tm" }, i.time)),
          h("div", { class: "l2" }, h("span", {}, i.text), isOpen(i) && (i.unread || !i.live) ? h("span", { class: "cnt" }, i.unread || "1") : null)))),
      shown.length ? "" : h("div", { class: "ch-empty" }, query.whatsapp ? "No chat matches your search." : "No chats."));
    const main = h("div", { class: "wa-main" });
    if (x) {
      const open = isOpen(x);
      const msgs = h("div", { class: "wa-msgs" }, h("div", { class: "wa-enc" }, "Messages are end-to-end encrypted. No one outside of this chat can read them."));
      if (x.thread) {
        let day = "";
        for (const m of x.thread) {
          const d = new Date(m.at);
          const label = d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
          if (label !== day) msgs.append(h("div", { class: "wa-day" }, (day = label)));
          msgs.append(h("div", { class: `wb ${m.dir === "in" ? "in" : "out"}` }, m.text, h("span", { class: "t" }, d.toTimeString().slice(0, 5))));
        }
      } else msgs.append(h("div", { class: "wa-day" }, "Today"), h("div", { class: "wb in" }, x.text, h("span", { class: "t" }, x.time)));
      if (!open && x.draft) msgs.append(h("div", { class: "wb out draft" }, h("span", { class: "lbl" }, x.state === "handled" ? "Tia · handled" : "Tia · draft"), x.draft, h("span", { class: "t" }, x.time)));
      main.append(h("div", { class: "wa-chathead" }, c.avatar(x.from), h("div", {}, h("div", { class: "nm" }, x.from), h("div", { class: "s" }, x.address || ""))), msgs);
      if (open) {
        const ta = c.textarea(x, "Type a message");
        main.append(h("div", { class: "wa-tia" }, tiaBanner(c, x, x.live ? (c.acct && c.acct.banner) || "" : "Tia's reply is in the box – change it, or press ✦ to let her write it again. ➤ opens WhatsApp with the text, you press send."), c.steps(x)),
          h("div", { class: "wa-compose" }, ta,
            h("button", { class: "wa-redo", title: "Let Tia write it", onclick: () => c.typeDraft(x, ta) }, I("sparkle")),
            h("button", { class: "wa-send", title: x.live ? "Send" : "Open in WhatsApp", onclick: () => c.decide(x, ta.value) }, I("send_filled"))));
      } else main.append(h("div", { class: "wa-tia" }, c.chip(x), c.steps(x)));
    } else main.append(h("div", { class: "ch-empty" }, "Pick a chat on the left."));
    const search = searchBox(c, "whatsapp", "wa-searchin", "Search or start a new chat");
    search.setAttribute("data-search", "whatsapp");
    const chip = (k, t) => h("span", { class: waFilter === k ? "on" : "", onclick: () => ((waFilter = k), c.render()) }, t);
    return h("div", { class: "wa" },
      h("div", { class: "wa-side" },
        h("div", { class: "wa-head" }, "Chats"),
        h("div", { class: "wa-search" }, h("div", {}, I("search"), search)),
        h("div", { class: "wa-chips" }, chip("all", "All"), chip("unread", "Unread")),
        list),
      main);
  }

  // ============================ INSTAGRAM ============================
  function ig(c, items, x) {
    const { h } = c;
    const shown = items.filter((i) => match("instagram", i));
    const list = h("div", { class: "ig-list" }, shown.map((i) =>
      h("div", { class: `ig-row ${isOpen(i) ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => c.select(i.id) },
        c.avatar(i.from), h("div", { class: "tx" }, h("div", { class: "nm" }, i.from.replace(/^@/, "")), h("div", { class: "pv" }, `${i.text.slice(0, 38)} · ${i.time}`)), isOpen(i) ? h("span", { class: "dot" }) : null)),
      shown.length ? "" : h("div", { class: "ch-empty" }, "No messages."));
    const main = h("div", { class: "ig-main" });
    if (x) {
      const open = isOpen(x);
      const user = x.from.replace(/^@/, "");
      const msgs = h("div", { class: "ig-msgs" },
        h("div", { class: "ig-intro" }, c.avatar(x.from), h("div", { class: "nm" }, user), h("div", { class: "un" }, `${user} · Instagram`)),
        h("div", { class: "ig-time" }, `Today ${x.time}`),
        h("div", { class: "igb in" }, x.text));
      if (!open && x.draft) msgs.append(h("div", { class: "igb draft" }, h("span", { class: "lbl" }, x.state === "handled" ? "Tia · handled" : "Tia · draft"), x.draft));
      main.append(h("div", { class: "ig-head" }, c.avatar(x.from), h("div", {}, h("div", { class: "nm" }, user), h("div", { class: "un" }, user))), msgs);
      if (open) {
        const ta = c.textarea(x, "Message...");
        main.append(h("div", { class: "ig-tia" }, tiaBanner(c, x, "Tia's reply is in the box – edit it, or let her write it again. Send = copied for you to paste in Instagram."), c.steps(x)),
          h("div", { class: "ig-compose" }, ta, h("button", { class: "ghost", onclick: () => c.typeDraft(x, ta) }, "Let Tia write"), h("button", { onclick: () => c.decide(x, ta.value) }, "Send")));
      } else main.append(h("div", { class: "ig-tia" }, c.chip(x), c.steps(x)));
    } else main.append(h("div", { class: "ch-empty" }, "Pick a conversation on the left."));
    const search = searchBox(c, "instagram", "ig-searchin", "Search");
    search.setAttribute("data-search", "instagram");
    return h("div", { class: "ig ig-clean" },
      h("div", { class: "ig-side" },
        h("div", { class: "ig-me" }, (c.acct && c.acct.ig) || "oakline.studio"),
        h("div", { class: "ig-search" }, search),
        h("div", { class: "ig-tabs" }, h("span", { class: "on" }, "Messages")),
        list),
      main);
  }

  // ============================ SLACK ============================
  function slack(c, items, x) {
    const { h } = c;
    const A = c.acct || {};
    const ws = A.ws || "Oakline Studio";
    const chans = {};
    for (const i of items) if (i.placeholder || match("slack", i)) (chans[i.address || "#general"] = chans[i.address || "#general"] || []).push(i);
    if (x && !chans[x.address]) x = items[0];
    const side = h("div", { class: "sl-side" },
      h("div", { class: "sl-wsn" }, ws),
      h("div", { class: "sl-sec" }, "Channels"),
      Object.entries(chans).map(([name, list]) => {
        const open = list.filter((i) => isOpen(i) && !i.placeholder).length;
        return h("div", { class: `sl-item ${open ? "unread" : ""} ${x && x.address === name ? "on" : ""}`, onclick: () => c.select((list.find((i) => i.placeholder) || list.find(isOpen) || list[list.length - 1]).id) }, h("span", {}, "#"), h("span", {}, name.replace(/^#/, "")), open ? h("span", { class: "cnt" }, open) : "");
      }));
    const main = h("div", { class: "sl-main" });
    if (x) {
      const msgs = h("div", { class: "sl-msgs" }, h("div", { class: "sl-day" }, h("span", {}, "Today")));
      for (const i of chans[x.address] || []) {
        if (i.placeholder) continue;
        msgs.append(h("div", { class: `sl-msg ${i.id === x.id ? "sel" : ""}`, title: "Click to answer this message", onclick: () => c.select(i.id) }, c.avatar(i.from), h("div", {}, h("span", { class: "nm" }, i.from), h("span", { class: "tm" }, i.time), h("div", { class: "tx" }, i.text))));
        if (!isOpen(i) && i.draft) msgs.append(h("div", { class: "sl-msg draft" }, c.avatar("Tia"), h("div", {}, h("span", { class: "nm" }, "Tia"), h("span", { class: "app" }, "APP"), h("span", { class: "tm" }, i.state === "handled" ? "handled" : "draft"), h("div", { class: "tx" }, i.draft))));
      }
      if (A.live && (chans[x.address] || []).every((i) => i.placeholder)) msgs.append(h("div", { class: "sl-emptych" }, `This is the very beginning of ${x.address}. Write the first message below – Tia keeps it as a draft for you to post.`));
      main.append(h("div", { class: "sl-head" }, h("div", { class: "t" }, `# ${String(x.address || "").replace(/^#/, "")}`)), msgs);
      if (isOpen(x)) {
        const ta = c.textarea(x, x.placeholder ? `Message ${x.address}` : `Reply to ${x.from}`);
        main.append(h("div", { class: "sl-tia" }, tiaBanner(c, x, A.live ? A.banner : "Tia's reply is in the box – edit it, then use it. Tia never posts by herself."), c.steps(x)),
          h("div", { class: "sl-compose" }, ta,
            h("div", { class: "sl-act" }, h("span", { class: "sp" }),
              x.placeholder ? "" : h("button", { class: "ghost", onclick: () => c.typeDraft(x, ta) }, "Let Tia write"),
              x.placeholder ? "" : h("button", { class: "ghost", onclick: () => c.reject(x) }, "Not now"),
              h("button", { class: "sl-sendone", title: A.live ? "Save as a draft (you post it in Slack)" : "Use this reply", onclick: () => c.decide(x, ta.value) }, I("send_filled")))));
      } else main.append(h("div", { class: "sl-tia" }, c.chip(x), c.steps(x)));
    } else main.append(h("div", { class: "ch-empty" }, "Pick a channel."));
    const search = searchBox(c, "slack", "sl-searchin", `Search ${ws}`);
    search.setAttribute("data-search", "slack");
    return h("div", { class: "sl" },
      h("div", { class: "sl-top" }, h("div", { class: "search" }, I("search"), search)),
      h("div", { class: "sl-body sl-clean" }, side, main));
  }

  window.TiaApps = { mail, wa, ig, slack, I, setMail: ({ folder: f, acct } = {}) => ((folder = f || folder), (mailAcct = acct || mailAcct), (composing = null)) };
})();

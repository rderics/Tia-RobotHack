// High-fidelity look-alikes of the apps owners use every day: Outlook (web), WhatsApp Web, Instagram Direct, Slack.
// Structure follows the real apps (header, nav rail, list, conversation, composer). Icons: Fluent UI System Icons (MIT).
// No brand logos. Each view gets a context `c` from views.js with the data and Tia's actions.
(function () {
  const ICONS = window.TiaIcons || {};
  const NS = "http://www.w3.org/2000/svg";
  // Fluent icon as inline SVG (20px grid)
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
  const box = (c, cls, ...kids) => c.h("div", { class: cls }, ...kids);
  const icons = (c, cls, names) => c.h("div", { class: cls }, names.map((n) => c.h("div", { title: n.replace(/_/g, " ") }, I(n))));
  const tiaBanner = (c, x, text) =>
    c.h("div", { class: "tia-banner" }, I("sparkle"), c.h("div", {}, c.h("b", {}, text), x.reason ? c.h("span", { class: "why" }, x.reason) : null));

  // ============================ OUTLOOK ============================
  let folder = "inbox";
  function mail(c, items, x) {
    const { h } = c;
    const A = c.acct || {}; // the owner's real account when the switch is on "live"
    const counts = {
      inbox: items.filter((i) => i.state === "open").length,
      needs: items.filter((i) => i.state === "open").length,
      handled: items.filter((i) => i.state === "handled").length,
      drafts: items.filter((i) => ["approved", "edited"].includes(i.state)).length,
    };
    const shown = items.filter((i) => ({ inbox: true, needs: i.state === "open", handled: i.state === "handled", drafts: ["approved", "edited"].includes(i.state) })[folder] ?? false);
    const F = (key, icon, label, n, extra = "") =>
      h("div", { class: `ol-f ${folder === key ? "on" : ""} ${extra}`, onclick: () => ((folder = key), c.render()) }, I(icon), h("span", {}, label), n ? h("span", { class: "n" }, n) : "");
    const folders = box(c, "ol-folders",
      h("div", { class: "ol-fav" }, I("chevron_down"), "Favorites"),
      F("inbox", folder === "inbox" ? "mail_inbox_filled" : "mail_inbox", "Inbox", counts.inbox),
      F("needs", "sparkle", "Needs you", counts.needs, "tia"),
      F("handled", "checkmark", "Handled by Tia", counts.handled, "tia"),
      h("div", { class: "ol-acct" }, I("chevron_down"), A.box || "info@oakline-studio.example"),
      F("inbox", "mail_inbox", "Inbox", counts.inbox),
      F("junk", "warning", "Junk Email", 0),
      F("drafts", "drafts", "Drafts", counts.drafts),
      F("sent", "send", "Sent Items", 0),
      F("deleted", "delete", "Deleted Items", 0),
      F("archive", "archive", "Archive", 0),
      F("notes", "notebook", "Notes", 0));
    const list = h("div", { class: "ol-card" },
      h("div", { class: "ol-lhd" }, { inbox: "Inbox", needs: "Needs you", handled: "Handled by Tia", drafts: "Drafts", sent: "Sent Items" }[folder] || "Folder", I("star"), h("span", { class: "sp" }), I("checkmark_square"), I("filter")),
      h("div", { class: "ol-pivot" }, h("span", { class: "on" }, "Focused"), h("span", {}, "Other")),
      shown.length ? h("div", { class: "ol-group" }, "Today") : null,
      shown.map((i) =>
        h("div", { class: `ol-row ${i.state === "open" ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => c.select(i.id) },
          c.avatar(i.from), h("div", { class: "who" }, i.from), h("div", { class: "time" }, i.time),
          h("div", { class: "subj" }, i.subject || "(No subject)"), h("div", { class: "prev" }, c.chip(i), h("span", {}, i.text.slice(0, 90))))),
      shown.length ? null : h("div", { class: "ch-empty" }, folder === "sent" ? "Tia never sends. Your drafts wait in Drafts until you press Send." : "Nothing in this folder."));
    const read = h("div", { class: "ol-card ol-read" });
    if (x) {
      read.append(
        h("div", { class: "ol-subj" }, x.subject || "(No subject)", h("span", { class: "sp" }), I("more_horizontal")),
        h("div", { class: "ol-msg" },
          h("div", { class: "ol-from" }, c.avatar(x.from), h("div", { class: "n" }, x.from, " ", h("span", {}, `<${x.address}>`)),
            h("div", { class: "acts" }, h("div", { class: "t" }, x.time), h("div", {}, I("arrow_reply")), h("div", {}, I("arrow_reply_all")), h("div", {}, I("arrow_forward")), h("div", {}, I("more_horizontal"))),
            h("div", { class: "to" }, `To: ${A.me || "Mārtiņš Ozols"}`)),
          h("div", { class: "ol-body" }, x.text)));
      if (x.draft || x.live) {
        const open = x.state === "open" || (x.live && x.state === "edited");
        const ta = h("textarea", { "aria-label": "Message body", placeholder: x.live ? "Write your reply – or press “Let Tia write”" : "", oninput: (e) => (c.userEdited[x.id] = e.target.value) });
        ta.value = c.composerValue(x);
        read.append(h("div", { class: "ol-reply" },
          tiaBanner(c, x, x.live ? (x.state === "edited" ? A.savedBanner : A.banner) : open ? "Tia drafted this reply – edit it, or save it as a draft." : x.state === "handled" ? "Tia handled this message with the reply below." : "Saved as a draft in Outlook."),
          h("div", { class: "ol-line" }, h("span", { class: "k" }, "From"), h("span", {}, A.from || "info@oakline-studio.example")),
          h("div", { class: "ol-line" }, h("span", { class: "k" }, "To"), h("span", { class: "ol-pill" }, c.avatar(x.from), x.address)),
          ta,
          h("div", { class: "ol-rbar" },
            h("div", { class: "ol-send" }, h("button", { disabled: !open, onclick: () => c.decide(x, ta.value) }, "Save draft"), h("button", { disabled: !open, title: "More" }, I("chevron_down"))),
            h("button", { class: "ol-btn", disabled: !open, onclick: () => ((c.userEdited[x.id] = x.draft), c.typeDraft(x, ta)) }, "Let Tia write"),
            h("button", { class: "ol-btn", disabled: !open, onclick: () => c.reject(x) }, "Discard"),
            h("div", { class: "ic" }, I("attach"), I("image"), I("emoji")),
            h("span", { class: "note" }, A.note || "Tia never sends – you press Send in Outlook.")),
          c.steps(x)));
        if (c.pendingFor(x.id)) c.typeDraft(x, ta);
      }
    } else read.append(h("div", { class: "ch-empty" }, "Select an item to read. Nothing is selected."));
    return h("div", { class: "ol" },
      h("div", { class: "ol-head" }, h("div", { class: "waffle" }, I("grid_dots")), h("div", { class: "name" }, "Mail"),
        h("div", { class: "search" }, I("search"), "Search"),
        h("div", { class: "right" }, h("div", {}, I("megaphone")), h("div", {}, I("alert")), h("div", {}, I("settings")), h("div", {}, I("question_circle")), h("div", { class: "me" }, A.initials || "MO"))),
      h("div", { class: "ol-main" },
        h("div", { class: "ol-apps" }, h("div", { class: "on" }, I("mail_filled")), h("div", {}, I("calendar")), h("div", {}, I("people")), h("div", {}, I("checkmark_square")), h("div", {}, I("grid_dots"))),
        h("div", { class: "ol-work" },
          h("div", { class: "ol-ribbon" },
            h("div", { class: "ol-tabs" }, h("span", { class: "on" }, "Home"), h("span", {}, "View"), h("span", {}, "Help")),
            h("div", { class: "ol-cmds" },
              h("button", { class: "ol-cmd new", onclick: () => alert("New mail: ask Tia on the Tia tab – e.g. “Write to Ieva about the worktop”.") }, I("mail"), "New mail"),
              ...[["delete", "Delete"], ["archive", "Archive"], ["warning", "Report"]].map(([i, t]) => h("button", { class: "ol-cmd" }, I(i), t)),
              h("span", { class: "ol-sep" }),
              ...[["folder", "Move to"], ["arrow_reply", "Reply"], ["arrow_reply_all", "Reply all"], ["arrow_forward", "Forward"]].map(([i, t]) => h("button", { class: "ol-cmd" }, I(i), t)),
              h("span", { class: "ol-sep" }),
              ...[["mail_read", "Read / Unread"], ["flag", "Flag"], ["pin", "Pin"]].map(([i, t]) => h("button", { class: "ol-cmd" }, I(i), t)),
              h("button", { class: "ol-cmd" }, I("more_horizontal")))),
          h("div", { class: "ol-panes" }, folders, list, read))));
  }

  // ============================ WHATSAPP ============================
  function wa(c, items, x) {
    const { h } = c;
    const list = h("div", { class: "wa-list" }, items.map((i) =>
      h("div", { class: `wa-row ${i.state === "open" ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => c.select(i.id) },
        c.avatar(i.from), h("div", { class: "mid" },
          h("div", { class: "l1" }, h("span", { class: "nm" }, i.from), h("span", { class: "tm" }, i.time)),
          h("div", { class: "l2" }, h("span", {}, i.text), i.state === "open" ? h("span", { class: "cnt" }, "1") : null)))));
    const main = h("div", { class: "wa-main" });
    if (x) {
      const open = x.state === "open" || (x.live && x.state === "edited");
      const msgs = h("div", { class: "wa-msgs" },
        h("div", { class: "wa-enc" }, "Messages are end-to-end encrypted. No one outside of this chat can read them."));
      if (x.thread) {
        // a real chat (WhatsApp Business webhook): the whole conversation, grouped by day
        let day = "";
        for (const m of x.thread) {
          const d = new Date(m.at);
          const label = d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
          if (label !== day) msgs.append(h("div", { class: "wa-day" }, (day = label)));
          msgs.append(h("div", { class: `wb ${m.dir === "in" ? "in" : "out"}` }, m.text, h("span", { class: "t" }, d.toTimeString().slice(0, 5))));
        }
      } else msgs.append(h("div", { class: "wa-day" }, "Today"), h("div", { class: "wb in" }, x.text, h("span", { class: "t" }, x.time)));
      if (!open && x.draft) msgs.append(h("div", { class: "wb out draft" }, h("span", { class: "lbl" }, x.state === "handled" ? "Tia · handled" : "Tia · draft"), x.draft, h("span", { class: "t" }, x.time)));
      main.append(
        h("div", { class: "wa-chathead" }, c.avatar(x.from), h("div", {}, h("div", { class: "nm" }, x.from), h("div", { class: "s" }, x.live ? x.address : "click here for contact info")), h("span", { class: "sp" }), h("div", { class: "ic" }, I("video"), I("search"), I("more_vertical"))),
        msgs);
      if (open) {
        const ta = c.textarea(x, "Type a message");
        main.append(h("div", { class: "wa-tia" }, tiaBanner(c, x, x.live ? (c.acct && c.acct.banner) || "" : "Tia's draft is in the message box – change it or press send: WhatsApp opens with the text, you press send."), c.steps(x)),
          h("div", { class: "wa-compose" }, h("div", { class: "ic" }, I("add")), h("div", { class: "ic" }, I("emoji")), ta,
            x.live ? h("button", { class: "wa-redo", title: "Let Tia write it again", onclick: () => c.typeDraft(x, ta) }, I("sparkle")) : "",
            h("button", { class: "wa-send", title: x.live ? "Save the draft and copy it" : "Open in WhatsApp", onclick: () => c.decide(x, ta.value) }, I("send_filled"))));
      } else main.append(h("div", { class: "wa-tia" }, c.chip(x), c.steps(x)), h("div", { class: "wa-compose" }, h("div", { class: "ic" }, I("add")), h("div", { class: "ic" }, I("emoji")), h("textarea", { rows: 1, placeholder: "Type a message" }), h("div", { class: "ic" }, I("mic"))));
    } else main.append(h("div", { class: "ch-empty" }, "Send and receive messages without keeping your phone online."));
    return h("div", { class: "wa" },
      h("div", { class: "wa-nav" }, h("div", { class: "on" }, I("chat_multiple_filled")), h("div", {}, I("record")), h("div", {}, I("megaphone")), h("div", {}, I("people_community")), h("span", { class: "sp" }), h("div", {}, I("settings")), c.avatar("Mārtiņš Ozols")),
      h("div", { class: "wa-side" },
        h("div", { class: "wa-head" }, "Chats", h("span", { class: "sp" }), h("div", {}, I("compose")), h("div", {}, I("more_vertical"))),
        h("div", { class: "wa-search" }, h("div", {}, I("search"), "Search or start a new chat")),
        h("div", { class: "wa-chips" }, h("span", { class: "on" }, "All"), h("span", {}, "Unread"), h("span", {}, "Favourites"), h("span", {}, "Groups")),
        list),
      main);
  }

  // ============================ INSTAGRAM ============================
  function ig(c, items, x) {
    const { h } = c;
    const list = h("div", { class: "ig-list" }, items.map((i) =>
      h("div", { class: `ig-row ${i.state === "open" ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => c.select(i.id) },
        c.avatar(i.from), h("div", { class: "tx" }, h("div", { class: "nm" }, i.from.replace(/^@/, "")), h("div", { class: "pv" }, `${i.text.slice(0, 38)} · ${i.time}`)), i.state === "open" ? h("span", { class: "dot" }) : null)));
    const main = h("div", { class: "ig-main" });
    if (x) {
      const open = x.state === "open";
      const user = x.from.replace(/^@/, "");
      const msgs = h("div", { class: "ig-msgs" },
        h("div", { class: "ig-intro" }, c.avatar(x.from), h("div", { class: "nm" }, user), h("div", { class: "un" }, `${user} · Instagram`), h("button", {}, "View profile")),
        h("div", { class: "ig-time" }, `Today ${x.time}`),
        h("div", { class: "igb in" }, x.text));
      if (!open && x.draft) msgs.append(h("div", { class: "igb draft" }, h("span", { class: "lbl" }, x.state === "handled" ? "Tia · handled" : "Tia · draft"), x.draft));
      main.append(h("div", { class: "ig-head" }, c.avatar(x.from), h("div", {}, h("div", { class: "nm" }, user), h("div", { class: "un" }, user)), h("span", { class: "sp" }), h("div", { class: "ic" }, I("call"), I("video"), I("info"))), msgs);
      if (open) {
        const ta = c.textarea(x, "Message...");
        main.append(h("div", { class: "ig-tia" }, tiaBanner(c, x, "Tia's reply is in the message box – edit it and press Send. Tia never posts by herself."), c.steps(x)),
          h("div", { class: "ig-compose" }, I("emoji"), ta, h("button", { onclick: () => c.decide(x, ta.value) }, "Send")));
      } else main.append(h("div", { class: "ig-tia" }, c.chip(x), c.steps(x)), h("div", { class: "ig-compose" }, I("emoji"), h("textarea", { rows: 1, placeholder: "Message..." }), I("mic"), I("image"), I("heart")));
    } else main.append(h("div", { class: "ch-empty" }, "Your messages – send a message to start a chat."));
    return h("div", { class: "ig" },
      h("div", { class: "ig-nav" }, ...["home", "search", "compass_northwest", "play_circle", "send_filled", "heart", "add"].map((n) => h("div", {}, I(n))), h("div", {}, c.avatar("Oakline Studio")), h("span", { class: "sp" }), h("div", {}, I("more_horizontal"))),
      h("div", { class: "ig-side" },
        h("div", { class: "ig-me" }, "oakline.studio", I("chevron_down"), h("span", { class: "sp" }), I("compose")),
        h("div", { class: "ig-notes" }, h("div", { class: "ig-note" }, h("span", { class: "bubble" }, "New kitchens 🌿"), c.avatar("Oakline Studio"), "Your note")),
        h("div", { class: "ig-tabs" }, h("span", {}, "Messages"), h("span", {}, "Requests")),
        list),
      main);
  }

  // ============================ SLACK ============================
  function slack(c, items, x) {
    const { h } = c;
    const A = c.acct || {};
    const ws = A.ws || "Oakline Studio";
    const chans = {};
    for (const i of items) (chans[i.address || "#general"] = chans[i.address || "#general"] || []).push(i);
    if (x && !chans[x.address]) x = items[0];
    const side = h("div", { class: "sl-side" },
      h("div", { class: "sl-wsn" }, ws, I("chevron_down"), h("span", { class: "sp" }), h("div", {}, I("compose"))),
      h("div", { class: "sl-item" }, I("chat_multiple"), "Threads"), h("div", { class: "sl-item" }, I("send"), "Drafts & sent"),
      h("div", { class: "sl-sec" }, I("chevron_down"), "Channels"),
      Object.entries(chans).map(([name, list]) => {
        const open = list.filter((i) => i.state === "open" && !i.placeholder).length;
        return h("div", { class: `sl-item ${open ? "unread" : ""} ${x && x.address === name ? "on" : ""}`, onclick: () => c.select((list.find((i) => i.placeholder) || list[list.length - 1]).id) }, h("span", {}, "#"), h("span", {}, name.replace(/^#/, "")), open ? h("span", { class: "cnt" }, open) : "");
      }),
      A.live ? "" : h("div", { class: "sl-item" }, "#", h("span", {}, "general")),
      h("div", { class: "sl-sec" }, I("chevron_down"), "Direct messages"),
      (A.live ? ["Tia (assistant)"] : ["Tia (assistant)", "Elīna Zariņa", "Kaspars Liepiņš"]).map((n) => h("div", { class: "sl-item" }, c.avatar(n), n)),
      h("div", { class: "sl-sec" }, I("chevron_down"), "Apps"), h("div", { class: "sl-item" }, c.avatar("Tia"), "Tia"));
    const main = h("div", { class: "sl-main" });
    if (x) {
      const msgs = h("div", { class: "sl-msgs" }, h("div", { class: "sl-day" }, h("span", {}, "Today")));
      for (const i of chans[x.address]) {
        if (i.placeholder) continue; // the channel's "new message" composer, not a message
        msgs.append(h("div", { class: "sl-msg", onclick: () => c.select(i.id) }, c.avatar(i.from), h("div", {}, h("span", { class: "nm" }, i.from), h("span", { class: "tm" }, i.time), h("div", { class: "tx" }, i.text))));
        if (i.state !== "open" && i.draft) msgs.append(h("div", { class: "sl-msg draft" }, c.avatar("Tia"), h("div", {}, h("span", { class: "nm" }, "Tia"), h("span", { class: "app" }, "APP"), h("span", { class: "tm" }, i.state === "handled" ? "handled" : "draft"), h("div", { class: "tx" }, i.draft))));
      }
      const open = x.state === "open";
      main.append(
        h("div", { class: "sl-head" }, h("div", { class: "t" }, `# ${x.address.replace(/^#/, "")}`, I("chevron_down"), h("span", { class: "sp" }), A.live ? "" : h("div", { class: "mem" }, c.avatar("Elīna Zariņa"), c.avatar("Kaspars Liepiņš"), "6")),
          h("div", { class: "sl-htabs" }, h("span", { class: "on" }, I("chat_multiple"), "Messages"), h("span", {}, I("notebook"), "Add canvas"), h("span", {}, I("bookmark"), "Bookmarks"))),
        msgs);
      if (open) {
        const ta = c.textarea(x, `Message ${x.address}`);
        if (A.live && chans[x.address].every((i) => i.placeholder)) msgs.append(h("div", { class: "sl-emptych" }, `This is the very beginning of ${x.address}. Write the first message below – Tia keeps it as a draft for you to post.`));
        main.append(h("div", { class: "sl-tia" }, tiaBanner(c, x, A.live ? A.banner : "Tia's reply is in the message box – edit it, then use it. Tia never posts by herself."), c.steps(x)),
          h("div", { class: "sl-compose" },
            h("div", { class: "sl-fmt" }, ...["text_bold", "text_italic", "text_strikethrough"].map((n) => h("div", {}, I(n))), h("span", { class: "bar" }), h("div", {}, I("link")), h("span", { class: "bar" }), h("div", {}, I("list")), h("div", {}, I("code"))),
            ta,
            h("div", { class: "sl-act" }, h("div", {}, I("add")), h("div", {}, I("text_font")), h("div", {}, I("emoji")), h("div", {}, I("mention")), h("span", { class: "bar" }), h("div", {}, I("video")), h("div", {}, I("mic")), h("span", { class: "sp" }),
              A.live && !x.placeholder ? h("button", { class: "ghost", onclick: () => c.typeDraft(x, ta) }, "Let Tia write") : "",
              h("button", { class: "ghost", onclick: () => c.reject(x) }, "Not now"),
              h("div", { class: "sl-sendb" }, h("button", { title: A.live ? "Save as a draft (you post it in Slack)" : "Use Tia's reply", onclick: () => c.decide(x, ta.value) }, I("send_filled")), h("button", {}, I("chevron_down"))))));
      } else main.append(h("div", { class: "sl-tia" }, c.chip(x), c.steps(x)));
    } else main.append(h("div", { class: "ch-empty" }, "No messages yet."));
    return h("div", { class: "sl" },
      h("div", { class: "sl-top" }, h("div", { class: "search" }, I("search"), `Search ${ws}`)),
      h("div", { class: "sl-body" },
        h("div", { class: "sl-rail" }, h("div", { class: "sl-ws" }, ws.slice(0, 2).toUpperCase()), ...[["home_filled", "Home", true], ["chat_multiple", "DMs"], ["alert", "Activity"], ["bookmark", "Later"], ["more_horizontal", "More"]].map(([n, t, on]) => h("div", { class: `it ${on ? "on" : ""}` }, h("div", {}, I(n)), t))),
        side, main));
  }

  window.TiaApps = { mail, wa, ig, slack, I };
})();

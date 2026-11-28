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
  // ---------- profile pictures for the demo's people: a small illustrated portrait per name (no real photos) ----------
  const hash = (s) => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const BGS = ["#C9D7E8", "#E8D5C4", "#D4E4D0", "#E6D3E8", "#F1E3C4", "#CFE3E6", "#E9CFCF", "#D9D4EC", "#DDE6C8", "#F0D9C9"];
  const SKIN = ["#F2D3BD", "#EAC3A6", "#E0B08F", "#F5DCCB", "#D9A583", "#EFCBB0"];
  const HAIR = ["#2B1E17", "#4A3222", "#6B4A2E", "#A0704A", "#C9A26B", "#E3C58F", "#3A3A3A", "#8C5A3C", "#1D1D1D"];
  const SHIRT = ["#2F4858", "#33658A", "#86BBD8", "#758E4F", "#F6AE2D", "#F26419", "#55505C", "#9C6644", "#3D5A80", "#E07A5F", "#81B29A", "#264653"];
  const female = (name) => {
    const first = String(name).trim().split(/\s+/)[0].replace(/[^\p{L}]/gu, "").toLowerCase();
    return /[ae]$/.test(first) && !/^(ojārs|juris|jānis|ivo)$/.test(first);
  };
  function faceSvg(name) {
    const n = hash(name);
    const pick = (arr, k) => arr[(n >>> k) % arr.length];
    const bg = pick(BGS, 1), skin = pick(SKIN, 3), hair = pick(HAIR, 5), shirt = pick(SHIRT, 7);
    const f = female(name);
    const style = (n >>> 9) % 3;
    const glasses = (n >>> 11) % 5 === 0;
    const beard = !f && (n >>> 13) % 4 === 0;
    const back = f ? (style === 0 ? `<path d="M15 30c0-12 7-20 17-20s17 8 17 20v20H15z" fill="${hair}"/>` : style === 1 ? `<path d="M17 28c0-11 6-18 15-18s15 7 15 18v12c0 4-3 6-6 6H23c-3 0-6-2-6-6z" fill="${hair}"/>` : `<circle cx="32" cy="12" r="7" fill="${hair}"/><path d="M18 28c0-10 6-17 14-17s14 7 14 17v4H18z" fill="${hair}"/>`) : "";
    const top = f
      ? `<path d="M20 27c1-9 6-14 12-14s11 5 12 14c-4-4-9-6-14-6-4 0-7 2-10 6z" fill="${hair}"/>`
      : style === 0 ? `<path d="M20 26c0-9 5-14 12-14s12 5 12 14c-2-3-5-5-9-5h-6c-4 0-7 2-9 5z" fill="${hair}"/>`
      : style === 1 ? `<path d="M20 25c0-8 6-13 12-13 7 0 12 5 12 12-3-2-6-3-12-3-5 0-9 2-12 4z" fill="${hair}"/>`
      : `<path d="M21 23c1-7 6-10 11-10s10 3 11 10c-3-1-7-2-11-2s-8 1-11 2z" fill="${hair}"/>`;
    return `<svg viewBox="11 9 42 42" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="${bg}"/>${back}`
      + `<path d="M10 64c2-11 10-17 22-17s20 6 22 17z" fill="${shirt}"/><path d="M27 41h10v8c0 3-2 4-5 4s-5-1-5-4z" fill="${skin}"/>`
      + `<ellipse cx="32" cy="30" rx="11.5" ry="13" fill="${skin}"/>${top}`
      + (beard ? `<path d="M21 32c1 8 5 12 11 12s10-4 11-12c-2 3-5 4-11 4s-9-1-11-4z" fill="${hair}"/>` : "")
      + `<circle cx="27.5" cy="31" r="1.4" fill="#2A2320"/><circle cx="36.5" cy="31" r="1.4" fill="#2A2320"/>`
      + `<path d="M28.5 37.2c2 1.6 5 1.6 7 0" stroke="#9A5B4A" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
      + (glasses ? `<g fill="none" stroke="#2A2320" stroke-width="1.1"><circle cx="27.5" cy="31" r="3.6"/><circle cx="36.5" cy="31" r="3.6"/><path d="M31.1 31h1.8"/></g>` : "")
      + `</svg>`;
  }
  // a portrait (or the business's own logo for the business's accounts)
  function face(h, name, cls = "") {
    const el = h("div", { class: `face ${cls}`, title: name });
    el.innerHTML = /oakline/i.test(name) ? '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#2E3B2F"/><path d="M32 12c-8 9-12 17-12 24a12 12 0 0 0 24 0c0-7-4-15-12-24z" fill="#C8A96E"/><path d="M32 22v30" stroke="#2E3B2F" stroke-width="2.4"/></svg>' : faceSvg(name);
    return el;
  }
  const isOpen = (x) => x.state === "open" || x.state === "new" || (x.live && x.state === "edited");
  const replyable = (x) => x.draft || x.live || x.state === "new";

  // ============================ OUTLOOK ============================
  // Outlook on the web: folder pane, Focused/Other, date groups, colour categories, search across all folders.
  // Tia sorts every mail into a category (demo: rules on the fictional mail; live: the AI, written to Outlook / Gmail).
  const W = () => window.TiaWorld || { CATS: {}, mail: [], DESK_CATS: {} };
  const DAY = 864e5;
  let folder = "inbox"; // inbox drafts sent deleted junk archive needs handled  cat:<name>
  let mailAcct = "all"; // live: all inboxes, or only Gmail / only Outlook
  let composing = null; // { to, subject, text } while writing a new mail
  let focusTab = "focused";
  let focusedOn = true; // View → Focused Inbox
  let unreadOnly = false;
  let ribbonTab = "home";
  let catMenu = false;
  let readingPane = true;
  let sorted = false; // demo: Tia has sorted today's mails (their categories show)
  let sortMsg = null; // { busy, text }
  let mailSel = null; // the open mail (also the world's mails, which views.js doesn't know)
  let lastViewSel = null;
  const moved = {}; // id → folder (Delete / Archive / Junk in the demo)
  const readSt = {}; // id → true/false
  const flagged = {};
  const catsSet = {}; // id → categories set by hand or by "Sort with Tia" (live)
  function whenOf(i) {
    if (i._when) return i._when;
    let t;
    if (i.d !== undefined) {
      const [hh, mm] = String(i.t || "09:00").split(":").map(Number);
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      t = d.getTime() - i.d * DAY;
    } else if (i.received) t = Date.parse(String(i.received).replace(" ", "T"));
    if (!t || isNaN(t)) {
      const [hh, mm] = String(i.time || "").split(":").map(Number);
      const d = new Date();
      if (!isNaN(hh)) d.setHours(hh, mm || 0, 0, 0);
      t = d.getTime();
    }
    return (i._when = t);
  }
  function groupOf(t) {
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    const s = d0.getTime();
    if (t >= s) return "Today";
    if (t >= s - DAY) return "Yesterday";
    const dow = (d0.getDay() + 6) % 7;
    if (t >= s - dow * DAY) return "This week";
    if (t >= s - (dow + 7) * DAY) return "Last week";
    return "Older";
  }
  function shortTime(t) {
    const d = new Date(t);
    const g = groupOf(t);
    const hm = d.toTimeString().slice(0, 5);
    if (g === "Today") return hm;
    if (g === "Yesterday" || g === "This week") return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${hm}`;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
  }
  const longTime = (t) => {
    const d = new Date(t);
    return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${d.toTimeString().slice(0, 5)}`;
  };
  // Tia's quick sort for the demo's mail (the live Tia asks the AI instead)
  function guessCats(i) {
    const s = `${i.from} ${i.address} ${i.subject} ${i.text}`.toLowerCase();
    const out = [];
    if (/bank details|new account|iban|wire transfer|verify your|you have won|prize/.test(s)) out.push("Suspicious");
    else if (/invoice|rēķin|receipt|vat|statement|payment|accounting|grāmat/.test(s)) out.push("Finance");
    else if (/newsletter|unsubscribe|trends|webinar|news@/.test(s)) out.push("Newsletters");
    else if (/noreply|no-reply|review/.test(s)) out.push("Updates");
    else if (/order|delivery|countertop|supplier|confirmation/.test(s)) out.push("Suppliers");
    else if (/quote|estimate|website form|request|renovat|price|cost|partnership/.test(s)) out.push("Leads");
    else if (/@oakline-studio/.test(s)) out.push("Team");
    else out.push("Clients");
    if (/urgent|asap|late|delay|complain|by friday|deadline/.test(s) && !out.includes("Suspicious")) out.push("Action needed");
    return out;
  }
  const isLiveMail = (i) => !!i.live;
  function catsOf(i) {
    if (catsSet[i.id]) return catsSet[i.id];
    if (i.cats) return i.cats;
    if (i.deskCats) return sorted || (i.state && i.state !== "new") ? i.deskCats : [];
    return [];
  }
  const folderOf = (i) => moved[i.id] || i.folder || "inbox";
  const unreadOf = (i) => (readSt[i.id] !== undefined ? !readSt[i.id] : i.isDraft || i.folder === "sent" ? false : i.read !== undefined ? !i.read : i.unread !== undefined ? !!i.unread : isOpen(i) && i.state !== "edited");
  const isOther = (i) => {
    const c = i.cats || i.deskCats || catsOf(i);
    return (c.includes("Newsletters") || c.includes("Updates")) && !c.includes("Action needed");
  };
  // every mail the view knows: today's (Tia's desk or the live inboxes), the demo's history, and the drafts Tia made
  function allMail(items, A) {
    const out = [];
    for (const i of items) {
      if (!i.live && !i.deskCats) i.deskCats = W().DESK_CATS[i.id] || guessCats(i);
      if (i.draftOnly || i.folder === "drafts") {
        i.isDraft = true;
        i.folder = "drafts";
      }
      out.push(i);
      // a reply Tia saved → it also sits in Drafts, like in Outlook
      if (!i.draftOnly && ["approved", "edited"].includes(i.state) && i.draft) {
        i._draftAt = i._draftAt || Date.now();
        out.push({ id: `dr_${i.id}`, folder: "drafts", isDraft: true, of: i, live: i.live, from: i.from, address: i.address, subject: `Re: ${String(i.subject || "").replace(/^re:\s*/i, "")}`, text: i.draft, received: new Date(i._draftAt).toISOString(), state: "edited", cats: catsOf(i), actions: i.actions });
      }
    }
    if (!A.live) for (const m of W().mail) out.push(m);
    return out;
  }
  function hl(h, text, q) {
    const s = String(text || "");
    if (!q) return s;
    const at = s.toLowerCase().indexOf(q);
    if (at < 0) return s;
    return [s.slice(0, at), h("mark", {}, s.slice(at, at + q.length)), s.slice(at + q.length)];
  }
  function catTag(h, name, onclick) {
    const c = W().CATS[name] || { color: "#605E5C", bg: "#EDEBE9" };
    const t = h("span", { class: "ox-cat", title: `Category: ${name}${onclick ? " – click to see all" : ""}`, onclick }, name);
    t.style.background = c.bg;
    t.style.color = c.color;
    return t;
  }
  function catDot(h, name) {
    const d = h("span", { class: "ox-dot" });
    d.style.background = (W().CATS[name] || {}).color || "#605E5C";
    return d;
  }

  function mail(c, items, x) {
    const { h } = c;
    const A = c.acct || {};
    const q = query.email.trim().toLowerCase();
    const all = allMail(items, A);
    // views.js picks a mail (Tia follows her work) → open it; otherwise keep what the owner clicked
    if (x && x.id !== lastViewSel) mailSel = x.id;
    lastViewSel = x ? x.id : null;
    const inAcct = (i, acc = mailAcct) => !A.accounts || acc === "all" || i.live === acc;
    const inF = (i, f) => {
      if (f.startsWith("cat:")) return catsOf(i).includes(f.slice(4)) && folderOf(i) !== "deleted";
      if (f === "needs") return i.state === "open" && !i.live && folderOf(i) === "inbox";
      if (f === "handled") return i.state === "handled" && folderOf(i) === "inbox";
      return folderOf(i) === f;
    };
    let shown = q
      ? all.filter((i) => inAcct(i) && `${i.from} ${i.address} ${i.subject || ""} ${i.text} ${catsOf(i).join(" ")}`.toLowerCase().includes(q))
      : all.filter((i) => inAcct(i) && inF(i, folder));
    const pivot = !q && folder === "inbox" && !A.live && focusedOn;
    const nOther = pivot ? shown.filter((i) => isOther(i) && unreadOf(i)).length : 0;
    if (pivot) shown = shown.filter((i) => (focusTab === "other") === isOther(i));
    if (unreadOnly) shown = shown.filter(unreadOf);
    shown.sort((a, b) => whenOf(b) - whenOf(a));
    let sel = all.find((i) => i.id === mailSel);
    if (!sel || !shown.includes(sel)) sel = composing ? null : shown[0];
    if (sel && sel.id !== mailSel) mailSel = sel.id;
    const open = (i) => {
      composing = null;
      catMenu = false;
      mailSel = i.id;
      readSt[i.id] = true;
      if (items.includes(i)) c.select(i.id);
      else c.render();
    };
    const go = (f, acc = mailAcct) => ((folder = f), (mailAcct = acc), (composing = null), (catMenu = false), (query.email = ""), (focusTab = "focused"), c.render());

    // ---------- folder pane ----------
    const count = (f, acc = mailAcct) => all.filter((i) => inAcct(i, acc) && inF(i, f) && (f === "drafts" || f.startsWith("cat:") ? true : unreadOf(i))).length;
    const F = (key, icon, label, { acc = mailAcct, cls = "", show } = {}) => {
      const n = show === false ? 0 : count(key, acc);
      return h("div", { class: `ol-f ${folder === key && mailAcct === acc && !q ? "on" : ""} ${cls}`, onclick: () => go(key, acc) }, I(icon), h("span", { class: "fl" }, label), n ? h("span", { class: `n ${key === "drafts" ? "grey" : ""}` }, n) : "");
    };
    const usedCats = Object.keys(W().CATS).filter((k) => all.some((i) => catsOf(i).includes(k)));
    const catList = usedCats.length
      ? [h("div", { class: "ox-grp" }, I("chevron_down"), "Categories", h("span", { class: "by" }, "by Tia")),
         ...usedCats.map((k) => h("div", { class: `ol-f cat ${folder === `cat:${k}` && !q ? "on" : ""}`, onclick: () => go(`cat:${k}`) }, catDot(h, k), h("span", { class: "fl" }, k), h("span", { class: "n grey" }, all.filter((i) => catsOf(i).includes(k) && folderOf(i) !== "deleted").length)))]
      : [];
    const folders = A.accounts
      ? h("div", { class: "ol-folders" },
          h("div", { class: "ox-grp" }, I("chevron_down"), "Favorites"),
          F("inbox", "mail_inbox", "All inboxes", { acc: "all" }),
          A.accounts.map((a) => [h("div", { class: "ox-grp acct" }, I("chevron_down"), h("span", { class: `ol-app ${a.key}` }, a.label), h("span", { class: "nm" }, a.name)),
            F("inbox", "mail_inbox", "Inbox", { acc: a.key }), F("drafts", "drafts", "Drafts", { acc: a.key }), F("sent", "send", "Sent Items", { acc: a.key, show: false })]).flat(),
          catList)
      : h("div", { class: "ol-folders" },
          h("div", { class: "ox-grp acct" }, I("chevron_down"), h("span", { class: "nm" }, A.box || W().BOX || "info@oakline-studio.example")),
          F("inbox", "mail_inbox", "Inbox"), F("drafts", "drafts", "Drafts"), F("sent", "send", "Sent Items", { show: false }), F("deleted", "delete", "Deleted Items", { show: false }), F("junk", "warning", "Junk Email"), F("archive", "archive", "Archive", { show: false }),
          h("div", { class: "ox-grp tia" }, I("sparkle"), "Tia"), F("needs", "alert", "Needs you", { cls: "tia" }), F("handled", "checkmark", "Handled by Tia", { cls: "tia", show: false }),
          catList);

    // ---------- message list ----------
    const fname = folder.startsWith("cat:") ? folder.slice(4) : { inbox: A.accounts && mailAcct === "all" ? "All inboxes" : "Inbox", drafts: "Drafts", sent: "Sent Items", deleted: "Deleted Items", junk: "Junk Email", archive: "Archive", needs: "Needs you", handled: "Handled by Tia" }[folder];
    const list = h("div", { class: "ol-card ox-list" });
    list.append(h("div", { class: "ol-lhd" },
      q ? h("span", {}, "Results") : [folder.startsWith("cat:") ? catDot(h, folder.slice(4)) : "", h("span", {}, A.accounts && mailAcct !== "all" ? `${mailAcct === "outlook" ? "Outlook" : "Gmail"} · ${fname}` : fname)],
      h("span", { class: "sp" }),
      h("button", { class: `ox-ib ${unreadOnly ? "on" : ""}`, title: unreadOnly ? "Showing unread only – click to show all" : "Filter: show unread only", onclick: () => ((unreadOnly = !unreadOnly), c.render()) }, I("filter"))));
    if (pivot) list.append(h("div", { class: "ol-pivot" },
      h("span", { class: focusTab === "focused" ? "on" : "", onclick: () => ((focusTab = "focused"), c.render()) }, "Focused"),
      h("span", { class: focusTab === "other" ? "on" : "", onclick: () => ((focusTab = "other"), c.render()) }, "Other", nOther ? h("b", { class: "ox-pn" }, nOther) : "")));
    if (q) list.append(h("div", { class: "ox-res" }, `${shown.length} result${shown.length === 1 ? "" : "s"} in all folders for “${query.email.trim()}”`));
    if (sortMsg) list.append(h("div", { class: `ox-sortbar ${sortMsg.busy ? "busy" : ""}` }, I("sparkle"), h("span", {}, sortMsg.text), sortMsg.busy ? "" : h("button", { class: "x", title: "Close", onclick: () => ((sortMsg = null), c.render()) }, "×")));
    let grp = "";
    for (const i of shown) {
      const t = whenOf(i);
      const g = groupOf(t);
      if (g !== grp && !q) list.append(h("div", { class: "ol-group" }, (grp = g)));
      const cats = catsOf(i);
      const un = unreadOf(i);
      const who = i.folder === "sent" || i.isDraft ? i.from : i.from;
      list.append(h("div", { class: `ol-row ${un ? "unread" : ""} ${sel && i.id === sel.id && !composing ? "sel" : ""} ${flagged[i.id] ? "flag" : ""}`, onclick: () => open(i) },
        c.avatar(who),
        h("div", { class: "who" }, i.isDraft ? h("span", { class: "ox-dr" }, "[Draft] ") : "", hl(h, who, q)),
        h("div", { class: "time" }, flagged[i.id] ? h("span", { class: "ox-flag" }, I("flag")) : "", i.attach ? h("span", { class: "ox-att" }, I("attach")) : "", shortTime(t)),
        h("div", { class: "subj" }, A.accounts ? h("span", { class: `ol-app ${i.live}` }, i.live === "outlook" ? "Outlook" : "Gmail") : "", hl(h, i.subject || "(No subject)", q)),
        h("div", { class: "prev" }, items.includes(i) ? c.chip(i) : "", h("span", { class: "pt" }, hl(h, String(i.text || "").replace(/\s+/g, " ").slice(0, 110), q))),
        cats.length ? h("div", { class: "cats" }, cats.map((k) => catTag(h, k))) : ""));
    }
    if (!shown.length) list.append(h("div", { class: "ox-empty" }, h("div", { class: "big" }, q ? "No results" : unreadOnly ? "No unread mail" : folder === "drafts" ? "No drafts" : "All done for the day"), h("div", {}, q ? "Try other words – Tia searches sender, subject, text and categories in all folders." : folder === "drafts" ? "Answer a mail and press Save draft – Tia never sends." : "Enjoy your empty folder.")));

    // ---------- reading pane ----------
    const read = h("div", { class: "ol-card ol-read" });
    if (composing) read.append(composeView(c, A));
    else if (sel) {
      const cats = catsOf(sel);
      const sent = sel.folder === "sent";
      read.append(h("div", { class: "ol-subj" }, hl(h, sel.subject || "(No subject)", q), h("span", { class: "sp" }), flagged[sel.id] ? h("span", { class: "ox-flag" }, I("flag")) : ""));
      if (cats.length) read.append(h("div", { class: "ox-cats" }, cats.map((k) => catTag(h, k, () => go(`cat:${k}`)))));
      if (cats.includes("Suspicious")) read.append(h("div", { class: "ox-warn" }, I("warning"), h("div", {}, h("b", {}, "Tia: this looks like a scam. "), sel.reason || (sel.folder === "junk" ? "A prize you never entered for, from an unknown sender. Don't click anything." : "The request to change bank details comes from a look-alike address, not the supplier's real domain. Don't pay to the new account – call the supplier on the number you already have."))));
      else if (sel.summary) read.append(h("div", { class: "ox-sum" }, I("sparkle"), h("div", {}, h("b", {}, "Tia's summary: "), sel.summary)));
      const msg = h("div", { class: "ol-msg" });
      const fromName = sent || sel.isDraft ? (A.fromOf && A.fromOf(sel)) || W().ME || "Mārtiņš Ozols" : sel.from;
      const fromAddr = sent || sel.isDraft ? (A.fromOf && A.fromOf(sel)) || W().BOX : sel.address;
      const replyNow = () => (replyable(sel) && !sel.isDraft && sel.folder !== "sent" && document.querySelector(".ol-reply textarea") ? document.querySelector(".ol-reply textarea").focus() : startReply(c, sel, "re"));
      msg.append(h("div", { class: "ol-from" },
        c.avatar(fromName),
        h("div", { class: "n" }, fromName, " ", h("span", {}, fromAddr ? `<${fromAddr}>` : "")),
        h("div", { class: "acts" },
          h("button", { class: "ox-ib", title: "Reply", onclick: replyNow }, I("arrow_reply")),
          h("button", { class: "ox-ib", title: "Forward", onclick: () => startReply(c, sel, "fw") }, I("arrow_forward")),
          h("div", { class: "t" }, longTime(whenOf(sel)))),
        h("div", { class: "to" }, sel.isDraft ? h("span", { class: "ox-dr" }, `[Draft] to ${sel.from} <${sel.address}>`) : sent ? `To: ${sel.from} <${sel.address}>` : `To: ${(A.fromOf && A.fromOf(sel)) || A.me || "Mārtiņš Ozols"}`)));
      if (sel.attach) msg.append(h("div", { class: "ox-attrow" }, String(sel.attach).split(/,\s*/).map((f) => h("div", { class: "ox-file" }, h("span", { class: `ft ${/\.pdf$/i.test(f) ? "pdf" : "img"}` }, /\.pdf$/i.test(f) ? "PDF" : "JPG"), h("div", {}, h("div", { class: "fn" }, f), h("div", { class: "fs" }, /\.pdf$/i.test(f) ? "212 KB" : "2 MB"))))));
      msg.append(h("div", { class: "ol-body" }, hl(h, sel.text, q)));
      read.append(msg);
      if (sel.isDraft) read.append(h("div", { class: "ol-reply" }, tiaBanner(c, sel.of || sel, sel.live ? `Tia saved this draft in ${sel.live === "outlook" ? "Outlook" : "Gmail"} → Drafts – open it there and press Send.` : "Tia made this draft – on your PC it is a real draft in Outlook → Drafts, and you press Send. Tia never sends."), c.steps(sel.of || sel)));
      else if (items.includes(sel) && replyable(sel) && !cats.includes("Suspicious")) {
        const op = isOpen(sel);
        const ta = h("textarea", { "aria-label": "Message body", placeholder: "Write your reply – or press “Let Tia write”", oninput: (e) => (c.userEdited[sel.id] = e.target.value) });
        ta.value = c.composerValue(sel);
        read.append(h("div", { class: "ol-reply" },
          tiaBanner(c, sel, sel.live ? (sel.state === "edited" ? (A.savedOf ? A.savedOf(sel) : A.savedBanner) : A.bannerOf ? A.bannerOf(sel) : A.banner) : sel.state === "new" ? "Write your reply, or let Tia write it from the business notes. “Save draft” makes an Outlook draft – you press Send." : op ? "Tia drafted this reply – edit it, or save it as a draft." : sel.state === "handled" ? "Tia handled this message with the reply below." : "Saved as a draft in Outlook."),
          h("div", { class: "ol-line" }, h("span", { class: "k" }, "From"), h("span", {}, (A.fromOf && A.fromOf(sel)) || A.from || W().BOX)),
          h("div", { class: "ol-line" }, h("span", { class: "k" }, "To"), h("span", { class: "ol-pill" }, c.avatar(sel.from), sel.address)),
          ta,
          h("div", { class: "ol-rbar" },
            h("button", { class: "ol-primary", disabled: !op, onclick: () => c.decide(sel, ta.value) }, "Save draft"),
            h("button", { class: "ol-btn", disabled: !op, onclick: () => ((c.userEdited[sel.id] = undefined), c.typeDraft(sel, ta)) }, I("sparkle"), "Let Tia write"),
            h("button", { class: "ol-btn", disabled: !op, onclick: () => c.reject(sel) }, "Discard"),
            h("span", { class: "note" }, (A.noteOf && A.noteOf(sel)) || A.note || "Tia never sends – you press Send in Outlook.")),
          c.steps(sel)));
        if (c.pendingFor(sel.id)) c.typeDraft(sel, ta);
      }
    } else read.append(h("div", { class: "ox-empty" }, h("div", { class: "big" }, "Select an item to read"), h("div", {}, "Nothing is selected")));

    // ---------- ribbon ----------
    const has = !!sel && !composing;
    const demo = !A.live;
    const move = (to) => {
      if (!sel) return;
      const idx = shown.indexOf(sel);
      moved[sel.id] = to;
      const next = shown[idx + 1] || shown[idx - 1];
      mailSel = next && next.id !== sel.id ? next.id : null;
      c.render();
    };
    const B = (icon, label, onclick, { on = false, title = "" } = {}) => h("button", { class: `ol-cmd ${on ? "on" : ""}`, title: title || label, onclick }, I(icon), h("span", {}, label));
    const restoreable = has && ["deleted", "junk", "archive"].includes(folderOf(sel));
    const cmds = ribbonTab === "view"
      ? [B("mail_inbox", focusedOn ? "Focused Inbox: on" : "Focused Inbox: off", () => ((focusedOn = !focusedOn), (focusTab = "focused"), c.render()), { on: focusedOn }),
         B("list", readingPane ? "Reading pane: right" : "Reading pane: hidden", () => ((readingPane = !readingPane), c.render()), { on: !readingPane }),
         B("filter", unreadOnly ? "Unread only" : "All mail", () => ((unreadOnly = !unreadOnly), c.render()), { on: unreadOnly })]
      : [h("button", { class: "ol-cmd new", onclick: () => ((composing = { to: "", subject: "", text: "" }), (catMenu = false), c.render()) }, I("compose"), h("span", {}, "New mail")),
         demo && has ? (restoreable ? B("mail_inbox", "Move to Inbox", () => ((moved[sel.id] = "inbox"), c.render())) : [B("delete", "Delete", () => move("deleted")), B("archive", "Archive", () => move("archive")), B("warning", "Report", () => move("junk"), { title: "Report as junk" })]) : "",
         h("span", { class: "ol-sep" }),
         has ? [B("arrow_reply", "Reply", () => (replyable(sel) && items.includes(sel) && document.querySelector(".ol-reply textarea") ? document.querySelector(".ol-reply textarea").focus() : startReply(c, sel, "re"))), B("arrow_forward", "Forward", () => startReply(c, sel, "fw"))] : "",
         h("span", { class: "ol-sep" }),
         has && demo ? B(unreadOf(sel) ? "mail_read" : "mail", unreadOf(sel) ? "Read" : "Unread", () => ((readSt[sel.id] = unreadOf(sel)), c.render())) : "",
         has ? h("div", { class: "ox-catwrap" }, B("bookmark", "Categorize", () => ((catMenu = !catMenu), c.render()), { on: catMenu }), catMenu ? catMenuView(c, sel, A) : "") : "",
         has && demo ? B("flag", flagged[sel.id] ? "Unflag" : "Flag", () => ((flagged[sel.id] = !flagged[sel.id]), c.render()), { on: !!flagged[sel.id] }) : "",
         h("span", { class: "ol-sep" }),
         h("button", { class: "ol-cmd tia", title: "Tia reads every mail and puts it in a category", disabled: sortMsg && sortMsg.busy, onclick: () => sortWithTia(c, all.filter((i) => folderOf(i) === "inbox" && !i.isDraft), A) }, I("sparkle"), h("span", {}, "Sort with Tia"))];
    const search = searchBox(c, "email", "ox-search", "Search");
    search.setAttribute("data-search", "email");
    search.addEventListener("keydown", (e) => e.key === "Escape" && ((query.email = ""), c.render()));
    return h("div", { class: "ol ox" },
      h("div", { class: "ol-head" },
        h("div", { class: "waffle", title: "Apps" }, h("i", {}), h("i", {}), h("i", {}), h("i", {}), h("i", {}), h("i", {}), h("i", {}), h("i", {}), h("i", {})),
        h("div", { class: "name" }, "Outlook"),
        h("div", { class: "search" }, I("search"), search, query.email ? h("button", { class: "clr", title: "Clear search", onclick: () => ((query.email = ""), c.render()) }, "×") : ""),
        h("div", { class: "right" }, h("div", { class: "me", title: A.box || W().BOX || "" }, A.initials || "MO"))),
      h("div", { class: "ol-work" },
        h("div", { class: "ol-ribbon" },
          h("div", { class: "ol-tabs" }, h("span", { class: ribbonTab === "home" ? "on" : "", onclick: () => ((ribbonTab = "home"), c.render()) }, "Home"), h("span", { class: ribbonTab === "view" ? "on" : "", onclick: () => ((ribbonTab = "view"), (catMenu = false), c.render()) }, "View")),
          h("div", { class: "ol-cmds" }, cmds.flat(3))),
        h("div", { class: `ol-panes ${readingPane ? "" : "noread"}` }, folders, list, readingPane || composing ? read : "")));
  }
  function catMenuView(c, sel, A) {
    const { h } = c;
    const cur = catsOf(sel);
    const set = async (k) => {
      const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
      catsSet[sel.id] = next;
      catMenu = false;
      c.render();
      if (A.live && c.categorize) {
        try {
          await c.categorize([sel], { [sel.id]: next });
        } catch (e) {
          alert(e.message || e);
        }
      }
    };
    return h("div", { class: "ox-menu" }, Object.keys(W().CATS).map((k) => h("div", { class: "it", onclick: (e) => (e.stopPropagation(), set(k)) }, h("span", { class: "ck" }, cur.includes(k) ? "✓" : ""), catDot(c.h, k), k)),
      h("div", { class: "it hint" }, A.live ? "Saved in Outlook / Gmail too" : "Tia sets these herself – “Sort with Tia”"));
  }
  async function sortWithTia(c, inbox, A) {
    if (A.live) {
      if (!c.categorize) return;
      sortMsg = { busy: true, text: `Tia is reading ${inbox.length} mails…` };
      c.render();
      try {
        const r = await c.categorize(inbox);
        for (const [id, cats] of Object.entries(r.cats || {})) catsSet[id] = cats;
        sortMsg = { text: summary(inbox) + (r.wrote ? ` · saved as ${r.wrote}` : "") };
      } catch (e) {
        sortMsg = { text: `Tia couldn't sort: ${e.message || e}` };
      }
      return c.render();
    }
    sortMsg = { busy: true, text: `Tia is reading ${inbox.length} mails…` };
    c.render();
    await new Promise((r) => setTimeout(r, 1100));
    sorted = true;
    for (const i of inbox) if (!i.cats && !i.deskCats) catsSet[i.id] = guessCats(i);
    sortMsg = { text: summary(inbox) };
    c.render();
  }
  function summary(inbox) {
    const n = {};
    for (const i of inbox) for (const k of catsOf(i)) n[k] = (n[k] || 0) + 1;
    const order = Object.keys(W().CATS).filter((k) => n[k]);
    const sus = n.Suspicious ? ` – ${n.Suspicious} look${n.Suspicious === 1 ? "s" : ""} like a scam` : "";
    return `Tia sorted ${inbox.length} mails: ${order.map((k) => `${n[k]} ${k}`).join(" · ")}${sus}`;
  }
  function startReply(c, x, kind) {
    const re = kind === "re";
    const subj = String(x.subject || "").replace(/^(re|fw|fwd):\s*/i, "");
    const when = longTime(whenOf(x));
    composing = {
      to: re ? x.address || "" : "",
      subject: `${re ? "Re" : "Fw"}: ${subj}`,
      text: `\n\n\n________________________________\nFrom: ${x.from} <${x.address || ""}>\nSent: ${when}\nSubject: ${x.subject || ""}\n\n${x.text || ""}`,
      from: x.live || undefined,
    };
    catMenu = false;
    c.render();
    setTimeout(() => {
      const ta = document.querySelector(".ol-compose textarea");
      if (ta) {
        ta.focus();
        ta.setSelectionRange(0, 0);
      }
    }, 0);
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
      : h("span", { class: "ol-in ro" }, A.box || W().BOX || "info@oakline-studio.example");
    return h("div", { class: "ol-compose-wrap" },
      h("div", { class: "ol-reply ol-compose" },
        h("div", { class: "ol-rbar top" },
          h("button", { class: "ol-primary", onclick: async () => {
            if (!m.text.trim()) return ta.focus();
            try {
              status.textContent = m.from === "outlook" || !A.accounts ? "Saving the draft in Outlook…" : "Saving the draft in Gmail…";
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
          h("button", { class: "ol-btn", onclick: () => ((composing = null), c.render()) }, I("delete"), "Discard"),
          h("span", { class: "note" }, "Tia never sends – you press Send in Outlook.")),
        h("div", { class: "ol-line" }, h("span", { class: "k" }, "From"), fromSel),
        h("div", { class: "ol-line" }, h("span", { class: "k" }, "To"), to),
        h("div", { class: "ol-line subj" }, subj),
        ta,
        status));
  }

  // ============================ WHATSAPP (Web) ============================
  // WhatsApp Web: icon strip, Chats with filters, history with ticks and tails, doodle background, composer.
  // Today's demo message (Anna) is Tia's work; the other chats are the business's everyday life (demo-world.js).
  let waFilter = "all";
  let waSel = null;
  let waLastView = null;
  const waLocal = {}; // chat id → messages the visitor typed in the demo (they stay in this browser)
  const SVG = (d, vb = "0 0 24 24") => {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", vb);
    s.setAttribute("class", "wi");
    s.innerHTML = d;
    return s;
  };
  const WA = {
    chats: '<path fill="currentColor" d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 16.2a7.2 7.2 0 0 1-3.7-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.2 7.2 0 1 1 12 19.2Z"/>',
    status: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 2.2"/><circle cx="12" cy="12" r="4.2" fill="currentColor"/>',
    channels: '<path fill="currentColor" d="M4 9.5v5a1 1 0 0 0 1 1h2l5 3.5V5L7 8.5H5a1 1 0 0 0-1 1Zm12.5-2.6-1.2 1.2a5.5 5.5 0 0 1 0 7.8l1.2 1.2a7.2 7.2 0 0 0 0-10.2Z"/>',
    community: '<path fill="currentColor" d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a2.8 2.8 0 1 0 0-5.6A2.8 2.8 0 0 0 16 10ZM2.5 19c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5v1h-13v-1Zm14.5 1v-1c0-1.6-.6-3-1.6-4.1.4-.1.9-.1 1.4-.1 2.8 0 4.7 1.8 4.7 4.2v1H17Z"/>',
    settings: '<path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-1.7-1L15 3.4h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-.9-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-.9c.5.4 1.1.8 1.7 1l.4 2.5h4l.4-2.5c.6-.2 1.2-.6 1.7-1l2.4.9 2-3.4-2.2-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" transform="translate(-1 0)"/>',
    newchat: '<path fill="currentColor" d="M19.5 3h-15A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17H7v4l4.5-4h8a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 19.5 3ZM16 11h-3v3h-2v-3H8V9h3V6h2v3h3v2Z"/>',
    menu: '<path fill="currentColor" d="M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>',
    search: '<path fill="currentColor" d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"/>',
    video: '<path fill="currentColor" d="M15 8.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1.5l5 3.5V5l-5 3.5Z"/>',
    plus: '<path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>',
    emoji: '<path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18.2a8.2 8.2 0 1 1 0-16.4 8.2 8.2 0 0 1 0 16.4ZM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 17.5a5.5 5.5 0 0 0 5-3.2l-1.6-.8A3.8 3.8 0 0 1 12 15.8a3.8 3.8 0 0 1-3.4-2.3l-1.6.8a5.5 5.5 0 0 0 5 3.2Z"/>',
    mic: '<path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5.3-3a5.3 5.3 0 0 1-10.6 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9h-1.7Z"/>',
    send: '<path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/>',
    pin: '<path fill="currentColor" d="m15.5 3-1.4 1.4 1.1 1.1-4.4 4.4-2.6-.6-1.4 1.4 3.2 3.2L5 19l.1.9.9.1 5-5 3.2 3.2 1.4-1.4-.6-2.6 4.4-4.4 1.1 1.1L21 9.5z"/>',
    dbl: '<path fill="currentColor" d="m15.01 3.316-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>',
    one: '<path fill="currentColor" d="m10.91 3.316-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>',
    lock: '<path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/>',
  };
  const waIcon = (k, vb) => SVG(WA[k], vb);
  const waTicks = (read = true) => {
    const s = SVG(WA.dbl, "0 0 16 11");
    s.setAttribute("class", `wtick ${read ? "read" : ""}`);
    return s;
  };
  function waAvatar(h, group, name) {
    if (!group && name && !/elektriķis|\(|^\+/.test(name)) return face(h, name, "wav");
    const a = h("div", { class: `wav ${group ? "grp" : ""}` });
    a.innerHTML = group
      ? '<svg viewBox="0 0 212 212"><path fill="#DFE5E7" d="M105.9.6C47.7.6.6 47.7.6 105.9s47.1 105.3 105.3 105.3 105.3-47.1 105.3-105.3S164.1.6 105.9.6z"/><path fill="#FFF" d="M102.5 80.6c0 13-10.1 23.6-22.6 23.6s-22.6-10.6-22.6-23.6S67.4 57 79.9 57s22.6 10.6 22.6 23.6zm52.7 4.5c0 11.1-8.6 20.1-19.3 20.1s-19.3-9-19.3-20.1 8.6-20.1 19.3-20.1 19.3 9 19.3 20.1zM40.7 158.7c3.6-23.7 19.3-40.6 39.2-40.6 21.7 0 38.3 20 40.4 47.3-24.8 1.8-58.6.8-79.6-6.7zm86.3 6.3c-.9-14.3-5.6-27.5-13.8-36.6 6.2-4.7 13.8-7.2 21.6-7.2 17 0 31.1 13.7 34.3 32.8-8.9 6.8-24.8 10.3-42.1 11z"/></svg>'
      : '<svg viewBox="0 0 212 212"><path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"/><path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.653.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.678 0 52.761-11.103 71.055-29.095v-.289s-.619-1.45-1.992-3.778a58.346 58.346 0 0 0-1.446-2.322zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-1.215-5.494 36.68 36.68 0 0 0-3.648-8.298 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 37.67 37.67 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z"/></svg>';
    return a;
  }
  const NAMECOL = ["#06CF9C", "#D3396D", "#A62C71", "#8B7ADD", "#E26F2B", "#1F7AEC", "#C4532D", "#279E9E"];
  const nameColor = (s) => NAMECOL[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % NAMECOL.length];
  const at = (d, t) => {
    const [hh, mm] = String(t || "09:00").split(":").map(Number);
    const x = new Date();
    x.setHours(hh, mm, 0, 0);
    return x.getTime() - d * DAY;
  };
  const dayLabel = (t) => {
    const g = groupOf(t);
    if (g === "Today") return "Today";
    if (g === "Yesterday") return "Yesterday";
    if (g === "This week") return new Date(t).toLocaleDateString("en-GB", { weekday: "long" });
    return new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
  };
  const listTime = (t) => {
    const g = groupOf(t);
    if (g === "Today") return new Date(t).toTimeString().slice(0, 5);
    if (g === "Yesterday") return "Yesterday";
    if (g === "This week") return new Date(t).toLocaleDateString("en-GB", { weekday: "long" });
    return new Date(t).toLocaleDateString("en-GB").replace(/\//g, ".");
  };
  // one chat list: Tia's demo messages (desk items, or the owner's live chats) + the business's other chats
  function waChats(items, live) {
    const out = [];
    for (const i of items) {
      const hist = live ? [] : (W().waHistory || {})[i.from] || [];
      const msgs = i.thread
        ? i.thread.map((m) => ({ dir: m.dir === "in" ? "in" : "out", text: m.text, at: Date.parse(m.at) }))
        : [...hist.map(([dir, text, d, t]) => ({ dir, text, at: at(d, t) })), { dir: "in", text: i.text, at: at(0, i.time) }];
      out.push({ id: i.id, item: i, name: i.from, sub: i.address || "", msgs, unread: isOpen(i) ? i.unread || 1 : 0 });
    }
    if (!live)
      for (const c of W().wa || []) {
        if (out.some((o) => o.name === c.name)) continue;
        out.push({ id: c.id, name: c.name, group: !!c.group, pinned: !!c.pinned, sub: c.members || "", msgs: c.msgs.map(([dir, text, d, t, x]) => ({ dir, text, at: at(d, t), from: x && x.from })), unread: c.unread || 0 });
      }
    for (const o of out) {
      o.msgs = [...o.msgs, ...(waLocal[o.id] || [])];
      o.last = o.msgs[o.msgs.length - 1] || { at: 0, text: "" };
    }
    return out.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.last.at - a.last.at);
  }
  function wa(c, items, x) {
    const { h } = c;
    const live = !!(c.acct && c.acct.live);
    const chats = waChats(items, live);
    if (x && x.id !== waLastView) waSel = x.id;
    waLastView = x ? x.id : null;
    const q = query.whatsapp.trim().toLowerCase();
    const shown = chats.filter((ch) => (waFilter === "all" || (waFilter === "unread" && ch.unread) || (waFilter === "groups" && ch.group) || (waFilter === "fav" && ch.pinned)) && (!q || `${ch.name} ${ch.msgs.map((m) => m.text).join(" ")}`.toLowerCase().includes(q)));
    let cur = chats.find((ch) => ch.id === waSel) || shown[0];
    if (cur) waSel = cur.id;
    const pick = (ch) => {
      waSel = ch.id;
      ch.unread = 0;
      if (ch.item) c.select(ch.id);
      else c.render();
    };
    const list = h("div", { class: "wa-list" }, shown.map((ch) => {
      const last = ch.last;
      const mine = last.dir === "out";
      return h("div", { class: `wa-row ${ch.unread ? "unread" : ""} ${cur && ch.id === cur.id ? "sel" : ""}`, onclick: () => pick(ch) },
        waAvatar(h, ch.group, ch.name),
        h("div", { class: "mid" },
          h("div", { class: "l1" }, h("span", { class: "nm" }, ch.name), h("span", { class: "tm" }, listTime(last.at))),
          h("div", { class: "l2" }, h("span", { class: "pv" }, mine ? waTicks(true) : "", ch.group && last.from ? `${last.from}: ` : "", last.text),
            h("span", { class: "rt" }, ch.pinned ? h("span", { class: "pin" }, waIcon("pin")) : "", ch.unread ? h("span", { class: "cnt" }, ch.unread) : ""))));
    }), shown.length ? "" : h("div", { class: "wa-none" }, q ? `No chats, contacts or messages found` : "No chats"));

    const main = h("div", { class: "wa-main" });
    if (cur) {
      const it = cur.item;
      const msgs = h("div", { class: "wa-msgs" }, h("div", { class: "wa-enc" }, waIcon("lock"), " Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them."));
      let day = "";
      let prevDir = "";
      for (const m of cur.msgs) {
        const lab = dayLabel(m.at);
        if (lab !== day) {
          msgs.append(h("div", { class: "wa-day" }, (day = lab)));
          prevDir = "";
        }
        const first = prevDir !== m.dir + (m.from || "");
        prevDir = m.dir + (m.from || "");
        const b = h("div", { class: `wb ${m.dir} ${first ? "tail" : ""} ${m.local ? "local" : ""}` },
          cur.group && m.dir === "in" && first && m.from ? h("div", { class: "who" }, m.from) : "",
          h("span", { class: "tx" }, m.text),
          h("span", { class: "meta" }, new Date(m.at).toTimeString().slice(0, 5), m.dir === "out" ? waTicks(!m.local) : ""));
        if (cur.group && m.from) b.querySelector(".who") && (b.querySelector(".who").style.color = nameColor(m.from));
        msgs.append(b);
      }
      if (it && !isOpen(it) && it.draft) msgs.append(h("div", { class: "wb out tail tia" }, h("div", { class: "who tia" }, it.state === "handled" ? "Tia · handled" : "Tia · draft"), h("span", { class: "tx" }, it.draft), h("span", { class: "meta" }, it.time || "")));
      const subtitle = cur.group ? cur.sub : it ? it.address || "click here for contact info" : "last seen today at " + new Date(cur.last.at).toTimeString().slice(0, 5);
      main.append(h("div", { class: "wa-chathead" }, waAvatar(h, cur.group, cur.name), h("div", { class: "who" }, h("div", { class: "nm" }, cur.name), h("div", { class: "s" }, subtitle)), h("span", { class: "sp" }), h("span", { class: "ic" }, waIcon("video")), h("span", { class: "ic" }, waIcon("search")), h("span", { class: "ic" }, waIcon("menu"))), msgs);
      setTimeout(() => (msgs.scrollTop = msgs.scrollHeight), 0);
      if (it && isOpen(it)) {
        const ta = c.textarea(it, "Type a message");
        main.append(h("div", { class: "wa-tia" }, tiaBanner(c, it, it.live ? (c.acct && c.acct.banner) || "" : "Tia's reply is in the box – change it, or press ✦ to let her write it again. On your PC ➤ opens WhatsApp with the text and you press send."), c.steps(it)),
          h("div", { class: "wa-compose" }, h("span", { class: "ic" }, waIcon("plus")), h("div", { class: "box" }, h("span", { class: "ic e" }, waIcon("emoji")), ta),
            h("button", { class: "wa-redo", title: "Let Tia write it", onclick: () => c.typeDraft(it, ta) }, I("sparkle")),
            h("button", { class: "wa-send", title: it.live ? "Send" : "Send (opens WhatsApp on your PC)", onclick: () => c.decide(it, ta.value) }, waIcon("send"))));
      } else if (it) main.append(h("div", { class: "wa-tia" }, c.chip(it), c.steps(it)));
      else {
        // the business's other chats: the visitor can type – it stays in this browser (nothing is sent)
        const ta = h("textarea", { rows: 1, placeholder: "Type a message" });
        const send = () => {
          const t = ta.value.trim();
          if (!t) return;
          (waLocal[cur.id] = waLocal[cur.id] || []).push({ dir: "out", text: t, at: Date.now(), local: true });
          c.render();
        };
        ta.addEventListener("keydown", (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send()));
        main.append(h("div", { class: "wa-compose" }, h("span", { class: "ic" }, waIcon("plus")), h("div", { class: "box" }, h("span", { class: "ic e" }, waIcon("emoji")), ta), h("button", { class: "wa-send", title: "Send (demo – stays in this browser)", onclick: send }, waIcon("send"))));
      }
    } else main.append(h("div", { class: "wa-intro" }, h("div", { class: "t" }, "WhatsApp Web"), h("div", {}, "Send and receive messages without keeping your phone online."), h("div", { class: "e2e" }, waIcon("lock"), " Your personal messages are end-to-end encrypted")));
    const search = searchBox(c, "whatsapp", "wa-searchin", "Search or start a new chat");
    search.setAttribute("data-search", "whatsapp");
    const chip = (k, t) => h("span", { class: waFilter === k ? "on" : "", onclick: () => ((waFilter = k), c.render()) }, t);
    const nUnread = chats.filter((ch) => ch.unread).length;
    return h("div", { class: "wa wa2" },
      h("div", { class: "wa-nav" }, h("div", { class: "on", title: "Chats" }, waIcon("chats"), nUnread ? h("b", {}, nUnread) : ""), h("div", { title: "Status" }, waIcon("status")), h("div", { title: "Channels" }, waIcon("channels")), h("div", { title: "Communities" }, waIcon("community")), h("span", { class: "sp" }), h("div", { title: "Settings" }, waIcon("settings")), h("div", { class: "me", title: "Profile" }, waAvatar(h, false, "Oakline Studio"))),
      h("div", { class: "wa-side" },
        h("div", { class: "wa-head" }, h("span", {}, "Chats"), h("span", { class: "sp" }), h("span", { class: "ic", title: "New chat" }, waIcon("newchat")), h("span", { class: "ic", title: "Menu" }, waIcon("menu"))),
        h("div", { class: "wa-search" }, h("div", {}, waIcon("search"), search)),
        h("div", { class: "wa-chips" }, chip("all", "All"), chip("unread", nUnread ? `Unread ${nUnread}` : "Unread"), chip("fav", "Favourites"), chip("groups", "Groups")),
        list),
      main);
  }

  // ============================ INSTAGRAM ============================
  function ig(c, items, x) {
    const { h } = c;
    const shown = items.filter((i) => match("instagram", i));
    const list = h("div", { class: "ig-list" }, shown.map((i) =>
      h("div", { class: `ig-row ${isOpen(i) ? "unread" : ""} ${x && i.id === x.id ? "sel" : ""}`, onclick: () => c.select(i.id) },
        face(c.h, i.from), h("div", { class: "tx" }, h("div", { class: "nm" }, i.from.replace(/^@/, "")), h("div", { class: "pv" }, `${i.text.slice(0, 38)} · ${i.time}`)), isOpen(i) ? h("span", { class: "dot" }) : null)),
      shown.length ? "" : h("div", { class: "ch-empty" }, "No messages."));
    const main = h("div", { class: "ig-main" });
    if (x) {
      const open = isOpen(x);
      const user = x.from.replace(/^@/, "");
      const msgs = h("div", { class: "ig-msgs" },
        h("div", { class: "ig-intro" }, face(c.h, x.from), h("div", { class: "nm" }, user), h("div", { class: "un" }, `${user} · Instagram`)),
        h("div", { class: "ig-time" }, `Today ${x.time}`),
        h("div", { class: "igb in" }, x.text));
      if (!open && x.draft) msgs.append(h("div", { class: "igb draft" }, h("span", { class: "lbl" }, x.state === "handled" ? "Tia · handled" : "Tia · draft"), x.draft));
      main.append(h("div", { class: "ig-head" }, face(c.h, x.from), h("div", {}, h("div", { class: "nm" }, user), h("div", { class: "un" }, user))), msgs);
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
        h("div", { class: "ig-me" }, (c.acct && c.acct.ig) || "oakline.studio", h("span", { class: "sp" }), igIcon("create")),
        h("div", { class: "ig-search" }, search),
        h("div", { class: "ig-tabs" }, h("span", { class: "on" }, "Messages")),
        list),
      main);
  }

  // ============================ INSTAGRAM – profile + Tia's dashboard (demo of the live view) ============================
  // Same layout as the desktop's live Instagram: instagram.com on the left (here the demo business's profile),
  // Tia's dark statistics dashboard on the right. "Messages" in the left bar opens the DMs Tia answers.
  let igMode = "profile";
  let igPost = null;
  let igTab = "posts";
  const igRev = { busy: false, shown: false };
  const igCap = {};
  const IGI = {
    home: '<path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/>',
    search: '<path d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="16.511" x2="22" y1="16.511" y2="22"/>',
    explore: '<polygon fill="none" points="13.941 13.953 7.581 16.424 10.06 10.056 16.42 7.585 13.941 13.953" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><polygon fill-rule="evenodd" points="10.06 10.056 13.949 13.945 7.581 16.424 10.06 10.056"/><circle cx="12.001" cy="12.005" fill="none" r="10.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
    reels: '<line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="2.049" x2="21.95" y1="7.002" y2="7.002"/><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="13.504" x2="16.362" y1="2.001" y2="7.002"/><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="7.207" x2="10.002" y1="2.11" y2="7.002"/><path d="M2 12.001v3.449c0 2.849.698 4.006 1.606 4.945.94.908 2.098 1.607 4.946 1.607h6.896c2.848 0 4.006-.699 4.946-1.607.908-.939 1.606-2.096 1.606-4.945V8.552c0-2.848-.698-4.006-1.606-4.945C19.454 2.699 18.296 2 15.448 2H8.552c-2.848 0-4.006.699-4.946 1.607C2.698 4.546 2 5.704 2 8.552Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M9.763 17.664a.908.908 0 0 1-.454-.787V11.63a.909.909 0 0 1 1.364-.788l4.545 2.624a.909.909 0 0 1 0 1.575l-4.545 2.624a.91.91 0 0 1-.91-.001Z" fill-rule="evenodd"/>',
    messages: '<path d="M12.003 2.001a9.705 9.705 0 1 1 0 19.4 10.876 10.876 0 0 1-2.895-.384.798.798 0 0 0-.533.04l-1.984.876a.801.801 0 0 1-1.123-.708l-.054-1.78a.806.806 0 0 0-.27-.569 9.49 9.49 0 0 1-3.14-7.175 9.65 9.65 0 0 1 10-9.7Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1.739"/><path d="M17.79 10.132a.659.659 0 0 0-.962-.873l-2.556 2.05a.63.63 0 0 1-.758.002L11.06 9.47a1.576 1.576 0 0 0-2.277.42l-2.567 3.98a.659.659 0 0 0 .961.875l2.556-2.049a.63.63 0 0 1 .759-.002l2.452 1.84a1.576 1.576 0 0 0 2.278-.42Z" fill-rule="evenodd"/>',
    heart: '<path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z" fill="currentColor"/>',
    create: '<path d="M2 12v3.45c0 2.849.698 4.005 1.606 4.944.94.909 2.098 1.608 4.946 1.608h6.896c2.848 0 4.006-.7 4.946-1.608C21.302 19.455 22 18.3 22 15.45V8.552c0-2.849-.698-4.006-1.606-4.945C19.454 2.7 18.296 2 15.448 2H8.552c-2.848 0-4.006.699-4.946 1.607C2.698 4.547 2 5.703 2 8.552Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="6.545" x2="17.455" y1="12.001" y2="12.001"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="12.003" x2="12.003" y1="6.545" y2="17.455"/>',
    dash: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    menu: '<line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="3" x2="21" y1="4" y2="4"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="3" x2="21" y1="12" y2="12"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="3" x2="21" y1="20" y2="20"/>',
    grid: '<rect fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="18" x="3" y="3"/><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="9.015" x2="9.015" y1="3" y2="21"/><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="14.985" x2="14.985" y1="3" y2="21"/><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="21" x2="3" y1="9.015" y2="9.015"/><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="21" x2="3" y1="14.985" y2="14.985"/>',
    saved: '<polygon fill="none" points="20 21 12 13.44 4 21 4 3 20 3 20 21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
    tagged: '<path d="M10.201 3.797 12 1.997l1.799 1.8a1.59 1.59 0 0 0 1.124.465h5.259A1.818 1.818 0 0 1 22 6.08v14.104a1.818 1.818 0 0 1-1.818 1.818H3.818A1.818 1.818 0 0 1 2 20.184V6.08a1.818 1.818 0 0 1 1.818-1.817h5.26a1.59 1.59 0 0 0 1.123-.466Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M18.598 22.002V21.4a3.949 3.949 0 0 0-3.948-3.949H9.495A3.949 3.949 0 0 0 5.546 21.4v.603" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><circle cx="12.072" cy="11.075" fill="none" r="3.556" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
    gear: '<circle cx="12" cy="12" fill="none" r="8.635" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M14.232 3.656a1.269 1.269 0 0 1-.796-.66L12.93 2h-1.86l-.505.996a1.269 1.269 0 0 1-.796.66m-.001 16.688a1.269 1.269 0 0 1 .796.66l.505.996h1.862l.505-.996a1.269 1.269 0 0 1 .796-.66M3.656 9.768a1.269 1.269 0 0 1-.66.796L2 11.07v1.862l.996.505a1.269 1.269 0 0 1 .66.796m16.688-.001a1.269 1.269 0 0 1 .66-.796L22 12.93v-1.86l-.996-.505a1.269 1.269 0 0 1-.66-.796" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" stroke-width="2"/>',
    comment: '<path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/>',
    reelmark: '<path d="M5.888 22.5a3.46 3.46 0 0 1-1.721-.46l-.003-.002a3.451 3.451 0 0 1-1.72-2.982V4.943a3.445 3.445 0 0 1 5.163-2.987l12.226 7.059a3.444 3.444 0 0 1-.001 5.967l-12.22 7.056a3.462 3.462 0 0 1-1.724.462Z" fill="currentColor"/>',
    link: '<path d="m9.726 5.123 1.228-1.228a6.47 6.47 0 0 1 9.15 9.152l-1.227 1.227m-4.603 4.603-1.228 1.228a6.47 6.47 0 0 1-9.15-9.152l1.227-1.227" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="8.471" x2="15.529" y1="15.529" y2="8.471"/>',
  };
  const igIcon = (k) => {
    const s = SVG(IGI[k]);
    s.setAttribute("class", "igi");
    return s;
  };
  // ---------- the post pictures: drawn kitchens and designed posts (3:4, like the profile grid) ----------
  const KPAL = {
    "k-oak": { wall: "#EDE6DC", cab: "#C99D6C", cab2: "#B8895A", top: "#F3EFE8", floor: "#B9A58C", splash: "#E4DDD2", metal: "#2B2B2B", isl: "#C99D6C" },
    "k-sage": { wall: "#F1EDE4", cab: "#98AE95", cab2: "#87A084", top: "#ECE7DE", floor: "#CDB79A", splash: "#E7E2D6", metal: "#C9A44C", isl: "#98AE95" },
    "k-navy": { wall: "#EEECE8", cab: "#243B5E", cab2: "#1C3050", top: "#F7F5F1", floor: "#A68968", splash: "#E6E3DD", metal: "#C9A44C", isl: "#243B5E" },
    "k-black": { wall: "#D8D3CB", cab: "#262626", cab2: "#1A1A1A", top: "#8B6B4C", floor: "#6F5B49", splash: "#BDB6AC", metal: "#B08D57", isl: "#8B6B4C" },
    "k-white": { wall: "#F5F5F2", cab: "#FBFBFA", cab2: "#ECECEA", top: "#D6D0C8", floor: "#D9CDBB", splash: "#EDEDEA", metal: "#3A3A3A", isl: "#FBFBFA" },
    "k-terra": { wall: "#EFE4D5", cab: "#E2CFB2", cab2: "#D5BF9E", top: "#F4EFE6", floor: "#B4673F", splash: "#C76A43", metal: "#2B2B2B", isl: "#E2CFB2" },
  };
  function kitchen(p, opt = {}) {
    const fronts = (x0, x1, y0, y1, n, fill) => {
      let s = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${fill}"/>`;
      const w = (x1 - x0) / n;
      for (let i = 1; i < n; i++) s += `<line x1="${x0 + i * w}" y1="${y0}" x2="${x0 + i * w}" y2="${y1}" stroke="rgba(0,0,0,.16)" stroke-width="1.2"/>`;
      return s;
    };
    let s = `<defs><linearGradient id="lt" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>`
      + `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD9EA"/><stop offset="1" stop-color="#EAF3F7"/></linearGradient>`
      + `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.floor}"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>`;
    s += `<rect width="300" height="400" fill="${p.wall}"/>`;
    // window with a tree outside
    s += `<rect x="186" y="46" width="88" height="124" fill="url(#sky)"/><circle cx="246" cy="132" r="26" fill="#9DB58A" opacity=".8"/><circle cx="222" cy="146" r="18" fill="#88A275" opacity=".8"/>`
      + `<rect x="186" y="46" width="88" height="124" fill="none" stroke="${p.metal}" stroke-width="4"/><line x1="230" y1="46" x2="230" y2="170" stroke="${p.metal}" stroke-width="3"/>`;
    // shelves / upper cabinets
    s += opt.open
      ? `<rect x="22" y="92" width="130" height="5" fill="${p.cab2}"/><rect x="22" y="138" width="130" height="5" fill="${p.cab2}"/><rect x="34" y="72" width="14" height="20" rx="2" fill="#F4F1EA"/><rect x="52" y="78" width="12" height="14" rx="6" fill="#D9C7A7"/><rect x="104" y="70" width="10" height="22" fill="#6E8B6B"/><circle cx="130" cy="126" r="11" fill="#F2EFE8"/><rect x="40" y="122" width="34" height="16" rx="2" fill="#C8B79C"/>`
      : fronts(22, 162, 56, 140, 3, p.cab) + `<rect x="22" y="56" width="140" height="84" fill="url(#lt)" opacity=".5"/>`;
    // splashback, worktop, base cabinets
    s += `<rect x="0" y="150" width="300" height="46" fill="${p.splash}"/>`;
    if (opt.tiles) for (let x = 0; x < 300; x += 15) for (let y = 150; y < 196; y += 15) s += `<rect x="${x + 1}" y="${y + 1}" width="13" height="13" fill="${p.splash}" stroke="rgba(0,0,0,.08)"/>`;
    s += `<rect x="0" y="196" width="300" height="8" fill="${p.top}"/>` + fronts(0, 300, 204, 268, 6, p.cab);
    for (let i = 0; i < 6; i++) s += opt.handles === "none" ? "" : `<rect x="${i * 50 + 18}" y="212" width="14" height="2.5" rx="1" fill="${p.metal}"/>`;
    s += `<rect x="0" y="268" width="300" height="6" fill="rgba(0,0,0,.18)"/>`;
    // hood + tap
    s += `<path d="M70 150h40l-6-16h-28z" fill="${p.metal}" opacity=".85"/><path d="M228 196v-20q0-8 8-8h6" stroke="${p.metal}" stroke-width="3" fill="none"/>`;
    // floor
    s += `<rect x="0" y="274" width="300" height="126" fill="url(#fl)"/>`;
    for (let y = 290; y < 400; y += 22) s += `<line x1="0" y1="${y}" x2="300" y2="${y}" stroke="rgba(0,0,0,.07)"/>`;
    // island + stools
    if (!opt.noIsland) {
      s += `<rect x="44" y="282" width="212" height="9" fill="${p.top}"/><rect x="50" y="291" width="200" height="74" fill="${p.isl}"/><rect x="50" y="291" width="200" height="74" fill="url(#lt)" opacity=".35"/>`;
      if (opt.slats) for (let x = 56; x < 250; x += 8) s += `<line x1="${x}" y1="291" x2="${x}" y2="365" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`;
      s += `<rect x="50" y="365" width="200" height="5" fill="rgba(0,0,0,.25)"/>`;
      for (const x of [88, 150, 212]) s += `<rect x="${x - 13}" y="300" width="26" height="6" rx="3" fill="${p.metal}"/><line x1="${x - 10}" y1="306" x2="${x - 13}" y2="368" stroke="${p.metal}" stroke-width="2.4"/><line x1="${x + 10}" y1="306" x2="${x + 13}" y2="368" stroke="${p.metal}" stroke-width="2.4"/>`;
      // pendants
      for (const x of [100, 150, 200]) s += `<line x1="${x}" y1="0" x2="${x}" y2="226" stroke="${p.metal}" stroke-width="1.2"/><path d="M${x - 13} 242a13 15 0 0 1 26 0z" fill="${p.metal}"/><ellipse cx="${x}" cy="243" rx="9" ry="2.6" fill="#FFE9B8"/>`;
      // fruit bowl / vase
      s += `<ellipse cx="200" cy="280" rx="16" ry="4" fill="#E9E4DA"/><circle cx="194" cy="276" r="5" fill="#E9A23B"/><circle cx="203" cy="275" r="5" fill="#C2452D"/><rect x="92" y="262" width="8" height="20" rx="3" fill="#EFEAE0"/><path d="M96 262c-6-14 4-20 0-30M96 262c6-12-2-18 4-26" stroke="#6E8B6B" stroke-width="2" fill="none"/>`;
    }
    // plant on the worktop
    s += `<rect x="262" y="178" width="20" height="18" rx="3" fill="#D8CDBA"/><path d="M272 178c-8-14-2-26 0-30 2 6 10 14 0 30zM272 178c8-10 16-10 20-12-4 8-10 12-20 12zM272 178c-8-6-16-6-20-6 4 6 10 8 20 6z" fill="#6E8B6B"/>`;
    return s;
  }
  function igArt(key) {
    const svg = (inner) => `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;
    if (KPAL[key]) return svg(kitchen(KPAL[key], { "k-sage": { open: true }, "k-navy": { slats: true }, "k-black": { open: true, handles: "none" }, "k-white": { handles: "none" }, "k-terra": { tiles: true, open: true } }[key] || {}));
    const T = (x, y, txt, size, col, weight = 700, family = "Georgia, 'Times New Roman', serif", anchor = "middle") => `<text x="${x}" y="${y}" font-size="${size}" fill="${col}" font-weight="${weight}" font-family="${family}" text-anchor="${anchor}">${txt}</text>`;
    const sans = "'Segoe UI', Helvetica, Arial, sans-serif";
    if (key === "quote-review") return svg(`<rect width="300" height="400" fill="#F3EDE3"/>${T(150, 120, "“", 120, "#C8A96E")}${T(150, 175, "Precise, on time", 26, "#2E3B2F", 400)}${T(150, 207, "and the kitchen", 26, "#2E3B2F", 400)}${T(150, 239, "is beautiful.", 26, "#2E3B2F", 400)}${T(150, 284, "★★★★★", 22, "#C8A96E", 400, sans)}${T(150, 316, "EVIJA L. · GOOGLE REVIEW", 11, "#6B6458", 700, sans)}${T(150, 372, "oakline.studio", 12, "#2E3B2F", 600, sans)}`);
    if (key === "tips") return svg(`<rect width="300" height="400" fill="#2E3B2F"/>${T(30, 80, "5 things", 40, "#F3EDE3", 400, undefined, "start")}${T(30, 120, "to decide before", 24, "#F3EDE3", 400, undefined, "start")}${T(30, 150, "your measurement", 24, "#C8A96E", 400, undefined, "start")}` + ["Your budget range", "Fronts: paint or veneer", "Where the sink goes", "Built-in appliances?", "Island or not"].map((t, i) => `<circle cx="42" cy="${196 + i * 34}" r="11" fill="#C8A96E"/>${T(42, 201 + i * 34, i + 1, 12, "#2E3B2F", 700, sans)}${T(62, 201 + i * 34, t, 14, "#F3EDE3", 400, sans, "start")}`).join("") + `${T(150, 380, "SAVE FOR LATER →", 11, "#C8A96E", 700, sans)}`);
    if (key === "before-after") return svg(`<clipPath id="lh"><rect width="150" height="400"/></clipPath><clipPath id="rh"><rect x="150" width="150" height="400"/></clipPath><g clip-path="url(#lh)">${kitchen({ wall: "#CFC9BB", cab: "#B9AE8F", cab2: "#A89D7F", top: "#8E8672", floor: "#8C7F6A", splash: "#C2BBA8", metal: "#6B6B6B", isl: "#B9AE8F" }, { noIsland: true })}</g><g clip-path="url(#rh)">${kitchen(KPAL["k-oak"])}</g><line x1="150" y1="0" x2="150" y2="400" stroke="#fff" stroke-width="4"/><circle cx="150" cy="200" r="16" fill="#fff"/><path d="M144 200l-5 0m5-5-5 5 5 5M156 200h5m-5-5 5 5-5 5" stroke="#2E3B2F" stroke-width="2" fill="none"/><rect x="14" y="16" width="70" height="22" rx="11" fill="rgba(0,0,0,.55)"/>${T(49, 31, "BEFORE", 11, "#fff", 700, sans)}<rect x="216" y="16" width="70" height="22" rx="11" fill="rgba(0,0,0,.55)"/>${T(251, 31, "AFTER", 11, "#fff", 700, sans)}`);
    if (key === "team") {
      const names = ["Elīna Zariņa", "Kaspars Liepiņš", "Mārtiņš Ozols", "Agnese Kalēja", "Jānis Krūmiņš", "Ivo Sproģis"];
      return svg(`<rect width="300" height="400" fill="#E8DFD1"/>${T(150, 70, "Meet the team", 30, "#2E3B2F", 400)}${T(150, 96, "behind every kitchen", 15, "#6B6458", 400, sans)}` + names.map((n, i) => {
        const x = 55 + (i % 3) * 95, y = 140 + Math.floor(i / 3) * 120;
        return `<clipPath id="c${i}"><circle cx="${x}" cy="${y + 34}" r="34"/></clipPath><g clip-path="url(#c${i})"><svg x="${x - 34}" y="${y}" width="68" height="68" viewBox="11 9 42 42">${faceSvg(n).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>${T(x, y + 88, n.split(" ")[0], 13, "#2E3B2F", 700, sans)}`;
      }).join("") + `${T(150, 384, "oakline.studio", 12, "#2E3B2F", 600, sans)}`);
    }
    if (key === "reel-workshop") return svg(`<rect width="300" height="400" fill="#3B2F25"/>` + Array.from({ length: 9 }, (_, i) => `<rect x="${-20 + i * 4}" y="${40 + i * 38}" width="340" height="30" rx="3" fill="${["#C99D6C", "#B8895A", "#D4AC7B", "#A9794B"][i % 4]}" transform="rotate(-8 150 200)"/>`).join("") + `<rect width="300" height="400" fill="rgba(0,0,0,.25)"/>${T(150, 330, "Raw oak →", 30, "#fff", 400)}${T(150, 366, "kitchen front", 30, "#fff", 400)}${T(150, 40, "60 SECONDS IN THE WORKSHOP", 11, "#fff", 700, sans)}`);
    if (key === "reel-install") return svg(`${kitchen(KPAL["k-white"])}<rect width="300" height="400" fill="rgba(20,20,20,.35)"/>${T(150, 190, "8 hours", 40, "#fff", 400)}${T(150, 232, "in 30 seconds", 26, "#fff", 400)}${T(150, 40, "INSTALL DAY · TIMELAPSE", 11, "#fff", 700, sans)}`);
    return svg(`<rect width="300" height="400" fill="#ddd"/>`);
  }
  // the caption Tia suggests in the demo (the live Tia asks the AI): hook first, then the post, then one call to action
  const demoCaption = (p) => `${p.type === "VIDEO" ? "Watch this before you plan your kitchen 👇" : "This is what 6 weeks with us looks like ✨"}\n\n${p.caption}\n\n📩 DM “MEASURE” for a free measurement in Riga.\n#customkitchen #riga #interiordesign #oakkitchen #kitchendesign`;

  function igDemoView(c, items) {
    const { h } = c;
    const D = W().ig;
    const p = D.profile;
    const nf = (v) => Number(v).toLocaleString("en-US");
    const dmOpen = items.filter(isOpen).length;
    const navItem = (k, label, on, onclick, badge) => h("div", { class: `ign ${on ? "on" : ""}`, title: label, onclick }, igIcon(k), badge ? h("b", {}, badge) : "", h("span", {}, label));
    const nav = h("div", { class: "ig-nav2" },
      h("div", { class: "logo" }, "Instagram"),
      navItem("home", "Home", false), navItem("search", "Search", false), navItem("explore", "Explore", false), navItem("reels", "Reels", false),
      navItem("messages", "Messages", igMode === "dm", () => ((igMode = "dm"), c.render()), dmOpen),
      navItem("heart", "Notifications", false), navItem("create", "Create", false), navItem("dash", "Dashboard", false),
      h("div", { class: `ign ${igMode === "profile" ? "on" : ""}`, title: "Profile", onclick: () => ((igMode = "profile"), c.render()) }, face(h, "Oakline Studio", "igav"), h("span", {}, "Profile")),
      h("span", { class: "sp" }), navItem("menu", "More", false));
    if (igMode === "dm") return h("div", { class: "igd" }, nav, h("div", { class: "igd-dm" }, ig(c, items, items.find((i) => i.id === c.selId) || items.find(isOpen) || items[0])));
    const head = h("div", { class: "igp2-head" },
      h("div", { class: "avwrap" }, h("div", { class: "ring" }, face(h, "Oakline Studio", "big"))),
      h("div", { class: "info" },
        h("div", { class: "r1" }, h("span", { class: "un" }, p.username), h("button", { class: "igb" }, "Edit profile"), h("button", { class: "igb" }, "View archive"), h("span", { class: "gear" }, igIcon("gear"))),
        h("div", { class: "r2" }, h("span", {}, h("b", {}, nf(p.posts)), " posts"), h("span", {}, h("b", {}, nf(p.followers)), " followers"), h("span", {}, h("b", {}, nf(p.following)), " following")),
        h("div", { class: "nm" }, p.name), h("div", { class: "cat" }, p.category), h("div", { class: "bio" }, p.bio),
        h("div", { class: "lnk" }, igIcon("link"), p.link),
        h("div", { class: "pro" }, h("b", {}, "Professional dashboard"), h("span", {}, "42.6K accounts reached in the last 30 days."))));
    const hl = h("div", { class: "igp2-hl" }, D.highlights.map((t, i) => h("div", { class: "it" }, h("div", { class: "c" }, h("div", { class: "in", html: igArt(["k-oak", "reel-workshop", "quote-review", "before-after", "team"][i % 5]) })), h("span", {}, t))));
    const tabs = h("div", { class: "igp2-tabs" }, [["posts", "grid", "POSTS"], ["reels", "reels", "REELS"], ["saved", "saved", "SAVED"], ["tagged", "tagged", "TAGGED"]].map(([k, icon, t]) => h("span", { class: igTab === k ? "on" : "", onclick: () => ((igTab = k), c.render()) }, igIcon(icon), t)));
    const posts = igTab === "reels" ? D.posts.filter((x) => x.type === "VIDEO") : igTab === "posts" ? D.posts : [];
    const grid = h("div", { class: "igp2-grid" }, posts.map((x) => {
      const cell = h("div", { class: `cell ${igPost === x.id ? "sel" : ""}`, onclick: () => ((igPost = x.id), c.render()) }, h("div", { class: "pic", html: igArt(x.art) }),
        h("div", { class: "ov" }, h("span", {}, igIcon("heart"), nf(x.likes)), h("span", {}, igIcon("comment"), nf(x.comments))));
      if (x.type === "VIDEO") cell.append(h("div", { class: "rl" }, igIcon("reelmark")), h("div", { class: "views" }, igIcon("reelmark"), `${(x.views / 1000).toFixed(1)}K`));
      return cell;
    }), posts.length ? "" : h("div", { class: "igp2-none" }, igTab === "saved" ? "Only you can see what you've saved" : "Photos of you"));
    const left = h("div", { class: "igp2" }, h("div", { class: "igp2-in" }, head, hl, tabs, grid));
    return h("div", { class: "igr igdemo" }, h("div", { class: "igd" }, nav, left), igDash(c));
  }
  function igDash(c) {
    const { h } = c;
    const D = W().ig;
    const nf = (v) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-GB"));
    const avg = (k) => {
      const v = D.posts.map((x) => x[k]).filter((x) => x !== null && x !== undefined);
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    const best = D.posts.slice().sort((a, b) => (b.views || b.likes * 10) - (a.views || a.likes * 10))[0];
    const panel = h("div", { class: "igr-side dark" });
    panel.append(h("div", { class: "igr-hd" }, I("sparkle"), h("b", {}, "Tia · Instagram")),
      h("div", { class: "igr-acct" }, h("b", {}, `@${D.profile.username}`), h("span", {}, `${nf(D.profile.followers)} followers · ${nf(D.profile.posts)} posts`)),
      h("div", { class: "am-kpi" }, [["Avg views", nf(avg("views"))], ["Avg likes", nf(avg("likes"))], ["Avg reach", nf(avg("reach"))], ["Saves", nf(avg("saved"))]].map(([k, v]) => h("div", {}, h("span", {}, k), h("b", {}, v)))),
      h("div", { class: "igr-best" }, `Best of the last ${D.posts.length}: `, h("b", {}, best.date), ` – ${nf(best.views)} views, ${nf(best.likes)} likes`),
      h("button", { class: "am-primary igr-go", disabled: igRev.busy, onclick: () => igDemoReview() }, I("sparkle"), igRev.busy ? "Tia is reading your numbers…" : igRev.shown ? "Review again" : "Review my Instagram"));
    if (igRev.shown && !igRev.busy) {
      const rv = D.review;
      panel.append(h("div", { class: "igr-score" }, h("div", { class: `ring ${rv.score >= 70 ? "good" : rv.score >= 45 ? "mid" : "low"}` }, String(rv.score)), h("div", {}, rv.verdict)),
        h("div", { class: "igr-t" }, "What works"), h("ul", { class: "igr-ul ok" }, rv.working.map((x) => h("li", {}, x))),
        h("div", { class: "igr-t" }, "Improve"), h("ul", { class: "igr-ul fix" }, rv.fix.map((x) => h("li", {}, x))),
        h("div", { class: "igr-t" }, "Next post"), h("div", { class: "igr-idea" }, rv.next_post_idea));
    }
    const sel = D.posts.find((x) => x.id === igPost);
    if (sel) {
      const ta = h("textarea", { class: "am-ta", rows: 7, oninput: (e) => (igCap[sel.id] = e.target.value) });
      ta.value = igCap[sel.id] ?? sel.caption;
      panel.append(h("div", { class: "igr-t" }, `Post · ${sel.date}`),
        h("div", { class: "am-kpi" }, [["Views", nf(sel.views)], ["Reach", nf(sel.reach)], ["Likes", nf(sel.likes)], ["Saves", nf(sel.saved)]].map(([k, v]) => h("div", {}, h("span", {}, k), h("b", {}, v)))),
        ta,
        h("div", { class: "igr-row" }, h("button", { class: "am-btn", onclick: () => ((igCap[sel.id] = demoCaption(sel)), c.render()) }, I("sparkle"), "Let Tia rewrite"), h("span", { class: "muted" }, "You paste it in Instagram – Tia never posts.")));
    } else panel.append(h("div", { class: "igr-hint" }, "Click a post to see its numbers and let Tia improve the caption."));
    return panel;
  }
  let igRerender = null;
  async function igDemoReview() {
    igRev.busy = true;
    igRev.shown = true;
    igRerender && igRerender();
    await new Promise((r) => setTimeout(r, 1400));
    igRev.busy = false;
    igRerender && igRerender();
  }
  function igEntry(c, items, x) {
    igRerender = c.render;
    c.selId = x && x.id;
    return igDemoView(c, items);
  }

  // ============================ SLACK ============================
  // The Slack desktop app (2025 look): workspace rail, purple sidebar (Channels / Direct messages / Apps),
  // channel header with tabs, messages with reactions and threads, the formatting composer.
  let slSel = null; // "#channel" or "@Name"
  let slLastView = null;
  const slLocal = {}; // conversation → messages the visitor typed in the demo (stay in this browser)
  const SL = {
    home: '<path fill="currentColor" d="M10.3 2.6a2.5 2.5 0 0 1 3.4 0l6.5 6a2.5 2.5 0 0 1 .8 1.9V19a2.5 2.5 0 0 1-2.5 2.5h-3.2a1.3 1.3 0 0 1-1.3-1.3V16a2 2 0 0 0-4 0v4.2c0 .7-.6 1.3-1.3 1.3H5.5A2.5 2.5 0 0 1 3 19v-8.5c0-.7.3-1.4.8-1.9l6.5-6Z"/>',
    dms: '<path fill="currentColor" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.3 3.6A1 1 0 0 1 4 18.8V5.5Z"/>',
    bell: '<path fill="currentColor" d="M12 2.5a6 6 0 0 0-6 6v3.6l-1.7 3A1.2 1.2 0 0 0 5.3 17h13.4a1.2 1.2 0 0 0 1-1.8l-1.7-3V8.5a6 6 0 0 0-6-6ZM9.5 18.5a2.5 2.5 0 0 0 5 0h-5Z"/>',
    more: '<path fill="currentColor" d="M6 13.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Zm6 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Zm6 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"/>',
    thread: '<path fill="currentColor" d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4v1.6h10V8H7Zm0 3.4V13h7v-1.6H7Z"/>',
    huddle: '<path fill="currentColor" d="M12 3a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5.6a6.5 6.5 0 0 1 12.8 0H17a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1a3 3 0 0 0 3-3v-5a8 8 0 0 0-8-8Z"/>',
    send: '<path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/>',
    plus: '<path fill="currentColor" d="M12 4.5a1 1 0 0 1 1 1V11h5.5a1 1 0 1 1 0 2H13v5.5a1 1 0 1 1-2 0V13H5.5a1 1 0 1 1 0-2H11V5.5a1 1 0 0 1 1-1Z"/>',
    caret: '<path fill="currentColor" d="M7 9.5 12 15l5-5.5H7Z"/>',
    search: '<path fill="currentColor" d="M10.5 3a7.5 7.5 0 0 1 6 12l4.2 4.3-1.4 1.4-4.3-4.2A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/>',
    compose: '<path fill="currentColor" d="M16.6 3.6a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-9 9-4.4 1.2 1.2-4.4 8.4-8.6ZM4 6h7v2H5v11h11v-6h2v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"/>',
    fmt: '<text x="3" y="17" font-size="15" font-weight="700" fill="currentColor" font-family="Segoe UI">Aa</text>',
    at: '<path fill="currentColor" d="M12 3a9 9 0 1 0 4.5 16.8l-.9-1.6A7.2 7.2 0 1 1 19.2 12v1a1.7 1.7 0 0 1-3.4 0V8h-1.7v.8A4.5 4.5 0 1 0 15 15.2a3.4 3.4 0 0 0 6-2.2V12a9 9 0 0 0-9-9Zm0 11.8a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z"/>',
    emoji: '<path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18.2a8.2 8.2 0 1 1 0-16.4 8.2 8.2 0 0 1 0 16.4ZM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 17.5a5.5 5.5 0 0 0 5-3.2l-1.6-.8A3.8 3.8 0 0 1 12 15.8a3.8 3.8 0 0 1-3.4-2.3l-1.6.8a5.5 5.5 0 0 0 5 3.2Z"/>',
  };
  const slIcon = (k) => SVG(SL[k]);
  const slAv = (h, name) => face(h, name, "sav");
  let c0avatar = null;
  function slack(c, items, x) {
    const { h } = c;
    c0avatar = c.avatar;
    const A = c.acct || {};
    const live = !!A.live;
    const WS = W().slack || { channels: [], msgs: [], dms: {}, people: {} };
    const ws = A.ws || WS.ws || "Oakline Studio";
    const me = live ? A.me || "You" : W().ME || "Mārtiņš Ozols";
    // conversations: channels (world + today's / live items) and DMs
    const conv = {};
    const add = (key, m) => (conv[key] = conv[key] || []).push(m);
    const chans = live ? [] : WS.channels.map((ch) => ch.name);
    for (const i of items) {
      const name = i.address || "#general";
      if (!chans.includes(name)) chans.push(name);
      if (!i.placeholder) add(name, { from: i.from, text: i.text, at: whenOf(i), item: i });
    }
    if (!live) {
      for (const [ch, from, text, d, t, o] of WS.msgs) add(ch, { from, text, at: at(d, t), ...(o || {}) });
      for (const [who, list] of Object.entries(WS.dms || {})) for (const [from, text, d, t] of list) add(`@${who}`, { from, text, at: at(d, t) });
    }
    for (const [k, list] of Object.entries(slLocal)) for (const m of list) add(k, m);
    for (const k of Object.keys(conv)) conv[k].sort((a, b) => a.at - b.at);
    const people = live ? {} : WS.people || {};
    if (x && x.id !== slLastView) slSel = x.address || slSel;
    slLastView = x ? x.id : null;
    const q = query.slack.trim().toLowerCase();
    if (!slSel || (!chans.includes(slSel) && !slSel.startsWith("@"))) slSel = (items.find((i) => isOpen(i) && !i.placeholder) || {}).address || chans[0];
    const openIn = (k) => (conv[k] || []).filter((m) => m.item && isOpen(m.item)).length;
    const go = (k) => {
      slSel = k;
      const it = (conv[k] || []).map((m) => m.item).filter(Boolean).find(isOpen) || items.find((i) => i.placeholder && i.address === k);
      if (it) c.select(it.id);
      else c.render();
    };
    const SI = (k, label, icon, n) => h("div", { class: `sl-item ${slSel === k ? "on" : ""} ${n ? "unread" : ""}`, onclick: () => go(k) }, icon, h("span", { class: "lb" }, label), n ? h("span", { class: "cnt" }, n) : "");
    const side = h("div", { class: "sl-side" },
      h("div", { class: "sl-wsn" }, h("span", {}, ws), slIcon("caret"), h("span", { class: "sp" }), h("span", { class: "ic", title: "New message" }, slIcon("compose"))),
      h("div", { class: "sl-nav" }, h("div", { class: "sl-item dim" }, slIcon("thread"), h("span", { class: "lb" }, "Threads")), h("div", { class: "sl-item dim" }, slIcon("huddle"), h("span", { class: "lb" }, "Huddles")), h("div", { class: "sl-item dim" }, slIcon("send"), h("span", { class: "lb" }, "Drafts & sent"))),
      h("div", { class: "sl-sec" }, slIcon("caret"), "Channels"),
      chans.map((k) => SI(k, k.replace(/^#/, ""), h("span", { class: "hash" }, "#"), openIn(k))),
      live ? "" : [h("div", { class: "sl-sec" }, slIcon("caret"), "Direct messages"),
        ...Object.keys(people).map((p) => SI(`@${p}`, p, h("span", { class: "dmav" }, slAv(h, p), h("i", { class: `pres ${people[p]}` })), 0))],
      h("div", { class: "sl-sec" }, slIcon("caret"), "Apps"),
      h("div", { class: "sl-item tia" }, h("span", { class: "dmav" }, h("span", { class: "tiaapp" }, "✦")), h("span", { class: "lb" }, "Tia"), h("span", { class: "app" }, "APP")));

    const main = h("div", { class: "sl-main" });
    const isDm = String(slSel).startsWith("@");
    const title = isDm ? slSel.slice(1) : slSel.replace(/^#/, "");
    const chInfo = (WS.channels || []).find((ch) => ch.name === slSel);
    main.append(h("div", { class: "sl-head" },
      h("div", { class: "t" }, isDm ? slAv(h, title) : h("span", { class: "hash" }, "#"), title, slIcon("caret")),
      h("span", { class: "sp" }),
      chInfo ? h("div", { class: "mem" }, ["Kaspars Liepiņš", "Elīna Zariņa", "Jānis Krūmiņš"].map((n) => slAv(h, n)), h("span", {}, String(chInfo.members))) : "",
      h("span", { class: "ic", title: "Huddle" }, slIcon("huddle"))),
      h("div", { class: "sl-tabs" }, h("span", { class: "on" }, slIcon("dms"), "Messages"), chInfo && chInfo.topic ? h("span", { class: "topic" }, chInfo.topic) : ""));
    const msgs = h("div", { class: "sl-msgs" });
    let day = "";
    let prev = null;
    const list = (conv[slSel] || []).filter((m) => !q || `${m.from} ${m.text}`.toLowerCase().includes(q));
    if (!list.length) msgs.append(h("div", { class: "sl-emptych" }, q ? `No messages match “${query.slack.trim()}” here.` : isDm ? `This is the very beginning of your direct message history with ${title}.` : `This is the very beginning of ${slSel}. Write the first message below – Tia keeps it as a draft for you to post.`));
    for (const m of list) {
      const lab = dayLabel(m.at);
      if (lab !== day) {
        msgs.append(h("div", { class: "sl-day" }, h("span", {}, (day = lab))));
        prev = null;
      }
      const cont = prev && prev.from === m.from && m.at - prev.at < 5 * 60e3 && !m.item;
      const it = m.item;
      const row = h("div", { class: `sl-msg ${cont ? "cont" : ""} ${it && x && it.id === x.id ? "sel" : ""} ${it ? "click" : ""}`, title: it ? "Click to answer this message with Tia" : "", onclick: it ? () => c.select(it.id) : null },
        cont ? h("span", { class: "hov" }, new Date(m.at).toTimeString().slice(0, 5)) : slAv(h, m.from),
        h("div", { class: "bd" },
          cont ? "" : h("div", { class: "hd" }, h("span", { class: "nm" }, m.from), h("span", { class: "tm" }, new Date(m.at).toTimeString().slice(0, 5))),
          h("div", { class: "tx" }, m.text),
          m.reactions ? h("div", { class: "rx" }, m.reactions.map(([e, n]) => h("span", {}, e, h("b", {}, n)))) : "",
          m.replies ? h("div", { class: "thr" }, slAv(h, "Elīna Zariņa"), h("span", { class: "a" }, `${m.replies} ${m.replies === 1 ? "reply" : "replies"}`), h("span", { class: "l" }, "Last reply today")) : ""));
      msgs.append(row);
      prev = m;
      if (it && !isOpen(it) && it.draft) msgs.append(h("div", { class: "sl-msg tia" }, h("span", { class: "dmav" }, h("span", { class: "tiaapp big" }, "✦")), h("div", { class: "bd" }, h("div", { class: "hd" }, h("span", { class: "nm" }, "Tia"), h("span", { class: "app" }, "APP"), h("span", { class: "tm" }, it.state === "handled" ? "handled" : "draft – waiting for you")), h("div", { class: "tx" }, it.draft))));
    }
    setTimeout(() => (msgs.scrollTop = msgs.scrollHeight), 0);
    main.append(msgs);
    // composer: on a message Tia is answering it holds her draft; otherwise the visitor writes (stays in the browser)
    const target = x && (x.address || "") === slSel && isOpen(x) ? x : items.find((i) => i.address === slSel && isOpen(i) && !i.placeholder) || items.find((i) => i.placeholder && i.address === slSel);
    const box = h("div", { class: "sl-compose" });
    let ta;
    if (target) {
      ta = c.textarea(target, target.placeholder ? `Message ${slSel}` : `Reply to ${target.from} in ${slSel}`);
      main.append(h("div", { class: "sl-tia" }, tiaBanner(c, target, live ? A.banner : target.placeholder ? "Write here or let Tia write it – Tia keeps it as a draft, you post it." : "Tia's reply is in the box – edit it, then use it. Tia never posts by herself."), c.steps(target)));
    } else {
      ta = h("textarea", { rows: 1, placeholder: `Message ${isDm ? title : slSel}` });
      ta.addEventListener("keydown", (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), localSend()));
    }
    const localSend = () => {
      const t = ta.value.trim();
      if (!t) return;
      (slLocal[slSel] = slLocal[slSel] || []).push({ from: me, text: t, at: Date.now() });
      c.render();
    };
    box.append(
      h("div", { class: "fmt" }, ["B", "I", "S"].map((l) => h("span", { class: `f ${l}` }, l)), h("span", { class: "sepv" }), h("span", { class: "f" }, "🔗"), h("span", { class: "f" }, "≡"), h("span", { class: "f" }, "</>")),
      ta,
      h("div", { class: "sbar" },
        h("span", { class: "ic round" }, slIcon("plus")), h("span", { class: "ic" }, slIcon("fmt")), h("span", { class: "ic" }, slIcon("emoji")), h("span", { class: "ic" }, slIcon("at")),
        h("span", { class: "sp" }),
        target && !target.placeholder ? [h("button", { class: "ghost", onclick: () => c.typeDraft(target, ta) }, I("sparkle"), "Let Tia write"), h("button", { class: "ghost", onclick: () => c.reject(target) }, "Not now")] : "",
        h("button", { class: "sl-sendone", title: target ? (live ? "Save as a draft (you post it in Slack)" : "Use this reply") : "Send (demo – stays in this browser)", onclick: () => (target ? c.decide(target, ta.value) : localSend()) }, slIcon("send"))));
    main.append(box);
    const search = searchBox(c, "slack", "sl-searchin", `Search ${ws}`);
    search.setAttribute("data-search", "slack");
    const wsIcon = h("div", { class: "sl-wsi", title: ws }, ws.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase());
    return h("div", { class: "sl sl2" },
      h("div", { class: "sl-top" }, h("span", { class: "sp" }), h("div", { class: "search" }, slIcon("search"), search), h("span", { class: "sp" })),
      h("div", { class: "sl-frame" },
        h("div", { class: "sl-rail" }, wsIcon,
          h("div", { class: "ri on" }, h("span", { class: "b" }, slIcon("home")), "Home"),
          h("div", { class: "ri" }, h("span", { class: "b" }, slIcon("dms")), "DMs"),
          h("div", { class: "ri" }, h("span", { class: "b" }, slIcon("bell")), "Activity"),
          h("div", { class: "ri" }, h("span", { class: "b" }, slIcon("more")), "More"),
          h("span", { class: "sp" }),
          h("div", { class: "ri me" }, slAv(h, me), h("i", { class: "pres active" }))),
        h("div", { class: "sl-body sl-clean" }, side, main)));
  }

  window.TiaApps = { mail, wa, ig: igEntry, igDM: ig, igDemoReview, slack, I, face, setMail: ({ folder: f, acct } = {}) => ((folder = f || folder), (mailAcct = acct || mailAcct), (composing = null)) };
})();

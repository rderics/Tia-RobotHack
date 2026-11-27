// Documents tab: contracts and offers. Ask Tia for one (from the vault: client, scope, prices, the Contract template),
// approve it, and it becomes a PDF → goes to the printer → waits in an Outlook draft. Every document Tia made is listed
// with preview, Print again, Email as draft and Open.
(function () {
  const T = () => window.tia || {};
  const I = (n) => (window.TiaApps ? window.TiaApps.I(n) : document.createElement("span"));
  let rerender = () => {};
  let data = null;
  let err = "";
  let sel = null;
  let want = null; // a document a voice command just made – shown as soon as the list has it
  let asking = false;
  let note = "";
  const busy = {};
  const msg = {};

  async function load() {
    if (!T().docs) return;
    try {
      data = await T().docs();
      err = data.error || "";
    } catch (e) {
      err = e.message || String(e);
    }
    rerender();
  }
  let desk = [];
  async function loadDesk() {
    if (!T().state) return;
    try {
      const s = await T().state();
      desk = [...(s.needs || []), ...(s.done || [])].filter((c) => c.kind === "contract" || c.kind === "offer");
    } catch {}
    rerender();
  }

  async function ask(text) {
    if (!text.trim() || !T().say) return;
    asking = true;
    note = "";
    rerender();
    try {
      const r = await T().say(text);
      note = (r && (r.say || r.error)) || "";
    } catch (e) {
      note = e.message || String(e);
    }
    asking = false;
    await loadDesk();
  }
  async function run(name, what, fn) {
    busy[name] = what;
    msg[name] = "";
    rerender();
    try {
      const r = await fn();
      if (r && r.error) throw new Error(r.error);
      const last = r && r.steps && r.steps.filter((s) => s.detail).pop();
      msg[name] = last ? `✓ ${last.detail}` : "✓ Done";
    } catch (e) {
      msg[name] = `⚠ ${e.message || e}`;
    }
    busy[name] = "";
    rerender();
  }

  function view(c) {
    const { h } = c;
    const root = h("div", { class: "dx" });
    if (!T().docs) {
      root.append(h("div", { class: "ch-empty" }, "On the live Tia this tab makes contracts and offers from the vault, prints them and puts them in an Outlook draft. (Public demo: try “Make the contract for Ieva Bērziņa” on the Tia tab.)"));
      return root;
    }
    if (!data && !err) load(), loadDesk();
    // 27.11: just the documents and the PDF – new ones come from Tia (voice / Tia tab), approvals live on the Tia tab
    // ---- middle: list ----
    const files = (data && data.files) || [];
    if (want && files.find((f) => f.name === want)) (sel = want), (want = null);
    if (!want && (!sel || !files.find((f) => f.name === sel))) sel = files[0] && files[0].name;
    const list = h("div", { class: "dx-list" }, h("div", { class: "dx-h" }, I("folder"), `Documents (${files.length})`, h("span", { class: "sp" }), h("button", { class: "dx-btn sm", onclick: () => (load(), loadDesk()) }, "↻")));
    for (const f of files) {
      list.append(h("div", { class: `dx-file ${f.name === sel ? "on" : ""}`, onclick: () => ((sel = f.name), rerender()) },
        h("div", { class: "ic" }, f.name.startsWith("Contract") ? "📄" : "🧾"),
        h("div", {}, h("div", { class: "n" }, f.name.replace(/\.pdf$/i, "")), h("div", { class: "m" }, `${new Date(f.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${f.kb} KB`))));
    }
    if (!files.length) list.append(h("div", { class: "dx-empty" }, err || "No documents yet."));

    // ---- right: preview + actions ----
    const right = h("div", { class: "dx-prev" });
    if (sel) {
      const fr = h("iframe", { class: "dx-pdf", title: sel });
      fr.src = T().docFile(sel);
      right.append(
        h("div", { class: "dx-bar" },
          h("b", {}, sel.replace(/\.pdf$/i, "")), h("span", { class: "sp" }),
          h("button", { class: "dx-primary", disabled: !!busy[sel], onclick: () => run(sel, "Printing…", () => T().docPrint(sel)) }, I("record"), busy[sel] === "Printing…" ? "Printing…" : "Print"),
          h("button", { class: "dx-btn", disabled: !!busy[sel], onclick: () => run(sel, "Writing the email…", () => T().docEmail(sel, "")) }, I("mail"), "Email as draft")),
        msg[sel] ? h("div", { class: "dx-bar sub" }, h("span", { class: "dx-msg" }, msg[sel])) : "",
        fr);
    } else right.append(h("div", { class: "ch-empty" }, "Your contracts and offers show here."));
    root.append(list, right);
    return root;
  }

  if (T().onEvent)
    T().onEvent((ev) => {
      if (ev.type === "action" && /pdf|print|outlook/.test(ev.step || "")) setTimeout(load, 800);
      if (ev.type === "decided" || ev.type === "result" || ev.type === "proposal" || ev.type === "desk") loadDesk();
    });
  window.TiaDocs = { view, setRerender: (fn) => (rerender = fn), show: (name) => ((want = name || null), (sel = name || sel), load(), loadDesk()) };
})();

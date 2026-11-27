// Business vault tab: the business's Obsidian vault inside Tia – file explorer, note view (read / edit), search, the link
// graph, and live which notes Tia reads ("Tia is reading" + glowing nodes). Graph: force-graph (vasturiano, MIT).
(function () {
  const I = (n) => (window.TiaApps ? window.TiaApps.I(n) : document.createElement("span"));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const FOLDER_COLORS = { Clients: "#B9A3F2", Projects: "#4CC38A", Meetings: "#7EA8F8", Daily: "#6B6773", Leads: "#E3A653", Knowledge: "#E879A6", Suppliers: "#C9A2F5", Partners: "#C9A2F5", People: "#C9A2F5", Team: "#F2F2F2", Decisions: "#F2C94C", MOCs: "#FF7A59", Finance: "#5BD1C9", Templates: "#9AA4B2", Tia: "#B9A3F2", "": "#D7D2E0" };
  const colorOf = (folder) => FOLDER_COLORS[folder] || "#9AA4B2";

  let root = null;
  let notes = [];
  let byPath = new Map();
  let byName = new Map();
  let current = null; // path of the open note
  let editing = false;
  let editable = false;
  let graph = null;
  let graphData = null;
  let localOnly = false;
  const hot = new Map(); // path → time Tia read it (glow)
  const feed = []; // { at, query, sources }

  // ---------- Markdown (Obsidian flavour, enough for the vault) ----------
  function inline(s) {
    return esc(s)
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, t, alias) => {
        const p = resolve(t.trim());
        return `<a class="wl ${p ? "" : "missing"}" data-note="${esc(p || "")}">${esc(alias || t.trim().split("/").pop())}</a>`;
      })
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }
  function md(text) {
    let src = String(text || "").replace(/\r/g, "");
    let props = "";
    const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fm) {
      src = src.slice(fm[0].length);
      const rows = fm[1].split("\n").filter((l) => l.includes(":")).map((l) => {
        const i = l.indexOf(":");
        return `<div class="vp-row"><span>${esc(l.slice(0, i).trim())}</span><span>${inline(l.slice(i + 1).trim().replace(/^"|"$/g, ""))}</span></div>`;
      });
      if (rows.length) props = `<div class="vp"><div class="vp-h">Properties</div>${rows.join("")}</div>`;
    }
    const out = [];
    let list = null;
    let table = null;
    const flush = () => {
      if (list) out.push(`<${list.tag}>${list.items.join("")}</${list.tag}>`), (list = null);
      if (table) out.push(`<table>${table.join("")}</table>`), (table = null);
    };
    for (const line of src.split("\n")) {
      if (/^\s*\|/.test(line)) {
        if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue;
        const cells = line.trim().replace(/^\||\|$/g, "").split("|");
        if (list) flush();
        table = table || [];
        table.push(`<tr>${cells.map((c) => `<${table.length ? "td" : "th"}>${inline(c.trim())}</${table.length ? "td" : "th"}>`).join("")}</tr>`);
        continue;
      }
      if (table) flush();
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)/))) {
        flush();
        out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
      } else if ((m = line.match(/^\s*[-*]\s+\[( |x)\]\s+(.*)/i))) {
        if (!list || list.tag !== "ul") flush(), (list = { tag: "ul", items: [] });
        list.items.push(`<li class="task"><input type="checkbox" disabled ${m[1].trim() ? "checked" : ""}> ${inline(m[2])}</li>`);
      } else if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
        if (!list || list.tag !== "ul") flush(), (list = { tag: "ul", items: [] });
        list.items.push(`<li>${inline(m[1])}</li>`);
      } else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) {
        if (!list || list.tag !== "ol") flush(), (list = { tag: "ol", items: [] });
        list.items.push(`<li>${inline(m[1])}</li>`);
      } else if ((m = line.match(/^>\s?(.*)/))) {
        flush();
        out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      } else if (/^---+$/.test(line.trim())) {
        flush();
        out.push("<hr>");
      } else if (!line.trim()) flush();
      else {
        if (list) flush();
        out.push(`<p>${inline(line)}</p>`);
      }
    }
    flush();
    return props + out.join("\n");
  }
  function resolve(target) {
    const t = target.replace(/\.md$/, "").toLowerCase();
    return byPath.has(`${t}.md`) ? byPath.get(`${t}.md`).path : byName.get(t) || null;
  }

  // ---------- data ----------
  async function load() {
    const t = await window.tia.vaultTree();
    notes = t.notes;
    editable = !!t.editable;
    byPath = new Map(notes.map((n) => [n.path.toLowerCase(), n]));
    byName = new Map();
    for (const n of notes) if (!byName.has(n.name.toLowerCase())) byName.set(n.name.toLowerCase(), n.path);
    root.querySelector(".vx-title").textContent = t.name || "Business vault";
    renderTree();
    if (!current) open(notes.find((n) => n.path === "Home.md") ? "Home.md" : notes[0] && notes[0].path);
    graphData = await window.tia.vaultGraph();
    drawGraph();
  }

  // ---------- explorer ----------
  const openFolders = new Set(); // all folders start closed – click one to open it
  function renderTree(filter = "") {
    const box = root.querySelector(".vx-tree");
    box.innerHTML = "";
    const f = filter.toLowerCase();
    const groups = {};
    for (const n of notes) {
      if (f && !n.path.toLowerCase().includes(f)) continue;
      const top = n.folder.split("/")[0] || "";
      (groups[top] = groups[top] || []).push(n);
    }
    const order = Object.keys(groups).sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
    for (const g of order) {
      if (g) {
        const isOpen = f || openFolders.has(g);
        const head = document.createElement("div");
        head.className = "vx-folder";
        head.innerHTML = `<span class="car">${isOpen ? "▾" : "▸"}</span><span class="dot"></span>${esc(g)}<span class="n">${groups[g].length}</span>`;
        head.querySelector(".dot").style.background = colorOf(g);
        head.onclick = () => (openFolders.has(g) ? openFolders.delete(g) : openFolders.add(g), renderTree(root.querySelector(".vx-search").value));
        box.append(head);
        if (!isOpen) continue;
      }
      for (const n of groups[g].sort((a, b) => a.path.localeCompare(b.path)).slice(0, f ? 60 : 400)) {
        const row = document.createElement("div");
        row.className = `vx-file ${g ? "in" : ""} ${n.path === current ? "on" : ""} ${hot.has(n.path) ? "hot" : ""}`;
        row.textContent = n.folder.includes("/") ? `${n.folder.split("/").slice(1).join("/")}/${n.name}` : n.name;
        row.title = n.path;
        row.onclick = () => open(n.path);
        box.append(row);
      }
    }
  }

  // ---------- note view ----------
  async function open(p) {
    if (!p) return;
    current = p;
    editing = false;
    const note = await window.tia.vaultNote(p);
    const view = root.querySelector(".vx-note");
    root.querySelector(".vx-tab").textContent = p.split("/").pop().replace(/\.md$/, "");
    root.querySelector(".vx-crumb").textContent = p.replace(/\.md$/, "").split("/").join(" / ");
    view.innerHTML = `<div class="vx-h1">${esc(p.split("/").pop().replace(/\.md$/, ""))}</div>${md(note.text)}`;
    view.dataset.text = note.text;
    view.querySelectorAll("a.wl").forEach((a) => (a.onclick = (e) => (e.preventDefault(), a.dataset.note && open(a.dataset.note))));
    const btn = root.querySelector(".vx-edit");
    btn.textContent = "Edit";
    btn.disabled = !note.editable;
    btn.title = note.editable ? "Edit this note" : "Read-only here – edit the real vault in Obsidian";
    renderTree(root.querySelector(".vx-search").value);
    focusNode(p);
  }
  function toggleEdit() {
    const view = root.querySelector(".vx-note");
    const btn = root.querySelector(".vx-edit");
    if (!editing) {
      editing = true;
      const ta = document.createElement("textarea");
      ta.className = "vx-src";
      ta.value = view.dataset.text || "";
      view.innerHTML = "";
      view.append(ta);
      ta.focus();
      btn.textContent = "Save";
    } else {
      const text = view.querySelector("textarea").value;
      window.tia.vaultSave(current, text).then(() => open(current)).catch((e) => alert(e.message || e));
    }
  }

  // ---------- graph ----------
  function drawGraph() {
    const el = root.querySelector(".vx-graph");
    if (!window.TiaForceGraph || !graphData || !el.offsetWidth) return;
    const data = localOnly && current ? localGraph(current) : { nodes: graphData.nodes.map((n) => ({ ...n })), links: graphData.links.map((l) => ({ ...l })) };
    if (!graph) {
      graph = window.TiaForceGraph()(el)
        .backgroundColor("#1A1A1F")
        .nodeId("id")
        .nodeVal((n) => 1 + Math.sqrt(n.deg || 0))
        .nodeRelSize(2.2)
        .nodeLabel((n) => n.name)
        .linkColor(() => "rgba(160,150,190,0.16)")
        .linkWidth(0.6)
        .cooldownTicks(120)
        .onNodeClick((n) => open(n.id))
        .nodeCanvasObjectMode(() => "after")
        .nodeCanvasObject((n, ctx, scale) => {
          const t = hot.get(n.id);
          const isCur = n.id === current;
          if (t || isCur) {
            const age = t ? (Date.now() - t) / 1000 : 0;
            const r = 4 + Math.sqrt(n.deg || 1) * 1.6;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r + (t ? 3 * Math.abs(Math.sin(age * 3)) : 1.5), 0, 2 * Math.PI);
            ctx.strokeStyle = t ? "rgba(185,163,242,0.95)" : "rgba(255,255,255,0.8)";
            ctx.lineWidth = 1.6 / Math.max(0.6, scale);
            ctx.stroke();
          }
          if (t || isCur || scale > 2.2) {
            ctx.font = `${Math.max(9, 11 / scale)}px Segoe UI, sans-serif`;
            ctx.fillStyle = t ? "#E8DEFF" : "rgba(230,226,240,0.85)";
            ctx.textAlign = "center";
            ctx.fillText(n.name.length > 28 ? n.name.slice(0, 27) + "…" : n.name, n.x, n.y + 10 + Math.sqrt(n.deg || 1));
          }
        })
        .nodeColor((n) => (hot.has(n.id) ? "#B9A3F2" : colorOf(n.folder)))
        .autoPauseRedraw(false);
    }
    graph.width(el.offsetWidth).height(el.offsetHeight).graphData(data);
  }
  function localGraph(p) {
    const keep = new Set([p]);
    for (const l of graphData.links) {
      if (l.source === p || (l.source && l.source.id === p)) keep.add(l.target.id || l.target);
      if (l.target === p || (l.target && l.target.id === p)) keep.add(l.source.id || l.source);
    }
    return {
      nodes: graphData.nodes.filter((n) => keep.has(n.id)).map((n) => ({ ...n })),
      links: graphData.links.map((l) => ({ source: l.source.id || l.source, target: l.target.id || l.target })).filter((l) => keep.has(l.source) && keep.has(l.target)),
    };
  }
  function focusNode(p) {
    if (!graph) return;
    if (localOnly) return drawGraph();
    const n = graph.graphData().nodes.find((x) => x.id === p);
    if (n && n.x !== undefined) graph.centerAt(n.x, n.y, 600);
  }

  // ---------- live: Tia reads the vault ----------
  function tiaRead(sources, query) {
    const paths = (sources || []).map((s) => resolve(String(s).replace(/ › .*$/, ""))).filter(Boolean);
    if (!paths.length) return;
    const now = Date.now();
    for (const p of paths) hot.set(p, now);
    feed.unshift({ at: now, query, paths });
    feed.length = Math.min(feed.length, 25);
    renderFeed();
    if (root.isConnected) renderTree(root.querySelector(".vx-search").value);
    setTimeout(() => {
      for (const p of paths) if (hot.get(p) === now) hot.delete(p);
      if (root.isConnected) renderTree(root.querySelector(".vx-search").value);
    }, 9000);
  }
  function renderFeed() {
    const box = root.querySelector(".vx-feed");
    box.innerHTML = feed.length ? "" : `<div class="vx-empty">When Tia reads the vault – for an email, a question or a contract – the notes she uses light up here and in the graph.</div>`;
    for (const f of feed.slice(0, 12)) {
      const item = document.createElement("div");
      item.className = "vx-fi";
      item.innerHTML = `<div class="q"><span>${new Date(f.at).toTimeString().slice(0, 8)}</span> ${esc(f.query || "Tia looked up")}</div>`;
      const chips = document.createElement("div");
      chips.className = "vx-chips";
      for (const p of f.paths.slice(0, 8)) {
        const c = document.createElement("a");
        c.textContent = p.split("/").pop().replace(/\.md$/, "");
        c.style.borderColor = colorOf(p.includes("/") ? p.split("/")[0] : "");
        c.onclick = () => open(p);
        chips.append(c);
      }
      item.append(chips);
      box.append(item);
    }
  }

  // ---------- frame ----------
  function build() {
    root = document.createElement("div");
    root.className = "vx";
    root.innerHTML = `
      <div class="vx-ribbon"><div title="Files"></div><div title="Search"></div><div title="Graph"></div></div>
      <aside class="vx-side"><div class="vx-title">Business vault</div>
        <div class="vx-sbox"><input class="vx-search" placeholder="Search notes…"></div>
        <div class="vx-results" hidden></div><div class="vx-tree"></div></aside>
      <section class="vx-main"><div class="vx-tabs"><div class="vx-tab">Home</div></div>
        <div class="vx-bar"><span class="vx-crumb"></span><span class="sp"></span><button class="vx-edit">Edit</button></div>
        <div class="vx-note"></div></section>
      <aside class="vx-right">
        <div class="vx-ph">Graph view <span class="sp"></span><button class="vx-gl on" data-m="global">Global</button><button class="vx-gl" data-m="local">Local</button></div>
        <div class="vx-graph"></div>
        <div class="vx-ph">Tia is reading <span class="live"></span></div>
        <div class="vx-feed"></div></aside>`;
    const rib = root.querySelectorAll(".vx-ribbon div");
    rib[0].append(I("folder"));
    rib[1].append(I("search"));
    rib[2].append(I("people_community"));
    rib[1].onclick = () => root.querySelector(".vx-search").focus();
    root.querySelector(".vx-edit").onclick = toggleEdit;
    root.querySelectorAll(".vx-gl").forEach((b) => (b.onclick = () => {
      localOnly = b.dataset.m === "local";
      root.querySelectorAll(".vx-gl").forEach((x) => x.classList.toggle("on", x === b));
      drawGraph();
    }));
    const search = root.querySelector(".vx-search");
    let timer = null;
    search.oninput = () => {
      clearTimeout(timer);
      renderTree(search.value);
      timer = setTimeout(async () => {
        const res = root.querySelector(".vx-results");
        if (search.value.trim().length < 3) return (res.hidden = true);
        const hits = await window.tia.vaultSearch(search.value);
        res.hidden = !hits.length;
        res.innerHTML = "";
        for (const h of hits.slice(0, 8)) {
          const r = document.createElement("div");
          r.className = "vx-hit";
          r.innerHTML = `<b>${esc(h.name)}</b>${h.section ? ` › ${esc(h.section)}` : ""}<span>${esc(h.snippet)}</span>`;
          r.onclick = () => open(h.path);
          res.append(r);
        }
      }, 250);
    };
    renderFeed();
    load().catch((e) => (root.querySelector(".vx-note").textContent = `The vault could not be loaded: ${e.message || e}`));
    new ResizeObserver(() => graph && root.isConnected && graph.width(root.querySelector(".vx-graph").offsetWidth).height(root.querySelector(".vx-graph").offsetHeight)).observe(root.querySelector(".vx-graph"));
  }

  // live reads: from the server (vault-read) and from inbox results (the notes each decision used – works in the replay too)
  let lastKey = "";
  function onEvent(ev) {
    let sources = null;
    let query = "";
    if (ev.type === "vault-read") (sources = ev.sources), (query = ev.query);
    else if (ev.type === "result" && ev.result && ev.result.proposal) (sources = ev.result.proposal.vault_sources), (query = `${ev.result.message.from}: ${ev.result.message.subject || ev.result.message.text || ""}`);
    if (!sources || !sources.length) return;
    const key = sources.slice(0, 4).join("|");
    if (key === lastKey) return;
    lastKey = key;
    if (!root) build();
    tiaRead(sources, String(query).slice(0, 90));
  }
  if (window.tia && window.tia.onEvent) window.tia.onEvent(onEvent);

  window.TiaVault = {
    el() {
      if (!root) build();
      setTimeout(() => {
        const g = root.querySelector(".vx-graph");
        if (!graph) drawGraph();
        else graph.width(g.offsetWidth).height(g.offsetHeight); // keep the settled layout
      }, 30);
      return root;
    },
  };
})();

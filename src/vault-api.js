// The Business vault for the screen: browse notes, read and (demo vault only) edit them, search, and the link graph.
// Tia's own reads of the vault are reported live by vault.js (onRead) so the screen can show which notes she uses.
const fs = require("fs");
const path = require("path");
const { listNotes } = require("./brain/vault");
const { indexFor } = require("./brain/retrieval");

// Inside the vault only: no "..", no absolute paths, Markdown files only.
function safe(cfg, rel) {
  const clean = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.includes("..") || !clean.endsWith(".md")) throw new Error("bad note path");
  const full = path.join(cfg.vaultDir, clean);
  if (!full.startsWith(path.resolve(cfg.vaultDir))) throw new Error("bad note path");
  return full;
}

function tree(cfg) {
  return listNotes(cfg.vaultDir)
    .filter((n) => !n.startsWith("."))
    .map((rel) => {
      const st = fs.statSync(path.join(cfg.vaultDir, rel));
      return { path: rel, name: path.basename(rel, ".md"), folder: path.dirname(rel) === "." ? "" : path.dirname(rel).replace(/\\/g, "/"), size: st.size, mtime: st.mtimeMs };
    });
}

function read(cfg, rel) {
  const full = safe(cfg, rel);
  if (!fs.existsSync(full)) throw new Error("note not found");
  return { path: rel, text: fs.readFileSync(full, "utf8"), editable: editable(cfg) };
}

// Edits only in the demo vault (or when config.json says vaultEditable: true) – the owner's real vault stays read-only.
const editable = (cfg) => cfg.profile !== "owner" || cfg.vaultEditable === true;
function save(cfg, rel, text) {
  if (!editable(cfg)) throw new Error("This vault is read-only here – edit it in Obsidian.");
  const full = safe(cfg, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, String(text || ""), "utf8");
  graphCache = null;
  return { ok: true };
}

function search(cfg, q, k = 12) {
  if (!String(q || "").trim()) return [];
  const hits = indexFor([{ dir: cfg.vaultDir, label: "" }]).search(String(q), k * 2);
  const seen = new Set();
  const out = [];
  for (const h of hits) {
    if (seen.has(h.doc.name)) continue;
    seen.add(h.doc.name);
    out.push({ path: `${h.doc.name}.md`, name: path.basename(h.doc.name), section: h.doc.section || "", snippet: h.doc.text.replace(/\s+/g, " ").slice(0, 160), score: Math.round(h.score * 100) / 100 });
    if (out.length >= k) break;
  }
  return out;
}

// Graph: one node per note, one link per [[wikilink]] that resolves. Cached until a note changes.
let graphCache = null;
function graph(cfg) {
  const notes = tree(cfg);
  const stamp = notes.reduce((m, n) => Math.max(m, n.mtime), 0) + ":" + notes.length + ":" + cfg.vaultDir;
  if (graphCache && graphCache.stamp === stamp) return graphCache.data;
  const byName = new Map();
  for (const n of notes) {
    byName.set(n.path.replace(/\.md$/, "").toLowerCase(), n.path);
    if (!byName.has(n.name.toLowerCase())) byName.set(n.name.toLowerCase(), n.path);
  }
  const links = [];
  const deg = {};
  for (const n of notes) {
    const text = fs.readFileSync(path.join(cfg.vaultDir, n.path), "utf8");
    const seen = new Set();
    for (const m of text.matchAll(/\[\[([^\]|#]+)/g)) {
      const target = byName.get(m[1].trim().toLowerCase());
      if (!target || target === n.path || seen.has(target)) continue;
      seen.add(target);
      links.push({ source: n.path, target });
      deg[n.path] = (deg[n.path] || 0) + 1;
      deg[target] = (deg[target] || 0) + 1;
    }
  }
  const data = { nodes: notes.map((n) => ({ id: n.path, name: n.name, folder: n.folder.split("/")[0] || "", deg: deg[n.path] || 0 })), links };
  graphCache = { stamp, data };
  return data;
}

// Everything the public replay needs, in one file (the demo vault is fictional).
function snapshot(cfg) {
  return { notes: tree(cfg).map((n) => ({ path: n.path, text: fs.readFileSync(path.join(cfg.vaultDir, n.path), "utf8") })), graph: graph(cfg) };
}

module.exports = { tree, read, save, search, graph, snapshot, editable };

// Reads the owner's Obsidian vault (a folder of Markdown files) and writes Tia's log and lessons.
// Small vault (the demo business): Tia reads all of it. Real vault: she reads only the notes that match
// the message (BM25 search, retrieval.js) plus a few notes the owner always wants her to know.
const fs = require("fs");
const path = require("path");
const { indexFor } = require("./retrieval");

const PER_NOTE = 3500; // characters per matched note (owner mode)

function listNotes(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listNotes(full, base));
    else if (entry.name.endsWith(".md")) out.push(path.relative(base, full).replace(/\\/g, "/"));
  }
  return out;
}

const note = (name, text) => `=== NOTE: ${name} ===\n${text.trim()}`;

// Whole vault (demo business – 15 short notes).
function readVaultContext(vaultDir) {
  const notes = listNotes(vaultDir).filter((n) => n !== "Tia/Activity log.md");
  return notes.map((rel) => note(rel.replace(/\.md$/, ""), fs.readFileSync(path.join(vaultDir, rel), "utf8"))).join("\n\n");
}

// What Tia reads for one message or request.
function contextFor(cfg, query) {
  if (cfg.profile !== "owner") return { text: readVaultContext(cfg.vaultDir), sources: [] };
  const parts = [];
  const sources = [];
  for (const rel of cfg.alwaysNotes || []) {
    const file = path.join(cfg.vaultDir, rel);
    if (!fs.existsSync(file)) continue;
    parts.push(note(rel.replace(/\.md$/, ""), fs.readFileSync(file, "utf8").slice(0, PER_NOTE * 2)));
    sources.push(rel.replace(/\.md$/, ""));
  }
  const rules = path.join(cfg.notesDir, "Learned rules.md");
  if (fs.existsSync(rules)) parts.push(note("Tia/Learned rules", fs.readFileSync(rules, "utf8").slice(-PER_NOTE)));
  // Best-matching sections (several may come from the same note), within a total budget.
  const hits = indexFor([{ dir: cfg.vaultDir, label: "" }]).search(query, (cfg.topNotes || 6) * 2);
  let budget = PER_NOTE * (cfg.topNotes || 6);
  for (const h of hits) {
    if (budget <= 0) break;
    const label = h.doc.section ? `${h.doc.name} › ${h.doc.section}` : h.doc.name;
    parts.push(note(label, h.doc.text));
    budget -= h.doc.text.length;
    if (!sources.includes(h.doc.name)) sources.push(h.doc.name);
  }
  return { text: parts.join("\n\n") || "(no matching notes)", sources };
}

function appendLine(dir, file, line) {
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, file), `\n${line}`, "utf8");
}
const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

function logActivity(notesDir, line) {
  appendLine(notesDir, "Activity log.md", `- ${stamp()} · ${line}`);
}
function addLearnedRule(notesDir, line) {
  appendLine(notesDir, "Learned rules.md", `- ${stamp().slice(0, 10)} · ${line}`);
}

// Puts the two files Tia writes back to their starting state (for repeating the demo).
function resetNotes(notesDir) {
  const templates = path.join(__dirname, "..", "..", "demo");
  fs.mkdirSync(notesDir, { recursive: true });
  fs.copyFileSync(path.join(templates, "learned-rules.template.md"), path.join(notesDir, "Learned rules.md"));
  fs.copyFileSync(path.join(templates, "activity-log.template.md"), path.join(notesDir, "Activity log.md"));
}

module.exports = { readVaultContext, contextFor, logActivity, addLearnedRule, resetNotes, listNotes };

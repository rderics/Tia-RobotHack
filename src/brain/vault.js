// Reads the owner's Obsidian vault (a folder of Markdown files) and writes Tia's log and lessons back into it.
const fs = require("fs");
const path = require("path");

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

// For the demo the whole vault fits in one prompt. A real vault needs search (pick the notes that match the message).
function readVaultContext(vaultDir) {
  const notes = listNotes(vaultDir).filter((n) => n !== "Tia/Activity log.md");
  return notes
    .map((rel) => `=== NOTE: ${rel.replace(/\.md$/, "")} ===\n${fs.readFileSync(path.join(vaultDir, rel), "utf8").trim()}`)
    .join("\n\n");
}

function appendLine(vaultDir, rel, line) {
  const file = path.join(vaultDir, rel);
  fs.appendFileSync(file, `\n${line}`, "utf8");
}

function logActivity(vaultDir, line) {
  appendLine(vaultDir, "Tia/Activity log.md", `- ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${line}`);
}

function addLearnedRule(vaultDir, line) {
  appendLine(vaultDir, "Tia/Learned rules.md", `- ${new Date().toISOString().slice(0, 10)} · ${line}`);
}

// Puts the two files Tia writes to back to their starting state (for repeating the demo).
function resetVault(vaultDir) {
  const demoDir = path.dirname(vaultDir);
  fs.copyFileSync(path.join(demoDir, "learned-rules.template.md"), path.join(vaultDir, "Tia/Learned rules.md"));
  fs.copyFileSync(path.join(demoDir, "activity-log.template.md"), path.join(vaultDir, "Tia/Activity log.md"));
}

module.exports = { readVaultContext, logActivity, addLearnedRule, resetVault, listNotes };

// Finds the notes in the owner's vault that matter for one message or request, so Tia never has to send
// the whole vault to the model. Classic BM25 ranking (idea from OpenJarvis' BM25 memory backend,
// github.com/open-jarvis/openjarvis, Apache-2.0) – written fresh here in plain JavaScript, no dependencies.
// The index lives in memory and refreshes itself when notes change.
const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set([".git", ".obsidian", ".trash", "node_modules", "graphify-out", "Templates", "Excalidraw"]);
const SKIP_PATHS = [/^System\/Tools\//, /archive/i];
const MAX_NOTE_CHARS = 60000; // longer notes are indexed by their first part only
const K1 = 1.4;
const B = 0.75;

const STOP = new Set(
  "the a an and or of to in on for with is are was were be been it this that as at by from not no yes but if then so do does did can could will would should i you he she they we me my your our their his her its un ir ar par uz no kā ka lai bet vai tas tā arī jau ir nav".split(" ")
);

function tokenize(text) {
  return (String(text).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]{2,}/g) || []).filter((t) => !STOP.has(t));
}

function listNotes(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") && e.isDirectory()) continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full).replace(/\\/g, "/");
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || SKIP_PATHS.some((r) => r.test(rel + "/"))) continue;
      listNotes(full, base, out);
    } else if (e.name.endsWith(".md") && !SKIP_PATHS.some((r) => r.test(rel))) out.push(rel);
  }
  return out;
}

// Split a note at its headings; long sections are cut into ~2,500-character pieces.
function sections(text, max = 2500) {
  const out = [];
  let heading = "";
  let buf = [];
  const flush = () => {
    const body = buf.join("\n").trim();
    buf = [];
    if (!body) return;
    for (let i = 0; i < body.length; i += max) out.push({ heading, text: (heading ? `${heading}\n` : "") + body.slice(i, i + max) });
  };
  for (const line of text.split(/\r?\n/)) {
    if (/^#{1,4}\s/.test(line)) {
      flush();
      heading = line.replace(/^#+\s*/, "").trim();
    } else buf.push(line);
  }
  flush();
  return out.length ? out : [{ heading: "", text: text.slice(0, max) }];
}

class VaultIndex {
  constructor(dirs) {
    this.dirs = dirs; // [{ dir, label }]
    this.docs = [];
    this.df = new Map();
    this.avgLen = 1;
    this.builtAt = 0;
    this.signature = "";
  }

  // Cheap check: rebuild only when a note was added, removed or changed.
  freshSignature() {
    let sig = "";
    for (const { dir } of this.dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const rel of listNotes(dir)) {
        const st = fs.statSync(path.join(dir, rel));
        sig += `${rel}:${st.mtimeMs};`;
      }
    }
    return sig;
  }

  ensure() {
    if (Date.now() - this.builtAt < 30000 && this.docs.length) return this;
    const sig = this.freshSignature();
    this.builtAt = Date.now();
    if (sig === this.signature) return this;
    this.signature = sig;
    this.docs = [];
    this.df = new Map();
    for (const { dir, label } of this.dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const rel of listNotes(dir)) {
        const text = fs.readFileSync(path.join(dir, rel), "utf8").slice(0, MAX_NOTE_CHARS);
        const name = rel.replace(/\.md$/, "");
        // Index each section of a note separately, so a table deep inside a long note can still be found.
        for (const part of sections(text)) {
          // The note's name counts three times: "Anna Kalniņa" should win for "Anna".
          const tokens = tokenize(`${name} ${name} ${name} ${part.heading} ${part.text}`);
          const tf = new Map();
          for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
          for (const t of tf.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
          this.docs.push({ name: label ? `${label}/${name}` : name, section: part.heading, file: path.join(dir, rel), text: part.text, len: tokens.length, tf });
        }
      }
    }
    this.avgLen = this.docs.reduce((s, d) => s + d.len, 0) / Math.max(1, this.docs.length);
    return this;
  }

  search(query, k = 6) {
    this.ensure();
    const q = [...new Set(tokenize(query))];
    const N = this.docs.length;
    const scored = [];
    for (const d of this.docs) {
      let s = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        const n = this.df.get(t) || 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        s += (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / this.avgLen));
      }
      if (s > 0) scored.push({ doc: d, score: s });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, k);
  }

  get size() {
    return this.ensure().docs.length;
  }
}

const indexes = new Map();
function indexFor(dirs) {
  const key = dirs.map((d) => d.dir).join("|");
  if (!indexes.has(key)) indexes.set(key, new VaultIndex(dirs));
  return indexes.get(key);
}

module.exports = { indexFor, tokenize };

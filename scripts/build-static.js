// Builds the public replay-only site (no AI calls, no server) into a folder.
// Usage: node scripts/build-static.js <outDir> [basePath]
//   e.g. node scripts/build-static.js ../Website-Saldus/website/tia /tia/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const out = path.resolve(process.argv[2] || path.join(ROOT, "dist", "tia"));
const base = process.argv[3] || "/tia/";

const inbox = JSON.parse(fs.readFileSync(path.join(ROOT, "demo/inbox.json"), "utf8"));
const replay = JSON.parse(fs.readFileSync(path.join(ROOT, "demo/replay.json"), "utf8"));

// Safety checks before anything goes public.
const missing = inbox.filter((m) => !replay[m.id]).map((m) => m.id);
if (missing.length) throw new Error(`replay.json is missing: ${missing.join(", ")} – do a full live run first`);
const both = JSON.stringify(inbox) + JSON.stringify(replay);
// Only reserved demo domains are allowed (RFC 2606: *.example, example.com/.org/.net).
const reserved = (domain) => /(^|\.)example$/i.test(domain) || /^example\.(com|org|net)$/i.test(domain);
const leak = (both.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).find((a) => !reserved(a.split("@")[1]));
if (leak) throw new Error(`Real-looking email address in demo data: ${leak} – use an .example address`);

// Empty the folder (not delete it – Windows refuses if a terminal is open inside it).
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) fs.rmSync(path.join(out, f), { recursive: true, force: true });
fs.mkdirSync(path.join(out, "data"), { recursive: true });

let html = fs.readFileSync(path.join(ROOT, "src/renderer/index.html"), "utf8");
html = html
  .replace("<head>", `<head>\n  <base href="${base}" />`)
  .replace('<script src="web-bridge.js"></script>', '<script src="guard.js"></script>\n  <script src="web-bridge.js"></script>')
  .replace("<title>Tia</title>", "<title>Tia – AI secretary demo</title>");
fs.writeFileSync(path.join(out, "index.html"), html);
fs.copyFileSync(path.join(ROOT, "src/renderer/styles.css"), path.join(out, "styles.css"));
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "src/renderer/assets"))) {
  if (f.endsWith(".ico")) continue; // desktop-app window icon only
  fs.copyFileSync(path.join(ROOT, "src/renderer/assets", f), path.join(out, "assets", f));
}
fs.copyFileSync(path.join(ROOT, "src/renderer/app.js"), path.join(out, "app.js"));
fs.copyFileSync(path.join(ROOT, "src/renderer/scene.js"), path.join(out, "scene.js")); // 3D stage (npm run build:scene)
fs.copyFileSync(path.join(ROOT, "src/brain/guard.js"), path.join(out, "guard.js"));
fs.copyFileSync(path.join(ROOT, "src/static/static-bridge.js"), path.join(out, "web-bridge.js"));
fs.writeFileSync(path.join(out, "data/inbox.json"), JSON.stringify(inbox));
fs.writeFileSync(path.join(out, "data/replay.json"), JSON.stringify(replay));

// Cache-busting: Cloudflare lets browsers keep scripts for hours, so each link gets ?v=<content hash>.
// A changed file gets a new URL; an unchanged one stays cached.
const crypto = require("crypto");
const hashOf = (rel) => crypto.createHash("sha1").update(fs.readFileSync(path.join(out, rel))).digest("hex").slice(0, 10);
let page = fs.readFileSync(path.join(out, "index.html"), "utf8");
page = page.replace(/(src|href)="((?:assets\/)?[\w.-]+\.(?:js|css|png))"/g, (all, attr, rel) =>
  fs.existsSync(path.join(out, rel)) ? `${attr}="${rel}?v=${hashOf(rel)}"` : all
);
fs.writeFileSync(path.join(out, "index.html"), page);

console.log(`Built public replay site → ${out} (base ${base})`);
for (const f of fs.readdirSync(out, { recursive: true })) console.log("  " + f);

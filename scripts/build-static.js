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

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "data"), { recursive: true });

let html = fs.readFileSync(path.join(ROOT, "src/renderer/index.html"), "utf8");
html = html
  .replace("<head>", `<head>\n  <base href="${base}" />`)
  .replace('<script src="web-bridge.js"></script>', '<script src="guard.js"></script>\n  <script src="web-bridge.js"></script>')
  .replace("<title>Tia</title>", "<title>Tia – AI secretary demo</title>");
fs.writeFileSync(path.join(out, "index.html"), html);
fs.copyFileSync(path.join(ROOT, "src/renderer/styles.css"), path.join(out, "styles.css"));
fs.copyFileSync(path.join(ROOT, "src/renderer/app.js"), path.join(out, "app.js"));
fs.copyFileSync(path.join(ROOT, "src/brain/guard.js"), path.join(out, "guard.js"));
fs.copyFileSync(path.join(ROOT, "src/static/static-bridge.js"), path.join(out, "web-bridge.js"));
fs.writeFileSync(path.join(out, "data/inbox.json"), JSON.stringify(inbox));
fs.writeFileSync(path.join(out, "data/replay.json"), JSON.stringify(replay));

console.log(`Built public replay site → ${out} (base ${base})`);
for (const f of fs.readdirSync(out, { recursive: true })) console.log("  " + f);

// Builds the public replay-only site (no AI calls, no server) into a folder.
// Usage: node scripts/build-static.js <outDir> [basePath]
//   e.g. node scripts/build-static.js ../Website-Saldus/website/tia /tia/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const out = path.resolve(process.argv[2] || path.join(ROOT, "dist", "tia"));
const base = process.argv[3] || "/tia/demo/";

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
  .replace("<title>Tia</title>", "<title>Tia – AI secretary demo</title>")
  // Cloudflare Pages adds its Web Analytics beacon to every page – let it load and report.
  .replace("script-src 'self'", "script-src 'self' https://static.cloudflareinsights.com")
  .replace("connect-src 'self'", "connect-src 'self' https://cloudflareinsights.com");
fs.writeFileSync(path.join(out, "index.html"), html);
fs.copyFileSync(path.join(ROOT, "src/renderer/styles.css"), path.join(out, "styles.css"));
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
// assets incl. avatars/ – minus the desktop-app icon and the retired 3D stage model
fs.cpSync(path.join(ROOT, "src/renderer/assets"), path.join(out, "assets"), {
  recursive: true,
  filter: (src) => !src.endsWith(".ico") && path.basename(src) !== "tia-avatar.glb",
});
fs.copyFileSync(path.join(ROOT, "src/renderer/app.js"), path.join(out, "app.js"));
fs.copyFileSync(path.join(ROOT, "src/renderer/avatar.js"), path.join(out, "avatar.js")); // talking avatar (npm run build:avatar)
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

// Tia's voice for the demo: every line the replay can speak (same wording as app.js), recorded once with the
// Microsoft neural voice and kept in data/voice-cache so later builds only record new lines.
function demoLines() {
  const lines = [];
  for (const m of inbox) {
    const p = replay[m.id].proposal;
    lines.push(p.narration || `Handled: ${p.summary}`, `This one needs you: ${p.summary}`);
  }
  for (let h = 0; h <= inbox.length; h++)
    lines.push(`Done. I handled ${h} things myself, about ${h * 4} minutes saved. ${inbox.length - h} need you, and my drafts are ready.`);
  lines.push(
    "Okay, I won't do that. Noted in your notes.",
    "Got it. I'll answer messages like this myself from now on.",
    "Thanks, noted in your notes so I learn from it.",
    "Fresh start. I've forgotten what you taught me today."
  );
  return [...new Set(lines)];
}
(async () => {
  if (process.env.TIA_NO_VOICE !== "1") {
    const { synthesize } = require("../src/voice");
    const lines = demoLines();
    const cacheDir = path.join(ROOT, "data/voice-cache");
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(path.join(out, "data/voice"), { recursive: true });
    const index = {};
    for (const text of lines) {
      try {
        const name = crypto.createHash("sha1").update(text).digest("hex").slice(0, 12) + ".json";
        const cached = path.join(cacheDir, name);
        if (!fs.existsSync(cached)) fs.writeFileSync(cached, JSON.stringify(await synthesize({}, text)));
        fs.copyFileSync(cached, path.join(out, "data/voice", name));
        index[text] = name;
      } catch (e) {
        console.warn(`  voice skipped (${e.message}): ${text.slice(0, 50)}`);
      }
    }
    fs.writeFileSync(path.join(out, "data/voice/index.json"), JSON.stringify(index));
    console.log(`Recorded ${Object.keys(index).length}/${lines.length} demo voice lines`);
  }
  console.log(`Built public replay site → ${out} (base ${base})`);
  for (const f of fs.readdirSync(out)) console.log("  " + f);
})();

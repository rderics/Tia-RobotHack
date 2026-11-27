// Edits the recorded take into the demo video: scene cuts on the markers, dead time removed, each scene sped up to fit
// its narration line (never slowed), smooth zooms on the key moment, title cards, captions + subtitles, Tia's voice.
//   node scripts/video/edit.js <takeDir> <voDir> <out.mp4>
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const [TAKE, VO, OUTFILE] = process.argv.slice(2).map((p) => path.resolve(p));
const WORK = path.join(TAKE, "edit");
fs.mkdirSync(WORK, { recursive: true });
const W = 1920;
const H = 1080;
const FPS = 30;
const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
const narration = JSON.parse(fs.readFileSync(path.join(__dirname, "narration.json"), "utf8"));
const LINE = Object.fromEntries(narration.map((l) => [l.id, l.text]));

// ---------- 1 · frames → raw.mp4 (constant 30 fps) ----------
const frames = JSON.parse(fs.readFileSync(path.join(TAKE, "frames.json"), "utf8"));
const markers = JSON.parse(fs.readFileSync(path.join(TAKE, "markers.json"), "utf8"));
const t0 = frames[0].t;
const raw = path.join(WORK, "raw.mp4");
if (!fs.existsSync(raw)) {
  // resample the variable-rate screencast onto an exact 30 fps clock: for every output tick take the newest frame,
  // and write runs of the same frame as one entry (whole-frame durations – no drift against the markers)
  const total = frames[frames.length - 1].t - t0;
  const ticks = Math.ceil(total * FPS);
  const runs = [];
  let j = 0;
  for (let k = 0; k <= ticks; k++) {
    const t = t0 + k / FPS;
    while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
    if (runs.length && runs[runs.length - 1].j === j) runs[runs.length - 1].n++;
    else runs.push({ j, n: 1 });
  }
  const fp = (k) => path.join(TAKE, "frames", frames[k].file).replace(/\\/g, "/");
  const list = runs.map((r) => `file '${fp(r.j)}'\nduration ${(r.n / FPS).toFixed(6)}`).join("\n");
  fs.writeFileSync(path.join(WORK, "frames.txt"), `${list}\nfile '${fp(runs[runs.length - 1].j)}'\n`);
  ff(["-f", "concat", "-safe", "0", "-i", path.join(WORK, "frames.txt"), "-vf", `fps=${FPS},scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "medium", "-crf", "14", raw]);
  console.log(`raw: ${dur(raw).toFixed(1)} s for ${total.toFixed(1)} s recorded`);
}
const at = (name, from = 0) => {
  const m = markers.find((x, i) => x.name === name && x.t - t0 >= from);
  if (!m) throw new Error(`marker ${name} missing`);
  return { t: m.t - t0, zoom: m.zoom };
};
const cutsBetween = (a, b) => {
  const out = [];
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].name !== "cut_start") continue;
    const s = markers[i].t - t0;
    const e = (markers.slice(i + 1).find((x) => x.name === "cut_end") || {}).t - t0;
    if (s >= a && e <= b) out.push([s, e]);
  }
  return out;
};

// ---------- 2 · scenes ----------
// vo = narration id; min/max = how long the scene may be on screen (seconds); zoom = marker whose box to zoom into
const S = (name, from, to, o) => ({ name, from, to, ...o });
const scenes = [
  S("hello", "hello", "inbox", { vo: "hello", label: "", hold: 0.3 }),
  S("inbox", "inbox", "inbox_done", { vo: "inbox", label: "12 messages · email, WhatsApp, Instagram, Slack", min: 8.5, max: 9.5, montage: 4, window: 3.4 }),
  S("risk", "risk", "risk_end", { vo: "risk", label: "Money & risk → waits for you", zoomAt: "risk", zoomMax: 2.1 }),
  S("apps", "apps", "apps_end", { vo: "apps", label: "Apps you know · reply from your own notes", zoomAt: "apps", zoomMax: 1.55 }),
  S("contract", "contract", "print", { vo: "contract", label: "A detail is missing? Tia asks first", zoomAt: "contract_card", zoomMax: 1.9, min: 7 }),
  S("print", "print", "print_end", { vo: "print", label: "Approve → PDF → printer → Outlook draft", zoomAt: "docs", zoomMax: 1.25, min: 6.5 }),
  S("vault", "vault", "vault_end", { vo: "vault", label: "Your notes are Tia's knowledge – watch what she reads", min: 6 }),
  S("calendar", "calendar", "calendar_end", { vo: "calendar", label: "One sentence → calendar event", min: 5 }),
  S("ads", "ads", "ads_end", { vo: "ads", label: "Your real Meta ads – scored and rewritten", zoomAt: "ads_review", zoomMax: 1.6, min: 7 }),
  S("phone", "phone", "end", { vo: "phone", label: "Scan once · approve from your phone", min: 3.6 }),
];

function zoomFilter(box, zMax, startOut, total) {
  if (!box) return "";
  const pad = 1.35;
  let z = Math.min(W / (box.w * pad), H / (box.h * pad), zMax);
  z = Math.max(1.12, z);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  // eased zoom-in over 0.7 s from startOut; x/y keep the box centred, clamped inside the frame
  const p = `min(max((it-${startOut.toFixed(3)})/0.7,0),1)`;
  const e = `(${p}*${p}*(3-2*${p}))`;
  const Z = `(1+${(z - 1).toFixed(4)}*${e})`;
  // work on a 2× upscaled frame so the pan is smooth (zoompan rounds to whole pixels)
  const X = `max(0,min(iw-iw/zoom,${(cx * 2).toFixed(1)}-iw/zoom/2))`;
  const Y = `max(0,min(ih-ih/zoom,${(cy * 2).toFixed(1)}-ih/zoom/2))`;
  return `scale=${W * 2}:${H * 2}:flags=bicubic,zoompan=z='${Z}':x='${X}':y='${Y}':d=1:s=${W}x${H}:fps=${FPS},`;
}

const clips = [];
const timeline = []; // {start, len, vo, label}
let cursor = 0;

// ---------- 3 · title cards (HTML → PNG with Tia's look) ----------
async function cards() {
  const b = await chromium.launch({ channel: "msedge", headless: true });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const logo = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "..", "..", "src", "renderer", "assets", "logo-light.png")).toString("base64");
  const css = `*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;background:radial-gradient(60% 70% at 50% 40%,#2A2140 0%,#0E0D13 70%);color:#ECEAF2;font-family:'Instrument Sans','Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:112px;line-height:1.02;letter-spacing:-1px}em{color:#B9A3F2;font-style:italic}p{font-size:34px;color:#B5B0BF;margin-top:28px}.k{font-size:24px;letter-spacing:6px;text-transform:uppercase;color:#8C8796;margin-bottom:28px}img{width:120px;height:120px;margin-bottom:34px}`;
  const shot = async (html, file) => {
    await p.setContent(`<html><head><style>${css}</style></head><body>${html}</body></html>`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: file });
  };
  await shot(`<div class="k">For small business owners</div><h1>Two hours a day<br>answering <em>messages</em>.</h1><p>Mail · WhatsApp · Instagram · Slack · offers · contracts</p>`, path.join(WORK, "card-intro.png"));
  await shot(`<img src="${logo}"><h1>Meet <em>Tia</em>.</h1><p>Your AI secretary – every decision stays yours.</p>`, path.join(WORK, "card-outro.png"));
  await b.close();
}

function cardClip(png, seconds, out) {
  ff(["-loop", "1", "-t", String(seconds), "-i", png, "-vf", `scale=${W * 2}:${H * 2},zoompan=z='1+0.035*it/${seconds}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${W}x${H}:fps=${FPS},fade=t=in:st=0:d=0.35,fade=t=out:st=${(seconds - 0.35).toFixed(2)}:d=0.35,format=yuv420p`, "-c:v", "libx264", "-crf", "16", "-preset", "medium", out]);
  return out;
}

(async () => {
  await cards();
  const intro = cardClip(path.join(WORK, "card-intro.png"), 3.0, path.join(WORK, "c00-intro.mp4"));
  clips.push(intro);
  timeline.push({ start: cursor, len: 3.0, label: "", vo: null });
  cursor += 3.0;

  scenes.forEach((sc, i) => {
    const a = at(sc.from).t;
    const b = at(sc.to, a).t;
    const cuts = cutsBetween(a, b);
    // keep-ranges inside [a,b] without the cut (waiting) parts
    let keep = [];
    let s = a;
    for (const [cs, ce] of cuts) {
      if (cs > s) keep.push([s, cs]);
      s = ce;
    }
    if (b > s) keep.push([s, b]);
    if (sc.montage) {
      // a long stretch → a few short moments spread over it (quick cuts), plus its very end
      const n = sc.montage;
      const w = sc.window || 3.2;
      const span = b - a - w;
      keep = [...Array(n)].map((_, k) => {
        const c = a + w / 2 + (span * (k + 0.5)) / n;
        return [c - w / 2, c + w / 2];
      });
      keep.push([b - 2.4, b]);
    }
    const realLen = keep.reduce((t, [x, y]) => t + (y - x), 0);
    const voLen = sc.vo ? dur(path.join(VO, `${sc.vo}.mp3`)) : 2;
    let target = Math.max(voLen + 0.7, sc.min || 0);
    if (sc.max) target = Math.min(target, sc.max);
    const speed = Math.max(1, realLen / target);
    const outLen = realLen / speed;
    const hold = Math.max(0, target - outLen); // freeze the last frame if the scene is shorter than its line
    // zoom start in output time
    let zf = "";
    if (sc.zoomAt) {
      const zm = at(sc.zoomAt, a);
      let removed = 0;
      for (const [cs, ce] of cuts) if (ce <= zm.t) removed += ce - cs;
      const zStart = Math.max(0, (zm.t - a - removed) / speed - 0.15);
      zf = zoomFilter(zm.zoom, sc.zoomMax || 1.6, zStart, outLen + hold);
    }
    const parts = keep.map(([x, y], k) => `[0:v]trim=start=${x.toFixed(3)}:end=${y.toFixed(3)},setpts=PTS-STARTPTS[p${k}]`).join(";");
    const concat = keep.map((_, k) => `[p${k}]`).join("") + `concat=n=${keep.length}:v=1:a=0[c]`;
    const out = path.join(WORK, `s${String(i + 1).padStart(2, "0")}-${sc.name}.mp4`);
    const chain = `[c]setpts=(PTS-STARTPTS)/${speed.toFixed(4)},fps=${FPS},tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},${zf}trim=duration=${(outLen + hold).toFixed(3)},format=yuv420p[v]`;
    ff(["-i", raw, "-filter_complex", `${parts};${concat};${chain}`, "-map", "[v]", "-c:v", "libx264", "-crf", "16", "-preset", "medium", out]);
    clips.push(out);
    const len = dur(out);
    timeline.push({ start: cursor, len, label: sc.label, vo: sc.vo });
    console.log(`${sc.name}: real ${realLen.toFixed(1)}s → ${len.toFixed(1)}s (×${speed.toFixed(2)})`);
    cursor += len;
  });

  const outro = cardClip(path.join(WORK, "card-outro.png"), 5.0, path.join(WORK, "c99-outro.mp4"));
  clips.push(outro);
  timeline.push({ start: cursor, len: 5.0, label: "", vo: "outro" });
  cursor += 5.0;

  // ---------- 4 · join, captions (ASS), voice ----------
  fs.writeFileSync(path.join(WORK, "clips.txt"), clips.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"));
  const joined = path.join(WORK, "joined.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", path.join(WORK, "clips.txt"), "-c", "copy", joined]);

  const ts = (x) => {
    const h = Math.floor(x / 3600);
    const m = Math.floor((x % 3600) / 60);
    const s = (x % 60).toFixed(2).padStart(5, "0");
    return `${h}:${String(m).padStart(2, "0")}:${s}`;
  };
  const esc = (t) => String(t).replace(/[{}]/g, "").replace(/\n/g, "\\N");
  const ass = [
    "[Script Info]", "ScriptType: v4.00+", `PlayResX: ${W}`, `PlayResY: ${H}`, "WrapStyle: 0", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // label chip top-left (lavender on dark), subtitles bottom-centre (white on soft dark box)
    "Style: Label,Instrument Sans SemiBold,46,&H00F2A3B9,&H00FFFFFF,&H00130D0E,&H96130D0E,0,0,0,0,100,100,0.5,0,3,14,0,7,118,60,104,1",
    "Style: Sub,Instrument Sans Medium,44,&H00FFFFFF,&H00FFFFFF,&H00130D0E,&H8C130D0E,0,0,0,0,100,100,0,0,3,16,0,2,240,240,58,1",
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const audio = [];
  for (const seg of timeline) {
    if (seg.label) ass.push(`Dialogue: 1,${ts(seg.start + 0.15)},${ts(seg.start + seg.len - 0.1)},Label,,0,0,0,,{\\fad(180,150)}${esc(seg.label)}`);
    if (seg.vo) {
      const vStart = seg.start + 0.25;
      const vLen = dur(path.join(VO, `${seg.vo}.mp3`));
      audio.push({ file: path.join(VO, `${seg.vo}.mp3`), at: vStart });
    }
  }
  const assFile = path.join(WORK, "captions.ass");
  fs.writeFileSync(assFile, ass.join("\n"), "utf8");
  // the voice lines placed on the timeline
  const inputs = audio.flatMap((a) => ["-i", a.file]);
  const delays = audio.map((a, k) => `[${k + 1}:a]adelay=${Math.round(a.at * 1000)}|${Math.round(a.at * 1000)},volume=1.0[a${k}]`).join(";");
  const mix = audio.map((_, k) => `[a${k}]`).join("") + `amix=inputs=${audio.length}:normalize=0,apad[aout]`;
  const subPath = assFile.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
  const fontsDir = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Windows", "Fonts").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
  ff(["-i", joined, ...inputs, "-filter_complex", `[0:v]subtitles='${subPath}':fontsdir='${fontsDir}'[v];${delays};${mix}`, "-map", "[v]", "-map", "[aout]", "-t", cursor.toFixed(2), "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUTFILE]);
  console.log(`done: ${OUTFILE} (${cursor.toFixed(1)} s)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

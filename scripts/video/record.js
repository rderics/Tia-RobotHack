// Records the Tia demo video: drives the real app (stand mode, Oakline Studio) in Edge at 1920×1080 like a person,
// saves every screen frame (CDP screencast, JPEG q92) and a marker for every story beat → markers.json for edit.js.
// Run Tia first:  TIA_CONFIG=none TIA_PORT=4848 TIA_SIMULATE_ACTIONS=1 TIA_QUICK_TUNNEL=0 TIA_AUTO_UPDATE=0 node src/web.js
// Then:           node scripts/video/record.js <outDir>
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(process.argv[2] || "video-out");
const BASE = process.env.TIA_URL || "http://localhost:4848";
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
const markers = [];
const frames = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try {
      for (const t of ["calendar", "email", "whatsapp", "instagram", "slack", "linkedin"]) localStorage.setItem(`tia.src.${t}`, "demo");
      localStorage.setItem("tia.src.ads", "live"); // the real ad account – a real result on screen
    } catch {}
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(90000);
  const cdp = await ctx.newCDPSession(page);
  let n = 0;
  cdp.on("Page.screencastFrame", (f) => {
    const file = path.join(OUT, "frames", `f${String(n++).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file: path.basename(file), t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const mark = (name, extra = {}) => {
    markers.push({ name, t: Date.now() / 1000, ...extra });
    console.log(`${new Date().toTimeString().slice(0, 8)} mark ${name}`);
  };
  const boxOf = async (sel) => {
    const b = await page.evaluate((s) => {
      const e = typeof s === "string" ? document.querySelector(s) : null;
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }, sel);
    return b;
  };
  // switch apps the way a click would (also marks the rail button), without pointer hit-testing
  const rail = (tab) => page.evaluate((t) => window.TiaChannels.showTab(t, { byUser: true }), tab);
  const type = async (sel, text) => {
    await page.focus(sel);
    await page.fill(sel, "");
    await page.type(sel, text, { delay: 38 });
  };

  // ---- set up: fresh desk, Follow Tia on, voice off (the narration speaks)
  await page.goto(BASE + "/");
  await page.waitForSelector("#runBtn");
  await page.evaluate(async () => {
    try {
      await window.tia.reset();
    } catch {}
    window.__ev = [];
    window.tia.onEvent((e) => window.__ev.push({ type: e.type, at: Date.now() }));
  });
  await page.reload();
  await page.waitForSelector("#runBtn");
  await page.evaluate(() => {
    window.__ev = [];
    window.tia.onEvent((e) => window.__ev.push({ type: e.type, at: Date.now() }));
  });
  await wait(3000);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await wait(800);

  // 1 · hello
  mark("hello");
  await wait(4500);

  // 2 · inbox: Start the day – Tia reads every app (Follow Tia opens each one)
  mark("inbox");
  await page.click("#runBtn");
  await page.waitForFunction(() => (window.__ev || []).some((e) => e.type === "done"), null, { timeout: 240000 });
  // the screen walks through the messages after the server is done – wait until all 12 have landed
  await page.waitForFunction(() => [...document.querySelectorAll(".tab")].map((t) => parseInt((t.innerText.match(/\d+/) || ["0"])[0], 10)).reduce((a, b) => a + b, 0) >= 12, null, { timeout: 300000 });
  mark("inbox_done");
  await wait(3500);
  // from here the recorder chooses the app – Follow Tia off
  await page.evaluate(() => {
    const f = document.querySelector(".apprail .follow");
    if (f && f.classList.contains("on")) f.click();
  });
  await rail("tia");

  // 3 · risk: the fake bank-details email waits in Needs you
  const bank = await page.evaluate(() => {
    const it = [...document.querySelectorAll("#needs .item")].find((x) => /bank/i.test(x.innerText));
    if (!it) return null;
    it.scrollIntoView({ block: "center" });
    it.classList.add("rec-focus");
    const r = it.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  mark("risk", { zoom: bank });
  await wait(6000);
  mark("risk_end");

  // 4 · apps: Mail (Outlook look) – Tia writes the reply, Save draft
  await rail("email");
  await wait(900);
  await page.evaluate(() => {
    const r = [...document.querySelectorAll(".ol-row")].find((x) => /Dmitrijs/i.test(x.innerText));
    if (r) r.click();
  });
  await wait(900);
  mark("apps", { zoom: await boxOf(".ol-reply") });
  await page.evaluate(() => [...document.querySelectorAll(".ol-btn")].find((b) => /Let Tia write/.test(b.textContent))?.click());
  await wait(5200);
  await page.evaluate(() => document.querySelector(".ol-primary")?.click());
  await wait(3600);
  mark("apps_end");

  // 5 · contract by voice/typing: Tia asks the open question first
  await rail("tia");
  await wait(1000);
  mark("contract");
  await type("#askInput", "Make the contract for Ieva Bērziņa");
  await page.keyboard.press("Enter");
  mark("cut_start");
  await page.waitForFunction(() => /\?/.test(document.querySelector("#speechText")?.textContent || "") && !/Make the contract/.test(document.querySelector("#speechText")?.textContent || ""), null, { timeout: 120000 });
  await wait(400);
  mark("cut_end");
  await wait(3500);
  await type("#askInput", "Oak worktop, please");
  await page.keyboard.press("Enter");
  mark("cut_start");
  await page.waitForFunction(() => [...document.querySelectorAll("#needs .item")].some((x) => /contract/i.test(x.innerText)), null, { timeout: 120000 });
  await wait(400);
  mark("cut_end");
  const card = await page.evaluate(() => {
    const it = [...document.querySelectorAll("#needs .item")].find((x) => /contract/i.test(x.innerText));
    it.scrollIntoView({ block: "center" });
    const r = it.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  mark("contract_card", { zoom: card });
  await wait(3500);

  // 6 · approve → PDF → printer → Outlook draft, then the Docs tab
  mark("print");
  await page.evaluate(() => {
    const it = [...document.querySelectorAll("#needs .item")].find((x) => /contract/i.test(x.innerText));
    it.querySelector(".btn.ok")?.click();
  });
  await wait(9000);
  await rail("docs");
  await wait(3500);
  mark("docs", { zoom: await boxOf(".dx-prev") });
  await wait(4000);
  mark("print_end");

  // 7 · vault: graph + live "Tia is reading"
  await rail("vault");
  await wait(3500);
  mark("vault");
  await page.evaluate(() => window.tia.say("What did Laura Vītola complain about?").catch(() => {}));
  await wait(9000);
  mark("vault_end");

  // 8 · calendar: one sentence → event
  await rail("calendar");
  await wait(2500);
  mark("calendar");
  await type(".gc-tia textarea", "Measuring at Anna Kalniņa's on Friday at 14 for an hour");
  await page.evaluate(() => [...document.querySelectorAll(".gc-create")].find((b) => /Fill in/.test(b.textContent))?.click());
  mark("cut_start");
  await page.waitForSelector(".gc-new", { timeout: 90000 });
  mark("cut_end");
  await wait(1800);
  await page.evaluate(() => [...document.querySelectorAll(".gc-create")].find((b) => /^Add/.test(b.textContent.trim()))?.click());
  await wait(3000);
  mark("calendar_end");

  // 9 · ads: real Meta ad account → Tia's review and better ad
  await rail("ads");
  mark("cut_start");
  await page.waitForSelector(".am-table tbody tr", { timeout: 120000 });
  await wait(800);
  mark("cut_end");
  mark("ads");
  await page.evaluate(() => document.querySelector(".am-table tbody tr")?.click());
  await wait(1500);
  await page.evaluate(() => document.querySelector(".am-table tbody tr")?.click());
  mark("cut_start");
  await page.waitForSelector(".am-verdict", { timeout: 120000 });
  mark("cut_end");
  await wait(1500);
  mark("ads_review", { zoom: await boxOf(".am-drawer") });
  await wait(4500);
  mark("ads_end");

  // 10 · phone
  await rail("tia");
  await wait(800);
  await page.click("#pairBtn");
  await wait(1500);
  mark("phone");
  await wait(4000);
  mark("end");

  await cdp.send("Page.stopScreencast").catch(() => {});
  await wait(300);
  fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames));
  fs.writeFileSync(path.join(OUT, "markers.json"), JSON.stringify(markers, null, 2));
  console.log(`frames ${frames.length}, markers ${markers.length}`);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

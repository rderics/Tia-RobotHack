// Tia's lead finder: searches the web for real businesses that fit the owner's target audience, reads their
// websites, lets the AI score the fit and write a personal first line, and saves them to Tia's CRM.
//   1. search  – OpenStreetMap (Overpass API: free, no key, open data © OpenStreetMap contributors, ODbL)
//   2. visit   – each business's own homepage: title + description (one polite request, identified)
//   3. score   – the AI chain (providers.js) with the vault's idea of a good fit (Business, Lead qualification…)
//   4. save    – the owner's Google Sheet (GOOGLE_SHEET_WEBHOOK → Apps Script in scripts/google-sheets-crm), with
//                data/crm.json + data/crm.csv + the /crm page as the local copy / fallback
// Read-only towards the outside world: Tia never contacts a lead herself – outreach is a draft the owner approves.
const fs = require("fs");
const path = require("path");
const { ask } = require("../brain/providers");
const { contextFor } = require("../brain/vault");

const UA = "Tia-RobotHack-demo/1.0 (AI secretary prototype; github.com/rderics/Tia-RobotHack)";
const AREAS = {
  riga: { name: "Riga", bbox: [56.85, 23.93, 57.09, 24.33] },
  pieriga: { name: "Riga and Pierīga", bbox: [56.75, 23.7, 57.2, 24.5] },
  jurmala: { name: "Jūrmala", bbox: [56.93, 23.5, 57.0, 23.95] },
};
// Who sends a kitchen studio its clients (from the vault: referrals from architects and agencies convert best).
const SEGMENTS = {
  architects: { label: "architects", filters: ['nwr["office"="architect"]'] },
  agencies: { label: "real-estate agencies", filters: ['nwr["office"="estate_agent"]'] },
  interior: { label: "interior design studios", filters: ['nwr["shop"="interior_decoration"]', 'nwr["craft"="interior_decorator"]'] },
  builders: { label: "construction companies", filters: ['nwr["office"="construction_company"]', 'nwr["craft"="builder"]'] },
};

const crmFile = (cfg) => path.join(cfg.dataDir, "crm.json");
function loadCrm(cfg) {
  try {
    return JSON.parse(fs.readFileSync(crmFile(cfg), "utf8"));
  } catch {
    return [];
  }
}
function saveCrm(cfg, rows) {
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  fs.writeFileSync(crmFile(cfg), JSON.stringify(rows, null, 2));
  const cols = ["status", "fit", "name", "segment", "address", "website", "email", "phone", "why", "opener", "source", "found_at"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c])).join(","))].join("\r\n");
  fs.writeFileSync(path.join(cfg.dataDir, "crm.csv"), "﻿" + csv, "utf8"); // BOM → Excel shows ā, š… right
}

function pickSegments(text) {
  const t = String(text || "").toLowerCase();
  const picked = Object.keys(SEGMENTS).filter((k) =>
    ({ architects: /archit/, agencies: /real.?estate|agenc|nekustam|broker|realtor/, interior: /interior|design/, builders: /build|construct|būvn/ })[k].test(t)
  );
  return picked.length ? picked : ["architects", "agencies"];
}
function pickArea(text) {
  const t = String(text || "").toLowerCase();
  if (/jūrmal|jurmal/.test(t)) return "jurmala";
  if (/pierīg|pieriga|around riga|near riga/.test(t)) return "pieriga";
  return "riga";
}

// ---------- Google Sheets (the owner's own CRM) ----------
const sheetOn = () => !!process.env.GOOGLE_SHEET_WEBHOOK;
async function sheet(body) {
  if (!sheetOn()) return null;
  const r = await fetch(process.env.GOOGLE_SHEET_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script reads the raw body
    body: JSON.stringify({ token: process.env.GOOGLE_SHEET_TOKEN || "", ...body }),
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  if (j.error) throw new Error(`Google Sheet: ${j.error}`);
  return j;
}
const sheetRow = (r) => [r.found_at, r.name, r.segment, r.address, r.website, r.email, r.fit, r.why, r.status, r.opener, r.source];
const setStatus = (name, status) => sheet({ action: "status", name, status });

const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
async function overpass(cfg, segments, area) {
  const [s, w, n, e] = AREAS[area].bbox;
  // always ask for every partner type of the area and filter here → one cache per area serves every search
  const parts = Object.keys(SEGMENTS).flatMap((k) => SEGMENTS[k].filters.map((f) => `${f}(${s},${w},${n},${e});`)).join("");
  const q = `[out:json][timeout:40];(${parts});out center tags 300;`;
  // the public servers are sometimes busy (502/504): try the mirrors, then the last good answer (stage never stalls)
  const cache = path.join(cfg.dataDir, `osm-cache-${area}.json`);
  const snapshot = path.join(__dirname, "..", "..", "demo", `osm-${area}.json`); // committed snapshot (© OpenStreetMap contributors, ODbL)
  let j = null;
  let lastErr = "";
  for (const url of MIRRORS) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA }, body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`${r.status}`);
      j = await r.json();
      fs.mkdirSync(cfg.dataDir, { recursive: true });
      fs.writeFileSync(cache, JSON.stringify(j));
      break;
    } catch (err) {
      lastErr = String(err.message || err);
    }
  }
  if (!j && fs.existsSync(cache)) j = JSON.parse(fs.readFileSync(cache, "utf8"));
  if (!j && fs.existsSync(snapshot)) j = JSON.parse(fs.readFileSync(snapshot, "utf8"));
  if (!j) throw new Error(`OpenStreetMap search failed (${lastErr})`);
  return (j.elements || [])
    .map((el) => {
      const t = el.tags || {};
      const segment = Object.keys(SEGMENTS).find((k) => SEGMENTS[k].filters.some((f) => {
        const m = f.match(/\["(\w+)"="(\w+)"\]/);
        return m && t[m[1]] === m[2];
      }));
      const website = (t.website || t["contact:website"] || "").trim();
      return {
        id: `osm-${el.type}-${el.id}`,
        name: (t.name || "").trim(),
        segment: segment ? SEGMENTS[segment].label : "",
        address: [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ") + (t["addr:city"] ? `, ${t["addr:city"]}` : ""),
        website: website && !/^https?:/i.test(website) ? `https://${website}` : website,
        email: (t.email || t["contact:email"] || "").trim(),
        phone: (t.phone || t["contact:phone"] || "").trim(),
        lat: el.lat || (el.center && el.center.lat),
        lon: el.lon || (el.center && el.center.lon),
        source: "OpenStreetMap",
      };
    })
    .filter((x) => x.name && segments.some((k) => SEGMENTS[k].label === x.segment));
}

async function visit(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 300000);
    const pick = (re) => ((html.match(re) || [])[1] || "").replace(/\s+/g, " ").replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ").trim();
    return {
      title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i).slice(0, 140),
      description: (pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i)).slice(0, 300),
      heading: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "").slice(0, 140),
      email: ((html.match(/mailto:([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/i) || [])[1] || "").toLowerCase(),
    };
  } catch {
    return null;
  }
}

const SCORE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fit", "why", "opener"],
  properties: {
    fit: { type: "number", description: "0-100: how likely this business sends us kitchen/furniture clients or needs us." },
    why: { type: "string", description: "One short sentence, from the facts given only." },
    opener: { type: "string", description: "One personal first line for an outreach email, in English, mentioning something real from their website. Empty if fit < 50." },
  },
};

async function score(cfg, lead, ctxText) {
  const facts = [`Name: ${lead.name}`, `Type: ${lead.segment}`, lead.address && `Address: ${lead.address}`, lead.web && lead.web.title && `Website title: ${lead.web.title}`, lead.web && lead.web.description && `Website says: ${lead.web.description}`, lead.web && lead.web.heading && `Main heading: ${lead.web.heading}`]
    .filter(Boolean)
    .join("\n");
  const system = `You qualify partner leads for the business described in the notes. A good lead regularly sends or brings clients who need custom kitchens, built-in furniture or interior renovation (architects, interior designers, real-estate agencies selling flats, builders of new homes).
Rules:
- Use ONLY the facts given – never invent.
- "why" must name something SPECIFIC about THIS business from its website text (what they design, sell or build, their style, their market). Never a generic sentence about the category.
- Spread the scores honestly: 85-95 = their own work clearly creates kitchen/furniture clients (residential architects, interior studios, new-build sellers); 60-80 = likely but not shown; 30-55 = unclear or mostly commercial/industrial; <30 = not a fit. No website text → at most 65.
- "opener": one natural sentence referring to something real on their website. Empty if fit < 60.
Answer only with the structured result.`;
  const prompt = `=== THE LEAD (another company – this is who you are scoring) ===\n${facts}\n${lead.web ? "" : "(Their website could not be read – judge from the name and type only.)\n"}\n=== WHO WE ARE (our own business – never describe the lead with these facts) ===\n${ctxText.slice(0, 5000)}\n\nScore THE LEAD for us. "why" and "opener" are about THE LEAD, written to them ("your …").`;
  const { answer } = await ask(cfg, { system, schema: SCORE_SCHEMA, prompt });
  return { fit: Math.max(0, Math.min(100, Math.round(Number(answer.fit) || 0))), why: String(answer.why || "").slice(0, 240), opener: String(answer.opener || "").slice(0, 300) };
}

// Runs the whole search. onStep({ step, status, detail, lead? }) → the screen animates each step.
async function findLeads(cfg, { text = "", limit = 6 } = {}, onStep = () => {}) {
  const segments = pickSegments(text);
  const area = pickArea(text);
  const label = `${segments.map((k) => SEGMENTS[k].label).join(" and ")} in ${AREAS[area].name}`;
  onStep({ step: "search", status: "start", detail: `Searching OpenStreetMap for ${label}` });
  const found = await overpass(cfg, segments, area);
  const crm = loadCrm(cfg);
  const known = new Set(crm.map((r) => r.id));
  // new ones first, with a website (something to read), then the rest
  const knownNames = new Set(crm.map((r) => r.name.toLowerCase()));
  const seenNames = new Set();
  const fresh = found
    .filter((f) => !known.has(f.id) && !knownNames.has(f.name.toLowerCase()))
    .filter((f) => (seenNames.has(f.name.toLowerCase()) ? false : seenNames.add(f.name.toLowerCase()))) // one row per business (branches merged)
    .sort((a, b) => (b.website ? 1 : 0) - (a.website ? 1 : 0));
  onStep({ step: "search", status: "done", detail: `Found ${found.length} ${label} – ${fresh.length} not in the CRM yet`, count: found.length });
  const ctx = contextFor(cfg, "who is a good fit lead qualification referral partners architects real estate agency lead sources");
  const added = [];
  for (const lead of fresh.slice(0, limit)) {
    onStep({ step: "visit", status: "start", detail: lead.website ? `Reading ${lead.website.replace(/^https?:\/\//, "")}` : `No website – using the map data for ${lead.name}`, lead: { name: lead.name } });
    lead.web = await visit(lead.website);
    if (!lead.email && lead.web && lead.web.email) lead.email = lead.web.email;
    onStep({ step: "score", status: "start", detail: `Checking if ${lead.name} fits`, lead: { name: lead.name } });
    try {
      Object.assign(lead, await score(cfg, lead, ctx.text));
    } catch (e) {
      Object.assign(lead, { fit: 0, why: `Could not score: ${String(e.message).slice(0, 80)}`, opener: "" });
    }
    const row = { status: lead.fit >= 60 ? "to contact" : "parked", found_at: new Date().toISOString().slice(0, 16).replace("T", " "), ...lead, web: undefined, website_title: lead.web ? lead.web.title : "" };
    crm.unshift(row);
    saveCrm(cfg, crm);
    added.push(row);
    let where = "CRM";
    try {
      if (await sheet({ action: "append", row: sheetRow(row) })) where = "Google Sheet";
    } catch (e) {
      onStep({ step: "sheet", status: "error", detail: `${e.message} – kept in Tia's own list` });
    }
    onStep({ step: "crm", status: "done", detail: `${lead.name} → ${where} (fit ${row.fit}%)`, lead: row });
  }
  return { label, found: found.length, added };
}

module.exports = { findLeads, loadCrm, saveCrm, setStatus, sheetOn, SEGMENTS, AREAS };

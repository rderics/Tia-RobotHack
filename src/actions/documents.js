// Printable documents: the offer page (also served at /doc/:id) and the contract built from the vault template
// `Templates/Template — Contract.md` (hand-edited by the team), filled with the project's real numbers.
const fs = require("fs");
const path = require("path");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const eur = (n) => `${Math.round(Number(n) || 0).toLocaleString("en-US").replace(/,/g, " ")} €`;

const STYLE = `@page{size:A4;margin:22mm 20mm}
*{box-sizing:border-box}body{margin:0;background:#EDEBE6;font:14px/1.55 "Segoe UI",system-ui,sans-serif;color:#1C1B1F}
.page{max-width:780px;margin:24px auto;background:#fff;padding:56px 60px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #1C1B1F;padding-bottom:18px;margin-bottom:34px}
.co{font-size:20px;font-weight:600;letter-spacing:-.01em}.co small{display:block;font-size:12px;font-weight:400;color:#6B6870;letter-spacing:0}
.meta{text-align:right;font-size:12px;color:#6B6870}
h1{font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px;line-height:1.25}
h2{font-size:15px;margin:26px 0 6px;text-transform:uppercase;letter-spacing:.04em}
.to{color:#6B6870;margin-bottom:28px}
.note{white-space:pre-wrap;margin:0 0 30px;max-width:60ch}
p{margin:0 0 10px}
table{width:100%;border-collapse:collapse;margin:8px 0 14px}td,th{padding:10px 0;border-bottom:1px solid #E4E1DA;text-align:left}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.total td{border-bottom:0;border-top:1px solid #1C1B1F;font-weight:600;font-size:17px;padding-top:14px}
.fine{margin-top:34px;font-size:12px;color:#6B6870}
.sign{display:flex;gap:40px;margin-top:40px}.sign div{flex:1;border-top:1px solid #1C1B1F;padding-top:6px;font-size:12px;color:#6B6870}
.stamp{display:inline-block;margin-top:30px;padding:6px 12px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;border:1px solid}
.stamp.ok{color:#1E6B4A;border-color:#1E6B4A}.stamp.draft{color:#9A5B12;border-color:#9A5B12}
@media print{body{background:#fff}.page{box-shadow:none;margin:0;padding:0;max-width:none}}`;

function shell(info, title, inner, stand) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body><div class="page">
  <header><div class="co">${esc(info.business)}${stand ? "<small>Custom kitchens · built-in furniture · Riga</small>" : ""}</div>
  <div class="meta">${esc(String(info.today || "").split(",")[0])}<br>Prepared by Tia for ${esc(info.owner)}</div></header>
  ${inner}</div></body></html>`;
}

function stampFor(info, state) {
  return state === "open" ? `<div class="stamp draft">Draft – waiting for approval</div>` : state === "rejected" ? `<div class="stamp draft">Rejected</div>` : `<div class="stamp ok">Approved by ${esc(info.owner)}</div>`;
}

function priceTable(lines, total) {
  const rows = (lines || []).map((l) => `<tr><td>${esc(l.item)}</td><td class="n">${eur(l.amount_eur)}</td></tr>`).join("");
  return rows ? `<table>${rows}<tr class="total"><td>Total</td><td class="n">${eur(total)}</td></tr></table>` : "";
}

// Offer (also the /doc/:id page). c = card from the desk: { title, from, text, lines, total, validUntil, state }
function offerHtml(info, c) {
  const stand = info.profile !== "owner";
  return shell(
    info,
    c.title,
    `<h1>${esc(c.title)}</h1><div class="to">For ${esc(c.from)}${c.validUntil ? ` · valid until ${esc(c.validUntil)}` : ""}</div>
  ${c.text ? `<p class="note">${esc(c.text)}</p>` : ""}
  ${priceTable(c.lines, c.total)}
  <div class="fine">${stand ? "Prices include installation. Appliances, plumbing and electrical works not included. Demo document – fictional business." : ""}</div>
  ${stampFor(info, c.state)}`,
    stand
  );
}

// A small Markdown → HTML for the templates: headings, bold, lists, tables, paragraphs.
function md(src) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => esc(b || a));
  const out = [];
  let list = null;
  let table = null;
  const flush = () => {
    if (list) out.push(`<ul>${list.join("")}</ul>`), (list = null);
    if (table) out.push(`<table>${table.join("")}</table>`), (table = null);
  };
  for (const raw of String(src).split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^\s*\|/.test(line)) {
      if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue; // separator row
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((x) => x.trim());
      table = table || [];
      table.push(`<tr>${cells.map((x, i) => `<td${i && /[\d€]/.test(x) ? ' class="n"' : ""}>${inline(x)}</td>`).join("")}</tr>`);
      continue;
    }
    if (table) flush();
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      flush();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    } else if (/^\s*[-*]\s+/.test(line)) {
      list = list || [];
      list.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
    } else if (!line.trim()) {
      flush();
    } else {
      if (list) flush();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flush();
  return out.join("\n");
}

function readNote(vaultDir, rel) {
  const f = path.join(vaultDir, rel);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
}

// Contract from the vault template. p = { to (client name), lines, total_eur, title, offer_date?, weeks? }
// Referral partnership agreement (Templates/Template — Partner agreement.md) – for a company that sends us clients
function partnerHtml(info, cfg, p, { contractNo, date }) {
  const tpl = readNote(cfg.vaultDir, "Templates/Template — Partner agreement.md") || "# REFERRAL PARTNERSHIP AGREEMENT No. {contract_no}\n\n{business} and {partner} agree to refer clients to each other.";
  const values = { contract_no: contractNo, date, partner: p.to || "(partner)", business: info.business, owner: info.owner };
  const filled = tpl.replace(/^---[\s\S]*?---\s*/, "").replace(/\{(\w+)\}/g, (all, k) => (k in values ? String(values[k]) : "________"));
  return shell(
    info,
    `Partnership agreement ${contractNo}`,
    `${md(filled)}
    <div class="sign"><div>${esc(info.business)} – ${esc(info.owner)}</div><div>Partner – ${esc(values.partner)}</div></div>`,
    info.profile !== "owner"
  );
}

function contractHtml(info, cfg, p, { contractNo, date }) {
  if (!(p.lines && p.lines.length)) return partnerHtml(info, cfg, p, { contractNo, date }); // a lead/partner: referral agreement, no prices
  const tpl = readNote(cfg.vaultDir, "Templates/Template — Contract.md") || "# CONTRACT No. {contract_no}\n\n{client} · {address}\n\nTotal {total} EUR";
  const client = readNote(cfg.vaultDir, `Clients/${p.to}.md`);
  const address = ((client.match(/\*\*Object:\*\*\s*(.+)/) || [])[1] || "").trim() || "(object address)";
  const total = Number(p.total_eur) || (p.lines || []).reduce((s, l) => s + (Number(l.amount_eur) || 0), 0);
  const deposit = Math.round(total / 2);
  const values = {
    contract_no: contractNo,
    date,
    client: p.to || "(client)",
    address,
    offer_date: p.offer_date || date,
    total: eur(total).replace(" €", ""),
    deposit: eur(deposit).replace(" €", ""),
    final: eur(total - deposit).replace(" €", ""),
    weeks: p.weeks || 6,
  };
  const filled = tpl.replace(/^---[\s\S]*?---\s*/, "").replace(/\{(\w+)\}/g, (all, k) => (k in values ? String(values[k]) : "________"));
  // the signature boxes are drawn below, so the template's own "Contractor: ____" line is left out
  const body = md(filled.replace(/\*\*Annex 1:\*\*.*$/m, "").replace(/^Contractor:\s*_{3,}.*$/m, ""));
  return shell(
    info,
    `Contract ${contractNo}`,
    `${body}
    <h2>Annex 1 – accepted offer</h2>${priceTable(p.lines, total)}
    <div class="sign"><div>Contractor – ${esc(info.owner)}</div><div>Client – ${esc(values.client)}</div></div>
    <div class="fine">${info.profile !== "owner" ? "Demo document – fictional business." : ""}</div>`,
    info.profile !== "owner"
  );
}

module.exports = { offerHtml, contractHtml, md, eur, esc };

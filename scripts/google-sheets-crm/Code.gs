/**
 * Tia → Google Sheets CRM bridge (Google Apps Script).
 *
 * Setup (2 minutes, once):
 *  1. Open your CRM Google Sheet (first tab named "Leads" with the header row) → Extensions → Apps Script.
 *  2. Paste this whole file, replace TOKEN with a long random word (the same as GOOGLE_SHEET_TOKEN in Tia's .env).
 *  3. Deploy → New deployment → type "Web app" → Execute as: Me · Who has access: Anyone → Deploy → Authorize.
 *  4. Copy the Web app URL into Tia's .env as GOOGLE_SHEET_WEBHOOK=… and the sheet's link as GOOGLE_SHEET_URL=…
 *
 * Tia only appends rows and updates the Status column. It never deletes, never reads other files.
 */
const TOKEN = "PUT-A-LONG-RANDOM-WORD-HERE";
const SHEET = "Leads";
const STATUS_COL = 9; // I
const NAME_COL = 2; // B

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return out({ error: "bad json" });
  }
  if (body.token !== TOKEN) return out({ error: "bad token" });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET);
  if (!sh) return out({ error: "no sheet named " + SHEET });

  if (body.action === "append" && Array.isArray(body.row)) {
    sh.appendRow(body.row.map(function (v) { return v === null || v === undefined ? "" : v; }));
    return out({ ok: true, row: sh.getLastRow() });
  }
  if (body.action === "status" && body.name) {
    const names = sh.getRange(2, NAME_COL, Math.max(1, sh.getLastRow() - 1), 1).getValues();
    for (let i = names.length - 1; i >= 0; i--) {
      if (String(names[i][0]).toLowerCase() === String(body.name).toLowerCase()) {
        sh.getRange(i + 2, STATUS_COL).setValue(body.status || "");
        return out({ ok: true, row: i + 2 });
      }
    }
    return out({ error: "not found" });
  }
  if (body.action === "ping") return out({ ok: true, rows: sh.getLastRow() - 1 });
  return out({ error: "unknown action" });
}

function doGet() {
  return out({ ok: true, service: "Tia CRM bridge" });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

# Decisions (newest first)

Add a line at the top when the team decides something: `date · who · decision · replaces`.

- **25.11 · Rinalds** · Vault names: the demo business vault is **`demo/Business vault TIA`** (was `demo/vault`), the shared
  project memory is **`TIA Context vault/`** (was `project/`). Open each folder as its own vault in Obsidian.
- **25.11 · Rinalds** · **AI lead finder → Google Sheets CRM**: Tia finds real businesses that fit the target audience
  (OpenStreetMap + their websites), the AI scores the fit and writes a personal first line, rows appear live in the
  owner's Google Sheet (Apps Script bridge, `scripts/google-sheets-crm`). Emails to leads are **drafts only – never sent**.
  Google Sheets chosen over our own CRM because owners already use it; Tia's `/crm` page stays as the offline fallback.
- **25.11 · Rinalds** · Approve now does the real thing on the PC: Outlook opens and the reply is typed in (draft, never
  sent; From = business address on the stand); offers/contracts → PDF → opened → printed on the default printer
  (Edge silent printing) → Outlook draft with the PDF attached; WhatsApp opens with the text typed.

- **25.11 · Rinalds** · Demo business renamed **Liepa Interjers → Oakline Studio** (fictional; a real company's name was
  rejected – the demo contains a complaint and a scam email, which must not be tied to a real firm). · replaces the old name
- **25.11 · Rinalds** · **Real actions must be visible**: Outlook opens with the draft typed in, the contract becomes a PDF
  that opens and goes to the printer. Backend first, frontend animations after. Cards on screen are too text-heavy → redesign.
- **25.11 · Rinalds** · Shared project memory lives in the repo (`TIA Context vault/`, `AGENTS.md`) so every teammate's agent has the same facts.
- **25.11 · team (Discord)** · Ownership split – see [[Team and ownership]]. Cut: Bolt/Wolt food and Bolt taxi ordering
  (0 code; one approval card stays), floating Tia over the desktop, frontend rewrite from zero (polish only). · replaces
  the 24.11 idea list ("Bolt order real, taxi simulated")
- **25.11 · AKU + Rinalds** · **Hermes Agent is the engine/harness** (NousResearch, MIT): memory, skills, cron, Telegram;
  Tia stays the face + guard + desk. Hermes API is local only (127.0.0.1:8642), never through the tunnel.
- **25.11 · Rinalds** · **No Claude needed:** free Groq key in `.env` (setup asks for it). Full demo day on Groq = same 12
  decisions as the saved Claude run, 0 € model cost. · replaces "Claude subscription only"
- **25.11 · Rinalds** · Demo vault grown to ~800 linked notes (generator in `scripts/make_demo_vault`).
- **25.11 · Rinalds** · Character = VRM "Yuzuki – black suit" (VRoid Hub, commercial use OK) with a lavender blouse; voice =
  Microsoft neural (edge-tts, "Ava"). Realistic avatars rejected ("creepy").
- **24.11 · Rinalds** · Stand is **English only**. Contract/offer = document with "Print / Save as PDF" (works with or without a printer).
- **24.11 · Rinalds** · Phone side = **Expo Go app** (`mobile/`), not a Telegram bot (Telegram now comes via Hermes as a bonus).
- **24.11 · Rinalds** · Real Tia runs on rderics.id.lv/tia (tunnel to the owner's PC, login with the Tia code); public replay on /tia/demo.
- **24.11 · Rinalds** · Owner inbox = classic Outlook (read + **draft only**, never send).
- **19.11 · Rinalds** · Tia is a **real assistant product**, semi-autonomous at the start, learns the owner's taste (2 approvals
  of a kind → she does that kind herself). No hardware (robot, buttons) – risk of looking janky.

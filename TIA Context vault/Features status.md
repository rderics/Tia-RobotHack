# Features status (update when something changes)

✅ works · 🟡 partly · ❌ missing · *(date · who checked)*

| Feature | Status | Notes |
|---|---|---|
| Inbox triage (12 demo messages) | ✅ | Claude or free Groq; Guard enforces money/lead/complaint rules *(25.11 · Claude agent)* |
| Saved run (replay) for the stage | ✅ | `demo/replay.json`, pre-recorded voice in the public demo |
| Demo vault (Oakline Studio, ~800 notes) | ✅ | search per note section; 0 broken links |
| Free AI (no Claude) | ✅ | Groq key via `setup.ps1`; same 12 decisions as Claude |
| Outlook drafts | ✅ | approve → Outlook window opens, text typed in, never sent *(25.11 · tested on Rinalds' PC)* |
| Contract / offer PDF + print | ✅ | "Prepare the contract for Ieva" → asks open choices → PDF (vault template) → printer → Outlook draft with PDF *(25.11)* |
| WhatsApp draft | ✅ | wa.me with the text typed; owner picks the chat and presses send |
| AI lead finder → Google Sheet | 🟡 | works with Tia's /crm page; Google Sheet needs the one-time Apps Script deploy (owner) |
| Explain view for judges | ❌ | reason + notes read + guard rule per card |
| Familiar app views (Mail, WhatsApp, Instagram, Slack, Leads) | ✅ | left app rail; "Follow Tia" opens the right app at her reading pace and types her draft; owner can edit/write and approve in any view; Tia PiP in the corner *(25.11)* |
| Frontend cards on the Tia tab | 🟡 | still text-heavy → polish |
| Composio (Gmail, Calendar, Slack) | ❌ | researched; needs the owner's Composio account + API key |
| 3D avatar + voice + lip-sync | ✅ | VRM Yuzuki, Microsoft "Ava" |
| Phone app (Expo Go) | ✅ | hold-to-talk, chat, approve; QR connect from "Connect phone" |
| Hermes engine | 🟡 | AKU; Tia already speaks to its API (`providers: hermes`) |
| Telegram + morning brief | ❌ | via Hermes (AKU) |

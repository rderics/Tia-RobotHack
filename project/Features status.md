# Features status (update when something changes)

✅ works · 🟡 partly · ❌ missing · *(date · who checked)*

| Feature | Status | Notes |
|---|---|---|
| Inbox triage (12 demo messages) | ✅ | Claude or free Groq; Guard enforces money/lead/complaint rules *(25.11 · Claude agent)* |
| Saved run (replay) for the stage | ✅ | `demo/replay.json`, pre-recorded voice in the public demo |
| Demo vault (Oakline Studio, ~800 notes) | ✅ | search per note section; 0 broken links |
| Free AI (no Claude) | ✅ | Groq key via `setup.ps1`; same 12 decisions as Claude |
| Outlook drafts | 🟡 | owner mode saves drafts hidden; **visible Outlook window – in progress** |
| Contract / offer PDF + print | 🟡 | `/doc/:id` printable page exists; **real PDF file + printer – in progress** |
| WhatsApp draft | ❌ | plan: open WhatsApp with the text typed (`whatsapp://send?text=`) |
| Explain view for judges | ❌ | reason + notes read + guard rule per card |
| Frontend cards | 🟡 | too text-heavy (Rinalds 25.11) → redesign after the backend |
| 3D avatar + voice + lip-sync | ✅ | VRM Yuzuki, Microsoft "Ava" |
| Phone app (Expo Go) | ✅ | hold-to-talk, chat, approve; QR connect from "Connect phone" |
| Hermes engine | 🟡 | AKU; Tia already speaks to its API (`providers: hermes`) |
| Telegram + morning brief | ❌ | via Hermes (AKU) |

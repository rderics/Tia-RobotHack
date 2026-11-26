---
type: guide
updated: 2026-11-26
---
# Pitch PC guide — run Tia without Rinalds' PC

Rinalds' PC is **not** at the hackathon. The pitch runs on a teammate's Windows laptop. Everything below is set up so
that one install is enough.

## 1 · Install (once, ~10 min)
1. Get the **team code** from Rinalds (Discord DM). The installer asks for it; Tia fetches the shared keys (free AI, WhatsApp) by herself.
2. Open **rderics.id.lv/tia-get** → *Download the installer* → double-click *Install-Tia.cmd* (Windows warning: *More info → Run anyway*).
   Or PowerShell: `irm https://raw.githubusercontent.com/rderics/Tia-RobotHack/main/scripts/install.ps1 | iex`
3. Desktop now has **Tia**, **Tia – Business vault** (Obsidian) and **Update Tia**.
4. For Outlook drafts: open **classic Outlook** once and sign in with any account (a demo outlook.com account is best).

## 2 · On the day
- Double-click **Tia** → the app window opens (Oakline Studio demo, no login on the PC itself).
- **Phone:** *Connect phone* → scan the QR → Android: install + *Open Tia – connected*; iPhone: *Open in the Tia app* (Expo Go).
  Tia opens a public address by herself (quick tunnel), so it works on hackathon Wi-Fi.
- **WhatsApp:** the PC that started Tia **last** receives the business number's messages. Start Tia on the pitch PC after everyone else.
- Press **Update Tia** the evening before (gets the latest code; keeps keys and data).

## 3 · What works — and what doesn't (26.11)
| Feature | On a teammate's PC | Why / what it needs |
|---|---|---|
| Stand demo: inbox, talking, approvals, cards, Needs you | ✅ | free Groq key from the team code; without it the recorded run plays |
| Tia talks (voice) + hold-to-talk | ✅ | voice needs internet (Microsoft voices); speech-to-text runs on the PC |
| 3D avatar | ✅ | teammate's new avatar replaces `src/renderer/assets/avatars/tia.vrm` (must be **VRM**; a GLB/FBX needs converting – VRoid or Blender VRM add-on) |
| Contract → PDF → printer | ✅ | Edge (built into Windows); printing needs a default printer, else the PDF just opens |
| **Outlook drafts typed in front of you** | ✅ | **classic Outlook** with any account signed in (not via Composio – Tia drives Outlook directly through Windows COM; that's the way we found around MCP) |
| Business vault tab + graph + "Tia is reading" | ✅ | ships in the repo (`demo/Business vault TIA`); Obsidian also gets it |
| Leads tab (lead finder → CRM) | ✅ | OpenStreetMap (snapshot in repo if offline); Google Sheet only after Rinalds deploys the Apps Script |
| Ads tab (Meta Ads Manager look) + Tia's ad review | ✅ demo data | real ad accounts are Rinalds' Composio – stay on his PC |
| LinkedIn tab (Tia writes a post) | ✅ demo profile | real profile = Rinalds' Composio |
| Mail / Slack / Instagram "My account · live" | ❌ on teammates' PCs | Composio logins are personal (Rinalds' Gmail etc.); the demo side of each tab works everywhere |
| **WhatsApp – real messages in, reply out** | ✅ once Meta setup is finished | Meta → rderics.id.lv/wa (always on) → the pitch PC. Test number can only message **up to 5 verified numbers**; a free reply only within **24 h** after the person wrote |
| "Tia, send Ralfs a WhatsApp that …" | ✅ after approval | Ralfs must be on the test number's recipient list and have written to the business number once (24 h rule) |
| Phone app | ✅ Android app (APK) · iPhone in Expo Go | Apple doesn't allow installing apps outside the App Store without a paid developer account |
| Hermes | ⏳ AKU | |

## 4 · WhatsApp demo script (works on stage)
1. Before the pitch, Ralfs (or a teammate) writes to the business number **+1 555 175 1540** – opens the 24 h window.
2. On stage: a teammate writes "Hi, do you make oak kitchens? Can someone measure in Riga this week?" → the screen jumps to WhatsApp (Follow Tia), Tia's answer from the vault is typed in → tap ✈ → the phone gets it.
3. Say to Tia: "Send Ralfs a WhatsApp that the measuring is confirmed for Friday" → approval card → Approve → Ralfs' phone buzzes.
- Messages go out **as the business**, approved by the owner – like a human assistant writing in the boss's name. Tia doesn't pretend to be human if asked, and anything she would send *on her own* would be signed as the assistant.

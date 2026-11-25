# Team and ownership

Agreed in Discord 25.11. One owner per area so the front and back end are not rewritten by several people at once.
Tasks are tracked on the team kanban board (link in Discord).

| Area | Owner | Files (only the owner edits; others ask first) |
|---|---|---|
| **Hermes** – setup, vault integration, Telegram gateway, 3 core `SKILL.md` workflows (morning brief, templates & contract PDF, inbox triage + fraud), thin bridge to Tia | **AKU** | `hermes/` (skills, config examples), bridge code agreed with Rinalds |
| **Core app** – server and brain, Outlook drafts, real actions (Outlook window, contract PDF, print, WhatsApp), phone app, final `replay.json`, deploy | **Rinalds** (+ his Claude agent) | `src/web.js`, `src/hub.js`, `src/brain/*`, `src/connectors/*`, `src/actions/*`, `mobile/*`, `scripts/*` |
| **Demo vault** – fictional business data | **Rinalds' Claude agent** | `scripts/make_demo_vault/*`, `demo/Business vault TIA/*` (generated) |
| **Frontend polish** – layout, cards, animations, projector look | **Frontend teammate(s)** | `src/renderer/index.html`, `src/renderer/styles.css`, `src/renderer/app.js` (UI parts) |
| **Document templates** – contract, offer, follow-up | **Frontend / data teammate** | `demo/Business vault TIA/Templates/*` (hand-edited; the generator never overwrites them) |
| **Avatar + voice** | Rinalds' Claude agent | `src/scene/*`, `src/voice.js`, `src/tts/*` |
| **Pitch deck + stand script** | whole team | `TIA Context vault/Stand script.md` |

Team (Discord handles): **Monke** = Rinalds (lead), **AKU**, **NotDestinyz**, **sars**, + the fifth member. Use handles in
commits and notes – no private data about anyone. Fill in the frontend owner's handle here when it is agreed.

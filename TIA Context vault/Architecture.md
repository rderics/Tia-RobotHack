# Architecture

```
            SHARED BRAIN: Obsidian vault  (demo: demo/Business vault TIA = Oakline Studio; real owner: their own vault, private)
            Business · Owner preferences · Price list · Calendar · Clients/ · Projects/ · Templates/ · Learned rules
                 │                                                    │
                 ▼                                                    ▼
   HERMES AGENT (engine, AKU)                       TIA STAGE & DESK (this repo)
   Telegram / WhatsApp gateway  ◀── API 8642 ──▶    3D VRM avatar + Microsoft neural voice
   cron morning brief [SILENT]                      Guard in plain code (money/complaints/leads → owner)
   SKILL.md: brief · contract PDF · triage+fraud    Needs-you desk, approve/edit/reject, learning
                                                    Real actions: Outlook draft window, contract PDF + print,
                                                    WhatsApp draft · saved replay for bad Wi-Fi
```

## Pieces in this repo
| Piece | Where | Notes |
|---|---|---|
| Server | `src/web.js` (port 4747, `TIA_PORT`) | local requests trusted; through the internet only with the Tia code |
| Shared desk | `src/hub.js` | SSE for the screen, long-poll for the phone; one desk for both |
| Brain | `src/brain/*` | `engine.js` day run · `command.js` voice/text commands · `guard.js` hard rules · `providers.js` AI chain · `vault.js` + `retrieval.js` BM25 over note sections |
| AI chain | `src/brain/providers.js` | tries in order: Claude Code (if logged in) → Codex (if set) → **free Groq** key → Gemini/OpenRouter → Hermes (`talkProviders`). Failing one skipped 10 min. See [[Research/Free AI providers]] |
| Outlook | `src/connectors/outlook.py` | classic Outlook via COM; reads; **saves drafts, never sends** |
| Real actions | `src/actions/*` | opens the Outlook draft window, builds contract/offer PDFs, prints, opens WhatsApp with the text typed |
| Voice | `src/voice.js` + `src/tts/edge_voice.py` → `/api/tts` | Microsoft neural voice (edge-tts) with word timings for lip-sync |
| Speech-to-text | `src/stt.js` + `src/stt/stt_worker.py` | faster-whisper base.en on the PC; audio deleted after use |
| Avatar | `src/scene/vrm-avatar.js` → `npm run build:avatar` → `src/renderer/avatar.js` | three-vrm; model `src/renderer/assets/avatars/tia.vrm` (licence in SOURCE.txt) |
| Screen | `src/renderer/*` | same page in the browser and in Electron (`npm start`) |
| Phone app | `mobile/` (Expo SDK 58) | hold-to-talk, chat, approve; loads in Expo Go (see README) |
| Public demo | `scripts/build-static.js` → rderics.id.lv/tia/demo | replay only, no AI calls; voice lines pre-recorded |
| Demo data | `demo/inbox.json` (12 messages), `demo/replay.json` (saved real run), `demo/Business vault TIA` | fictional |

## Data rules
- The real owner's vault and mailbox are read only on the owner's PC (`config.json`, gitignored). Never in the repo.
- Model calls send the message + matching note sections to the AI provider. Free tiers may use data for training – fine
  for the fictional demo, not for real client data.

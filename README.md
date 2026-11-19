# Tia – AI personal secretary (RobotHack 2026 prototype)

Tia reads a business owner's notes (an Obsidian vault) and their messages, does the routine work herself, and sends anything that needs the owner (money, complaints, partnerships, anything unsure) to a **Needs you** column with a reply already drafted. Every approval teaches her. After 2 approvals of one kind, she does that kind herself.

This version is a **desktop app** (Electron). The demo business **Liepa Interjers** and all its people are fictional.

## Run it

You need Node.js and Claude Code installed and logged in (`claude` in a terminal works).

```
npm install
npm start            # opens the app; press "Start the day"
npm run replay       # opens the app; "Replay" plays the last saved run (no internet needed)
npm run day          # same day in the terminal, no window
```

## What happens when you press "Start the day"

1. The 12 messages in `demo/inbox.json` (email, WhatsApp, Instagram, Slack – all fake) are read, 3 at a time.
2. For each one, Tia gets the whole demo vault + the message and answers in a fixed format: category, handle or escalate, confidence, draft reply, actions, money involved, which notes she used.
3. **The Guard** (`src/brain/guard.js`, plain code) has the final word. Money, complaints, partnerships, orders and payment-detail changes always go to the owner. New-lead replies go to the owner until they've approved 2.
4. Handled items are written to `demo/vault/Tia/Activity log.md`. Approve / Edit / Reject writes a lesson to `demo/vault/Tia/Learned rules.md`.
5. A successful live run is saved to `demo/replay.json` for the **Replay** button.

**Reset demo** clears what Tia learned and her log, so the demo can start over.

## Voice

Tia reads her updates out loud with the computer's built-in voices (Windows: Microsoft Zira if installed), offline, no extra service. Each card appears while she says it. **Voice: on/off** in the top bar switches it; the choice is remembered. With voice off, cards appear as fast as they arrive.

## Subscription or API key

`config.json` (optional, in the project root) overrides the defaults in `src/brain/config.js`:

```json
{ "provider": "claude-code", "model": "claude-sonnet-5-5" }
```

- `claude-code` (default): runs `claude -p` in the background, logged in as the person at this computer. **Testing and the demo only.** Anthropic does not allow products to use claude.ai logins.
- `api`: Claude API with `ANTHROPIC_API_KEY` set. Use this for anything shipped.

Each teammate tests with their **own** Claude login. Never share accounts.

## Map of the code

| File | What it does | Area |
|---|---|---|
| `src/brain/prompt.js` | What Tia is told + the answer format | Brain + security |
| `src/brain/guard.js` | Rules the model can't override | Brain + security |
| `src/brain/providers.js` | Claude subscription / API switch | Connectors |
| `src/brain/engine.js` | Runs the day, learning, replay | Connectors |
| `src/brain/vault.js` | Reads the vault, writes log + lessons | Connectors |
| `src/renderer/*` | The screen + voice | App UI |
| `.avatar` in `index.html` / `styles.css` | Placeholder for the 3D secretary | Design |
| `demo/vault`, `demo/inbox.json` | The fictional business and its day | Product |

## Next steps

- Real email: read an Outlook/Gmail inbox instead of `demo/inbox.json`.
- 3D secretary in the avatar panel (three.js), driven by the same narration text.
- Bolt Food: after the owner approves the lunch order, place it (owner confirms payment).
- Vault search instead of sending the whole vault (needed for real, bigger vaults).
- Voice input: let the owner answer Tia by speaking.

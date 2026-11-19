# Tia – AI personal secretary (RobotHack 2026 prototype)

Tia reads a business owner's notes (an Obsidian vault) and their messages, does the routine work herself, and sends anything that needs the owner (money, complaints, partnerships, anything unsure) to a **Needs you** column with a reply already drafted. Every approval teaches her. After 2 approvals of one kind, she does that kind herself.

This version is a **desktop app** (Electron). The demo business **Liepa Interjers** and all its people are fictional.

## Run it

You need Node.js and Claude Code installed and logged in (`claude` in a terminal works).

```
npm install
npm run web          # website: open http://localhost:4747 and press "Start the day"
npm start            # the same screen as a desktop app
npm run replay       # desktop app; "Replay" plays the last saved run (no internet needed)
npm run day          # same day in the terminal, no window
```

**Website and desktop app share one screen** (`src/renderer`). The desktop app connects it to the brain through `src/preload.js`; the website does it through `src/renderer/web-bridge.js` and the small server in `src/web.js`. Change the screen once and both get it.

The web server listens on **this computer only** (127.0.0.1) and only accepts requests from its own page, because it runs Claude with the login of the person at this computer. Don't expose it to the internet. A public website needs the API-key provider (or a replay-only version).

## What happens when you press "Start the day"

1. The 12 messages in `demo/inbox.json` (email, WhatsApp, Instagram, Slack – all fake) are read, 3 at a time.
2. For each one, Tia gets the whole demo vault + the message and answers in a fixed format: category, handle or escalate, confidence, draft reply, actions, money involved, which notes she used.
3. **The Guard** (`src/brain/guard.js`, plain code) has the final word. Money, complaints, partnerships, orders and payment-detail changes always go to the owner. New-lead replies go to the owner until they've approved 2.
4. Handled items are written to `demo/vault/Tia/Activity log.md`. Approve / Edit / Reject writes a lesson to `demo/vault/Tia/Learned rules.md`.
5. A successful live run is saved to `demo/replay.json` for the **Replay** button.

**Reset demo** clears what Tia learned and her log, so the demo can start over.

## Public demo: https://rderics.id.lv/tia

A **replay-only** copy anyone can open (phone too). It plays a real recorded Claude run through the same Guard; approvals and learning work but stay in the visitor's browser. No AI calls, no server.

Update it after a new live run:

```
node scripts/build-static.js ../Website-Saldus/website/tia
cd ../Website-Saldus && git add website/tia && git commit -m "Update /tia" && git push
```

The build refuses to run if a message is missing from the recording or if the demo data has a real-looking email address (only `.example` / `example.com` allowed). Cloudflare Pages deploys the push in about 30 seconds.

## The 3D stage

`src/scene/scene.js` (three.js) draws Tia and animates every message: the card flies in from **INBOX**, she reads it (scan line), then the reply flies to **SENT**, a newsletter sinks into the floor (archived), or the card turns amber and flies to the owner's **phone**. After changing it, rebuild the bundle the screen loads:

```
npm run build:scene      # writes src/renderer/scene.js
```

Tia is built from simple shapes (no downloaded 3D model). To swap in a real character later, load a `.glb` model in `scene.js` in place of the body/head group.

## Phone notifications (no spam)

- **Urgent** (fraud, payment-detail changes, complaints) → buzzes right away.
- **Everything else that needs the owner** → collected into **one** summary notification.
- **Work Tia finished herself** → never buzzes.

The phone on screen is a mock-up. A real push (e.g. a phone app or Telegram bot) would use the same three rules.

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

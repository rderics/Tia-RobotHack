# Tia – AI personal secretary (RobotHack 2026 prototype)

Tia reads a business owner's notes (an Obsidian vault) and their messages, does the routine work herself, and sends anything that needs the owner (money, complaints, partnerships, anything unsure) to a **Needs you** column with a reply already drafted. Every approval teaches her. After 2 approvals of one kind, she does that kind herself.

The owner can also **talk to Tia** – on the big screen or from the **Tia phone app** – and she prepares the work (an offer, an order, a reply) for approval. The phone and the big screen share one desk: approve on the phone and the card closes on the big screen.

The demo business **Liepa Interjers** and all its people are fictional.

## Run it

You need Node.js, Python with `faster-whisper` (speech-to-text, runs on this computer), ffmpeg, and Claude Code logged in (`claude` in a terminal works).

```
npm install
npm run web          # open http://localhost:4747 and press "Start the day"
npm start            # the same screen as a desktop app (Electron)
npm run replay       # desktop app, plays the saved real run (no internet needed)
npm run day          # same day in the terminal, no window
```

The first time, Windows asks whether Node.js may use the network – allow **private networks**, otherwise the phone can't connect.

## The phone app (Expo Go)

The app lives in `mobile/` (Expo SDK 58, plain JavaScript).

1. Install **Expo Go** on the phone (App Store / Google Play).
2. On the computer: `cd mobile`, `npm install` (first time), then `npx expo start`.
3. Scan the QR code in that terminal – Android: with Expo Go; iPhone: with the Camera app. The Tia app opens.
4. On Tia's big screen press **Connect phone** and scan that QR code inside the Tia app (**Scan the code**).

The phone and the computer must be on the **same Wi-Fi**. Venue Wi-Fi often blocks devices from seeing each other – then turn on the phone's **hotspot** and connect the computer to it. If both have Tailscale, the Tailscale address (100.x) shown under the QR code also works.

What the phone does:
- **Hold to talk** – recording only while the button is held; the audio is turned into text on the computer (faster-whisper, `base.en`, ~2 s) and **deleted right after**.
- Tia **answers out loud** and shows what she prepared: offers with priced lines, orders, replies.
- **Approve / Edit / Reject** every card from the desk. Buzzes for urgent items only.
- **Start the day**, **Reset the demo**, **Disconnect** from the ••• menu.

An installable app without Expo Go (APK) needs an Expo account and `eas build` – not set up yet.

### How the phone connects (security)

`src/web.js` listens on the network, but:
- Everything except `/api/m/*` answers **only this computer** (localhost).
- `/api/m/*` needs the **pairing token** from the QR code (stored in `data/pair.json`; delete the file to make a new one, which unpairs every phone).
- It runs Claude with the login of the person at this computer – never put it on the public internet.

## Owner mode and the web address (Tia for a real owner)

`config.json` in the project root (never committed – it is in `.gitignore`) turns Tia into a real owner's secretary:

```json
{ "profile": "owner", "owner": "Your Name", "business": "Your Business",
  "vaultDir": "../Obsidian Vault", "notesDir": "data/owner-notes", "alwaysNotes": ["System/USER.md"],
  "inboxSource": "outlook", "publicUrl": "https://tia.example.com" }
```

- **Vault:** read-only. Tia searches it per request (BM25, `src/brain/retrieval.js`) and sends only the matching notes. Her own log and learned rules go to `notesDir`, not into the vault.
- **Inbox:** `outlook` = classic Outlook through COM, started hidden in the background (`src/connectors/outlook.py`); the owner can keep using new Outlook. **Approve saves a reply draft in Outlook – Tia never sends.**
- **No Claude?** A real owner gets an honest answer; the hand-written script is only for the stand. `TIA_CONFIG=none` runs the fictional stand business even when `config.json` exists.

**Web address** (Cloudflare Tunnel, runs on this computer):

1. `& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel login` – pick the domain, click Authorize (once).
2. `powershell -ExecutionPolicy Bypass -File scripts	unnel-setup.ps1 -Hostname tia.example.com` (once).
3. `powershell -ExecutionPolicy Bypass -File scripts\start-tia.ps1` – starts the server and the tunnel.

Everything private behind the web address needs the **Tia code** (the pairing token): the web screen asks for it once, the phone app shows it in its ••• menu, **Connect phone → Copy private link** gives a link with it. A new code: delete `data/pair.json` and restart (every phone and browser must log in again).

## The stand script (3 minutes)

1. **Start the day** → Tia goes through 12 messages; 5 handled, 7 need you, the fraud email is caught.
2. Hold the mic: *"Ieva wants her kitchen offer by Friday."* → Tia has the measurements but **not the worktop** – she asks "Oak or quartz?" instead of guessing (the mistake/limit moment the challenge asks for).
3. *"Quartz."* → a priced offer (9 400 €, from `demo/vault/Price list.md`) lands on the phone.
4. **Approve** on the phone → the big screen opens the offer document → **Print / Save as PDF**.
5. **Reset** for the next visitor.

Other things she understands: *"What needs me today?"*, *"Order the team lunch"* (Bolt Food note, waits for approval).

## Live Claude or the offline script

- **Inbox:** "Start the day" runs live Claude. If Claude can't be reached (usage limit, no internet), it automatically plays the **saved real run** (`demo/replay.json`).
- **Talking:** live Claude (`src/brain/command.js`). If Claude can't be reached, Tia answers from a **hand-written demo script** (`src/brain/scripted.js`) that covers the stand script above. The screen and phone then show **"Offline demo script"** – it is not AI output, say so if asked.
- Force it in `config.json`: `{ "commandMode": "scripted", "inboxMode": "replay" }`.

## What happens when you press "Start the day"

1. The 12 messages in `demo/inbox.json` (email, WhatsApp, Instagram, Slack – all fake) are read, 3 at a time.
2. For each one, Tia gets the whole demo vault + the message and answers in a fixed format: category, handle or escalate, confidence, draft reply, actions, money involved, which notes she used.
3. **The Guard** (`src/brain/guard.js`, plain code) has the final word. Money, complaints, partnerships, orders and payment-detail changes always go to the owner. New-lead replies go to the owner until they've approved 2.
4. Handled items are written to `demo/vault/Tia/Activity log.md`. Approve / Edit / Reject writes a lesson to `demo/vault/Tia/Learned rules.md`.
5. A successful live run is saved to `demo/replay.json`.

## Public demo: https://rderics.id.lv/tia

A **replay-only** copy anyone can open. It plays a real recorded Claude run through the same Guard; approvals and learning work but stay in the visitor's browser. No AI calls, no server, no talking or phone.

```
node scripts/build-static.js ../Website-Saldus/website/tia
cd ../Website-Saldus && git add website/tia && git commit -m "Update /tia" && git push
```

(In Git Bash, prefix with `MSYS_NO_PATHCONV=1` if you pass a base path like `/tia/`.) The build refuses to run if a message is missing from the recording or the demo data has a real-looking email address.

## The 3D stage

`src/scene/scene.js` (three.js) draws Tia and animates every message: the card flies in from **INBOX** (live count of messages left), she reads it, then the reply flies to **SENT** (live count), a newsletter sinks into the floor, or the card flies to the owner's phone. After changing it: `npm run build:scene`.

## Subscription or API key

`config.json` (optional, in the project root) overrides `src/brain/config.js`:

```json
{ "provider": "claude-code", "model": "claude-sonnet-5-5" }
```

- `claude-code` (default): runs `claude -p` in the background, logged in as the person at this computer. **Testing and the demo only.**
- `api`: Claude API with `ANTHROPIC_API_KEY` set. Use this for anything shipped.

## Map of the code

| File | What it does |
|---|---|
| `src/brain/prompt.js`, `guard.js` | Inbox: what Tia is told, rules the model can't override |
| `src/brain/command.js` | Voice/typed requests → one proposal for approval |
| `src/brain/scripted.js` | Offline demo script (hand-written, used when Claude is unreachable) |
| `src/brain/engine.js`, `vault.js`, `providers.js` | Runs the day, learning, replay, Claude switch |
| `src/hub.js` | The shared desk – big screen and phone see the same items and decisions |
| `src/web.js` | Server: screen, phone API with pairing, offer documents |
| `src/stt.js`, `src/stt/stt_worker.py` | Speech-to-text on this computer |
| `src/renderer/*` | The big screen |
| `mobile/` | The phone app (Expo) |
| `demo/vault`, `demo/inbox.json` | The fictional business and its day |

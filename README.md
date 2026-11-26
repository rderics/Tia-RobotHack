# Tia – AI personal secretary (RobotHack 2026 prototype)

Tia reads a business owner's notes (an Obsidian vault) and their messages, does the routine work herself, and sends anything that needs the owner (money, complaints, partnerships, anything unsure) to a **Needs you** column with a reply already drafted. Every approval teaches her. After 2 approvals of one kind, she does that kind herself.

The owner can also **talk to Tia** – on the big screen or from the **Tia phone app** – and she prepares the work (an offer, an order, a reply) for approval. The phone and the big screen share one desk: approve on the phone and the card closes on the big screen.

The demo business **Oakline Studio** and all its people are fictional.

> **Teammates: start with [TEAM SETUP.md](TEAM%20SETUP.md)** – install in one click, connect your apps in Settings, phone by QR.

## For teammates – get Tia on your PC

Windows 10/11. Tia runs the fictional demo business, so you need none of Rinalds' files or accounts.

1. **Install Git** (once): https://git-scm.com/download/win – or in PowerShell: `winget install Git.Git`
2. **Get Tia:** open PowerShell in the folder where you want her and run
   `git clone https://github.com/rderics/Tia-RobotHack Tia`
3. **Set up (once, ~5 min):** in the new `Tia` folder right-click `scripts\setup.ps1` → **Run with PowerShell**
   (or: `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1`). It installs what's missing – Node.js, Python, ffmpeg – and Tia's packages.
4. **Start her:** double-click **`Start Tia.cmd`** → your browser opens http://localhost:4747. Close the black window to stop her.
   `Start Tia (desktop app).cmd` opens the same screen as its own window.

- **No Claude needed – free brain:** setup asks for a free **Groq** key (https://console.groq.com/keys, sign in, *Create API Key*, no card). It's saved in `.env` on your PC only. Tia then thinks live: reads the inbox, answers, prepares offers.
- **Order Tia tries:** Claude Code (if you're logged in) → Groq → Gemini / OpenRouter (if you put `GEMINI_API_KEY` / `OPENROUTER_API_KEY` in `.env`). A provider that fails is skipped for 10 minutes, so a used-up limit never stops her.
- **No key at all:** the stand still works – **Start the day** plays the saved real run, talking uses the offline script.
- **Updates:** in the `Tia` folder run `git pull`, then run `scripts\setup.ps1` again.
- **Port taken?** Set another one before starting: `set TIA_PORT=4848` (cmd) and open that port.
- **The voice** needs internet (Microsoft neural voices). Offline, Tia falls back to the browser's voice.
- **Your AI agent** (Claude Code, Codex, Gemini, Cursor…): let it read `AGENTS.md` and `TIA Context vault/Home.md` first – goal, who owns which files, every decision. Open `TIA Context vault/` and `demo/Business vault TIA/` in Obsidian (*Open folder as vault*) to browse them.

### See it in action (5 minutes)
1. **Start the day** (top right). Tia reads the 12 demo messages out loud and sorts them: handled vs **Needs you**.
2. Watch the **left app bar**: with **Follow Tia** on, she opens **Mail** (Outlook look), **WhatsApp**, **Instagram** or **Slack** for each message and types her draft into the reply box.
3. Work yourself: click **Mail** → open *Laura Vītola* → edit Tia's reply → **Save draft**.
   - With classic Outlook installed, Outlook opens and the reply is typed in (a draft – it never sends).
   - Without Outlook, the step says so and the draft stays on the screen.
   - In **WhatsApp**, the send arrow opens WhatsApp Web with the text typed in.
4. **Talk or type to Tia** (Tia tab, bottom): *"Prepare the contract for Ieva Bērziņa"*. She asks which worktop (oak or quartz) instead of guessing. Answer *"Quartz"*, then **Approve**: a PDF contract opens, goes to your default printer and into an Outlook draft.
   - No printer? Choose *Microsoft Print to PDF* as the default printer.
5. **Lead finder:** *"Find architects and real-estate agencies in Riga who could send us clients"*. Real Riga businesses (OpenStreetMap + their websites) get a fit score and appear in the **Leads** tab. The best two get a first email as a draft.
6. **Phone:** *Connect phone* → scan the QR → the app opens in Expo Go (same Wi-Fi) and shares the same desk.

What runs where: views, voice, avatar, lead finder and PDFs work on every PC. Outlook drafts need **classic Outlook**. Printing needs a default printer. Gmail and Slack need Composio (below).

### Real apps through Composio (optional, your own accounts)
Tia reads and **drafts** in real apps through [Composio](https://composio.dev) (free: 10 000 actions a month). Sending, posting and deleting are blocked in `src/connectors/composio.js`.
1. Install the CLI (Windows PowerShell): `irm https://raw.githubusercontent.com/ComposioHQ/composio/next/install.ps1 | iex`, then run `composio login`.
2. Connect an app: `composio link gmail` (and/or `slack`, `instagram`, `linkedin`, `metaads`, `outlook`), then click **Allow**. WhatsApp needs a WhatsApp Business Account ID (WABA) – the WhatsApp tab explains it and opens the link page.
3. In Tia, each app tab (Mail, Slack, Instagram, WhatsApp, LinkedIn, Ads) has a switch at the bottom left: **Oakline Studio · demo** or **My … · live**. Live shows your own account (`src/connectors/live.js`, cached in `data/live/`): Gmail inbox (Tia writes the reply → **Save draft** = a real Gmail draft), Slack channels, Instagram profile + posts (Tia rewrites captions), LinkedIn (Tia writes a post, you edit, copy & open LinkedIn), Meta Ads (Ads Manager look-alike with spend/CTR/CPC per campaign and ad; Tia scores each ad and writes an improved version you can edit). Nothing is sent, posted or changed in a live ad account.
4. Let Tia's **Start the day** read that Gmail: create `config.json` in the Tia folder with `{ "inboxSource": "gmail" }` and restart Tia. **Start the day** now reads the newest Gmail messages, and approving saves a Gmail draft in the same thread and opens it.
   - Use a **demo account** for the stand, not your private mail – it shows on the big screen.

## The demo business vault (`demo/Business vault TIA`)

A fictional Riga kitchen studio, **Oakline Studio**, built as a real second brain: ~800 linked notes (clients, projects, meetings since Oct 2025, daily notes since March 2026, leads, suppliers, team, SOPs, materials, decisions, finance, templates, MOCs). Open the folder in Obsidian to see the graph (colours by folder are preset).

- Tia searches it (BM25 over note sections) and always reads `Business`, `Owner preferences`, `Price list` and `Calendar — this week`. Hermes can read the same folder.
- It is generated: `python scripts/make_demo_vault/build.py` (same seed → same vault), then `python scripts/make_demo_vault/check_links.py` (0 broken links). Change facts in `scripts/make_demo_vault/*.py`, not in the notes.
- **`Templates/` is hand-edited** (contract, offer, follow-up…): the generator keeps whatever is there.
- Everything is invented; emails use `.example` domains, no phone numbers.
- With the big vault and the free Groq brain, a live **Start the day** gives the same 12 decisions as the saved Claude run (tested 25.11). Live runs on the demo save to `data/replay-latest.json`; the stage recording `demo/replay.json` only changes with `TIA_RECORD_REPLAY=1`.

## Real actions and the lead finder

- **Approve a reply** → classic Outlook opens and Tia types the reply in (draft – you press Send). WhatsApp replies open WhatsApp with the text typed.
- **"Prepare the contract for Ieva"** → Tia asks about open choices, builds the PDF from `demo/Business vault TIA/Templates/Template — Contract.md`, opens it, prints it on the Windows default printer and puts it in an Outlook draft.
- **"Find architects in Riga who could send us clients"** → real businesses from OpenStreetMap, Tia reads their websites, scores the fit, writes a first line, and adds them to your **Google Sheet** (setup: `scripts/google-sheets-crm/Code.gs`, 2 minutes) or to Tia's own page http://localhost:4747/crm. The best two get a first email as a draft for your OK. Nothing is ever sent by Tia.
- Settings in `config.json` → `"actions": { "show": true, "print": true, "outlook": true, "whatsapp": true }`.

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

**Published app (works anywhere):** the app is also published to Expo (`npx eas-cli@latest update --branch main --environment production` in `mobile/`, result saved to `data/eas-update.json`). Tia's **Connect phone** dialog then shows one QR: scan it with the phone camera → the app opens in Expo Go and connects to Tia by itself (the link carries the address and the Tia code after `/--/connect`). Publish again after every change in `mobile/` – the dialog always uses the newest one.

**Installable Android app (APK):** `npx eas-cli@latest build -p android --profile preview` (Expo account `rderics`, project `@rderics/tia-secretary`).

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
2. `powershell -ExecutionPolicy Bypass -File scripts\tunnel-setup.ps1 -Hostname tia.example.com` (once).
3. `powershell -ExecutionPolicy Bypass -File scripts\start-tia.ps1` – starts the server and the tunnel.

Everything private behind the web address needs the **Tia code** (the pairing token): the web screen asks for it once, the phone app shows it in its ••• menu, **Connect phone → Copy private link** gives a link with it. A new code: delete `data/pair.json` and restart (every phone and browser must log in again).

## The stand script (3 minutes)

1. **Start the day** → Tia goes through 12 messages; 5 handled, 7 need you, the fraud email is caught.
2. Hold the mic: *"Ieva wants her kitchen offer by Friday."* → Tia has the measurements but **not the worktop** – she asks "Oak or quartz?" instead of guessing (the mistake/limit moment the challenge asks for).
3. *"Quartz."* → a priced offer (9 400 €, from `demo/Business vault TIA/Price list.md`) lands on the phone.
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
4. Handled items are written to `demo/Business vault TIA/Tia/Activity log.md`. Approve / Edit / Reject writes a lesson to `demo/Business vault TIA/Tia/Learned rules.md`.
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
| `demo/Business vault TIA`, `demo/inbox.json` | The fictional business and its day |

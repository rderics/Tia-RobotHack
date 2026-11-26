# Tia on your PC – team setup (about 15 minutes)

Everything below is clicks. No code, no terminal (unless you want the one-line version).

## 1 · Get the team key file (1 min)
Rinalds sends you **`tia-team.env`** in a Discord DM. Save it to your **Downloads** folder.
It holds the free AI key and the WhatsApp connection. **Never post it anywhere public.**

## 2 · Install Tia (5–10 min, mostly waiting)
1. Open **https://rderics.id.lv/tia-get**
2. Click **Download the installer** → open **Install-Tia.cmd**
   (Windows warning → **More info → Run anyway**)
3. Wait until it says **Done!** It installs everything Tia needs by itself
   (Node.js, Python, ffmpeg, Obsidian, Cloudflare tunnel, Composio).

You now have 3 icons on the desktop: **Tia**, **Tia – Business vault**, **Update Tia**.

> One-line alternative (PowerShell): `irm https://raw.githubusercontent.com/rderics/Tia-RobotHack/main/scripts/install.ps1 | iex`

## 3 · Open Tia
Double-click **Tia**. She opens as her own app window (press **F11** for full screen).
Press **Check inbox** – the demo business (Oakline Studio) works right away.

## 4 · Connect your own apps (2 min per app)
In Tia: left rail → **Settings** (gear, bottom) → **Connected apps**
1. **Sign in to Composio** (free – a browser opens, sign in with Google). Back in Tia press **↻**.
2. Press **Connect** next to each app you want: **Google Calendar, Gmail, Slack, Instagram, LinkedIn, Meta Ads** →
   the browser opens → sign in → **Allow** → back in Tia press **↻**. The dot turns green.
3. In each app tab, switch the bottom-left button to **My … · live** to see your own account.

| App | How it connects | What Tia does with it |
|---|---|---|
| Outlook (classic) | nothing to connect – just be signed in to **classic Outlook** on the PC | types reply drafts in front of you, attaches contracts |
| Gmail · Calendar · Slack · Instagram · LinkedIn · Meta Ads | **Settings → Connect** (Composio) | reads, drafts replies / posts / events, reviews ads |
| WhatsApp Business | comes with **tia-team.env** | messages to the business number appear live; replies after your tap |
| Printer | your Windows default printer | contracts and offers print from the Docs tab |
| AI | comes with **tia-team.env** (free Groq) – change it in **Settings → Tia's brain** | everything |

## 5 · Phone
In Tia press **Connect phone** → scan the QR with the phone camera →
- **Android:** *Download the Tia app* → install → *Open Tia – connected*
- **iPhone:** install **Expo Go** from the App Store → *Open in the Tia app*

## Before the pitch
- Double-click **Update Tia** the evening before (keeps your keys and data).
- Start Tia on the pitch laptop **last** – the PC that started Tia last receives the WhatsApp messages.
- Pitch plan and demo video shot list: `TIA Context vault/Pitch plan.md`. What works where: `TIA Context vault/Pitch PC guide.md`.

## Something doesn't work?
- **Settings** shows what's connected and lets you **Test** the AI.
- Outlook drafts need **classic** Outlook (not "new Outlook").
- Ask in the team Discord with a screenshot of Settings.

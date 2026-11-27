# Tia on your PC – step by step (about 15 minutes)

Everything is clicks. Windows 10/11. Do the steps in order.

---

## Step 1 · Get the team code (1 min)
Rinalds sends you the **team code** in a Discord DM (it looks like `oakline-river-maple-1234`).
The installer asks for it once – Tia then fetches the shared keys (free AI, WhatsApp Business) by herself and keeps
them up to date. **Don't post the code in a public channel.**

---

## Step 2 · Install Tia (5–10 min, mostly waiting)
1. Open **https://rderics.id.lv/tia-get**
2. Click **Download the installer** and open **Install-Tia.cmd**.
   Windows warns you → click **More info → Run anyway**.
3. A blue window installs everything by itself (Node.js, Python, ffmpeg, Obsidian, Cloudflare, Composio).
   When it asks **"Team code from Rinalds"** → paste the code → Enter.
   (If it then asks for a Groq key, just press **Enter**.)
4. Wait for **"Done!"** and close the window.

On your desktop you now have:
- **Tia** – the app
- **Tia – Business vault** – the demo business in Obsidian
- **Update Tia** – gets the newest version (keeps your keys and data)

> Already know PowerShell? Same thing in one line:
> `irm https://raw.githubusercontent.com/rderics/Tia-RobotHack/main/scripts/install.ps1 | iex`

---

## Step 3 · Open Tia and check it works (1 min)
1. Double-click **Tia**. She opens as her own app window. **F11** = full screen.
2. Press **Check inbox** (top right). In about a minute Tia sorts the 12 demo messages:
   routine ones go to **Done**, decisions go to **Needs you**.
3. Left rail → **Settings** (gear at the bottom) → **AI**. Pick the AI you want – they are all options, no "best" one:
   - **Google Gemini / Groq / OpenRouter** – paste a free API key (**Get a key ↗** opens the page) → **Save** (top right)
   - **Claude** or **ChatGPT** – press **Sign in** and sign in with your own account
   - **Claude API / ChatGPT API** – paste a paid key · **Google Antigravity** – sign in in the Antigravity app
   Then **Use first** (or **Add** as a backup) and **Test** → it should say **"Works"**.
   The team code already gives everyone Groq, so Tia works even if you skip this.

---

## Step 4 · Connect your own apps (2 min each)
In Tia: **Settings → Connected apps**

1. Press **Sign in to Composio** → a browser opens → sign in with **Google** (free) → come back to Tia → press **↻**.
2. Next to each app press **Connect** → sign in in the browser → **Allow** → back in Tia press **↻**. The dot turns green.
   - Google Calendar · Gmail · Slack · Instagram · Meta Ads
3. In each app tab, switch the button at the **bottom left** from **Oakline Studio · demo** to **My … · live** to see your own account.

**Outlook** – nothing to connect. Just be signed in to **classic Outlook** on the PC (not "new Outlook").
Tia types reply drafts into it in front of you; you press Send.

---

## Step 5 · Your WhatsApp in Tia (2 min, optional)
1. Tia → **WhatsApp** tab → bottom left switch to **My WhatsApp · live** → press **Link my WhatsApp**.
2. A QR code appears.
3. On your phone: **WhatsApp** (or WhatsApp Business) → **Settings → Linked devices → Link a device** → scan the QR.
4. Your chats appear in Tia within seconds. Your phone keeps working normally.
   - **✦** = Tia writes a reply · **➤** = send it from your number (only when *you* tap).
   - Remove it any time: phone → Linked devices → Tia → Log out, or **Unlink** in Tia.

The team's **WhatsApp Business** number works through the team code (no setup needed).

---

## Step 6 · Connect your phone (2 min)
1. In Tia press **Connect phone** (top) → a QR code appears.
2. Scan it with the phone **camera**:
   - **Android:** tap **Download the Tia app** → install it (allow "install unknown apps" once) → go back and tap **Open Tia – connected**.
   - **iPhone:** install **Expo Go** from the App Store → go back and tap **Open in the Tia app**.
3. Approve a card on the phone – it closes on the PC too.

---

## Step 7 · Try every tab (5 min)
| Tab | Try this |
|---|---|
| **Tia** | Hold the mic: *"Make the contract for Ieva Bērziņa"* → she asks oak or quartz → answer → Approve |
| **Mail** | Open a mail → **Let Tia write** → **Save draft** (Outlook opens and types it) · **New mail** |
| **Calendar** | **Fill in with Tia**: *"Team call tomorrow at 10 for 30 minutes"* → **Add** |
| **WhatsApp / Instagram / Slack** | open a chat → ✦ / **Let Tia write** → send |
| **Ads** | click a campaign → an ad → Tia's score and improved version |
| **Docs** | contracts and offers → **Print** / **Email as draft** |
| **Leads** | ask Tia on the Tia tab: *"Find architects in Riga who could send us clients"* |
| **Vault** | graph view – ask Tia something and watch the notes she reads light up |

---

## Before the pitch
- Tia **updates herself** from GitHub (every 15 min) and shows a bar "Tia was updated – Restart now". Installed before 27.11? Double-click **Update Tia** once to get this.
- On the pitch laptop, start Tia **last** – the PC that started Tia last receives the team's WhatsApp Business messages.
- Pitch plan + video shot list: `TIA Context vault/Pitch plan.md` · what works where: `TIA Context vault/Pitch PC guide.md`.

## Something doesn't work?
- **Settings** shows what's connected and has **Test** for the AI.
- Tia didn't open → double-click **Update Tia**, then **Tia** again.
- Outlook drafts don't open → use **classic** Outlook and sign in once.
- Send a screenshot of **Settings** in the team Discord.

---

## For the teammate with the new avatar
Tia's 3D model is **`src/renderer/assets/avatars/tia.vrm`**. To swap it:
1. Export the model as **VRM** (VRoid Studio → Export → VRM 0.x or 1.0; Blender → VRM add-on). GLB/FBX won't animate.
2. In the repo: `git checkout -b avatar-new`, replace **`src/renderer/assets/avatars/tia.vrm`** with your file (same name),
   add the licence/credits to **`src/renderer/assets/avatars/SOURCE.txt`**, commit, `git push -u origin avatar-new`.
3. Tell Rinalds in Discord – the branch is merged into `main` and everyone gets it with **Update Tia**.
   (Lip-sync, blinking and moods work on any VRoid-style VRM. The lavender blouse tint only applies if the model has
   a material named `Onepiece_00_CLOTH` – otherwise it's simply skipped.)

---
type: plan
updated: 2026-11-26
---
# Pitch plan — selection (deadline 9:30) and the 5-minute RTU pitch

**What we hand in by 9:30:** a clean presentation + a demo video (2–3 min, sped up ×1.25–1.5 where Tia is "thinking").
**If selected (signal 13:30):** 5-minute live pitch at RTU, the video plays while we narrate; AI Studio visit.

## 5-minute structure
| Time | Slide | Say (short) |
|---|---|---|
| 0:00–0:30 | **Team** | RTK – 2 programmers + computer-systems technicians. We build tools owners actually use. |
| 0:30–1:15 | **Problem** | A small-business owner (kitchen studio, clinic, salon, builder) spends 2–3 h a day answering mail, WhatsApp, Instagram, Slack, making offers and contracts. Answers are slow, leads go cold, and one fake "new bank details" mail can cost thousands. Hiring a secretary costs ~€1 200+/month. *(say "about"; we didn't measure it ourselves)* |
| 1:15–3:15 | **Solution = the video** | Tia, an AI secretary: reads every channel in apps the owner already knows, answers routine messages from the business's own notes (the vault), and puts only decisions in "Needs you" with the reply/contract already drafted. Nothing goes out without the owner's tap. |
| 3:15–4:00 | **Next steps** | Cloud version (no PC needed), one-click connections (Gmail, Outlook 365, WhatsApp Business, Calendar via Composio – 1 000+ apps), choose any AI model in Settings (Claude, GPT, Gemini, Groq, local models), phone app in the stores, Latvian voice. |
| 4:00–4:45 | **Business model** | Subscription per business: Starter €29/mo (1 inbox + WhatsApp), Pro €79/mo (all channels, contracts, leads), Team €199/mo (several people). Setup service for the vault. Sell through accountants and IT service companies who already serve these owners. |
| 4:45–5:00 | **Close** | "Tia doesn't replace the owner – she gives them back two hours a day. Every decision stays human." |

## Demo video – shot list (record in the Tia desktop window, F11 full screen)
1. **Start** – Tia greets; "Check inbox" → 12 messages sorted in ~45 s (speed up ×2): 4 handled, 8 need you.
2. **The catch** – the fake "URGENT: new bank details" mail lands in Needs you with the warning (show the Why).
3. **Familiar apps** – Mail (Outlook look): open Dmitrijs' lead, "Let Tia write" types the reply from the vault → Save draft → real Outlook opens and the text is typed in. (WhatsApp: Anna's chat → ✦ → ➤ opens WhatsApp.)
4. **Voice** – "Make the contract for Ieva Bērziņa" → Tia asks "oak or quartz?" (honest about missing info) → "Oak" → approve → PDF → **printer** → Outlook draft with the PDF.
5. **Business vault** – graph view; ask a question and watch the notes Tia reads light up ("Tia is reading").
6. **Calendar** – "Pitch rehearsal tomorrow at 9 for 90 minutes" → Tia fills the event → Add.
7. **Ads** – real Meta ad account: Tia scores an ad (e.g. 55/100) and writes a better version; preview updates.
8. **Leads** – "Find architects in Riga who could send us clients" → rows fill the CRM with fit scores.
9. **Phone** – scan the QR → the app opens connected; approve one card on the phone, the screen updates.
10. **Settings** – the AI order (Claude → Codex → Groq), Test, keys: "any model, switch in a click."

Tips: record at 1600×900, Follow Tia on, voice on; cut waiting; add short captions ("all real – nothing pre-recorded except where marked").

## Things to say if asked
- **Is it real?** Yes – the apps, Outlook, printer, calendar, ads and WhatsApp relay are live connections; the business (Oakline Studio) is fictional so no private data is shown.
- **Privacy?** Runs on the owner's PC; keys stay on the PC; the AI only gets the notes that match the message.
- **Mistakes?** Money, complaints, new partners and anything unusual always wait for the owner; Tia shows *why* for each decision.
- **WhatsApp** – business number via Meta's official API; Tia drafts, the owner taps send.

## Open before the pitch
- [ ] WhatsApp sending: needs a real number registered (test number is blocked by Meta) – spare SIM or coexistence.
- [ ] New avatar from teammate (VRM) → `src/renderer/assets/avatars/tia.vrm`.
- [ ] Record the video on the pitch laptop after `Update Tia`.

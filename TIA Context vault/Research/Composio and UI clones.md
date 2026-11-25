# Composio and UI clones (researched 25.11)

## Composio (ComposioHQ/composio, MIT, ~31k stars)
- Hosted tool layer for agents, managed OAuth for 1000+ apps. Free: 10 000 tool calls/month, no card. Node: `@composio/core` (Node ≥ 22, ESM), `COMPOSIO_API_KEY`.
- **Gmail:** `GMAIL_FETCH_EMAILS`, `GMAIL_CREATE_EMAIL_DRAFT` (real drafts). **Google Calendar:** list/create events. **Slack:** fetch history/threads, post (we never post). **Google Sheets:** batch get/update.
- **Outlook/M365:** `OUTLOOK_CREATE_DRAFT_REPLY` etc.; work tenants may need admin consent → keep classic Outlook COM as the main path.
- **WhatsApp / Instagram:** business accounts only (WABA / professional + Meta app review), 24-hour reply window, **no draft concept** → keep simulated for the demo.
- Privacy: message content passes through Composio; payload logs kept up to 1 year unless turned off (project setting / Zero Data Retention). Fine for the fictional demo; check before real client data.

## UI clones (licence checked via GitHub API)
- Outlook web: none usable (Mail-0/Zero is MIT but Gmail-style; others unlicensed).
- WhatsApp Web: aladinyo/WhatsappyApp (MIT, React), yuvraj24/WhatsApp-Clone (MIT, React); KarenOk/whatsapp-web-clone has **no licence** → not usable.
- Instagram DMs: nothing credible.
- Slack: Sirneij/slack-clone-ui (MIT, plain CSS), lukejacksonn/react-slack-clone (MIT, old).
- → We built our own look-alikes in plain CSS; never copy logos/icons (trademarks).

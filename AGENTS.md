# AGENTS.md — read this first (any AI agent: Claude Code, Codex, Gemini/Antigravity, Cursor, Hermes)

This repo is **Tia**, an AI secretary for small-business owners, built by a 5-person team for RobotHack 2026
(partner challenge **PCH02 "Show and Explain AI for Business"**, demo day **28.11.2026**).

## Before you change anything
1. Read **`TIA Context vault/Home.md`** – the shared project memory (an Obsidian vault). It holds the goal, who owns which
   files, the architecture, every decision and what is out of scope. Its facts win over your assumptions.
2. Check **`TIA Context vault/Team and ownership.md`** – only edit files your human owns. Ask before touching others'.
3. `git pull` before you start, `git pull` again before you push. Small commits, clear messages.

## When the team decides something
Add one line at the **top** of `TIA Context vault/Decisions.md` (date · who · decision · what it replaces) **in the same
commit** as the change. A decision that lives only in a chat does not exist for the other agents.

## Hard rules
- **Never commit secrets or personal data:** `.env`, `config.json`, `data/`, API keys, real email addresses,
  real phone numbers, anyone's private notes. Demo data is fictional and uses `.example` domains.
- **Tia never sends, pays or signs by herself.** Every outward action (email, WhatsApp, order, contract) ends as a
  draft or a document that a human approves. Keep it that way in code (`src/brain/guard.js`).
- `demo/Business vault TIA` (the fictional business **Oakline Studio**) is **generated** – change
  `scripts/make_demo_vault/*.py` and rebuild, except `demo/Business vault TIA/Templates/`, which is hand-edited.
- `demo/replay.json` is the stage's safety recording – only re-record on purpose (`TIA_RECORD_REPLAY=1`).

## Run it
`scripts\setup.ps1` once, then `Start Tia.cmd` → http://localhost:4747 (details in README).

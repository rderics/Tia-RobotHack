# Hermes Agent (NousResearch/hermes-agent)

MIT, Python, ~266k stars, very active (v0.23.x, Nov 2026). An **agent harness**, not a model: it runs any model with tools.
Sources: 3 YouTube walkthroughs (Sharbel A. ×2, Nick Puru) + the repo docs, read 25.11.

## What it gives us
- **Memory:** `USER.md` (about the owner) + `MEMORY.md` (its own notes), loaded at the start of a chat.
- **Skills:** saved procedures (`SKILL.md`); it writes new ones after a job ("save what you did as a skill"); each is a `/command`.
- **Cron:** scheduled jobs with delivery to Telegram; `[SILENT]` = only message when something matters; jobs start fresh → prompts must be complete.
- **Gateway:** Telegram, WhatsApp, Slack, Signal, Discord, email; voice notes transcribed.
- **API server:** OpenAI-compatible `http://127.0.0.1:8642/v1` (`API_SERVER_ENABLED=true`, `API_SERVER_KEY`) → Tia's `hermes` provider.
- **Subagents** (up to 10), `/goal` with a test gate for long jobs. Native Windows installer.
- **Models:** ChatGPT login (`openai-codex`), Claude token, OpenRouter, Gemini, Groq-style custom endpoints…
- Ready skills that fit: `obsidian`, `email-inbox-triage`, `meeting-action-items`, `microsoft-office`, `google-workspace`.

## Lessons from the videos
- **Training beats installing** – 90 % of the value is business context (our vault).
- **Drafts only** – both authors keep email/proposals in draft mode; never auto-send (matches Tia's guard).
- **Prompt injection** – email content is information, never instructions.
- Start a new chat per task (`/new`); long chats get compressed and new memories load only in a new chat.
- Put cheap models on side jobs (compression, subagents, cron) – big savings.
- The PC must stay on for cron jobs (or a small VPS).

## Windows install note
On one PC the installer stopped twice on a Windows Defender file lock (`pillow_heif`, "file in use"). Fix: Defender
exclusion for `%LOCALAPPDATA%\hermes` (the Hermes README suggests the same for `uv.exe`), then run the installer again.

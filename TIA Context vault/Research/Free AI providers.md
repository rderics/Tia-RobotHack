# Free AI providers (tested 25.11)

| Provider | Key | Limits (free) | Result for Tia |
|---|---|---|---|
| **Groq** – `openai/gpt-oss-120b`, `gpt-oss-20b` | console.groq.com/keys, no card | 8 000 tokens/min per model, 1 000 requests/day | ✅ 12/12 same decisions as Claude; ~1.5 min per demo day (waits on limits) |
| Groq `qwen/qwen3.8-27b` | same | same | ❌ approved a food order alone – dropped |
| Gemini (AI Studio) | aistudio.google.com/apikey | free tier only on a project **without** billing | works if the key is from a free project |
| OpenRouter `:free` models | openrouter.ai | ~50 requests/day without credits | backup |
| Local LLM | – | needs GPU | too slow on the team's PCs |

Put the key in `.env` (`GROQ_API_KEY=…`, or `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or `TIA_AI_BASE_URL/KEY/MODEL`
for any OpenAI-compatible API). Free tiers may train on prompts – fine for fictional demo data only.

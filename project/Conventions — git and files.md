# Conventions — git and files

- **Branch:** `main`. `git pull` before you start and before you push. If a pull conflicts in a file you don't own, stop
  and ask its owner ([[Team and ownership]]).
- **Commits:** one logical change, message says what and why. Update [[Decisions]] in the same commit when you decide something.
- **Never commit:** `.env`, `config.json`, `data/`, `node_modules/`, keys, real emails/phones, private notes. `.gitignore` covers these – don't force-add.
- **Generated files:** `demo/vault/*` (except `Templates/`) ← `python scripts/make_demo_vault/build.py`;
  `src/renderer/avatar.js` ← `npm run build:avatar`; the public demo ← `node scripts/build-static.js`.
- **Saved stage run:** `demo/replay.json` changes only with `TIA_RECORD_REPLAY=1` (Rinalds records the final one).
- **Language:** code, UI and these notes in English. Demo messages may be Latvian/English/Russian like real clients.
- **Licences:** third-party models/code must allow commercial use; note the source next to the file (e.g. `SOURCE.txt`).

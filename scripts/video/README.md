# Demo video (scripted – re-record any time, e.g. after the new avatar)

1. Start a recording Tia (demo business, actions simulated – nothing prints or opens Outlook):
   `TIA_CONFIG=none TIA_PORT=4848 TIA_SIMULATE_ACTIONS=1 TIA_QUICK_TUNNEL=0 TIA_AUTO_UPDATE=0 node src/web.js`
2. `cd scripts/video && npm install` (playwright-core – uses the Edge already on Windows)
3. Narration in Tia's voice: generate `narration.json` lines with edge-tts (`en-US-AvaNeural`) into a `vo/` folder
4. Record: `node scripts/video/record.js <take>` (drives the app, ~6 min, saves frames + markers)
5. Edit: `node scripts/video/edit.js <take> <vo> out.mp4` (cuts waiting, speeds scenes to the narration, zooms,
   labels, title cards, voice)

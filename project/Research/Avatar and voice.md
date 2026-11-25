# Avatar and voice — what we tried (24–25.11)

| Try | Result |
|---|---|
| Procedural three.js figure | "game from 2012" |
| Tripo community models | unclear licence, no face rig |
| BlendKit stylized character | "creepy" |
| TalkingHead + Avaturn (realistic, met4citizen/TalkingHead, MIT) | "even worse"; sample model non-commercial |
| **VRM anime 3D (pixiv/three-vrm, MIT)** | ✅ chosen: clean toon shading, visemes, blinking, eye contact, moods |

- **Model:** "ユズキ / 黒いスーツ" (Yuzuki, black suit) by Tovie on VRoid Hub – corporate commercial use, edits and
  redistribution allowed, no credit needed. Lavender blouse tint = Tia's accent colour. Own VRoid Studio character = later.
- **Lip-sync:** loudness of the voice opens the mouth; the vowels of the current word pick the shape (aa/ee/ih/oh/ou);
  word timings come from the voice service.
- **Voice:** Microsoft neural voices through rany2/edge-tts ("Ava" default; Emma, Sonia tested). Unofficial Edge
  read-aloud service – could change. Backup: Kokoro (local, too slow on an 8 GB no-GPU PC), browser voice.
- Real-time photoreal avatars need a GPU; on normal PCs they look uncanny – don't go back there.

# 🌍 08 — Command the Future (AI Voice-Controlled 3D World)

Visitors talk to **NOVA**, an AI co-pilot that talks back. They use their voice to build a world across **3 levels**. One visitor takes about 6–10 minutes.

## Run it
**Live:** https://3d-world-voice-agent.vercel.app. Open it in Chrome and click **Allow** for the microphone.

**Offline / expo laptop:** double-click **`start.bat`**. It needs Node.js 18 or newer and installs, builds and opens the app the first time.

Developer commands:
```bash
npm install      # once
npm run dev      # live-reload development server
npm test         # language-understanding unit tests
npm run build    # production build into dist/
```

Voice recognition needs **Google Chrome or Edge** with **internet**. Everything else works offline once the page has loaded.

## Project structure
| File | What it does |
|---|---|
| `src/main.js` | Start-up, crash-proof render loop, shader warm-up, auto quality |
| `src/game.js` | Levels, missions, scoring, NOVA's replies and follow-up questions |
| `src/nlu.js` | Language understanding: sentence → action + details (unit-tested) |
| `src/voice.js` | Microphone (speech recognition) and NOVA's voice (speech synthesis) |
| `src/home.js` | Level 1 island, rocket, weather, the 4 world themes |
| `src/space.js` | Levels 2–3: planets, moons, portal, spaceships, black hole, warp |
| `src/scene.js`, `src/ui.js` | 3D renderer and camera; on-screen panels |

## Reliability
- One error never freezes the world. It is skipped and shown as a small "glitch recovered" badge; tap the badge to copy the details.
- If the 3D view keeps failing for 5 seconds, or the GPU resets, the app restarts itself.
- Shaders compile while the start screen is showing, so effects never stall mid-game.
- Memory is freed when objects are removed. "Next explorer" reloads the page for a fully clean start and keeps the chosen world.
- On slow laptops the resolution drops automatically.
- Voice is protected against double starts, ignored permission prompts, missing callbacks, NOVA hearing herself, and unsupported browsers.

## Worlds (choose on the start screen)
🚀 Space Lab · 🌆 Cyberpunk Bengaluru · 🐠 Underwater Base · 🏙️ Smart City

## Levels and missions
| Level | Missions (example phrases) |
|---|---|
| 1 · Home base | "launch the rocket" · "make it rain" · "make it day" · "fireworks" |
| 2 · Solar System Builder | "create a planet named Kelly" · "make a big blue planet" · "add a moon to Kelly" · "destroy a planet" |
| 3 · Galaxy Commander | "open the portal" · "launch 3 spaceships" · "create a black hole" · "warp speed" |

## NOVA understands normal English
- **Details in one sentence:** "make a huge pink planet called Bob" gives size huge, colour pink and name Bob.
- **"it", colours, order:** "turn it green", "destroy the red one", "make Kelly bigger", "the newest one".
- **Follow-up questions:**
  - "Destroy a planet" → *"Which one? Kelly or Bob?"* → "Kelly" → 💥
  - "Launch spaceships" → *"How many?"* → "five"
- **Mic spelling mistakes:** "Kelley" still finds Kelly.
- **Small talk:** "hello", "who are you", "how many planets", "what can I say?", "cancel".

After asking a question, NOVA starts listening for the answer by herself.

## Operator controls
- **Space** starts the mic.
- **1–4** run a mission.
- **N** skips to the next level.
- 🔊 turns NOVA's voice on or off.

## If something fails
| Problem | Fix |
|---|---|
| Mic blocked | 🔒 icon in the address bar → Microphone → Allow |
| No internet | Voice won't work. Visitors can tap the cards or type instead |
| Noisy hall | Use a headset or clip-on mic, or type in the box |
| NOVA hears herself | Use a headset, or lower the speaker volume |

## How the AI works (for explaining to students)
🎤 Speech recognition turns your voice into words → 🧠 language understanding finds the **action** and **details** (name, colour, number) → 🌍 Three.js changes the 3D world → 🤖 text-to-speech gives NOVA her voice.

Every step lights up in the "How the AI works" panel. Words the AI caught are highlighted in green.

Scoring: each mission gives +100, and voice commands in a row add a streak bonus. Ranks are ⭐ Space Cadet, 🏅 Star Captain (1000+) and 👑 Galaxy Commander (1500+).

# 🌍 08 — Command the Future (AI Voice-Controlled 3D World)

Visitors talk to **NOVA**, an AI co-pilot that talks back. They use their voice to build a world across **3 levels**. One visitor takes about 6–10 minutes.

## Run it
1. Double-click **`start.bat`** (needs Python). Chrome opens at `http://localhost:8080`.
2. Pick a world, then click **Start mission**. Click **Allow** when Chrome asks for the microphone.

Use **Google Chrome or Edge** with **internet**. Chrome's speech recognition runs on Google's servers.

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

# 🎵 Ear Trainer

A browser-based ear training app for musicians of all levels. Train your ability to recognize intervals, chords, and scales — all synthesized in real time with no audio samples required.

**[→ Open the App]([eartrainer.site](https://eartrainer.site))**

---

## What It Does

Ear Trainer plays musical sounds through your browser and asks you to identify them. Each exercise is generated on the fly using the Web Audio API — no downloads, no plugins.

There are three exercise types:

**Intervals** — Hear two notes and name the distance between them (e.g. Perfect 5th, Tritone, Major 3rd). Each interval comes with a reference song hint to help you remember it. Choose between ascending, descending, or harmonic (simultaneous) playback.

**Chords** — Identify triads and seventh chords by ear: Major, Minor, Diminished, Augmented, Sus2, Sus4, and a full set of 7th chord qualities. Each chord shows a short mood description to build your intuition.

**Scales** — Recognize scales from a single ascending run: Major, all three Minor variants, the seven modes, Pentatonic Major/Minor, Blues, Whole Tone, and Diminished.

---

## Features

- **No audio samples** — everything is synthesized live via the Web Audio API
- **Customizable practice set** — toggle which intervals, chords, or scales you want to drill
- **Root note control** — practice in a fixed key or keep it random
- **Score tracking** — score, streak, and accuracy update in real time
- **Activity graph** — visualize your practice history over time
- **Daily streak** — a flame badge tracks consecutive days of practice
- **Dark / Light / Auto theme**
- **Guest mode** — works immediately with no account; progress saved to `localStorage`
- **Account sync** — sign in to sync your scores and stats across devices via Firebase

---

## Getting Started

No installation needed. Just open the app in any modern browser.

1. Click **Play** to hear a sound
2. Select your answer from the grid
3. Get instant feedback and move to the next question
4. Use the toggles below the grid to customize which items you're practicing

To save progress across devices, create a free account via **Sign In / Register** in the sidebar.

---

## Settings

| Setting | Options |
|---|---|
| Root note | Random, or any fixed note C – B |
| Theme | Dark, Light, Auto |
| Exercise items | Individual toggles per interval / chord / scale |

Settings are saved automatically.

---

## Account & Data

- **Guest** — scores and settings persist in your browser's local storage. Clearing site data will reset them.
- **Signed-in** — all stats sync to Firestore in real time. You can upload a profile picture and edit your display name from the Profile page.
- **Delete account** — available under Settings → Danger Zone. Permanently removes all data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Audio synthesis | Web Audio API (oscillators, envelope shaping) |
| Auth & database | Firebase Authentication + Firestore |
| Fonts | Playfair Display, DM Mono (Google Fonts) |
| Hosting | Firebase Hosting |
| Ads | Google AdSense |

No frameworks, no bundler — plain HTML, CSS, and JavaScript.

---

## Browser Support

Any modern browser with Web Audio API support: Chrome, Firefox, Safari, Edge. A device with speakers or headphones is required.

---

## License

Personal / educational use. Feel free to fork for your own ear training projects.

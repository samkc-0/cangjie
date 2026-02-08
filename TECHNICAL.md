# Technical Overview

## Architecture
- **Server:** Express app in `server.js` serves static assets and a small JSON API.
- **Client:** React SPA loaded from `public/index.html` with the bundle at `public/dist/bundle.js`.
- **Persistence:**
  - Server-side session history in `data/progress.json`.
  - Client-side profiles and mastery in `localStorage`.
- **Data:** Lessons are defined in `server.js`. Unihan data is loaded from `data/unihan.zip` at server startup.

## Runtime and tooling
- **Package manager:** `bun` only (no npm/yarn).
- **Dev:** `bun run dev` (Express serves static assets + API).
- **Prod:** `bun run start`.

## Server details (`server.js`)
- **Static assets:** `express.static` serves `public/`.
- **API endpoints:**
  - `GET /api/lessons` returns lesson metadata and exercises.
  - `GET /api/progress` returns aggregated progress and streaks.
  - `POST /api/progress` writes session results to `data/progress.json` and updates streaks.
  - `GET /api/unihan/:char` returns Unihan metadata and derived Cangjie components.
- **Unihan loading:** `data/unihan.zip` is read into memory on startup for fast lookup.
- **Progress model:**
  - `attempts`: array of recent sessions (clamped to 25).
  - `summary`: total sessions, current streak, longest streak, per-lesson counts/bests.

## Client details (`public/app.js`)
- **State:**
  - `profilesData` in `localStorage`, includes per-profile progress.
  - `progress.currentGlobalIndex` drives the active exercise.
  - `characterMastery` tracks SRS levels and next review.
- **Drills:**
  - `SingleCharDrill` for character input.
  - `SentenceDrill` for sentence-guided input.
  - `handleSubmit` validates input, updates mastery and streaks.
- **SRS intervals:** defined in `SRS_INTERVALS` and applied per character.
- **Views:** drills, lessons, settings, profiles.
- **Lesson gallery:** renders lesson cards; sentence lessons display a sentence preview.

## Data files
- `data/progress.json`: server-side session log + streaks.
- `data/unihan.zip`: Unihan Readings + DictionaryLikeData.

## Utility
- `scripts/lookup.sh`: CLI lookup for Unihan character data.

## Known separations
- Server progress (`data/progress.json`) is independent from client profiles (`localStorage`).
- Lessons are authored in `server.js`, not in external JSON.


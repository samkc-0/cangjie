# Cangjie Typing Tutor — Project Summary

## What it is
A single-page Cangjie typing tutor that teaches Cangjie roots, decomposition rules, and short phrases through guided drills. It provides immediate feedback, lesson progression, and per-character mastery tracking. The UI is built in React and served by an Express server, with a lightweight data store and Unihan-backed character lookups.

## Core user flow
- Pick a lesson (roots or rule-focused)
- Practice character drills and sentence drills
- Receive instant correctness feedback
- Progress advances automatically and stats update

## Tech stack and structure
- **Runtime:** Node + Express server in `server.js`
- **UI:** React app in `public/app.js`, styles in `public/styles.css`
- **Bundling:** Browser-side React bundle loaded from `public/dist/bundle.js`
- **Package manager:** `bun` (do not use npm/yarn)

## Key features implemented
- **Lesson library:** Defined in `server.js` with characters, meanings, Cangjie codes, and sentence drills.
- **Drills UI:** Character and sentence drills, hint overlay, lesson gallery, profiles, and settings view.
- **Profiles:** Stored in `localStorage` with migration from older single-user progress.
- **Mastery/SRS:** Per-character mastery state with spaced repetition intervals tracked client-side.
- **Stats:** Streaks, lesson completion counts, accuracy, and speed tracked in UI and/or API.

## Data and storage
- **Server-side progress:** `data/progress.json` is used by the Express API for session history and streaks.
- **Client-side profiles:** `localStorage` stores profiles, mastery, and current exercise position.
- **Unihan:** `data/unihan.zip` is read at server startup for Cangjie/definition lookup.
- **Utility:** `scripts/lookup.sh` is a CLI helper for Unihan lookups (for authoring/verification).

## HTTP API (server)
- `GET /api/lessons` — lesson metadata and exercises
- `GET /api/progress` — aggregated progress
- `POST /api/progress` — save a completed session
- `GET /api/unihan/:char` — Unihan character metadata lookup

## Documents
- `README.md` — setup, API, and quick start
- `GUIDE.md` — Cangjie typing primer for learners
- `CANGJIE-KG.md` — knowledge-graph spec for modeling Cangjie mastery

## How to run
```bash
bun install
bun run dev
# http://localhost:3000
```


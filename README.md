# Cangjie Typing Tutor

Express + React single-page application for practicing the Cangjie input method while tracking streaks and session statistics.

## Features

- Curated lesson plans that cover the base Cangjie radicals as well as short phrases.
- Fast React interface that gives immediate correctness feedback for every keystroke.
- Server-side progress tracking with streaks, lesson history, and per-lesson best accuracy metrics.
- Lightweight setup: Express serves the API plus the static assets, so there is only one `npm` project to run.

## Getting Started

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

The default port is `3000`. Override it with `PORT=4000 npm run dev`.

## Project Structure

```
├── data/progress.json   # Persistent progress store (auto-created if removed)
├── public/              # React UI served by Express + Babel in the browser
├── server.js            # Express API + static asset server
└── package.json
```

## API

| Method | Path            | Description                              |
| ------ | --------------- | ---------------------------------------- |
| GET    | `/api/lessons`  | List the lesson metadata + character map |
| GET    | `/api/progress` | Retrieve the current streak + history    |
| POST   | `/api/progress` | Save a completed session payload         |

`POST /api/progress` expects `{ lessonId, accuracy, speed, attempts }`. Accuracy should be a 0-1 float, and speed represents characters per minute. The server automatically updates the global streak and clamps history to the 25 most recent sessions.

## Resetting Progress

Delete `data/progress.json` before starting the server to wipe all tracked data. The server recreates the file on start with empty defaults.

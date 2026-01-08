const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'progress.json');
const PASSING_ACCURACY = 0.85;

const lessons = [
  {
    id: 'foundations',
    title: 'Component Foundations',
    description: 'Warm up with the 24 Cangjie radicals and their single-key codes.',
    characters: [
      { char: '日', meaning: 'sun', code: 'A' },
      { char: '月', meaning: 'moon', code: 'B' },
      { char: '金', meaning: 'metal', code: 'C' },
      { char: '木', meaning: 'wood', code: 'D' },
      { char: '水', meaning: 'water', code: 'E' },
      { char: '火', meaning: 'fire', code: 'F' },
      { char: '土', meaning: 'earth', code: 'G' },
      { char: '竹', meaning: 'bamboo', code: 'H' }
    ]
  },
  {
    id: 'simple-characters',
    title: 'Simple Characters',
    description: 'Combine two components to reinforce spatial awareness.',
    characters: [
      { char: '明', meaning: 'bright', code: 'AB' },
      { char: '林', meaning: 'forest', code: 'DD' },
      { char: '尖', meaning: 'sharp', code: 'FU' },
      { char: '朋', meaning: 'friend', code: 'BB' },
      { char: '困', meaning: 'trapped', code: 'WG' },
      { char: '沐', meaning: 'bathe', code: 'ED' },
      { char: '炎', meaning: 'flame', code: 'FF' },
      { char: '金', meaning: 'metal', code: 'C' }
    ]
  },
  {
    id: 'phrase',
    title: 'Short Phrase Drill',
    description: 'Type an everyday phrase with varying lengths to improve rhythm.',
    characters: [
      { char: '好', meaning: 'good', code: 'VO' },
      { char: '學', meaning: 'study', code: 'IPFD' },
      { char: '習', meaning: 'practice', code: 'IFSM' },
      { char: '打', meaning: 'type', code: 'QK' },
      { char: '字', meaning: 'character', code: 'YJ' }
    ]
  }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(getDefaultProgress(), null, 2));
  }
}

function getDefaultProgress() {
  return {
    attempts: [],
    summary: {
      totalSessions: 0,
      streak: 0,
      longestStreak: 0,
      lessonCompletions: {}
    }
  };
}

function readProgress() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read progress file, resetting...', err);
    const fallback = getDefaultProgress();
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function writeProgress(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/lessons', (req, res) => {
  res.json({ lessons });
});

app.get('/api/progress', (req, res) => {
  res.json(readProgress());
});

app.post('/api/progress', (req, res) => {
  const { lessonId, accuracy, speed, completedAt, attempts } = req.body || {};
  if (!lessonId || typeof accuracy !== 'number' || typeof speed !== 'number') {
    return res.status(400).json({ message: 'lessonId, accuracy, and speed are required.' });
  }

  const data = readProgress();
  const record = {
    lessonId,
    accuracy: Number(accuracy.toFixed(3)),
    speed: Number(speed.toFixed(2)),
    attempts: typeof attempts === 'number' ? attempts : null,
    completedAt: completedAt || new Date().toISOString()
  };

  data.attempts.unshift(record);
  data.attempts = data.attempts.slice(0, 25);
  data.summary.totalSessions += 1;

  if (!data.summary.lessonCompletions[lessonId]) {
    data.summary.lessonCompletions[lessonId] = { count: 0, bestAccuracy: 0, bestSpeed: 0 };
  }

  data.summary.lessonCompletions[lessonId].count += 1;
  data.summary.lessonCompletions[lessonId].bestAccuracy = Math.max(
    data.summary.lessonCompletions[lessonId].bestAccuracy,
    record.accuracy
  );
  data.summary.lessonCompletions[lessonId].bestSpeed = Math.max(
    data.summary.lessonCompletions[lessonId].bestSpeed,
    record.speed
  );

  if (record.accuracy >= PASSING_ACCURACY) {
    data.summary.streak += 1;
    data.summary.longestStreak = Math.max(data.summary.longestStreak, data.summary.streak);
  } else {
    data.summary.streak = 0;
  }

  writeProgress(data);
  res.json(data);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Not found' });
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unexpected server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Cangjie tutor listening on http://localhost:${PORT}`);
});

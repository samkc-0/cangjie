const express = require('express');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'progress.json');
const PASSING_ACCURACY = 0.85;

// Load Unihan data into memory for faster lookups
let unihanDataLines = [];
try {
  const zip = new AdmZip(path.join(__dirname, 'data', 'unihan.zip'));
  const unihanReadings = zip.readAsText(zip.getEntry('Unihan_Readings.txt'));
  const unihanDictData = zip.readAsText(zip.getEntry('Unihan_DictionaryLikeData.txt'));
  unihanDataLines = (unihanReadings + '\n' + unihanDictData).split('\n');
  console.log(`Unihan data loaded successfully (${unihanDataLines.length} lines).`);
} catch (err) {
  console.error('Failed to load Unihan data:', err);
  // If the data can't be loaded, the server can still run, but lookups will fail.
}

const CANGJIE_MAP = {
  A: '日', B: '月', C: '金', D: '木', E: '水', F: '火', G: '土',
  H: '竹', I: '戈', J: '十', K: '大', L: '中', M: '一', N: '弓',
  O: '人', P: '心', Q: '手', R: '口', S: '尸', T: '廿', U: '山',
  V: '女', W: '田', X: '難', Y: '卜'
};

const lessons = [
  {
    id: 'foundations',
    title: 'Component Foundations',
    titleZh: '部件基礎',
    description: 'Warm up with the 24 Cangjie radicals and their single-key codes.',
    descriptionZh: '練習 24 個倉頡部件與單鍵代碼。',
    characters: [
      { char: '日', meaning: 'sun', meaningZh: '太陽', code: 'A' },
      { char: '月', meaning: 'moon', meaningZh: '月亮', code: 'B' },
      { char: '金', meaning: 'metal', meaningZh: '金屬', code: 'C' },
      { char: '木', meaning: 'wood', meaningZh: '木頭', code: 'D' },
      { char: '水', meaning: 'water', meaningZh: '流水', code: 'E' },
      { char: '火', meaning: 'fire', meaningZh: '火焰', code: 'F' },
      { char: '土', meaning: 'earth', meaningZh: '土地', code: 'G' },
      { char: '竹', meaning: 'bamboo', meaningZh: '竹子', code: 'H' }
    ]
  },
  {
    id: 'simple-characters',
    title: 'Simple Characters',
    titleZh: '簡單字練習',
    description: 'Combine two components to reinforce spatial awareness.',
    descriptionZh: '組合兩個部件，加強空間感。',
    characters: [
      { char: '明', meaning: 'bright', meaningZh: '明亮', code: 'AB' },
      { char: '林', meaning: 'forest', meaningZh: '森林', code: 'DD' },
      { char: '尖', meaning: 'sharp', meaningZh: '尖銳', code: 'FU' },
      { char: '朋', meaning: 'friend', meaningZh: '朋友', code: 'BB' },
      { char: '困', meaning: 'trapped', meaningZh: '困住', code: 'WG' },
      { char: '沐', meaning: 'bathe', meaningZh: '沐浴', code: 'ED' },
      { char: '炎', meaning: 'flame', meaningZh: '炎熱', code: 'FF' },
      { char: '金', meaning: 'metal', meaningZh: '金屬', code: 'C' }
    ]
  },
  {
    id: 'phrase',
    title: 'Short Phrase Drill',
    titleZh: '短語練習',
    description: 'Type an everyday phrase with varying lengths to improve rhythm.',
    descriptionZh: '輸入日常短語，維持穩定節奏。',
    characters: [
      { char: '好', meaning: 'good', meaningZh: '好', code: 'VO' },
      { char: '學', meaning: 'study', meaningZh: '學習', code: 'IPFD' },
      { char: '習', meaning: 'practice', meaningZh: '練習', code: 'IFSM' },
      { char: '打', meaning: 'type', meaningZh: '打字', code: 'QK' },
      { char: '字', meaning: 'character', meaningZh: '文字', code: 'YJ' }
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

function lookupUnihan(char) {
  const codepoint = `U+${char.charCodeAt(0).toString(16).toUpperCase()}`;
  const result = {};

  // Ignore comments and empty lines
  const relevantLines = unihanDataLines.filter(line => line && !line.startsWith('#'));

  for (const line of relevantLines) {
    if (line.startsWith(codepoint)) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const key = parts[1];
        const value = parts[2];
        result[key] = value;
      }
    }
  }

  if (result.kCangjie) {
    result.kCangjieComponents = result.kCangjie.split('')
      .map(code => CANGJIE_MAP[code] || '')
      .join('');
  }

  return result;
}

app.get('/api/lessons', (req, res) => {
  res.json({ lessons });
});

app.get('/api/progress', (req, res) => {
  res.json(readProgress());
});

app.get('/api/unihan/:char', (req, res) => {
  const char = req.params.char;
  if (!char || char.length !== 1) {
    return res.status(400).json({ message: 'A single character is required.' });
  }
  if (unihanDataLines.length === 0) {
    return res.status(503).json({ message: 'Unihan data is not available.' });
  }
  const data = lookupUnihan(char);
  res.json(data);
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

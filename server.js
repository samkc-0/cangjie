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
    id: 'roots-philosophy',
    title: 'The Elements',
    titleZh: '哲學部首',
    description: 'The seven philosophical elements that form the foundation of the universe.',
    descriptionZh: '構成宇宙基礎的七大哲學元素。',
    exercises: [
      { type: 'character', data: { char: '日', meaning: 'sun', meaningZh: '太陽', code: 'A' } },
      { type: 'character', data: { char: '月', meaning: 'moon', meaningZh: '月亮', code: 'B' } },
      { type: 'character', data: { char: '金', meaning: 'metal', meaningZh: '金屬', code: 'C' } },
      { type: 'character', data: { char: '木', meaning: 'wood', meaningZh: '木頭', code: 'D' } },
      { type: 'character', data: { char: '水', meaning: 'water', meaningZh: '流水', code: 'E' } },
      { type: 'character', data: { char: '火', meaning: 'fire', meaningZh: '火焰', code: 'F' } },
      { type: 'character', data: { char: '土', meaning: 'earth', meaningZh: '土地', code: 'G' } },
      { type: 'character', data: { char: '明', meaning: 'bright', meaningZh: '明亮', code: 'AB' } },
      { type: 'character', data: { char: '林', meaning: 'forest', meaningZh: '森林', code: 'DD' } },
      { type: 'character', data: { char: '炎', meaning: 'flame', meaningZh: '炎熱', code: 'FF' } },
      { type: 'character', data: { char: '圭', meaning: 'jade tablet', meaningZh: '圭璧', code: 'GG' } },
      { type: 'sentence', data: { text: '日月', meaning: 'Sun and Moon' } },
      { type: 'sentence', data: { text: '水火', meaning: 'Water and Fire' } },
      { type: 'sentence', data: { text: '土木', meaning: 'Construction (Earth & Wood)' } }
    ]
  },
  {
    id: 'roots-strokes',
    title: 'The Strokes',
    titleZh: '筆畫部首',
    description: 'Basic strokes and simple shapes.',
    descriptionZh: '基本筆畫與簡單形狀。',
    exercises: [
      { type: 'character', data: { char: '竹', meaning: 'bamboo', meaningZh: '竹子', code: 'H' } },
      { type: 'character', data: { char: '戈', meaning: 'spear', meaningZh: '戈矛', code: 'I' } },
      { type: 'character', data: { char: '十', meaning: 'ten', meaningZh: '十', code: 'J' } },
      { type: 'character', data: { char: '大', meaning: 'big', meaningZh: '大', code: 'K' } },
      { type: 'character', data: { char: '中', meaning: 'middle', meaningZh: '中間', code: 'L' } },
      { type: 'character', data: { char: '一', meaning: 'one', meaningZh: '一', code: 'M' } },
      { type: 'character', data: { char: '弓', meaning: 'bow', meaningZh: '弓箭', code: 'N' } },
      { type: 'character', data: { char: '旦', meaning: 'dawn', meaningZh: '黎明', code: 'AM' } },
      { type: 'character', data: { char: '本', meaning: 'root/origin', meaningZh: '根本', code: 'DM' } },
      { type: 'character', data: { char: '末', meaning: 'end/tip', meaningZh: '末端', code: 'DJ' } },
      { type: 'sentence', data: { text: '一日', meaning: 'One day' } },
      { type: 'sentence', data: { text: '十大', meaning: 'Ten Big' } },
      { type: 'sentence', data: { text: '大火', meaning: 'Big Fire' } }
    ]
  },
  {
    id: 'roots-body',
    title: 'The Body',
    titleZh: '人體部首',
    description: 'Parts of the human body and actions.',
    descriptionZh: '人體部位與動作。',
    exercises: [
      { type: 'character', data: { char: '人', meaning: 'person', meaningZh: '人', code: 'O' } },
      { type: 'character', data: { char: '心', meaning: 'heart', meaningZh: '心臟', code: 'P' } },
      { type: 'character', data: { char: '手', meaning: 'hand', meaningZh: '手', code: 'Q' } },
      { type: 'character', data: { char: '口', meaning: 'mouth', meaningZh: '嘴巴', code: 'R' } },
      { type: 'character', data: { char: '从', meaning: 'follow', meaningZh: '跟從', code: 'OO' } },
      { type: 'character', data: { char: '品', meaning: 'goods/grade', meaningZh: '物品', code: 'RRR' } },
      { type: 'character', data: { char: '休', meaning: 'rest', meaningZh: '休息', code: 'OD' } },
      { type: 'character', data: { char: '什', meaning: 'ten/mixed', meaningZh: '什錦', code: 'OJ' } },
      { type: 'sentence', data: { text: '人口', meaning: 'Population' } },
      { type: 'sentence', data: { text: '人心', meaning: 'Human Heart' } },
      { type: 'sentence', data: { text: '手工', meaning: 'Handwork' } }
    ]
  },
  {
    id: 'roots-shapes',
    title: 'The Shapes',
    titleZh: '形狀部首',
    description: 'Abstract shapes and nature.',
    descriptionZh: '抽象形狀與自然。',
    exercises: [
      { type: 'character', data: { char: '尸', meaning: 'corpse/body', meaningZh: '尸體', code: 'S' } },
      { type: 'character', data: { char: '廿', meaning: 'twenty', meaningZh: '二十', code: 'T' } },
      { type: 'character', data: { char: '山', meaning: 'mountain', meaningZh: '山', code: 'U' } },
      { type: 'character', data: { char: '女', meaning: 'woman', meaningZh: '女人', code: 'V' } },
      { type: 'character', data: { char: '田', meaning: 'field', meaningZh: '田地', code: 'W' } },
      { type: 'character', data: { char: '出', meaning: 'go out', meaningZh: '出去', code: 'UU' } },
      { type: 'character', data: { char: '困', meaning: 'trapped', meaningZh: '困住', code: 'WD' } },
      { type: 'character', data: { char: '回', meaning: 'return', meaningZh: '回來', code: 'WR' } },
      { type: 'character', data: { char: '因', meaning: 'cause', meaningZh: '原因', code: 'WK' } },
      { type: 'sentence', data: { text: '出口', meaning: 'Exit' } },
      { type: 'sentence', data: { text: '山水', meaning: 'Landscape' } },
      { type: 'sentence', data: { text: '女人', meaning: 'Woman' } }
    ]
  },
  {
    id: 'roots-special',
    title: 'Special Roots',
    titleZh: '特殊部首',
    description: 'The final, more abstract roots.',
    descriptionZh: '最後的抽象部首。',
    exercises: [
      { type: 'character', data: { char: '卜', meaning: 'divination', meaningZh: '占卜', code: 'Y' } },
      { type: 'character', data: { char: '难', meaning: 'difficult', meaningZh: '困難', code: 'X' } }, // Key X
      { type: 'character', data: { char: '重', meaning: 'heavy', meaningZh: '重要', code: 'Z' } }, // Key Z
      { type: 'character', data: { char: '卜', meaning: 'divination', meaningZh: '占卜', code: 'Y' } }, // Drill Y
      { type: 'sentence', data: { text: '卜口', meaning: 'Divination Mouth (Nonsense)' } }
    ]
  },
  {
    id: 'rule-lr',
    title: 'Rule: Left | Right',
    titleZh: '法則：左右分體',
    description: 'Characters split clearly into left and right parts.',
    descriptionZh: '左右結構分明的字。',
    exercises: [
      { type: 'character', data: { char: '明', meaning: 'bright', meaningZh: '明亮', code: 'AB' } },
      { type: 'character', data: { char: '林', meaning: 'forest', meaningZh: '森林', code: 'DD' } },
      { type: 'character', data: { char: '休', meaning: 'rest', meaningZh: '休息', code: 'OD' } },
      { type: 'character', data: { char: '什', meaning: 'ten', meaningZh: '什', code: 'OJ' } },
      { type: 'character', data: { char: '好', meaning: 'good', meaningZh: '好', code: 'VO' } },
      { type: 'sentence', data: { text: '明林', meaning: 'Bright Forest' } },
      { type: 'sentence', data: { text: '好人', meaning: 'Good Person' } }
    ]
  },
  {
    id: 'rule-tb',
    title: 'Rule: Top / Bottom',
    titleZh: '法則：上下分體',
    description: 'Characters stacked vertically.',
    descriptionZh: '上下堆疊的字。',
    exercises: [
      { type: 'character', data: { char: '旦', meaning: 'dawn', meaningZh: '黎明', code: 'AM' } },
      { type: 'character', data: { char: '杳', meaning: 'obscure', meaningZh: '杳渺', code: 'DA' } },
      { type: 'character', data: { char: '呆', meaning: 'dull', meaningZh: '發呆', code: 'RD' } },
      { type: 'character', data: { char: '杏', meaning: 'apricot', meaningZh: '杏仁', code: 'DR' } },
      { type: 'character', data: { char: '炎', meaning: 'flame', meaningZh: '炎熱', code: 'FF' } },
      { type: 'sentence', data: { text: '杏林', meaning: 'Apricot Forest' } }
    ]
  },
  {
    id: 'rule-enclosure',
    title: 'Rule: Enclosure',
    titleZh: '法則：外內結構',
    description: 'Type the outside shape first, then the inside.',
    descriptionZh: '先打外框，再打裡面。',
    exercises: [
      { type: 'character', data: { char: '田', meaning: 'field', meaningZh: '田地', code: 'W' } },
      { type: 'character', data: { char: '困', meaning: 'trapped', meaningZh: '困住', code: 'WD' } },
      { type: 'character', data: { char: '回', meaning: 'return', meaningZh: '回來', code: 'WR' } },
      { type: 'character', data: { char: '因', meaning: 'cause', meaningZh: '原因', code: 'WK' } },
      { type: 'sentence', data: { text: '困人', meaning: 'Trapped Person' } },
      { type: 'sentence', data: { text: '回国', meaning: 'Return to Country (Simplified)', code: 'WRWIM' } } 
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
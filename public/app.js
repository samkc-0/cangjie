import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom/client";
import { v4 as uuidv4 } from 'uuid';

const CANGJIE_COMPONENTS = {
  A: { glyph: "日", name: "sun" },
  B: { glyph: "月", name: "moon" },
  C: { glyph: "金", name: "metal" },
  D: { glyph: "木", name: "wood" },
  E: { glyph: "水", name: "water" },
  F: { glyph: "火", name: "fire" },
  G: { glyph: "土", name: "earth" },
  H: { glyph: "竹", name: "bamboo" },
  I: { glyph: "戈", name: "spear" },
  J: { glyph: "十", name: "ten/cross" },
  K: { glyph: "大", name: "big" },
  L: { glyph: "中", name: "middle" },
  M: { glyph: "一", name: "one" },
  N: { glyph: "弓", name: "bow" },
  O: { glyph: "人", name: "person" },
  P: { glyph: "心", name: "heart" },
  Q: { glyph: "手", name: "hand" },
  R: { glyph: "口", name: "mouth" },
  S: { glyph: "尸", name: "corpse" },
  T: { glyph: "廿", name: "twenty" },
  U: { glyph: "山", name: "mountain" },
  V: { glyph: "女", name: "woman" },
  W: { glyph: "田", name: "field" },
  X: { glyph: "難", name: "difficulty" },
  Y: { glyph: "卜", name: "divination" },
  Z: { glyph: "重", name: "heavy" },
};

const getDefaultProfileProgress = () => ({
  currentGlobalIndex: 0,
  knownCharacters: [],
  characterMastery: {}, // { [char]: { firstLearned, nextReview, level } }
  attempts: [],
  summary: {
    totalSessions: 0,
    streak: 0,
    longestStreak: 0,
    lessonCompletions: {}
  }
});

const getDefaultProfile = (name = 'Default Profile', progress = getDefaultProfileProgress()) => ({
  id: uuidv4(),
  name,
  progress
});

const PROFILES_STORAGE_KEY = 'cangjie_profiles_data';
const OLD_PROGRESS_STORAGE_KEY = 'progress'; // Key for old single-user progress in localStorage

const readProfilesData = () => {
  let profilesData = {
    profiles: [],
    lastActiveProfileId: null
  };

  // Attempt to migrate old single-user progress from localStorage
  const oldProgressRaw = localStorage.getItem(OLD_PROGRESS_STORAGE_KEY);
  if (oldProgressRaw) {
    try {
      const oldProgress = JSON.parse(oldProgressRaw);
      if (oldProgress.attempts && oldProgress.summary) {
        const migratedProgress = {
          ...getDefaultProfileProgress(),
          ...oldProgress
        };
        const migratedProfile = getDefaultProfile('Migrated Profile', migratedProgress);
        profilesData.profiles.push(migratedProfile);
        profilesData.lastActiveProfileId = migratedProfile.id;
        localStorage.removeItem(OLD_PROGRESS_STORAGE_KEY); // Clean up old data
        console.log('Migrated old progress from localStorage to new profiles structure.');
      }
    } catch (err) {
      console.warn('Failed to migrate old progress from localStorage:', err.message);
    }
  }

  // Load new profiles data
  const storedDataRaw = localStorage.getItem(PROFILES_STORAGE_KEY);
  if (storedDataRaw) {
    try {
      profilesData = JSON.parse(storedDataRaw);
    } catch (err) {
      console.error('Failed to parse profiles data from localStorage, reinitializing...', err);
      // Fallback to default if parsing fails
      profilesData = {
        profiles: [],
        lastActiveProfileId: null
      };
    }
  }

  // If no profiles after migration/load, create a fresh default one
  if (profilesData.profiles.length === 0) {
    const defaultProfile = getDefaultProfile();
    profilesData.profiles.push(defaultProfile);
    profilesData.lastActiveProfileId = defaultProfile.id;
  }

  return profilesData;
};

const writeProfilesData = (data) => {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write profiles data to localStorage:', err);
  }
};

const SRS_INTERVALS = [
  0,               // Level 0 (not learned)
  4 * 60 * 60 * 1000,       // Level 1: 4 hours
  24 * 60 * 60 * 1000,      // Level 2: 24 hours
  3 * 24 * 60 * 60 * 1000,  // Level 3: 3 days
  7 * 24 * 60 * 60 * 1000,  // Level 4: 7 days
  30 * 24 * 60 * 60 * 1000, // Level 5: 30 days
];

const findProfileById = (profilesData, profileId) => {
  return profilesData.profiles.find(p => p.id === profileId);
};

const formatPercent = (value) => `${Math.round((value ?? 0) * 100)}%`;
const formatNumber = (value) => (value ? value.toFixed(1) : "0.0");
const decomposeCode = (code = "") =>
  code
    .toUpperCase()
    .split("")
    .filter(Boolean)
    .map((letter) => ({
      letter,
      glyph: CANGJIE_COMPONENTS[letter]?.glyph ?? "?",
      name: CANGJIE_COMPONENTS[letter]?.name ?? "Unknown component",
    }));

const Icons = {
  Target: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    </svg>
  ),
  Check: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 12l5 5l10 -10" />
    </svg>
  ),
  X: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </svg>
  ),
  User: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      strokeWidth="1.25"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"></path>
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path>
    </svg>
  ),
  Settings: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      strokeWidth="1.25"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c.996 .608 2.296 .133 2.572 -1.065z"></path>
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"></path>
    </svg>
  ),
  Home: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      strokeWidth="1.25"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M5 12l-2 0l9 -9l9 9l-2 0"></path>
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"></path>
      <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"></path>
    </svg>
  ),
  Book: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="icon icon-tabler icon-tabler-book-2"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M19 4v16h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12z"></path>
      <path d="M19 16h-12a2 2 0 0 0 -2 2"></path>
      <path d="M12 4v16"></path>
    </svg>
  ),
  Menu: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 6l16 0" />
      <path d="M4 12l16 0" />
      <path d="M4 18l16 0" />
    </svg>
  ),
  Clock: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  Plus: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </svg>
  ),
};

const LOCALES = {
  en: {
    title: "Cangjie Typing Tutor",
    tagline:
      "Practice Cangjie input, track streaks, and build reliable muscle memory.",
    lessonsHeading: "Lessons",
    progressHeading: "Progress",
    drillHeading: "Drill Session",
    drillInstruction:
      "Type the matching character to advance through the sequence.",
    enterCodeLabel: "Enter the character:",
    sentencePrompt: "Forge the phrase one glyph at a time.",
    sentenceProgressLabel: "Glyph",
    sentenceInputLabel: "Commit the glyph",
    sentenceInputPlaceholder: "Cangjie code or character",
    sentenceHintLabel: "Hint",
    sentenceCorrect: "Glyph locked. Keep going.",
    sentenceIncorrect: "Not quite. Try again.",
    sentenceHintReady: "Hint unlocked.",
    sentenceLoading: "Looking up Cangjie…",
    sentenceNoData: "No data yet.",
    sentenceComplete: "✓",
    sentenceCompleteSub: "Phrase completed.",
    submit: "Submit",
    saving: "Saving…",
    loadingTitle: "Loading tutor…",
    loadingSubtitle: "Preparing lessons and progress.",
    errorTitle: "Unable to load data",
    errorSubtitle: "Please refresh and try again.",
    noLessonSelected: "Select a lesson to begin.",
    totalSessions: "Total Sessions",
    streak: "Streak",
    bestStreak: "Best Streak",
    bestAccuracy: "Best Accuracy",
    recentSessions: "Recent Sessions",
    historyAccuracy: "Accuracy",
    historySpeed: "Speed",
    historySpeedUnit: "chars/min",
    historyEmpty: "Complete a lesson to see history.",
    lessonNotStarted: "Not started",
    lessonCompleted: "Completed",
    lessonProgress: (count, accuracy) =>
      `${count} completions · best ${formatPercent(accuracy)}`,
    feedbackCorrect: "Correct! Keep going.",
    feedbackExpected: "Expected",
    feedbackSessionSaved: "Great job! Session saved.",
    feedbackSessionFailed: "Could not save progress. Try again.",
    languageEnglish: "EN",
    languageChinese: "中文",
    languageToggleLabel: "Language toggle",
    openDrawer: "Open lessons and progress panel",
    closeDrawer: "Close panel",
    settingsHeading: "Settings",
    reviewsDue: "Reviews Due",
    newToday: "New Today",
    totalKnown: "Total Known",
  },
  zh: {
    title: "倉頡打字教練",
    tagline: "練習倉頡輸入，追蹤連勝並建立穩定肌肉記憶。",
    lessonsHeading: "課程",
    progressHeading: "進度",
    drillHeading: "練習區",
    drillInstruction: "輸入對應的漢字以推進。",
    enterCodeLabel: "輸入漢字：",
    sentencePrompt: "逐字鍛造整句。",
    sentenceProgressLabel: "字",
    sentenceInputLabel: "鎖定此字",
    sentenceInputPlaceholder: "倉頡碼或漢字",
    sentenceHintLabel: "提示",
    sentenceCorrect: "已鎖定，繼續。",
    sentenceIncorrect: "再試一次。",
    sentenceHintReady: "提示已開啟。",
    sentenceLoading: "查詢倉頡中…",
    sentenceNoData: "暫無資料。",
    sentenceComplete: "✓",
    sentenceCompleteSub: "完成整句。",
    submit: "送出",
    saving: "儲存中…",
    loadingTitle: "載入中…",
    loadingSubtitle: "正在準備課程與進度資料。",
    errorTitle: "無法取得資料",
    errorSubtitle: "請重新整理後再試一次。",
    noLessonSelected: "請先選擇課程。",
    totalSessions: "總練習",
    streak: "連勝",
    bestStreak: "最佳連勝",
    bestAccuracy: "最佳正確率",
    recentSessions: "最近紀錄",
    historyAccuracy: "正確率",
    historySpeed: "速度",
    historySpeedUnit: "字/分",
    historyEmpty: "完成一堂課即可看到歷史紀錄。",
    lessonNotStarted: "尚未開始",
    lessonCompleted: "已完成",
    lessonProgress: (count, accuracy) =>
      `完成 ${count} 次 · 最佳 ${formatPercent(accuracy)}`,
    feedbackCorrect: "答對了，繼續！",
    feedbackExpected: "應輸入",
    feedbackSessionSaved: "本次紀錄已儲存。",
    feedbackSessionFailed: "無法儲存進度，請再試一次。",
    languageEnglish: "EN",
    languageChinese: "中文",
    languageToggleLabel: "語言切換",
    openDrawer: "打開課程和進度面板",
    closeDrawer: "關閉面板",
    settingsHeading: "設定",
    reviewsDue: "待複習",
    newToday: "今日新字",
    totalKnown: "總掌握字數",
  },
};

function LanguageToggle({ locale, onChange, labels }) {
  const isChecked = locale === "zh";
  const handleToggle = () => onChange(isChecked ? "en" : "zh");

  return (
    <div className="toggle-switch">
      <label className="switch-label" aria-label={labels.toggleLabel}>
        <input
          type="checkbox"
          className="checkbox"
          checked={isChecked}
          onChange={handleToggle}
        />
        <span className="slider"></span>
      </label>
    </div>
  );
}

const unihanCache = {
  get: (char) => {
    try {
      const cached = localStorage.getItem(`unihan_${char}`);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      // Cache is valid for 24 hours
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`unihan_${char}`);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },
  set: (char, data) => {
    try {
      const item = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(`unihan_${char}`, JSON.stringify(item));
    } catch (e) {
      // Could be quota exceeded
      console.warn("Could not write to unihan cache", e);
    }
  },
};

function useUnihanData(char) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!char) return;

    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const cachedData = unihanCache.get(char);
      if (cachedData) {
        if (isMounted) {
          setData(cachedData);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/unihan/${encodeURIComponent(char)}`);
        if (!response.ok) {
          throw new Error("Failed to fetch Unihan data");
        }
        const unihanData = await response.json();
        unihanCache.set(char, unihanData);
        if (isMounted) {
          setData(unihanData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [char]);

  return { data, loading, error };
}

function CharacterTooltip({ character }) {
  if (!character) return null;

  return (
    <span className="char cangjie-char">
      {character.char}
    </span>
  );
}

function CharacterDetailView({ character }) {
  const { data: unihanInfo, loading: unihanLoading } = useUnihanData(
    character ? character.char : null,
  );

  return (
    <div className="character-detail-view">
      <span className="tooltip-heading">{character.char}</span>
      <div className="tooltip-body">
        {unihanLoading ? (
          <div className="loading-spinner"></div>
        ) : unihanInfo && Object.keys(unihanInfo).length > 0 ? (
          <>
            <div className="tooltip-row">
              <span className="label">Pinyin</span>
              <span className="value">{unihanInfo.kMandarin}</span>
            </div>
            <div className="tooltip-row">
              <span className="label">Cangjie</span>
              <span className="value">
                <span className="cangjie-code-letters">
                  {unihanInfo.kCangjie.split("").map((letter, index) => (
                    <kbd key={index} className="keycap">
                      {letter}
                    </kbd>
                  ))}
                </span>
                <span className="cangjie-code-components">
                  ({unihanInfo.kCangjieComponents})
                </span>
              </span>
            </div>
            <div className="tooltip-definition">{unihanInfo.kDefinition}</div>
          </>
        ) : (
          <div className="muted">Additional data not available.</div>
        )}
      </div>
    </div>
  );
}

function SingleCharDrill({
  exercise,
  input,
  setInput,
  isSubmitting,
  inputRef,
  isDetailViewActive,
  setDetailViewActive,
  onPeek,
  handleSubmit,
  strings,
  feedback,
  feedbackMessage,
  currentExerciseIndex,
  totalExercises,
}) {
  const character = exercise.data;
  const currentMeaning = character ? character.meaning : ""; 

  return (
    <div 
      className="drill-container"
      onMouseEnter={onPeek}
      onMouseLeave={() => setDetailViewActive(false)}
    >
      <div className={`drill-input-group ${isDetailViewActive ? 'hinted' : ''}`}>
        {isDetailViewActive && (
          <div className="drill-hint-overlay">
             <CharacterDetailView character={character} />
          </div>
        )}
        <div className="drill-input-content">
          <div className="character-display">
            <CharacterTooltip character={character} />
            <span className="meta" style={{ display: "none" }}>
              {currentMeaning} · {currentExerciseIndex + 1}/{totalExercises}
            </span>
          </div>
          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: "none",
                position: "fixed",
                top: -100,
                left: -100,
              }}
              htmlFor="cangjie-input"
            >
              {strings.enterCodeLabel} :j
            </label>
            <input
              id="cangjie-input"
              type="text"
              ref={inputRef}
              autoFocus
              autoComplete="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isSubmitting}
            />
            <button type="submit" className="btn-seal" disabled={isSubmitting}>
              {isSubmitting ? strings.saving : strings.submit}
            </button>
          </form>
        </div>
      </div>
      {feedback && feedbackMessage ? (
        <div className={`feedback ${feedback.type}`}>{feedbackMessage}</div>
      ) : null}
    </div>
  );
}

function SentenceDrill({
  exercise,
}) {
  const text = exercise.data.text;

  return (
    <div className="drill-container">
      <div className="sentence-forge">
        {text}
      </div>
    </div>
  );
}

function TutorApp() {
  const [lessons, setLessons] = useState([]);
  const [profilesData, setProfilesData] = useState(() => readProfilesData());
  // currentLessonId and currentExerciseIndex are removed, using global index from profile
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    incorrect: 0,
    startedAt: null,
  });
  const [locale, setLocale] = useState("en");
  const [activeView, setActiveView] = useState("drills");
  const [isDetailViewActive, setDetailViewActive] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState(null);
  const inputRef = useRef(null);

  // Derive active profile and its progress
  const activeProfile = useMemo(
    () => findProfileById(profilesData, profilesData.lastActiveProfileId),
    [profilesData]
  );
  
  const progress = useMemo(() => {
    if (!activeProfile) return null;
    return {
      ...activeProfile.progress,
      currentGlobalIndex: activeProfile.progress.currentGlobalIndex ?? 0,
      knownCharacters: activeProfile.progress.knownCharacters ?? []
    };
  }, [activeProfile]);

  // Flatten all exercises
  const allExercises = useMemo(() => {
    if (!lessons.length) return [];
    return lessons.flatMap(lesson => {
      const lessonExercises = lesson.exercises || lesson.characters?.map(c => ({ type: 'character', data: c })) || [];
      return lessonExercises.map(ex => ({
        ...ex,
        lessonId: lesson.id
      }));
    });
  }, [lessons]);

  // Save profilesData to localStorage whenever it changes
  useEffect(() => {
    writeProfilesData(profilesData);
  }, [profilesData]);

  // Auto-advance cursor to the first unknown exercise on load/profile switch
  useEffect(() => {
    if (!allExercises.length || !activeProfile) return;

    const known = activeProfile.progress.knownCharacters || [];
    const firstUnknownIndex = allExercises.findIndex(ex => {
      if (ex.type === 'character') {
        return !known.includes(ex.data.char);
      }
      return true; 
    });

    const targetIndex = firstUnknownIndex === -1 ? allExercises.length : firstUnknownIndex;

    // Only update if we are not already there.
    // This runs only on profile switch / lesson load (via activeProfile.id change), so it won't fight manual navigation.
    if (activeProfile.progress.currentGlobalIndex !== targetIndex) {
       setProfilesData(prev => {
          const newProfilesData = { ...prev };
          const p = newProfilesData.profiles.find(x => x.id === activeProfile.id);
          if (p) {
              p.progress.currentGlobalIndex = targetIndex;
          }
          return newProfilesData;
       });
    }
  }, [activeProfile?.id, allExercises]);

  const strings = LOCALES[locale];
  const languageLabels = {
    en: strings.languageEnglish,
    zh: strings.languageChinese,
    toggleLabel: strings.languageToggleLabel,
  };

  useEffect(() => {
    async function bootstrap() {
      try {
        const lessonRes = await fetch("/api/lessons");
        if (!lessonRes.ok) throw new Error("Unable to load lessons");

        const lessonPayload = await lessonRes.json();
        setLessons(lessonPayload.lessons);
        // No need to set currentLessonId anymore
      } catch (err) {
        console.error(err);
        setError("Failed to load tutor data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    setInput("");
    setFeedback(null);
    setStats({ correct: 0, incorrect: 0, startedAt: null });
  }, [progress?.currentGlobalIndex, activeProfile?.id]); // Reset when exercise advances or profile changes

  const currentExercise = allExercises[progress?.currentGlobalIndex] || null;
  const currentLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === currentExercise?.lessonId),
    [lessons, currentExercise]
  );
  
  // No longer need currentExercises or currentExerciseIndex derived state

  // Simple, Zen-like focus effect.
  // When the view is 'drills', and we are not loading, detailing, or submitting: Focus.
  useEffect(() => {
    if (
      activeView === 'drills' &&
      !loading &&
      !isDetailViewActive &&
      !isSubmitting &&
      inputRef.current
    ) {
      inputRef.current.focus();
    }
  }, [activeView, loading, isDetailViewActive, isSubmitting, currentExercise]);

  const getLessonTitle = (lesson) =>
    locale === "zh" ? (lesson?.titleZh ?? lesson?.title) : lesson?.title;
  const getLessonDescription = (lesson) =>
    locale === "zh"
      ? (lesson?.descriptionZh ?? lesson?.description)
      : lesson?.description;
  const getMeaning = (character) =>
    locale === "zh"
      ? (character?.meaningZh ?? character?.meaning)
      : character?.meaning;
  
  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const statsCalculated = useMemo(() => {
    const mastery = progress?.characterMastery || {};
    const values = Object.values(mastery);
    
    return {
      reviewsDue: values.filter(m => m.nextReview <= now).length,
      newToday: values.filter(m => new Date(m.firstLearned).setHours(0, 0, 0, 0) === todayStart).length,
      totalKnown: Object.keys(mastery).length
    };
  }, [progress?.characterMastery, now, todayStart]);

  const attempts = stats.correct + stats.incorrect;
  const accuracy = attempts ? stats.correct / attempts : 0;
  const formattedLessonProgress = (lessonId) => {
    const summary = progress?.summary?.lessonCompletions?.[lessonId];
    return summary && summary.count > 0 ? strings.lessonCompleted : strings.lessonNotStarted;
  };
  const formatHistoryStats = (attempt) =>
    `${strings.historyAccuracy} ${formatPercent(attempt.accuracy)} · ${strings.historySpeed} ${formatNumber(
      attempt.speed,
    )} ${strings.historySpeedUnit}`;
  const formatTimestamp = (value) => {
    try {
      return new Date(value).toLocaleString(
        locale === "zh" ? "zh-Hant" : undefined,
      );
    } catch (err) {
      return value;
    }
  };
  const feedbackMessage =
    feedback?.message || // Prefer explicit message
    (feedback && feedback.messageKey === "feedbackExpected" && feedback.expected
      ? `${strings.feedbackExpected} ${feedback.expected}`
      : feedback
        ? (strings[feedback.messageKey] ?? "")
        : null);

  function handleSubmit(event, overrideValue) {
    event.preventDefault();
    if (!currentExercise) return;

    if (currentExercise.type === 'character' || currentExercise.type === 'sentence') {
      const rawInput = typeof overrideValue === "string" ? overrideValue : input;
      const sanitized = (rawInput || "").trim();
      if (!sanitized) return;

      const targetText = currentExercise.type === 'character' ? currentExercise.data.char : currentExercise.data.text;
      const isCorrect = sanitized === targetText;
      console.log(`Submitted: "${sanitized}", Expected: "${targetText}", Correct: ${isCorrect}`);

      // Check for lesson completion before state update (since update is async)
      let feedbackMsg = null;
      let feedbackType = isCorrect ? "success" : "error";
      let expectedChar = isCorrect ? null : targetText;
      let msgKey = isCorrect ? "feedbackCorrect" : "feedbackExpected";

      if (isCorrect) {
        const nextIndex = (progress?.currentGlobalIndex || 0) + 1;
        const nextExercise = allExercises[nextIndex];
        
        // If next exercise is in a different lesson (or we finished all), and current was valid
        if (currentExercise && (!nextExercise || nextExercise.lessonId !== currentExercise.lessonId)) {
           const completedLesson = lessons.find(l => l.id === currentExercise.lessonId);
           const title = completedLesson ? (locale === 'zh' ? (completedLesson.titleZh ?? completedLesson.title) : completedLesson.title) : 'Unknown';
           feedbackMsg = `Finished lesson: ${title}`;
           // Override standard correct message
           msgKey = null; 
        }
      }

      setFeedback({
        type: feedbackType,
        messageKey: msgKey,
        message: feedbackMsg, // explicit message overrides key
        expected: expectedChar,
      });
      setInput("");

      if (isCorrect) {
        setProfilesData((prevProfilesData) => {
          const profileIndex = prevProfilesData.profiles.findIndex(
            (p) => p.id === prevProfilesData.lastActiveProfileId,
          );

          if (profileIndex === -1) return prevProfilesData;

          const oldProfile = prevProfilesData.profiles[profileIndex];
          const oldData = oldProfile.progress;
          const now = Date.now();
          
          // Mastery tracking
          const mastery = { ...(oldData.characterMastery || {}) };
          const charsToUpdate = currentExercise.type === 'sentence' 
              ? currentExercise.data.text.split('') 
              : [currentExercise.data.char];
          
          const known = new Set(oldData.knownCharacters || []);

          charsToUpdate.forEach(char => {
            const charState = mastery[char] || {
              firstLearned: now,
              level: 0,
              nextReview: now
            };

            const newLevel = Math.min(charState.level + 1, SRS_INTERVALS.length - 1);
            mastery[char] = {
              ...charState,
              level: newLevel,
              lastPracticed: now,
              nextReview: now + SRS_INTERVALS[newLevel]
            };
            known.add(char);
          });

          const lessonId = currentExercise.lessonId;
          const currentLessonCompletion = oldData.summary.lessonCompletions[lessonId] || {
            count: 0,
            bestAccuracy: 0,
            bestSpeed: 0
          };

          const newData = {
             ...oldData,
             currentGlobalIndex: (oldData.currentGlobalIndex || 0) + 1,
             knownCharacters: Array.from(known),
             characterMastery: mastery,
             summary: {
                 ...oldData.summary,
                 streak: (oldData.summary.streak || 0) + 1,
                 longestStreak: Math.max(oldData.summary.longestStreak || 0, (oldData.summary.streak || 0) + 1),
                 lessonCompletions: { 
                   ...oldData.summary.lessonCompletions,
                   [lessonId]: {
                     ...currentLessonCompletion,
                     count: currentLessonCompletion.count + 1
                   }
                 }
             }
          };

          const newProfiles = [...prevProfilesData.profiles];
          newProfiles[profileIndex] = { ...oldProfile, progress: newData };

          return { ...prevProfilesData, profiles: newProfiles };
        });

        // Reset local stats for the next exercise
        setStats({ correct: 0, incorrect: 0, startedAt: null });
      } else {
        // Reset streak on error - correctly immutable
        setProfilesData((prevProfilesData) => {
          const profileIndex = prevProfilesData.profiles.findIndex(
            (p) => p.id === prevProfilesData.lastActiveProfileId,
          );
          if (profileIndex === -1) return prevProfilesData;

          const oldProfile = prevProfilesData.profiles[profileIndex];
          const newProfiles = [...prevProfilesData.profiles];
          newProfiles[profileIndex] = {
            ...oldProfile,
            progress: {
              ...oldProfile.progress,
              summary: { ...oldProfile.progress.summary, streak: 0 }
            }
          };
          return { ...prevProfilesData, profiles: newProfiles };
        });
      }
    }
  }

  function handleLocaleChange(nextLocale) {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
  }

  function handlePeek() {
    setDetailViewActive(true);
    
    if (!currentExercise || currentExercise.type !== 'character') return;
    const char = currentExercise.data.char;

    setProfilesData((prevProfilesData) => {
      const profileIndex = prevProfilesData.profiles.findIndex(
        (p) => p.id === prevProfilesData.lastActiveProfileId,
      );

      if (profileIndex === -1) return prevProfilesData;

      const oldProfile = prevProfilesData.profiles[profileIndex];
      const oldData = oldProfile.progress;
      const mastery = { ...(oldData.characterMastery || {}) };
      
      // If we don't have mastery data yet, or it's already 0, nothing to reset that implies 'review' more than 'new'
      // But user asked to mark for review. 
      // If it exists, reset to 0 (which means 'new'/'forgot').
      
      if (mastery[char] && mastery[char].level > 0) {
         mastery[char] = {
           ...mastery[char],
           level: 0,
           nextReview: Date.now(),
         };
         
         const newData = {
             ...oldData,
             characterMastery: mastery,
         };
         const newProfiles = [...prevProfilesData.profiles];
         newProfiles[profileIndex] = { ...oldProfile, progress: newData };
         return { ...prevProfilesData, profiles: newProfiles };
      }
      
      return prevProfilesData;
    });
  }

  function handleLessonSelect(lessonId) {
    const startIndex = allExercises.findIndex(ex => ex.lessonId === lessonId);
    if (startIndex !== -1) {
      setProfilesData((prevProfilesData) => {
        const newProfilesData = { ...prevProfilesData };
        const profileToUpdate = newProfilesData.profiles.find(
          (p) => p.id === newProfilesData.lastActiveProfileId,
        );
        if (profileToUpdate) {
          profileToUpdate.progress.currentGlobalIndex = startIndex;
        }
        return newProfilesData;
      });
      setActiveView("drills");
    }
  }

  return (
    <div className="app-shell">
      <aside className="status-bar">
        {/* ... (sidebar menu remains same) ... */}
        <nav className="sidebar-menu">
          <button
            type="button"
            className={`sidebar-action ${activeView === 'drills' ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveView("drills")}
            aria-label="Home"
            tabIndex="-1"
          >
            <Icons.Home />
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'lessons' ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveView("lessons")}
            aria-label={strings.lessonsHeading}
            tabIndex="-1"
          >
            <Icons.Book />
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'profiles' ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveView("profiles")}
            aria-label="Profiles"
            tabIndex="-1"
          >
            <Icons.User />
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'settings' ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveView("settings")}
            aria-label="Settings"
            tabIndex="-1"
          >
            <Icons.Settings />
          </button>
          <LanguageToggle
            locale={locale}
            onChange={handleLocaleChange}
            labels={languageLabels}
          />
        </nav>

        <div className="status-group">
          <div className="status-item" title={strings.reviewsDue}>
            <span className="label">
              <Icons.Clock />
            </span>
            <span className="value">{statsCalculated.reviewsDue}</span>
          </div>
          <div className="status-item" title={strings.newToday}>
            <span className="label">
              <Icons.Plus />
            </span>
            <span className="value">{statsCalculated.newToday}</span>
          </div>
          <div className="status-item" title={strings.totalKnown}>
            <span className="label">
              <Icons.Book />
            </span>
            <span className="value">{statsCalculated.totalKnown}</span>
          </div>
        </div>
      </aside>

      {activeView === 'drills' && (
        <div className="drill-surface">
          <section className="drill-panel">
            <div className="drill-content">
              {loading ? (
                <div className="status-block">
                  <h2>{strings.loadingTitle}</h2>
                  <p>{strings.loadingSubtitle}</p>
                </div>
              ) : error ? (
                <div className="status-block error">
                  <h2>{strings.errorTitle}</h2>
                  <p>{strings.errorSubtitle}</p>
                  {typeof error === "string" ? (
                    <p className="muted">{error}</p>
                  ) : null}
                </div>
              ) : currentExercise ? (
                currentExercise.type === 'character' ? (
                  <SingleCharDrill
                    key={progress?.currentGlobalIndex}
                    exercise={currentExercise}
                    input={input}
                    setInput={setInput}
                    isSubmitting={isSubmitting}
                    inputRef={inputRef}
                    isDetailViewActive={isDetailViewActive}
                    setDetailViewActive={setDetailViewActive}
                    onPeek={handlePeek}
                    handleSubmit={handleSubmit}
                    strings={strings}
                    feedback={feedback}
                    feedbackMessage={feedbackMessage}
                    currentExerciseIndex={progress?.currentGlobalIndex || 0}
                    totalExercises={allExercises.length}
                  />
                ) : currentExercise.type === 'sentence' ? (
                  <SentenceDrill
                    key={progress?.currentGlobalIndex}
                    exercise={currentExercise}
                    input={input}
                    setInput={setInput}
                    isSubmitting={isSubmitting}
                    inputRef={inputRef}
                    isDetailViewActive={isDetailViewActive}
                    setDetailViewActive={setDetailViewActive}
                    onPeek={handlePeek}
                    handleSubmit={handleSubmit}
                    strings={strings}
                    feedback={feedback}
                    feedbackMessage={feedbackMessage}
                    currentExerciseIndex={progress?.currentGlobalIndex || 0}
                    totalExercises={allExercises.length}
                  />
                ) : (
                  <div className="status-block">
                    <h2>Unknown Drill Type</h2>
                    <p>This drill type is not supported yet.</p>
                  </div>
                )
              ) : (
                <div className="status-block">
                  <h2>All Exercises Completed!</h2>
                  <p>You have finished all available lessons.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeView === 'lessons' && (
        <aside
          className="lesson-gallery"
          aria-label={strings.lessonsHeading}
        >
          <div className="drawer-header">
            <h2>{strings.lessonsHeading}</h2>
          </div>
          <div className="lesson-grid">
            {lessons.map((lesson) => (
              (() => {
                const exercises = lesson.exercises || lesson.characters || [];
                const sentenceExercise = exercises.find(
                  (e) => e.type === 'sentence' || e.data?.text || e.text
                );
                const isSentenceLesson = Boolean(sentenceExercise);
                const cardText = isSentenceLesson
                  ? (sentenceExercise?.data?.text || sentenceExercise?.text || "")
                  : exercises
                    .filter(e => e.type === 'character' || e.char)
                    .map((e) => e.data ? e.data.char : e.char)
                    .join("");

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className={`lesson-card ${isSentenceLesson ? "sentence-card" : ""} ${lesson.id === currentLesson?.id ? "active" : ""}`}
                    onClick={() => handleLessonSelect(lesson.id)}
                  >
                    <div className="card-visual">
                      <div className="card-chars">
                        {cardText}
                      </div>
                    </div>
                <div className="card-info">
                  <div className="card-header">
                    <h3>{getLessonTitle(lesson)}</h3>
                  </div>
                  <div className="card-footer">
                    <p className="card-desc">{getLessonDescription(lesson)}</p>
                    <span className="card-stats">
                      {formattedLessonProgress(lesson.id)}
                    </span>
                  </div>
                </div>
                  </button>
                );
              })()
            ))}
          </div>
        </aside>
      )}

      {activeView === 'settings' && (
        <div className="drill-surface">
          <section className="drill-panel">
            <div className="drill-content">
              <h2>{strings.settingsHeading}</h2>
              <div className="status-block">
                <p className="muted">General settings will appear here.</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeView === 'profiles' && (
        <div className="drill-surface">
          <section className="drill-panel">
            <div className="drill-content">
              <h2>Profiles</h2>
              <div className="profile-list">
                {profilesData.profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`profile-item ${profile.id === activeProfile?.id ? 'active' : ''}`}
                    onClick={() => {
                      if (deletingProfileId !== profile.id) {
                        setProfilesData((prevProfilesData) => ({
                          ...prevProfilesData,
                          lastActiveProfileId: profile.id,
                        }));
                        // setActiveView('drills'); // Removed setActiveView('drills')
                      }
                    }}
                  >
                    <span>{profile.name}</span>
                    {profilesData.profiles.length > 1 && ( // Only allow deleting if more than one profile exists
                      <div className="profile-actions">
                        {deletingProfileId === profile.id ? (
                          <>
                            <button
                              className="btn-seal"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfilesData((prevProfilesData) => {
                                  const newProfiles = prevProfilesData.profiles.filter(
                                    (p) => p.id !== profile.id,
                                  );
                                  let newActiveProfileId = prevProfilesData.lastActiveProfileId;

                                  if (newActiveProfileId === profile.id) {
                                    newActiveProfileId = newProfiles[0]?.id || null;
                                    if (!newActiveProfileId) {
                                      const defaultProfile = getDefaultProfile();
                                      newProfiles.push(defaultProfile);
                                      newActiveProfileId = defaultProfile.id;
                                    }
                                  }

                                  return {
                                    profiles: newProfiles,
                                    lastActiveProfileId: newActiveProfileId,
                                  };
                                });
                                setDeletingProfileId(null);
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn-renaissance"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingProfileId(null);
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-seal"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingProfileId(profile.id);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="create-profile-section">
                {isCreatingProfile ? (
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const newProfileNameInput = document.getElementById('new-profile-name-inline');
                      const newProfileName = newProfileNameInput.value.trim();
                      if (newProfileName) {
                        setProfilesData((prevProfilesData) => {
                          const newProfile = getDefaultProfile(newProfileName);
                          return {
                            profiles: [...prevProfilesData.profiles, newProfile],
                            lastActiveProfileId: newProfile.id,
                          };
                        });
                        setIsCreatingProfile(false);
                      } else {
                        alert('Profile name cannot be empty.');
                      }
                    }}
                  >
                    <input
                      type="text"
                      placeholder="New Profile Name"
                      id="new-profile-name-inline"
                      autoFocus
                    />
                    <button type="submit" className="btn-renaissance">
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-seal"
                      onClick={() => setIsCreatingProfile(false)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    className="btn-renaissance"
                    onClick={() => setIsCreatingProfile(true)}
                  >
                    Create Profile
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="status-block error" style={{ margin: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>The application encountered an unexpected error.</p>
          <button 
            className="btn-renaissance" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem' }}
          >
            Refresh Page
          </button>
          {this.state.error && (
            <details style={{ marginTop: '1rem', textAlign: 'left', opacity: 0.7 }}>
              <summary>Error Details</summary>
              <pre style={{ overflow: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <TutorApp />
  </ErrorBoundary>
);

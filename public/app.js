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
        const migratedProfile = getDefaultProfile('Migrated Profile', oldProgress);
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
      class="icon icon-tabler icon-tabler-book-2"
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
    lessonNew: "New lesson",
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
  },
  zh: {
    title: "倉頡打字教練",
    tagline: "練習倉頡輸入，追蹤連勝並建立穩定肌肉記憶。",
    lessonsHeading: "課程",
    progressHeading: "進度",
    drillHeading: "練習區",
    drillInstruction: "輸入對應的漢字以推進。",
    enterCodeLabel: "輸入漢字：",
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
    lessonNew: "新課程",
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

function CharacterTooltip({ character, setDetailViewActive }) {
  if (!character) return null;

  return (
    <span
      className="char cangjie-char"
      tabIndex={0}
      onMouseEnter={() => setDetailViewActive(true)}
      onMouseLeave={() => setDetailViewActive(false)}
    >
      {character.char}
    </span>
  );
}

function CharacterDetailView({ character, setDetailViewActive }) {
  const { data: unihanInfo, loading: unihanLoading } = useUnihanData(
    character ? character.char : null,
  );

  return (
    <div
      className="character-detail-view"
      onMouseLeave={() => setDetailViewActive(false)}
    >
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

function TutorApp() {
  const [lessons, setLessons] = useState([]);
  const [profilesData, setProfilesData] = useState(() => readProfilesData());
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
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

  // Derive active profile and its progress
  const activeProfile = useMemo(
    () => findProfileById(profilesData, profilesData.lastActiveProfileId),
    [profilesData]
  );
  const progress = activeProfile?.progress;

  // Save profilesData to localStorage whenever it changes
  useEffect(() => {
    writeProfilesData(profilesData);
  }, [profilesData]);

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
        setCurrentLessonId(
          (current) => current ?? lessonPayload.lessons[0]?.id ?? null,
        );
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
    setCurrentIndex(0);
    setInput("");
    setFeedback(null);
    setStats({ correct: 0, incorrect: 0, startedAt: null });
  }, [currentLessonId, activeProfile]);

  const currentLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === currentLessonId),
    [lessons, currentLessonId],
  );
  const currentCharacter = currentLesson?.characters[currentIndex];
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
  const currentMeaning = currentCharacter
    ? (getMeaning(currentCharacter) ?? "")
    : "";
  const lessonSummary = progress?.summary?.lessonCompletions?.[currentLessonId];

  const attempts = stats.correct + stats.incorrect;
  const accuracy = attempts ? stats.correct / attempts : 0;
  const formattedLessonProgress = (lessonId) => {
    const summary = progress?.summary?.lessonCompletions?.[lessonId];
    if (!summary) return strings.lessonNew;
    return strings.lessonProgress(summary.count, summary.bestAccuracy);
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
    feedback && feedback.messageKey === "feedbackExpected" && feedback.expected
      ? `${strings.feedbackExpected} ${feedback.expected}`
      : feedback
        ? (strings[feedback.messageKey] ?? "")
        : null;

  async function finalizeLesson(finalStats) {
    if (!currentLesson || !activeProfile) return;
    const totalEntries = finalStats.correct + finalStats.incorrect;
    if (!totalEntries) return;

    const minutes = Math.max(
      (Date.now() - finalStats.startedAt) / 60000,
      1 / 60,
    );
    const payload = {
      lessonId: currentLesson.id,
      accuracy: finalStats.correct / totalEntries,
      speed: Number(finalStats.correct / minutes).toFixed(2),
      attempts: totalEntries,
      completedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      setProfilesData((prevProfilesData) => {
        const newProfilesData = { ...prevProfilesData };
        const profileToUpdate = newProfilesData.profiles.find(
          (p) => p.id === newProfilesData.lastActiveProfileId,
        );

        if (profileToUpdate) {
          const data = profileToUpdate.progress;

          const record = {
            lessonId: payload.lessonId,
            accuracy: Number(payload.accuracy),
            speed: Number(payload.speed),
            attempts: payload.attempts,
            completedAt: payload.completedAt,
          };

          data.attempts.unshift(record);
          data.attempts = data.attempts.slice(0, 25);
          data.summary.totalSessions += 1;

          if (!data.summary.lessonCompletions[lessonId]) {
            data.summary.lessonCompletions[lessonId] = {
              count: 0,
              bestAccuracy: 0,
              bestSpeed: 0,
            };
          }

          data.summary.lessonCompletions[lessonId].count += 1;
          data.summary.lessonCompletions[lessonId].bestAccuracy = Math.max(
            data.summary.lessonCompletions[lessonId].bestAccuracy,
            record.accuracy,
          );
          data.summary.lessonCompletions[lessonId].bestSpeed = Math.max(
            data.summary.lessonCompletions[lessonId].bestSpeed,
            record.speed,
          );

          const PASSING_ACCURACY = 0.85; // Define or import this constant
          if (record.accuracy >= PASSING_ACCURACY) {
            data.summary.streak += 1;
            data.summary.longestStreak = Math.max(
              data.summary.longestStreak,
              data.summary.streak,
            );
          } else {
            data.summary.streak = 0;
          }
        }
        return newProfilesData;
      });
      setFeedback({ type: "success", messageKey: "feedbackSessionSaved" });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", messageKey: "feedbackSessionFailed" });
    } finally {
      setIsSubmitting(false);
      setCurrentIndex(0);
      setInput("");
      setStats({ correct: 0, incorrect: 0, startedAt: null });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!currentCharacter) return;
    const sanitized = input.trim();
    if (!sanitized) return;

    const startedAt = stats.startedAt ?? Date.now();
    const isCorrect = sanitized === currentCharacter.char;
    const nextCorrect = stats.correct + (isCorrect ? 1 : 0);
    const nextIncorrect = stats.incorrect + (isCorrect ? 0 : 1);
    const nextIndex = isCorrect ? currentIndex + 1 : currentIndex;

    setStats({ correct: nextCorrect, incorrect: nextIncorrect, startedAt });
    setFeedback({
      type: isCorrect ? "success" : "error",
      messageKey: isCorrect ? "feedbackCorrect" : "feedbackExpected",
      expected: isCorrect ? null : currentCharacter.char,
    });
    setInput("");

    if (isCorrect) {
      if (nextIndex >= currentLesson.characters.length) {
        finalizeLesson({
          correct: nextCorrect,
          incorrect: nextIncorrect,
          startedAt,
        });
      } else {
        setCurrentIndex(nextIndex);
      }
    }
  }

  function handleLocaleChange(nextLocale) {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
  }

  function handleLessonSelect(lessonId) {
    setCurrentLessonId(lessonId);
    setActiveView("drills");
  }

  return (
    <div className="app-shell">
      <aside className="status-bar">
        <nav className="sidebar-menu">
          <button
            type="button"
            className={`sidebar-action ${activeView === 'drills' ? 'active' : ''}`}
            onClick={() => setActiveView("drills")}
            aria-label="Home"
          >
            <Icons.Home />
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'lessons' ? 'active' : ''}`}
            onClick={() => setActiveView("lessons")}
            aria-label={strings.lessonsHeading}
          >
            <Icons.Book />
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'profiles' ? 'active' : ''}`}
            onClick={() => setActiveView("profiles")}
            aria-label="Profiles"
          >
            <Icons.User />
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView("settings")}
            aria-label="Settings"
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
          <div className="status-item">
            <span className="label">
              <Icons.Target />
            </span>
            <span className="value">{formatPercent(accuracy || 0)}</span>
          </div>
          <div className="status-item">
            <span className="label">
              <Icons.Check />
            </span>
            <span className="value">{stats.correct}</span>
          </div>
          <div className="status-item">
            <span className="label">
              <Icons.X />
            </span>
            <span className="value">{stats.incorrect}</span>
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
              ) : currentLesson && currentCharacter ? (
                isDetailViewActive ? (
                  <CharacterDetailView
                    character={currentCharacter}
                    setDetailViewActive={setDetailViewActive}
                  />
                ) : (
                  <>
                    <div className="drill-input-group">
                      <div className="character-display">
                        <CharacterTooltip
                          character={currentCharacter}
                          setDetailViewActive={setDetailViewActive}
                        />
                        <span className="meta" style={{ display: "none" }}>
                          {currentMeaning} · {currentIndex + 1}/
                          {currentLesson.characters.length}
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
                          autoComplete="off"
                          value={input}
                          onChange={(event) => setInput(event.target.value)}
                          disabled={isSubmitting}
                        />
                        <button
                          type="submit"
                          className="btn-seal"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? strings.saving : strings.submit}
                        </button>
                      </form>
                    </div>
                    {feedback && feedbackMessage ? (
                      <div className={`feedback ${feedback.type}`}>
                        {feedbackMessage}
                      </div>
                    ) : null}
                  </>
                )
              ) : (
                <div className="status-block">
                  <h2>{strings.noLessonSelected}</h2>
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
              <button
                key={lesson.id}
                type="button"
                className={`lesson-card ${lesson.id === currentLessonId ? "active" : ""}`}
                onClick={() => handleLessonSelect(lesson.id)}
              >
                <div className="card-visual">
                  <div className="card-chars">
                    {lesson.characters.map((c) => c.char).join("")}
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
            ))}
          </div>
        </aside>
      )}

      {activeView === 'settings' && (
        <div className="drill-surface">
          <section className="drill-panel">
            <div className="drill-content">
              <div className="status-block">
                <h2>Settings</h2>
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
                      setProfilesData((prevProfilesData) => ({
                        ...prevProfilesData,
                        lastActiveProfileId: profile.id,
                      }));
                      setActiveView('drills');
                    }}
                  >
                    <span>{profile.name}</span>
                    {profilesData.profiles.length > 1 && ( // Only allow deleting if more than one profile exists
                      <button
                        className="btn-seal"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the profile from being selected
                          if (window.confirm(`Are you sure you want to delete profile "${profile.name}"?`)) {
                            setProfilesData((prevProfilesData) => {
                              const newProfiles = prevProfilesData.profiles.filter(
                                (p) => p.id !== profile.id,
                              );
                              let newActiveProfileId = prevProfilesData.lastActiveProfileId;

                              if (newActiveProfileId === profile.id) {
                                newActiveProfileId = newProfiles[0]?.id || null;
                                // If no profiles left, create a default one
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
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="create-profile-section">
                <input
                  type="text"
                  placeholder="New Profile Name"
                  id="new-profile-name"
                />
                <button
                  className="btn-renaissance"
                  onClick={() => {
                    const newProfileNameInput = document.getElementById('new-profile-name');
                    const newProfileName = newProfileNameInput.value.trim();
                    if (newProfileName) {
                      setProfilesData((prevProfilesData) => {
                        const newProfile = getDefaultProfile(newProfileName);
                        return {
                          profiles: [...prevProfilesData.profiles, newProfile],
                          lastActiveProfileId: newProfile.id,
                        };
                      });
                      newProfileNameInput.value = ''; // Clear input
                      setActiveView('drills');
                    } else {
                      alert('Profile name cannot be empty.');
                    }
                  }}
                >
                  Create New Profile
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


ReactDOM.createRoot(document.getElementById("root")).render(<TutorApp />);

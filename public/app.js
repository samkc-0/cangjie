import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom/client";

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

const HELP_PANEL_ID = "help-panel";

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
    resetSession: "Reset session",
    loadingTitle: "Loading tutor…",
    loadingSubtitle: "Preparing lessons and progress.",
    errorTitle: "Unable to load data",
    errorSubtitle: "Please refresh and try again.",
    noLessonSelected: "Select a lesson to begin.",
    statsAccuracy: "Accuracy",
    statsCorrect: "Correct",
    statsIncorrect: "Incorrect",
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
    helpLabel: "Toggle help menu",
    openDrawer: "Lessons & progress",
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
    resetSession: "重新開始",
    loadingTitle: "載入中…",
    loadingSubtitle: "正在準備課程與進度資料。",
    errorTitle: "無法取得資料",
    errorSubtitle: "請重新整理後再試一次。",
    noLessonSelected: "請先選擇課程。",
    statsAccuracy: "正確率",
    statsCorrect: "答對",
    statsIncorrect: "答錯",
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
    helpLabel: "顯示/隱藏說明",
    openDrawer: "課程與進度",
    closeDrawer: "關閉面板",
  },
};

function LanguageToggle({ locale, onChange, labels }) {
  return (
    <div
      className="language-toggle"
      role="group"
      aria-label={labels.toggleLabel}
    >
      {["en", "zh"].map((code) => (
        <button
          type="button"
          key={code}
          className={`language-button ${locale === code ? "active" : ""}`}
          onClick={() => onChange(code)}
          aria-pressed={locale === code}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}

function CharacterTooltip({ character, meaning }) {
  const decomposition = useMemo(
    () => decomposeCode(character?.code ?? ""),
    [character?.code],
  );
  const tooltipRef = useRef(null);
  const [offset, setOffset] = useState(0);
  if (!character) return null;

  const clampToViewport = useCallback(() => {
    if (!tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const padding = 12;
    let shift = 0;
    if (rect.left < padding) {
      shift = padding - rect.left;
    } else if (rect.right > viewportWidth - padding) {
      shift = viewportWidth - padding - rect.right;
    }
    setOffset(shift);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, [clampToViewport]);

  function handleInteraction() {
    requestAnimationFrame(clampToViewport);
  }

  const ariaDescription = decomposition.length
    ? `${character.char} ${meaning}. Cangjie code ${character.code}: ${decomposition
        .map((segment) => `${segment.letter} ${segment.glyph} ${segment.name}`)
        .join(", ")}`
    : `${character.char} ${meaning}`;

  return (
    <span
      className="char cangjie-char"
      tabIndex={0}
      aria-label={ariaDescription}
      onMouseEnter={handleInteraction}
      onFocus={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {character.char}
      {decomposition.length ? (
        <span
          className="cangjie-tooltip"
          role="tooltip"
          ref={tooltipRef}
          style={{ "--tooltip-shift": `${offset}px` }}
        >
          <span className="tooltip-heading">
            {character.char} · {meaning}
          </span>
          <span className="tooltip-code" aria-hidden="true">
            {decomposition.map((segment, index) => (
              <kbd key={`code-${segment.letter}-${index}`} className="keycap">
                {segment.letter}
              </kbd>
            ))}
          </span>
          <ul>
            {decomposition.map((segment, index) => (
              <li key={`${segment.letter}-${index}`}>
                <span className="component-glyph">{segment.glyph}</span>
                <kbd className="keycap component-key">{segment.letter}</kbd>
                <span className="component-name">{segment.name}</span>
              </li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}

function TutorApp() {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
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
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);

  const strings = LOCALES[locale];
  const languageLabels = {
    en: strings.languageEnglish,
    zh: strings.languageChinese,
    toggleLabel: strings.languageToggleLabel,
  };

  useEffect(() => {
    async function bootstrap() {
      try {
        const [lessonRes, progressRes] = await Promise.all([
          fetch("/api/lessons"),
          fetch("/api/progress"),
        ]);
        if (!lessonRes.ok) throw new Error("Unable to load lessons");
        if (!progressRes.ok) throw new Error("Unable to load progress");

        const lessonPayload = await lessonRes.json();
        const progressPayload = await progressRes.json();
        setLessons(lessonPayload.lessons);
        setProgress(progressPayload);
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
  }, [currentLessonId]);

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
    if (!currentLesson) return;
    const totalEntries = finalStats.correct + finalStats.incorrect;
    if (!totalEntries) return;

    const minutes = Math.max(
      (Date.now() - finalStats.startedAt) / 60000,
      1 / 60,
    );
    const payload = {
      lessonId: currentLesson.id,
      accuracy: finalStats.correct / totalEntries,
      speed: finalStats.correct / minutes,
      attempts: totalEntries,
      completedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Unable to save session.");
      }

      const updated = await response.json();
      setProgress(updated);
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

  function resetProgress() {
    setCurrentIndex(0);
    setInput("");
    setStats({ correct: 0, incorrect: 0, startedAt: null });
    setFeedback(null);
  }

  function handleLocaleChange(nextLocale) {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
  }

  function openDrawer() {
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function handleLessonSelect(lessonId) {
    setCurrentLessonId(lessonId);
    closeDrawer();
  }

  function toggleHelp() {
    setHelpOpen((current) => !current);
  }

  return (
    <div className="app-shell">
      <div className="drill-surface">
        <header className="top-bar">
          <button
            type="button"
            className="drawer-trigger btn-engraved"
            onClick={openDrawer}
          >
            {strings.openDrawer}
          </button>
          <button
            type="button"
            className={`help-trigger ${isHelpOpen ? "active" : ""}`}
            aria-label={strings.helpLabel}
            aria-controls={HELP_PANEL_ID}
            aria-expanded={isHelpOpen}
            onClick={toggleHelp}
          >
            ?
          </button>
        </header>
        {isHelpOpen && (
          <div className="help-panel" id={HELP_PANEL_ID}>
            <h1>{strings.title}</h1>
            <p>{strings.tagline}</p>
            <h2>{strings.drillHeading}</h2>
            <p>{strings.drillInstruction}</p>
          </div>
        )}
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
              <>
                <div className="character-display">
                  <CharacterTooltip
                    character={currentCharacter}
                    meaning={currentMeaning}
                  />
                  <span className="meta">
                    {currentMeaning} · {currentIndex + 1}/
                    {currentLesson.characters.length}
                  </span>
                </div>
                <form onSubmit={handleSubmit}>
                  <label htmlFor="cangjie-input">
                    {strings.enterCodeLabel}
                  </label>
                  <input
                    id="cangjie-input"
                    type="text"
                    autoComplete="off"
                    value={input}
                    onChange={(event) =>
                      setInput(event.target.value)
                    }
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
                {feedback && feedbackMessage ? (
                  <div className={`feedback ${feedback.type}`}>
                    {feedbackMessage}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="status-block">
                <h2>{strings.noLessonSelected}</h2>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="status-bar">
        <div className="status-item">
          <span className="label">{strings.statsAccuracy}</span>
          <span className="value">{formatPercent(accuracy || 0)}</span>
        </div>
        <div className="status-item">
          <span className="label">{strings.statsCorrect}</span>
          <span className="value">{stats.correct}</span>
        </div>
        <div className="status-item">
          <span className="label">{strings.statsIncorrect}</span>
          <span className="value">{stats.incorrect}</span>
        </div>
        <button
          type="button"
          className="status-reset"
          onClick={resetProgress}
          disabled={isSubmitting}
        >
          {strings.resetSession}
        </button>
      </footer>

      {isDrawerOpen && (
        <>
          <button
            type="button"
            className="drawer-overlay"
            onClick={closeDrawer}
            aria-label={strings.closeDrawer}
          ></button>
          <aside
            className="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={strings.openDrawer}
          >
            <div className="drawer-header">
              <h2>{strings.lessonsHeading}</h2>
              <button
                type="button"
                className="drawer-close"
                onClick={closeDrawer}
                aria-label={strings.closeDrawer}
              >
                ×
              </button>
            </div>
            {loading ? (
              <p className="muted">{strings.loadingSubtitle}</p>
            ) : (
              <div className="lesson-grid">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    className={`lesson-button btn-engraved ${lesson.id === currentLessonId ? "active" : ""}`}
                    onClick={() => handleLessonSelect(lesson.id)}
                  >
                    <div className="lesson-info">
                      <h3>{getLessonTitle(lesson)}</h3>
                      <p>{getLessonDescription(lesson)}</p>
                    </div>
                    <span className="lesson-progress">
                      {formattedLessonProgress(lesson.id)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="drawer-lang">
              <LanguageToggle
                locale={locale}
                onChange={handleLocaleChange}
                labels={languageLabels}
              />
            </div>
            <div className="drawer-section">
              <h2>{strings.progressHeading}</h2>
              <div className="stats-grid">
                <div className="stat">
                  <span className="label">{strings.totalSessions}</span>
                  <span className="value">
                    {progress?.summary?.totalSessions ?? 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="label">{strings.streak}</span>
                  <span className="value">
                    {progress?.summary?.streak ?? 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="label">{strings.bestStreak}</span>
                  <span className="value">
                    {progress?.summary?.longestStreak ?? 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="label">{strings.bestAccuracy}</span>
                  <span className="value">
                    {lessonSummary
                      ? formatPercent(lessonSummary.bestAccuracy)
                      : "—"}
                  </span>
                </div>
              </div>
              <h3>{strings.recentSessions}</h3>
              <div className="history-list">
                {progress?.attempts?.length ? (
                  progress.attempts.map((attempt, index) => (
                    <div
                      key={`${attempt.completedAt}-${index}`}
                      className="history-item"
                    >
                      <strong>
                        {getLessonTitle(
                          lessons.find((l) => l.id === attempt.lessonId),
                        ) ?? attempt.lessonId}
                      </strong>
                      <span>{formatHistoryStats(attempt)}</span>
                      <span>{formatTimestamp(attempt.completedAt)}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">{strings.historyEmpty}</p>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TutorApp />);

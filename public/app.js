const { useEffect, useMemo, useState } = React;

const CANGJIE_COMPONENTS = {
  A: { glyph: '日', name: 'sun' },
  B: { glyph: '月', name: 'moon' },
  C: { glyph: '金', name: 'metal' },
  D: { glyph: '木', name: 'wood' },
  E: { glyph: '水', name: 'water' },
  F: { glyph: '火', name: 'fire' },
  G: { glyph: '土', name: 'earth' },
  H: { glyph: '竹', name: 'bamboo' },
  I: { glyph: '戈', name: 'spear' },
  J: { glyph: '十', name: 'ten/cross' },
  K: { glyph: '大', name: 'big' },
  L: { glyph: '中', name: 'middle' },
  M: { glyph: '一', name: 'one' },
  N: { glyph: '弓', name: 'bow' },
  O: { glyph: '人', name: 'person' },
  P: { glyph: '心', name: 'heart' },
  Q: { glyph: '手', name: 'hand' },
  R: { glyph: '口', name: 'mouth' },
  S: { glyph: '尸', name: 'corpse' },
  T: { glyph: '廿', name: 'twenty' },
  U: { glyph: '山', name: 'mountain' },
  V: { glyph: '女', name: 'woman' },
  W: { glyph: '田', name: 'field' },
  X: { glyph: '難', name: 'difficulty' },
  Y: { glyph: '卜', name: 'divination' },
  Z: { glyph: '重', name: 'heavy' }
};

const formatPercent = (value) => `${Math.round((value ?? 0) * 100)}%`;
const formatNumber = (value) => (value ? value.toFixed(1) : '0.0');
const decomposeCode = (code = '') =>
  code
    .toUpperCase()
    .split('')
    .filter(Boolean)
    .map((letter) => ({
      letter,
      glyph: CANGJIE_COMPONENTS[letter]?.glyph ?? '?',
      name: CANGJIE_COMPONENTS[letter]?.name ?? 'Unknown component'
    }));

function CharacterTooltip({ character }) {
  const decomposition = useMemo(() => decomposeCode(character?.code ?? ''), [character?.code]);
  if (!character) return null;

  const ariaDescription = decomposition.length
    ? `${character.char} ${character.meaning}. Cangjie code ${character.code}: ${decomposition
        .map((segment) => `${segment.letter} ${segment.glyph} ${segment.name}`)
        .join(', ')}`
    : `${character.char} ${character.meaning}`;

  return (
    <span className="char cangjie-char" tabIndex={0} aria-label={ariaDescription}>
      {character.char}
      {decomposition.length ? (
        <span className="cangjie-tooltip" role="tooltip">
          <span className="tooltip-heading">
            {character.char} · {character.meaning}
          </span>
          <span className="tooltip-code">{character.code}</span>
          <ul>
            {decomposition.map((segment, index) => (
              <li key={`${segment.letter}-${index}`}>
                <span className="component-glyph">{segment.glyph}</span>
                <span className="component-name">
                  {segment.letter} · {segment.name}
                </span>
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
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, startedAt: null });

  useEffect(() => {
    async function bootstrap() {
      try {
        const [lessonRes, progressRes] = await Promise.all([fetch('/api/lessons'), fetch('/api/progress')]);
        if (!lessonRes.ok) throw new Error('Unable to load lessons');
        if (!progressRes.ok) throw new Error('Unable to load progress');

        const lessonPayload = await lessonRes.json();
        const progressPayload = await progressRes.json();
        setLessons(lessonPayload.lessons);
        setProgress(progressPayload);
        setCurrentLessonId((current) => current ?? lessonPayload.lessons[0]?.id ?? null);
      } catch (err) {
        console.error(err);
        setError('Failed to load tutor data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    setInput('');
    setFeedback(null);
    setStats({ correct: 0, incorrect: 0, startedAt: null });
  }, [currentLessonId]);

  const currentLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === currentLessonId),
    [lessons, currentLessonId]
  );
  const currentCharacter = currentLesson?.characters[currentIndex];

  const lessonSummary = progress?.summary?.lessonCompletions?.[currentLessonId];

  const attempts = stats.correct + stats.incorrect;
  const accuracy = attempts ? stats.correct / attempts : 0;

  async function finalizeLesson(finalStats) {
    if (!currentLesson) return;
    const totalEntries = finalStats.correct + finalStats.incorrect;
    if (!totalEntries) return;

    const minutes = Math.max((Date.now() - finalStats.startedAt) / 60000, 1 / 60);
    const payload = {
      lessonId: currentLesson.id,
      accuracy: finalStats.correct / totalEntries,
      speed: finalStats.correct / minutes,
      attempts: totalEntries,
      completedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Unable to save session.');
      }

      const updated = await response.json();
      setProgress(updated);
      setFeedback({ type: 'success', message: 'Great job! Session saved.' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Could not save progress. Try again.' });
    } finally {
      setIsSubmitting(false);
      setCurrentIndex(0);
      setInput('');
      setStats({ correct: 0, incorrect: 0, startedAt: null });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!currentCharacter) return;
    const sanitized = input.trim().toUpperCase();
    if (!sanitized) return;

    const startedAt = stats.startedAt ?? Date.now();
    const isCorrect = sanitized === currentCharacter.code;
    const nextCorrect = stats.correct + (isCorrect ? 1 : 0);
    const nextIncorrect = stats.incorrect + (isCorrect ? 0 : 1);
    const nextIndex = isCorrect ? currentIndex + 1 : currentIndex;

    setStats({ correct: nextCorrect, incorrect: nextIncorrect, startedAt });
    setFeedback({
      type: isCorrect ? 'success' : 'error',
      message: isCorrect ? 'Correct! Keep going.' : `Expected ${currentCharacter.code}`
    });
    setInput('');

    if (isCorrect) {
      if (nextIndex >= currentLesson.characters.length) {
        finalizeLesson({ correct: nextCorrect, incorrect: nextIncorrect, startedAt });
      } else {
        setCurrentIndex(nextIndex);
      }
    }
  }

  function resetProgress() {
    setCurrentIndex(0);
    setInput('');
    setStats({ correct: 0, incorrect: 0, startedAt: null });
    setFeedback(null);
  }

  if (loading) {
    return (
      <div className="app-shell">
        <header>
          <h1>Cangjie Typing Tutor</h1>
          <p>Loading lessons…</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell">
        <header>
          <h1>Cangjie Typing Tutor</h1>
        </header>
        <div className="feedback error">{error}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header>
        <h1>Cangjie Typing Tutor</h1>
        <p>Practice Cangjie input, track streaks, and build reliable muscle memory.</p>
      </header>

      <main>
        <section className="card">
          <h2>Lessons</h2>
          <div className="lesson-grid">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                className={`lesson-button btn-engraved ${lesson.id === currentLessonId ? 'active' : ''}`}
                onClick={() => setCurrentLessonId(lesson.id)}
              >
                <div className="lesson-info">
                  <h3>{lesson.title}</h3>
                  <p>{lesson.description}</p>
                </div>
                {progress?.summary?.lessonCompletions?.[lesson.id] ? (
                  <span className="lesson-progress">
                    {progress.summary.lessonCompletions[lesson.id].count} completions · best{' '}
                    {formatPercent(progress.summary.lessonCompletions[lesson.id].bestAccuracy)}
                  </span>
                ) : (
                  <span className="lesson-progress">New lesson</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Drill</h2>
          {currentCharacter ? (
            <>
              <div className="character-display">
                <CharacterTooltip character={currentCharacter} />
                <span className="meta">
                  {currentCharacter.meaning} · {currentIndex + 1}/{currentLesson.characters.length}
                </span>
              </div>
              <form onSubmit={handleSubmit}>
                <label htmlFor="cangjie-input">Enter the Cangjie code:</label>
                <input
                  id="cangjie-input"
                  type="text"
                  autoComplete="off"
                  maxLength="5"
                  value={input}
                  onChange={(event) => setInput(event.target.value.toUpperCase())}
                  disabled={isSubmitting}
                />
                <button type="submit" className="btn-seal" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Submit'}
                </button>
              </form>
              <div className="stats-grid">
                <div className="stat">
                  <span className="label">Accuracy</span>
                  <span className="value">{formatPercent(accuracy || 0)}</span>
                </div>
                <div className="stat">
                  <span className="label">Correct</span>
                  <span className="value">{stats.correct}</span>
                </div>
                <div className="stat">
                  <span className="label">Incorrect</span>
                  <span className="value">{stats.incorrect}</span>
                </div>
              </div>
            </>
          ) : (
            <p>No lesson selected.</p>
          )}
          {feedback && <div className={`feedback ${feedback.type}`}>{feedback.message}</div>}
          <button type="button" className="btn-renaissance" onClick={resetProgress} disabled={isSubmitting}>
            Reset session
          </button>
        </section>

        <section className="card">
          <h2>Progress</h2>
          <div className="stats-grid">
            <div className="stat">
              <span className="label">Total Sessions</span>
              <span className="value">{progress?.summary?.totalSessions ?? 0}</span>
            </div>
            <div className="stat">
              <span className="label">Streak</span>
              <span className="value">{progress?.summary?.streak ?? 0}</span>
            </div>
            <div className="stat">
              <span className="label">Best Streak</span>
              <span className="value">{progress?.summary?.longestStreak ?? 0}</span>
            </div>
            <div className="stat">
              <span className="label">Best Accuracy</span>
              <span className="value">
                {lessonSummary ? formatPercent(lessonSummary.bestAccuracy) : '—'}
              </span>
            </div>
          </div>

          <h3>Recent Sessions</h3>
          <div className="history-list">
            {progress?.attempts?.length ? (
              progress.attempts.map((attempt, index) => (
                <div key={`${attempt.completedAt}-${index}`} className="history-item">
                  <strong>{lessons.find((l) => l.id === attempt.lessonId)?.title ?? attempt.lessonId}</strong>
                  <span>
                    Accuracy {formatPercent(attempt.accuracy)} · Speed {formatNumber(attempt.speed)} chars/min
                  </span>
                  <span>{new Date(attempt.completedAt).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">Complete a lesson to see history.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<TutorApp />);

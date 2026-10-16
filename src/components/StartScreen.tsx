import { useState } from 'react';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_LIVES,
  DIFFICULTY_TIME,
  LEARNER_PATHS,
  isUntimed,
} from '../quiz/categories';
import type { SavedSession } from '../quiz/session';
import type { Difficulty, LearnerPath, QuestionCategory } from '../quiz/types';

interface Props {
  playerName: string | null;
  curatedLoaded: number;
  savedSession: SavedSession | null;
  onStart: (
    learnerPath: LearnerPath,
    difficulty: Difficulty,
    totalQuestions: number,
    categories: QuestionCategory[],
  ) => void;
  onPractice: () => void;
  onResume: () => void;
  onChangeName: () => void;
  onResetProgress: () => void;
  onPuzzle: () => void;
  seenCount: number;
}

const QUESTION_COUNTS = [10, 20, 50];

export function StartScreen({ playerName, curatedLoaded, savedSession, onStart, onPractice, onResume, onChangeName, onResetProgress, onPuzzle, seenCount }: Props) {
  const [learnerPath, setLearnerPath] = useState<LearnerPath>('foundation');
  const [difficulty, setDifficulty] = useState<Difficulty>(LEARNER_PATHS.foundation.difficulty);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [selectedCats, setSelectedCats] = useState<Set<QuestionCategory>>(
    new Set(LEARNER_PATHS.foundation.categories),
  );

  const selectPath = (path: LearnerPath) => {
    const pathConfig = LEARNER_PATHS[path];
    setLearnerPath(path);
    setDifficulty(pathConfig.difficulty);
    setSelectedCats(new Set(pathConfig.categories));
  };

  const toggleCategory = (category: QuestionCategory) => {
    setSelectedCats((previous) => {
      const next = new Set(previous);
      if (next.has(category)) {
        if (next.size > 1) next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="start-screen">
      <div className="start-screen__hero">
        {playerName && (
          <p className="hero-greeting">
            Hi, {playerName}
            <button className="link-btn" onClick={onChangeName} type="button">Not you?</button>
          </p>
        )}
        <span className="hero-kicker">Daily thinking practice</span>
        <h1 className="hero-title">Math for every mind</h1>
        <p className="hero-subtitle">
          Short mathematics and visual reasoning exercises for school learners,
          curious adults, and AI/ML engineers. {curatedLoaded} applied questions included.
        </p>
      </div>

      {savedSession && (
        <div className="resume-card">
          <div className="resume-card__info">
            <span className="resume-card__title">Resume previous session</span>
            <span className="resume-card__meta">
              Question {savedSession.currentIndex + 1} of {savedSession.questions.length} · {savedSession.score} pts
            </span>
          </div>
          <button className="resume-btn" onClick={onResume} type="button">Resume</button>
        </div>
      )}

      {seenCount > 0 && (
        <div className="progress-card">
          <div className="progress-card__info">
            <span className="progress-card__title">Your progress</span>
            <span className="progress-card__meta">
              {seenCount} question{seenCount === 1 ? '' : 's'} seen
              {seenCount >= 100 ? ' · all fresh questions may start repeating' : ''}
            </span>
          </div>
          <button
            className="reset-btn"
            onClick={() => {
              if (confirm('Reset your question history? You will see all questions as fresh again. This does not affect your name or region.')) {
                onResetProgress();
              }
            }}
            type="button"
          >
            Reset history
          </button>
        </div>
      )}

      <div className="path-grid" aria-label="Choose a learning path">
        {(Object.entries(LEARNER_PATHS) as [LearnerPath, typeof LEARNER_PATHS[LearnerPath]][]).map(
          ([path, config]) => (
            <button
              key={path}
              className={learnerPath === path ? 'path-card path-card--active' : 'path-card'}
              onClick={() => selectPath(path)}
              aria-pressed={learnerPath === path}
            >
              <span className="path-card__title">{config.label}</span>
              <span className="path-card__description">{config.description}</span>
            </button>
          ),
        )}
      </div>

      <div className="puzzle-card">
        <div className="puzzle-card__info">
          <span className="puzzle-card__title">Number Match puzzle</span>
          <span className="puzzle-card__meta">
            Untimed 10×10 grid game — clear touching pairs (equal even digits or sum 10), digits fall like Tetris
          </span>
        </div>
        <button className="resume-btn" onClick={onPuzzle} type="button">Play</button>
      </div>

      <div className="config-section">
        <div className="config-group">
          <span className="config-label">Challenge level</span>
          <div className="seg-group">
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => (
              <button
                key={level}
                className={difficulty === level ? 'seg-btn seg-btn--active' : 'seg-btn'}
                onClick={() => setDifficulty(level)}
              >
                <span className="seg-btn__title">{DIFFICULTY_LABELS[level]}</span>
                <span className="seg-btn__meta">
                  {isUntimed(learnerPath) ? 'No timer' : `${DIFFICULTY_TIME[level]}–${Math.min(120, DIFFICULTY_TIME[level] * 3)}s`} · {DIFFICULTY_LIVES[level]} lives
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="config-group">
          <span className="config-label">Session length</span>
          <div className="seg-group">
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                className={totalQuestions === count ? 'seg-btn seg-btn--active' : 'seg-btn'}
                onClick={() => setTotalQuestions(count)}
              >
                {count} questions
              </button>
            ))}
          </div>
        </div>

        <div className="config-group">
          <span className="config-label">Topics</span>
          <div className="cat-grid">
            {(isUntimed(learnerPath) ? LEARNER_PATHS[learnerPath].categories : ALL_CATEGORIES).map((category) => (
              <button
                key={category}
                className={selectedCats.has(category) ? 'cat-chip cat-chip--active' : 'cat-chip'}
                onClick={() => toggleCategory(category)}
                aria-pressed={selectedCats.has(category)}
              >
                <span className="cat-chip__label">{CATEGORY_LABELS[category]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="start-actions">
        <button
          className="start-btn"
          onClick={() => onStart(learnerPath, difficulty, totalQuestions, [...selectedCats])}
        >
          {savedSession ? 'Start over (new session)' : 'Start practice'}
        </button>
        <button className="ghost-btn" onClick={onPractice} type="button">
          Try a practice round first
        </button>
      </div>
      <p className="start-hint">
        New here? A practice round covers every question type — tap shapes, mirror
        images, the rotation dial, memory dots — with no lives lost.
      </p>
    </div>
  );
}

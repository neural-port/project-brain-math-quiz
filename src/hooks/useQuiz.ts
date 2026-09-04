import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCuratedBank } from '../quiz/cdn';
import { generateQuestions } from '../quiz/generator';
import { generateVisualQuestion } from '../quiz/visual-generator';
import { getSeenHistory } from '../quiz/seen-history';
import {
  clearSession,
  loadSession,
  saveSession,
  SESSION_VERSION,
  type SavedSession,
} from '../quiz/session';
import {
  DIFFICULTY_BASE_POINTS,
  DIFFICULTY_LIVES,
  DIFFICULTY_TIME,
  GENERATOR_CATEGORIES,
} from '../quiz/categories';
import type {
  AnswerRecord,
  Difficulty,
  LearnerPath,
  Question,
  QuestionCategory,
  QuizConfig,
  QuizPhase,
  QuizState,
} from '../quiz/types';

const TIMER_TICK_MS = 1000;
const STREAK_BONUS = 50; // bonus points per consecutive correct answer
const TIME_BONUS_THRESHOLD = 5; // answer within this many seconds for time bonus
const TIME_BONUS = 30; // extra points for fast answers

function createInitialState(): QuizState {
  return {
    phase: 'loading',
    config: {
      learnerPath: 'foundation',
      difficulty: 'easy',
      totalQuestions: 10,
      categories: ['arithmetic', 'geometry', 'visual-reasoning'],
    },
    questions: [],
    currentIndex: 0,
    score: 0,
    lives: 3,
    maxLives: 3,
    streak: 0,
    bestStreak: 0,
    timeLeft: 20,
    timeLimit: 20,
    selectedAnswer: null,
    answered: false,
    history: [],
    curatedLoaded: 0,
    curatedTotal: 0,
  };
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the quiz question set for a session.
 * Mixes curated AI/ML questions (if available) with procedurally generated
 * math questions, shuffled together.
 *
 * Uses the persistent seen-history to avoid repeating questions across
 * multiple plays. If the seen pool is exhausted (everything has been seen),
 * it falls back to allowing repeats so the game still works.
 */
function buildQuestionSet(
  config: QuizConfig,
  curated: Question[],
): Question[] {
  const { difficulty, totalQuestions, categories } = config;
  const wantsCurated = categories.includes('ai-ml-concepts');
  const genCats = categories.filter((c) => GENERATOR_CATEGORIES.includes(c));
  const history = getSeenHistory();
  const seen = history.asSet();

  // Curated questions: filter by difficulty, then prefer unseen ones.
  // If all curated questions of this difficulty have been seen, allow repeats.
  let curatedPool: Question[] = [];
  if (wantsCurated && curated.length > 0) {
    const byDifficulty = curated.filter((q) => q.difficulty === difficulty);
    const basePool = byDifficulty.length >= 3 ? byDifficulty : curated;
    // Split into unseen and seen — prioritize unseen
    const unseen = basePool.filter((q) => !seen.has(q.prompt));
    const seenOnes = basePool.filter((q) => seen.has(q.prompt));
    curatedPool = shuffleArray([...unseen, ...seenOnes]);
  }

  // Aim for ~30% curated, ~70% generated (if curated available)
  const curatedCount = wantsCurated
    ? Math.min(curatedPool.length, Math.ceil(totalQuestions * 0.3))
    : 0;
  const genCount = totalQuestions - curatedCount;

  // Pass the seen set to the generator so it avoids generating seen prompts.
  // If the generator can't produce enough unseen questions (exhausted pool),
  // it will fall back to seen ones after maxAttempts.
  const generated = generateQuestions(genCount, genCats, difficulty, seen);
  const selected = [...curatedPool.slice(0, curatedCount), ...generated];

  // Record all selected prompts as seen for future sessions
  history.addAll(selected.map((q) => q.dedupeKey ?? q.prompt));

  return shuffleArray(selected);
}

export function useQuiz() {
  const [state, setState] = useState<QuizState>(createInitialState);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => loadSession());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const curatedRef = useRef<Question[]>([]);

  // ─── Load curated bank on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setState((s) => ({ ...s, phase: 'loading' }));
      const { questions, count } = await loadCuratedBank();
      if (cancelled) return;
      curatedRef.current = questions;
      setState((s) => ({
        ...s,
        phase: 'start',
        curatedLoaded: count,
        curatedTotal: count,
      }));
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Session persistence — save progress so the user can resume later ─────
  // A ref keeps the save effect's deps narrow (fires on question transitions
  // only, not on every 1s timer tick) while still saving the latest state.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const s = stateRef.current;
    // Practice rounds must never overwrite a real saved session
    if (s.phase !== 'playing' || s.lives <= 0 || s.config.practice) return;
    saveSession({
      version: SESSION_VERSION,
      config: s.config,
      questions: s.questions,
      currentIndex: s.currentIndex,
      score: s.score,
      lives: s.lives,
      maxLives: s.maxLives,
      streak: s.streak,
      bestStreak: s.bestStreak,
      history: s.history,
    });
  }, [state.phase, state.currentIndex, state.answered, state.lives]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'playing') return;
    if (state.answered) return;
    if (state.lives <= 0) return;

    timerRef.current = setInterval(() => {
      setState((s) => {
        if (s.answered || s.phase !== 'playing') return s;
        if (s.timeLeft <= 1) {
          // Time's up — treat as wrong answer (no selection)
          return handleTimeout(s);
        }
        return { ...s, timeLeft: s.timeLeft - 1 };
      });
    }, TIMER_TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase, state.answered, state.currentIndex, state.lives]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const startQuiz = useCallback(
    (learnerPath: LearnerPath, difficulty: Difficulty, totalQuestions: number, categories: QuestionCategory[]) => {
      const config: QuizConfig = { learnerPath, difficulty, totalQuestions, categories };
      const questions = buildQuestionSet(config, curatedRef.current);
      const lives = DIFFICULTY_LIVES[difficulty];
      const timeLimit = DIFFICULTY_TIME[difficulty];

      setState({
        ...createInitialState(),
        phase: 'playing',
        config,
        questions,
        lives,
        maxLives: lives,
        timeLeft: timeLimit,
        timeLimit,
        curatedLoaded: state.curatedLoaded,
        curatedTotal: state.curatedTotal,
      });
    },
    [state.curatedLoaded, state.curatedTotal],
  );

  const startPractice = useCallback(() => {
    // One question per interaction kind so the player sees every mechanic once.
    const questions: Question[] = generateQuestions(2, ['arithmetic'], 'easy');
    const wanted = ['shape-choice', 'mirror', 'count', 'rotate', 'memory-dots', 'fraction'];
    const cats: QuestionCategory[] = ['geometry', 'visual-reasoning', 'fractions', 'memory'];
    const found = new Set<string>();
    let guard = 0;
    while (found.size < wanted.length && guard < 60) {
      guard++;
      const q = generateVisualQuestion(cats[Math.floor(Math.random() * cats.length)], 'easy');
      const kind = q.visual?.kind;
      if (kind && !found.has(kind)) {
        found.add(kind);
        questions.push(q);
      }
    }

    const config: QuizConfig = {
      learnerPath: 'foundation',
      difficulty: 'easy',
      totalQuestions: questions.length,
      categories: ['arithmetic', 'geometry', 'visual-reasoning', 'fractions', 'memory'],
      practice: true,
    };

    setState((prev) => ({
      ...createInitialState(),
      phase: 'playing',
      config,
      questions: shuffleArray(questions),
      lives: 9,
      maxLives: 9,
      timeLeft: 60,
      timeLimit: 60,
      curatedLoaded: prev.curatedLoaded,
      curatedTotal: prev.curatedTotal,
    }));
  }, []);

  const selectAnswer = useCallback((index: number) => {
    setState((s) => {
      if (s.answered || s.phase !== 'playing') return s;
      if (timerRef.current) clearInterval(timerRef.current);

      const question = s.questions[s.currentIndex];
      if (!question) return s;
      const correct = index === question.answerIndex;
      const timeTaken = s.timeLimit - s.timeLeft;

      let pointsAwarded = 0;
      let newStreak = s.streak;
      let newScore = s.score;

      if (correct) {
        newStreak = s.streak + 1;
        const basePoints = DIFFICULTY_BASE_POINTS[s.config.difficulty];
        const streakBonus = (newStreak - 1) * STREAK_BONUS;
        const timeBonus = timeTaken <= TIME_BONUS_THRESHOLD ? TIME_BONUS : 0;
        pointsAwarded = basePoints + streakBonus + timeBonus;
        newScore = s.score + pointsAwarded;
      } else {
        newStreak = 0;
      }

      const record: AnswerRecord = {
        question,
        selected: index,
        correct,
        timeTaken,
        pointsAwarded,
      };

      const newLives = correct || s.config.practice ? s.lives : s.lives - 1;
      const isLast = s.currentIndex + 1 >= s.questions.length;
      const outOfLives = newLives <= 0;

      return {
        ...s,
        selectedAnswer: index,
        answered: true,
        score: newScore,
        streak: newStreak,
        bestStreak: Math.max(s.bestStreak, newStreak),
        lives: newLives,
        history: [...s.history, record],
        // Stay on the question to show feedback; next() advances.
        phase: isLast || outOfLives ? s.phase : s.phase,
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'playing') return s;
      const isLast = s.currentIndex + 1 >= s.questions.length;
      const outOfLives = s.lives <= 0;

      if (isLast || outOfLives) {
        if (timerRef.current) clearInterval(timerRef.current);
        clearSession();
        setSavedSession(null);
        return { ...s, phase: 'results' as QuizPhase };
      }

      const timeLimit = DIFFICULTY_TIME[s.config.difficulty];
      return {
        ...s,
        currentIndex: s.currentIndex + 1,
        selectedAnswer: null,
        answered: false,
        timeLeft: timeLimit,
        timeLimit,
      };
    });
  }, []);

  const retryQuestion = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'playing') return s;
      // Remove the last history entry if it was for the current question
      const history = s.history.length > 0 && s.history[s.history.length - 1].question.id === s.questions[s.currentIndex]?.id
        ? s.history.slice(0, -1)
        : s.history;
      return {
        ...s,
        selectedAnswer: null,
        answered: false,
        timeLeft: s.timeLimit,
        history,
      };
    });
  }, []);

  const backToStart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState((s) => ({
      ...createInitialState(),
      phase: 'start',
      curatedLoaded: s.curatedLoaded,
      curatedTotal: s.curatedTotal,
    }));
    // Refresh the saved-session banner on the start screen
    setSavedSession(loadSession());
  }, []);

  const resumeQuiz = useCallback(() => {
    const s = loadSession();
    if (!s) return;
    const timeLimit = DIFFICULTY_TIME[s.config.difficulty];
    setState((prev) => ({
      ...createInitialState(),
      phase: 'playing',
      config: s.config,
      questions: s.questions,
      currentIndex: s.currentIndex,
      score: s.score,
      lives: s.lives,
      maxLives: s.maxLives,
      streak: s.streak,
      bestStreak: s.bestStreak,
      history: s.history.slice(0, s.currentIndex),
      timeLeft: timeLimit,
      timeLimit,
      curatedLoaded: prev.curatedLoaded,
      curatedTotal: prev.curatedTotal,
    }));
  }, []);

  return {
    state,
    savedSession,
    startQuiz,
    startPractice,
    selectAnswer,
    nextQuestion,
    retryQuestion,
    backToStart,
    resumeQuiz,
  };
}

// ─── Helper (pure, used inside setState) ─────────────────────────────────────

function handleTimeout(s: QuizState): QuizState {
  const question = s.questions[s.currentIndex];
  if (!question) return s;
  // Note: timer clearing is handled by the effect cleanup when `answered` changes.

  const record: AnswerRecord = {
    question,
    selected: null,
    correct: false,
    timeTaken: s.timeLimit,
    pointsAwarded: 0,
  };

  const newLives = s.config.practice ? s.lives : s.lives - 1;
  const isLast = s.currentIndex + 1 >= s.questions.length;
  const outOfLives = newLives <= 0;

  return {
    ...s,
    answered: true,
    selectedAnswer: null,
    streak: 0,
    lives: newLives,
    history: [...s.history, record],
    phase: isLast || outOfLives ? ('results' as QuizPhase) : s.phase,
  };
}

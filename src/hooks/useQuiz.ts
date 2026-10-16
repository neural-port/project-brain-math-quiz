import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCuratedBank, loadFigureClassificationBank, loadExamBank } from '../quiz/cdn';
import { generateQuestions } from '../quiz/generator';
import { generateVisualQuestion } from '../quiz/visual-generator';
import { getSeenHistory } from '../quiz/seen-history';
import {
  clearSession,
  loadSession,
  saveSession,
  SESSION_VERSION,
  type CurrencySymbol,
  type SavedSession,
} from '../quiz/session';
import { CURRENCY_SCALE } from '../quiz/session';
import {
  DIFFICULTY_BASE_POINTS,
  DIFFICULTY_LIVES,
  GENERATOR_CATEGORIES,
  getTimeLimit,
  isUntimed,
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

function questionTimeLimit(path: LearnerPath, difficulty: Difficulty, category: QuestionCategory): number {
  return isUntimed(path) ? 0 : getTimeLimit(difficulty, category);
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
  figClass: Question[],
  exam: Question[],
  currency: CurrencySymbol,
): Question[] {
  const { difficulty, totalQuestions, categories } = config;
  const untimed = isUntimed(config.learnerPath);
  const wantsCurated = !untimed && categories.includes('ai-ml-concepts');
  const wantsFigClass = !untimed && categories.includes('visual-reasoning');
  const genCats = untimed ? [] : categories.filter((c) => GENERATOR_CATEGORIES.includes(c));
  const history = getSeenHistory();
  const seen = history.asSet();

  // Curated questions: filter by difficulty, then prefer unseen ones.
  // If all curated questions of this difficulty have been seen, allow repeats.
  let curatedPool: Question[] = [];
  if (wantsCurated && curated.length > 0) {
    const byDifficulty = curated.filter((q) => q.difficulty === difficulty);
    const basePool = byDifficulty.length >= 3 ? byDifficulty : curated;
    // Use the same key everywhere: dedupeKey ?? prompt
    const getKey = (q: Question) => q.dedupeKey ?? q.prompt;
    const shuffleOptions = (q: Question): Question => {
      const correctOption = q.options[q.answerIndex];
      const options = shuffleArray(q.options);
      return { ...q, options, answerIndex: options.indexOf(correctOption) };
    };
    const unseen = basePool.filter((q) => !seen.has(getKey(q))).map(shuffleOptions);
    const seenOnes = basePool.filter((q) => seen.has(getKey(q))).map(shuffleOptions);
    // Keep unseen first, then seen — don't shuffle them together
    curatedPool = [...shuffleArray(unseen), ...shuffleArray(seenOnes)];
  }
  // Untimed exam practice: exam bank only, filtered to the selected topics
  if (untimed && exam.length > 0) {
    const inTopics = exam.filter((q) => categories.includes(q.category));
    const topicPool = inTopics.length > 0 ? inTopics : exam;
    const byDifficulty = topicPool.filter((q) => q.difficulty === difficulty);
    const basePool = byDifficulty.length >= 3 ? byDifficulty : topicPool;
    const getKey = (q: Question) => q.dedupeKey ?? q.prompt;
    const shuffleOptions = (q: Question): Question => {
      const correctOption = q.options[q.answerIndex];
      const options = shuffleArray(q.options);
      return { ...q, options, answerIndex: options.indexOf(correctOption) };
    };
    const unseen = basePool.filter((q) => !seen.has(getKey(q))).map(shuffleOptions);
    const seenOnes = basePool.filter((q) => seen.has(getKey(q))).map(shuffleOptions);
    const restPool = basePool.length < totalQuestions
      ? topicPool.filter((q) => !basePool.includes(q))
      : [];
    const restUnseen = restPool.filter((q) => !seen.has(getKey(q))).map(shuffleOptions);
    const restSeen = restPool.filter((q) => seen.has(getKey(q))).map(shuffleOptions);
    curatedPool = [
      ...shuffleArray(unseen),
      ...shuffleArray(seenOnes),
      ...shuffleArray(restUnseen),
      ...shuffleArray(restSeen),
    ];
  }
  // Add figure classification curated questions for visual-reasoning
  if (wantsFigClass && figClass.length > 0) {
    const byDifficulty = figClass.filter((q) => q.difficulty === difficulty);
    const basePool = byDifficulty.length >= 2 ? byDifficulty : figClass;
    const getKey = (q: Question) => q.dedupeKey ?? q.prompt;
    const unseen = basePool.filter((q) => !seen.has(getKey(q)));
    const seenOnes = basePool.filter((q) => seen.has(getKey(q)));
    const figPool = [...shuffleArray(unseen), ...shuffleArray(seenOnes)];
    curatedPool = [...curatedPool, ...figPool];
  }

  // Untimed sections are all curated; otherwise aim for ~30% curated, ~70% generated
  const curatedCount = untimed
    ? Math.min(curatedPool.length, totalQuestions)
    : (wantsCurated || wantsFigClass)
      ? Math.min(curatedPool.length, Math.ceil(totalQuestions * 0.3))
      : 0;
  const genCount = untimed ? 0 : totalQuestions - curatedCount;

  // Pass the seen set to the generator so it avoids generating seen prompts.
  // If the generator can't produce enough unseen questions (exhausted pool),
  // it will fall back to seen ones after maxAttempts.
  const generated = generateQuestions(genCount, genCats, difficulty, seen);
  const selected = [...curatedPool.slice(0, curatedCount), ...generated];

  // Apply currency substitution + scaling.
  // Generators produce amounts in INR magnitude with ₹ prefix.
  // We replace ₹ with the user's symbol AND scale monetary amounts so
  // they feel realistic in the user's local currency.
  //   e.g. ₹500 → $500 (1×), ¥5000 (10×), IDR 50000 (100×)
  const scale = CURRENCY_SCALE[currency] ?? 1;
  const currencyAdjusted = currency === '₹' && scale === 1
    ? selected
    : selected.map((q) => {
        const applyScale = (text: string): string =>
          text.replace(/₹(\d[\d,]*(?:\.\d+)?)/g, (_, digits: string) => {
            const scaled = Number(digits.replace(/,/g, '')) * scale;
            return `${currency}${scaled.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
          });
        return {
          ...q,
          prompt: applyScale(q.prompt),
          explanation: q.explanation ? applyScale(q.explanation) : q.explanation,
          options: q.options.map((o) => applyScale(o)),
        };
      });

  // Record all selected prompts as seen for future sessions
  history.addAll(currencyAdjusted.map((q) => q.dedupeKey ?? q.prompt));

  return shuffleArray(currencyAdjusted);
}

export function useQuiz(currency: CurrencySymbol = '₹') {
  const [state, setState] = useState<QuizState>(createInitialState);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => loadSession());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const curatedRef = useRef<Question[]>([]);
  const figClassRef = useRef<Question[]>([]);
  const examRef = useRef<Question[]>([]);

  // ─── Load curated banks on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setState((s) => ({ ...s, phase: 'loading' }));
      const [aiMl, figClass, exam] = await Promise.all([
        loadCuratedBank(),
        loadFigureClassificationBank(),
        loadExamBank(),
      ]);
      if (cancelled) return;
      curatedRef.current = aiMl.questions;
      figClassRef.current = figClass.questions;
      examRef.current = exam.questions;
      setState((s) => ({
        ...s,
        phase: 'start',
        curatedLoaded: aiMl.count + figClass.count + exam.count,
        curatedTotal: aiMl.count + figClass.count + exam.count,
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
    if (isUntimed(state.config.learnerPath)) return;

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
  }, [state.phase, state.answered, state.currentIndex, state.lives, state.config.learnerPath]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const [seenCount, setSeenCount] = useState(() => getSeenHistory().size);

  const startQuiz = useCallback(
    (learnerPath: LearnerPath, difficulty: Difficulty, totalQuestions: number, categories: QuestionCategory[]) => {
      const config: QuizConfig = { learnerPath, difficulty, totalQuestions, categories };
      const questions = buildQuestionSet(config, curatedRef.current, figClassRef.current, examRef.current, currency);
      setSeenCount(getSeenHistory().size);
      const lives = DIFFICULTY_LIVES[difficulty];
      // Set the initial time limit based on the FIRST question's category
      const firstQ = questions[0];
      const timeLimit = firstQ ? questionTimeLimit(learnerPath, difficulty, firstQ.category) : 30;

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
    [state.curatedLoaded, state.curatedTotal, currency],
  );

  const startPractice = useCallback(() => {
    // One question per interaction kind so the player sees every mechanic once.
    const questions: Question[] = generateQuestions(2, ['arithmetic'], 'easy');
    const wantedByCategory: Array<{ kind: string; category: QuestionCategory }> = [
      { kind: 'shape-choice', category: 'geometry' },
      { kind: 'count', category: 'geometry' },
      { kind: 'mirror', category: 'visual-reasoning' },
      { kind: 'rotate', category: 'visual-reasoning' },
      { kind: 'memory-dots', category: 'memory' },
      { kind: 'fraction', category: 'fractions' },
    ];
    for (const target of wantedByCategory) {
      for (let guard = 0; guard < 100; guard++) {
        const q = generateVisualQuestion(target.category, 'easy');
        if (q.visual?.kind === target.kind) {
          questions.push(q);
          break;
        }
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
        const timeBonus = s.timeLimit > 0 && timeTaken <= TIME_BONUS_THRESHOLD ? TIME_BONUS : 0;
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

      const nextIdx = s.currentIndex + 1;
      const nextQ = s.questions[nextIdx];
      const timeLimit = nextQ ? questionTimeLimit(s.config.learnerPath, s.config.difficulty, nextQ.category) : s.timeLimit;
      return {
        ...s,
        currentIndex: nextIdx,
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
    // Refresh the saved-session and seen-count banners on the start screen
    setSavedSession(loadSession());
    setSeenCount(getSeenHistory().size);
  }, []);

  const resumeQuiz = useCallback(() => {
    const s = loadSession();
    if (!s) return;
    const currentQ = s.questions[s.currentIndex];
    const timeLimit = currentQ ? questionTimeLimit(s.config.learnerPath, s.config.difficulty, currentQ.category) : 30;
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

  const resetProgress = useCallback(() => {
    const history = getSeenHistory();
    history.clear();
    clearSession();
    setSavedSession(null);
    setSeenCount(0);
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
    resetProgress,
    seenCount,
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

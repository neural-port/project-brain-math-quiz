import type { AnswerRecord, Question, QuizConfig } from './types';

const SESSION_KEY = 'quiz-session';
const PLAYER_KEY = 'quiz-player-name';

const SESSION_VERSION = 2;

export { SESSION_VERSION };

export interface SavedSession {
  version: number;
  config: QuizConfig;
  questions: Question[];
  currentIndex: number;
  score: number;
  lives: number;
  maxLives: number;
  streak: number;
  bestStreak: number;
  history: AnswerRecord[];
}

export function saveSession(session: SavedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage full or disabled — session persistence is best-effort
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedSession;
    // Reject unknown schema versions — an old/incompatible session must never
    // reach the renderer, where an unrecognized visual payload would crash it.
    if (!s || s.version !== SESSION_VERSION) {
      clearSession();
      return null;
    }
    if (s.config?.practice) return null; // practice rounds are never resumable
    if (!Array.isArray(s.questions) || s.questions.length === 0) return null;
    if (!s.questions.every((q) => q && typeof q.id === 'string' && Array.isArray(q.options))) {
      clearSession();
      return null;
    }
    if (typeof s.currentIndex !== 'number' || s.currentIndex < 0 || s.currentIndex >= s.questions.length) return null;
    if (typeof s.lives !== 'number' || s.lives <= 0) return null;
    // Validate all numeric fields to prevent NaN/undefined reaching the UI
    if (typeof s.score !== 'number' || typeof s.maxLives !== 'number') return null;
    if (typeof s.streak !== 'number' || typeof s.bestStreak !== 'number') return null;
    if (!Array.isArray(s.history)) return null;
    if (!s.config || typeof s.config.difficulty !== 'string') return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function getPlayerName(): string | null {
  try {
    return localStorage.getItem(PLAYER_KEY);
  } catch {
    return null;
  }
}

export function setPlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_KEY, name);
  } catch {}
}

export function clearPlayerName(): void {
  try {
    localStorage.removeItem(PLAYER_KEY);
  } catch {}
}

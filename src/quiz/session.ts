import type { AnswerRecord, Question, QuizConfig } from './types';

const SESSION_KEY = 'quiz-session';
const PLAYER_KEY = 'quiz-player-name';
const CURRENCY_KEY = 'quiz-currency';

export type CurrencySymbol = '₹' | '$' | '€' | '£' | '¥' | 'RM' | 'S$' | 'Rs' | 'AED' | 'R' | 'IDR';

export const CURRENCY_OPTIONS: { symbol: CurrencySymbol; label: string; region: string }[] = [
  { symbol: '₹', label: 'India', region: 'India' },
  { symbol: '$', label: 'United States', region: 'United States' },
  { symbol: '€', label: 'Europe', region: 'Europe' },
  { symbol: '£', label: 'United Kingdom', region: 'United Kingdom' },
  { symbol: '¥', label: 'Japan', region: 'Japan' },
  { symbol: 'RM', label: 'Malaysia', region: 'Malaysia' },
  { symbol: 'S$', label: 'Singapore', region: 'Singapore' },
  { symbol: 'Rs', label: 'Sri Lanka', region: 'Sri Lanka' },
  { symbol: 'AED', label: 'UAE', region: 'UAE' },
  { symbol: 'R', label: 'South Africa', region: 'South Africa' },
  { symbol: '¥', label: 'China', region: 'China' },
  { symbol: '€', label: 'Germany', region: 'Germany' },
  { symbol: 'IDR', label: 'Indonesia', region: 'Indonesia' },
  { symbol: '€', label: 'Italy', region: 'Italy' },
];

/**
 * Scale factor per currency symbol. The generators produce amounts in INR
 * magnitude (₹100–₹10,000). This factor scales monetary amounts so they feel
 * natural in the user's local currency.
 *
 * Examples:
 *   ₹500 × 1   = ₹500       (India — base)
 *   ₹500 × 1   = $500       (US — similar magnitude)
 *   ₹500 × 10  = ¥5000      (Japan — realistic for everyday items)
 *   ₹500 × 100 = IDR 50,000 (Indonesia — realistic)
 */
export const CURRENCY_SCALE: Record<CurrencySymbol, number> = {
  '₹': 1,
  '$': 1,
  '€': 1,
  '£': 1,
  '¥': 10,
  'RM': 1,
  'S$': 1,
  'Rs': 5,
  'AED': 1,
  'R': 1,
  'IDR': 100,
};

const SESSION_VERSION = 3;

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
    if (!s.questions.every((q) => q && typeof q.id === 'string' && Array.isArray(q.options) &&
      typeof q.prompt === 'string' && typeof q.answerIndex === 'number' &&
      Number.isFinite(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < q.options.length &&
      typeof q.category === 'string')) {
      clearSession();
      return null;
    }
    // Use Number.isFinite instead of typeof === 'number' because typeof NaN === 'number'
    if (!Number.isFinite(s.currentIndex) || s.currentIndex < 0 || s.currentIndex >= s.questions.length) return null;
    if (!Number.isFinite(s.lives) || s.lives <= 0) return null;
    if (!Number.isFinite(s.score) || !Number.isFinite(s.maxLives)) return null;
    if (!Number.isFinite(s.streak) || !Number.isFinite(s.bestStreak)) return null;
    if (!Array.isArray(s.history)) return null;
    if (!s.config || !['easy', 'medium', 'hard'].includes(s.config.difficulty)) return null;
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

export function getCurrency(): CurrencySymbol {
  try {
    const stored = localStorage.getItem(CURRENCY_KEY) as CurrencySymbol | null;
    if (stored && CURRENCY_OPTIONS.some((c) => c.symbol === stored)) return stored;
  } catch {}
  return '₹'; // default to INR
}

export function setCurrency(currency: CurrencySymbol): void {
  try {
    localStorage.setItem(CURRENCY_KEY, currency);
  } catch {}
}

export function clearCurrency(): void {
  try {
    localStorage.removeItem(CURRENCY_KEY);
  } catch {}
}

import type { Question } from './types';

/**
 * Load curated question banks from local static assets.
 *
 * The JSON files are served from /public/ by Vite.
 * In production (GitHub Pages), they're served from the same origin.
 */

interface CuratedBank {
  version: string;
  description: string;
  questions: Question[];
}

const AI_ML_URL = './ai-ml-questions.json';
const FIGURE_CLASS_URL = './figure-classification-questions.json';

export async function loadCuratedBank(): Promise<{
  questions: Question[];
  count: number;
}> {
  try {
    const res = await fetch(AI_ML_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bank = (await res.json()) as CuratedBank;
    if (bank && Array.isArray(bank.questions) && bank.questions.length > 0) {
      return { questions: bank.questions, count: bank.questions.length };
    }
  } catch {
    // Network or parse error — return empty, app will use generator only
  }
  return { questions: [], count: 0 };
}

export async function loadFigureClassificationBank(): Promise<{
  questions: Question[];
  count: number;
}> {
  try {
    const res = await fetch(FIGURE_CLASS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bank = (await res.json()) as CuratedBank;
    if (bank && Array.isArray(bank.questions) && bank.questions.length > 0) {
      return { questions: bank.questions, count: bank.questions.length };
    }
  } catch {
    // Network or parse error — return empty
  }
  return { questions: [], count: 0 };
}

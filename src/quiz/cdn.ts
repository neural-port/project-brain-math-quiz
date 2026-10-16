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
const EXAM_URL = './exam-questions.json';

async function loadBank(url: string): Promise<{ questions: Question[]; count: number }> {
  try {
    const res = await fetch(url);
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

export function loadCuratedBank(): Promise<{ questions: Question[]; count: number }> {
  return loadBank(AI_ML_URL);
}

export function loadFigureClassificationBank(): Promise<{ questions: Question[]; count: number }> {
  return loadBank(FIGURE_CLASS_URL);
}

export function loadExamBank(): Promise<{ questions: Question[]; count: number }> {
  return loadBank(EXAM_URL);
}

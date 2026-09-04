import type { Question } from './types';

/**
 * Load the curated AI/ML question bank from the local static asset.
 *
 * The JSON file is served from /public/ai-ml-questions.json by Vite.
 * In production (GitHub Pages), it's served from the same origin.
 *
 * To enable CDN delivery later, host the JSON on jsDelivr pointing at
 * your GitHub repo and swap this fetch URL for:
 *   https://cdn.jsdelivr.net/gh/your-username/your-repo@main/public/ai-ml-questions.json
 */

interface CuratedBank {
  version: string;
  description: string;
  questions: Question[];
}

const LOCAL_URL = './ai-ml-questions.json';

export async function loadCuratedBank(): Promise<{
  questions: Question[];
  count: number;
}> {
  try {
    const res = await fetch(LOCAL_URL);
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

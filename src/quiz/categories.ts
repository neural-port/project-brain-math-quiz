import type { Difficulty, LearnerPath, QuestionCategory } from './types';

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  arithmetic: 'Arithmetic',
  algebra: 'Algebra',
  geometry: 'Geometry',
  'visual-reasoning': 'Visual Reasoning',
  memory: 'Memory',
  patterns: 'Number Patterns',
  fractions: 'Fractions',
  'linear-algebra': 'Matrices & Vectors',
  calculus: 'Derivatives',
  probability: 'Probability',
  statistics: 'Statistics',
  'ai-ml-concepts': 'AI/ML Concepts',
  'competitive-math': 'Competitive Math',
  'number-series': 'Number Series',
  'letter-coding': 'Letter Coding',
  'logical-reasoning': 'Logical Reasoning',
};

export const CATEGORY_SHORT: Record<QuestionCategory, string> = {
  arithmetic: 'Arith',
  algebra: 'Alg',
  geometry: 'Geom',
  'visual-reasoning': 'Visual',
  memory: 'Memory',
  patterns: 'Patterns',
  fractions: 'Frac',
  'linear-algebra': 'Matrix',
  calculus: 'Calc',
  probability: 'Prob',
  statistics: 'Stats',
  'ai-ml-concepts': 'AI/ML',
  'competitive-math': 'Comp Math',
  'number-series': 'Series',
  'letter-coding': 'Coding',
  'logical-reasoning': 'Logic',
};

export const LEARNER_PATHS: Record<LearnerPath, {
  label: string;
  description: string;
  categories: QuestionCategory[];
  difficulty: Difficulty;
}> = {
  foundation: {
    label: 'Foundation',
    description: 'Shapes, counting, symmetry and simple arithmetic',
    categories: ['arithmetic', 'geometry', 'visual-reasoning', 'memory', 'fractions'],
    difficulty: 'easy',
  },
  school: {
    label: 'School Math',
    description: 'Equations, geometry, patterns, statistics and probability',
    categories: ['arithmetic', 'algebra', 'geometry', 'visual-reasoning', 'patterns', 'fractions', 'probability', 'statistics'],
    difficulty: 'easy',
  },
  everyday: {
    label: 'Everyday Logic',
    description: 'Practical numbers, patterns, memory and visual reasoning',
    categories: ['arithmetic', 'geometry', 'visual-reasoning', 'memory', 'patterns', 'fractions', 'probability', 'statistics'],
    difficulty: 'medium',
  },
  'ai-ml': {
    label: 'AI/ML Math',
    description: 'Statistics, matrices, vectors and derivatives',
    categories: ['algebra', 'patterns', 'linear-algebra', 'calculus', 'probability', 'statistics', 'ai-ml-concepts'],
    difficulty: 'medium',
  },
  'competitive-exams': {
    label: 'Competitive Exams',
    description: 'Exam-style quantitative aptitude, coding and logical reasoning',
    categories: ['competitive-math', 'number-series', 'letter-coding', 'logical-reasoning', 'patterns', 'arithmetic'],
    difficulty: 'medium',
  },
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const DIFFICULTY_TIME: Record<Difficulty, number> = {
  easy: 45,
  medium: 30,
  hard: 20,
};

/**
 * Per-category time multiplier. Some categories require manual calculation
 * (compound interest, train crossing, mixture, etc.) and need more time
 * than quick-recall categories like arithmetic or memory.
 *
 * Base time = DIFFICULTY_TIME[difficulty]
 * Actual time = base × multiplier (rounded up)
 */
export const CATEGORY_TIME_MULTIPLIER: Partial<Record<QuestionCategory, number>> = {
  // Quick recall — default 1× (no change)
  arithmetic: 1,
  memory: 1,
  'visual-reasoning': 1,
  geometry: 1,
  fractions: 1,

  // Moderate calculation — 1.5×
  algebra: 1.5,
  patterns: 1.5,
  'number-series': 1.5,
  'letter-coding': 1.5,
  probability: 1.5,
  statistics: 1.5,

  // Heavy calculation — 3× (need paper/pencil, up to 120s cap)
  'competitive-math': 3,
  'logical-reasoning': 3,
  calculus: 3,
  'linear-algebra': 3,

  // Curated AI/ML — moderate
  'ai-ml-concepts': 1.5,
};

/**
 * Get the time limit for a specific question, factoring in both difficulty
 * and category. Calculation-heavy categories get more time.
 */
export function getTimeLimit(difficulty: Difficulty, category: QuestionCategory): number {
  const base = DIFFICULTY_TIME[difficulty];
  const multiplier = CATEGORY_TIME_MULTIPLIER[category] ?? 1;
  return Math.min(120, Math.ceil(base * multiplier));
}

export const DIFFICULTY_LIVES: Record<Difficulty, number> = {
  easy: 5,
  medium: 4,
  hard: 3,
};

export const DIFFICULTY_BASE_POINTS: Record<Difficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
};

export const GENERATOR_CATEGORIES: QuestionCategory[] = [
  'arithmetic',
  'algebra',
  'geometry',
  'visual-reasoning',
  'memory',
  'patterns',
  'fractions',
  'linear-algebra',
  'calculus',
  'probability',
  'statistics',
  'competitive-math',
  'number-series',
  'letter-coding',
  'logical-reasoning',
];

export const CURATED_CATEGORY: QuestionCategory = 'ai-ml-concepts';

export const ALL_CATEGORIES: QuestionCategory[] = [
  ...GENERATOR_CATEGORIES,
  CURATED_CATEGORY,
];

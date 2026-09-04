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
];

export const CURATED_CATEGORY: QuestionCategory = 'ai-ml-concepts';

export const ALL_CATEGORIES: QuestionCategory[] = [
  ...GENERATOR_CATEGORIES,
  CURATED_CATEGORY,
];

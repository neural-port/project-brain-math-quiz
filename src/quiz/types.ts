export type Difficulty = 'easy' | 'medium' | 'hard';

export type LearnerPath = 'foundation' | 'school' | 'everyday' | 'ai-ml' | 'competitive-exams' | 'exam-practice';

export type QuestionCategory =
  | 'arithmetic'
  | 'algebra'
  | 'geometry'
  | 'visual-reasoning'
  | 'memory'
  | 'patterns'
  | 'fractions'
  | 'linear-algebra'
  | 'calculus'
  | 'probability'
  | 'statistics'
  | 'ai-ml-concepts'
  | 'competitive-math'
  | 'number-series'
  | 'letter-coding'
  | 'logical-reasoning';

export type QuestionSource = 'generator' | 'curated';

export type ShapeName =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'arrow'
  | 'flag'
  | 'l-shape'
  | 'scalene-triangle';

export interface ShapeSpec {
  shape: ShapeName;
  rotation?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  tone?: 'green' | 'cream' | 'peach' | 'outline';
  x?: number;
  y?: number;
  scale?: number;
}

export type VisualQuestion =
  | {
      kind: 'shape-choice' | 'mirror';
      target?: ShapeSpec;
      options: ShapeSpec[];
    }
  | {
      kind: 'count';
      scene: ShapeSpec[];
      countShape: ShapeName;
    }
  | {
      kind: 'rotate';
      shape: ShapeSpec;
      startAngle: number;
      targetAngle: number;
      tolerance: number;
    }
  | {
      kind: 'memory-dots';
      dots: Array<{ x: number; y: number }>;
      sequence: number[];
      showMs: number;
      gapMs: number;
    }
  | {
      kind: 'fraction';
      total: number;
      shaded: number;
      vertical: boolean;
    }
  | {
      kind: 'text-mirror';
      word: string;
      options: { text: string; mirrorX?: boolean; mirrorY?: boolean; rotate180?: boolean }[];
    }
  | {
      kind: 'dot-region';
      shapes: { type: 'circle' | 'square' | 'triangle'; label: string; cx: number; cy: number; r?: number; w?: number; h?: number }[];
      dot: { x: number; y: number };
    }
  | {
      kind: 'composite-rotate';
      base: { shape: 'square' | 'circle'; dots: { x: number; y: number }[]; lines?: { x1: number; y1: number; x2: number; y2: number }[] };
      options: { rotation: number; mirrorX?: boolean }[];
    }
  | {
      kind: 'figure-classification';
      figures: ShapeSpec[];
    };

export interface Question {
  id: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  source: QuestionSource;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  visual?: VisualQuestion;
  dedupeKey?: string;
}

export type QuizPhase = 'loading' | 'start' | 'playing' | 'results';

export interface QuizConfig {
  learnerPath: LearnerPath;
  difficulty: Difficulty;
  totalQuestions: number;
  categories: QuestionCategory[];
  practice?: boolean;
}

export interface QuizState {
  phase: QuizPhase;
  config: QuizConfig;
  questions: Question[];
  currentIndex: number;
  score: number;
  lives: number;
  maxLives: number;
  streak: number;
  bestStreak: number;
  timeLeft: number;
  timeLimit: number;
  selectedAnswer: number | null;
  answered: boolean;
  history: AnswerRecord[];
  curatedLoaded: number;
  curatedTotal: number;
}

export interface AnswerRecord {
  question: Question;
  selected: number | null;
  correct: boolean;
  timeTaken: number;
  pointsAwarded: number;
}

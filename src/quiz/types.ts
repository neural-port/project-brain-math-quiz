export type Difficulty = 'easy' | 'medium' | 'hard';

export type LearnerPath = 'foundation' | 'school' | 'everyday' | 'ai-ml';

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
  | 'ai-ml-concepts';

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
  | 'l-shape';

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

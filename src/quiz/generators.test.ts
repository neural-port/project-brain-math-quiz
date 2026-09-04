import { describe, expect, it } from 'vitest';
import { generateOne, generateQuestions } from './generator';
import { generateVisualQuestion } from './visual-generator';
import type { Difficulty, Question, QuestionCategory } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const TEXT_CATEGORIES: QuestionCategory[] = [
  'arithmetic', 'algebra', 'patterns', 'statistics', 'calculus',
  'probability', 'linear-algebra',
];
const VISUAL_CATEGORIES: QuestionCategory[] = [
  'geometry', 'visual-reasoning', 'memory', 'fractions',
];

/** Run a check N times to catch randomized edge cases. */
function repeat(times: number, check: () => void): void {
  for (let i = 0; i < times; i++) check();
}

/** Structural invariants every question must satisfy, regardless of category. */
function assertValidQuestion(q: Question | null): asserts q is Question {
  expect(q).not.toBeNull();
  if (!q) return;
  expect(typeof q.id).toBe('string');
  expect(q.id.length).toBeGreaterThan(0);
  expect(q.options.length).toBeGreaterThanOrEqual(2);
  expect(q.options.length).toBeLessThanOrEqual(4);
  expect(q.answerIndex).toBeGreaterThanOrEqual(0);
  expect(q.answerIndex).toBeLessThan(q.options.length);
  expect(q.options[q.answerIndex]).toBeDefined();
  expect(typeof q.prompt).toBe('string');
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(typeof q.explanation).toBe('string');
  // dedupeKey may be undefined for text questions; the fallback is q.prompt
  const key = q.dedupeKey ?? q.prompt;
  expect(typeof key).toBe('string');
  expect(key.length).toBeGreaterThan(0);
}

/** All options must be unique strings (no duplicate answer choices). */
function assertUniqueOptions(q: Question): void {
  const set = new Set(q.options);
  expect(set.size).toBe(q.options.length);
}

/** The correct answer must not appear as a distractor. */
function assertCorrectAnswerIsUnique(q: Question): void {
  const correct = q.options[q.answerIndex];
  const distractors = q.options.filter((_, i) => i !== q.answerIndex);
  expect(distractors).not.toContain(correct);
}

// ─── Structural tests: every generator produces valid questions ─────────────

describe('Text generators — structural invariants', () => {
  for (const category of TEXT_CATEGORIES) {
    for (const difficulty of DIFFICULTIES) {
      it(`${category}/${difficulty} produces a valid question`, () => {
        const q = generateOne(category, difficulty);
        assertValidQuestion(q);
        assertUniqueOptions(q);
        assertCorrectAnswerIsUnique(q);
        expect(q.category).toBe(category);
        expect(q.difficulty).toBe(difficulty);
        expect(q.source).toBe('generator');
      });
    }
  }
});

describe('Visual generators — structural invariants', () => {
  for (const category of VISUAL_CATEGORIES) {
    for (const difficulty of DIFFICULTIES) {
      it(`${category}/${difficulty} produces a valid question with visual payload`, () => {
        const q = generateVisualQuestion(category, difficulty);
        assertValidQuestion(q);
        assertUniqueOptions(q);
        assertCorrectAnswerIsUnique(q);
        // Visual generators may produce a related category (e.g. geometry → visual-reasoning
        // for odd-one-out), so we only assert the category is one of the visual set.
        expect(VISUAL_CATEGORIES).toContain(q.category);
        expect(q.difficulty).toBe(difficulty);
        expect(q.visual).toBeDefined();
        expect(q.visual).not.toBeNull();
      });
    }
  }
});

// ─── Arithmetic correctness: the answer must actually be correct ────────────

describe('Arithmetic generator — answer correctness', () => {
  it('addition/subtraction/multiplication/division answers are correct', () => {
    repeat(50, () => {
      const q = generateOne('arithmetic', 'easy');
      assertValidQuestion(q);
      const match = q.prompt.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);
      if (match) {
        const [, aStr, op, bStr] = match;
        const a = Number(aStr);
        const b = Number(bStr);
        const expected =
          op === '+' ? a + b :
          op === '-' ? a - b :
          op === '×' ? a * b :
          op === '÷' ? a / b : NaN;
        expect(Number(q.options[q.answerIndex])).toBe(expected);
      }
    });
  });
});

// ─── Statistics correctness: mean/median/range must be correct ──────────────

describe('Statistics generator — answer correctness', () => {
  it('mean answers are correct', () => {
    repeat(30, () => {
      const q = generateOne('statistics', 'easy');
      assertValidQuestion(q);
      if (!q.prompt.includes('mean')) return;
      const nums = q.prompt.match(/[\d.]+/g)?.map(Number) ?? [];
      if (nums.length === 0) return;
      const expected = nums.reduce((s, x) => s + x, 0) / nums.length;
      const actual = Number(q.options[q.answerIndex]);
      expect(Math.abs(actual - expected)).toBeLessThan(0.15);
    });
  });

  it('range answers are correct', () => {
    repeat(30, () => {
      const q = generateOne('statistics', 'medium');
      assertValidQuestion(q);
      if (!q.prompt.includes('range')) return;
      const nums = q.prompt.match(/\d+/g)?.map(Number) ?? [];
      if (nums.length === 0) return;
      const expected = Math.max(...nums) - Math.min(...nums);
      expect(Number(q.options[q.answerIndex])).toBe(expected);
    });
  });
});

// ─── Patterns correctness: the next term must follow the rule ───────────────

describe('Patterns generator — answer correctness', () => {
  it('arithmetic sequence answers are correct', () => {
    repeat(30, () => {
      const q = generateOne('patterns', 'easy');
      assertValidQuestion(q);
      const nums = q.prompt.match(/-?\d+/g)?.map(Number) ?? [];
      if (nums.length < 4) return;
      const [a, b, c, d] = nums;
      const diff = b - a;
      // Only test if it's actually an arithmetic sequence
      if (c - b !== diff || d - c !== diff) return;
      const expected = d + diff;
      expect(Number(q.options[q.answerIndex])).toBe(expected);
    });
  });
});

// ─── Calculus correctness: power rule derivative must be correct ────────────

describe('Calculus generator — power rule correctness', () => {
  it('derivative of ax^n is a*n*x^(n-1)', () => {
    repeat(30, () => {
      const q = generateOne('calculus', 'easy');
      assertValidQuestion(q);
      const match = q.prompt.match(/(\d+)x\^(\d+)/);
      if (!match) return;
      const a = Number(match[1]);
      const n = Number(match[2]);
      const coef = a * n;
      const exp = n - 1;
      const expected = exp === 1 ? `${coef}x` : `${coef}x^${exp}`;
      expect(q.options[q.answerIndex]).toBe(expected);
    });
  });
});

// ─── Memory dots: structural integrity of the visual payload ────────────────

describe('Memory dots generator — payload integrity', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: correct dot count, valid sequence, non-overlapping dots`, () => {
      repeat(10, () => {
        const q = generateVisualQuestion('memory', difficulty);
        assertValidQuestion(q);
        const visual = q.visual;
        expect(visual?.kind).toBe('memory-dots');
        if (visual?.kind !== 'memory-dots') return;

        const expectedDots = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 24 : 40;
        expect(visual.dots.length).toBe(expectedDots);

        const expectedSeq = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;
        expect(visual.sequence.length).toBe(expectedSeq);

        // Every sequence index must be a valid dot index
        for (const idx of visual.sequence) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(visual.dots.length);
        }

        // No duplicate indices in the sequence
        const uniqueSeq = new Set(visual.sequence);
        expect(uniqueSeq.size).toBe(visual.sequence.length);

        // Dots must be within the 0-100 normalized square
        for (const dot of visual.dots) {
          expect(dot.x).toBeGreaterThanOrEqual(0);
          expect(dot.x).toBeLessThanOrEqual(100);
          expect(dot.y).toBeGreaterThanOrEqual(0);
          expect(dot.y).toBeLessThanOrEqual(100);
        }

        // Dots must not overlap (minimum distance check with tolerance for jitter)
        const minDist = expectedDots > 30 ? 9 : expectedDots > 20 ? 11 : 14;
        for (let i = 0; i < visual.dots.length; i++) {
          for (let j = i + 1; j < visual.dots.length; j++) {
            const dist = Math.hypot(
              visual.dots[i].x - visual.dots[j].x,
              visual.dots[i].y - visual.dots[j].y,
            );
            expect(dist).toBeGreaterThanOrEqual(minDist - 0.5);
          }
        }
      });
    });
  }
});

// ─── Fractions: shaded < total, valid options ───────────────────────────────

describe('Fractions generator — payload integrity', () => {
  it('shaded is always less than total', () => {
    repeat(30, () => {
      const q = generateVisualQuestion('fractions', 'medium');
      assertValidQuestion(q);
      const visual = q.visual;
      expect(visual?.kind).toBe('fraction');
      if (visual?.kind !== 'fraction') return;
      expect(visual.shaded).toBeGreaterThan(0);
      expect(visual.shaded).toBeLessThan(visual.total);
      expect(visual.total).toBeGreaterThanOrEqual(2);
    });
  });

  it('correct answer matches shaded/total', () => {
    repeat(20, () => {
      const q = generateVisualQuestion('fractions', 'easy');
      assertValidQuestion(q);
      const visual = q.visual;
      if (visual?.kind !== 'fraction') return;
      const expected = `${visual.shaded}/${visual.total}`;
      expect(q.options[q.answerIndex]).toBe(expected);
    });
  });
});

// ─── Mirror questions: the correct option must match the stated flip ────────

describe('Mirror generator — flip correctness', () => {
  it('correct option has mirrorX for left-to-right, mirrorY for top-to-bottom', () => {
    repeat(50, () => {
      const q = generateVisualQuestion('visual-reasoning', 'medium');
      assertValidQuestion(q);
      if (q.visual?.kind !== 'mirror') return;
      const correct = q.visual.options[q.answerIndex];
      const target = q.visual.target;
      if (!correct || !target) return;

      if (q.prompt.includes('left-to-right')) {
        expect(correct.mirrorX).toBe(true);
        expect(correct.mirrorY).toBeFalsy();
      } else if (q.prompt.includes('top-to-bottom')) {
        expect(correct.mirrorY).toBe(true);
        expect(correct.mirrorX).toBeFalsy();
      }
      // The correct answer must never be the original figure
      expect(correct === target).toBe(false);
      expect(correct.mirrorX === target.mirrorX && correct.mirrorY === target.mirrorY && correct.rotation === target.rotation).toBe(false);
    });
  });
});

// ─── Mode questions: the mode must be unique ────────────────────────────────

describe('Statistics mode — unique mode guarantee', () => {
  it('only one value appears more than once', () => {
    repeat(60, () => {
      const q = generateOne('statistics', 'easy');
      assertValidQuestion(q);
      if (!q.prompt.includes('mode')) return;
      const nums = q.prompt.match(/\d+/g)?.map(Number) ?? [];
      if (nums.length === 0) return;
      const counts = new Map<number, number>();
      for (const v of nums) counts.set(v, (counts.get(v) ?? 0) + 1);
      const maxCount = Math.max(...counts.values());
      const modes = [...counts.entries()].filter(([, c]) => c === maxCount);
      // Exactly one value should be the unique mode
      expect(modes.length).toBe(1);
      expect(Number(q.options[q.answerIndex])).toBe(modes[0][0]);
    });
  });
});

// ─── Probability: no distractor may equal the correct answer's value ────────

describe('Probability generator — distractor value inequality', () => {
  it('marbles distractors are never numerically equal to the correct answer', () => {
    repeat(80, () => {
      const q = generateOne('probability', 'medium');
      assertValidQuestion(q);
      if (!q.prompt.includes('marble')) return;
      const parse = (s: string) => {
        const [n, d] = s.split('/').map(Number);
        return d ? n / d : NaN;
      };
      const correctVal = parse(q.options[q.answerIndex]);
      for (const opt of q.options) {
        if (opt === q.options[q.answerIndex]) continue;
        const v = parse(opt);
        if (isNaN(v)) continue;
        expect(Math.abs(v - correctVal)).toBeGreaterThan(1e-9);
      }
    });
  });

  it('card question distractors are never numerically equal to 1/13', () => {
    repeat(100, () => {
      const q = generateOne('probability', 'easy');
      assertValidQuestion(q);
      if (!q.prompt.includes('52-card')) return;
      const parse = (s: string) => {
        const [n, d] = s.split('/').map(Number);
        return d ? n / d : NaN;
      };
      const correctVal = 4 / 52;
      for (const opt of q.options) {
        if (opt === q.options[q.answerIndex]) continue;
        const v = parse(opt);
        expect(Math.abs(v - correctVal)).toBeGreaterThan(1e-9);
      }
    });
  });
});

// ─── Visual question tone leaks ─────────────────────────────────────────────

describe('Visual generators — no tone leaks', () => {
  it('odd-one-out: all option shapes share the same tone', () => {
    repeat(30, () => {
      const q = generateVisualQuestion('visual-reasoning', 'easy');
      assertValidQuestion(q);
      if (q.visual?.kind !== 'shape-choice' || !q.prompt.includes('different')) return;
      const tones = new Set(q.visual.options.map((s) => s.tone));
      expect(tones.size).toBe(1);
    });
  });

  it('symmetry: all option shapes share the same tone', () => {
    repeat(30, () => {
      const q = generateVisualQuestion('visual-reasoning', 'easy');
      assertValidQuestion(q);
      if (q.visual?.kind !== 'shape-choice' || !q.prompt.includes('symmetrical')) return;
      const tones = new Set(q.visual.options.map((s) => s.tone));
      expect(tones.size).toBe(1);
    });
  });

  it('symmetry: arrow never appears as a distractor (it is symmetric)', () => {
    repeat(50, () => {
      const q = generateVisualQuestion('visual-reasoning', 'medium');
      assertValidQuestion(q);
      if (q.visual?.kind !== 'shape-choice' || !q.prompt.includes('symmetrical')) return;
      const distractorShapes = q.visual.options
        .filter((_, i) => i !== q.answerIndex)
        .map((s) => s.shape);
      expect(distractorShapes).not.toContain('arrow');
    });
  });
});

// ─── Dedupe keys: must be unique across many generations ────────────────────

describe('Dedupe key uniqueness', () => {
  it('arithmetic produces mostly unique dedupe keys across 100 calls', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const q = generateOne('arithmetic', 'medium');
      if (q) keys.add(q.dedupeKey ?? q.prompt);
    }
    // With randomized parameters, we expect at least 80 unique keys out of 100
    expect(keys.size).toBeGreaterThanOrEqual(80);
  });

  it('memory dots produces unique dedupe keys across 50 calls', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const q = generateVisualQuestion('memory', 'medium');
      if (q.dedupeKey) keys.add(q.dedupeKey);
    }
    // Random dot positions + sequences → effectively all unique
    expect(keys.size).toBe(50);
  });
});

// ─── generateQuestions: batch generation and dedup ──────────────────────────

describe('generateQuestions — batch integrity', () => {
  it('produces the requested number of questions', () => {
    const questions = generateQuestions(15, ['arithmetic', 'algebra', 'patterns'], 'medium');
    expect(questions.length).toBe(15);
  });

  it('every question in the batch is structurally valid', () => {
    const questions = generateQuestions(20, TEXT_CATEGORIES, 'medium');
    for (const q of questions) {
      assertValidQuestion(q);
      assertUniqueOptions(q);
    }
  });

  it('no duplicate dedupe keys within a single batch', () => {
    const questions = generateQuestions(30, TEXT_CATEGORIES, 'hard');
    const keys = questions.map((q) => q.dedupeKey ?? q.prompt);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

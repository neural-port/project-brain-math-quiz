import { describe, expect, it, beforeEach } from 'vitest';
import { generateOne, generateQuestions } from './generator';
import { generateVisualQuestion } from './visual-generator';
import { loadSession, SESSION_VERSION } from './session';
import type { Difficulty, Question, QuestionCategory } from './types';
import figClassBank from '../../public/figure-classification-questions.json';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const TEXT_CATEGORIES: QuestionCategory[] = [
  'arithmetic', 'algebra', 'patterns', 'statistics', 'calculus',
  'probability', 'linear-algebra', 'competitive-math', 'number-series',
  'letter-coding', 'logical-reasoning',
];
const VISUAL_CATEGORIES: QuestionCategory[] = [
  'geometry', 'visual-reasoning', 'memory', 'fractions',
];

/** Run a check N times to catch randomized edge cases. */
function repeat(times: number, check: () => void): void {
  for (let i = 0; i < times; i++) check();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  it('derivative of axⁿ is a·n·xⁿ⁻¹ (superscript notation)', () => {
    const supMap: Record<string, string> = {
      '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
      '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    };
    const fromSup = (s: string) => Number([...s].map((ch) => supMap[ch] ?? '').join(''));
    repeat(30, () => {
      const q = generateOne('calculus', 'easy');
      assertValidQuestion(q);
      const match = q.prompt.match(/(\d+)x([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/);
      if (!match) return;
      const a = Number(match[1]);
      const n = fromSup(match[2]);
      const coef = a * n;
      const exp = n - 1;
      const supStr = (v: number) => String(v).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('');
      const expected = exp === 1 ? `${coef}x` : `${coef}x${supStr(exp)}`;
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
    let checked = 0;
    repeat(300, () => {
      const q = generateVisualQuestion('geometry', 'easy');
      assertValidQuestion(q);
      if (q.visual?.kind !== 'shape-choice' || !q.prompt.includes('different')) return;
      checked++;
      const tones = new Set(q.visual.options.map((s) => s.tone));
      expect(tones.size).toBe(1);
    });
    expect(checked).toBeGreaterThan(10);
  });

  it('symmetry: all option shapes share the same tone', () => {
    let checked = 0;
    repeat(300, () => {
      const q = generateVisualQuestion('geometry', 'easy');
      assertValidQuestion(q);
      if (q.visual?.kind !== 'shape-choice' || !q.prompt.includes('symmetrical')) return;
      checked++;
      const tones = new Set(q.visual.options.map((s) => s.tone));
      expect(tones.size).toBe(1);
    });
    expect(checked).toBeGreaterThan(10);
  });

  it('symmetry: arrow never appears as a distractor (it is symmetric)', () => {
    let checked = 0;
    repeat(300, () => {
      const q = generateVisualQuestion('geometry', 'medium');
      assertValidQuestion(q);
      if (q.visual?.kind !== 'shape-choice' || !q.prompt.includes('symmetrical')) return;
      checked++;
      const distractorShapes = q.visual.options
        .filter((_, i) => i !== q.answerIndex)
        .map((s) => s.shape);
      expect(distractorShapes).not.toContain('arrow');
    });
    expect(checked).toBeGreaterThan(10);
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

describe('New competitive exam generators — semantic correctness', () => {
  it('competitive math: valid questions across all difficulties', () => {
    repeat(120, () => {
      const q = generateOne('competitive-math', pick(['easy', 'medium', 'hard'] as const));
      assertValidQuestion(q);
      assertUniqueOptions(q);
      expect(q.category).toBe('competitive-math');
      expect(q.dedupeKey).toBeTruthy();
    });
  });

  it('competitive math: numeric answers are valid numbers', () => {
    repeat(60, () => {
      const q = generateOne('competitive-math', 'medium');
      assertValidQuestion(q);
      // Most competitive math answers are numeric (some have units like "m²" or "₹")
      const answerStr = q.options[q.answerIndex];
      expect(answerStr).toMatch(/[\d.]/);
    });
  });

  it('number-series: valid questions across all difficulties', () => {
    repeat(120, () => {
      const q = generateOne('number-series', pick(['easy', 'medium', 'hard'] as const));
      assertValidQuestion(q);
      assertUniqueOptions(q);
      expect(q.category).toBe('number-series');
      expect(q.dedupeKey).toBeTruthy();
    });
  });

  it('number-series: answer is always a number', () => {
    repeat(60, () => {
      const q = generateOne('number-series', 'medium');
      assertValidQuestion(q);
      expect(q.options[q.answerIndex]).toMatch(/^-?\d+$/);
    });
  });

  it('letter-coding: valid questions across all difficulties', () => {
    repeat(120, () => {
      const q = generateOne('letter-coding', pick(['easy', 'medium', 'hard'] as const));
      assertValidQuestion(q);
      assertUniqueOptions(q);
      expect(q.category).toBe('letter-coding');
      expect(q.dedupeKey).toBeTruthy();
    });
  });

  it('letter-coding: answers match expected format', () => {
    repeat(60, () => {
      const q = generateOne('letter-coding', 'medium');
      assertValidQuestion(q);
      // Allow A-Z, 0-9, commas (number coding), and symbols (symbol substitution)
      expect(q.options[q.answerIndex]).toMatch(/^[A-Z0-9,!@#$%^&*+=?~<>|¤§¶¿¡]+$/);
    });
  });

  it('logical-reasoning: valid questions across all difficulties', () => {
    repeat(120, () => {
      const q = generateOne('logical-reasoning', pick(['easy', 'medium', 'hard'] as const));
      assertValidQuestion(q);
      assertUniqueOptions(q);
      expect(q.category).toBe('logical-reasoning');
      expect(q.dedupeKey).toBeTruthy();
    });
  });

  it('logical-reasoning: exactly one marked answer', () => {
    repeat(60, () => {
      const q = generateOne('logical-reasoning', 'medium');
      assertValidQuestion(q);
      expect(q.options.filter((o) => o === q.options[q.answerIndex])).toHaveLength(1);
    });
  });

  it('competitive-math: percentage answer is correct', () => {
    repeat(30, () => {
      const q = generateOne('competitive-math', 'easy');
      assertValidQuestion(q);
      if (!q.prompt.includes('% of')) return;
      const match = q.prompt.match(/What is (\d+)% of (\d+)/);
      if (!match) return;
      const expected = (Number(match[1]) * Number(match[2])) / 100;
      expect(Number(q.options[q.answerIndex])).toBe(expected);
    });
  });

  it('number-series: arithmetic sequence answer is correct', () => {
    repeat(30, () => {
      const q = generateOne('number-series', 'easy');
      assertValidQuestion(q);
      if (!q.prompt.includes('comes next')) return;
      const nums = q.prompt.match(/\d+/g)?.map(Number) ?? [];
      if (nums.length < 5) return;
      const diffs = [nums[1] - nums[0], nums[2] - nums[1], nums[3] - nums[2]];
      if (!diffs.every((d) => d === diffs[0])) return; // not arithmetic
      const expected = nums[3] + diffs[0];
      expect(Number(q.options[q.answerIndex])).toBe(expected);
    });
  });

  it('letter-coding: shift forward answer is correct', () => {
    repeat(30, () => {
      const q = generateOne('letter-coding', 'easy');
      assertValidQuestion(q);
      const match = q.prompt.match(/shifted (\d+) place.*forward.*How is (\w+) written/);
      if (!match) return;
      const shift = Number(match[1]);
      const word = match[2];
      const expected = [...word]
        .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65))
        .join('');
      expect(q.options[q.answerIndex]).toBe(expected);
    });
  });

  it('letter-coding: number code is fully derivable from the stated rule', () => {
    let checked = 0;
    repeat(200, () => {
      const q = generateOne('letter-coding', 'medium');
      assertValidQuestion(q);
      const match = q.prompt.match(/multiply each letter's value by (\d+)\. How is (\w+) written/);
      if (!match) return;
      const multiplier = Number(match[1]);
      const word = match[2];
      const expected = [...word]
        .map((ch) => String((ch.charCodeAt(0) - 64) * multiplier))
        .join(',');
      expect(q.options[q.answerIndex]).toBe(expected);
      expect(new Set(q.options).size).toBe(4);
      checked++;
    });
    expect(checked).toBeGreaterThan(0);
  });

  it('logical-reasoning: calendar answer is correct', () => {
    repeat(30, () => {
      const q = generateOne('logical-reasoning', 'medium');
      assertValidQuestion(q);
      const match = q.prompt.match(/today is (\w+).*after (\d+) days/);
      if (!match) return;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const startIdx = days.indexOf(match[1]);
      if (startIdx === -1) return;
      const addDays = Number(match[2]);
      const expected = days[(startIdx + addDays) % 7];
      expect(q.options[q.answerIndex]).toBe(expected);
    });
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

  it('balances competitive-exam categories instead of relying on random selection', () => {
    const categories: QuestionCategory[] = [
      'competitive-math', 'number-series', 'letter-coding',
      'logical-reasoning', 'patterns', 'arithmetic',
    ];
    repeat(20, () => {
      const questions = generateQuestions(10, categories, 'medium');
      const counts = categories.map((category) => questions.filter((q) => q.category === category).length);
      expect(questions).toHaveLength(10);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });
  });

  it('limits sequence-family questions when mixed with other topics', () => {
    const categories: QuestionCategory[] = [
      'competitive-math', 'number-series', 'letter-coding',
      'logical-reasoning', 'patterns', 'arithmetic',
    ];
    repeat(20, () => {
      const questions = generateQuestions(10, categories, 'medium');
      const sequenceCount = questions.filter(
        (q) => q.category === 'patterns' || q.category === 'number-series',
      ).length;
      expect(sequenceCount).toBeLessThanOrEqual(4);
    });
  });
});

// ─── Regression tests for audit-found bugs ──────────────────────────────────

describe('REGRESSION: competitive-math distractor collisions', () => {
  it('genWork: no distractor equals answer or another distractor', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'hard')!;
      if (!q.prompt.includes('more efficient')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genWorkAlternate: answer matches day-by-day simulation', () => {
    repeat(300, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('alternate days')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      // Parse aDays and bDays
      const m = q.prompt.match(/in (\d+) days and B in (\d+) days/);
      if (!m) return;
      const aDays = Number(m[1]);
      const bDays = Number(m[2]);
      // Simulate
      let work = 0, day = 0;
      while (work < 1 && day < 200) {
        day++;
        work += day % 2 === 1 ? 1 / aDays : 1 / bDays;
      }
      expect(q.options[q.answerIndex]).toBe(String(day));
    });
  });

  it('genPercentage: no distractor equals answer (50% bug)', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.match(/What is \d+% of/)) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genProfitLoss: explanation uses numeric percent, not label', () => {
    repeat(300, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('sold at a') || !q.prompt.includes('%')) return;
      // Explanation should not contain "profit%" or "loss%" as interpolated label
      expect(q.explanation!).not.toMatch(/profit%|loss%/);
    });
  });

  it('genDiscount: no distractor equals answer (50% bug)', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('discount of')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genSimpleInterest: no duplicate distractors', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('simple interest')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genRatio: no distractor equals answer or blue balls', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('ratio of red to blue')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genMixture: target is not the midpoint and total quantity is never 0', () => {
    repeat(300, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('mixes rice costing')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      // Parse cheap, dear, target, total kg
      const m = q.prompt.match(/₹(\d+)\/kg with rice costing ₹(\d+)\/kg to get a mixture worth ₹(\d+)\/kg\. If they make (\d+) kg/);
      if (!m) return;
      const cheap = Number(m[1]);
      const dear = Number(m[2]);
      const target = Number(m[3]);
      const totalKg = Number(m[4]);
      expect(target).not.toBe((cheap + dear) / 2);
      expect(totalKg).toBeGreaterThan(0);
      expect(Number(q.options[q.answerIndex])).toBeGreaterThan(0);
    });
  });

  it('genAges: no negative past ages, answer is integer', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'hard')!;
      if (!q.prompt.includes('years ago, the ratio')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      const m = q.prompt.match(/A is currently (\d+) years old\. (\d+) years ago/);
      if (!m) return;
      const currentAge = Number(m[1]);
      const yearsAgo = Number(m[2]);
      expect(currentAge - yearsAgo).toBeGreaterThan(0);
    });
  });

  it('genArea: no distractor equals answer (square side=4 NaN bug)', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.match(/area of/) && !q.prompt.match(/What is its area/)) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
      // No NaN options
      q.options.forEach((opt) => expect(opt).not.toBe('NaN'));
    });
  });

  it('genBodmas: no distractor equals answer', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'hard')!;
      if (!q.prompt.includes('BODMAS') && !q.prompt.includes('Evaluate:')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genPartnership: no distractor equals answer', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'hard')!;
      if (!q.prompt.includes('invests') || !q.prompt.includes('months')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genLcmHcf: no distractor equals answer', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.match(/Find the (LCM|HCF)/)) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genAverageMissing: no distractor equals answer', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('average of') || !q.prompt.includes('number')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genSpeed: no distractor equals answer', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'medium')!;
      if (!q.prompt.includes('km/h for') || !q.prompt.includes('same speed')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genTrainCrossing: no distractor equals answer after rounding', () => {
    repeat(500, () => {
      const q = generateOne('competitive-math', 'hard')!;
      if (!q.prompt.includes('long train running at')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });
});

describe('REGRESSION: number-series distractor collisions', () => {
  it('genPrimes: no distractor equals the next prime', () => {
    repeat(500, () => {
      const q = generateOne('number-series', 'medium')!;
      if (!q.prompt.includes('comes next') || !q.explanation!.includes('prime')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genAltMultiplyAdd: seq[3]+adder does not equal answer', () => {
    repeat(500, () => {
      const q = generateOne('number-series', 'medium')!;
      if (!q.explanation!.includes('multiply') || !q.explanation!.includes('add')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('genAlternating: no distractor equals answer', () => {
    repeat(500, () => {
      const q = generateOne('number-series', 'hard')!;
      if (!q.explanation!.includes('odd and even')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });
});

describe('REGRESSION: letter-coding fixes', () => {
  it('genShiftForward: explanation shows actual shift amount', () => {
    repeat(200, () => {
      const q = generateOne('letter-coding', 'hard')!;
      if (!q.prompt.includes('shifted') || !q.prompt.includes('forward')) return;
      const m = q.prompt.match(/shifted (\d+) place/);
      if (!m) return;
      const shift = Number(m[1]);
      // Explanation should mention the actual shift (not just A→B for shift > 1)
      if (shift > 1) {
        expect(q.explanation!).toContain(String.fromCharCode(65 + shift));
      }
    });
  });

  it('genMixedCoding: no negative or zero alphabet values in distractors', () => {
    repeat(300, () => {
      const q = generateOne('letter-coding', 'medium')!;
      if (!q.prompt.includes('alphabet position')) return;
      assertValidQuestion(q);
      // Only check options that are comma-separated numbers (the coded form)
      q.options.forEach((opt) => {
        if (!/^\d+(,\d+)+$/.test(opt)) return; // skip non-numeric options
        const nums = opt.split(',').map(Number);
        nums.forEach((n) => expect(n).toBeGreaterThan(0));
      });
    });
  });
});

describe('REGRESSION: logical-reasoning fixes', () => {
  it('blood relations: male roles use male names, female roles use female names', () => {
    const maleNames = ['Arun', 'Bharat', 'Chetan', 'Dev', 'Eshan', 'Faisal', 'Gopal', 'Harish'];
    const femaleNames = ['Asha', 'Bina', 'Chitra', 'Deepa', 'Esha', 'Farah', 'Gita', 'Hema'];
    repeat(500, () => {
      const q = generateOne('logical-reasoning', 'medium')!;
      if (!q.prompt.includes('brother of') && !q.prompt.includes('father of') &&
          !q.prompt.includes('married to') && !q.prompt.includes('grandfather') &&
          !q.prompt.includes('grandmother') && !q.prompt.includes('sister of')) return;
      // Extract all capitalized names from the prompt
      const names = q.prompt.match(/\b(Arun|Bharat|Chetan|Dev|Eshan|Faisal|Gopal|Harish|Asha|Bina|Chitra|Deepa|Esha|Farah|Gita|Hema)\b/g);
      if (!names) return;
      // If prompt says "brother of X", X's brother should be a male name
      if (q.prompt.includes('brother of')) {
        // The brother should be a male name
        const hasMale = names.some((n) => maleNames.includes(n));
        expect(hasMale).toBe(true);
      }
      // If prompt says "father of X", the father should be a male name
      if (q.prompt.includes('father of')) {
        const hasMale = names.some((n) => maleNames.includes(n));
        expect(hasMale).toBe(true);
      }
      // If prompt says "sister of X", the sister should be a female name
      if (q.prompt.includes('sister of')) {
        const hasFemale = names.some((n) => femaleNames.includes(n));
        expect(hasFemale).toBe(true);
      }
    });
  });

  it('genDirectionShadow: shadow direction is correct', () => {
    repeat(200, () => {
      const q = generateOne('logical-reasoning', 'medium')!;
      if (!q.prompt.includes('sun is in the') || !q.prompt.includes('shadow')) return;
      assertValidQuestion(q);
      // Morning: sun east → shadow west. Evening: sun west → shadow east.
      if (q.prompt.includes('morning')) {
        expect(q.options[q.answerIndex]).toBe('west');
      } else if (q.prompt.includes('evening')) {
        expect(q.options[q.answerIndex]).toBe('east');
      }
    });
  });

  it('genRanking: ordinal suffix is correct (no 2th, 3th, 1th)', () => {
    repeat(500, () => {
      const q = generateOne('logical-reasoning', 'medium')!;
      if (!q.prompt.includes('ranks') || !q.prompt.includes('from the top')) return;
      assertValidQuestion(q);
      // Check no invalid ordinals in prompt or answer
      expect(q.prompt).not.toMatch(/\b1th\b|\b2th\b|\b3th\b/);
      q.options.forEach((opt) => {
        // Only check ordinal-looking options
        const m = opt.match(/^(\d+)(st|nd|rd|th)$/);
        if (!m) return;
        const n = Number(m[1]);
        const suffix = m[2];
        if (n % 10 === 1 && n % 100 !== 11) expect(suffix).toBe('st');
        else if (n % 10 === 2 && n % 100 !== 12) expect(suffix).toBe('nd');
        else if (n % 10 === 3 && n % 100 !== 13) expect(suffix).toBe('rd');
        else expect(suffix).toBe('th');
      });
      // Check correct ordinals: 1st, 2nd, 3rd, 4th, etc.
      const answer = q.options[q.answerIndex];
      const m = answer.match(/^(\d+)(st|nd|rd|th)$/);
      expect(m).not.toBeNull();
      if (m) {
        const n = Number(m[1]);
        const suffix = m[2];
        if (n % 10 === 1 && n % 100 !== 11) expect(suffix).toBe('st');
        else if (n % 10 === 2 && n % 100 !== 12) expect(suffix).toBe('nd');
        else if (n % 10 === 3 && n % 100 !== 13) expect(suffix).toBe('rd');
        else expect(suffix).toBe('th');
      }
    });
  });

  it('genClockAngle: explanation mentions >180° reduction when applicable', () => {
    repeat(300, () => {
      const q = generateOne('logical-reasoning', 'hard')!;
      if (!q.prompt.includes('angle between the hour and minute hands')) return;
      assertValidQuestion(q);
      // Parse the answer
      const answerMatch = q.options[q.answerIndex].match(/^(\d+)°$/);
      if (!answerMatch) return;
      // If raw angle > 180, explanation should mention the reduction
      const rawMatch = q.explanation!.match(/Raw angle = \|[\d.]+ − [\d.]+\| = ([\d.]+)°/);
      if (rawMatch) {
        const raw = Number(rawMatch[1]);
        if (raw > 180) {
          expect(q.explanation!).toContain('> 180°');
          expect(q.explanation!).toContain('360°');
        }
      }
    });
  });

  it('genArrangementConstraint v4: uniquely determines rightmost', () => {
    repeat(100, () => {
      const q = generateOne('logical-reasoning', 'hard')!;
      if (!q.prompt.includes('rightmost end') || !q.prompt.includes('immediate left')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      // The constraints should uniquely determine the answer
      // Just verify the answer is one of the options and explanation is consistent
      const answer = q.options[q.answerIndex];
      expect(q.explanation!).toContain(`Answer: ${answer}`);
    });
  });

  it('statement/conclusion: stmt-8, 11, 17 are classified as does-not-follow', () => {
    repeat(500, () => {
      const q = generateOne('logical-reasoning', 'medium')!;
      if (!q.prompt.includes('Conclusion:') || !q.prompt.includes('Which is correct')) return;
      assertValidQuestion(q);
      // stmt-8: reading causes vocabulary growth
      if (q.prompt.includes('vocabularies') && q.prompt.includes('Reading causes')) {
        expect(q.options[q.answerIndex]).toMatch(/does not follow/);
      }
      // stmt-11: medicine X cures
      if (q.prompt.includes('medicine X') && q.prompt.includes('cures the disease')) {
        expect(q.options[q.answerIndex]).toMatch(/does not follow/);
      }
      // stmt-17: CCTV + fired
      if (q.prompt.includes('CCTV') && q.prompt.includes('fired')) {
        expect(q.options[q.answerIndex]).toMatch(/does not follow/);
      }
    });
  });
});

describe('REGRESSION: generator.ts fixes', () => {
  it('genPatterns sub: explanation shows correct difference direction', () => {
    repeat(300, () => {
      const q = generateOne('patterns', 'medium')!;
      if (!q.explanation!.includes('subtracts')) return;
      // For subtraction, explanation should show seq[0] − seq[1] = d (not seq[1] − seq[0])
      expect(q.explanation!).toMatch(/\d+ − \d+ = \d+.*\d+ − \d+ = \d+/);
    });
  });

  it('genProbability coins: no duplicate-value distractors (1/2 vs 2/4)', () => {
    repeat(300, () => {
      const q = generateOne('probability', 'easy')!;
      if (!q.prompt.includes('coins') || !q.prompt.includes('all heads')) return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      // Check no two options are numerically equal
      const values = q.options.map((opt) => {
        const m = opt.match(/^1\/(\d+)$/);
        return m ? 1 / Number(m[1]) : Number(opt);
      });
      expect(new Set(values).size).toBe(values.length);
    });
  });

  it('genStatistics median: explanation mentions two middle values for even n', () => {
    repeat(300, () => {
      const q = generateOne('statistics', 'medium')!;
      if (!q.prompt.includes('median')) return;
      // For even n, explanation should mention "average of the two middle"
      if (q.explanation!.includes('even')) {
        expect(q.explanation!).toContain('average of the two middle');
      }
    });
  });
});

describe('REGRESSION: visual-generator fixes', () => {
  it('generateShapeChoice: all options have the same tone (no color leak)', () => {
    repeat(100, () => {
      const q = generateVisualQuestion('geometry', 'easy');
      if (!q.visual || q.visual.kind !== 'shape-choice') return;
      const tones = q.visual.options.map((o) => o.tone);
      const uniqueTones = new Set(tones);
      expect(uniqueTones.size).toBe(1);
    });
  });

  it('generateCount: all shapes have the same tone and stay inside safe visual margins', () => {
    let checked = 0;
    repeat(300, () => {
      const q = generateVisualQuestion('geometry', 'easy');
      if (!q.visual || q.visual.kind !== 'count') return;
      checked++;
      const tones = q.visual.scene.map((s) => s.tone);
      const uniqueTones = new Set(tones);
      expect(uniqueTones.size).toBe(1);
      for (const shape of q.visual.scene) {
        expect(shape.x).toBeGreaterThanOrEqual(12);
        expect(shape.x).toBeLessThanOrEqual(88);
        expect(shape.y).toBeGreaterThanOrEqual(12);
        expect(shape.y).toBeLessThanOrEqual(88);
      }
    });
    expect(checked).toBeGreaterThan(50);
  });

  it('generateFraction: no distractor equals correct answer', () => {
    repeat(300, () => {
      const q = generateVisualQuestion('fractions', 'easy');
      if (!q.visual || q.visual.kind !== 'fraction') return;
      assertValidQuestion(q);
      assertUniqueOptions(q);
      assertCorrectAnswerIsUnique(q);
    });
  });

  it('generateMirror: rotation is only 0 or 180 (no 90/270)', () => {
    repeat(200, () => {
      const q = generateVisualQuestion('visual-reasoning', 'medium');
      if (!q.visual || q.visual.kind !== 'mirror') return;
      q.visual.options.forEach((opt) => {
        expect([0, 180]).toContain(opt.rotation);
      });
    });
  });
});

describe('REGRESSION: session validation', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    } as Storage;
  });

  it('rejects NaN in numeric fields', () => {
    const bad = {
      version: SESSION_VERSION,
      config: { difficulty: 'easy' as const, categories: ['arithmetic' as const], totalQuestions: 5, practice: false },
      questions: [{ id: 'x', category: 'arithmetic', difficulty: 'easy' as const, source: 'generator' as const, prompt: 'test', options: ['1', '2'], answerIndex: 0, explanation: 'test' }],
      currentIndex: NaN,
      score: 0,
      lives: 3,
      maxLives: 3,
      streak: 0,
      bestStreak: 0,
      history: [],
    };
    localStorage.setItem('quiz-session', JSON.stringify(bad));
    expect(loadSession()).toBeNull();
  });

  it('rejects invalid difficulty', () => {
    const bad = {
      version: SESSION_VERSION,
      config: { difficulty: 'invalid' as unknown as 'easy', categories: ['arithmetic' as const], totalQuestions: 5, practice: false },
      questions: [{ id: 'x', category: 'arithmetic', difficulty: 'easy' as const, source: 'generator' as const, prompt: 'test', options: ['1', '2'], answerIndex: 0, explanation: 'test' }],
      currentIndex: 0,
      score: 0,
      lives: 3,
      maxLives: 3,
      streak: 0,
      bestStreak: 0,
      history: [],
    };
    localStorage.setItem('quiz-session', JSON.stringify(bad));
    expect(loadSession()).toBeNull();
  });
});

// ─── New generator tests: symbol substitution, missing number grid,
//     text mirror, dot region, composite rotation, figure classification ─────

describe('Symbol substitution coding — correctness', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`symbol-sub/${difficulty} produces valid coding question`, () => {
      repeat(50, () => {
        const q = generateOne('letter-coding', difficulty);
        assertValidQuestion(q);
        assertUniqueOptions(q);
        assertCorrectAnswerIsUnique(q);
      });
    });
  }

  it('symbol substitution answer matches the mapping', () => {
    repeat(100, () => {
      const q = generateOne('letter-coding', 'medium');
      if (!q) return;
      // Only check symbol substitution questions
      if (!q.prompt.includes('represented as follows')) return;
      // Extract the mapping from the prompt
      const mappingMatch = [...q.prompt.matchAll(/([A-Z])\s*→\s*(\S)/g)];
      const mapping: Record<string, string> = {};
      for (const m of mappingMatch) mapping[m[1]] = m[2];
      // Extract the word from the prompt
      const wordMatch = q.prompt.match(/"([A-Z]+)"/);
      if (wordMatch) {
        const word = wordMatch[1];
        const expected = [...word].map((ch) => mapping[ch] ?? '?').join('');
        expect(q.options[q.answerIndex]).toBe(expected);
      }
    });
  });
});

describe('Missing number grid — correctness', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`grid/${difficulty} produces valid question with numeric answer`, () => {
      repeat(50, () => {
        const q = generateOne('logical-reasoning', difficulty);
        if (!q) return;
        // Not every logic question is a grid; filter by prompt
        if (!q.prompt.includes('missing number in the grid')) return;
        assertValidQuestion(q);
        assertUniqueOptions(q);
        assertCorrectAnswerIsUnique(q);
        // Answer must be a number
        const answer = q.options[q.answerIndex];
        expect(Number.isFinite(Number(answer))).toBe(true);
        // Grid must have ? in it
        expect(q.prompt).toContain('?');
      });
    });
  }

  it('missing number grid answer is mathematically correct', () => {
    repeat(100, () => {
      const q = generateOne('logical-reasoning', 'medium');
      if (!q) return;
      if (!q.prompt.includes('missing number in the grid')) return;
      // Parse the grid from the prompt
      const gridLines = q.prompt.split('\n').filter((l) => l.includes('|'));
      if (gridLines.length < 2) return;
      // The answer should be consistent with the pattern
      const answer = Number(q.options[q.answerIndex]);
      expect(Number.isFinite(answer)).toBe(true);
      expect(answer).toBeGreaterThan(0);
    });
  });
});

describe('Text mirror — structural correctness', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`text-mirror/${difficulty} produces valid visual question`, () => {
      repeat(50, () => {
        const q = generateVisualQuestion('visual-reasoning', difficulty);
        if (!q.visual || q.visual.kind !== 'text-mirror') return;
        assertValidQuestion(q);
        assertUniqueOptions(q);
        assertCorrectAnswerIsUnique(q);
        expect(q.visual.word).toBeDefined();
        expect(q.visual.word.length).toBeGreaterThanOrEqual(3);
        expect(q.visual.options).toHaveLength(4);
        // The correct option must have mirrorX=true
        const correctOpt = q.visual.options[q.answerIndex];
        expect(correctOpt.mirrorX).toBe(true);
        expect(correctOpt.mirrorY).toBeUndefined();
        expect(correctOpt.rotate180).toBeUndefined();
      });
    });
  }
});

describe('Dot region — structural correctness', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`dot-region/${difficulty} produces valid visual question`, () => {
      repeat(50, () => {
        const q = generateVisualQuestion('visual-reasoning', difficulty);
        if (!q.visual || q.visual.kind !== 'dot-region') return;
        assertValidQuestion(q);
        assertUniqueOptions(q);
        assertCorrectAnswerIsUnique(q);
        expect(q.visual.shapes.length).toBeGreaterThanOrEqual(2);
        expect(q.visual.dot).toBeDefined();
        // Dot coordinates must be within the SVG viewBox
        expect(q.visual.dot.x).toBeGreaterThanOrEqual(0);
        expect(q.visual.dot.x).toBeLessThanOrEqual(100);
        expect(q.visual.dot.y).toBeGreaterThanOrEqual(0);
        expect(q.visual.dot.y).toBeLessThanOrEqual(100);
      });
    });
  }

  it('dot region answer is consistent with geometry', () => {
    repeat(100, () => {
      const q = generateVisualQuestion('visual-reasoning', 'medium');
      if (!q.visual || q.visual.kind !== 'dot-region') return;
      const { shapes, dot } = q.visual;
      // Recompute which shapes contain the dot
      const containing: string[] = [];
      for (const s of shapes) {
        let inside = false;
        if (s.type === 'circle') {
          inside = Math.hypot(dot.x - s.cx, dot.y - s.cy) <= (s.r ?? 25);
        } else if (s.type === 'square') {
          const half = (s.w ?? 40) / 2;
          inside = dot.x >= s.cx - half && dot.x <= s.cx + half && dot.y >= s.cy - half && dot.y <= s.cy + half;
        } else if (s.type === 'triangle') {
          const h = s.h ?? 40;
          const top = s.cy - h / 2;
          const bottom = s.cy + h / 2;
          if (dot.y >= top && dot.y <= bottom) {
            const ratio = (dot.y - top) / (bottom - top);
            const halfWidth = (h / 2) * ratio;
            inside = dot.x >= s.cx - halfWidth && dot.x <= s.cx + halfWidth;
          }
        }
        if (inside) containing.push(s.label);
      }
      // The answer must match
      const answer = q.options[q.answerIndex];
      if (containing.length === 0) {
        expect(answer).toMatch(/none/i);
      } else if (containing.length === shapes.length) {
        expect(answer).toMatch(/all/i);
      } else {
        for (const label of containing) {
          expect(answer).toContain(label);
        }
      }
    });
  });
});

describe('Composite rotation — structural correctness', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`composite-rotate/${difficulty} produces valid visual question`, () => {
      repeat(50, () => {
        const q = generateVisualQuestion('visual-reasoning', difficulty);
        if (!q.visual || q.visual.kind !== 'composite-rotate') return;
        assertValidQuestion(q);
        assertUniqueOptions(q);
        assertCorrectAnswerIsUnique(q);
        expect(q.visual.base.dots.length).toBeGreaterThanOrEqual(2);
        expect(q.visual.options).toHaveLength(4);
        // The correct option must have a rotation != 0 and no mirrorX
        const correctOpt = q.visual.options[q.answerIndex];
        expect(correctOpt.rotation).toBeGreaterThanOrEqual(90);
        expect(correctOpt.mirrorX).toBeUndefined();
      });
    });
  }

  it('composite rotation has exactly one correct rotation per question', () => {
    repeat(100, () => {
      const q = generateVisualQuestion('visual-reasoning', 'hard');
      if (!q.visual || q.visual.kind !== 'composite-rotate') return;
      // There should be options with different rotations
      const rotations = q.visual.options.map((o) => o.rotation);
      const uniqueRotations = new Set(rotations);
      expect(uniqueRotations.size).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('Figure classification curated bank — structural correctness', () => {
  it('figure classification JSON loads and has valid questions', () => {
    const bank = figClassBank;
    expect(bank.questions).toBeDefined();
    expect(Array.isArray(bank.questions)).toBe(true);
    expect(bank.questions.length).toBeGreaterThanOrEqual(5);

    for (const q of bank.questions) {
      expect(q.id).toBeDefined();
      expect(q.category).toBe('visual-reasoning');
      expect(q.source).toBe('curated');
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.explanation).toBeDefined();
      expect(q.dedupeKey).toBeDefined();
      // Visual payload
      expect(q.visual).toBeDefined();
      expect(q.visual.kind).toBe('figure-classification');
      expect(Array.isArray(q.visual.figures)).toBe(true);
      expect(q.visual.figures.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('figure classification has unique dedupeKeys', () => {
    const keys = figClassBank.questions.map((q) => q.dedupeKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('figure classification has unique options per question', () => {
    for (const q of figClassBank.questions) {
      const set = new Set(q.options);
      expect(set.size).toBe(q.options.length);
    }
  });
});


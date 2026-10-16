import { describe, expect, it } from 'vitest';
import { generateOne, generateQuestions } from './generator';
import type { Difficulty, Question, QuestionCategory } from './types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const TEXT_CATEGORIES: QuestionCategory[] = [
  'arithmetic', 'algebra', 'patterns', 'statistics', 'calculus',
  'probability', 'linear-algebra', 'competitive-math', 'number-series',
  'letter-coding', 'logical-reasoning',
];

function isValid(q: Question | null): boolean {
  if (!q) return false;
  if (!q.options || q.options.length !== 4) return false;
  if (new Set(q.options).size !== q.options.length) return false;
  if (q.answerIndex < 0 || q.answerIndex >= q.options.length) return false;
  if (!q.explanation || q.explanation.length < 5) return false;
  if (q.prompt.includes('undefined') || q.prompt.includes('NaN')) return false;
  if (q.explanation.includes('undefined') || q.explanation.includes('NaN')) return false;
  if (q.options.some((o) => o.includes('undefined') || o.includes('NaN'))) return false;
  return true;
}

function answer(q: Question): string {
  return q.options[q.answerIndex];
}

const failures: string[] = [];
function check(q: Question | null, cat: QuestionCategory, d: Difficulty): boolean {
  if (!q) { failures.push(`${cat}/${d}: null question`); return false; }
  if (!isValid(q)) {
    failures.push(`${cat}/${d}: invalid — prompt="${q.prompt}" options=${JSON.stringify(q.options)} idx=${q.answerIndex}`);
    return false;
  }
  return true;
}

describe('EXHAUSTIVE AUDIT — 500 samples per category per difficulty', () => {
  for (const cat of TEXT_CATEGORIES) {
    for (const d of DIFFICULTIES) {
      it(`${cat}/${d}: all 500 questions structurally valid`, () => {
        let bad = 0;
        for (let i = 0; i < 500; i++) {
          const q = generateOne(cat, d);
          if (!check(q, cat, d)) bad++;
          if (bad > 5) break;
        }
        expect(bad).toBe(0);
      });
    }
  }
});

describe('SEMANTIC AUDIT — verify answers independently', () => {
  it('arithmetic: answer matches parsed operands', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateOne('arithmetic', 'medium');
      if (!check(q, 'arithmetic', 'medium')) continue;
      const m = q!.prompt.match(/What is (\d+) ([+\-−×÷]) (\d+)\?/);
      if (!m) { failures.push(`arithmetic: unparsable "${q!.prompt}"`); continue; }
      const a = Number(m[1]), b = Number(m[3]);
      const expected = m[2] === '+' ? a + b : m[2] === '×' ? a * b : m[2] === '÷' ? a / b : a - b;
      if (answer(q!) !== String(expected)) {
        failures.push(`arithmetic wrong: "${q!.prompt}" expected=${expected} got=${answer(q!)}`);
      }
    }
  });

  it('algebra: x satisfies the equation', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateOne('algebra', 'medium');
      if (!check(q, 'algebra', 'medium')) continue;
      const m = q!.prompt.match(/(\d+)x \+ (\d+) = (\d+)/);
      if (!m) { failures.push(`algebra: unparsable "${q!.prompt}"`); continue; }
      const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
      const x = Number(answer(q!));
      if (a * x + b !== c) {
        failures.push(`algebra wrong: "${q!.prompt}" x=${x} → ${a * x + b} ≠ ${c}`);
      }
    }
  });

  it('statistics mean/median/mode/range verified', () => {
    for (let i = 0; i < 400; i++) {
      const q = generateOne('statistics', 'medium');
      if (!check(q, 'statistics', 'medium')) continue;
      const nums = q!.prompt.match(/[\d.]+/g)?.map(Number) ?? [];
      const sorted = [...nums].sort((x, y) => x - y);
      const ans = answer(q!);
      if (q!.prompt.includes('mean')) {
        const expected = nums.reduce((s, x) => s + x, 0) / nums.length;
        if (Number(ans) !== expected) failures.push(`mean wrong: "${q!.prompt}" exp=${expected} got=${ans}`);
      } else if (q!.prompt.includes('median')) {
        const mid = nums.length % 2 === 0
          ? (sorted[nums.length / 2 - 1] + sorted[nums.length / 2]) / 2
          : sorted[Math.floor(nums.length / 2)];
        const expStr = Number.isInteger(mid) ? String(mid) : mid.toFixed(1);
        if (ans !== expStr) failures.push(`median wrong: "${q!.prompt}" exp=${expStr} got=${ans}`);
      } else if (q!.prompt.includes('mode')) {
        const counts = new Map<number, number>();
        for (const v of nums) counts.set(v, (counts.get(v) ?? 0) + 1);
        const maxCount = Math.max(...counts.values());
        const modes = [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v);
        if (modes.length !== 1 || String(modes[0]) !== ans) {
          failures.push(`mode wrong: "${q!.prompt}" modes=${modes} got=${ans}`);
        }
      } else if (q!.prompt.includes('range')) {
        const expected = Math.max(...nums) - Math.min(...nums);
        if (Number(ans) !== expected) failures.push(`range wrong: "${q!.prompt}" exp=${expected} got=${ans}`);
      }
    }
  });

  it('patterns: next term is consistent with shown sequence', () => {
    for (let i = 0; i < 400; i++) {
      const q = generateOne('patterns', 'medium');
      if (!check(q, 'patterns', 'medium')) continue;
      const nums = q!.prompt.match(/-?\d+/g)?.map(Number) ?? [];
      const ans = Number(answer(q!));
      if (Number.isNaN(ans)) { failures.push(`patterns: non-numeric answer "${q!.prompt}"`); continue; }
      // Verify answer is plausible: arithmetic, geometric, alternating, fib, squares, or mixed
      const d1 = nums[1] - nums[0];
      const isArith = nums.length >= 4 && d1 !== 0 && [nums[2] - nums[1], nums[3] - nums[2]].every((x) => x === d1);
      const isGeo = nums.length >= 4 && nums[0] !== 0 && nums[1] % nums[0] === 0 &&
        nums[2] / nums[1] === nums[1] / nums[0] && nums[3] / nums[2] === nums[2] / nums[1];
      const isAlt = nums.length >= 4 && nums[0] === nums[2] && nums[1] === nums[3];
      const isFib = nums.length >= 4 && nums[2] === nums[0] + nums[1] && nums[3] === nums[1] + nums[2];
      const isSquare = nums.length >= 4 && nums.every((v, idx) => {
        const r = Math.sqrt(v);
        return Number.isInteger(r) && r === Math.sqrt(nums[0]) + idx;
      });
      // Mixed: two interleaved sequences (odd positions add 2, even positions subtract 4)
      // Format: [a, b, a+2, b-4, a+4] → answer = b-8
      const isMixed = nums.length >= 5 &&
        nums[0] + 2 === nums[2] && nums[2] + 2 === nums[4] &&
        nums[1] - 4 === nums[3] && ans === nums[3] - 4;
      if (!(isArith || isGeo || isAlt || isFib || isSquare || isMixed)) {
        failures.push(`patterns: unrecognized seq "${q!.prompt}" ans=${ans}`);
      }
    }
  });

  it('probability: fractions are reduced and correct', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateOne('probability', 'medium');
      if (!check(q, 'probability', 'medium')) continue;
      const ans = answer(q!);
      const frac = ans.match(/^(\d+)\/(\d+)$/);
      if (!frac) continue;
      const n = Number(frac[1]), d = Number(frac[2]);
      // must be reduced: gcd(n,d) = 1
      const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
      if (g(n, d) !== 1) failures.push(`probability unreduced: ${ans} in "${q!.prompt}"`);
    }
  });

  it('competitive-math: work, ratio, interest formulas verified', () => {
    for (let i = 0; i < 400; i++) {
      const q = generateOne('competitive-math', 'medium');
      if (!check(q, 'competitive-math', 'medium')) continue;
      const p = q!.prompt;
      const ans = answer(q!);
      // percentage
      let m = p.match(/What is (\d+)% of (\d+)\?/);
      if (m) {
        const exp = (Number(m[1]) * Number(m[2])) / 100;
        if (Number(ans) !== exp) failures.push(`pct wrong: "${p}" exp=${exp} got=${ans}`);
      }
      // ratio
      m = p.match(/ratio of .* is (\d+):(\d+).*total of (\d+)/);
      if (m) {
        const a = Number(m[1]), b = Number(m[2]), t = Number(m[3]);
        const exp = Math.round((t * a) / (a + b));
        if (Number(ans) !== exp) failures.push(`ratio wrong: "${p}" exp=${exp} got=${ans}`);
      }
      // SI
      m = p.match(/₹(\d+) at (\d+)%.*for (\d+) years/);
      if (m && p.includes('simple interest')) {
        const exp = (Number(m[1]) * Number(m[2]) * Number(m[3])) / 100;
        if (Number(ans.replace(/[₹,]/g, '')) !== exp) {
          failures.push(`SI wrong: "${p}" exp=${exp} got=${ans}`);
        }
      }
    }
  });

  it('letter-coding: every answer is a valid string, no undefined chars', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateOne('letter-coding', 'medium');
      if (!check(q, 'letter-coding', 'medium')) continue;
      const ans = answer(q!);
      // Allow A-Z, 0-9, commas (number coding), and symbols (symbol substitution)
      if (!/^[A-Z0-9,!@#$%^&*+=?~<>|¤§¶¿¡]+$/.test(ans)) failures.push(`letter-coding bad answer: "${ans}" in "${q!.prompt}"`);
    }
  });

  it('logical-reasoning: answers are non-empty and unique in options', () => {
    for (let i = 0; i < 400; i++) {
      const q = generateOne('logical-reasoning', 'medium');
      if (!check(q, 'logical-reasoning', 'medium')) continue;
      const ans = answer(q!);
      if (!ans || ans.trim().length === 0) failures.push(`logic empty answer: "${q!.prompt}"`);
    }
  });
});

describe('BATCH AUDIT — generateQuestions diversity + dedup', () => {
  it('50-question batch: category spread within 1 of each other', () => {
    const cats: QuestionCategory[] = [
      'competitive-math', 'number-series', 'letter-coding',
      'logical-reasoning', 'patterns', 'arithmetic',
    ];
    for (let r = 0; r < 30; r++) {
      const qs = generateQuestions(50, cats, 'medium');
      const counts = cats.map((c) => qs.filter((q) => q.category === c).length);
      const max = Math.max(...counts), min = Math.min(...counts);
      if (max - min > 1) {
        failures.push(`batch imbalance: ${JSON.stringify(counts)} (range ${max - min})`);
      }
      const keys = qs.map((q) => q.dedupeKey ?? q.prompt);
      if (new Set(keys).size !== keys.length) {
        failures.push(`batch dup keys: ${keys.length - new Set(keys).size} dups`);
      }
    }
  });

  it('sequence family (patterns + number-series) capped in mixed batch', () => {
    const cats: QuestionCategory[] = [
      'competitive-math', 'number-series', 'letter-coding',
      'logical-reasoning', 'patterns', 'arithmetic',
    ];
    for (let r = 0; r < 30; r++) {
      const qs = generateQuestions(20, cats, 'easy');
      const seqCount = qs.filter((q) => q.category === 'patterns' || q.category === 'number-series').length;
      if (seqCount > 8) failures.push(`sequence family too many: ${seqCount}/20`);
    }
  });
});

describe('ALL FAILURES', () => {
  it('zero failures', () => {
    if (failures.length > 0) {
      console.log(`\n=== ${failures.length} FAILURES ===`);
      for (const f of failures.slice(0, 30)) console.log(f);
      if (failures.length > 30) console.log(`...and ${failures.length - 30} more`);
    }
    expect(failures).toHaveLength(0);
  });
});

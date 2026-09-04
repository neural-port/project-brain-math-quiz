import type { Difficulty, Question, QuestionCategory } from './types';
import { generateVisualQuestion } from './visual-generator';

// ─── Utilities ──────────────────────────────────────────────────────────────

let questionCounter = 0;
function makeId(category: string): string {
  questionCounter++;
  return `gen-${category}-${questionCounter}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Build a multiple-choice question. Distractors are always unique + != correct. */
function mcq(
  category: QuestionCategory,
  difficulty: Difficulty,
  prompt: string,
  correct: number | string,
  distractors: (number | string)[],
  explanation: string,
): Question {
  const correctStr = String(correct);
  const seen = new Set<string>([correctStr]);
  const uniqueDistractors: string[] = [];
  for (const d of distractors) {
    const ds = String(d);
    if (!seen.has(ds)) {
      seen.add(ds);
      uniqueDistractors.push(ds);
    }
    if (uniqueDistractors.length === 3) break;
  }
  // Pad if needed
  let pad = 1;
  while (uniqueDistractors.length < 3) {
    const d = String(Number(correctStr) + pad);
    if (!seen.has(d)) {
      seen.add(d);
      uniqueDistractors.push(d);
    }
    pad++;
  }
  const options = shuffle([correctStr, ...uniqueDistractors]);
  return {
    id: makeId(category),
    category,
    difficulty,
    source: 'generator',
    prompt,
    options,
    answerIndex: options.indexOf(correctStr),
    explanation,
  };
}

/** Generate 3 wrong answers near the correct one. */
function near(correct: number, spread: number): number[] {
  const result = new Set<number>();
  let tries = 0;
  while (result.size < 3 && tries < 30) {
    const delta = randInt(-spread, spread);
    if (delta !== 0) result.add(correct + delta);
    tries++;
  }
  let pad = 1;
  while (result.size < 3) {
    result.add(correct + pad);
    pad++;
  }
  return [...result].slice(0, 3);
}

// ─── Statistics (basic: mean, median, mode, range) ───────────────────────────

function genStatistics(difficulty: Difficulty): Question {
  const type = pick(['mean', 'mean', 'median', 'mode', 'range']);
  const n = difficulty === 'hard' ? 6 : difficulty === 'medium' ? 5 : 4;
  const max = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 30 : 50;
  const data = Array.from({ length: n }, () => randInt(1, max));
  data.sort((a, b) => a - b);

  if (type === 'mean') {
    // Regenerate until the mean is an exact integer — a rounded decimal like
    // "4.8" would mark the WRONG value as correct (true mean 4.75).
    let meanData: number[];
    let sum: number;
    do {
      meanData = Array.from({ length: n }, () => randInt(1, max));
      sum = meanData.reduce((s, x) => s + x, 0);
    } while (sum % n !== 0);
    const answer = sum / n;
    const prompt = `What is the mean (average) of: ${meanData.join(', ')}?`;
    return mcq(
      'statistics', difficulty, prompt,
      answer,
      near(answer, 2),
      `Add them up: ${meanData.join(' + ')} = ${sum}. Divide by ${n}: ${sum} ÷ ${n} = ${answer}`,
    );
  }

  if (type === 'median') {
    const answer = n % 2 === 0
      ? (data[n / 2 - 1] + data[n / 2]) / 2
      : data[Math.floor(n / 2)];
    const isInt = Number.isInteger(answer);
    const prompt = `What is the median of: ${data.join(', ')}?`;
    return mcq(
      'statistics', difficulty, prompt,
      isInt ? answer : answer.toFixed(1),
      isInt ? near(answer, 2) : [data[n / 2 - 1], data[n / 2], (answer + 1).toFixed(1)],
      `Sorted: ${data.join(', ')}. The median is the middle value = ${isInt ? answer : answer.toFixed(1)}`,
    );
  }

  if (type === 'mode') {
    const val = randInt(1, 8);
    // All other values must be distinct AND different from val — otherwise the
    // data could have two modes (e.g. [3,3,5,5] → 3 and 5 are both modes).
    const others = new Set<number>();
    while (others.size < n - 2) {
      const v = randInt(1, 8);
      if (v !== val) others.add(v);
    }
    const data2 = [val, val, ...others].sort((a, b) => a - b);
    const prompt = `What is the mode (most frequent value) of: ${data2.join(', ')}?`;
    return mcq(
      'statistics', difficulty, prompt,
      val,
      near(val, 2),
      `The mode is the value that appears most often. ${val} appears twice = ${val}`,
    );
  }

  // range
  const answer = data[n - 1] - data[0];
  const prompt = `What is the range of: ${data.join(', ')}?`;
  return mcq(
    'statistics', difficulty, prompt,
    answer,
    near(answer, 3),
    `Range = biggest − smallest = ${data[n - 1]} − ${data[0]} = ${answer}`,
  );
}

// ─── Derivatives (basic power rule only) ─────────────────────────────────────

function genCalculus(difficulty: Difficulty): Question {
  // Only power rule: d/dx [ax^n] = a*n*x^(n-1)
  const n = difficulty === 'easy' ? randInt(2, 4) : randInt(2, 6);
  const a = randInt(1, difficulty === 'hard' ? 8 : 5);
  const coef = a * n;
  const exp = n - 1;

  const prompt = `What is the derivative of  ${a}x^${n}  ?`;

  // Correct answer
  const correct = exp === 1 ? `${coef}x` : `${coef}x^${exp}`;

  // Common mistakes as distractors
  const distractors = [
    `${a}x^${n}`,      // forgot to apply power rule
    `${a * n}x^${n}`,  // didn't reduce exponent
    `${a}x^${exp}`,    // didn't multiply coefficient
  ];

  return mcq('calculus', difficulty, prompt, correct, distractors,
    `Power rule: d/dx[ax^n] = a×n×x^(n-1) = ${a}×${n}×x^${exp} = ${correct}`,
  );
}

// ─── Matrices (basic 2×2: determinant, trace, add) ───────────────────────────

function genLinearAlgebra(difficulty: Difficulty): Question {
  const type = pick(['determinant', 'determinant', 'trace', 'add']);

  if (type === 'determinant') {
    const a = randInt(1, 9);
    const b = randInt(1, 9);
    const c = randInt(1, 9);
    const d = randInt(1, 9);
    const answer = a * d - b * c;
    const prompt = `What is the determinant of this 2×2 matrix?\n\n  | ${a}  ${b} |\n  | ${c}  ${d} |`;
    return mcq(
      'linear-algebra', difficulty, prompt,
      answer,
      near(answer, 5),
      `det = (${a}×${d}) − (${b}×${c}) = ${a * d} − ${b * c} = ${answer}`,
    );
  }

  if (type === 'trace') {
    const a = randInt(1, 9);
    const b = randInt(1, 9);
    const c = randInt(1, 9);
    const d = randInt(1, 9);
    const answer = a + d;
    const prompt = `What is the trace of this 2×2 matrix?\n\n  | ${a}  ${b} |\n  | ${c}  ${d} |`;
    return mcq(
      'linear-algebra', difficulty, prompt,
      answer,
      near(answer, 3),
      `Trace = sum of diagonal = ${a} + ${d} = ${answer}`,
    );
  }

  // add two 2×2 matrices, ask for one entry
  const a1 = randInt(1, 9), b1 = randInt(1, 9);
  const c1 = randInt(1, 9), d1 = randInt(1, 9);
  const a2 = randInt(1, 9), b2 = randInt(1, 9);
  const c2 = randInt(1, 9), d2 = randInt(1, 9);
  const pos = pick(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  let answer: number;
  let posLabel: string;

  switch (pos) {
    case 'top-left':     answer = a1 + a2; posLabel = 'top-left'; break;
    case 'top-right':    answer = b1 + b2; posLabel = 'top-right'; break;
    case 'bottom-left':  answer = c1 + c2; posLabel = 'bottom-left'; break;
    default:             answer = d1 + d2; posLabel = 'bottom-right'; break;
  }

  const prompt = `Add these two matrices. What is the ${posLabel} entry of the result?\n\n  | ${a1}  ${b1} |   | ${a2}  ${b2} |\n  | ${c1}  ${d1} | + | ${c2}  ${d2} |`;
  return mcq(
    'linear-algebra', difficulty, prompt,
    answer,
    near(answer, 3),
    `Add the ${posLabel} entries together. Answer = ${answer}`,
  );
}

// ─── Equations (simple: solve for x) ─────────────────────────────────────────

function genAlgebra(difficulty: Difficulty): Question {
  // Simple linear: ax + b = c  →  x = (c - b) / a
  // Keep it clean: ensure x is a small integer
  const a = randInt(2, difficulty === 'hard' ? 8 : 6);
  const x = randInt(1, 15);
  const b = randInt(0, 20);
  const c = a * x + b;

  const prompt = `Solve for x:  ${a}x + ${b} = ${c}`;
  return mcq(
    'algebra', difficulty, prompt,
    x,
    near(x, 2),
    `${a}x + ${b} = ${c}  →  ${a}x = ${c - b}  →  x = ${c - b} ÷ ${a} = ${x}`,
  );
}

// ─── Simple arithmetic (warm-up category) ────────────────────────────────────

function genArithmetic(difficulty: Difficulty): Question {
  const max = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 80 : 150;
  const op = pick(['+', '-', '×']);
  let a = randInt(2, max);
  let b = randInt(2, max);
  let answer: number;
  let prompt: string;
  let work: string;

  switch (op) {
    case '+':
      answer = a + b;
      prompt = `What is ${a} + ${b}?`;
      work = `${a} + ${b} = ${answer}`;
      break;
    case '-':
      if (b > a) [a, b] = [b, a];
      answer = a - b;
      prompt = `What is ${a} − ${b}?`;
      work = `${a} − ${b} = ${answer}`;
      break;
    default: // ×
      a = randInt(2, difficulty === 'hard' ? 15 : difficulty === 'medium' ? 12 : 9);
      b = randInt(2, difficulty === 'hard' ? 15 : difficulty === 'medium' ? 12 : 9);
      answer = a * b;
      prompt = `What is ${a} × ${b}?`;
      work = `${a} × ${b} = ${answer}`;
      break;
  }

  return mcq('arithmetic', difficulty, prompt, answer, near(answer, Math.max(3, Math.floor(answer * 0.1))), work);
}

// ─── Probability (basic: dice, coins, simple fractions) ──────────────────────

function genProbability(difficulty: Difficulty): Question {
  const type = pick(['dice', 'dice-sum', 'coins', 'marbles', 'marbles-2color', 'card']);

  if (type === 'dice') {
    const target = randInt(1, 6);
    const prompt = `What is the probability of rolling a ${target} on a standard 6-sided die?`;
    return mcq(
      'probability', difficulty, prompt,
      '1/6',
      ['1/3', '1/2', '1/12'],
      `There's 1 favorable outcome (${target}) out of 6 possible outcomes = 1/6`,
    );
  }

  if (type === 'dice-sum') {
    // Two dice, sum to 7
    const prompt = `If you roll two dice, what is the probability the sum is 7?`;
    return mcq(
      'probability', difficulty, prompt,
      '1/6',
      ['1/12', '1/36', '7/36'],
      `There are 6 ways to get sum 7 out of 36 total outcomes = 6/36 = 1/6`,
    );
  }

  if (type === 'coins') {
    const n = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    const prompt = `If you flip ${n} coins, what is the probability of getting all heads?`;
    const total = Math.pow(2, n);
    return mcq(
      'probability', difficulty, prompt,
      `1/${total}`,
      [`1/${total / 2}`, `1/${total * 2}`, `${n}/${total}`],
      `Each coin has 1/2 chance. So (1/2)^${n} = 1/${total}`,
    );
  }

  if (type === 'marbles' || type === 'marbles-2color') {
    const red = randInt(1, 8);
    const blue = randInt(1, 8);
    const green = type === 'marbles-2color' ? 0 : randInt(1, 6);
    const total = red + blue + green;
    const frac = (num: number, den: number) => {
      const g = gcd(num, den);
      return `${num / g}/${den / g}`;
    };
    const correctStr = frac(red, total);
    const correctVal = red / total;
    // Distractors must differ in VALUE, not just in string form — an
    // unreduced "4/8" is the same probability as the correct "1/2".
    const pool = [
      frac(blue, total), frac(red + 1, total), red - 1 >= 1 ? frac(red - 1, total) : '',
      frac(red, total + 1), frac(red + 2, total), frac(blue + 1, total + 1),
    ];
    const seen = new Set<string>([correctStr]);
    const distractors: string[] = [];
    for (const c of pool) {
      if (!c) continue;
      const [cn, cd] = c.split('/').map(Number);
      if (cn / cd === correctVal || seen.has(c)) continue;
      seen.add(c);
      distractors.push(c);
      if (distractors.length === 3) break;
    }
    const colorLabel = green > 0
      ? `${red} red, ${blue} blue, and ${green} green marbles`
      : `${red} red and ${blue} blue marbles`;
    const prompt = `A bag has ${colorLabel}. What is the probability of picking a red marble?`;
    return mcq(
      'probability', difficulty, prompt,
      correctStr,
      distractors,
      `${red} red out of ${total} total = ${red}/${total} = ${correctStr}`,
    );
  }

  // card
  const prompt = `What is the probability of drawing a king from a standard 52-card deck?`;
  return mcq(
    'probability', difficulty, prompt,
    '1/13',
    ['1/52', '1/26', '1/4'],
    `4 kings out of 52 cards = 4/52 = 1/13`,
  );
}

// ─── Number Patterns ─────────────────────────────────────────────────────────

function genPatterns(difficulty: Difficulty): Question {
  const type = pick(
    difficulty === 'easy'
      ? ['add', 'add', 'sub', 'double', 'step5']
      : difficulty === 'medium'
        ? ['add', 'sub', 'mult', 'square', 'alt', 'mixed']
        : ['mult', 'square', 'alt', 'fib', 'mixed', 'sub'],
  );

  if (type === 'add' || type === 'sub') {
    const d = randInt(2, difficulty === 'easy' ? 9 : 15);
    const s = type === 'add' ? randInt(1, 30) : randInt(4 * d + 2, 99);
    const seq = type === 'add' ? [s, s + d, s + 2 * d, s + 3 * d] : [s, s - d, s - 2 * d, s - 3 * d];
    const answer = type === 'add' ? s + 4 * d : s - 4 * d;
    return mcq(
      'patterns', difficulty,
      `What number comes next? ${seq.join(', ')}, ?`,
      answer,
      near(answer, Math.min(d, 8)),
      `Each step ${type === 'add' ? 'adds' : 'subtracts'} ${d}. So ${seq[3]} ${type === 'add' ? '+' : '−'} ${d} = ${answer}`,
    );
  }

  if (type === 'double' || type === 'mult') {
    const s = type === 'double' ? randInt(1, 8) : randInt(1, 5);
    const r = type === 'double' ? 2 : pick([2, 3]);
    const seq = [s, s * r, s * r * r, s * r * r * r];
    const answer = s * r * r * r * r;
    return mcq(
      'patterns', difficulty,
      `What number comes next? ${seq.join(', ')}, ?`,
      answer,
      near(answer, Math.max(4, r * 3)),
      `Each term is ×${r}. So ${seq[3]} × ${r} = ${answer}`,
    );
  }

  if (type === 'square') {
    const b = randInt(1, 8);
    const seq = [b * b, (b + 1) * (b + 1), (b + 2) * (b + 2), (b + 3) * (b + 3)];
    const answer = (b + 4) * (b + 4);
    return mcq(
      'patterns', difficulty,
      `What number comes next? ${seq.join(', ')}, ?`,
      answer,
      near(answer, 4),
      `These are consecutive squares: ${b}², ${b + 1}², ${b + 2}², ${b + 3}², so next is ${b + 4}² = ${answer}`,
    );
  }

  if (type === 'alt') {
    const a = randInt(2, 20);
    const b = a + randInt(3, 12);
    const seq = [a, b, a, b, a];
    return mcq(
      'patterns', difficulty,
      `What number comes next? ${seq.join(', ')}, ?`,
      b,
      [a, a + 1, b + 1],
      `The pattern alternates: ${a}, ${b}, ${a}, ${b}… so next is ${b}`,
    );
  }

  if (type === 'fib') {
    const a = randInt(1, 5);
    const b = randInt(1, 7);
    const seq = [a, b, a + b, a + 2 * b, 2 * a + 3 * b];
    const answer = 3 * a + 5 * b;
    return mcq(
      'patterns', difficulty,
      `What number comes next? ${seq.join(', ')}, ?`,
      answer,
      near(answer, 4),
      `Each term is the sum of the two before it (Fibonacci-style): ${seq[3]} + ${seq[4]} = ${answer}`,
    );
  }

  if (type === 'step5') {
    const s = randInt(5, 50);
    const seq = [s, s + 5, s + 10, s + 15];
    const answer = s + 20;
    return mcq(
      'patterns', difficulty,
      `What number comes next? ${seq.join(', ')}, ?`,
      answer,
      near(answer, 5),
      `Each step adds 5. So ${s + 15} + 5 = ${answer}`,
    );
  }

  // mixed: two alternating arithmetic streams, e.g. 2, 10, 4, 8, 6, ? → 6 (subtract 2 from even stream)
  const a = randInt(1, 9);
  const b = randInt(20, 40);
  const seq = [a, b, a + 2, b - 4, a + 4];
  const answer = b - 8;
  return mcq(
    'patterns', difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    near(answer, 4),
    `Two interleaved patterns: ${a}, ${a + 2}, ${a + 4}… and ${b}, ${b - 4}, ${b - 8}. So next is ${answer}`,
  );
}

// ─── Generator Registry ──────────────────────────────────────────────────────

const GENERATORS: Record<string, (d: Difficulty) => Question> = {
  arithmetic: genArithmetic,
  algebra: genAlgebra,
  geometry: (difficulty) => generateVisualQuestion('geometry', difficulty),
  'visual-reasoning': (difficulty) => generateVisualQuestion('visual-reasoning', difficulty),
  memory: (difficulty) => generateVisualQuestion('memory', difficulty),
  patterns: genPatterns,
  fractions: (difficulty) => generateVisualQuestion('fractions', difficulty),
  'linear-algebra': genLinearAlgebra,
  calculus: genCalculus,
  probability: genProbability,
  statistics: genStatistics,
};

export function generateQuestions(
  count: number,
  categories: QuestionCategory[],
  difficulty: Difficulty,
  existingPrompts?: Set<string>,
): Question[] {
  const seen = existingPrompts ?? new Set<string>();
  const result: Question[] = [];
  const genCats = categories.filter((c) => GENERATORS[c]);
  if (genCats.length === 0) return result;

  // Phase 1: generate unseen questions. A category is dropped after too many
  // consecutive "already seen" misses, so exhausted pools don't stall the loop.
  let attempts = 0;
  const maxAttempts = count * 20;
  const alive = new Set(genCats);
  const catMisses = new Map<string, number>();

  while (result.length < count && attempts < maxAttempts && alive.size > 0) {
    const cat = pick([...alive]);
    const q = GENERATORS[cat](difficulty);
    const key = q.dedupeKey ?? q.prompt;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(q);
      catMisses.delete(cat);
    } else {
      const misses = (catMisses.get(cat) ?? 0) + 1;
      catMisses.set(cat, misses);
      if (misses >= 6 && alive.size > 1) alive.delete(cat);
    }
    attempts++;
  }

  // Phase 2: if we couldn't get enough unseen questions, fill the rest
  // with any questions (including seen ones) so the game always works.
  let fallbackAttempts = 0;
  while (result.length < count && fallbackAttempts < count * 5) {
    const cat = pick(genCats);
    const q = GENERATORS[cat](difficulty);
    const key = q.dedupeKey ?? q.prompt;
    if (!result.some((item) => (item.dedupeKey ?? item.prompt) === key)) {
      result.push(q);
    }
    fallbackAttempts++;
  }

  return result;
}

export function generateOne(category: QuestionCategory, difficulty: Difficulty): Question | null {
  const gen = GENERATORS[category];
  return gen ? gen(difficulty) : null;
}

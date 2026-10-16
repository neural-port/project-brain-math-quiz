import type { Difficulty, Question, QuestionCategory } from './types';
import { generateVisualQuestion } from './visual-generator';
import { generateCompetitiveMath } from './competitive-generator';
import { generateNumberSeries } from './series-generator';
import { generateLetterCoding } from './coding-generator';
import { generateLogicalReasoning } from './logic-generator';

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

/** Convert digits/letters to Unicode superscripts for math notation (x^4 → x⁴). */
function sup(value: number | string): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    'n': 'ⁿ', 'T': 'ᵀ', '-': '⁻',
  };
  return String(value).split('').map((ch) => map[ch] ?? ch).join('');
}

/** Build a multiple-choice question. Distractors are always unique + != correct. */
function mcq(
  category: QuestionCategory,
  difficulty: Difficulty,
  prompt: string,
  correct: number | string,
  distractors: (number | string)[],
  explanation: string,
  dedupeKey?: string,
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
  // Pad if needed. Extract the numeric prefix so unit-suffixed or
  // text answers don't produce "NaN" fallback distractors.
  const numericMatch = correctStr.match(/-?\d+(\.\d+)?/);
  const baseNum = numericMatch ? Number(numericMatch[0]) : 0;
  const suffix = numericMatch ? correctStr.slice(numericMatch[0].length) : '';
  let pad = 1;
  while (uniqueDistractors.length < 3) {
    const d = `${baseNum + pad}${suffix}`;
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
    dedupeKey,
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
      `Step 1: Add all values: ${meanData.join(' + ')} = ${sum}.\nStep 2: Count the values: ${n}.\nStep 3: Mean = sum ÷ count = ${sum} ÷ ${n} = ${answer}.\nAnswer: ${answer}`,
      `stats-mean:${sum}:${n}`,
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
      `Step 1: Arrange the data in order: ${data.join(', ')}.\nStep 2: ${n % 2 === 0 ? `With ${n} values (even), the median is the average of the two middle values: positions ${n / 2} and ${n / 2 + 1} (${data[n / 2 - 1]} and ${data[n / 2]}).` : `With ${n} values (odd), the median is the middle value at position ${Math.floor(n / 2) + 1}.`}\nStep 3: Median = ${isInt ? answer : answer.toFixed(1)}.\nAnswer: ${isInt ? answer : answer.toFixed(1)}`,
      `stats-median:${data.join(',')}`,
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
      `Step 1: Count how many times each value appears.\nStep 2: ${val} appears twice — more than any other value.\nStep 3: Mode = ${val}.\nAnswer: ${val}`,
      `stats-mode:${val}`,
    );
  }

  // range
  const answer = data[n - 1] - data[0];
  const prompt = `What is the range of: ${data.join(', ')}?`;
  return mcq(
    'statistics', difficulty, prompt,
    answer,
    near(answer, 3),
    `Step 1: Identify the largest value: ${data[n - 1]}.\nStep 2: Identify the smallest value: ${data[0]}.\nStep 3: Range = largest − smallest = ${data[n - 1]} − ${data[0]} = ${answer}.\nAnswer: ${answer}`,
    `stats-range:${data[0]}:${data[n - 1]}`,
  );
}

// ─── Derivatives (basic power rule only) ─────────────────────────────────────

function genCalculus(difficulty: Difficulty): Question {
  // Only power rule: d/dx [axⁿ] = a·n·xⁿ⁻¹
  const n = difficulty === 'easy' ? randInt(2, 4) : randInt(2, 6);
  const a = randInt(1, difficulty === 'hard' ? 8 : 5);
  const coef = a * n;
  const exp = n - 1;

  const prompt = `What is the derivative of  ${a}x${sup(n)}  ?`;

  // Correct answer
  const correct = exp === 1 ? `${coef}x` : `${coef}x${sup(exp)}`;

  // Common mistakes as distractors
  const distractors = [
    `${a}x${sup(n)}`,      // forgot to apply power rule
    `${a * n}x${sup(n)}`,  // didn't reduce exponent
    `${a}x${sup(exp)}`,    // didn't multiply coefficient
  ];

  return mcq('calculus', difficulty, prompt, correct, distractors,
    `Step 1: Apply the power rule: d/dx[axⁿ] = a × n × xⁿ⁻¹.\nStep 2: Multiply coefficient by exponent: ${a} × ${n} = ${coef}.\nStep 3: Reduce exponent by 1: ${n} − 1 = ${exp}.\nAnswer: ${correct}`,
    `calculus-power:${a}:${n}`,
  );
}

// ─── Matrices & Vectors (2×2 determinant, trace, add, dot product, magnitude) ─

function genLinearAlgebra(difficulty: Difficulty): Question {
  const type = pick(['determinant', 'trace', 'add', 'dot', 'magnitude'] as const);

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
      `Step 1: For a 2×2 matrix | a b |   the determinant = (a × d) − (b × c).\n                                     | c d |\nStep 2: Calculate: (${a} × ${d}) − (${b} × ${c}) = ${a * d} − ${b * c}.\nStep 3: det = ${answer}.\nAnswer: ${answer}`,
      `la-det:${a}:${b}:${c}:${d}`,
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
      `Step 1: The trace of a matrix is the sum of its diagonal elements (top-left to bottom-right).\nStep 2: Diagonal elements are ${a} (top-left) and ${d} (bottom-right).\nStep 3: Trace = ${a} + ${d} = ${answer}.\nAnswer: ${answer}`,
      `la-trace:${a}:${d}`,
    );
  }

  if (type === 'dot') {
    const dim = difficulty === 'hard' ? 3 : 2;
    const u = Array.from({ length: dim }, () => randInt(1, 7));
    const v = Array.from({ length: dim }, () => randInt(1, 7));
    const products = u.map((ui, i) => ui * v[i]);
    const answer = products.reduce((s, x) => s + x, 0);
    const prompt = `What is the dot product of vectors u = (${u.join(', ')}) and v = (${v.join(', ')})?`;
    return mcq(
      'linear-algebra', difficulty, prompt,
      answer,
      near(answer, 4),
      `Step 1: Multiply corresponding components: ${u.map((ui, i) => `${ui} × ${v[i]} = ${products[i]}`).join(', ')}.\nStep 2: Sum the products: ${products.join(' + ')} = ${answer}.\nAnswer: ${answer}`,
      `la-dot:${u.join(',')}:${v.join(',')}`,
    );
  }

  if (type === 'magnitude') {
    const triples: [number, number, number][] = [
      [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10],
      [5, 12, 13], [12, 5, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17],
    ];
    const [vx, vy, answer] = pick(triples);
    const prompt = `What is the magnitude (Euclidean norm ||v||) of the vector v = (${vx}, ${vy})?`;
    return mcq(
      'linear-algebra', difficulty, prompt,
      answer,
      [vx + vy, Math.max(1, Math.abs(vx - vy)), answer + 2],
      `Step 1: For a 2D vector (x, y), magnitude ||v|| = √(x² + y²).\nStep 2: Calculate: √(${vx}² + ${vy}²) = √(${vx ** 2} + ${vy ** 2}) = √${vx ** 2 + vy ** 2}.\nStep 3: ||v|| = ${answer}.\nAnswer: ${answer}`,
      `la-mag:${vx}:${vy}`,
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
    `Step 1: To add two matrices, add corresponding entries.\nStep 2: The ${posLabel} entries are ${pos === 'top-left' ? a1 + ' and ' + a2 : pos === 'top-right' ? b1 + ' and ' + b2 : pos === 'bottom-left' ? c1 + ' and ' + c2 : d1 + ' and ' + d2}.\nStep 3: ${pos === 'top-left' ? a1 + ' + ' + a2 : pos === 'top-right' ? b1 + ' + ' + b2 : pos === 'bottom-left' ? c1 + ' + ' + c2 : d1 + ' + ' + d2} = ${answer}.\nAnswer: ${answer}`,
    `la-add:${posLabel}:${a1}:${b1}:${c1}:${d1}:${a2}:${b2}:${c2}:${d2}`,
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
    `Step 1: Start with the equation: ${a}x + ${b} = ${c}.\nStep 2: Subtract ${b} from both sides: ${a}x = ${c} − ${b} = ${c - b}.\nStep 3: Divide both sides by ${a}: x = ${c - b} ÷ ${a} = ${x}.\nAnswer: x = ${x}`,
    `algebra-linear:${a}:${b}:${c}`,
  );
}

// ─── Simple arithmetic (warm-up category) ────────────────────────────────────

function genArithmetic(difficulty: Difficulty): Question {
  const max = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 80 : 150;
  const op = pick(['+', '-', '×', '÷'] as const);
  let a = randInt(2, max);
  let b = randInt(2, max);
  let answer: number;
  let prompt: string;
  let work: string;

  switch (op) {
    case '+':
      answer = a + b;
      prompt = `What is ${a} + ${b}?`;
      work = `Step 1: Add the two numbers: ${a} + ${b}.\nStep 2: ${a} + ${b} = ${answer}.\nAnswer: ${answer}`;
      break;
    case '-':
      if (b > a) [a, b] = [b, a];
      answer = a - b;
      prompt = `What is ${a} − ${b}?`;
      work = `Step 1: Subtract the smaller from the larger: ${a} − ${b}.\nStep 2: ${a} − ${b} = ${answer}.\nAnswer: ${answer}`;
      break;
    case '÷':
      b = randInt(2, difficulty === 'hard' ? 15 : difficulty === 'medium' ? 12 : 9);
      answer = randInt(2, difficulty === 'hard' ? 18 : difficulty === 'medium' ? 12 : 9);
      a = b * answer;
      prompt = `What is ${a} ÷ ${b}?`;
      work = `Step 1: Divide ${a} by ${b} (since ${b} × ${answer} = ${a}).\nStep 2: ${a} ÷ ${b} = ${answer}.\nAnswer: ${answer}`;
      break;
    default: // ×
      a = randInt(2, difficulty === 'hard' ? 15 : difficulty === 'medium' ? 12 : 9);
      b = randInt(2, difficulty === 'hard' ? 15 : difficulty === 'medium' ? 12 : 9);
      answer = a * b;
      prompt = `What is ${a} × ${b}?`;
      work = `Step 1: Multiply the two numbers: ${a} × ${b}.\nStep 2: ${a} × ${b} = ${answer}.\nAnswer: ${answer}`;
      break;
  }

  return mcq('arithmetic', difficulty, prompt, answer, near(answer, Math.max(3, Math.floor(answer * 0.1))), work, `arith-${op}:${a}:${b}`);
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
      `Step 1: A standard die has 6 faces: 1, 2, 3, 4, 5, 6.\nStep 2: Only 1 face shows ${target} — that's 1 favorable outcome.\nStep 3: Probability = favorable ÷ total = 1 ÷ 6 = 1/6.\nAnswer: 1/6`,
      `prob-dice:${target}`,
    );
  }

  if (type === 'dice-sum') {
    // Two dice, sum to 7
    const prompt = `If you roll two dice, what is the probability the sum is 7?`;
    return mcq(
      'probability', difficulty, prompt,
      '1/6',
      ['1/12', '1/36', '7/36'],
      `Step 1: Two dice → 6 × 6 = 36 total outcomes.\nStep 2: Ways to get sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 ways.\nStep 3: Probability = 6 ÷ 36 = 1/6.\nAnswer: 1/6`,
      `prob-dice-sum:7`,
    );
  }

  if (type === 'coins') {
    const n = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    const prompt = `If you flip ${n} coins, what is the probability of getting all heads?`;
    const total = Math.pow(2, n);
    return mcq(
      'probability', difficulty, prompt,
      `1/${total}`,
      [`1/${total + 1}`, `1/${total * 2}`, `1/${total - 1}`],
      `Step 1: Each coin has 2 outcomes (heads or tails). With ${n} coins, total outcomes = 2${sup(n)} = ${total}.\nStep 2: Only 1 outcome has all heads: HHH${n > 2 ? '…' : ''} (all ${n} coins show heads).\nStep 3: Probability = 1 ÷ ${total} = 1/${total}.\nAnswer: 1/${total}`,
      `prob-coins:${n}`,
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
      `Step 1: Count the red marbles: ${red}.\nStep 2: Count the total marbles: ${red} + ${blue}${green > 0 ? ' + ' + green : ''} = ${total}.\nStep 3: Probability = red ÷ total = ${red} ÷ ${total} = ${red}/${total} = ${correctStr}.\nAnswer: ${correctStr}`,
      `prob-marbles:${red}:${blue}:${green}`,
    );
  }

  // card
  const prompt = `What is the probability of drawing a king from a standard 52-card deck?`;
  return mcq(
    'probability', difficulty, prompt,
    '1/13',
    ['1/52', '1/26', '1/4'],
    `Step 1: A standard deck has 52 cards, with 4 kings (one per suit).\nStep 2: Favorable outcomes = 4 (the 4 kings).\nStep 3: Probability = 4 ÷ 52 = 1/13.\nAnswer: 1/13`,
    `prob-card:king`,
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
      `Step 1: Find the difference between consecutive terms: ${type === 'add' ? `${seq[1]} − ${seq[0]} = ${d}, ${seq[2]} − ${seq[1]} = ${d}` : `${seq[0]} − ${seq[1]} = ${d}, ${seq[1]} − ${seq[2]} = ${d}`}.\nStep 2: The pattern ${type === 'add' ? 'adds' : 'subtracts'} ${d} each time.\nStep 3: Next = ${seq[3]} ${type === 'add' ? '+' : '−'} ${d} = ${answer}.\nAnswer: ${answer}`,
      `pat-${type}:${s}:${d}`,
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
      `Step 1: Check the ratio: ${seq[1]} ÷ ${seq[0]} = ${r}, ${seq[2]} ÷ ${seq[1]} = ${r}.\nStep 2: Each term is multiplied by ${r}.\nStep 3: Next = ${seq[3]} × ${r} = ${answer}.\nAnswer: ${answer}`,
      `pat-${type}:${s}:${r}`,
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
      `Step 1: Check if terms are perfect squares: ${seq[0]} = ${b}², ${seq[1]} = ${b + 1}², ${seq[2]} = ${b + 2}², ${seq[3]} = ${b + 3}².\nStep 2: The pattern is consecutive squares.\nStep 3: Next = ${b + 4}² = ${answer}.\nAnswer: ${answer}`,
      `pat-square:${b}`,
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
      `Step 1: Look at the sequence: ${seq.join(', ')}.\nStep 2: The pattern alternates between ${a} and ${b}.\nStep 3: Following the pattern, the next value is ${b}.\nAnswer: ${b}`,
      `pat-alt:${a}:${b}`,
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
      `Step 1: Check if each term = sum of the two before it.\nStep 2: ${seq[2]} = ${seq[0]} + ${seq[1]}, ${seq[3]} = ${seq[1]} + ${seq[2]}, ${seq[4]} = ${seq[2]} + ${seq[3]} — confirmed.\nStep 3: Next = ${seq[3]} + ${seq[4]} = ${answer}.\nAnswer: ${answer}`,
      `pat-fib:${a}:${b}`,
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
      `Step 1: Find the difference: ${seq[1]} − ${seq[0]} = 5, ${seq[2]} − ${seq[1]} = 5 — constant.\nStep 2: The pattern adds 5 each step.\nStep 3: Next = ${s + 15} + 5 = ${answer}.\nAnswer: ${answer}`,
      `pat-step5:${s}`,
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
    `Step 1: Split into two interleaved sequences.\nStep 2: Odd positions: ${a}, ${a + 2}, ${a + 4}… (adding 2). Even positions: ${b}, ${b - 4}… (subtracting 4).\nStep 3: Next is an even position: ${b - 4} − 4 = ${answer}.\nAnswer: ${answer}`,
    `pat-mixed:${a}:${b}`,
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
  'competitive-math': generateCompetitiveMath,
  'number-series': generateNumberSeries,
  'letter-coding': generateLetterCoding,
  'logical-reasoning': generateLogicalReasoning,
};

function getConceptFamily(category: QuestionCategory): string {
  return category === 'patterns' || category === 'number-series' ? 'sequences' : category;
}

export function generateQuestions(
  count: number,
  categories: QuestionCategory[],
  difficulty: Difficulty,
  existingPrompts?: Set<string>,
): Question[] {
  const seen = existingPrompts ?? new Set<string>();
  const result: Question[] = [];
  const genCats = [...new Set(categories.filter((category) => GENERATORS[category]))];
  if (genCats.length === 0 || count <= 0) return result;

  const batchKeys = new Set<string>();
  const categoryCounts = new Map<QuestionCategory, number>();
  const subtypeCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  // Count how many categories belong to each family so multi-category
  // families (e.g. "sequences" = patterns + number-series) get a
  // proportionally larger cap instead of the same quota as a single
  // category family.
  const familySizes = new Map<string, number>();
  for (const cat of genCats) {
    const f = getConceptFamily(cat);
    familySizes.set(f, (familySizes.get(f) ?? 0) + 1);
  }
  const familyTotal = familySizes.size;
  const categoryLimit = Math.ceil(count / genCats.length);
  const familyLimit = (family: string) =>
    familyTotal > 1
      ? Math.ceil((count * (familySizes.get(family) ?? 1)) / genCats.length) + 1
      : count;
  let subtypeLimit = genCats.length > 1 ? 1 : Math.max(2, Math.ceil(count / 8));
  let allowPreviouslySeen = false;
  let attempts = 0;
  const maxAttempts = Math.max(500, count * 300);

  while (result.length < count && attempts < maxAttempts) {
    const eligible = genCats.filter((category) => {
      const categoryCount = categoryCounts.get(category) ?? 0;
      const family = getConceptFamily(category);
      const familyCount = familyCounts.get(family) ?? 0;
      return categoryCount < categoryLimit && familyCount < familyLimit(family);
    });

    if (eligible.length === 0) break;
    const lowestCount = Math.min(...eligible.map((category) => categoryCounts.get(category) ?? 0));
    const category = pick(eligible.filter((item) => (categoryCounts.get(item) ?? 0) === lowestCount));
    const question = GENERATORS[category](difficulty);
    const key = question.dedupeKey ?? question.prompt;
    const subtype = question.dedupeKey?.split(':')[0] ?? category;

    if (
      !batchKeys.has(key)
      && (allowPreviouslySeen || !seen.has(key))
      && (subtypeCounts.get(subtype) ?? 0) < subtypeLimit
    ) {
      const family = getConceptFamily(category);
      batchKeys.add(key);
      seen.add(key);
      result.push(question);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      subtypeCounts.set(subtype, (subtypeCounts.get(subtype) ?? 0) + 1);
      familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }

    attempts++;
    if (attempts % Math.max(100, count * 20) === 0) subtypeLimit++;
    if (attempts >= Math.max(300, count * 150)) allowPreviouslySeen = true;
  }

  let fallbackAttempts = 0;
  while (result.length < count && fallbackAttempts < count * 100) {
    // Respect family limits in fallback too, but with +2 headroom
    const eligible = genCats.filter((category) => {
      const family = getConceptFamily(category);
      return (familyCounts.get(family) ?? 0) < familyLimit(family) + 2;
    });
    const pool = eligible.length > 0 ? eligible : genCats;
    const lowestCount = Math.min(...pool.map((category) => categoryCounts.get(category) ?? 0));
    const category = pick(pool.filter((item) => (categoryCounts.get(item) ?? 0) === lowestCount));
    const question = GENERATORS[category](difficulty);
    const key = question.dedupeKey ?? question.prompt;
    if (!batchKeys.has(key)) {
      batchKeys.add(key);
      result.push(question);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      const family = getConceptFamily(category);
      familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }
    fallbackAttempts++;
  }

  return result;
}

export function generateOne(category: QuestionCategory, difficulty: Difficulty): Question | null {
  const gen = GENERATORS[category];
  return gen ? gen(difficulty) : null;
}

import type { Difficulty, Question } from './types';

// ─── Utilities ──────────────────────────────────────────────────────────────

let counter = 0;
function makeId(): string {
  counter++;
  return `number-series-${counter}`;
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

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

function mcq(
  difficulty: Difficulty,
  prompt: string,
  correct: number,
  distractors: number[],
  explanation: string,
  dedupeKey: string,
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
  let pad = 1;
  while (uniqueDistractors.length < 3) {
    const d = String(correct + pad++);
    if (!seen.has(d)) {
      seen.add(d);
      uniqueDistractors.push(d);
    }
  }
  const options = shuffle([correctStr, ...uniqueDistractors]);
  return {
    id: makeId(),
    category: 'number-series',
    difficulty,
    source: 'generator',
    prompt,
    options,
    answerIndex: options.indexOf(correctStr),
    explanation,
    dedupeKey,
  };
}

// ─── 1. Arithmetic progression ──────────────────────────────────────────────

function genArithmetic(difficulty: Difficulty): Question {
  const start = randInt(2, 40);
  const step = randInt(2, difficulty === 'hard' ? 20 : 12);
  const seq = [start, start + step, start + 2 * step, start + 3 * step];
  const answer = start + 4 * step;
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [answer - step, answer + step, answer + 2 * step],
    `Step 1: Check the difference between consecutive terms.\nStep 2: ${seq[1]} − ${seq[0]} = ${step}, ${seq[2]} − ${seq[1]} = ${step} — constant difference.\nStep 3: Next term = ${seq[3]} + ${step} = ${answer}.\nAnswer: ${answer}.`,
    `add:${start}:${step}`,
  );
}

// ─── 2. Geometric progression ───────────────────────────────────────────────

function genGeometric(difficulty: Difficulty): Question {
  const start = randInt(1, difficulty === 'hard' ? 8 : 5);
  const ratio = pick([2, 3]);
  const seq = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
  const answer = seq[3] * ratio;
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [seq[3] + ratio, seq[3] * (ratio - 1), answer + 2],
    `Step 1: Check the ratio between consecutive terms.\nStep 2: ${seq[1]} ÷ ${seq[0]} = ${ratio}, ${seq[2]} ÷ ${seq[1]} = ${ratio} — constant ratio.\nStep 3: Next term = ${seq[3]} × ${ratio} = ${answer}.\nAnswer: ${answer}.`,
    `multiply:${start}:${ratio}`,
  );
}

// ─── 3. Squares ─────────────────────────────────────────────────────────────

function genSquares(difficulty: Difficulty): Question {
  const start = randInt(1, difficulty === 'hard' ? 15 : 9);
  const seq = [start, start + 1, start + 2, start + 3].map((n) => n * n);
  const answer = (start + 4) ** 2;
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [(start + 3) ** 2, (start + 5) ** 2, answer + 1],
    `Step 1: Identify the pattern — ${seq[0]} = ${start}², ${seq[1]} = ${start + 1}², ${seq[2]} = ${start + 2}², ${seq[3]} = ${start + 3}².\nStep 2: These are consecutive perfect squares.\nStep 3: Next = ${start + 4}² = ${answer}.\nAnswer: ${answer}.`,
    `squares:${start}`,
  );
}

// ─── 4. Cubes ───────────────────────────────────────────────────────────────

function genCubes(difficulty: Difficulty): Question {
  const start = randInt(1, difficulty === 'hard' ? 8 : 5);
  const seq = [start, start + 1, start + 2, start + 3].map((n) => n ** 3);
  const answer = (start + 4) ** 3;
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [(start + 3) ** 3, (start + 5) ** 3, answer + 3],
    `Step 1: Identify the pattern — ${seq[0]} = ${start}³, ${seq[1]} = ${start + 1}³, ${seq[2]} = ${start + 2}³, ${seq[3]} = ${start + 3}³.\nStep 2: These are consecutive perfect cubes.\nStep 3: Next = ${start + 4}³ = ${answer}.\nAnswer: ${answer}.`,
    `cubes:${start}`,
  );
}

// ─── 5. Squares + constant ──────────────────────────────────────────────────

function genSquaresPlusConst(difficulty: Difficulty): Question {
  const start = randInt(1, difficulty === 'hard' ? 10 : 7);
  const constAdd = randInt(1, difficulty === 'hard' ? 10 : 5);
  const seq = [start, start + 1, start + 2, start + 3].map((n) => n * n + constAdd);
  const answer = (start + 4) ** 2 + constAdd;
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [(start + 4) ** 2, (start + 3) ** 2 + constAdd, answer + constAdd],
    `Step 1: Check if these are pure squares: ${seq[0]} − ${constAdd} = ${seq[0] - constAdd} = ${start}², ${seq[1]} − ${constAdd} = ${start + 1}².\nStep 2: Pattern = n² + ${constAdd}.\nStep 3: Next = ${start + 4}² + ${constAdd} = ${(start + 4) ** 2} + ${constAdd} = ${answer}.\nAnswer: ${answer}.`,
    `squares-plus:${start}:${constAdd}`,
  );
}

// ─── 6. Primes ──────────────────────────────────────────────────────────────

function genPrimes(difficulty: Difficulty): Question {
  // Find 5 consecutive primes starting from a random point
  const startSearch = randInt(2, difficulty === 'hard' ? 20 : 10);
  const primes: number[] = [];
  let n = startSearch;
  while (primes.length < 5) {
    if (isPrime(n)) primes.push(n);
    n++;
  }
  const answer = primes[4];
  const ds = [primes[3] + 6, primes[3] + 8, primes[3] + 10].filter((d) => d !== answer);
  return mcq(
    difficulty,
    `What number comes next? ${primes.slice(0, 4).join(', ')}, ?`,
    answer,
    ds,
    `Step 1: Check if terms are prime: ${primes[0]}, ${primes[1]}, ${primes[2]}, ${primes[3]} — all prime.\nStep 2: These are consecutive prime numbers.\nStep 3: Next prime after ${primes[3]} = ${answer}.\nAnswer: ${answer}.`,
    `primes:${startSearch}`,
  );
}

// ─── 7. Triangular numbers ──────────────────────────────────────────────────

function genTriangular(difficulty: Difficulty): Question {
  const start = randInt(1, difficulty === 'hard' ? 6 : 4);
  const seq = [start, start + 1, start + 2, start + 3].map((n) => (n * (n + 1)) / 2);
  const answer = ((start + 4) * (start + 5)) / 2;
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [((start + 3) * (start + 4)) / 2, ((start + 5) * (start + 6)) / 2, answer + start],
    `Step 1: Check differences: ${seq[1]} − ${seq[0]} = ${seq[1] - seq[0]}, ${seq[2]} − ${seq[1]} = ${seq[2] - seq[1]}, ${seq[3]} − ${seq[2]} = ${seq[3] - seq[2]}.\nStep 2: These are triangular numbers: T(n) = n(n+1)/2.\nStep 3: Next = T(${start + 4}) = ${start + 4} × ${start + 5} ÷ 2 = ${answer}.\nAnswer: ${answer}.`,
    `triangular:${start}`,
  );
}

// ─── 8. Alternating add/subtract ────────────────────────────────────────────

function genAlternating(difficulty: Difficulty): Question {
  const first = randInt(2, 20);
  const second = randInt(30, 60);
  const addStep = randInt(2, 8);
  const subStep = randInt(3, 12);
  const seq = [first, second, first + addStep, second - subStep, first + addStep * 2];
  const answer = second - subStep * 2;
  const ds = [first + addStep * 3, second - subStep * 3, answer + addStep].filter((d) => d !== answer);
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    ds,
    `Step 1: Split into odd and even positions.\nStep 2: Odd positions: ${first}, ${first + addStep}, ${first + addStep * 2} — adding ${addStep} each time.\nStep 3: Even positions: ${second}, ${second - subStep} — subtracting ${subStep} each time. Next even = ${second - subStep} − ${subStep} = ${answer}.\nAnswer: ${answer}.`,
    `alternate:${first}:${second}:${addStep}:${subStep}`,
  );
}

// ─── 9. Alternating multiply/add ────────────────────────────────────────────

function genAltMultiplyAdd(difficulty: Difficulty): Question {
  const start = randInt(2, 6);
  const multiplier = pick([2, 3]);
  const adder = randInt(1, 5);
  const seq = [start, start * multiplier, start * multiplier + adder, (start * multiplier + adder) * multiplier];
  const answer = (start * multiplier + adder) * multiplier + adder;
  const ds = [seq[3] * multiplier, answer + multiplier, answer + adder * 2].filter((d) => d !== answer);
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    ds,
    `Step 1: Identify the operations: ×${multiplier}, +${adder}, ×${multiplier}, +${adder}.\nStep 2: The pattern alternates between multiply and add.\nStep 3: Next operation is +${adder}: ${seq[3]} + ${adder} = ${answer}.\nAnswer: ${answer}.`,
    `alt-mul-add:${start}:${multiplier}:${adder}`,
  );
}

// ─── 10. Fibonacci-style ────────────────────────────────────────────────────

function genFibonacci(difficulty: Difficulty): Question {
  const a = randInt(1, 8);
  const b = randInt(1, 8);
  const seq = [a, b];
  while (seq.length < 5) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
  const answer = seq[3] + seq[4];
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [seq[4] + 1, seq[4] - seq[3], answer + 2],
    `Step 1: Check if each term = sum of previous two.\nStep 2: ${seq[2]} = ${seq[0]} + ${seq[1]} = ${seq[2]}, ${seq[3]} = ${seq[1]} + ${seq[2]} = ${seq[3]}, ${seq[4]} = ${seq[2]} + ${seq[3]} = ${seq[4]}.\nStep 3: Next = ${seq[3]} + ${seq[4]} = ${answer}.\nAnswer: ${answer}.`,
    `fibonacci:${a}:${b}`,
  );
}

// ─── 11. Mixed operations (×n + constant) ───────────────────────────────────

function genMixedOps(difficulty: Difficulty): Question {
  const start = randInt(2, 8);
  const multiplier = pick([2, 3]);
  const adder = randInt(1, difficulty === 'hard' ? 10 : 6);
  const seq = [start, start * multiplier + adder, (start * multiplier + adder) * multiplier + adder];
  // seq[0] = start, seq[1] = start*m+a, seq[2] = (start*m+a)*m+a, seq[3] = seq[2]*m+a
  seq.push(seq[2] * multiplier + adder);
  const answer = seq[3] * multiplier + adder;
  return mcq(
    difficulty,
    `What number comes next? ${seq.join(', ')}, ?`,
    answer,
    [seq[3] + adder, seq[3] * multiplier, answer + adder],
    `Step 1: Check the rule: each term = previous × ${multiplier} + ${adder}.\nStep 2: ${seq[1]} = ${seq[0]} × ${multiplier} + ${adder} = ${seq[1]}, ${seq[2]} = ${seq[1]} × ${multiplier} + ${adder} = ${seq[2]}.\nStep 3: Next = ${seq[3]} × ${multiplier} + ${adder} = ${answer}.\nAnswer: ${answer}.`,
    `mixed-ops:${start}:${multiplier}:${adder}`,
  );
}

// ─── 12. Wrong number in series ─────────────────────────────────────────────

function genWrongNumber(difficulty: Difficulty): Question {
  const start = randInt(2, 10);
  const squares = [start ** 2, (start + 1) ** 2, (start + 2) ** 2, (start + 3) ** 2, (start + 4) ** 2];
  const wrongIndex = randInt(1, 3);
  const wrongValue = squares[wrongIndex] + randInt(1, 4);
  const values = squares.map((v, i) => (i === wrongIndex ? wrongValue : v));
  return mcq(
    difficulty,
    `Which number is wrongly placed in the series? ${values.join(', ')}`,
    wrongValue,
    [squares[wrongIndex], values[wrongIndex - 1], values[wrongIndex + 1]],
    `Step 1: Check if the series follows a pattern of consecutive squares.\nStep 2: Expected: ${squares.join(', ')}.\nStep 3: Position ${wrongIndex + 1} has ${wrongValue} instead of ${squares[wrongIndex]} — that's the wrong number.\nAnswer: ${wrongValue}.`,
    `wrong-square:${start}:${wrongIndex}:${wrongValue}`,
  );
}

// ─── Generator entry point ──────────────────────────────────────────────────

const GENERATORS: ((d: Difficulty) => Question)[] = [
  genArithmetic, genGeometric, genSquares, genCubes, genSquaresPlusConst,
  genPrimes, genTriangular, genAlternating, genAltMultiplyAdd,
  genFibonacci, genMixedOps, genWrongNumber,
];

export function generateNumberSeries(difficulty: Difficulty): Question {
  return pick(GENERATORS)(difficulty);
}

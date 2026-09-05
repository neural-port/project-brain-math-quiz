import type { Difficulty, Question } from './types';

// ─── Utilities ──────────────────────────────────────────────────────────────

let counter = 0;
function makeId(): string {
  counter++;
  return `competitive-math-${counter}`;
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

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** Convert digits to Unicode superscripts for math notation (x^2 → x²). */
function sup(value: number | string): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  };
  return String(value).split('').map((ch) => map[ch] ?? ch).join('');
}

/** Build a multiple-choice question with guaranteed unique distractors.
 *  When isCurrency is true, all options are prefixed with ₹ so the currency
 *  scaler in buildQuestionSet can find and scale monetary amounts. */
function mcq(
  difficulty: Difficulty,
  prompt: string,
  correct: number | string,
  distractors: (number | string)[],
  explanation: string,
  dedupeKey: string,
  isCurrency = false,
): Question {
  const prefix = isCurrency ? '₹' : '';
  const correctStr = `${prefix}${correct}`;
  const seen = new Set<string>([correctStr]);
  const uniqueDistractors: string[] = [];
  for (const d of distractors) {
    const ds = `${prefix}${d}`;
    if (!seen.has(ds)) {
      seen.add(ds);
      uniqueDistractors.push(ds);
    }
    if (uniqueDistractors.length === 3) break;
  }
  // Pad with near-correct numeric distractors if needed.
  // Extract the numeric part from `correct` so unit-suffixed answers
  // like "16 m²" produce "17 m²", not "NaN m²".
  const numericMatch = String(correct).match(/-?\d+(\.\d+)?/);
  const baseNum = numericMatch ? Number(numericMatch[0]) : 0;
  const unitSuffix = numericMatch ? String(correct).slice(numericMatch[0].length) : '';
  let pad = 1;
  while (uniqueDistractors.length < 3) {
    const d = `${prefix}${baseNum + pad}${unitSuffix}`;
    if (!seen.has(d)) {
      seen.add(d);
      uniqueDistractors.push(d);
    }
    pad++;
  }
  const options = shuffle([correctStr, ...uniqueDistractors]);
  return {
    id: makeId(),
    category: 'competitive-math',
    difficulty,
    source: 'generator',
    prompt,
    options,
    answerIndex: options.indexOf(correctStr),
    explanation,
    dedupeKey,
  };
}

// ─── 1. Work & Time ─────────────────────────────────────────────────────────

function genWork(difficulty: Difficulty): Question {
  const aDays = randInt(12, difficulty === 'hard' ? 40 : 28);
  const efficiency = pick([20, 25, 40, 50, 60, 75]);
  const multiple = pick([2, 3]);
  const answer = (multiple * aDays * 100) / (100 + efficiency);
  if (!Number.isInteger(answer)) return genWork(difficulty);
  const ds = [Math.round(aDays * 1.5), Math.round(answer * 0.8), answer + 7].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `A can complete a task in ${aDays} days. B is ${efficiency}% more efficient than A. How many days will B need to complete ${multiple} times the task?`,
    answer,
    ds,
    `Step 1: B is ${efficiency}% more efficient, so B's rate = ${100 + efficiency}% of A's rate.\nStep 2: B's days for 1× task = ${aDays} × 100 ÷ ${100 + efficiency} = ${(aDays * 100) / (100 + efficiency)} days.\nStep 3: For ${multiple}× the work, B needs ${multiple} × ${(aDays * 100) / (100 + efficiency)} = ${answer} days.\nAnswer: ${answer} days.`,
    `work:${aDays}:${efficiency}:${multiple}`,
  );
}

// ─── 2. Work — alternate days ───────────────────────────────────────────────

function genWorkAlternate(difficulty: Difficulty): Question {
  const aDays = randInt(6, difficulty === 'hard' ? 20 : 15);
  const bDays = randInt(8, difficulty === 'hard' ? 25 : 20);
  // Simulate day-by-day: A works odd days, B works even days
  let workDone = 0;
  let day = 0;
  while (workDone < 1 && day < 200) {
    day++;
    workDone += day % 2 === 1 ? 1 / aDays : 1 / bDays;
  }
  const answer = day;
  if (answer > 100 || answer < 3) return genWorkAlternate(difficulty);
  const ds = [Math.floor((aDays * bDays) / (aDays + bDays)), answer + 2, answer - 2].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `A can finish a task in ${aDays} days and B in ${bDays} days. They work on alternate days, starting with A. How many days will the task take?`,
    answer,
    ds,
    `Step 1: A does 1/${aDays} of the work on day 1, B does 1/${bDays} on day 2.\nStep 2: In 2 days, they complete 1/${aDays} + 1/${bDays} = ${(1 / aDays + 1 / bDays).toFixed(4)} of the work.\nStep 3: Simulating day by day, the work is completed on day ${answer}.\nAnswer: ${answer} days.`,
    `work-alt:${aDays}:${bDays}`,
  );
}

// ─── 3. Speed, Distance, Time ───────────────────────────────────────────────

function genSpeed(difficulty: Difficulty): Question {
  const speed = randInt(30, difficulty === 'hard' ? 90 : 70);
  const hours = randInt(2, 6);
  const newHours = randInt(7, 12);
  const answer = speed * newHours;
  const ds = [speed * hours, answer + speed, Math.round(answer * 1.5)].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `A vehicle travels at ${speed} km/h for ${hours} hours. How far will it travel in ${newHours} hours at the same speed?`,
    answer,
    ds,
    `Step 1: Speed = ${speed} km/h, time = ${newHours} hours.\nStep 2: Distance = speed × time = ${speed} × ${newHours} = ${answer} km.\nAnswer: ${answer} km.`,
    `speed:${speed}:${hours}:${newHours}`,
  );
}

// ─── 4. Trains crossing ─────────────────────────────────────────────────────

function genTrainCrossing(difficulty: Difficulty): Question {
  const trainLen = randInt(50, difficulty === 'hard' ? 250 : 150);
  const platformLen = randInt(100, difficulty === 'hard' ? 400 : 300);
  const speed = randInt(36, difficulty === 'hard' ? 108 : 72);
  // Time to cross platform = (trainLen + platformLen) / (speed × 1000/3600)
  const totalDist = trainLen + platformLen;
  const speedMs = (speed * 1000) / 3600;
  const answer = Math.round((totalDist / speedMs) * 10) / 10;
  if (answer < 1) return genTrainCrossing(difficulty);
  return mcq(
    difficulty,
    `A ${trainLen}m long train running at ${speed} km/h crosses a ${platformLen}m long platform. How long does it take (in seconds)?`,
    answer,
    [Math.round((trainLen / speedMs) * 10) / 10, Math.round((totalDist / speedMs * 0.7) * 10) / 10, Math.round(answer + 8)],
    `Step 1: Total distance = train length + platform length = ${trainLen} + ${platformLen} = ${totalDist} m.\nStep 2: Convert speed to m/s: ${speed} km/h ÷ 3.6 = ${speedMs.toFixed(2)} m/s.\nStep 3: Time = distance ÷ speed = ${totalDist} ÷ ${speedMs.toFixed(2)} ≈ ${answer} seconds.\nAnswer: ${answer} seconds.`,
    `train:${trainLen}:${platformLen}:${speed}`,
  );
}

// ─── 5. Boats & Streams ─────────────────────────────────────────────────────

function genBoat(difficulty: Difficulty): Question {
  const boatSpeed = randInt(8, difficulty === 'hard' ? 20 : 15);
  const streamSpeed = randInt(2, difficulty === 'hard' ? 8 : 5);
  if (streamSpeed >= boatSpeed) return genBoat(difficulty);
  const downstream = boatSpeed + streamSpeed;
  const upstream = boatSpeed - streamSpeed;
  const answer = Math.round((downstream / upstream) * 10) / 10;
  return mcq(
    difficulty,
    `A boat's speed in still water is ${boatSpeed} km/h. The stream flows at ${streamSpeed} km/h. What is the ratio of downstream speed to upstream speed?`,
    answer,
    [Math.round((downstream / boatSpeed) * 10) / 10, Math.round((upstream / downstream) * 10) / 10, downstream + upstream],
    `Step 1: Downstream speed = boat + stream = ${boatSpeed} + ${streamSpeed} = ${downstream} km/h.\nStep 2: Upstream speed = boat − stream = ${boatSpeed} − ${streamSpeed} = ${upstream} km/h.\nStep 3: Ratio = downstream ÷ upstream = ${downstream} ÷ ${upstream} ≈ ${answer}.\nAnswer: ${answer}.`,
    `boat:${boatSpeed}:${streamSpeed}`,
  );
}

// ─── 6. Percentage ──────────────────────────────────────────────────────────

function genPercentage(difficulty: Difficulty): Question {
  const value = randInt(200, difficulty === 'hard' ? 2000 : 1000);
  const percent = pick([10, 15, 20, 25, 30, 40]);
  const answer = (value * percent) / 100;
  const ds = [value - answer, value + answer, Math.round(answer * 0.5)].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `What is ${percent}% of ${value}?`,
    answer,
    ds,
    `Step 1: ${percent}% means ${percent} per 100.\nStep 2: ${percent}% of ${value} = ${value} × ${percent} ÷ 100.\nStep 3: = ${answer}.\nAnswer: ${answer}.`,
    `percentage:${value}:${percent}`,
  );
}

// ─── 7. Percentage Change ───────────────────────────────────────────────────

function genPercentageChange(difficulty: Difficulty): Question {
  const oldVal = randInt(100, difficulty === 'hard' ? 800 : 500);
  const change = pick([10, 15, 20, 25, 30, 40, 50]);
  const direction = pick(['increase', 'decrease'] as const);
  const newVal = direction === 'increase' ? oldVal + (oldVal * change) / 100 : oldVal - (oldVal * change) / 100;
  const answer = direction === 'increase' ? change : -change;
  return mcq(
    difficulty,
    `A value changes from ${oldVal} to ${newVal}. What is the percentage change?`,
    `${answer}%`,
    [`${Math.abs(answer) + 5}%`, `${Math.abs(answer) - 5}%`, `${direction === 'increase' ? '−' : ''}${Math.abs(answer)}%`],
    `Step 1: Change = new − old = ${newVal} − ${oldVal} = ${newVal - oldVal}.\nStep 2: Percentage change = (change ÷ old) × 100 = (${newVal - oldVal} ÷ ${oldVal}) × 100.\nStep 3: = ${answer}%.\nAnswer: ${answer}%.`,
    `pct-change:${oldVal}:${change}:${direction}`,
  );
}

// ─── 8. Profit & Loss ───────────────────────────────────────────────────────

function genProfitLoss(difficulty: Difficulty): Question {
  const cost = randInt(100, difficulty === 'hard' ? 2000 : 1000);
  const percent = pick([10, 15, 20, 25, 30, 40]);
  const isProfit = pick([true, false]);
  const answer = isProfit ? (cost * (100 + percent)) / 100 : (cost * (100 - percent)) / 100;
  const label = isProfit ? 'profit' : 'loss';
  const opposite = isProfit ? (cost * (100 - percent)) / 100 : (cost * (100 + percent)) / 100;
  const ds = [cost, opposite, Math.round(answer * 1.1)].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `An item costs ₹${cost}. It is sold at a ${label} of ${percent}%. What is its selling price?`,
    answer,
    ds,
    `Step 1: Selling price = cost × (100 ${isProfit ? '+' : '−'} ${percent}%) ÷ 100.\nStep 2: = ${cost} × ${isProfit ? 100 + percent : 100 - percent} ÷ 100.\nStep 3: = ₹${answer}.\nAnswer: ₹${answer}.`,
    `${label}:${cost}:${percent}`,
    true,
  );
}

// ─── 9. Discount ────────────────────────────────────────────────────────────

function genDiscount(difficulty: Difficulty): Question {
  const marked = randInt(200, difficulty === 'hard' ? 2000 : 1000);
  const discount = pick([10, 15, 20, 25, 30, 40]);
  const answer = marked - (marked * discount) / 100;
  const discountAmt = (marked * discount) / 100;
  const ds = [marked, discountAmt, Math.round(answer * 1.15)].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `An item marked at ₹${marked} is sold at a discount of ${discount}%. What is the selling price?`,
    answer,
    ds,
    `Step 1: Discount amount = marked price × discount% ÷ 100 = ${marked} × ${discount} ÷ 100 = ₹${(marked * discount) / 100}.\nStep 2: Selling price = marked price − discount = ${marked} − ${(marked * discount) / 100}.\nStep 3: = ₹${answer}.\nAnswer: ₹${answer}.`,
    `discount:${marked}:${discount}`,
    true,
  );
}

// ─── 10. Simple Interest ────────────────────────────────────────────────────

function genSimpleInterest(difficulty: Difficulty): Question {
  const principal = randInt(10, difficulty === 'hard' ? 100 : 50) * 100;
  const rate = pick([5, 8, 10, 12, 15]);
  const years = randInt(2, 5);
  const answer = (principal * rate * years) / 100;
  return mcq(
    difficulty,
    `Find the simple interest on ₹${principal} at ${rate}% per annum for ${years} years.`,
    answer,
    [(principal * rate) / 100, Math.round(answer * 1.5), principal + answer],
    `Step 1: Simple interest = P × R × T ÷ 100.\nStep 2: = ${principal} × ${rate} × ${years} ÷ 100.\nStep 3: = ₹${answer}.\nAnswer: ₹${answer}.`,
    `si:${principal}:${rate}:${years}`,
    true,
  );
}

// ─── 11. Compound Interest ──────────────────────────────────────────────────

function genCompoundInterest(difficulty: Difficulty): Question {
  const principal = randInt(10, difficulty === 'hard' ? 100 : 50) * 100;
  const rate = pick([5, 10, 20]);
  const years = pick([2, 3]);
  const supYrs = sup(years);
  const amount = Math.round(principal * Math.pow(1 + rate / 100, years));
  const answer = amount - principal;
  return mcq(
    difficulty,
    `Find the compound interest on ₹${principal} at ${rate}% per annum for ${years} years (compounded annually).`,
    answer,
    [(principal * rate * years) / 100, amount, answer + principal / 10],
    `Step 1: Amount = P × (1 + R/100)ᵀ = ${principal} × (1 + ${rate}/100)${supYrs}.\nStep 2: = ${principal} × ${(1 + rate / 100).toFixed(2)}${supYrs} = ₹${amount}.\nStep 3: Compound interest = Amount − Principal = ${amount} − ${principal} = ₹${answer}.\nAnswer: ₹${answer}.`,
    `ci:${principal}:${rate}:${years}`,
    true,
  );
}

// ─── 12. Average ────────────────────────────────────────────────────────────

function genAverage(difficulty: Difficulty): Question {
  const count = difficulty === 'hard' ? 6 : 5;
  const start = randInt(5, 30);
  const step = randInt(2, 8);
  const values = Array.from({ length: count }, (_, i) => start + i * step);
  const answer = (values[0] + values[count - 1]) / 2;
  return mcq(
    difficulty,
    `Find the average of: ${values.join(', ')}.`,
    answer,
    [answer + step, answer - step, values[count - 1]],
    `Step 1: The values form an arithmetic sequence (common difference = ${step}).\nStep 2: For an arithmetic sequence, average = (first + last) ÷ 2.\nStep 3: = (${values[0]} + ${values[count - 1]}) ÷ 2 = ${answer}.\nAnswer: ${answer}.`,
    `average:${start}:${step}:${count}`,
  );
}

// ─── 13. Average — missing value ────────────────────────────────────────────

function genAverageMissing(difficulty: Difficulty): Question {
  const count = pick([4, 5]);
  const avg = randInt(15, difficulty === 'hard' ? 50 : 35);
  const known = count - 1;
  const values: number[] = [];
  for (let i = 0; i < known; i++) values.push(randInt(avg - 10, avg + 10));
  const knownSum = values.reduce((s, x) => s + x, 0);
  const totalNeeded = avg * count;
  const answer = totalNeeded - knownSum;
  if (answer < 1 || answer > 100) return genAverageMissing(difficulty);
  const ds = [avg + 5, answer + 5, answer - 5].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `The average of ${count} numbers is ${avg}. The first ${known} are ${values.join(', ')}. What is the ${count}th number?`,
    answer,
    ds,
    `Step 1: Total sum needed = average × count = ${avg} × ${count} = ${totalNeeded}.\nStep 2: Sum of known values = ${values.join(' + ')} = ${knownSum}.\nStep 3: Missing number = ${totalNeeded} − ${knownSum} = ${answer}.\nAnswer: ${answer}.`,
    `avg-missing:${count}:${avg}:${values.join(',')}`,
  );
}

// ─── 14. Ratio & Proportion ─────────────────────────────────────────────────

function genRatio(difficulty: Difficulty): Question {
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  const multiplier = randInt(3, difficulty === 'hard' ? 12 : 8);
  const total = (a + b) * multiplier;
  const answer = a * multiplier;
  const ds = [b * multiplier, a + multiplier, Math.round(answer * 1.3)].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `The ratio of red to blue balls is ${a}:${b}. If there are ${total} balls in total, how many are red?`,
    answer,
    ds,
    `Step 1: Total parts = ${a} + ${b} = ${a + b}.\nStep 2: One part = total ÷ parts = ${total} ÷ ${a + b} = ${multiplier}.\nStep 3: Red balls = ${a} × ${multiplier} = ${answer}.\nAnswer: ${answer}.`,
    `ratio:${a}:${b}:${total}`,
  );
}

// ─── 15. Mixture & Alligation ───────────────────────────────────────────────

function genMixture(difficulty: Difficulty): Question {
  const cheap = pick([20, 30, 40]);
  const dear = pick([60, 70, 80]);
  // Choose a target that is NOT the midpoint to create a meaningful ratio
  const mid = (cheap + dear) / 2;
  const target = pick([Math.round(mid - 5), Math.round(mid + 5), Math.round(mid - 10), Math.round(mid + 10)].filter((t) => t > cheap && t < dear));
  const ratioA = dear - target;
  const ratioB = target - cheap;
  const totalQty = randInt(10, difficulty === 'hard' ? 50 : 30);
  // Ensure totalQty is divisible by (ratioA + ratioB) for a clean answer
  const parts = ratioA + ratioB;
  const adjustedQty = Math.round(totalQty / parts) * parts;
  const answer = (adjustedQty * ratioA) / parts;
  const ds = [adjustedQty - answer, Math.round(adjustedQty / 3), answer + 3].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `A merchant mixes rice costing ₹${cheap}/kg with rice costing ₹${dear}/kg to get a mixture worth ₹${target}/kg. If they make ${adjustedQty} kg total, how many kg of the cheaper rice do they use?`,
    answer,
    ds,
    `Step 1: Alligation ratio = (dear − target) : (target − cheap) = (${dear}−${target}) : (${target}−${cheap}) = ${ratioA}:${ratioB}.\nStep 2: Total parts = ${ratioA} + ${ratioB} = ${parts}.\nStep 3: Cheaper qty = total × ${ratioA} ÷ ${parts} = ${adjustedQty} × ${ratioA} ÷ ${parts} = ${answer} kg.\nAnswer: ${answer} kg.`,
    `mixture:${cheap}:${dear}:${target}:${adjustedQty}`,
  );
}

// ─── 16. Partnership ────────────────────────────────────────────────────────

function genPartnership(difficulty: Difficulty): Question {
  const aInv = randInt(2, difficulty === 'hard' ? 10 : 6) * 1000;
  const bInv = randInt(2, difficulty === 'hard' ? 10 : 6) * 1000;
  const aMonths = randInt(3, 8);
  const bMonths = randInt(3, 8);
  const totalProfit = randInt(5, difficulty === 'hard' ? 30 : 20) * 1000;
  const aShare = Math.round((totalProfit * aInv * aMonths) / (aInv * aMonths + bInv * bMonths));
  const ds = [totalProfit - aShare, Math.round(totalProfit * 0.3), Math.round(aShare * 0.8)].filter((d) => d !== aShare && d > 0);
  return mcq(
    difficulty,
    `A invests ₹${aInv} for ${aMonths} months and B invests ₹${bInv} for ${bMonths} months in a business. Total profit is ₹${totalProfit}. What is A's share?`,
    aShare,
    ds,
    `Step 1: Profit ratio = (A's investment × time) : (B's investment × time).\nStep 2: = (${aInv}×${aMonths}) : (${bInv}×${bMonths}) = ${aInv * aMonths} : ${bInv * bMonths}.\nStep 3: A's share = ${totalProfit} × ${aInv * aMonths} ÷ ${aInv * aMonths + bInv * bMonths} = ₹${aShare}.\nAnswer: ₹${aShare}.`,
    `partnership:${aInv}:${aMonths}:${bInv}:${bMonths}:${totalProfit}`,
    true,
  );
}

// ─── 17. Ages ───────────────────────────────────────────────────────────────

function genAges(difficulty: Difficulty): Question {
  const ratioA = randInt(2, 5);
  const ratioB = randInt(2, 5);
  const yearsAgo = randInt(2, 10);
  // Ensure aAgeThen is divisible by ratioA so bAgeThen is an integer
  const aAgeThen = randInt(2, 6) * ratioA;
  const currentAge = aAgeThen + yearsAgo;
  const bAgeThen = (aAgeThen * ratioB) / ratioA;
  const bAgeNow = bAgeThen + yearsAgo;
  if (bAgeNow < 1 || bAgeNow > 100 || bAgeNow === currentAge) return genAges(difficulty);
  const ds = [bAgeNow + yearsAgo, bAgeNow - yearsAgo, currentAge].filter((d) => d !== bAgeNow && d > 0 && d !== currentAge);
  return mcq(
    difficulty,
    `A is currently ${currentAge} years old. ${yearsAgo} years ago, the ratio of A's age to B's age was ${ratioA}:${ratioB}. How old is B now?`,
    bAgeNow,
    ds,
    `Step 1: ${yearsAgo} years ago, A was ${aAgeThen} years old.\nStep 2: Ratio A:B = ${ratioA}:${ratioB}, so B was ${aAgeThen} × ${ratioB} ÷ ${ratioA} = ${bAgeThen}.\nStep 3: B's current age = ${bAgeThen} + ${yearsAgo} = ${bAgeNow}.\nAnswer: ${bAgeNow}.`,
    `ages:${currentAge}:${ratioA}:${ratioB}:${yearsAgo}`,
  );
}

// ─── 18. LCM / HCF word problem ─────────────────────────────────────────────

function genLcmHcf(difficulty: Difficulty): Question {
  const a = randInt(4, difficulty === 'hard' ? 30 : 20);
  const b = randInt(4, difficulty === 'hard' ? 30 : 20);
  const wantLcm = pick([true, false]);
  const answer = wantLcm ? lcm(a, b) : gcd(a, b);
  const ds = [wantLcm ? gcd(a, b) : lcm(a, b), a + b, Math.abs(a - b)].filter((d) => d !== answer && d > 0);
  return mcq(
    difficulty,
    `Find the ${wantLcm ? 'LCM' : 'HCF'} of ${a} and ${b}.`,
    answer,
    ds,
    `Step 1: Find the prime factors of ${a} and ${b}.\nStep 2: ${wantLcm ? 'LCM' : 'HCF'} = ${answer}.\nAnswer: ${answer}.`,
    `${wantLcm ? 'lcm' : 'hcf'}:${a}:${b}`,
  );
}

// ─── 19. Area & Perimeter ───────────────────────────────────────────────────

function genArea(difficulty: Difficulty): Question {
  const shape = pick(['rectangle', 'square', 'triangle'] as const);
  if (shape === 'rectangle') {
    const l = randInt(5, difficulty === 'hard' ? 30 : 20);
    const w = randInt(3, difficulty === 'hard' ? 20 : 15);
    const answer = l * w;
    const ds = [`${l + w} m²`, `${answer + 5} m²`, `${answer + l} m²`].filter((d) => d !== `${answer} m²`);
    return mcq(
      difficulty,
      `A rectangle has length ${l}m and width ${w}m. What is its area?`,
      `${answer} m²`,
      ds,
      `Step 1: Area of rectangle = length × width.\nStep 2: = ${l} × ${w}.\nStep 3: = ${answer} m².\nAnswer: ${answer} m².`,
      `area-rect:${l}:${w}`,
    );
  }
  if (shape === 'square') {
    const side = randInt(5, difficulty === 'hard' ? 25 : 18);
    const answer = side * side;
    const ds = [`${answer + side} m²`, `${side * 2} m²`, `${answer + 10} m²`].filter((d) => d !== `${answer} m²`);
    return mcq(
      difficulty,
      `A square has a side of ${side}m. What is its area?`,
      `${answer} m²`,
      ds,
      `Step 1: Area of square = side².\nStep 2: = ${side}².\nStep 3: = ${answer} m².\nAnswer: ${answer} m².`,
      `area-square:${side}`,
    );
  }
  // triangle
  const base = randInt(6, difficulty === 'hard' ? 24 : 16);
  const height = randInt(4, difficulty === 'hard' ? 20 : 12);
  const answer = (base * height) / 2;
  if (!Number.isInteger(answer)) return genArea(difficulty);
  return mcq(
    difficulty,
    `A triangle has base ${base}m and height ${height}m. What is its area?`,
    `${answer} m²`,
    [`${base * height} m²`, `${(base + height) / 2} m²`, `${answer + base} m²`],
    `Step 1: Area of triangle = ½ × base × height.\nStep 2: = ½ × ${base} × ${height}.\nStep 3: = ${answer} m².\nAnswer: ${answer} m².`,
    `area-tri:${base}:${height}`,
  );
}

// ─── 20. BODMAS ─────────────────────────────────────────────────────────────

function genBodmas(difficulty: Difficulty): Question {
  const a = randInt(3, difficulty === 'hard' ? 20 : 12);
  const b = randInt(2, 9);
  const c = randInt(2, 9);
  const d = randInt(2, 6);
  const answer = a * b + c * d - Math.floor(c / d);
  const ds = [a * (b + c) * d, a + b * c * d, a * b + c * d + Math.floor(c / d)].filter((v) => v !== answer);
  return mcq(
    difficulty,
    `Evaluate: ${a} × ${b} + ${c} × ${d} − ${c} ÷ ${d} (integer division)`,
    answer,
    ds,
    `Step 1: Apply BODMAS — multiplication and division first.\nStep 2: ${a} × ${b} = ${a * b}, ${c} × ${d} = ${c * d}, ${c} ÷ ${d} = ${Math.floor(c / d)}.\nStep 3: Now add and subtract: ${a * b} + ${c * d} − ${Math.floor(c / d)} = ${answer}.\nAnswer: ${answer}.`,
    `bodmas:${a}:${b}:${c}:${d}`,
  );
}

// ─── Generator entry point ──────────────────────────────────────────────────

const GENERATORS: ((d: Difficulty) => Question)[] = [
  genWork, genWorkAlternate, genSpeed, genTrainCrossing, genBoat,
  genPercentage, genPercentageChange, genProfitLoss, genDiscount,
  genSimpleInterest, genCompoundInterest, genAverage, genAverageMissing,
  genRatio, genMixture, genPartnership, genAges, genLcmHcf, genArea, genBodmas,
];

export function generateCompetitiveMath(difficulty: Difficulty): Question {
  return pick(GENERATORS)(difficulty);
}

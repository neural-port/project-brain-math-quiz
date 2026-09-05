import type { Difficulty, Question } from './types';

// ─── Utilities ──────────────────────────────────────────────────────────────

let counter = 0;
function makeId(): string {
  counter++;
  return `logical-reasoning-${counter}`;
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

function mcq(
  difficulty: Difficulty,
  prompt: string,
  correct: string,
  distractors: string[],
  explanation: string,
  dedupeKey: string,
): Question {
  const seen = new Set<string>([correct]);
  const uniqueDistractors: string[] = [];
  for (const d of distractors) {
    if (!seen.has(d)) {
      seen.add(d);
      uniqueDistractors.push(d);
    }
    if (uniqueDistractors.length === 3) break;
  }
  // Pad with generic fallbacks
  const fallbacks = ['None of the above', 'Cannot be determined', 'Both A and B'];
  for (const f of fallbacks) {
    if (uniqueDistractors.length >= 3) break;
    if (!seen.has(f)) {
      seen.add(f);
      uniqueDistractors.push(f);
    }
  }
  const options = shuffle([correct, ...uniqueDistractors.slice(0, 3)]);
  return {
    id: makeId(),
    category: 'logical-reasoning',
    difficulty,
    source: 'generator',
    prompt,
    options,
    answerIndex: options.indexOf(correct),
    explanation,
    dedupeKey,
  };
}

const FEMALE_NAMES = ['Asha', 'Bina', 'Chitra', 'Deepa', 'Esha', 'Farah', 'Gita', 'Hema'];
const MALE_NAMES = ['Arun', 'Bharat', 'Chetan', 'Dev', 'Eshan', 'Faisal', 'Gopal', 'Harish'];
const DIRECTIONS = ['north', 'east', 'south', 'west'];

// ─── 1. Blood relations — grandparent ───────────────────────────────────────

function genBloodGrandparent(difficulty: Difficulty): Question {
  const child = pick(FEMALE_NAMES);
  const parent = pick(FEMALE_NAMES.filter((n) => n !== child));
  const relation = pick(['grandfather', 'grandmother'] as const);
  const gender = relation === 'grandfather' ? 'male' : 'female';
  const grandparent = relation === 'grandfather'
    ? pick(MALE_NAMES.filter((n) => n !== child && n !== parent))
    : pick(FEMALE_NAMES.filter((n) => n !== child && n !== parent));
  return mcq(
    difficulty,
    `${child} is the daughter of ${parent}. ${parent} is the ${relation === 'grandfather' ? 'daughter' : 'daughter'} of ${grandparent}, who is ${gender}. How is ${grandparent} related to ${child}?`,
    relation,
    ['uncle', 'sister', 'cousin'],
    `Step 1: ${parent} is ${child}'s parent.\nStep 2: ${grandparent} is ${parent}'s parent and is ${gender}, so ${grandparent} is the ${relation === 'grandfather' ? 'father' : 'mother'} of ${parent}.\nStep 3: Therefore ${grandparent} is ${child}'s ${relation}.\nAnswer: ${relation}.`,
    `blood-grand:${child}:${parent}:${grandparent}:${relation}`,
  );
}

// ─── 2. Blood relations — sibling ───────────────────────────────────────────

function genBloodSibling(difficulty: Difficulty): Question {
  const a = pick(MALE_NAMES);
  const b = pick(FEMALE_NAMES);
  const c = pick(FEMALE_NAMES.filter((n) => n !== b));
  return mcq(
    difficulty,
    `${a} is the brother of ${b}. ${b} is the sister of ${c}. How is ${a} related to ${c}?`,
    'brother',
    ['cousin', 'uncle', 'father'],
    `Step 1: ${a} is the brother of ${b} → ${a} and ${b} are siblings.\nStep 2: ${b} is the sister of ${c} → ${b} and ${c} are siblings.\nStep 3: Therefore ${a} and ${c} are also siblings — ${a} is ${c}'s brother.\nAnswer: brother.`,
    `blood-sib:${a}:${b}:${c}`,
  );
}

// ─── 3. Blood relations — in-law ────────────────────────────────────────────

function genBloodInLaw(difficulty: Difficulty): Question {
  const wife = pick(FEMALE_NAMES);
  const husband = pick(MALE_NAMES);
  const fatherInLaw = pick(MALE_NAMES.filter((n) => n !== husband));
  return mcq(
    difficulty,
    `${wife} is married to ${husband}. ${fatherInLaw} is the father of ${husband}. How is ${fatherInLaw} related to ${wife}?`,
    'father-in-law',
    ['uncle', 'brother', 'grandfather'],
    `Step 1: ${fatherInLaw} is ${husband}'s father.\nStep 2: ${wife} is married to ${husband}.\nStep 3: By marriage, ${husband}'s father becomes ${wife}'s father-in-law.\nAnswer: father-in-law.`,
    `blood-inlaw:${wife}:${husband}:${fatherInLaw}`,
  );
}

// ─── 3b. Blood relations — uncle ────────────────────────────────────────────

function genBloodUncle(difficulty: Difficulty): Question {
  const child = pick(FEMALE_NAMES);
  const father = pick(MALE_NAMES);
  const uncle = pick(MALE_NAMES.filter((n) => n !== father));
  return mcq(
    difficulty,
    `${uncle} is the brother of ${father}. ${father} is the father of ${child}. How is ${uncle} related to ${child}?`,
    'uncle',
    ['father', 'cousin', 'grandfather'],
    `Step 1: ${uncle} is the brother of ${child}'s father (${father}).\nStep 2: A father's brother is called an uncle.\nStep 3: So ${uncle} is ${child}'s uncle.\nAnswer: uncle.`,
    `blood-uncle:${child}:${father}:${uncle}`,
  );
}

// ─── 3c. Blood relations — niece ────────────────────────────────────────────

function genBloodNiece(difficulty: Difficulty): Question {
  const niece = pick(FEMALE_NAMES);
  const parent = pick(MALE_NAMES);
  const aunt = pick(FEMALE_NAMES.filter((n) => n !== niece));
  return mcq(
    difficulty,
    `${aunt} is the sister of ${parent}. ${niece} is the daughter of ${parent}. How is ${niece} related to ${aunt}?`,
    'niece',
    ['nephew', 'daughter', 'cousin'],
    `Step 1: ${aunt} is the sister of ${niece}'s parent (${parent}).\nStep 2: A parent's sister is an aunt, making the child a niece (if female).\nStep 3: ${niece} is ${aunt}'s niece.\nAnswer: niece.`,
    `blood-niece:${niece}:${parent}:${aunt}`,
  );
}

// ─── 3d. Blood relations — cousin ───────────────────────────────────────────

function genBloodCousin(difficulty: Difficulty): Question {
  const maleNames = shuffle([...MALE_NAMES]);
  const [parent1, parent2] = maleNames;
  const child1 = pick(MALE_NAMES.filter((n) => n !== parent1 && n !== parent2));
  const child2 = pick(FEMALE_NAMES);
  return mcq(
    difficulty,
    `${parent1} and ${parent2} are brothers. ${child1} is the son of ${parent1}, and ${child2} is the daughter of ${parent2}. How is ${child1} related to ${child2}?`,
    'cousin',
    ['brother', 'nephew', 'uncle'],
    `Step 1: ${parent1} and ${parent2} are brothers — they are siblings.\nStep 2: ${child1} is ${parent1}'s son, ${child2} is ${parent2}'s daughter.\nStep 3: Children of siblings are cousins. So ${child1} is ${child2}'s cousin.\nAnswer: cousin.`,
    `blood-cousin:${child1}:${parent1}:${parent2}:${child2}`,
  );
}

// ─── 3e. Blood relations — mother-in-law ────────────────────────────────────

function genBloodMotherInLaw(difficulty: Difficulty): Question {
  const husband = pick(MALE_NAMES);
  const wife = pick(FEMALE_NAMES);
  const motherInLaw = pick(FEMALE_NAMES.filter((n) => n !== wife));
  return mcq(
    difficulty,
    `${husband} is married to ${wife}. ${motherInLaw} is the mother of ${husband}. How is ${motherInLaw} related to ${wife}?`,
    'mother-in-law',
    ['aunt', 'sister', 'grandmother'],
    `Step 1: ${motherInLaw} is ${husband}'s mother.\nStep 2: ${wife} is married to ${husband}.\nStep 3: By marriage, ${husband}'s mother becomes ${wife}'s mother-in-law.\nAnswer: mother-in-law.`,
    `blood-mil:${husband}:${wife}:${motherInLaw}`,
  );
}

// ─── 4. Direction — simple turns ────────────────────────────────────────────

function genDirectionSimple(difficulty: Difficulty): Question {
  const start = pick([...DIRECTIONS]);
  const turnSets = [
    ['right'],
    ['left'],
    ['right', 'right'],
    ['left', 'left'],
    ['right', 'left'],
    ['left', 'right'],
    ['right', 'right', 'right'],
    ['left', 'left', 'left'],
  ];
  const turns = pick(turnSets);
  const result = moveDirection(start, turns);
  return mcq(
    difficulty,
    `A person is facing ${start}. They turn ${turns.join(' then ')}. Which direction are they facing now?`,
    result,
    DIRECTIONS.filter((d) => d !== result),
    `Step 1: Start facing ${start}.\nStep 2: Turn ${turns.join(' then ')} — each right turn = 90° clockwise, each left turn = 90° counter-clockwise.\nStep 3: Final direction = ${result}.\nAnswer: ${result}.`,
    `dir-simple:${start}:${turns.join(':')}`,
  );
}

// ─── 4b. Direction — shadow based ───────────────────────────────────────────

function genDirectionShadow(difficulty: Difficulty): Question {
  const timeOfDay = pick(['morning', 'evening'] as const);
  // Morning: sun in east, shadow falls west. Evening: sun in west, shadow falls east.
  const sunDir = timeOfDay === 'morning' ? 'east' : 'west';
  const shadowDir = timeOfDay === 'morning' ? 'west' : 'east';
  return mcq(
    difficulty,
    `In the ${timeOfDay}, the sun is in the ${sunDir}. A person's shadow falls in which direction?`,
    shadowDir,
    [sunDir, 'north', 'south'],
    `Step 1: In the ${timeOfDay}, the sun is in the ${sunDir}.\nStep 2: Shadows always fall opposite to the sun.\nStep 3: Since the sun is in the ${sunDir}, the shadow falls toward ${shadowDir}.\nAnswer: ${shadowDir}.`,
    `dir-shadow:${timeOfDay}`,
  );
}

// ─── 5. Direction — with distance ───────────────────────────────────────────

function genDirectionDistance(difficulty: Difficulty): Question {
  const dist1 = randInt(2, 10);
  const dist2 = randInt(2, 10);
  const dir1 = pick(['north', 'east'] as const);
  const dir2 = dir1 === 'north' ? 'east' : 'north';
  // Person walks dist1 north, then dist2 east. How far from start?
  const answer = Math.round(Math.sqrt(dist1 ** 2 + dist2 ** 2) * 100) / 100;
  return mcq(
    difficulty,
    `A person walks ${dist1} km ${dir1}, then turns and walks ${dist2} km ${dir2}. How far are they from the starting point (straight-line distance)?`,
    `${answer} km`,
    [`${dist1 + dist2} km`, `${Math.abs(dist1 - dist2)} km`, `${Math.round((dist1 + dist2) / 2)} km`],
    `Step 1: The person walks ${dist1} km ${dir1}, then ${dist2} km ${dir2} — these are perpendicular.\nStep 2: Use Pythagoras: distance = √(${dist1}² + ${dist2}²) = √(${dist1 ** 2} + ${dist2 ** 2}).\nStep 3: = √${dist1 ** 2 + dist2 ** 2} ≈ ${answer} km.\nAnswer: ${answer} km.`,
    `dir-dist:${dist1}:${dist2}:${dir1}`,
  );
}

function moveDirection(start: string, turns: readonly string[]): string {
  const dirs = ['north', 'east', 'south', 'west'];
  let idx = dirs.indexOf(start);
  for (const turn of turns) idx = (idx + (turn === 'right' ? 1 : 3)) % 4;
  return dirs[idx];
}

// ─── 6. Linear arrangement ──────────────────────────────────────────────────

function genArrangement(difficulty: Difficulty): Question {
  const people = shuffle(['P', 'Q', 'R', 'S', 'T']);
  const [first, second, third, fourth, fifth] = people;
  const order = [first, second, third, fourth, fifth];
  const target = order[2];
  return mcq(
    difficulty,
    `${first}, ${second}, ${third}, ${fourth}, and ${fifth} are standing in a line from left to right in that order. Who is standing in the middle?`,
    target,
    [order[0], order[1], order[4]],
    `Step 1: Five people in a line: positions 1, 2, 3, 4, 5.\nStep 2: Order is ${order.join(', ')}.\nStep 3: Middle = position 3 = ${target}.\nAnswer: ${target}.`,
    `arrange-mid:${order.join('')}`,
  );
}

// ─── 7. Linear arrangement — with constraints ───────────────────────────────

function genArrangementConstraint(difficulty: Difficulty): Question {
  const variants = [
    {
      prompt: 'P, Q, R, S, and T are standing in a line. Q is immediately to the left of R. S is not standing adjacent to R. T is at the rightmost end. There is exactly one person between R and T. Who is standing at the leftmost end?',
      answer: 'S',
      distractors: ['P', 'Q', 'R'],
      explanation: 'Step 1: T is rightmost → position 5.\nStep 2: One person between R and T → R at position 3. Q is immediately left of R → Q at position 2.\nStep 3: S is not adjacent to R → S at position 1. P fills position 4. Order: S Q R P T.\nAnswer: S.',
      key: 'arrange-constraint:v1',
    },
    {
      prompt: 'Five friends — A, B, C, D, E — are sitting in a row. A is at the leftmost end. D is to the immediate right of B. E is at the rightmost end. C is between A and B. Who is sitting in the middle?',
      answer: 'B',
      distractors: ['A', 'C', 'D'],
      explanation: 'Step 1: A is leftmost → position 1. E is rightmost → position 5.\nStep 2: C is between A and B → A, C, B in positions 1, 2, 3.\nStep 3: D is immediately right of B → B at 3, D at 4. Order: A C B D E. Middle = B.\nAnswer: B.',
      key: 'arrange-constraint:v2',
    },
    {
      prompt: 'Five people — R, S, T, U, V — are standing in a queue. V is at the front. R is immediately behind S. U is at the back. T is between R and U. Who is second in the queue?',
      answer: 'S',
      distractors: ['R', 'T', 'V'],
      explanation: 'Step 1: V is at the front → position 1. U is at the back → position 5.\nStep 2: T is between R and U → R, T, U in positions 3, 4, 5.\nStep 3: R is immediately behind S → S at position 2, R at position 3. Order: V S R T U. Second = S.\nAnswer: S.',
      key: 'arrange-constraint:v3',
    },
    {
      prompt: 'A, B, C, D, and E are sitting in a row facing north. B is to the immediate left of C. D is at the leftmost end. E is to the immediate right of D. A is to the immediate right of E. Who is sitting at the rightmost end?',
      answer: 'C',
      distractors: ['A', 'B', 'E'],
      explanation: 'Step 1: D is at the leftmost end → position 1. E is immediately right of D → position 2.\nStep 2: A is immediately right of E → position 3. B is immediately left of C → B at 4, C at 5.\nStep 3: Order: D E A B C. Rightmost = C.\nAnswer: C.',
      key: 'arrange-constraint:v4',
    },
    {
      prompt: 'Five students — P, Q, R, S, T — are arranged in a line. P is third from the left. Q is to the immediate left of P. T is at the rightmost end. S is not adjacent to P. Who is at the leftmost end?',
      answer: 'S',
      distractors: ['P', 'Q', 'R'],
      explanation: 'Step 1: P is third from left → position 3. Q is immediately left of P → Q at position 2.\nStep 2: T is rightmost → position 5. The open positions are 1 and 4.\nStep 3: S is not adjacent to P, so S cannot be at position 4. Therefore S is at position 1 and R is at position 4. Order: S Q P R T.\nAnswer: S.',
      key: 'arrange-constraint:v5',
    },
    {
      prompt: 'Five people — L, M, N, O, P — are standing in a row. M is at one of the ends. N is to the immediate right of L. P is second from the right. O is at the leftmost end. Who is at the rightmost end?',
      answer: 'M',
      distractors: ['L', 'N', 'P'],
      explanation: 'Step 1: O is leftmost → position 1. P is second from right → position 4.\nStep 2: N is immediately right of L → L, N as a pair in positions 2, 3.\nStep 3: M is at one end — leftmost is O, so M is rightmost → position 5. Order: O L N P M. Rightmost = M.\nAnswer: M.',
      key: 'arrange-constraint:v6',
    },
  ];
  const v = pick(variants);
  return mcq(difficulty, v.prompt, v.answer, v.distractors, v.explanation, v.key);
}

// ─── 8. Ranking ─────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function genRanking(difficulty: Difficulty): Question {
  const total = randInt(5, difficulty === 'hard' ? 30 : 20);
  const rank = randInt(2, total - 1);
  const answer = total - rank + 1;
  // Build distractors that cannot equal the answer
  const candidates = [rank, total - rank, total, rank - 1, answer - 1, answer + 1]
    .filter((n) => n !== answer && n > 0 && n <= total);
  const distractors = [...new Set(candidates)].slice(0, 3).map((n) => ordinal(n));
  return mcq(
    difficulty,
    `In a class of ${total} students, Rohan ranks ${ordinal(rank)} from the top. What is his rank from the bottom?`,
    ordinal(answer),
    distractors,
    `Step 1: Rank from bottom = (total students − rank from top + 1).\nStep 2: = ${total} − ${rank} + 1.\nStep 3: = ${answer}.\nAnswer: ${ordinal(answer)}.`,
    `ranking:${total}:${rank}`,
  );
}

// ─── 9. Calendar ────────────────────────────────────────────────────────────

function genCalendar(difficulty: Difficulty): Question {
  // "If today is Monday, what day will it be after N days?"
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const startIdx = randInt(0, 6);
  const addDays = randInt(3, difficulty === 'hard' ? 50 : 20);
  const answerIdx = (startIdx + addDays) % 7;
  const answer = days[answerIdx];
  return mcq(
    difficulty,
    `If today is ${days[startIdx]}, what day of the week will it be after ${addDays} days?`,
    answer,
    days.filter((d) => d !== answer).slice(0, 3),
    `Step 1: ${addDays} ÷ 7 = ${Math.floor(addDays / 7)} weeks + ${addDays % 7} days.\nStep 2: ${Math.floor(addDays / 7)} weeks brings us back to ${days[startIdx]}.\nStep 3: Add ${addDays % 7} more day(s): ${days[startIdx]} → ${answer}.\nAnswer: ${answer}.`,
    `calendar:${startIdx}:${addDays}`,
  );
}

// ─── 10. Clock — angle between hands ────────────────────────────────────────

function genClockAngle(difficulty: Difficulty): Question {
  const hour = randInt(1, 12);
  const minute = pick([0, 15, 30, 45]);
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  let angle = Math.abs(hourAngle - minuteAngle);
  if (angle > 180) angle = 360 - angle;
  const answer = Math.round(angle);
  // Build distractors that are guaranteed different from the answer and each other
  const distractorPool = [answer + 15, answer + 30, answer + 45, answer + 60, answer + 90, answer + 10, answer + 5, Math.abs(answer - 30), Math.abs(answer - 60), Math.abs(answer - 15), Math.abs(answer - 10), Math.abs(answer - 5), 180 - answer];
  const seen = new Set<number>([answer]);
  const distractors: string[] = [];
  for (const d of distractorPool) {
    if (d > 0 && d <= 180 && !seen.has(d)) {
      seen.add(d);
      distractors.push(`${d}°`);
      if (distractors.length === 3) break;
    }
  }
  // Absolute fallback — pad with any valid angle not yet used
  let fb = 1;
  while (distractors.length < 3) {
    if (!seen.has(fb) && fb <= 180) {
      seen.add(fb);
      distractors.push(`${fb}°`);
    }
    fb++;
  }
  return mcq(
    difficulty,
    `What is the angle between the hour and minute hands of a clock at ${hour}:${minute === 0 ? '00' : minute}?`,
    `${answer}°`,
    distractors,
    `Step 1: Hour hand position = ${(hour % 12) * 30}° + ${minute} × 0.5° = ${hourAngle}°.\nStep 2: Minute hand position = ${minute} × 6° = ${minuteAngle}°.\nStep 3: Raw angle = |${hourAngle} − ${minuteAngle}| = ${Math.abs(hourAngle - minuteAngle)}°${Math.abs(hourAngle - minuteAngle) > 180 ? `, which is > 180°, so we take 360° − ${Math.abs(hourAngle - minuteAngle)}° = ${angle}°` : ''}.\nAnswer: ${answer}°.`,
    `clock:${hour}:${minute}`,
  );
}

// ─── 11. Syllogism ──────────────────────────────────────────────────────────

function genSyllogism(difficulty: Difficulty): Question {
  const syllogisms = [
    {
      prompt: 'All cats are animals. All animals are living beings. Therefore:',
      answer: 'All cats are living beings',
      distractors: ['All living beings are cats', 'No cat is a living being', 'Some cats are not animals'],
      explanation: 'Step 1: All cats → animals, all animals → living beings.\nStep 2: By transitivity (A→B, B→C → A→C).\nStep 3: All cats are living beings.\nAnswer: All cats are living beings.',
      key: 'syllogism-1',
    },
    {
      prompt: 'Some books are novels. All novels are stories. Therefore:',
      answer: 'Some books are stories',
      distractors: ['All books are stories', 'No book is a story', 'All stories are novels'],
      explanation: 'Step 1: Some books → novels, all novels → stories.\nStep 2: The books that are novels are also stories.\nStep 3: So some books are stories.\nAnswer: Some books are stories.',
      key: 'syllogism-2',
    },
    {
      prompt: 'No teacher is a student. Some students are athletes. Therefore:',
      answer: 'Some athletes are not teachers',
      distractors: ['All athletes are teachers', 'No athlete is a teacher', 'Some teachers are athletes'],
      explanation: 'Step 1: No teacher is a student — teachers and students don\'t overlap.\nStep 2: Some students are athletes — so some athletes are students.\nStep 3: Those athletes who are students cannot be teachers.\nAnswer: Some athletes are not teachers.',
      key: 'syllogism-3',
    },
    {
      prompt: 'All roses are flowers. Some flowers fade quickly. Therefore:',
      answer: 'Some flowers that fade quickly may or may not be roses',
      distractors: ['All roses fade quickly', 'No rose fades quickly', 'All flowers are roses'],
      explanation: 'Step 1: All roses → flowers, but only some flowers fade quickly.\nStep 2: The fading flowers could be roses or not — we don\'t know.\nStep 3: We cannot determine if any fading flower is a rose.\nAnswer: Some flowers that fade quickly may or may not be roses.',
      key: 'syllogism-4',
    },
    {
      prompt: 'All doctors are graduates. Some graduates are researchers. Therefore:',
      answer: 'Some doctors may or may not be researchers',
      distractors: ['All doctors are researchers', 'No doctor is a researcher', 'All researchers are doctors'],
      explanation: 'Step 1: All doctors → graduates, some graduates → researchers.\nStep 2: The researchers who are graduates might or might not be doctors.\nStep 3: We cannot definitively link doctors to researchers.\nAnswer: Some doctors may or may not be researchers.',
      key: 'syllogism-5',
    },
    {
      prompt: 'All metals expand when heated. Iron is a metal. Therefore:',
      answer: 'Iron expands when heated',
      distractors: ['All expanding things are iron', 'Iron does not expand', 'Some metals do not expand'],
      explanation: 'Step 1: All metals expand when heated — universal rule.\nStep 2: Iron is a metal — specific instance.\nStep 3: By universal application, iron expands when heated.\nAnswer: Iron expands when heated.',
      key: 'syllogism-6',
    },
    {
      prompt: 'Some pens are blue. All blue things are colorful. Therefore:',
      answer: 'Some pens are colorful',
      distractors: ['All pens are colorful', 'No pen is colorful', 'All colorful things are pens'],
      explanation: 'Step 1: Some pens → blue, all blue → colorful.\nStep 2: The pens that are blue are also colorful.\nStep 3: So some pens are colorful.\nAnswer: Some pens are colorful.',
      key: 'syllogism-7',
    },
    {
      prompt: 'All squares are rectangles. Some rectangles are wide. Therefore:',
      answer: 'Some squares may or may not be wide',
      distractors: ['All squares are wide', 'No square is wide', 'All wide shapes are squares'],
      explanation: 'Step 1: All squares → rectangles, some rectangles → wide.\nStep 2: The wide rectangles might or might not be squares.\nStep 3: We cannot determine if any square is wide.\nAnswer: Some squares may or may not be wide.',
      key: 'syllogism-8',
    },
    {
      prompt: 'No bird is a mammal. All bats are mammals. Therefore:',
      answer: 'No bat is a bird',
      distractors: ['All bats are birds', 'Some bats are birds', 'All birds are bats'],
      explanation: 'Step 1: No bird is a mammal — birds and mammals don\'t overlap.\nStep 2: All bats are mammals — bats are entirely within mammals.\nStep 3: Since bats are mammals and no mammal is a bird, no bat is a bird.\nAnswer: No bat is a bird.',
      key: 'syllogism-9',
    },
    {
      prompt: 'All engineers are problem-solvers. Some problem-solvers are creative. Therefore:',
      answer: 'Some engineers may or may not be creative',
      distractors: ['All engineers are creative', 'No engineer is creative', 'All creative people are engineers'],
      explanation: 'Step 1: All engineers → problem-solvers, some problem-solvers → creative.\nStep 2: The creative problem-solvers might or might not be engineers.\nStep 3: We cannot determine if any engineer is creative.\nAnswer: Some engineers may or may not be creative.',
      key: 'syllogism-10',
    },
    {
      prompt: 'All politicians are citizens. Some citizens are wealthy. Therefore:',
      answer: 'Some politicians may or may not be wealthy',
      distractors: ['All politicians are wealthy', 'No politician is wealthy', 'All wealthy people are politicians'],
      explanation: 'Step 1: All politicians → citizens, some citizens → wealthy.\nStep 2: The wealthy citizens might or might not include politicians.\nStep 3: We cannot determine if any politician is wealthy.\nAnswer: Some politicians may or may not be wealthy.',
      key: 'syllogism-11',
    },
    {
      prompt: 'All triangles have three sides. Figure X is a triangle. Therefore:',
      answer: 'Figure X has three sides',
      distractors: ['All three-sided figures are X', 'Figure X has four sides', 'Some triangles do not have three sides'],
      explanation: 'Step 1: All triangles have three sides — definition.\nStep 2: Figure X is a triangle — specific instance.\nStep 3: By definition, Figure X has three sides.\nAnswer: Figure X has three sides.',
      key: 'syllogism-12',
    },
    {
      prompt: 'Some fruits are sweet. All sweet things contain sugar. Therefore:',
      answer: 'Some fruits contain sugar',
      distractors: ['All fruits contain sugar', 'No fruit contains sugar', 'All sugar-containing things are fruits'],
      explanation: 'Step 1: Some fruits → sweet, all sweet → contain sugar.\nStep 2: The fruits that are sweet also contain sugar.\nStep 3: So some fruits contain sugar.\nAnswer: Some fruits contain sugar.',
      key: 'syllogism-13',
    },
    {
      prompt: 'No fish is a mammal. Some mammals live in water. Therefore:',
      answer: 'Some water-dwelling animals are not fish',
      distractors: ['All water-dwelling animals are fish', 'Some fish are mammals', 'No mammal lives in water'],
      explanation: 'Step 1: No fish is a mammal — fish and mammals do not overlap.\nStep 2: Some mammals live in water.\nStep 3: Those water-dwelling mammals cannot be fish.\nAnswer: Some water-dwelling animals are not fish.',
      key: 'syllogism-14',
    },
    {
      prompt: 'All students must take exams. Rohan is a student. Therefore:',
      answer: 'Rohan must take exams',
      distractors: ['Rohan is exempt from exams', 'All exam-takers are Rohan', 'Some students skip exams'],
      explanation: 'Step 1: All students must take exams — universal rule.\nStep 2: Rohan is a student — specific instance.\nStep 3: By universal application, Rohan must take exams.\nAnswer: Rohan must take exams.',
      key: 'syllogism-15',
    },
    {
      prompt: 'All planets orbit a star. Earth is a planet. Therefore:',
      answer: 'Earth orbits a star',
      distractors: ['All orbiting bodies are Earth', 'Earth does not orbit a star', 'Some planets do not orbit a star'],
      explanation: 'Step 1: All planets orbit a star — universal rule.\nStep 2: Earth is a planet — specific instance.\nStep 3: By universal application, Earth orbits a star.\nAnswer: Earth orbits a star.',
      key: 'syllogism-16',
    },
    {
      prompt: 'Some artists are painters. All painters use brushes. Therefore:',
      answer: 'Some artists use brushes',
      distractors: ['All artists use brushes', 'No artist uses brushes', 'All brush users are artists'],
      explanation: 'Step 1: Some artists → painters, all painters → use brushes.\nStep 2: The artists who are painters also use brushes.\nStep 3: So some artists use brushes.\nAnswer: Some artists use brushes.',
      key: 'syllogism-17',
    },
    {
      prompt: 'All lawyers have law degrees. Some law degree holders are judges. Therefore:',
      answer: 'Some lawyers may or may not be judges',
      distractors: ['All lawyers are judges', 'No lawyer is a judge', 'All judges are lawyers'],
      explanation: 'Step 1: All lawyers → law degrees, some law degree holders → judges.\nStep 2: The judges with law degrees might or might not be lawyers.\nStep 3: We cannot determine if any lawyer is a judge.\nAnswer: Some lawyers may or may not be judges.',
      key: 'syllogism-18',
    },
    {
      prompt: 'No reptile is warm-blooded. All mammals are warm-blooded. Therefore:',
      answer: 'No mammal is a reptile',
      distractors: ['All mammals are reptiles', 'Some mammals are reptiles', 'All reptiles are mammals'],
      explanation: 'Step 1: No reptile is warm-blooded — reptiles are cold-blooded.\nStep 2: All mammals are warm-blooded — mammals are entirely warm-blooded.\nStep 3: Since mammals are warm-blooded and no reptile is, no mammal is a reptile.\nAnswer: No mammal is a reptile.',
      key: 'syllogism-19',
    },
    {
      prompt: 'All programmers write code. Some code is buggy. Therefore:',
      answer: 'Some programmers may or may not write buggy code',
      distractors: ['All programmers write buggy code', 'No programmer writes buggy code', 'All buggy code is written by programmers'],
      explanation: 'Step 1: All programmers → write code, some code → buggy.\nStep 2: The buggy code might or might not be written by any given programmer.\nStep 3: We cannot determine which programmers write buggy code.\nAnswer: Some programmers may or may not write buggy code.',
      key: 'syllogism-20',
    },
  ];
  const s = pick(syllogisms);
  return mcq(difficulty, s.prompt, s.answer, s.distractors, s.explanation, s.key);
}

// ─── 12. Statement & conclusion ─────────────────────────────────────────────

function genStatementConclusion(difficulty: Difficulty): Question {
  const scenarios = [
    {
      prompt: 'Statement: The price of petrol has increased by 20%. Conclusion: People will use public transport more. Which of the following is correct?',
      answer: 'The conclusion probably follows from the statement',
      distractors: ['The conclusion definitely does not follow', 'The conclusion is unrelated', 'The statement is false'],
      explanation: 'Step 1: A 20% price increase makes driving more expensive.\nStep 2: Higher costs typically push people toward alternatives.\nStep 3: It is probable (not certain) that more people will use public transport.\nAnswer: The conclusion probably follows.',
      key: 'stmt-1',
    },
    {
      prompt: 'Statement: Regular exercise improves cardiovascular health. Conclusion: Everyone who exercises will never have heart disease. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'The statement is false', 'The conclusion is probably true'],
      explanation: 'Step 1: Exercise improves health — this is true.\nStep 2: But "improves" does not mean "prevents all disease."\nStep 3: Other factors (genetics, diet) also affect heart disease.\nAnswer: The conclusion does not follow.',
      key: 'stmt-2',
    },
    {
      prompt: 'Statement: All employees must complete safety training by March. Conclusion: Employees who do not complete training by March will face consequences. Which is correct?',
      answer: 'The conclusion probably follows from the statement',
      distractors: ['The conclusion definitely does not follow', 'The statement and conclusion are unrelated', 'The conclusion is definitely true'],
      explanation: 'Step 1: A mandatory requirement implies non-compliance has consequences.\nStep 2: The specific consequence is not stated, but some consequence is implied.\nStep 3: The conclusion probably follows.\nAnswer: The conclusion probably follows.',
      key: 'stmt-3',
    },
    {
      prompt: 'Statement: A company\'s revenue grew by 50% this year. Conclusion: The company is profitable. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'The statement is false', 'Revenue growth means profitability'],
      explanation: 'Step 1: Revenue growth means more money coming in.\nStep 2: But profitability = revenue − costs. Costs are not mentioned.\nStep 3: High revenue with high costs can still mean losses.\nAnswer: The conclusion does not follow.',
      key: 'stmt-4',
    },
    {
      prompt: 'Statement: Students who sleep 8 hours perform better on tests. Conclusion: Sleeping more than 8 hours will improve test scores even further. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'The statement is false', 'More sleep always means better scores'],
      explanation: 'Step 1: 8 hours correlates with better performance.\nStep 2: The statement doesn\'t say "more is better" — it says 8 hours is good.\nStep 3: Oversleeping might have negative effects — we can\'t conclude more is better.\nAnswer: The conclusion does not follow.',
      key: 'stmt-5',
    },
    {
      prompt: 'Statement: A diet high in sugar increases the risk of diabetes. Conclusion: Reducing sugar intake will cure diabetes. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'The statement is false', 'Sugar reduction cures all diseases'],
      explanation: 'Step 1: High sugar increases risk — this is about prevention, not cure.\nStep 2: Reducing sugar may help manage risk but doesn\'t cure existing diabetes.\nStep 3: Cure and prevention are different things.\nAnswer: The conclusion does not follow.',
      key: 'stmt-6',
    },
    {
      prompt: 'Statement: The city has recorded its highest rainfall in 50 years. Conclusion: The city will experience flooding. Which is correct?',
      answer: 'The conclusion probably follows from the statement',
      distractors: ['The conclusion definitely does not follow', 'The conclusion is unrelated', 'The statement is false'],
      explanation: 'Step 1: Record rainfall means an unusually large amount of water.\nStep 2: Drainage systems may not handle extreme rainfall.\nStep 3: Flooding is probable but not certain (depends on infrastructure).\nAnswer: The conclusion probably follows.',
      key: 'stmt-7',
    },
    {
      prompt: 'Statement: People who read regularly have larger vocabularies. Conclusion: Reading causes vocabulary growth. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'Reading and vocabulary are unrelated', 'The statement is false'],
      explanation: 'Step 1: Regular readers have larger vocabularies — this is a correlation.\nStep 2: Correlation does not prove causation. People with large vocabularies may simply enjoy reading more.\nStep 3: Without controlling for other factors, we cannot conclude reading causes vocabulary growth.\nAnswer: The conclusion does not follow.',
      key: 'stmt-8',
    },
    {
      prompt: 'Statement: The unemployment rate has decreased by 2%. Conclusion: The economy is improving. Which is correct?',
      answer: 'The conclusion probably follows from the statement',
      distractors: ['The conclusion definitely does not follow', 'The conclusion is unrelated', 'Lower unemployment means a perfect economy'],
      explanation: 'Step 1: Lower unemployment generally indicates economic growth.\nStep 2: However, unemployment rate alone doesn\'t capture the full economy.\nStep 3: It is probable but not certain that the economy is improving.\nAnswer: The conclusion probably follows.',
      key: 'stmt-9',
    },
    {
      prompt: 'Statement: All cars in the parking lot are red. Conclusion: All cars in the city are red. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'The statement is false', 'Most cars are red'],
      explanation: 'Step 1: The statement only covers the parking lot — a specific subset.\nStep 2: We cannot generalize from one parking lot to the entire city.\nStep 3: This is a hasty generalization.\nAnswer: The conclusion does not follow.',
      key: 'stmt-10',
    },
    {
      prompt: 'Statement: A study shows that 90% of patients recovered after taking medicine X. Conclusion: Medicine X cures the disease. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'The study is fake', 'Medicine X cures all diseases'],
      explanation: 'Step 1: 90% recovery rate is observed, but there is no control group mentioned.\nStep 2: Without a control group, we cannot know if patients would have recovered without the medicine.\nStep 3: The recovery could be due to natural healing, not the medicine. Causation is not proven.\nAnswer: The conclusion does not follow.',
      key: 'stmt-11',
    },
    {
      prompt: 'Statement: The temperature has dropped by 10 degrees. Conclusion: It will rain. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'Temperature drop causes rain', 'The statement is false'],
      explanation: 'Step 1: A temperature drop means cooler weather.\nStep 2: Rain depends on humidity, cloud formation, and pressure — not just temperature.\nStep 3: We cannot conclude rain from temperature alone.\nAnswer: The conclusion does not follow.',
      key: 'stmt-12',
    },
    {
      prompt: 'Statement: Company policy says every employee who arrives late receives a warning. Conclusion: An employee who arrives late will receive a warning. Which is correct?',
      answer: 'The conclusion definitely follows from the statement',
      distractors: ['The conclusion does not follow', 'Some late arrivals receive no warning', 'The statement is unrelated'],
      explanation: 'Step 1: The policy applies to every employee who arrives late.\nStep 2: A late employee is therefore covered by the stated rule.\nStep 3: The employee will receive a warning.\nAnswer: The conclusion definitely follows.',
      key: 'stmt-13',
    },
    {
      prompt: 'Statement: House prices have doubled in the last 5 years. Conclusion: It is harder for young people to buy houses. Which is correct?',
      answer: 'The conclusion probably follows from the statement',
      distractors: ['The conclusion definitely does not follow', 'House prices and affordability are unrelated', 'The statement is false'],
      explanation: 'Step 1: Doubled prices mean higher cost to purchase.\nStep 2: Young people typically have lower savings and income.\nStep 3: Higher prices likely make it harder for them — probable but not certain.\nAnswer: The conclusion probably follows.',
      key: 'stmt-14',
    },
    {
      prompt: 'Statement: A survey found that 80% of customers prefer online shopping. Conclusion: Physical stores will close within a year. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', '80% preference means stores close', 'The survey is wrong'],
      explanation: 'Step 1: 80% prefer online — but 20% still prefer physical stores.\nStep 2: Preference doesn\'t mean people stop visiting stores entirely.\nStep 3: Stores closing within a year is too extreme a conclusion.\nAnswer: The conclusion does not follow.',
      key: 'stmt-15',
    },
    {
      prompt: 'Statement: The school has introduced a new grading policy. Conclusion: Student performance will improve. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'New policies always improve performance', 'The statement is false'],
      explanation: 'Step 1: A new grading policy changes how performance is measured.\nStep 2: Changing the grading system doesn\'t directly cause better learning.\nStep 3: Performance depends on teaching quality, effort, and many other factors.\nAnswer: The conclusion does not follow.',
      key: 'stmt-16',
    },
    {
      prompt: 'Statement: A person caught on CCTV stealing was identified as an employee. Conclusion: The employee should be fired. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'CCTV evidence is unreliable', 'Theft is acceptable in the workplace'],
      explanation: 'Step 1: CCTV provides evidence of theft by an employee.\nStep 2: However, "should be fired" is a normative conclusion — it depends on company policy, due process, and circumstances.\nStep 3: The statement is factual; the conclusion is a judgment that cannot be derived from the facts alone.\nAnswer: The conclusion does not follow.',
      key: 'stmt-17',
    },
    {
      prompt: 'Statement: The new highway has reduced travel time by 40%. Conclusion: People will commute from farther away. Which is correct?',
      answer: 'The conclusion probably follows from the statement',
      distractors: ['The conclusion definitely does not follow', 'Travel time and commuting are unrelated', 'The statement is false'],
      explanation: 'Step 1: 40% less travel time makes distant locations more accessible.\nStep 2: When commuting is faster, people may choose to live farther away.\nStep 3: This is probable but depends on other factors (cost, preference).\nAnswer: The conclusion probably follows.',
      key: 'stmt-18',
    },
    {
      prompt: 'Statement: All participants who completed the marathon received a medal. Conclusion: Everyone with a medal completed the marathon. Which is correct?',
      answer: 'The conclusion does not follow from the statement',
      distractors: ['The conclusion definitely follows', 'Medals are only given to marathon finishers', 'The statement is false'],
      explanation: 'Step 1: Marathon finishers → received medals. This is one direction.\nStep 2: The statement does NOT say medal recipients → marathon finishers (converse).\nStep 3: Medals could be given for other events too.\nAnswer: The conclusion does not follow.',
      key: 'stmt-19',
    },
    {
      prompt: 'Statement: The factory emits toxic gases into the air. Conclusion: Nearby residents have higher rates of respiratory illness. Which is correct?',
      answer: 'The conclusion probably follows from the statement',
      distractors: ['The conclusion definitely does not follow', 'Toxic gases are harmless', 'The statement is false'],
      explanation: 'Step 1: Toxic gases are known to harm respiratory health.\nStep 2: Nearby residents breathe the air from the factory.\nStep 3: Higher illness rates are probable but depend on exposure levels and other factors.\nAnswer: The conclusion probably follows.',
      key: 'stmt-20',
    },
  ];
  const s = pick(scenarios);
  return mcq(difficulty, s.prompt, s.answer, s.distractors, s.explanation, s.key);
}

// ─── 18. Missing number in grid ──────────────────────────────────────────────

function genMissingNumberGrid(difficulty: Difficulty): Question {
  // 3x3 grid with one missing cell (bottom-right).
  // Pattern types: row-sum, row-product, row-difference, col-sum, diagonal-sum
  const patternType = pick(['row-sum', 'col-sum', 'row-product', 'row-diff', 'diag-sum'] as const);
  let grid: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let answer = 0;
  let explanation = '';
  const range = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 20 : 50;

  if (patternType === 'row-sum') {
    // Each row sums to the same total S
    const S = randInt(20, 60);
    for (let r = 0; r < 2; r++) {
      const a = randInt(2, S - 4);
      const b = randInt(2, S - a - 2);
      const c = S - a - b;
      grid[r] = [a, b, c];
    }
    const a = randInt(2, S - 4);
    const b = randInt(2, S - a - 2);
    grid[2] = [a, b, 0];
    answer = S - a - b;
    explanation = `Step 1: Each row sums to ${S}. Row 1: ${grid[0][0]}+${grid[0][1]}+${grid[0][2]}=${S}. Row 2: ${grid[1][0]}+${grid[1][1]}+${grid[1][2]}=${S}.\nStep 2: Row 3: ${a}+${b}+?=${S}, so ? = ${S}−${a}−${b} = ${answer}.\nAnswer: ${answer}.`;
  } else if (patternType === 'col-sum') {
    const S = randInt(20, 60);
    for (let c = 0; c < 2; c++) {
      const a = randInt(2, S - 4);
      const b = randInt(2, S - a - 2);
      grid[0][c] = a; grid[1][c] = b; grid[2][c] = S - a - b;
    }
    const a = randInt(2, S - 4);
    const b = randInt(2, S - a - 2);
    grid[0][2] = a; grid[1][2] = b; grid[2][2] = 0;
    answer = S - a - b;
    explanation = `Step 1: Each column sums to ${S}. Col 1: ${grid[0][0]}+${grid[1][0]}+${grid[2][0]}=${S}. Col 2: ${grid[0][1]}+${grid[1][1]}+${grid[2][1]}=${S}.\nStep 2: Col 3: ${a}+${b}+?=${S}, so ? = ${S}−${a}−${b} = ${answer}.\nAnswer: ${answer}.`;
  } else if (patternType === 'row-product') {
    // Each row: a * b = c (third cell is product of first two)
    for (let r = 0; r < 2; r++) {
      const a = randInt(2, Math.min(6, range));
      const b = randInt(2, Math.min(6, range));
      grid[r] = [a, b, a * b];
    }
    const a = randInt(2, Math.min(6, range));
    const b = randInt(2, Math.min(6, range));
    grid[2] = [a, b, 0];
    answer = a * b;
    explanation = `Step 1: In each row, col 3 = col 1 × col 2. Row 1: ${grid[0][0]}×${grid[0][1]}=${grid[0][2]}. Row 2: ${grid[1][0]}×${grid[1][1]}=${grid[1][2]}.\nStep 2: Row 3: ${a}×${b} = ${answer}.\nAnswer: ${answer}.`;
  } else if (patternType === 'row-diff') {
    // Each row: col3 = col1 + col2 (same as row-sum but framed as difference pattern)
    // Actually use: col3 - col2 = col1, i.e., col3 = col1 + col2
    const base = randInt(5, range);
    for (let r = 0; r < 2; r++) {
      const a = randInt(2, base);
      const b = randInt(2, base);
      grid[r] = [a, b, a + b];
    }
    const a = randInt(2, base);
    const b = randInt(2, base);
    grid[2] = [a, b, 0];
    answer = a + b;
    explanation = `Step 1: In each row, col 3 = col 1 + col 2. Row 1: ${grid[0][0]}+${grid[0][1]}=${grid[0][2]}. Row 2: ${grid[1][0]}+${grid[1][1]}=${grid[1][2]}.\nStep 2: Row 3: ${a}+${b} = ${answer}.\nAnswer: ${answer}.`;
  } else {
    // diag-sum: main diagonal and anti-diagonal sum to same value
    const S = randInt(20, 60);
    const a = randInt(2, S - 4);
    const c = randInt(2, S - 4);
    const d = randInt(2, S - c - 2);
    // grid[0][0]=a, grid[1][1]=center, grid[2][2]=answer (main diagonal = S)
    // grid[0][2]=c, grid[1][1]=center, grid[2][0]=d (anti-diagonal = S)
    // center = S - a - answer = S - c - d => answer = a + c + d - S... too complex
    // Simpler: center = e, a + e + answer = S, c + e + d = S => answer = S - a - e, e = S - c - d
    const e = S - c - d;
    if (e < 2) { // fallback to row-sum
      const Sa = randInt(20, 60);
      for (let r = 0; r < 2; r++) {
        const xa = randInt(2, Sa - 4);
        const xb = randInt(2, Sa - xa - 2);
        grid[r] = [xa, xb, Sa - xa - xb];
      }
      const xa = randInt(2, Sa - 4);
      const xb = randInt(2, Sa - xa - 2);
      grid[2] = [xa, xb, 0];
      answer = Sa - xa - xb;
      explanation = `Step 1: Each row sums to ${Sa}.\nStep 2: Row 3: ${xa}+${xb}+?=${Sa}, so ? = ${answer}.\nAnswer: ${answer}.`;
    } else {
      grid[0][0] = a; grid[0][1] = randInt(2, range); grid[0][2] = c;
      grid[1][0] = randInt(2, range); grid[1][1] = e; grid[1][2] = randInt(2, range);
      grid[2][0] = d; grid[2][1] = randInt(2, range); grid[2][2] = 0;
      answer = S - a - e;
      if (answer < 2) {
        // answer would be too small — fall back to row-sum pattern entirely
        const Sa = randInt(20, 60);
        for (let r = 0; r < 2; r++) {
          const xa = randInt(2, Sa - 4);
          const xb = randInt(2, Sa - xa - 2);
          grid[r] = [xa, xb, Sa - xa - xb];
        }
        const xa = randInt(2, Sa - 4);
        const xb = randInt(2, Sa - xa - 2);
        grid[2] = [xa, xb, 0];
        answer = Sa - xa - xb;
        explanation = `Step 1: Each row sums to ${Sa}.\nStep 2: Row 3: ${xa}+${xb}+?=${Sa}, so ? = ${answer}.\nAnswer: ${answer}.`;
      } else {
        grid[2][2] = 0; // keep as placeholder, we display ? in prompt
        explanation = `Step 1: Both diagonals sum to ${S}. Main diagonal: ${a}+${e}+?=${S}. Anti-diagonal: ${c}+${e}+${d}=${S}.\nStep 2: From the main diagonal: ? = ${S}−${a}−${e} = ${answer}.\nAnswer: ${answer}.`;
      }
    }
  }

  // Build grid display with ? in place of the missing cell
  const gridDisplay = grid.map((row) => row.map((v) => v === 0 ? '?' : String(v)).join(' | ')).join('\n');
  // Distractors: answer±1, answer±2, answer±5
  const distractorSet = new Set<number>();
  const deltas = [1, -1, 2, -2, 5, -5, 3, -3, 10, -10];
  for (const delta of deltas) {
    const d = answer + delta;
    if (d > 0 && d !== answer && !distractorSet.has(d)) {
      distractorSet.add(d);
      if (distractorSet.size >= 3) break;
    }
  }
  const distractors = [...distractorSet].map(String);
  return mcq(
    difficulty,
    `Find the missing number in the grid:\n\n${gridDisplay}\n\nWhat replaces the question mark?`,
    String(answer),
    distractors,
    explanation,
    `grid-missing:${patternType}:${grid.flat().join(',')}`,
  );
}

// ─── Generator entry point ──────────────────────────────────────────────────

const GENERATORS: ((d: Difficulty) => Question)[] = [
  genBloodGrandparent, genBloodSibling, genBloodInLaw,
  genBloodUncle, genBloodNiece, genBloodCousin, genBloodMotherInLaw,
  genDirectionSimple, genDirectionShadow, genDirectionDistance,
  genArrangement, genArrangementConstraint,
  genRanking, genCalendar, genClockAngle,
  genSyllogism, genStatementConclusion, genMissingNumberGrid,
];

export function generateLogicalReasoning(difficulty: Difficulty): Question {
  return pick(GENERATORS)(difficulty);
}

import type { Difficulty, Question } from './types';

// ─── Utilities ──────────────────────────────────────────────────────────────

let counter = 0;
function makeId(): string {
  counter++;
  return `letter-coding-${counter}`;
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

const WORDS = [
  'TIGER', 'WORLD', 'HOUSE', 'PLANT', 'RIVER', 'CLOUD', 'MANGO', 'BRAVE',
  'STONE', 'TRAIN', 'LIGHT', 'MOUSE', 'EARTH', 'MUSIC', 'NIGHT', 'POWER',
  'SPACE', 'WATER', 'CHAIR', 'TABLE',
];

const SYMBOLS = ['!', '@', '#', '$', '%', '^', '&', '*', '+', '=', '?', '~', '<', '>', '|', '¤', '§', '¶', '¿', '¡'];

/** Shift every letter in a word by `shift` positions (wraps around Z→A). */
function shiftWord(word: string, shift: number): string {
  return [...word]
    .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift + 26) % 26) + 65))
    .join('');
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
  // Pad with shifted variants if needed
  let pad = 1;
  while (uniqueDistractors.length < 3) {
    const d = shiftWord(correct, pad++);
    if (!seen.has(d)) {
      seen.add(d);
      uniqueDistractors.push(d);
    }
  }
  const options = shuffle([correct, ...uniqueDistractors.slice(0, 3)]);
  return {
    id: makeId(),
    category: 'letter-coding',
    difficulty,
    source: 'generator',
    prompt,
    options,
    answerIndex: options.indexOf(correct),
    explanation,
    dedupeKey,
  };
}

// ─── 1. Forward shift coding ────────────────────────────────────────────────

function genShiftForward(difficulty: Difficulty): Question {
  const word = pick(WORDS);
  const shift = randInt(1, difficulty === 'hard' ? 5 : 3);
  const answer = shiftWord(word, shift);
  return mcq(
    difficulty,
    `In a certain code, each letter is shifted ${shift} place${shift === 1 ? '' : 's'} forward in the alphabet. How is ${word} written in this code?`,
    answer,
    [shiftWord(word, -shift), shiftWord(word, shift + 1), word.split('').reverse().join('')],
    `Step 1: Shift each letter ${shift} position${shift === 1 ? '' : 's'} forward in the alphabet (e.g. A→${String.fromCharCode(65 + shift)}, B→${String.fromCharCode(66 + shift)}, ..., wrapping Z→A).\nStep 2: ${[...word].map((ch, i) => `${ch}→${answer[i]}`).join(', ')}.\nStep 3: ${word} → ${answer}.\nAnswer: ${answer}.`,
    `shift-fwd:${word}:${shift}`,
  );
}

// ─── 2. Backward shift coding ───────────────────────────────────────────────

function genShiftBackward(difficulty: Difficulty): Question {
  const word = pick(WORDS);
  const shift = randInt(1, difficulty === 'hard' ? 5 : 3);
  const answer = shiftWord(word, -shift);
  return mcq(
    difficulty,
    `In a certain code, each letter is shifted ${shift} place${shift === 1 ? '' : 's'} backward in the alphabet. How is ${word} written in this code?`,
    answer,
    [shiftWord(word, shift), shiftWord(word, -(shift + 1)), word.split('').reverse().join('')],
    `Step 1: Shift each letter ${shift} position${shift === 1 ? '' : 's'} backward in the alphabet (e.g. A→${String.fromCharCode(65 - shift + 26)}, B→${String.fromCharCode(66 - shift)}, ..., wrapping A→Z).\nStep 2: ${[...word].map((ch, i) => `${ch}→${answer[i]}`).join(', ')}.\nStep 3: ${word} → ${answer}.\nAnswer: ${answer}.`,
    `shift-bwd:${word}:${shift}`,
  );
}

// ─── 3. Reverse coding ──────────────────────────────────────────────────────

function genReverse(difficulty: Difficulty): Question {
  const word = pick(WORDS);
  const answer = word.split('').reverse().join('');
  return mcq(
    difficulty,
    `If the letters of the word ${word} are written in reverse order, what is the result?`,
    answer,
    [shiftWord(word, 1), word.slice(1) + word[0], word],
    `Step 1: Write the word: ${word}.\nStep 2: Reverse the order of letters: ${word.split('').reverse().join(' ← ')}.\nStep 3: ${word} → ${answer}.\nAnswer: ${answer}.`,
    `reverse:${word}`,
  );
}

// ─── 4. Alphabet value sum ──────────────────────────────────────────────────

function genAlphabetValue(difficulty: Difficulty): Question {
  const word = pick(WORDS);
  const answer = [...word].reduce((sum, ch) => sum + ch.charCodeAt(0) - 64, 0);
  return mcq(
    difficulty,
    `Using A=1, B=2, C=3, ..., Z=26, what is the total value of the word ${word}?`,
    String(answer),
    [String(answer - 2), String(answer + 2), String(answer + word.length)],
    `Step 1: Assign each letter its position (A=1, B=2, ..., Z=26).\nStep 2: ${[...word].map((ch) => `${ch}=${ch.charCodeAt(0) - 64}`).join(', ')}.\nStep 3: Sum = ${[...word].map((ch) => ch.charCodeAt(0) - 64).join(' + ')} = ${answer}.\nAnswer: ${answer}.`,
    `alpha-value:${word}`,
  );
}

// ─── 5. Number coding (word → digit pattern) ────────────────────────────────

function genNumberCoding(difficulty: Difficulty): Question {
  const word = pick(WORDS);
  const multiplier = randInt(2, difficulty === 'hard' ? 5 : 3);
  const positions = word.split('').map((ch) => ch.charCodeAt(0) - 64);
  const answer = positions.map((value) => String(value * multiplier)).join(',');
  const plain = positions.join(',');
  const added = positions.map((value) => String(value + multiplier)).join(',');
  const reversed = [...positions].reverse().map((value) => String(value * multiplier)).join(',');
  return mcq(
    difficulty,
    `Using A=1, B=2, ..., Z=26, multiply each letter's value by ${multiplier}. How is ${word} written in this code?`,
    answer,
    [plain, added, reversed],
    `Step 1: Convert each letter to its alphabet position: ${word.split('').map((ch, index) => `${ch}=${positions[index]}`).join(', ')}.\nStep 2: Multiply every position by ${multiplier}: ${positions.map((value) => `${value}×${multiplier}=${value * multiplier}`).join(', ')}.\nStep 3: Write the results in the same order: ${answer}.\nAnswer: ${answer}.`,
    `number-code:${word}:${multiplier}`,
  );
}

// ─── 6. Mixed coding (letters → numbers, then shift) ────────────────────────

function genMixedCoding(difficulty: Difficulty): Question {
  const word = pick(WORDS);
  const shift = randInt(1, 3);
  // Encode: each letter → its position, then add shift
  const answer = word.split('').map((ch) => String(ch.charCodeAt(0) - 64 + shift)).join(',');
  const plain = word.split('').map((ch) => String(ch.charCodeAt(0) - 64)).join(',');
  return mcq(
    difficulty,
    `In a certain code, each letter is replaced by its alphabet position and then ${shift} is added. If ${word} would normally be ${plain}, what is its coded form?`,
    answer,
    [plain, word.split('').map((ch) => String(ch.charCodeAt(0) - 64 + shift + 1)).join(','), word.split('').map((ch) => String(ch.charCodeAt(0) - 64 + shift * 2)).join(',')],
    `Step 1: Each letter → its alphabet position, then add ${shift}.\nStep 2: ${word.split('').map((ch) => `${ch}=${ch.charCodeAt(0) - 64}, +${shift} = ${ch.charCodeAt(0) - 64 + shift}`).join('; ')}.\nStep 3: ${word} → ${answer}.\nAnswer: ${answer}.`,
    `mixed-code:${word}:${shift}`,
  );
}

// ─── 7. Letter-number pair coding ───────────────────────────────────────────

function genLetterNumberPair(difficulty: Difficulty): Question {
  const word = pick(WORDS);
  const shift = randInt(1, 5);
  const coded = shiftWord(word, shift);
  // Ask: "If WORD is coded as CODED, how is TESTWORD coded?"
  const testWord = pick(WORDS.filter((w) => w !== word));
  const answer = shiftWord(testWord, shift);
  return mcq(
    difficulty,
    `If ${word} is coded as ${coded}, how is ${testWord} coded using the same rule?`,
    answer,
    [shiftWord(testWord, -shift), shiftWord(testWord, shift + 1), testWord.split('').reverse().join('')],
    `Step 1: From the example, ${word} → ${coded}. Compare letters: ${[...word].map((ch, i) => `${ch}→${coded[i]}`).join(', ')}.\nStep 2: The rule is: shift each letter ${shift} forward.\nStep 3: Apply to ${testWord}: ${[...testWord].map((ch, i) => `${ch}→${answer[i]}`).join(', ')} → ${answer}.\nAnswer: ${answer}.`,
    `pair-code:${word}:${testWord}:${shift}`,
  );
}

// ─── 8. Symbol substitution coding ───────────────────────────────────────────

function genSymbolSubstitution(difficulty: Difficulty): Question {
  const letterCount = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 6 : 7;
  // All WORDS are 5 letters, so always use wordLength = 5
  const wordLength = 5;
  // Pick the word FIRST, then build the mapping around it
  const word = pick(WORDS.filter((w) => w.length === wordLength));
  const wordLetters = [...new Set(word.split(''))];
  // Add more random letters to reach letterCount
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const extraLetters = shuffle(allLetters.filter((l) => !wordLetters.includes(l)));
  const selectedLetters = [...wordLetters, ...extraLetters.slice(0, Math.max(0, letterCount - wordLetters.length))];
  // Assign unique symbols
  const assignedSymbols = shuffle([...SYMBOLS]).slice(0, selectedLetters.length);
  const mapping: Record<string, string> = {};
  selectedLetters.forEach((letter, i) => { mapping[letter] = assignedSymbols[i]; });
  const answer = [...word].map((ch) => mapping[ch]).join('');
  // Build distractors: swap two symbols, or use wrong symbol for one letter
  const distractors: string[] = [];
  // Distractor 1: swap two adjacent letters' symbols
  if (word.length >= 2) {
    const swapped = [...word];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    distractors.push(swapped.map((ch) => mapping[ch]).join(''));
  }
  // Distractor 2: use a wrong symbol for the first letter
  const wrongSymbol = [...word];
  const wrongLetter = pick(selectedLetters.filter((l) => l !== word[0]));
  wrongSymbol[0] = wrongLetter;
  distractors.push(wrongSymbol.map((ch) => mapping[ch]).join(''));
  // Distractor 3: reverse the word
  distractors.push([...word].reverse().map((ch) => mapping[ch]).join(''));
  // Build table display
  const tableRows = selectedLetters.map((letter) => `${letter} → ${mapping[letter]}`).join('  |  ');
  return mcq(
    difficulty,
    `In a certain code, the letters are represented as follows: ${tableRows}. How is the word "${word}" written in this code?`,
    answer,
    distractors,
    `Step 1: The code table maps each letter to a symbol: ${selectedLetters.map((l) => `${l}=${mapping[l]}`).join(', ')}.\nStep 2: For the word ${word}: ${[...word].map((ch) => `${ch}→${mapping[ch]}`).join(', ')}.\nStep 3: The coded form is ${answer}.\nAnswer: ${answer}.`,
    `symbol-sub:${word}:${selectedLetters.join('')}`,
  );
}

// ─── Generator entry point ──────────────────────────────────────────────────

const GENERATORS: ((d: Difficulty) => Question)[] = [
  genShiftForward, genShiftBackward, genReverse, genAlphabetValue,
  genNumberCoding, genMixedCoding, genLetterNumberPair, genSymbolSubstitution,
];

export function generateLetterCoding(difficulty: Difficulty): Question {
  return pick(GENERATORS)(difficulty);
}

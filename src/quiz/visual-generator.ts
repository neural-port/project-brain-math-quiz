import type { Difficulty, Question, QuestionCategory, ShapeName, ShapeSpec } from './types';

const BASIC_SHAPES: ShapeName[] = [
  'circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'star', 'arrow', 'flag', 'l-shape',
];
const ASYMMETRIC_SHAPES: ShapeName[] = ['arrow', 'flag', 'l-shape', 'scalene-triangle'];
// Shapes with NO line of symmetry — safe as "not symmetrical" distractors and
// for mirror questions (any flip on either axis is visibly different).
// NOTE: the arrow is NOT here — it is symmetric about its long axis.
const NO_SYMMETRY_SHAPES: ShapeName[] = ['flag', 'l-shape', 'scalene-triangle'];
// For mirror questions: the shape must look different when flipped on either
// axis. Arrow is excluded — it is symmetric about its own horizontal axis, so
// a top-bottom flip (or left-right flip when rotated 90°/270°) produces an
// image identical to the original — an unsolvable question.
const MIRROR_SHAPES: ShapeName[] = NO_SYMMETRY_SHAPES;

/** Side counts used for "which shape has N sides" questions. */
const SIDES: Partial<Record<ShapeName, number>> = {
  circle: 0,
  triangle: 3,
  square: 4,
  rectangle: 4,
  pentagon: 5,
  hexagon: 6,
  star: 10,
  arrow: 7,
  'l-shape': 6,
};
let visualCounter = 0;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function id(category: QuestionCategory): string {
  visualCounter++;
  return `visual-${category}-${visualCounter}`;
}

function title(shape: ShapeName): string {
  return shape.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function generateShapeChoice(difficulty: Difficulty): Question {
  const variant = pick(['identify', 'identify', 'sides', 'odd-one-out', 'most-sides', 'symmetry']);
  if (variant === 'sides') return generateSidesQuestion(difficulty);
  if (variant === 'odd-one-out') return generateOddOneOut(difficulty);
  if (variant === 'most-sides') return generateMostSides(difficulty);
  if (variant === 'symmetry') return generateSymmetry(difficulty);

  const targetShape = pick(BASIC_SHAPES);
  const distractors = shuffle(BASIC_SHAPES.filter((shape) => shape !== targetShape)).slice(0, 3);
  const specs = shuffle([targetShape, ...distractors].map((shape) => ({
    shape,
    rotation: shape === 'square' || shape === 'circle' ? 0 : pick([0, 30, 45]),
    tone: pick(['green', 'cream', 'peach'] as const),
  })));
  const answerIndex = specs.findIndex((spec) => spec.shape === targetShape);

  return {
    id: id('geometry'),
    category: 'geometry',
    difficulty,
    source: 'generator',
    prompt: `Tap the ${title(targetShape)}.`,
    options: specs.map((spec) => title(spec.shape)),
    answerIndex,
    explanation: `The selected figure is a ${title(targetShape).toLowerCase()}.`,
    visual: { kind: 'shape-choice', options: specs },
    dedupeKey: `shape-choice:${targetShape}`,
  };
}

function generateOddOneOut(difficulty: Difficulty): Question {
  const same = pick(BASIC_SHAPES);
  const odd = pick(BASIC_SHAPES.filter((shape) => shape !== same));
  // Uniform tone — the answer must be found by SHAPE, not color.
  const tone = pick(['green', 'cream', 'peach'] as const);
  const specs = shuffle([
    { shape: odd, tone },
    { shape: same, tone },
    { shape: same, tone },
    { shape: same, tone },
  ]);
  const answerIndex = specs.findIndex((spec) => spec.shape === odd);

  return {
    id: id('visual-reasoning'),
    category: 'visual-reasoning',
    difficulty,
    source: 'generator',
    prompt: 'Tap the shape that is different from the rest.',
    options: specs.map((_, i) => `Option ${i + 1}`),
    answerIndex,
    explanation: `The ${title(odd).toLowerCase()} is different — the others are ${title(same).toLowerCase()}s.`,
    visual: { kind: 'shape-choice', options: specs },
    dedupeKey: `odd-one-out:${odd}:${same}`,
  };
}

function generateSidesQuestion(difficulty: Difficulty): Question {
  const n = pick([3, 4, 5, 6]);
  const correctShape = pick(BASIC_SHAPES.filter((shape) => SIDES[shape] === n));
  const wrongShapes = shuffle(
    BASIC_SHAPES.filter((shape) => SIDES[shape] !== undefined && SIDES[shape] !== n),
  ).slice(0, 3);
  const specs = shuffle(
    [correctShape, ...wrongShapes].map((shape) => ({
      shape,
      tone: pick(['green', 'cream', 'peach'] as const),
    })),
  );
  const answerIndex = specs.findIndex((spec) => spec.shape === correctShape);

  return {
    id: id('geometry'),
    category: 'geometry',
    difficulty,
    source: 'generator',
    prompt: `Which shape has exactly ${n} sides?`,
    options: specs.map((spec) => title(spec.shape)),
    answerIndex,
    explanation: `A ${title(correctShape).toLowerCase()} has ${n} sides.`,
    visual: { kind: 'shape-choice', options: specs },
    dedupeKey: `sides:${n}:${correctShape}`,
  };
}

function generateMostSides(difficulty: Difficulty): Question {
  // Pick 4 shapes with distinct side counts; the one with the most is the answer
  const withSides = BASIC_SHAPES.filter((s) => SIDES[s] !== undefined);
  const chosen = shuffle(withSides);
  const seenCounts = new Set<number>();
  const four: ShapeName[] = [];
  for (const s of chosen) {
    const n = SIDES[s]!;
    if (!seenCounts.has(n)) {
      seenCounts.add(n);
      four.push(s);
      if (four.length === 4) break;
    }
  }
  const best = four.reduce((a, b) => (SIDES[a]! > SIDES[b]! ? a : b));
  const specs = four.map((shape) => ({ shape, tone: pick(['green', 'cream', 'peach'] as const) }));
  const answerIndex = specs.findIndex((s) => s.shape === best);

  return {
    id: id('geometry'),
    category: 'geometry',
    difficulty,
    source: 'generator',
    prompt: 'Which of these shapes has the MOST sides?',
    options: specs.map((_, i) => `Option ${i + 1}`),
    answerIndex,
    explanation: `The ${title(best).toLowerCase()} has ${SIDES[best]} sides — the most of the four.`,
    visual: { kind: 'shape-choice', options: specs },
    dedupeKey: `most-sides:${four.sort().join(',')}`,
  };
}

// The arrow IS symmetrical (about its long axis) — it belongs in the correct
// pool, not the distractor pool.
const SYMMETRIC_SHAPES: ShapeName[] = ['circle', 'square', 'rectangle', 'triangle', 'pentagon', 'hexagon', 'star', 'arrow'];

function generateSymmetry(difficulty: Difficulty): Question {
  const symmetric = pick(SYMMETRIC_SHAPES);
  // Uniform tone — the answer must be found by SYMMETRY, not color.
  const tone = pick(['green', 'cream', 'peach'] as const);
  const specs = shuffle([
    { shape: symmetric, tone },
    ...NO_SYMMETRY_SHAPES.map((shape) => ({ shape, tone })),
  ]);
  const answerIndex = specs.findIndex((s) => s.shape === symmetric);

  return {
    id: id('visual-reasoning'),
    category: 'visual-reasoning',
    difficulty,
    source: 'generator',
    prompt: `Which of these shapes is symmetrical?`,
    options: specs.map((_, i) => `Option ${i + 1}`),
    answerIndex,
    explanation: `A ${title(symmetric).toLowerCase()} can be folded along a line so both halves match.`,
    visual: { kind: 'shape-choice', options: specs },
    dedupeKey: `symmetry:${symmetric}`,
  };
}

function generateMirror(difficulty: Difficulty): Question {
  // Only shapes with no symmetry axis — every flip is visibly different.
  const shape = pick(MIRROR_SHAPES);
  // 'lr' = flip left-to-right (mirror across a vertical line),
  // 'tb' = flip top-to-bottom (mirror across a horizontal line).
  const flip = pick(['lr', 'tb'] as const);
  const target: ShapeSpec = {
    shape,
    rotation: pick([0, 90, 180, 270]),
    tone: 'green',
  };
  const correct: ShapeSpec = {
    ...target,
    mirrorX: flip === 'lr',
    mirrorY: flip === 'tb',
  };
  const candidates: ShapeSpec[] = shuffle([
    correct,
    { ...target },
    { ...target, mirrorX: flip !== 'lr', mirrorY: flip !== 'tb' },
    { ...target, rotation: ((target.rotation ?? 0) + 180) % 360 },
  ]);
  const answerIndex = candidates.indexOf(correct);

  const flipLabel = flip === 'lr' ? 'left-to-right' : 'top-to-bottom';
  return {
    id: id('visual-reasoning'),
    category: 'visual-reasoning',
    difficulty,
    source: 'generator',
    prompt: `Which option is the figure flipped ${flipLabel}?`,
    options: candidates.map((_, index) => `Visual option ${index + 1}`),
    answerIndex,
    explanation:
      flip === 'lr'
        ? 'A left-to-right flip mirrors the figure across a vertical line — the left and right sides swap.'
        : 'A top-to-bottom flip mirrors the figure across a horizontal line — the top and bottom swap.',
    visual: { kind: 'mirror', target, options: candidates },
    dedupeKey: `mirror:${shape}:${flip}:${target.rotation}`,
  };
}

function generateCount(difficulty: Difficulty): Question {
  const countShape = pick(BASIC_SHAPES.slice(0, difficulty === 'easy' ? 4 : BASIC_SHAPES.length));
  const targetCount = randInt(2, difficulty === 'hard' ? 8 : difficulty === 'medium' ? 7 : 5);
  const distractorCount = difficulty === 'easy' ? randInt(2, 4) : randInt(3, 6);
  const otherShapes = BASIC_SHAPES.filter((shape) => shape !== countShape);
  const total = targetCount + distractorCount;
  const positions = shuffle(Array.from({ length: 12 }, (_, index) => index)).slice(0, total);
  const scene: ShapeSpec[] = positions.map((position, index) => ({
    shape: index < targetCount ? countShape : pick(otherShapes),
    x: 18 + (position % 4) * 25,
    y: 20 + Math.floor(position / 4) * 30,
    scale: pick([0.78, 0.9, 1]),
    rotation: pick([0, 15, 30, 45]),
    tone: index < targetCount ? 'green' : pick(['cream', 'peach'] as const),
  }));
  const answers = shuffle([targetCount, targetCount - 1, targetCount + 1, targetCount + 2]);

  return {
    id: id('geometry'),
    category: 'geometry',
    difficulty,
    source: 'generator',
    prompt: `How many ${title(countShape).toLowerCase()} shapes can you see?`,
    options: answers.map(String),
    answerIndex: answers.indexOf(targetCount),
    explanation: `There are ${targetCount} ${title(countShape).toLowerCase()} shapes.`,
    visual: { kind: 'count', scene, countShape },
    dedupeKey: `count:${countShape}:${targetCount}`,
  };
}

function generateRotate(difficulty: Difficulty): Question {
  const shape = pick(ASYMMETRIC_SHAPES);
  const targetAngle = pick(difficulty === 'easy' ? [90, 180, 270] : [45, 90, 135, 180, 225, 270, 315]);
  const startAngle = 0;

  return {
    id: id('visual-reasoning'),
    category: 'visual-reasoning',
    difficulty,
    source: 'generator',
    prompt: 'Drag around the dial to rotate the solid shape until it matches the outline.',
    options: ['Aligned', 'Not aligned'],
    answerIndex: 0,
    explanation: `The shape needed a ${targetAngle}° rotation.`,
    visual: {
      kind: 'rotate',
      shape: { shape, tone: 'green' },
      startAngle,
      targetAngle,
      tolerance: difficulty === 'hard' ? 10 : 15,
    },
    dedupeKey: `rotate:${shape}:${targetAngle}`,
  };
}

// ─── Memory dots ─────────────────────────────────────────────────────────────

/** Scatter dots without overlap in a normalized 0–100 square. */
function scatterDots(count: number): Array<{ x: number; y: number }> {
  const dots: Array<{ x: number; y: number }> = [];
  const minDist = count > 30 ? 9 : count > 20 ? 11 : 14;
  const edge = 7;
  let attempts = 0;
  while (dots.length < count && attempts < 2000) {
    attempts++;
    const x = edge + Math.random() * (100 - edge * 2);
    const y = edge + Math.random() * (100 - edge * 2);
    const ok = dots.every((d) => Math.hypot(d.x - x, d.y - y) >= minDist);
    if (ok) dots.push({ x, y });
  }
  // Fallback: jittered grid guarantees placement even if sampling stalled
  if (dots.length < count) {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    dots.length = 0;
    for (let i = 0; i < count; i++) {
      const cx = (i % cols) + 0.5;
      const cy = Math.floor(i / cols) + 0.5;
      dots.push({
        x: (cx + (Math.random() - 0.5) * 0.4) * (100 / cols),
        y: (cy + (Math.random() - 0.5) * 0.4) * (100 / rows),
      });
    }
  }
  return dots;
}

function generateMemoryDots(difficulty: Difficulty): Question {
  const dotCount = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 24 : 40;
  const seqLength = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;
  const dots = scatterDots(dotCount);
  const sequence = shuffle(Array.from({ length: dotCount }, (_, i) => i)).slice(0, seqLength);

  return {
    id: id('memory'),
    category: 'memory',
    difficulty,
    source: 'generator',
    prompt: 'Watch the dots light up, then tap them in the same order.',
    options: ['Completed correctly', 'Wrong order'],
    answerIndex: 0,
    explanation: `The correct sequence was ${seqLength} dots long.`,
    visual: {
      kind: 'memory-dots',
      dots,
      sequence,
      showMs: difficulty === 'hard' ? 450 : 600,
      gapMs: difficulty === 'hard' ? 200 : 300,
    },
    dedupeKey: `memory:${dotCount}:${seqLength}:${sequence.join('-')}:${dots.map((d) => `${Math.round(d.x)}-${Math.round(d.y)}`).join('|')}`,
  };
}

// ─── Fractions (visual bar) ──────────────────────────────────────────────────

function generateFraction(difficulty: Difficulty): Question {
  const totals = difficulty === 'easy' ? [2, 3, 4, 5, 6] : difficulty === 'medium' ? [4, 5, 6, 8, 10] : [6, 8, 9, 10, 12];
  const total = pick(totals);
  const shaded = randInt(1, total - 1);
  const vertical = Math.random() < 0.4;
  const correct = `${shaded}/${total}`;

  // Build a unique distractor set — candidates may collide (e.g. when
  // shaded+1 === total−shaded), so dedupe against the correct answer AND
  // against each other.
  const candidates = shuffle([
    `${Math.min(shaded + 1, total)}/${total}`,
    `${shaded}/${total + 1}`,
    `${total - shaded}/${total}`,
    `${Math.max(shaded - 1, 1)}/${total}`,
  ]);
  const seen = new Set<string>([correct]);
  const distractors: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c);
      distractors.push(c);
      if (distractors.length === 3) break;
    }
  }
  // Pad if we couldn't get 3 unique distractors
  let offset = 2;
  while (distractors.length < 3) {
    const c = `${Math.min(shaded + offset, total + offset)}/${total + offset}`;
    if (!seen.has(c)) {
      seen.add(c);
      distractors.push(c);
    }
    offset++;
  }

  const options = shuffle([correct, ...distractors]);

  return {
    id: id('fractions'),
    category: 'fractions',
    difficulty,
    source: 'generator',
    prompt: 'What fraction of the bar is shaded?',
    options,
    answerIndex: options.indexOf(correct),
    explanation: `${shaded} of the ${total} equal parts are shaded = ${shaded}/${total}`,
    visual: { kind: 'fraction', total, shaded, vertical },
    dedupeKey: `fraction:${shaded}/${total}:${vertical}`,
  };
}

export function generateVisualQuestion(category: QuestionCategory, difficulty: Difficulty): Question {
  if (category === 'geometry') {
    return Math.random() < 0.5 ? generateShapeChoice(difficulty) : generateCount(difficulty);
  }

  if (category === 'memory') {
    return generateMemoryDots(difficulty);
  }

  if (category === 'fractions') {
    return generateFraction(difficulty);
  }

  return Math.random() < 0.5 ? generateMirror(difficulty) : generateRotate(difficulty);
}

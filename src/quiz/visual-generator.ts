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
    tone: 'green' as const,
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
    explanation: `Step 1: Look at each shape and identify its name.\nStep 2: Find the ${title(targetShape).toLowerCase()} among the options.\nStep 3: The correct figure is the ${title(targetShape).toLowerCase()}.\nAnswer: ${title(targetShape)}`,
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
    explanation: `Step 1: Identify each shape and group similar ones together.\nStep 2: Three shapes are ${title(same).toLowerCase()}s — they match.\nStep 3: The ${title(odd).toLowerCase()} is the odd one out — it's different from the rest.\nAnswer: ${title(odd)}`,
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
  const tone = pick(['green', 'cream', 'peach'] as const);
  const specs = shuffle(
    [correctShape, ...wrongShapes].map((shape) => ({
      shape,
      tone,
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
    explanation: `Step 1: Identify the shape: it's a ${title(correctShape).toLowerCase()}.\nStep 2: Count the sides by tracing each edge.\nStep 3: A ${title(correctShape).toLowerCase()} has ${n} sides.\nAnswer: ${n}`,
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
  const mostSidesTone = pick(['green', 'cream', 'peach'] as const);
  const specs = four.map((shape) => ({ shape, tone: mostSidesTone }));
  const answerIndex = specs.findIndex((s) => s.shape === best);

  return {
    id: id('geometry'),
    category: 'geometry',
    difficulty,
    source: 'generator',
    prompt: 'Which of these shapes has the MOST sides?',
    options: specs.map((_, i) => `Option ${i + 1}`),
    answerIndex,
    explanation: `Step 1: Count the sides of each shape.\nStep 2: Compare the side counts — the ${title(best).toLowerCase()} has ${SIDES[best]} sides.\nStep 3: ${SIDES[best]} is the highest — the ${title(best).toLowerCase()} has the most sides.\nAnswer: ${title(best)}`,
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
    explanation: `Step 1: Imagine folding the shape along a line through its center.\nStep 2: Check if both halves match exactly when folded.\nStep 3: A ${title(symmetric).toLowerCase()} has a line of symmetry — both halves match.\nAnswer: ${title(symmetric)}`,
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
    rotation: pick([0, 180]),
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
        ? 'Step 1: Identify the type of transformation — left-to-right flip.\nStep 2: Imagine a vertical mirror through the center of the shape.\nStep 3: The left and right sides swap places. The correct option is the mirrored figure.\nAnswer: the left-to-right flipped figure.'
        : 'Step 1: Identify the type of transformation — top-to-bottom flip.\nStep 2: Imagine a horizontal mirror through the center of the shape.\nStep 3: The top and bottom swap places. The correct option is the mirrored figure.\nAnswer: the top-to-bottom flipped figure.',
    visual: { kind: 'mirror', target, options: candidates },
    dedupeKey: `mirror:${shape}:${flip}:${target.rotation}`,
  };
}

function generateCount(difficulty: Difficulty): Question {
  const countShape = pick(BASIC_SHAPES.slice(0, difficulty === 'easy' ? 4 : BASIC_SHAPES.length));
  const targetCount = randInt(2, difficulty === 'hard' ? 8 : difficulty === 'medium' ? 7 : 5);
  const distractorCount = difficulty === 'easy' ? randInt(2, 4) : randInt(3, 6);
  const otherShapes = BASIC_SHAPES.filter((shape) => shape !== countShape);
  // Cap total shapes at 12 — the grid only has 12 positions. Reduce
  // distractors first so the target count is always preserved.
  let effectiveDistractorCount = distractorCount;
  if (targetCount + distractorCount > 12) {
    effectiveDistractorCount = Math.max(0, 12 - targetCount);
  }
  const total = targetCount + effectiveDistractorCount;
  const positions = shuffle(Array.from({ length: 12 }, (_, index) => index)).slice(0, total);
  const countTone = pick(['green', 'cream', 'peach'] as const);
  const scene: ShapeSpec[] = positions.map((position, index) => ({
    shape: index < targetCount ? countShape : pick(otherShapes),
    x: 12.5 + (position % 4) * 25,
    y: 20 + Math.floor(position / 4) * 30,
    scale: pick([0.78, 0.9, 1]),
    rotation: pick([0, 15, 30, 45]),
    tone: countTone,
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
    explanation: `Step 1: Count each type of shape in the scene.\nStep 2: Focus on the ${title(countShape).toLowerCase()} shapes — count them carefully.\nStep 3: There are ${targetCount} ${title(countShape).toLowerCase()} shapes.\nAnswer: ${targetCount}`,
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
    explanation: `Step 1: Look at the original shape and the target shape.\nStep 2: Determine how many degrees the shape was rotated.\nStep 3: The shape needed a ${targetAngle}° rotation to match the target.\nAnswer: Aligned.`,
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
    explanation: `Step 1: Watch the dots as they flash in sequence.\nStep 2: Memorize the order in which they appeared.\nStep 3: The correct sequence was ${seqLength} dots long. Tap them in the same order.\nAnswer: Completed correctly.`,
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
    `${Math.min(shaded + 2, total)}/${total}`,
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
    explanation: `Step 1: Count the total equal parts the bar is divided into: ${total}.\nStep 2: Count the shaded parts: ${shaded}.\nStep 3: Fraction = shaded ÷ total = ${shaded}/${total}.\nAnswer: ${shaded}/${total}`,
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

  // visual-reasoning: mix of mirror, rotate, text-mirror, dot-region, composite-rotate
  const r = Math.random();
  if (r < 0.25) return generateMirror(difficulty);
  if (r < 0.50) return generateRotate(difficulty);
  if (r < 0.70) return generateTextMirror(difficulty);
  if (r < 0.85) return generateDotRegion(difficulty);
  return generateCompositeRotate(difficulty);
}

// ─── Dot region (overlapping shapes) ─────────────────────────────────────────

function isInsideCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return Math.hypot(x - cx, y - cy) <= r;
}
function isInsideSquare(x: number, y: number, cx: number, cy: number, w: number): boolean {
  return x >= cx - w / 2 && x <= cx + w / 2 && y >= cy - w / 2 && y <= cy + w / 2;
}
function isInsideTriangle(x: number, y: number, cx: number, cy: number, h: number): boolean {
  // Equilateral-ish triangle centered at (cx, cy) with height h
  const top = cy - h / 2;
  const bottom = cy + h / 2;
  const halfBase = h / 2;
  if (y < top || y > bottom) return false;
  const ratio = (y - top) / (bottom - top);
  const halfWidth = halfBase * ratio;
  return x >= cx - halfWidth && x <= cx + halfWidth;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToShapeBoundary(
  x: number,
  y: number,
  shape: { type: 'circle' | 'square' | 'triangle'; cx: number; cy: number; r?: number; w?: number; h?: number },
): number {
  if (shape.type === 'circle') {
    return Math.abs(Math.hypot(x - shape.cx, y - shape.cy) - (shape.r ?? 25));
  }
  if (shape.type === 'square') {
    const half = (shape.w ?? 40) / 2;
    const left = shape.cx - half;
    const right = shape.cx + half;
    const top = shape.cy - half;
    const bottom = shape.cy + half;
    return Math.min(
      distanceToSegment(x, y, left, top, right, top),
      distanceToSegment(x, y, right, top, right, bottom),
      distanceToSegment(x, y, right, bottom, left, bottom),
      distanceToSegment(x, y, left, bottom, left, top),
    );
  }
  const h = shape.h ?? 40;
  const topX = shape.cx;
  const topY = shape.cy - h / 2;
  const leftX = shape.cx - h / 2;
  const rightX = shape.cx + h / 2;
  const bottomY = shape.cy + h / 2;
  return Math.min(
    distanceToSegment(x, y, topX, topY, leftX, bottomY),
    distanceToSegment(x, y, leftX, bottomY, rightX, bottomY),
    distanceToSegment(x, y, rightX, bottomY, topX, topY),
  );
}

// Minimum distance from dot center to any shape boundary.
// Dot radius is 3 and stroke width is 2 (extending 1 unit outside the
// mathematical boundary), so a clearance of 8 guarantees a visible gap
// of at least 8 - 3 - 1 = 4 SVG units between the dot edge and the
// visible stroke — unambiguous even on small mobile screens.
const DOT_REGION_CLEARANCE = 8;

type DotRegionShape = {
  type: 'circle' | 'square' | 'triangle';
  label: string;
  cx: number;
  cy: number;
  r?: number;
  w?: number;
  h?: number;
};

function isInsideShape(x: number, y: number, shape: DotRegionShape): boolean {
  if (shape.type === 'circle') return isInsideCircle(x, y, shape.cx, shape.cy, shape.r ?? 25);
  if (shape.type === 'square') return isInsideSquare(x, y, shape.cx, shape.cy, shape.w ?? 40);
  return isInsideTriangle(x, y, shape.cx, shape.cy, shape.h ?? 40);
}

function generateDotRegion(difficulty: Difficulty): Question {
  const useThree = difficulty !== 'easy';

  // Multiple shape arrangements so the answer isn't always the same shape.
  // Each config is designed so that every shape has a substantial "only"
  // region and every pairwise overlap has valid positions.
  const baseConfigs = useThree
    ? [
        // Arrangement 1: circle left, square right, triangle bottom-center
        [
          { type: 'circle' as const, cx: 32, cy: 42, r: 26 },
          { type: 'square' as const, cx: 65, cy: 48, w: 38 },
          { type: 'triangle' as const, cx: 50, cy: 62, h: 42 },
        ],
        // Arrangement 2: square left, triangle right, circle bottom-center
        [
          { type: 'square' as const, cx: 32, cy: 45, w: 38 },
          { type: 'triangle' as const, cx: 62, cy: 50, h: 42 },
          { type: 'circle' as const, cx: 48, cy: 65, r: 24 },
        ],
        // Arrangement 3: triangle left, circle right, square bottom-center
        [
          { type: 'triangle' as const, cx: 32, cy: 48, h: 42 },
          { type: 'circle' as const, cx: 65, cy: 42, r: 26 },
          { type: 'square' as const, cx: 50, cy: 65, w: 38 },
        ],
      ]
    : [
        // Circle + Square overlapping
        [
          { type: 'circle' as const, cx: 35, cy: 50, r: 27 },
          { type: 'square' as const, cx: 62, cy: 50, w: 38 },
        ],
        // Circle + Triangle overlapping
        [
          { type: 'circle' as const, cx: 38, cy: 48, r: 26 },
          { type: 'triangle' as const, cx: 60, cy: 55, h: 42 },
        ],
        // Square + Triangle overlapping
        [
          { type: 'square' as const, cx: 35, cy: 48, w: 38 },
          { type: 'triangle' as const, cx: 60, cy: 55, h: 42 },
        ],
        // Square left + Circle right (swapped from config 1)
        [
          { type: 'square' as const, cx: 35, cy: 50, w: 38 },
          { type: 'circle' as const, cx: 62, cy: 50, r: 27 },
        ],
      ];

  const baseShapes = pick(baseConfigs);
  // Randomize labels so the answer isn't always "Only A"
  const labels = shuffle(['A', 'B', 'C'].slice(0, baseShapes.length));
  const shapes: DotRegionShape[] = baseShapes.map((s, i) => ({ ...s, label: labels[i] }));

  // Scan all positions and group candidates by their containing set.
  // This lets us pick a region uniformly, preventing answer bias.
  const candidatesByRegion = new Map<string, Array<{ x: number; y: number }>>();
  for (let x = 5; x <= 95; x++) {
    for (let y = 5; y <= 95; y++) {
      // Reject positions too close to ANY shape boundary
      if (shapes.some((shape) => distanceToShapeBoundary(x, y, shape) < DOT_REGION_CLEARANCE)) continue;
      const containing = shapes.filter((shape) => isInsideShape(x, y, shape)).map((shape) => shape.label);
      // Only accept positions inside at least 1 shape but not all shapes
      if (containing.length >= 1 && containing.length < shapes.length) {
        // Sort labels for consistent region keys and answer text
        const key = containing.sort().join(',');
        const arr = candidatesByRegion.get(key);
        if (arr) arr.push({ x, y });
        else candidatesByRegion.set(key, [{ x, y }]);
      }
    }
  }

  if (candidatesByRegion.size === 0) {
    throw new Error('Dot-region configuration has no visually unambiguous positions');
  }

  // Pick a region uniformly at random, then pick a position within it
  const regions = Array.from(candidatesByRegion.keys());
  const regionKey = pick(regions);
  const positions = candidatesByRegion.get(regionKey)!;
  const pos = pick(positions);
  const dot = { x: pos.x, y: pos.y };
  const containing = regionKey.split(',');

  // Build the answer
  const allLabels = shapes.map((s) => s.label);
  const answer = `Only ${containing.join(' and ')}`;
  const outsideLabels = allLabels.filter((l) => !containing.includes(l));
  const explanation = `Step 1: Check if the dot is inside each shape.\nStep 2: The dot is inside ${containing.join(' and ')}, but outside ${outsideLabels.join(' and ') || 'none'}.\nAnswer: Only ${containing.join(' and ')}.`;

  // Build distractors — pick relevant ones that are close to the answer
  const distractorSet = new Set<string>([answer]);
  const distractors: string[] = [];

  // For 3 shapes: include pair distractors that share a shape with the answer
  if (shapes.length === 3) {
    for (const label of containing) {
      for (const other of allLabels) {
        if (other === label) continue;
        const pair = [label, other].sort();
        const d = `Only ${pair.join(' and ')}`;
        if (!distractorSet.has(d)) { distractorSet.add(d); distractors.push(d); }
      }
    }
  }
  // Single-shape distractors
  for (const label of allLabels) {
    const d = `Only ${label}`;
    if (!distractorSet.has(d)) { distractorSet.add(d); distractors.push(d); }
  }
  // "All shapes"
  const allD = `All shapes (${allLabels.join(', ')})`;
  if (!distractorSet.has(allD)) { distractorSet.add(allD); distractors.push(allD); }
  // "None"
  const noneD = 'None of the shapes';
  if (!distractorSet.has(noneD)) { distractorSet.add(noneD); distractors.push(noneD); }
  // Remaining pairs (sorted for consistency)
  if (shapes.length === 3) {
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const pair = [shapes[i].label, shapes[j].label].sort();
        const d = `Only ${pair.join(' and ')}`;
        if (!distractorSet.has(d)) { distractorSet.add(d); distractors.push(d); }
      }
    }
  }

  const finalDistractors = distractors.slice(0, 3);
  const allOptions = shuffle([answer, ...finalDistractors]);
  const answerIndex = allOptions.indexOf(answer);

  return {
    id: id('visual-reasoning'),
    category: 'visual-reasoning',
    difficulty,
    source: 'generator',
    prompt: `In which region does the dot lie?`,
    options: allOptions,
    answerIndex,
    explanation,
    visual: { kind: 'dot-region', shapes, dot },
    dedupeKey: `dot-region:${shapes.map((s) => s.label).join('')}:${dot.x},${dot.y}`,
  };
}

// ─── Composite rotation ──────────────────────────────────────────────────────

function transformCompositePoint(point: { x: number; y: number }, rotation: number, mirrorX?: boolean) {
  const x = mirrorX ? 100 - point.x : point.x;
  const radians = rotation * Math.PI / 180;
  const dx = x - 50;
  const dy = point.y - 50;
  return {
    x: Math.round((50 + dx * Math.cos(radians) - dy * Math.sin(radians)) * 1000) / 1000,
    y: Math.round((50 + dx * Math.sin(radians) + dy * Math.cos(radians)) * 1000) / 1000,
  };
}

function compositeSignature(
  dots: { x: number; y: number }[],
  lines: { x1: number; y1: number; x2: number; y2: number }[],
  option: { rotation: number; mirrorX?: boolean },
): string {
  const transformedDots = dots
    .map((dot) => transformCompositePoint(dot, option.rotation, option.mirrorX))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const transformedLines = lines
    .map((line) => [
      transformCompositePoint({ x: line.x1, y: line.y1 }, option.rotation, option.mirrorX),
      transformCompositePoint({ x: line.x2, y: line.y2 }, option.rotation, option.mirrorX),
    ].sort((a, b) => a.x - b.x || a.y - b.y))
    .sort((a, b) => a[0].x - b[0].x || a[0].y - b[0].y);
  return JSON.stringify({ dots: transformedDots, lines: transformedLines });
}

function generateCompositeRotate(difficulty: Difficulty): Question {
  // Generate a composite figure: a square with 2-3 internal dots
  const numDots = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 3;
  // Place dots in asymmetric positions within the square (10-90 range)
  const positions = [
    { x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 },
    { x: 50, y: 25 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 50, y: 75 },
    { x: 35, y: 35 }, { x: 65, y: 65 }, { x: 35, y: 65 }, { x: 65, y: 35 },
  ];
  const optionTransforms = [
    { rotation: 90 },
    { rotation: 180 },
    { rotation: 270 },
    { rotation: 0, mirrorX: true },
  ];
  let dots: { x: number; y: number }[] = [];
  let lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    dots = shuffle(positions).slice(0, numDots);
    lines = difficulty === 'hard'
      ? [{ x1: dots[0].x, y1: dots[0].y, x2: dots[1].x, y2: dots[1].y }]
      : [];
    const signatures = optionTransforms.map((option) => compositeSignature(dots, lines, option));
    if (new Set(signatures).size === optionTransforms.length) break;
  }
  const signatures = optionTransforms.map((option) => compositeSignature(dots, lines, option));
  if (new Set(signatures).size !== optionTransforms.length) {
    throw new Error('Composite-rotation generator could not produce four visually unique options');
  }

  const base = { shape: 'square' as const, dots, lines };
  // Correct answer: rotate by 90, 180, or 270
  const correctRotation = pick([90, 180, 270]);
  // Distractors: other rotations + a mirror
  const wrongRotations = [90, 180, 270].filter((r) => r !== correctRotation);
  const options = [
    { rotation: correctRotation },
    { rotation: wrongRotations[0] },
    { rotation: wrongRotations[1] },
    { rotation: 0, mirrorX: true },
  ];
  const shuffledOptions = shuffle(options);
  const answerIndex = shuffledOptions.findIndex((o) => o.rotation === correctRotation && !o.mirrorX);

  return {
    id: id('visual-reasoning'),
    category: 'visual-reasoning',
    difficulty,
    source: 'generator',
    prompt: `The first figure is rotated. Which option shows the correct result of rotating it by ${correctRotation}° clockwise?`,
    options: ['A', 'B', 'C', 'D'],
    answerIndex,
    explanation: `Step 1: A ${correctRotation}° clockwise rotation turns the figure.\nStep 2: Each dot moves to its new position under the rotation.\nStep 3: Option ${String.fromCharCode(65 + answerIndex)} matches the ${correctRotation}° rotation.\nAnswer: Option ${String.fromCharCode(65 + answerIndex)}`,
    visual: { kind: 'composite-rotate', base, options: shuffledOptions },
    dedupeKey: `composite-rotate:${dots.map((d) => `${d.x},${d.y}`).join(';')}:${correctRotation}`,
  };
}

// ─── Text mirror (word/number mirror image) ──────────────────────────────────

// Words with asymmetric letters that look visibly different when mirrored.
const MIRROR_WORDS = [
  'BIRD', 'CLOUD', 'FROG', 'JUMP', 'PLAY', 'QUEST', 'BOOK', 'DOOR',
  'FISH', 'GAME', 'LAMP', 'NUMBER', 'PAPER', 'ROAD', 'STAR', 'WORD',
  '1234', '5276', '8042', '3197', '6045', '9218', '4750', '2639',
];

function generateTextMirror(difficulty: Difficulty): Question {
  const word = pick(MIRROR_WORDS);
  // The correct mirror image: text reversed + mirrored horizontally (scaleX(-1))
  // In the visual component, we render the original word with scaleX(-1) transform
  // which produces the mirror image visually.
  const correctOption = { text: word, mirrorX: true };
  // Distractor 1: reversed text without mirroring (just backwards order)
  const reversed = [...word].reverse().join('');
  const distractor1 = { text: reversed };
  // Distractor 2: vertical mirror (scaleY(-1)) — looks like upside-down text
  const distractor2 = { text: word, mirrorY: true };
  // Distractor 3: rotated 180° (both mirrors) — looks like upside-down reversed
  const distractor3 = { text: word, mirrorX: true, mirrorY: true, rotate180: true };
  type TextMirrorOpt = { text: string; mirrorX?: boolean; mirrorY?: boolean; rotate180?: boolean };
  const options: TextMirrorOpt[] = shuffle([correctOption, distractor1, distractor2, distractor3]);
  const answerIndex = options.findIndex(
    (o) => o.text === word && o.mirrorX === true && o.mirrorY === undefined && o.rotate180 === undefined,
  );
  return {
    id: id('visual-reasoning'),
    category: 'visual-reasoning',
    difficulty,
    source: 'generator',
    prompt: `Which of the following is the correct mirror image of "${word}" as seen in a mirror placed on its right side?`,
    options: ['A', 'B', 'C', 'D'],
    answerIndex,
    explanation: `Step 1: A mirror on the right side reflects the text left-to-right.\nStep 2: The correct mirror image shows the text reversed horizontally — each letter is flipped and the order appears backwards.\nStep 3: Option ${String.fromCharCode(65 + answerIndex)} shows the correct horizontal mirror image.\nAnswer: Option ${String.fromCharCode(65 + answerIndex)}`,
    visual: { kind: 'text-mirror', word, options },
    dedupeKey: `text-mirror:${word}`,
  };
}

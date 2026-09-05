import { describe, expect, it } from 'vitest';
import { generateOne } from './generator';
import { generateVisualQuestion } from './visual-generator';
import type { Difficulty, Question } from './types';
import figClassBank from '../../public/figure-classification-questions.json';
import aiMlBank from '../../public/ai-ml-questions.json';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function repeat(times: number, check: () => void): void {
  for (let i = 0; i < times; i++) check();
}

function assertValid(q: Question | null): asserts q is Question {
  expect(q).not.toBeNull();
  if (!q) return;
  expect(q.options.length).toBeGreaterThanOrEqual(2);
  expect(q.options.length).toBeLessThanOrEqual(4);
  expect(q.answerIndex).toBeGreaterThanOrEqual(0);
  expect(q.answerIndex).toBeLessThan(q.options.length);
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.explanation).toBeDefined();
  // No undefined/NaN leaking
  expect(q.prompt).not.toContain('undefined');
  expect(q.prompt).not.toContain('NaN');
  expect(q.explanation).not.toContain('undefined');
  expect(q.explanation).not.toContain('NaN');
  for (const o of q.options) {
    expect(o).not.toContain('undefined');
    expect(o).not.toContain('NaN');
    expect(o.length).toBeGreaterThan(0);
  }
  // All options unique
  expect(new Set(q.options).size).toBe(q.options.length);
}

// ─── Symbol substitution: 500 samples per difficulty ─────────────────────────

describe('AUDIT: Symbol substitution (letter-coding)', () => {
  for (const d of DIFFICULTIES) {
    it(`500 samples: letter-coding/${d} all valid`, () => {
      let bad = 0;
      repeat(500, () => {
        const q = generateOne('letter-coding', d);
        try {
          assertValid(q);
        } catch {
          bad++;
        }
      });
      expect(bad).toBe(0);
    });
  }

  it('500 samples: symbol substitution answer has no unmapped characters', () => {
    let bad = 0;
    repeat(500, () => {
      const q = generateOne('letter-coding', 'medium');
      if (!q) return;
      if (!q.prompt.includes('represented as follows')) return;
      // Extract the mapping
      const mappingMatch = [...q.prompt.matchAll(/([A-Z])\s*→\s*(\S)/g)];
      const validSymbols = new Set(mappingMatch.map((m) => m[2]));
      const ans = q.options[q.answerIndex];
      // Every character in the answer must be a valid symbol from the mapping
      for (const ch of ans) {
        if (!validSymbols.has(ch)) bad++;
      }
    });
    expect(bad).toBe(0);
  });

  it('500 samples: symbol substitution answer matches mapping', () => {
    let bad = 0;
    repeat(500, () => {
      const q = generateOne('letter-coding', 'hard');
      if (!q) return;
      if (!q.prompt.includes('represented as follows')) return;
      const mappingMatch = [...q.prompt.matchAll(/([A-Z])\s*→\s*(\S)/g)];
      const mapping: Record<string, string> = {};
      for (const m of mappingMatch) mapping[m[1]] = m[2];
      const wordMatch = q.prompt.match(/"([A-Z]+)"/);
      if (wordMatch) {
        const word = wordMatch[1];
        const expected = [...word].map((ch) => mapping[ch]).join('');
        if (q.options[q.answerIndex] !== expected) bad++;
      }
    });
    expect(bad).toBe(0);
  });
});

// ─── Missing number grid: 500 samples per difficulty ─────────────────────────

describe('AUDIT: Missing number grid (logical-reasoning)', () => {
  for (const d of DIFFICULTIES) {
    it(`500 samples: logical-reasoning/${d} all valid (grid subset)`, () => {
      let bad = 0;
      let gridCount = 0;
      repeat(500, () => {
        const q = generateOne('logical-reasoning', d);
        if (!q) return;
        if (!q.prompt.includes('missing number in the grid')) return;
        gridCount++;
        try {
          assertValid(q);
          // Answer must be a positive number
          const ans = Number(q.options[q.answerIndex]);
          if (!Number.isFinite(ans) || ans <= 0) bad++;
        } catch {
          bad++;
        }
      });
      // Should have generated at least some grid questions
      expect(gridCount).toBeGreaterThan(5);
      expect(bad).toBe(0);
    });
  }

  it('500 samples: grid answer is consistent with row/col/diag pattern', () => {
    let bad = 0;
    let checked = 0;
    repeat(500, () => {
      const q = generateOne('logical-reasoning', 'medium');
      if (!q) return;
      if (!q.prompt.includes('missing number in the grid')) return;
      checked++;
      const ans = Number(q.options[q.answerIndex]);
      // Parse the grid
      const gridLines = q.prompt.split('\n').filter((l) => l.includes('|'));
      if (gridLines.length !== 3) return;
      const grid = gridLines.map((l) => l.split('|').map((c) => c.trim()));
      // Replace ? with the answer in the last cell
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (grid[r][c] === '?') grid[r][c] = String(ans);
        }
      }
      // Check if any row, column, or diagonal pattern is consistent
      const rows = grid.map((r) => r.map(Number));
      // Check row sums
      const rowSums = rows.map((r) => r.reduce((a, b) => a + b, 0));
      const allRowsSame = rowSums.every((s) => s === rowSums[0]);
      // Check col sums
      const colSums = [0, 1, 2].map((c) => rows[0][c] + rows[1][c] + rows[2][c]);
      const allColsSame = colSums.every((s) => s === colSums[0]);
      // Check row product pattern (col3 = col1 * col2)
      const rowProduct = rows.every((r) => r[2] === r[0] * r[1]);
      // Check row sum pattern (col3 = col1 + col2)
      const rowSum = rows.every((r) => r[2] === r[0] + r[1]);
      if (!allRowsSame && !allColsSame && !rowProduct && !rowSum) {
        // Check diagonal pattern
        const diag1 = rows[0][0] + rows[1][1] + rows[2][2];
        const diag2 = rows[0][2] + rows[1][1] + rows[2][0];
        if (diag1 !== diag2) bad++;
      }
    });
    expect(checked).toBeGreaterThan(10);
    expect(bad).toBe(0);
  });
});

// ─── Text mirror: 500 samples ────────────────────────────────────────────────

describe('AUDIT: Text mirror (visual-reasoning)', () => {
  for (const d of DIFFICULTIES) {
    it(`500 samples: text-mirror/${d} all valid`, () => {
      let bad = 0;
      let count = 0;
      repeat(500, () => {
        const q = generateVisualQuestion('visual-reasoning', d);
        if (!q.visual || q.visual.kind !== 'text-mirror') return;
        count++;
        try {
          assertValid(q);
          // The correct option must have mirrorX=true
          const correct = q.visual.options[q.answerIndex];
          if (correct.mirrorX !== true) bad++;
          if (correct.mirrorY !== undefined) bad++;
          if (correct.rotate180 !== undefined) bad++;
          // Word must be defined and at least 3 chars
          if (q.visual.word.length < 3) bad++;
        } catch {
          bad++;
        }
      });
      expect(count).toBeGreaterThan(5);
      expect(bad).toBe(0);
    });
  }
});

// ─── Dot region: 500 samples ────────────────────────────────────────────────

describe('AUDIT: Dot region (visual-reasoning)', () => {
  for (const d of DIFFICULTIES) {
    it(`500 samples: dot-region/${d} all valid`, () => {
      let bad = 0;
      let count = 0;
      repeat(500, () => {
        const q = generateVisualQuestion('visual-reasoning', d);
        if (!q.visual || q.visual.kind !== 'dot-region') return;
        count++;
        try {
          assertValid(q);
          // Dot must be within bounds
          if (q.visual.dot.x < 0 || q.visual.dot.x > 100) bad++;
          if (q.visual.dot.y < 0 || q.visual.dot.y > 100) bad++;
          // Shapes must have valid coordinates
          for (const s of q.visual.shapes) {
            if (s.cx < 0 || s.cx > 100) bad++;
            if (s.cy < 0 || s.cy > 100) bad++;
          }
        } catch {
          bad++;
        }
      });
      expect(count).toBeGreaterThan(5);
      expect(bad).toBe(0);
    });
  }

  it('500 samples: dot region answer matches geometry', () => {
    let bad = 0;
    let checked = 0;
    repeat(500, () => {
      const q = generateVisualQuestion('visual-reasoning', 'medium');
      if (!q.visual || q.visual.kind !== 'dot-region') return;
      checked++;
      const { shapes, dot } = q.visual;
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
      const answer = q.options[q.answerIndex];
      const allLabels = shapes.map((shape) => shape.label);
      const expected = containing.length === 0
        ? 'None of the shapes'
        : containing.length === shapes.length
          ? `All shapes (${allLabels.join(', ')})`
          : `Only ${containing.sort().join(' and ')}`;
      if (answer !== expected) bad++;
    });
    expect(checked).toBeGreaterThan(10);
    expect(bad).toBe(0);
  });

  it('rendered dot stays visibly clear of every shape boundary', () => {
    const segmentDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    };
    for (const difficulty of DIFFICULTIES) {
      let checked = 0;
      repeat(1500, () => {
        const q = generateVisualQuestion('visual-reasoning', difficulty);
        if (!q.visual || q.visual.kind !== 'dot-region') return;
        checked++;
        const { dot, shapes } = q.visual;
        for (const shape of shapes) {
          let clearance: number;
          if (shape.type === 'circle') {
            clearance = Math.abs(Math.hypot(dot.x - shape.cx, dot.y - shape.cy) - (shape.r ?? 25));
          } else if (shape.type === 'square') {
            const half = (shape.w ?? 40) / 2;
            const left = shape.cx - half;
            const right = shape.cx + half;
            const top = shape.cy - half;
            const bottom = shape.cy + half;
            clearance = Math.min(
              segmentDistance(dot.x, dot.y, left, top, right, top),
              segmentDistance(dot.x, dot.y, right, top, right, bottom),
              segmentDistance(dot.x, dot.y, right, bottom, left, bottom),
              segmentDistance(dot.x, dot.y, left, bottom, left, top),
            );
          } else {
            const h = shape.h ?? 40;
            const topX = shape.cx;
            const topY = shape.cy - h / 2;
            const leftX = shape.cx - h / 2;
            const rightX = shape.cx + h / 2;
            const bottomY = shape.cy + h / 2;
            clearance = Math.min(
              segmentDistance(dot.x, dot.y, topX, topY, leftX, bottomY),
              segmentDistance(dot.x, dot.y, leftX, bottomY, rightX, bottomY),
              segmentDistance(dot.x, dot.y, rightX, bottomY, topX, topY),
            );
          }
          expect(clearance, `${q.dedupeKey} is visually ambiguous at ${clearance.toFixed(2)} SVG units`).toBeGreaterThanOrEqual(5);
        }
      });
      expect(checked).toBeGreaterThan(50);
    }
  });
});

// ─── Composite rotation: 500 samples ────────────────────────────────────────

describe('AUDIT: Composite rotation (visual-reasoning)', () => {
  for (const d of DIFFICULTIES) {
    it(`500 samples: composite-rotate/${d} all valid`, () => {
      let bad = 0;
      let count = 0;
      repeat(500, () => {
        const q = generateVisualQuestion('visual-reasoning', d);
        if (!q.visual || q.visual.kind !== 'composite-rotate') return;
        count++;
        try {
          assertValid(q);
          // Must have at least 2 dots
          if (q.visual.base.dots.length < 2) bad++;
          // Must have 4 options
          if (q.visual.options.length !== 4) bad++;
          // Correct option must have rotation >= 90 and no mirrorX
          const correct = q.visual.options[q.answerIndex];
          if (correct.rotation < 90) bad++;
          if (correct.mirrorX) bad++;
        } catch {
          bad++;
        }
      });
      expect(count).toBeGreaterThan(5);
      expect(bad).toBe(0);
    });
  }

  it('composite rotation options are visually unique', () => {
    const transformPoint = (point: { x: number; y: number }, rotation: number, mirrorX?: boolean) => {
      const x = mirrorX ? 100 - point.x : point.x;
      const radians = rotation * Math.PI / 180;
      const dx = x - 50;
      const dy = point.y - 50;
      return {
        x: Math.round((50 + dx * Math.cos(radians) - dy * Math.sin(radians)) * 1000) / 1000,
        y: Math.round((50 + dx * Math.sin(radians) + dy * Math.cos(radians)) * 1000) / 1000,
      };
    };
    for (const difficulty of DIFFICULTIES) {
      let checked = 0;
      repeat(3000, () => {
        const q = generateVisualQuestion('visual-reasoning', difficulty);
        if (!q.visual || q.visual.kind !== 'composite-rotate') return;
        checked++;
        const visual = q.visual;
        const signatures = visual.options.map((option) => {
          const dots = visual.base.dots.map((dot) => transformPoint(dot, option.rotation, option.mirrorX));
          dots.sort((a, b) => a.x - b.x || a.y - b.y);
          const lines = (visual.base.lines ?? []).map((line) => {
            const endpoints = [
              transformPoint({ x: line.x1, y: line.y1 }, option.rotation, option.mirrorX),
              transformPoint({ x: line.x2, y: line.y2 }, option.rotation, option.mirrorX),
            ].sort((a, b) => a.x - b.x || a.y - b.y);
            return endpoints;
          }).sort((a, b) => a[0].x - b[0].x || a[0].y - b[0].y);
          return JSON.stringify({ dots, lines });
        });
        expect(new Set(signatures).size, `${q.dedupeKey} has duplicate visible options`).toBe(signatures.length);
      });
      expect(checked).toBeGreaterThan(100);
    }
  });
});

// ─── AI/ML curated bank: validate structure and dedupe keys ─────────────────

describe('AUDIT: AI/ML curated bank', () => {
  it('all questions have valid structure and dedupeKey', () => {
    expect(aiMlBank.questions.length).toBeGreaterThanOrEqual(50);
    let bad = 0;
    for (const q of aiMlBank.questions) {
      try {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeLessThanOrEqual(4);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(q.options.length);
        expect(q.prompt.length).toBeGreaterThan(10);
        expect(q.explanation.length).toBeGreaterThan(10);
        expect(q.dedupeKey).toBeDefined();
        expect(q.prompt).not.toContain('undefined');
        expect(q.explanation).not.toContain('undefined');
      } catch {
        bad++;
      }
    }
    expect(bad).toBe(0);
  });

  it('all dedupeKeys are unique', () => {
    const keys = aiMlBank.questions.map((q) => q.dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ─── Figure classification: validate all curated questions ───────────────────

describe('AUDIT: Figure classification curated bank', () => {
  it('all questions have valid structure', () => {
    const bank = figClassBank;
    expect(bank.questions.length).toBeGreaterThanOrEqual(10);
    let bad = 0;
    for (const q of bank.questions) {
      try {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeLessThanOrEqual(4);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(q.options.length);
        expect(q.prompt.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(10);
        expect(q.dedupeKey).toBeDefined();
        expect(q.visual.kind).toBe('figure-classification');
        expect(q.visual.figures.length).toBeGreaterThanOrEqual(4);
        // No undefined/NaN
        expect(q.prompt).not.toContain('undefined');
        expect(q.explanation).not.toContain('undefined');
      } catch {
        bad++;
      }
    }
    expect(bad).toBe(0);
  });

  /**
   * Semantic check: for each 9-figure "Group by" question, parse every option's
   * criterion + partition and verify that exactly ONE option is valid — and that
   * it is the one at answerIndex. This prevents the earlier bug where multiple
   * options described partitions that were all actually correct.
   */
  it('each grouping question has exactly one valid partition, at answerIndex', () => {
    const SIDES: Record<string, number> = {
      triangle: 3, 'scalene-triangle': 3, square: 4, rectangle: 4,
      pentagon: 5, hexagon: 6, circle: 0,
      // Exotic shapes get a unique sentinel each so they only match themselves
      star: 101, arrow: 102, flag: 103, 'l-shape': 104,
    };

    type Fig = { shape: string; tone?: string };
    const uniform = (figs: Fig[], key: (f: Fig) => string | number) =>
      figs.every((f) => key(f) === key(figs[0]));

    for (const q of figClassBank.questions) {
      if (!q.prompt.includes('classified into 3 groups')) continue;
      const figs = q.visual.figures as Fig[];
      expect(figs.length).toBe(9);

      const validIndices: number[] = [];
      q.options.forEach((opt, i) => {
        const m = opt.match(/Group by ([^:]+):\s*\(([\d,\s]+)\),\s*\(([\d,\s]+)\),\s*\(([\d,\s]+)\)/);
        if (!m) return; // non-grouping option (e.g. "No valid grouping exists") — never valid when a partition exists
        const criterion = m[1].trim().toLowerCase();
        const groups = [m[2], m[3], m[4]].map((g) => g.split(',').map((n) => Number(n.trim())));
        const groupFigs = groups.map((g) => g.map((n) => figs[n - 1]));
        const key = (p: number[][]) => JSON.stringify(p.map((s) => [...s].sort((a, b) => a - b)));
        const isRows = key(groups) === key([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
        const isCols = key(groups) === key([[1, 4, 7], [2, 5, 8], [3, 6, 9]]);
        // For rows/columns to be a valid grouping, ALL groups must be uniform
        // by the SAME attribute (all shape, or all fill) — not a mix.
        const allSameShape = groupFigs.every((g) => uniform(g, (f) => f.shape));
        const allSameFill = groupFigs.every((g) => uniform(g, (f) => f.tone ?? ''));

        let valid = false;
        if (criterion === 'shape') valid = groupFigs.every((g) => uniform(g, (f) => f.shape));
        else if (criterion === 'fill') valid = groupFigs.every((g) => uniform(g, (f) => f.tone ?? ''));
        else if (criterion === 'number of sides') valid = groupFigs.every((g) => uniform(g, (f) => SIDES[f.shape]));
        else if (criterion === 'rows') valid = isRows && (allSameShape || allSameFill);
        else if (criterion === 'columns') valid = isCols && (allSameShape || allSameFill);
        else if (criterion === 'shape and fill together') {
          valid = groupFigs.every((g) => uniform(g, (f) => f.shape) && uniform(g, (f) => f.tone ?? ''));
        }
        // 'size', 'rotation', etc.: no such attribute in the figure data → invalid
        if (valid) validIndices.push(i);
      });

      expect(validIndices, `${q.id} must have exactly one valid option, got ${JSON.stringify(validIndices)}`).toEqual([q.answerIndex]);
    }
  });

  /**
   * Odd-one-out questions: verify the 3 non-answer figures share a common shape
   * or tone that the answer figure lacks. Questions whose rule is non-attribute
   * (fc-008 polygon rule, fc-010 symmetry rule) are whitelisted as manually
   * verified.
   */
  it('odd-one-out questions have a verifiable discriminating attribute', () => {
    const MANUALLY_VERIFIED = new Set(['fc-008', 'fc-010']);
    for (const q of figClassBank.questions) {
      if (!q.prompt.includes('NOT belong')) continue;
      const figs = q.visual.figures;
      const others = figs.filter((_, i) => i !== q.answerIndex);
      const sameShape = others.every((f) => f.shape === others[0].shape);
      const sameTone = others.every((f) => f.tone === others[0].tone);
      const answerShape = figs[q.answerIndex].shape;
      const answerTone = figs[q.answerIndex].tone;
      const autoOk = sameShape && answerShape !== others[0].shape;
      const toneOk = sameTone && answerTone !== others[0].tone;
      expect(
        autoOk || toneOk || MANUALLY_VERIFIED.has(q.id),
        `${q.id}: no verifiable discriminating attribute`,
      ).toBe(true);
    }
  });
});

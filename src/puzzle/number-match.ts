export const COLS = 10;
export const BOARD_SIZE = 100;
export const ROW_BONUS = 25;
export const PAIR_EQUAL_POINTS = 15;
export const PAIR_SUM10_POINTS = 10;
export const VICTORY_BONUS = 250;
export const BEST_KEY = 'number-match-best';

export type Cell = number | null;
export type MatchParity = 'even' | 'odd';

export interface MatchGame {
  board: Cell[];
  score: number;
  moves: number;
  pairs: number;
  // The trap: each new game independently rolls whether identical digits
  // must be even or odd. Sum-to-10 pairs always match in both modes.
  matchMode: MatchParity;
}

// Fresh random digits 1–9 every game — a fixed board would let players memorize
// the opening. Retries until the board offers at least MIN_OPENING_MATCHES.
const MIN_OPENING_MATCHES = 3;
const GENERATE_TRIES = 50;

export function randomMatchMode(): MatchParity {
  return Math.random() < 0.5 ? 'even' : 'odd';
}

function randomBoard(): Cell[] {
  return Array.from({ length: BOARD_SIZE }, () => 1 + Math.floor(Math.random() * 9));
}

function legalMoveCount(board: Cell[], mode: MatchParity): number {
  const active: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) active.push(i);
  }
  let count = 0;
  for (let a = 0; a < active.length; a++) {
    for (let b = a + 1; b < active.length; b++) {
      if (canMatch(board, active[a], active[b], mode)) count++;
    }
  }
  return count;
}

export function generateBoard(mode: MatchParity): Cell[] {
  for (let t = 0; t < GENERATE_TRIES; t++) {
    const board = randomBoard();
    if (legalMoveCount(board, mode) >= MIN_OPENING_MATCHES) return board;
  }
  const board = randomBoard();
  board[0] = 1;
  board[1] = 9; // guaranteed adjacent sum-10 pair — legal in both modes
  return board;
}

export function newGame(): MatchGame {
  const matchMode = randomMatchMode();
  return { board: generateBoard(matchMode), score: 0, moves: 0, pairs: 0, matchMode };
}

export function activeCount(board: Cell[]): number {
  return board.reduce<number>((n, v) => (v === null ? n : n + 1), 0);
}

function valuesMatch(v1: number, v2: number, mode: MatchParity): boolean {
  // Identical digits match only when their parity matches the game's mode
  // (even mode: 2&2, 4&4, 6&6, 8&8 — odd mode: 1&1, 3&3, 7&7, 9&9).
  // Any pair summing to 10 always matches (covers 5&5 in both modes).
  return (v1 === v2 && (v1 % 2 === 0) === (mode === 'even')) || v1 + v2 === 10;
}

function isLastActiveInRow(board: Cell[], i: number): boolean {
  const end = Math.min((Math.floor(i / COLS) + 1) * COLS, board.length);
  for (let j = i + 1; j < end; j++) {
    if (board[j] !== null) return false;
  }
  return true;
}

function isFirstActiveInRow(board: Cell[], i: number): boolean {
  const start = Math.floor(i / COLS) * COLS;
  for (let j = start; j < i; j++) {
    if (board[j] !== null) return false;
  }
  return true;
}

export function canMatch(board: Cell[], i1: number, i2: number, mode: MatchParity): boolean {
  const v1 = board[i1];
  const v2 = board[i2];
  if (v1 === null || v2 === null || v1 === undefined || v2 === undefined || i1 === i2) {
    return false;
  }
  if (!valuesMatch(v1, v2, mode)) return false;

  const lo = Math.min(i1, i2);
  const hi = Math.max(i1, i2);
  const r1 = Math.floor(lo / COLS);
  const c1 = lo % COLS;
  const r2 = Math.floor(hi / COLS);
  const c2 = hi % COLS;
  const dr = r2 - r1;
  const dc = Math.abs(c2 - c1);

  // Physically touching: same row beside each other, stacked in a column,
  // or one step diagonal. Cleared/missing cells between the pair are not
  // bridgeable — the gap blocks the match.
  if (dr <= 1 && dc <= 1) return true;

  // Wrap-around: the last active cell of a row connects to the first active
  // cell of the very next row (reading-order continuation).
  if (r2 === r1 + 1 && isLastActiveInRow(board, lo) && isFirstActiveInRow(board, hi)) {
    return true;
  }

  return false;
}

export function findMatch(board: Cell[], mode: MatchParity): [number, number] | null {
  const active: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) active.push(i);
  }
  for (let a = 0; a < active.length; a++) {
    for (let b = a + 1; b < active.length; b++) {
      if (canMatch(board, active[a], active[b], mode)) return [active[a], active[b]];
    }
  }
  return null;
}

// Tetris-style gravity: within each column, active digits fall to the bottom
// preserving their order; cleared cells float to the top. Returns the new
// board plus a drop map (destination index -> source index) so the UI can
// animate each falling tile.
export function applyGravity(board: Cell[]): { board: Cell[]; drops: Map<number, number> } {
  const next = [...board];
  const drops = new Map<number, number>();
  const rows = Math.ceil(board.length / COLS);
  for (let c = 0; c < COLS; c++) {
    const slots: number[] = [];
    const values: { v: number; from: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const i = r * COLS + c;
      if (i < board.length) {
        slots.push(i);
        if (board[i] !== null) values.push({ v: board[i] as number, from: i });
      }
    }
    const empties = slots.length - values.length;
    slots.forEach((i, pos) => {
      if (pos < empties) {
        next[i] = null;
      } else {
        const src = values[pos - empties];
        next[i] = src.v;
        if (src.from !== i) drops.set(i, src.from);
      }
    });
  }
  return { board: next, drops };
}

export function emptyRowCount(board: Cell[]): number {
  const rows = Math.ceil(board.length / COLS);
  let count = 0;
  for (let r = 0; r < rows; r++) {
    let empty = true;
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (i < board.length && board[i] !== null) {
        empty = false;
        break;
      }
    }
    if (empty) count++;
  }
  return count;
}

export interface MatchResult {
  game: MatchGame;
  drops: Map<number, number>;
}

// Returns the next game state after a valid match, or null if illegal.
// The board is committed immediately (cleared + gravity applied) — callers
// animate on the DOM only, so undo during the animation is always safe.
export function applyMatch(game: MatchGame, i1: number, i2: number): MatchResult | null {
  if (!canMatch(game.board, i1, i2, game.matchMode)) return null;
  const equal = game.board[i1] === game.board[i2];
  const emptyBefore = emptyRowCount(game.board);
  const cleared = [...game.board];
  cleared[i1] = null;
  cleared[i2] = null;
  const { board, drops } = applyGravity(cleared);
  const newRows = Math.max(0, emptyRowCount(board) - emptyBefore);
  return {
    game: {
      board,
      score: game.score + (equal ? PAIR_EQUAL_POINTS : PAIR_SUM10_POINTS) + newRows * ROW_BONUS,
      moves: game.moves + 1,
      pairs: game.pairs + 1,
      matchMode: game.matchMode,
    },
    drops,
  };
}

export function hasMoves(board: Cell[], mode: MatchParity): boolean {
  return findMatch(board, mode) !== null;
}

// Rearranges the active digits among their current positions — same multiset,
// same gaps, new adjacencies. Retries until the result has a legal move.
export function shuffleActive(game: MatchGame): MatchGame | null {
  const indices: number[] = [];
  const values: number[] = [];
  game.board.forEach((v, i) => {
    if (v !== null) {
      indices.push(i);
      values.push(v);
    }
  });
  if (indices.length < 2) return null;

  for (let attempt = 0; attempt < 40; attempt++) {
    const shuffled = [...values];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const board = [...game.board];
    indices.forEach((idx, k) => {
      board[idx] = shuffled[k];
    });
    if (board.some((v, i) => v !== game.board[i]) && hasMoves(board, game.matchMode)) {
      return { ...game, board };
    }
  }
  // Fallback: reversal — still a different layout even if no move exists.
  const board = [...game.board];
  const reversed = [...values].reverse();
  indices.forEach((idx, k) => {
    board[idx] = reversed[k];
  });
  return { ...game, board };
}

export type BoardOutcome = 'playing' | 'won' | 'stuck';

// Checked after every board mutation. 'stuck' = no legal pairs — the only
// escapes left are Shuffle and Undo.
export function boardOutcome(game: MatchGame): BoardOutcome {
  if (activeCount(game.board) === 0) return 'won';
  if (!hasMoves(game.board, game.matchMode)) return 'stuck';
  return 'playing';
}

export function getBest(): number {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {}
}

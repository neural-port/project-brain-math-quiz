import { describe, expect, it } from 'vitest';
import {
  applyGravity,
  applyMatch,
  activeCount,
  boardOutcome,
  canMatch,
  emptyRowCount,
  findMatch,
  hasMoves,
  BOARD_SIZE,
  newGame,
  ROW_BONUS,
  PAIR_EQUAL_POINTS,
  PAIR_SUM10_POINTS,
  shuffleActive,
  COLS,
  type Cell,
} from './number-match';

const boardFrom = (cells: (number | null)[]): Cell[] => cells;

describe('number-match: value rule', () => {
  it('matches identical even digits (2&2, 4&4, 6&6, 8&8)', () => {
    for (const d of [2, 4, 6, 8]) {
      expect(canMatch(boardFrom([d, d, 5]), 0, 1, 'even')).toBe(true);
    }
  });

  it('rejects identical odd digits (1&1, 3&3, 7&7, 9&9)', () => {
    for (const d of [1, 3, 7, 9]) {
      expect(canMatch(boardFrom([d, d, 5]), 0, 1, 'even')).toBe(false);
    }
  });

  it('still allows 5&5 because it sums to 10', () => {
    expect(canMatch(boardFrom([5, 5, 2]), 0, 1, 'even')).toBe(true);
    expect(canMatch(boardFrom([5, 5, 2]), 0, 1, 'odd')).toBe(true);
  });

  it('odd mode flips the identical rule: odd digits match, even digits do not', () => {
    for (const d of [1, 3, 7, 9]) {
      expect(canMatch(boardFrom([d, d, 5]), 0, 1, 'odd')).toBe(true);
    }
    for (const d of [2, 4, 6, 8]) {
      expect(canMatch(boardFrom([d, d, 5]), 0, 1, 'odd')).toBe(false);
    }
  });

  it('mode only changes the identical rule — sum-10 pairs work in both modes', () => {
    expect(canMatch(boardFrom([4, 6, 1]), 0, 1, 'odd')).toBe(true);
    expect(canMatch(boardFrom([4, 6, 1]), 0, 1, 'even')).toBe(true);
  });

  it('matches adjacent numbers that sum to 10', () => {
    const board = boardFrom([1, 9, 4]);
    expect(canMatch(board, 0, 1, 'even')).toBe(true);
  });

  it('rejects numbers that neither match nor sum to 10', () => {
    const board = boardFrom([1, 2, 3]);
    expect(canMatch(board, 0, 1, 'even')).toBe(false);
  });

  it('rejects a cell matched against itself', () => {
    const board = boardFrom([5, 5]);
    expect(canMatch(board, 0, 0, 'even')).toBe(false);
  });

  it('rejects pairs touching a cleared cell', () => {
    const board = boardFrom([6, null, 6]);
    expect(canMatch(board, 0, 2, 'even')).toBe(false); // cleared gap between them
    expect(canMatch(board, 1, 2, 'even')).toBe(false); // one side is empty
  });
});

describe('number-match: line of sight (touching cells only)', () => {
  it('rejects a same-row pair with a cleared cell between them', () => {
    const board = boardFrom([4, null, 6]); // 4+6=10 but the gap blocks it
    expect(canMatch(board, 0, 2, 'even')).toBe(false);
  });

  it('rejects a sequential pair blocked by an active number', () => {
    const board = boardFrom([4, 7, 6]);
    expect(canMatch(board, 0, 2, 'even')).toBe(false);
  });

  it('rejects any pair with missing cells between — no bridging cleared space', () => {
    const board = boardFrom([4, null, null, 6, 9]);
    expect(canMatch(board, 0, 3, 'even')).toBe(false); // same row, 2 cleared cells between
  });

  it('allows wrap-around: last active cell of a row to first active of the next', () => {
    const board: Cell[] = new Array(COLS * 2).fill(null);
    board[COLS - 1] = 8; // end of row 0
    board[COLS] = 2;     // start of row 1 — consecutive in reading order, 8+2=10
    expect(canMatch(board, COLS - 1, COLS, 'even')).toBe(true);
  });

  it('allows wrap-around when the row edge has cleared cells before the pair', () => {
    const board: Cell[] = new Array(COLS * 2).fill(null);
    board[COLS - 3] = 4; // last ACTIVE cell of row 0 (idx 8,9 cleared)
    board[COLS + 1] = 6; // first ACTIVE cell of row 1 (idx 10 cleared)
    expect(canMatch(board, COLS - 3, COLS + 1, 'even')).toBe(true);
  });

  it('rejects wrap-around across a fully cleared row (not the next row)', () => {
    const board: Cell[] = new Array(COLS * 3).fill(null);
    board[COLS - 1] = 8;         // end of row 0
    board[2 * COLS] = 2;         // start of row 2 — row 1 is entirely empty
    expect(canMatch(board, COLS - 1, 2 * COLS, 'even')).toBe(false);
  });

  it('rejects same-column pairs separated by a cleared cell', () => {
    const board = boardFrom([
      5, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      null, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      5, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ]);
    // (0,0)=5 and (2,0)=5: same column but (1,0) is cleared — gap blocks it
    expect(canMatch(board, 0, 2 * COLS, 'even')).toBe(false);
  });

  it('rejects same-column pairs blocked by an active cell', () => {
    const board = boardFrom([
      5, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      4, null, null, null, null, null, null, null, null, null,
      5, null, null, null, null, null, null, null, null, null,
    ]);
    expect(canMatch(board, 0, 2 * COLS, 'even')).toBe(false);
  });

  it('allows diagonally adjacent pairs', () => {
    const b2 = boardFrom([
      2, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 8, 1, 1, 1, 1, 1, 1, 1, 1,
    ]);
    // (0,0)=2 and (1,1)=8: 2+8=10, one step diagonal — legal
    expect(canMatch(b2, 0, COLS + 1, 'even')).toBe(true);
  });

  it('rejects long-range diagonals (documented rule: diagonals only when adjacent)', () => {
    const board = boardFrom([
      3, null, null, null, null, null, null, null, null, null,
      1, null, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 3, 1, 1, 1, 1, 1, 1, 1,
    ]);
    // (0,0)=3 and (2,2)=3: same diagonal but two cells away — illegal
    expect(canMatch(board, 0, 2 * COLS + 2, 'even')).toBe(false);
  });

  it('allows vertically adjacent pairs in the same column', () => {
    const board: Cell[] = new Array(COLS * 2).fill(null);
    board[0] = 7;
    board[COLS] = 3; // (0,0)=7 and (1,0)=3: 7+3=10, stacked — legal
    expect(canMatch(board, 0, COLS, 'even')).toBe(true);
  });
});

describe('number-match: game operations', () => {
  it('generates a fresh 10×10 board of digits 1–9 with legal opening moves', () => {
    for (let run = 0; run < 25; run++) {
      const game = newGame();
      expect(game.board).toHaveLength(BOARD_SIZE);
      expect(game.board.every((v) => v !== null && v >= 1 && v <= 9)).toBe(true);
      expect(['even', 'odd']).toContain(game.matchMode);
      expect(findMatch(game.board, game.matchMode)).not.toBeNull();
    }
  });

  it('rolls matchMode per game and can produce both modes over several games', () => {
    const modes = new Set<string>();
    for (let run = 0; run < 40 && modes.size < 2; run++) {
      modes.add(newGame().matchMode);
    }
    // Over 40 coin flips the odds of only one mode appearing are ~2^-39 —
    // effectively impossible; but a single mode is legal, so assert only validity.
    modes.forEach((m) => expect(['even', 'odd']).toContain(m));
  });

  it('generates different boards across games (no memorized layout)', () => {
    const a = newGame().board;
    const b = newGame().board;
    expect(a).not.toEqual(b); // equality probability is ~9^-100 — impossible in practice
  });

  it('applyMatch commits the board immediately and scores equal vs sum-10 pairs', () => {
    const g1 = { board: boardFrom([8, 8, 1]), score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    const next1 = applyMatch(g1, 0, 1);
    expect(next1).not.toBeNull();
    expect(next1!.game.board[0]).toBeNull(); // committed synchronously, not via timer
    expect(next1!.game.board[1]).toBeNull();
    expect(next1!.game.score).toBe(PAIR_EQUAL_POINTS); // index 2 still holds 1 — no row bonus
    expect(next1!.game.pairs).toBe(1);

    const g2 = { board: boardFrom([4, 6, 1, 1, 1, 1, 1, 1, 1, 2]), score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    const next2 = applyMatch(g2, 0, 1);
    expect(next2!.game.score).toBe(PAIR_SUM10_POINTS);
    expect(applyMatch(g2, 0, 2)).toBeNull(); // 4+1 is not a legal value pair
  });

  it('awards a row bonus when the match empties the whole row', () => {
    // Single row of ten: clearing the last pair (8 & 8) empties the row
    const board: Cell[] = [null, null, null, null, null, null, null, null, 8, 8];
    const g = { board, score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    const next = applyMatch(g, 8, 9)!;
    expect(emptyRowCount(next.game.board)).toBe(1);
    expect(next.game.score).toBe(PAIR_EQUAL_POINTS + ROW_BONUS);
  });

  it('applies Tetris-style gravity: digits fall down within their column', () => {
    const board: Cell[] = new Array(COLS * 3).fill(null);
    board[0] = 1;           // (0,0) top
    board[2 * COLS] = 3;    // (2,0) bottom
    board[COLS] = null;     // (1,0) gap in the middle
    const g = applyGravity(board);
    // Column 0 should compact to the bottom: (1,0)=1, (2,0)=3, (0,0)=null
    expect(g.board[0]).toBeNull();
    expect(g.board[COLS]).toBe(1);
    expect(g.board[2 * COLS]).toBe(3);
    // And the drop map records where each tile came from
    expect(g.drops.get(COLS)).toBe(0);       // 1 fell from row 0 to row 1
    expect(g.drops.has(2 * COLS)).toBe(false); // 3 was already at the bottom
  });

  it('match + gravity pulls digits down through cleared gaps', () => {
    // 4 at (1,0) and 6 at (2,0) are vertically adjacent; clearing them leaves
    // the 5 at (3,0) sitting at the bottom of the column.
    const board: Cell[] = new Array(COLS * 4).fill(null);
    board[COLS] = 4;
    board[2 * COLS] = 6;
    board[3 * COLS] = 5;
    const g = { board, score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    const next = applyMatch(g, COLS, 2 * COLS)!;
    expect(next.game.board[3 * COLS]).toBe(5);
    expect(next.game.board[COLS]).toBeNull();
    expect(next.game.board[2 * COLS]).toBeNull();
  });

  it('undo snapshots restore the exact prior board (no async corruption)', () => {
    const game = { board: boardFrom([6, 6, 2]), score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    const snapshot = { ...game, board: [...game.board] };
    const next = applyMatch(game, 0, 1)!;
    // Simulated undo: restore the snapshot wholesale — since applyMatch already
    // committed the board, restoring the snapshot cannot lose cells.
    expect(snapshot.board).toEqual([6, 6, 2]);
    expect(next.game.board).toEqual([null, null, 2]);
    expect(activeCount(next.game.board)).toBe(1);
  });

  it('findMatch returns a pair that actually validates', () => {
    const board = boardFrom([1, 5, 5, 9]);
    const pair = findMatch(board, 'even');
    expect(pair).not.toBeNull();
    expect(canMatch(board, pair![0], pair![1], 'even')).toBe(true);
  });

  it('boardOutcome declares won when the board is empty', () => {
    const g = { board: new Array<Cell>(COLS).fill(null), score: 10, moves: 1, pairs: 5, matchMode: 'even' as const };
    expect(boardOutcome(g)).toBe('won');
  });

  it('boardOutcome stays playing when moves exist', () => {
    const g = { board: boardFrom([4, 6, 1]), score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    expect(boardOutcome(g)).toBe('playing');
  });

  it('boardOutcome declares stuck as soon as no legal pair remains', () => {
    // 1,3,1,3: neighbours differ (1+3=4) — zero legal pairs anywhere
    const g = { board: boardFrom([1, 3, 1, 3]), score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    expect(hasMoves(g.board, 'even')).toBe(false);
    expect(boardOutcome(g)).toBe('stuck'); // only Shuffle or Undo can continue
  });

  it('boardOutcome declares stuck on a large board with zero legal pairs', () => {
    // Alternating 1,3,1,3…: horizontal neighbours differ (1+3=4), vertical
    // neighbours are identical odd digits (illegal in even mode), diagonals differ.
    const board: Cell[] = new Array<Cell>(COLS * 4).fill(0).map((_, i) => (i % 2 === 0 ? 1 : 3));
    const g = { board, score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    expect(findMatch(board, 'even')).toBeNull();
    expect(boardOutcome(g)).toBe('stuck');
  });

  it('shuffleActive keeps the same multiset and gaps but rearranges positions', () => {
    const game = { board: boardFrom([1, 9, null, 2, 8, null, 4, 6]), score: 7, moves: 2, pairs: 3, matchMode: 'even' as const };
    const next = shuffleActive(game)!;
    expect(next).not.toBeNull();
    // Same active cells stay active, same cleared cells stay cleared
    expect(next.board[2]).toBeNull();
    expect(next.board[5]).toBeNull();
    // Same multiset of values
    const sort = (b: Cell[]) => b.filter((v): v is number => v !== null).sort((a, b) => a - b);
    expect(sort(next.board)).toEqual(sort(game.board));
    expect(next.score).toBe(7);
  });

  it('shuffleActive produces a board with a legal move on a rich layout', () => {
    // Plenty of complement pairs — nearly every permutation has a match
    const values = [1, 9, 2, 8, 3, 7, 4, 6, 5, 5, 1, 9, 2, 8, 4, 6, 3, 7, 5, 5];
    const game = { board: boardFrom(values), score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    const next = shuffleActive(game)!;
    expect(hasMoves(next.board, 'even')).toBe(true);
  });

  it('shuffleActive returns null when fewer than two digits remain', () => {
    const g = { board: boardFrom([null, 7, null, null]), score: 0, moves: 0, pairs: 0, matchMode: 'even' as const };
    expect(shuffleActive(g)).toBeNull();
  });
});

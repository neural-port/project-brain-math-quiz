import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  applyMatch,
  boardOutcome,
  COLS,
  findMatch,
  getBest,
  newGame,
  saveBest,
  shuffleActive,
  VICTORY_BONUS,
  ROW_BONUS,
  type MatchGame,
} from '../puzzle/number-match';

const DROP_ANIMATION_MS = 650;
const HISTORY_LIMIT = 25;

interface Props {
  onExit: () => void;
}

export function NumberMatchGame({ onExit }: Props) {
  const [game, setGame] = useState<MatchGame>(() => newGame());
  const [history, setHistory] = useState<MatchGame[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [clearing, setClearing] = useState<Map<number, number>>(new Map());
  const [drops, setDrops] = useState<ReadonlyMap<number, number>>(new Map());
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [won, setWon] = useState(false);
  const [deadEnd, setDeadEnd] = useState(false);
  const [best, setBest] = useState(() => getBest());

  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelp(false);
        setWon(false);
        setDeadEnd(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const notify = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const updateBest = (score: number) => {
    if (score > best) {
      setBest(score);
      saveBest(score);
    }
  };

  const pushHistory = (snapshot: MatchGame) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), snapshot]);
  };

  // Runs after every board mutation: declares the outcome immediately —
  // full clear = win, no legal pairs = dead end.
  const evaluate = (next: MatchGame) => {
    const outcome = boardOutcome(next);
    if (outcome === 'won') {
      const finalGame = { ...next, score: next.score + VICTORY_BONUS };
      setGame(finalGame);
      updateBest(finalGame.score);
      setWon(true);
    } else if (outcome === 'stuck') {
      setDeadEnd(true);
    }
  };

  const handleCellClick = (index: number) => {
    if (won || deadEnd) return;
    if (game.board[index] === null) return;
    setHint(null);

    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }

    const result = applyMatch(game, selected, index);
    if (result) {
      const next = result.game;
      pushHistory(game);
      const clearedValues = new Map<number, number>([
        [selected, game.board[selected] as number],
        [index, game.board[index] as number],
      ]);
      setClearing(clearedValues);
      setDrops(result.drops);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        setClearing(new Map());
        setDrops(new Map());
      }, DROP_ANIMATION_MS);

      setSelected(null);
      setGame(next);
      updateBest(next.score);
      evaluate(next);
    } else {
      setSelected(index);
    }
  };

  const handleHint = () => {
    const pair = findMatch(game.board, game.matchMode);
    setSelected(null);
    if (!pair) {
      notify('No matches available — Undo or start a new board.');
      setHint(null);
      return;
    }
    setHint(pair);
  };

  const handleShuffle = () => {
    // Shuffle is a pre-game re-roll only — locked once the first move lands
    // (and during play it would silently rescue dead boards, hiding the score cost).
    if (won || game.moves > 0) return;
    const next = shuffleActive(game);
    if (!next) {
      notify('Nothing to shuffle.');
      return;
    }
    pushHistory(game);
    setSelected(null);
    setHint(null);
    setClearing(new Map());
    setDrops(new Map());
    setDeadEnd(false);
    setGame(next);
    evaluate(next);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGame(previous);
    setSelected(null);
    setHint(null);
    setClearing(new Map());
    setDrops(new Map());
    setWon(false);
    setDeadEnd(false);
    // The restored board can itself be dead (e.g. undoing a shuffle that
    // escaped a dead end) — re-evaluate so the card reappears correctly.
    evaluate(previous);
  };

  const resetGame = () => {
    setGame(newGame());
    setHistory([]);
    setSelected(null);
    setHint(null);
    setClearing(new Map());
    setDrops(new Map());
    setWon(false);
    setDeadEnd(false);
  };

  const handleRestart = () => {
    if (!confirm('Start a new puzzle? Current progress will be lost.')) return;
    resetGame();
  };

  const active = game.board.filter((v) => v !== null).length;

  return (
    <div className="puzzle-screen">
      <div className="puzzle-hud">
        <div className="puzzle-hud__stats">
          <div className="nm-stat">
            <span className="nm-stat__label">Score</span>
            <span className="nm-stat__value nm-stat__value--accent">{game.score}</span>
          </div>
          <div className="nm-stat">
            <span className="nm-stat__label">Best</span>
            <span className="nm-stat__value">{best}</span>
          </div>
          <div className="nm-stat">
            <span className="nm-stat__label">Active / Pairs</span>
            <span className="nm-stat__value">{active} / {game.pairs}</span>
          </div>
        </div>
        <button className="quit-btn" onClick={onExit} type="button">Back</button>
      </div>

      <p className="nm-rule-banner">
        This board: match equal <strong className="nm-mode-pill">{game.matchMode}</strong> digits{' '}
        <strong>({game.matchMode === 'even' ? '4 & 4' : '3 & 3'})</strong> or pairs summing to 10 <strong>(1 + 9)</strong>
      </p>

      <div className="nm-board">
        <div className="nm-grid">
          {game.board.map((value, idx) => {
            const isClearing = value === null && clearing.has(idx);
            const dropFrom = drops.get(idx);
            const dropRows =
              dropFrom !== undefined
                ? Math.max(1, Math.floor(idx / COLS) - Math.floor(dropFrom / COLS))
                : 0;
            const classes = [
              'nm-cell',
              value === null && !isClearing ? 'nm-cell--empty' : '',
              selected === idx ? 'nm-cell--selected' : '',
              hint && (hint[0] === idx || hint[1] === idx) ? 'nm-cell--hint' : '',
              isClearing ? 'nm-cell--clearing' : '',
              dropFrom !== undefined ? 'nm-cell--drop' : '',
            ].filter(Boolean).join(' ');
            const shown = value !== null ? value : isClearing ? clearing.get(idx) : null;
            const style =
              dropFrom !== undefined
                ? ({
                    '--drop-rows': dropRows,
                    '--drop-dur': `${Math.min(0.55, 0.14 + dropRows * 0.06)}s`,
                  } as CSSProperties)
                : undefined;
            return (
              <button
                key={idx}
                type="button"
                className={classes}
                style={style}
                onClick={() => handleCellClick(idx)}
                disabled={value === null && !isClearing}
                aria-label={shown !== null && shown !== undefined ? `Cell ${shown}` : 'Empty cell'}
              >
                {shown}
              </button>
            );
          })}
        </div>
      </div>

      <div className="nm-controls">
        <button className="ghost-btn" onClick={handleUndo} disabled={history.length === 0} type="button">
          Undo{history.length > 0 ? ` (${history.length})` : ''}
        </button>
        <button className="ghost-btn" onClick={handleHint} type="button">Hint</button>
        <button
          className="ghost-btn"
          onClick={handleShuffle}
          disabled={game.moves > 0}
          title={game.moves > 0 ? 'Shuffle is only available before your first move' : 'Re-roll the board'}
          type="button"
        >
          Shuffle
        </button>
        <button className="ghost-btn" onClick={() => setShowHelp(true)} type="button">
          Rules
        </button>
        <button className="ghost-btn" onClick={handleRestart} type="button">Restart</button>
      </div>

      {toast && <div className="nm-toast" role="status">{toast}</div>}

      {won && (
        <div className="nm-modal-overlay" onClick={() => setWon(false)}>
          <div
            className="nm-modal nm-modal--win"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nm-win-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nm-modal__head">
              <h3 id="nm-win-title" className="nm-victory__title">Board cleared!</h3>
              <button className="nm-modal__close" onClick={() => setWon(false)} type="button" aria-label="Close">
                ×
              </button>
            </div>
            <p className="nm-victory__meta">
              Final score <strong>{game.score}</strong> (includes +{VICTORY_BONUS} bonus) · {game.pairs} pairs in {game.moves} moves · Best {best}
            </p>
            <div className="nm-victory__actions">
              <button className="start-btn" onClick={resetGame} type="button">Play again</button>
              <button className="ghost-btn" onClick={onExit} type="button">Back to practice</button>
            </div>
          </div>
        </div>
      )}

      {deadEnd && (
        <div className="nm-modal-overlay" onClick={() => setDeadEnd(false)}>
          <div
            className="nm-modal nm-modal--end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nm-end-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nm-modal__head">
              <h3 id="nm-end-title" className="nm-victory__title">No more pairs remain</h3>
              <button className="nm-modal__close" onClick={() => setDeadEnd(false)} type="button" aria-label="Close">
                ×
              </button>
            </div>
            <p className="nm-victory__meta">
              No legal pair is left on the board. Final score <strong>{game.score}</strong> · {game.pairs} pairs cleared · Best {best}.
              Undo a move to keep trying, or start a new board.
            </p>
            <div className="nm-victory__actions">
              <button className="ghost-btn" onClick={handleUndo} disabled={history.length === 0} type="button">
                Undo last move
              </button>
              <button className="start-btn" onClick={resetGame} type="button">New board</button>
              <button className="ghost-btn" onClick={onExit} type="button">Back to practice</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="nm-modal-overlay" onClick={() => setShowHelp(false)}>
          <div
            className="nm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nm-rules-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nm-modal__head">
              <h3 id="nm-rules-title">Rules</h3>
              <button className="nm-modal__close" onClick={() => setShowHelp(false)} type="button" aria-label="Close rules">
                ×
              </button>
            </div>
            <div className="nm-help">
              <p><strong>Goal:</strong> clear the whole board by removing pairs.</p>
              <p><strong>Pair if:</strong> {game.matchMode === 'even'
                ? <>this board is in <strong>EVEN mode</strong> — equal digits match only when even (2&amp;2, 4&amp;4, 6&amp;6, 8&amp;8); odd identical digits (3&amp;3, 9&amp;9) do not match.</>
                : <>this board is in <strong>ODD mode</strong> — equal digits match only when odd (1&amp;1, 3&amp;3, 7&amp;7, 9&amp;9); even identical digits (4&amp;4, 8&amp;8) do not match.</>}
                {' '}Pairs summing to 10 always match — including 5&amp;5. The mode is rolled fresh every new game.</p>
              <p><strong>Line of sight:</strong> cells must touch — side by side, stacked vertically, or one step diagonally. A cleared gap between two numbers blocks the match. The last active digit of a row also connects to the first active digit of the next row.</p>
              <p><strong>Gravity:</strong> when a pair is removed, the digits above fall down within their column (Tetris-style). Empty cells float to the top.</p>
              <p><strong>Stuck?</strong> Undo rolls back a move — Shuffle is a pre-game re-roll, available only before your first move. +15 for equal pairs, +10 for sums of 10, +{ROW_BONUS} per fully cleared row.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

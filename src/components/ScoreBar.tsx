import { CATEGORY_LABELS, CATEGORY_SHORT } from '../quiz/categories';
import type { QuizState } from '../quiz/types';

interface Props {
  state: QuizState;
}

export function ScoreBar({ state }: Props) {
  const { score, streak, bestStreak, currentIndex, questions, config } = state;
  const progress = ((currentIndex + (state.answered ? 1 : 0)) / questions.length) * 100;
  const currentQ = questions[currentIndex];

  return (
    <div className="score-bar">
      <div className="score-bar__top">
        <div className="score-bar__stat">
          <span className="stat-label">Score</span>
          <span className="stat-value stat-value--score">{score.toLocaleString()}</span>
        </div>
        <div className="score-bar__stat">
          <span className="stat-label">Streak</span>
          <span className="stat-value">{streak}</span>
        </div>
        <div className="score-bar__stat">
          <span className="stat-label">Best</span>
          <span className="stat-value">{bestStreak}</span>
        </div>
        <div className="score-bar__stat">
          <span className="stat-label">Question</span>
          <span className="stat-value">
            {Math.min(currentIndex + 1, questions.length)}/{questions.length}
          </span>
        </div>
      </div>

      <div className="score-bar__progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {currentQ && (
        <div className="score-bar__category">
          <span className="cat-tag" title={CATEGORY_LABELS[currentQ.category]}>
            {CATEGORY_SHORT[currentQ.category]}
          </span>
          <span className={`diff-tag diff-tag--${config.difficulty}`}>{config.difficulty}</span>
        </div>
      )}
    </div>
  );
}

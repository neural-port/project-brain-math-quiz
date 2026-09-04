import { CATEGORY_LABELS } from '../quiz/categories';
import type { AnswerRecord, QuizState } from '../quiz/types';

interface Props {
  state: QuizState;
  playerName: string | null;
  onRestart: () => void;
}

export function ResultsScreen({ state, playerName, onRestart }: Props) {
  const { score, history, bestStreak, lives, maxLives, config } = state;
  const correctCount = history.filter((h) => h.correct).length;
  const totalAnswered = history.length;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  // Per-category breakdown
  const byCategory = new Map<string, { correct: number; total: number }>();
  for (const rec of history) {
    const cat = rec.question.category;
    const entry = byCategory.get(cat) ?? { correct: 0, total: 0 };
    entry.total++;
    if (rec.correct) entry.correct++;
    byCategory.set(cat, entry);
  }

  const grade = getGrade(accuracy, score, config.difficulty);

  return (
    <div className="results">
      <div className="results__header">
        <h2 className="results__title">
          {config.practice
            ? (playerName ? `${playerName}, practice round complete` : 'Practice round complete')
            : (playerName ? `${playerName}, quiz complete` : 'Quiz complete')}
        </h2>
        <div className={`results__grade results__grade--${grade.class}`}>{grade.label}</div>
      </div>

      <div className="results__summary">
        <div className="summary-card">
          <span className="summary-card__value">{score.toLocaleString()}</span>
          <span className="summary-card__label">Total Score</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__value">{accuracy}%</span>
          <span className="summary-card__label">Accuracy</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__value">{correctCount}/{totalAnswered}</span>
          <span className="summary-card__label">Correct</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__value">{bestStreak}</span>
          <span className="summary-card__label">Best Streak</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__value">{lives}/{maxLives}</span>
          <span className="summary-card__label">Lives Left</span>
        </div>
      </div>

      <div className="results__categories">
        <h3>By Category</h3>
        <div className="cat-breakdown">
          {[...byCategory.entries()].map(([cat, stats]) => (
            <div key={cat} className="cat-breakdown__row">
              <span className="cat-breakdown__name">
                {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}
              </span>
              <div className="cat-breakdown__bar">
                <div
                  className="cat-breakdown__fill"
                  style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                />
              </div>
              <span className="cat-breakdown__score">
                {stats.correct}/{stats.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="results__review">
        <h3>Question Review</h3>
        <div className="review-list">
          {history.map((rec, i) => (
            <ReviewItem key={i} record={rec} index={i} />
          ))}
        </div>
      </div>

      <button className="restart-btn" onClick={onRestart}>
        Back to Start
      </button>
    </div>
  );
}

function ReviewItem({ record, index }: { record: AnswerRecord; index: number }) {
  const { question, selected, correct } = record;
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className={`review-item ${correct ? 'review-item--correct' : 'review-item--wrong'}`}>
      <div className="review-item__header">
        <span className="review-item__num">Q{index + 1}</span>
        <span className="review-item__status">{correct ? '✓' : '✕'}</span>
        <span className="review-item__prompt">{question.prompt}</span>
      </div>
      {!correct && (
        <div className="review-item__answers">
          {selected !== null && (
            <div className="review-item__your-answer">
              Your answer: {letters[selected]}) {question.options[selected]}
            </div>
          )}
          <div className="review-item__correct-answer">
            Correct: {letters[question.answerIndex]}) {question.options[question.answerIndex]}
          </div>
        </div>
      )}
    </div>
  );
}

function getGrade(accuracy: number, score: number, difficulty: string): { label: string; class: string } {
  const multiplier = difficulty === 'hard' ? 1 : difficulty === 'medium' ? 0.7 : 0.5;
  const adjustedScore = score * multiplier;

  if (accuracy >= 90 && adjustedScore >= 2000) return { label: 'S', class: 's' };
  if (accuracy >= 80) return { label: 'A', class: 'a' };
  if (accuracy >= 70) return { label: 'B', class: 'b' };
  if (accuracy >= 60) return { label: 'C', class: 'c' };
  if (accuracy >= 50) return { label: 'D', class: 'd' };
  return { label: 'F', class: 'f' };
}

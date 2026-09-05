import { useEffect, useState } from 'react';
import type { Question } from '../quiz/types';
import { VisualQuestionPanel } from './VisualQuestionPanel';

interface Props {
  question: Question;
  selectedAnswer: number | null;
  answered: boolean;
  practice?: boolean;
  onSelect: (index: number) => void;
  onNext: () => void;
  onRetry: () => void;
  isLast: boolean;
  outOfLives: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function demoHint(question: Question): string {
  if (!question.visual) return 'Watch — the correct answer will be highlighted, then selected for you.';
  switch (question.visual.kind) {
    case 'rotate':
      return 'Watch — the shape will rotate itself to match the outline, then submit automatically.';
    case 'memory-dots':
      return 'Watch the dots light up. After the sequence finishes, they will tap themselves in order to show you how it works.';
    default:
      return 'Watch — the correct answer will be highlighted, then selected for you.';
  }
}

export function QuestionCard({
  question,
  selectedAnswer,
  answered,
  practice = false,
  onSelect,
  onNext,
  onRetry,
  isLast,
  outOfLives,
}: Props) {
  return (
    <QuestionCardInner
      key={question.id}
      question={question}
      selectedAnswer={selectedAnswer}
      answered={answered}
      practice={practice}
      onSelect={onSelect}
      onNext={onNext}
      onRetry={onRetry}
      isLast={isLast}
      outOfLives={outOfLives}
    />
  );
}

function QuestionCardInner({
  question,
  selectedAnswer,
  answered,
  practice = false,
  onSelect,
  onNext,
  onRetry,
  isLast,
  outOfLives,
}: Props) {
  const isCorrect = answered && selectedAnswer === question.answerIndex;
  // demoMode: true while auto-playing. Switches to false when user clicks "Try".
  // Using `practice` as the initial value means a fresh question starts in demo mode.
  const [demoReady, setDemoReady] = useState(false);
  const [demoMode, setDemoMode] = useState(practice);

  const isInteractive = question.visual?.kind === 'rotate' || question.visual?.kind === 'memory-dots';

  // Demo step 1: highlight the correct answer after a pause
  useEffect(() => {
    if (!practice || answered || !demoMode) return;
    const t = setTimeout(() => setDemoReady(true), 2500);
    return () => clearTimeout(t);
  }, [practice, answered, demoMode]);

  // Demo step 2: auto-select the correct answer (for non-interactive types)
  useEffect(() => {
    if (!practice || answered || !demoReady || !demoMode || isInteractive) return;
    const t = setTimeout(() => onSelect(question.answerIndex), 3500);
    return () => clearTimeout(t);
  }, [practice, answered, demoReady, demoMode, isInteractive, question, onSelect]);

  // Demo step 3: after feedback shows, auto-loop back to replay after a pause
  useEffect(() => {
    if (!practice || !answered || !demoMode) return;
    const t = setTimeout(() => {
      setDemoReady(false);
      onRetry();
    }, 5000);
    return () => clearTimeout(t);
  }, [practice, answered, demoMode, onRetry]);

  const handleTry = () => {
    setDemoMode(false);
    setDemoReady(false);
    if (answered) onRetry();
  };

  return (
    <div className="question-card">
      {practice && !answered && (
        <p className="demo-caption">{demoHint(question)}</p>
      )}

      <div className="question-card__prompt">
        <p>{question.prompt}</p>
      </div>

      {question.visual && (
        <VisualQuestionPanel
          question={question}
          selectedAnswer={selectedAnswer}
          answered={answered}
          practice={practice && demoMode}
          demo={practice && demoReady && !answered && demoMode}
          onSelect={onSelect}
        />
      )}

      {(!question.visual || question.visual.kind === 'count' || question.visual.kind === 'fraction' || question.visual.kind === 'dot-region' || question.visual.kind === 'figure-classification') && (
        <div className="question-card__options">
          {question.options.map((option, i) => {
            const isSelected = selectedAnswer === i;
            const isAnswer = i === question.answerIndex;

            let className = 'option';
            if (answered) {
              if (isAnswer) className += ' option--correct';
              else if (isSelected) className += ' option--wrong';
              else className += ' option--dim';
            } else {
              className += ' option--interactive';
              if (practice && demoReady && demoMode && isAnswer) className += ' option--demo';
            }

            return (
              <button
                key={i}
                className={className}
                onClick={() => !answered && onSelect(i)}
                disabled={answered || (practice && demoMode)}
              >
                <span className="option__letter">{LETTERS[i]}</span>
                <span className="option__text">{option}</span>
                {answered && isAnswer && <span className="option__badge">✓</span>}
                {answered && isSelected && !isAnswer && <span className="option__badge">✕</span>}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <div className="question-card__feedback">
          <div className={`feedback-result ${isCorrect ? 'feedback-result--correct' : 'feedback-result--wrong'}`}>
            {isCorrect ? 'Correct' : selectedAnswer === null ? "Time's up" : 'Incorrect'}
          </div>
          {question.explanation && (
            <div className="feedback-explanation">
              <span className="feedback-explanation__label">Explanation:</span>
              <span>{question.explanation}</span>
            </div>
          )}
          {practice && demoMode ? (
            <div className="feedback-actions">
              <button className="try-btn" onClick={handleTry}>
                Try it myself
              </button>
              <p className="feedback-loop-hint">Replaying automatically…</p>
            </div>
          ) : (
            <button className="next-btn" onClick={onNext}>
              {isLast || outOfLives ? 'See Results' : 'Next Question'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import type { Question } from '../quiz/types';
import { ShapeGraphic } from './ShapeGraphic';
import { RotationChallenge } from './RotationChallenge';
import { MemoryDotsChallenge } from './MemoryDotsChallenge';

interface Props {
  question: Question;
  selectedAnswer: number | null;
  answered: boolean;
  practice?: boolean;
  demo?: boolean;
  onSelect: (index: number) => void;
}

export function VisualQuestionPanel({ question, selectedAnswer, answered, practice = false, demo = false, onSelect }: Props) {
  const visual = question.visual;
  if (!visual) return null;

  if (visual.kind === 'count') {
    return (
      <div className="shape-scene" role="img" aria-label="A collection of shapes to count">
        {visual.scene.map((spec, index) => (
          <span
            key={`${spec.shape}-${index}`}
            className={`shape-scene__item${demo && spec.shape === visual.countShape ? ' shape-scene__item--demo' : ''}`}
            style={{ left: `${spec.x}%`, top: `${spec.y}%` }}
          >
            <ShapeGraphic spec={spec} />
          </span>
        ))}
      </div>
    );
  }

  if (visual.kind === 'rotate') {
    return (
      <RotationChallenge
        question={question}
        answered={answered}
        practice={practice}
        onSelect={onSelect}
      />
    );
  }

  if (visual.kind === 'memory-dots') {
    return (
      <MemoryDotsChallenge
        question={question}
        answered={answered}
        practice={practice}
        onSelect={onSelect}
      />
    );
  }

  if (visual.kind === 'fraction') {
    return (
      <div
        className={visual.vertical ? 'fraction-bar fraction-bar--vertical' : 'fraction-bar'}
        role="img"
        aria-label={`A bar split into ${visual.total} equal parts, ${visual.shaded} shaded`}
      >
        {Array.from({ length: visual.total }, (_, i) => (
          <div
            key={i}
            className={i < visual.shaded ? 'fraction-bar__part fraction-bar__part--shaded' : 'fraction-bar__part'}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="visual-choice">
      {visual.kind === 'mirror' && visual.target && (
        <div className="mirror-target">
          <span className="visual-label">Original figure</span>
          <ShapeGraphic spec={visual.target} label="Original figure" />
          <span className="mirror-axis" aria-hidden="true" />
        </div>
      )}
      <div className="visual-choice__grid" role="group" aria-label="Visual answer choices">
        {visual.options.map((spec, index) => {
          const isSelected = selectedAnswer === index;
          const isAnswer = question.answerIndex === index;
          let className = 'visual-option';
          if (answered) {
            if (isAnswer) className += ' visual-option--correct';
            else if (isSelected) className += ' visual-option--wrong';
            else className += ' visual-option--dim';
          } else if (demo && isAnswer) {
            className += ' visual-option--demo';
          }

          return (
            <button
              key={`${spec.shape}-${index}`}
              className={className}
              onClick={() => onSelect(index)}
              disabled={answered || demo}
              aria-label={`Option ${index + 1}: ${question.options[index]}`}
            >
              <span className="visual-option__number">{index + 1}</span>
              <ShapeGraphic spec={spec} />
              {answered && isAnswer && <span className="visual-option__status">Correct</span>}
              {answered && isSelected && !isAnswer && <span className="visual-option__status">Incorrect</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

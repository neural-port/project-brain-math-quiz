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

  if (visual.kind === 'text-mirror') {
    return (
      <div className="visual-choice">
        <div className="mirror-target mirror-target--text">
          <span className="visual-label">Original text</span>
          <div className="text-mirror-row">
            <div className="text-mirror-original" role="img" aria-label={`Original text: ${visual.word}`}>
              {visual.word}
            </div>
            <span className="mirror-axis" aria-hidden="true" />
          </div>
        </div>
        <div className="visual-choice__grid" role="group" aria-label="Mirror image answer choices">
          {visual.options.map((opt, index) => {
            const isSelected = selectedAnswer === index;
            const isAnswer = question.answerIndex === index;
            let className = 'visual-option text-mirror-option';
            if (answered) {
              if (isAnswer) className += ' visual-option--correct';
              else if (isSelected) className += ' visual-option--wrong';
              else className += ' visual-option--dim';
            } else if (demo && isAnswer) {
              className += ' visual-option--demo';
            }
            const transform = [
              opt.mirrorX ? 'scaleX(-1)' : '',
              opt.mirrorY ? 'scaleY(-1)' : '',
              opt.rotate180 ? 'rotate(180deg)' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={`text-mirror-${index}`}
                className={className}
                onClick={() => onSelect(index)}
                disabled={answered || demo}
                aria-label={`Option ${index + 1}`}
              >
                <span className="visual-option__number">{index + 1}</span>
                <span
                  className="text-mirror-text"
                  style={transform ? { transform } : undefined}
                >
                  {opt.text}
                </span>
                {answered && isAnswer && <span className="visual-option__status">Correct</span>}
                {answered && isSelected && !isAnswer && <span className="visual-option__status">Incorrect</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual.kind === 'dot-region') {
    return (
      <div className="dot-region-display" role="img" aria-label="Overlapping shapes with a dot">
        <svg viewBox="0 0 100 100" className="dot-region-svg">
          {visual.shapes.map((s, i) => {
            const stroke = ['#2a9d8f', '#e76f51', '#264653'][i % 3];
            if (s.type === 'circle') {
              return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={stroke} strokeWidth="2" />;
            }
            if (s.type === 'square') {
              return <rect key={i} x={s.cx - (s.w ?? 40) / 2} y={s.cy - (s.w ?? 40) / 2} width={s.w ?? 40} height={s.w ?? 40} fill="none" stroke={stroke} strokeWidth="2" />;
            }
            // triangle
            const h = s.h ?? 40;
            const top = s.cy - h / 2;
            const bottom = s.cy + h / 2;
            const halfBase = h / 2;
            return <polygon key={i} points={`${s.cx},${top} ${s.cx - halfBase},${bottom} ${s.cx + halfBase},${bottom}`} fill="none" stroke={stroke} strokeWidth="2" />;
          })}
          {visual.shapes.map((s, i) => {
            const top = s.type === 'circle'
              ? s.cy - (s.r ?? 25)
              : s.type === 'square'
                ? s.cy - (s.w ?? 40) / 2
                : s.cy - (s.h ?? 40) / 2;
            return (
              <text
                key={`label-${i}`}
                x={s.cx}
                y={top - 3}
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                fill="#333"
              >
                {s.label}
              </text>
            );
          })}
          <circle cx={visual.dot.x} cy={visual.dot.y} r="3" fill="#e63946" />
        </svg>
      </div>
    );
  }

  if (visual.kind === 'composite-rotate') {
    const renderComposite = (base: typeof visual.base, rotation: number, mirrorX?: boolean) => {
      const transform = `rotate(${rotation} 50 50)${mirrorX ? ' scale(-1 1) translate(-100 0)' : ''}`;
      return (
        <g transform={transform}>
          {base.shape === 'square' && <rect x="15" y="15" width="70" height="70" fill="none" stroke="#2a9d8f" strokeWidth="2" />}
          {base.shape === 'circle' && <circle cx="50" cy="50" r="35" fill="none" stroke="#2a9d8f" strokeWidth="2" />}
          {base.lines?.map((l, i) => (
            <line key={`line-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#264653" strokeWidth="1.5" />
          ))}
          {base.dots.map((d, i) => (
            <circle key={`dot-${i}`} cx={d.x} cy={d.y} r="4" fill="#e63946" />
          ))}
        </g>
      );
    };
    return (
      <div className="composite-rotate-display">
        <div className="composite-rotate-base">
          <span className="visual-label">Original figure</span>
          <svg viewBox="0 0 100 100" className="composite-rotate-svg">
            {renderComposite(visual.base, 0)}
          </svg>
        </div>
        <div className="visual-choice__grid" role="group" aria-label="Rotation answer choices">
          {visual.options.map((opt, index) => {
            const isSelected = selectedAnswer === index;
            const isAnswer = question.answerIndex === index;
            let className = 'visual-option composite-rotate-option';
            if (answered) {
              if (isAnswer) className += ' visual-option--correct';
              else if (isSelected) className += ' visual-option--wrong';
              else className += ' visual-option--dim';
            } else if (demo && isAnswer) {
              className += ' visual-option--demo';
            }
            return (
              <button
                key={`comp-rotate-${index}`}
                className={className}
                onClick={() => onSelect(index)}
                disabled={answered || demo}
                aria-label={`Option ${index + 1}`}
              >
                <span className="visual-option__number">{index + 1}</span>
                <svg viewBox="0 0 100 100" className="composite-rotate-svg composite-rotate-svg--option">
                  {renderComposite(visual.base, opt.rotation, opt.mirrorX)}
                </svg>
                {answered && isAnswer && <span className="visual-option__status">Correct</span>}
                {answered && isSelected && !isAnswer && <span className="visual-option__status">Incorrect</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual.kind === 'figure-classification') {
    const cols = visual.figures.length <= 4 ? 2 : 3;
    return (
      <div className="figure-classification-display" role="img" aria-label="A grid of figures to classify">
        <div className={`figure-classification-grid figure-classification-grid--${cols}col`}>
          {visual.figures.map((spec, index) => (
            <div key={`fig-${index}`} className="figure-classification-cell">
              <span className="figure-classification-number">{index + 1}</span>
              <ShapeGraphic spec={spec} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="visual-choice">
      {visual.kind === 'mirror' && visual.target && (
        <div className="mirror-target">
          <span className="visual-label">Original figure</span>
          <ShapeGraphic spec={visual.target} label="Original figure" />
          <span className="mirror-axis mirror-axis--edge" aria-hidden="true" />
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

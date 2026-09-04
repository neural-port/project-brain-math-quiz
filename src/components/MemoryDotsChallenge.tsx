import { useEffect, useState } from 'react';
import type { Question } from '../quiz/types';

interface Props {
  question: Question;
  answered: boolean;
  practice?: boolean;
  onSelect: (index: number) => void;
}

type MemoryVisual = Extract<NonNullable<Question['visual']>, { kind: 'memory-dots' }>;

export function MemoryDotsChallenge({ question, answered, practice = false, onSelect }: Props) {
  const visual = question.visual;
  if (!visual || visual.kind !== 'memory-dots') return null;
  return <MemoryDotsGame visual={visual} answered={answered} practice={practice} onSelect={onSelect} />;
}

function MemoryDotsGame({
  visual,
  answered,
  practice,
  onSelect,
}: {
  visual: MemoryVisual;
  answered: boolean;
  practice: boolean;
  onSelect: (index: number) => void;
}) {
  const [phase, setPhase] = useState<'showing' | 'recall'>('showing');
  const [litStep, setLitStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [wrongDot, setWrongDot] = useState(-1);

  useEffect(() => {
    if (answered) return;
    // Reset state for replay (demo loop or manual retry)
    setPhase('showing');
    setLitStep(-1);
    setProgress(0);
    setWrongDot(-1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 800;
    visual.sequence.forEach((_, step) => {
      timers.push(setTimeout(() => setLitStep(step), t));
      t += visual.showMs;
      timers.push(setTimeout(() => setLitStep(-1), t));
      t += visual.gapMs;
    });
    timers.push(setTimeout(() => setPhase('recall'), t));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  useEffect(() => {
    if (answered) setLitStep(-1);
  }, [answered]);

  const litDot = litStep >= 0 ? visual.sequence[litStep] : -1;

  const tapDot = (index: number) => {
    if (answered || phase !== 'recall') return;
    if (index === visual.sequence[progress]) {
      const next = progress + 1;
      setProgress(next);
      if (next === visual.sequence.length) onSelect(0);
    } else {
      setWrongDot(index);
      onSelect(1);
    }
  };

  // Practice demo: once the show phase ends, the dots tap themselves in order
  // so the player sees exactly how the recall interaction works. One tap is
  // scheduled at a time so each tap uses the latest progress state.
  useEffect(() => {
    if (!practice || answered || phase !== 'recall') return;
    if (progress >= visual.sequence.length) return;
    const timer = setTimeout(() => tapDot(visual.sequence[progress]), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice, answered, phase, progress]);

  const status =
    phase === 'showing'
      ? 'Watch the sequence light up…'
      : `Now tap the dots in order — ${progress}/${visual.sequence.length}`;

  return (
    <div className="memory-dots">
      <div className="memory-status" role="status" aria-live="polite">
        {status}
      </div>
      <div className="memory-scene">
        {visual.dots.map((dot, index) => {
          const seqPos = visual.sequence.indexOf(index);
          const inSequence = seqPos >= 0;
          const tapped = inSequence && seqPos < progress;
          let className = 'memory-dot';
          let label = '';
          if (!answered) {
            if (index === litDot) className += ' memory-dot--lit';
            if (tapped) {
              className += ' memory-dot--hit';
              label = String(seqPos + 1);
            }
          } else if (inSequence) {
            if (tapped) className += ' memory-dot--hit';
            else className += ' memory-dot--missed';
            label = String(seqPos + 1);
          }
          if (index === wrongDot) className += ' memory-dot--wrong';

          return (
            <button
              key={index}
              type="button"
              className={className}
              style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
              onClick={() => tapDot(index)}
              disabled={answered || phase !== 'recall'}
              aria-label={
                answered && inSequence
                  ? `Dot ${index + 1}, ${label} in sequence`
                  : `Dot ${index + 1}`
              }
            >
              <span className="memory-dot__circle">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

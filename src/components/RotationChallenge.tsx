import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Question, ShapeSpec } from '../quiz/types';
import { ShapeGraphic } from './ShapeGraphic';

interface Props {
  question: Question;
  answered: boolean;
  practice?: boolean;
  onSelect: (index: number) => void;
}

export function RotationChallenge({ question, answered, practice = false, onSelect }: Props) {
  const visual = question.visual;
  if (!visual || visual.kind !== 'rotate') return null;
  return (
    <RotationDial
      key={question.id}
      question={question}
      answered={answered}
      practice={practice}
      onSelect={onSelect}
      visual={visual}
    />
  );
}

type DemoPhase = 'idle' | 'reset' | 'rotating' | 'done';

function RotationDial({
  question,
  answered,
  practice,
  onSelect,
  visual,
}: {
  question: Question;
  answered: boolean;
  practice: boolean;
  onSelect: (index: number) => void;
  visual: Extract<NonNullable<Question['visual']>, { kind: 'rotate' }>;
}) {
  const [angle, setAngle] = useState(visual.startAngle);
  // Demo phase is derived: when practice+unanswered, we're in the demo cycle.
  // idle = not in demo, reset = showing start position, rotating = animating, done = at target
  const [demoPhase, setDemoPhase] = useState<DemoPhase>(practice && !answered ? 'reset' : 'idle');
  const dragging = useRef(false);
  const dialRef = useRef<HTMLDivElement>(null);

  // ─── Practice demo: reset to start position when a new demo round begins ───
  // A "new round" = practice is active AND answered just went back to false.
  // Using a key={question.id} on RotationDial ensures fresh state per question;
  // this effect handles the retry (loop) case within the same question.
  useEffect(() => {
    if (!practice || answered) return;
    // Reset angle immediately, then transition to rotating phase after a pause
    // so the user sees the shape at 0° before it starts moving.
    const resetTimer = setTimeout(() => {
      setAngle(visual.startAngle);
      setDemoPhase('reset');
    }, 0);
    const rotateTimer = setTimeout(() => setDemoPhase('rotating'), 1000);
    return () => {
      clearTimeout(resetTimer);
      clearTimeout(rotateTimer);
    };
  }, [practice, answered, visual.startAngle]);

  // ─── Rotating phase: animate angle toward target ──────────────────────────
  useEffect(() => {
    if (demoPhase !== 'rotating') return;
    const interval = setInterval(() => {
      setAngle((prev) => {
        const diff = ((visual.targetAngle - prev + 540) % 360) - 180;
        if (Math.abs(diff) <= 3) return (prev + diff + 360) % 360;
        return (prev + Math.sign(diff) * 3 + 360) % 360;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [demoPhase, visual.targetAngle]);

  // ─── Target reached: snap to exact target, pause, then submit ─────────────
  useEffect(() => {
    if (demoPhase !== 'rotating') return;
    const diff = Math.abs(((angle - visual.targetAngle + 540) % 360) - 180);
    if (diff > 3) return;
    // Use a ref-backed timeout to avoid setState-in-effect lint
    const submitTimer = setTimeout(() => {
      setAngle(visual.targetAngle);
      setDemoPhase('done');
      onSelect(question.answerIndex);
    }, 600);
    return () => clearTimeout(submitTimer);
  }, [angle, demoPhase, visual.targetAngle, question.answerIndex, onSelect]);

  // Reset demoPhase to idle when answered (feedback showing) or not practice
  useEffect(() => {
    if (answered || !practice) {
      const t = setTimeout(() => setDemoPhase('idle'), 0);
      return () => clearTimeout(t);
    }
  }, [answered, practice]);

  // ─── Manual interaction (non-practice or after "Try it myself") ────────────
  const updateAngle = (clientX: number, clientY: number) => {
    const rect = dialRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const degrees = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
    setAngle(Math.round((degrees + 360) % 360));
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (answered || practice) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateAngle(event.clientX, event.clientY);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || answered || practice) return;
    updateAngle(event.clientX, event.clientY);
  };

  const finish = () => {
    dragging.current = false;
  };

  const submit = () => {
    const distance = Math.abs(((angle - visual.targetAngle + 540) % 360) - 180);
    onSelect(distance <= visual.tolerance ? question.answerIndex : question.answerIndex === 0 ? 1 : 0);
  };

  const adjust = (delta: number) => {
    if (!answered) setAngle((current) => (current + delta + 360) % 360);
  };

  const targetSpec: ShapeSpec = { ...visual.shape, rotation: visual.targetAngle, tone: 'outline' };
  const movingSpec: ShapeSpec = { ...visual.shape, rotation: angle, tone: 'green' };

  const demoLabel =
    demoPhase === 'reset' ? 'Starting position — watch it rotate…' :
    demoPhase === 'rotating' ? 'Rotating to match the outline…' :
    demoPhase === 'done' ? 'Aligned! Submitting…' :
    '';

  return (
    <div className="rotation-challenge">
      {practice && demoLabel && (
        <p className="rotation-demo-label">{demoLabel}</p>
      )}
      <div
        ref={dialRef}
        className="rotation-dial"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        role="slider"
        tabIndex={answered ? -1 : 0}
        aria-label="Rotate the shape"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={angle}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') adjust(-5);
          if (event.key === 'ArrowRight') adjust(5);
        }}
      >
        <div className="rotation-dial__target">
          <ShapeGraphic spec={targetSpec} />
        </div>
        <div className="rotation-dial__moving">
          <ShapeGraphic spec={movingSpec} />
        </div>
        <span className="rotation-dial__angle">{angle}°</span>
      </div>
      {!practice && (
        <div className="rotation-controls">
          <button
            type="button"
            onClick={() => adjust(-15)}
            disabled={answered}
            aria-label="Rotate left 15 degrees"
          >
            −15°
          </button>
          <button
            type="button"
            onClick={() => adjust(15)}
            disabled={answered}
            aria-label="Rotate right 15 degrees"
          >
            +15°
          </button>
          <button type="button" className="rotation-submit" onClick={submit} disabled={answered}>
            Check alignment
          </button>
        </div>
      )}
    </div>
  );
}

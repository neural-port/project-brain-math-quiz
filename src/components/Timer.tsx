interface Props {
  timeLeft: number;
  timeLimit: number;
}

export function Timer({ timeLeft, timeLimit }: Props) {
  const pct = (timeLeft / timeLimit) * 100;
  const danger = timeLeft <= 5;
  const warning = timeLeft <= 10 && !danger;

  return (
    <div className={`timer ${danger ? 'timer--danger' : warning ? 'timer--warning' : ''}`}>
      <div className="timer__bar" style={{ width: `${pct}%` }} />
      <span className="timer__text">{timeLeft}s</span>
    </div>
  );
}

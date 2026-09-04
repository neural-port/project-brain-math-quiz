interface Props {
  lives: number;
  maxLives: number;
}

export function Lives({ lives, maxLives }: Props) {
  const dots = Array.from({ length: maxLives }).map((_, i) => (
    <span key={i} className={i < lives ? 'life life--alive' : 'life life--lost'}>
      ●
    </span>
  ));
  return (
    <div className="lives" title={`${lives} of ${maxLives} lives remaining`}>
      <span style={{ marginRight: 4 }}>Lives:</span>
      {dots}
    </div>
  );
}

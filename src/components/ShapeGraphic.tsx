import type { ShapeSpec } from '../quiz/types';

interface Props {
  spec: ShapeSpec;
  className?: string;
  label?: string;
}

export function ShapeGraphic({ spec, className = '', label }: Props) {
  const rotation = spec.rotation ?? 0;
  const scale = spec.scale ?? 1;
  const scaleX = spec.mirrorX ? -scale : scale;
  const scaleY = spec.mirrorY ? -scale : scale;
  const transform = `translate(50 50) rotate(${rotation}) scale(${scaleX} ${scaleY}) translate(-50 -50)`;

  return (
    <svg
      className={`shape-graphic shape-graphic--${spec.tone ?? 'green'} ${className}`}
      viewBox="0 0 100 100"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g transform={transform}>{renderShape(spec.shape)}</g>
    </svg>
  );
}

function renderShape(shape: ShapeSpec['shape']) {
  switch (shape) {
    case 'circle':
      return <circle cx="50" cy="50" r="31" />;
    case 'triangle':
      return <polygon points="50,14 88,82 12,82" />;
    case 'square':
      return <rect x="18" y="18" width="64" height="64" rx="2" />;
    case 'rectangle':
      return <rect x="10" y="27" width="80" height="46" rx="2" />;
    case 'pentagon':
      return <polygon points="50,10 89,39 74,85 26,85 11,39" />;
    case 'hexagon':
      return <polygon points="26,12 74,12 94,50 74,88 26,88 6,50" />;
    case 'star':
      return <polygon points="50,7 61,36 93,37 68,57 77,89 50,71 23,89 32,57 7,37 39,36" />;
    case 'arrow':
      return <polygon points="8,37 59,37 59,17 94,50 59,83 59,63 8,63" />;
    case 'flag':
      return (
        <path d="M22 10h9v8h52l-13 20 13 20H31v32h-9V10zm9 17v22h35l-7-11 7-11H31z" fillRule="evenodd" />
      );
    case 'l-shape':
      return <path d="M18 12h25v52h40v24H18V12z" />;
    case 'scalene-triangle':
      // Scalene right triangle — no axis of symmetry, safe for mirror/symmetry questions
      return <polygon points="14,12 14,88 66,88" />;
  }
}

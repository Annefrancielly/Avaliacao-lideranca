import { formatScore } from "../utils/format";

interface TrendPoint {
  id: number;
  value: number;
  label: string;
}

interface ScoreTrendProps {
  points: TrendPoint[]; // do mais antigo para o mais recente
}

const WIDTH = 280;
const HEIGHT = 96;
const PADDING = { top: 10, right: 10, bottom: 10, left: 26 };

export function ScoreTrend({ points }: ScoreTrendProps) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const x = (index: number) =>
    PADDING.left +
    (points.length === 1
      ? plotWidth / 2
      : (index / (points.length - 1)) * plotWidth);
  const y = (value: number) => PADDING.top + ((4 - value) / 3) * plotHeight;

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`
    )
    .join(" ");
  const summary = points
    .map((p) => `${p.label}: ${formatScore(p.value)}`)
    .join("; ");

  return (
    <svg
      className="trend"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Evolução da nota final. ${summary}`}
    >
      {[1, 2, 3, 4].map((level) => (
        <g key={level}>
          <line
            className="trend__grid"
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={y(level)}
            y2={y(level)}
          />
          <text
            className="trend__axis"
            x={PADDING.left - 8}
            y={y(level)}
            dy="0.32em"
            textAnchor="end"
          >
            {level}
          </text>
        </g>
      ))}
      {points.length > 1 && <path className="trend__line" d={path} />}
      {points.map((p, i) => (
        <circle
          key={p.id}
          className="trend__point"
          cx={x(i)}
          cy={y(p.value)}
          r={i === points.length - 1 ? 4.5 : 3}
        >
          <title>{`${p.label}: ${formatScore(p.value)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

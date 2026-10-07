import { formatScore, scoreBand } from "../utils/format";

interface ScoreBadgeProps {
  value: number;
  size?: "md" | "lg";
}

export function ScoreBadge({ value, size = "md" }: ScoreBadgeProps) {
  return (
    <span
      className={`score score--${scoreBand(value)} score--${size}`}
      aria-label={`Nota ${formatScore(value)} de 4`}
    >
      {formatScore(value)}
      <small>/4</small>
    </span>
  );
}

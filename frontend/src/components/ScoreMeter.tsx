import { formatScore, scoreBand } from "../utils/format";

interface ScoreMeterProps {
  value: number;
  label?: string;
}

export function ScoreMeter({ value, label }: ScoreMeterProps) {
  const band = scoreBand(value);
  return (
    <span
      className={`meter meter--${band}`}
      role="img"
      aria-label={label ?? `Nota ${formatScore(value)} de 4`}
    >
      {[1, 2, 3, 4].map((step) => {
        const fill = Math.min(Math.max(value - (step - 1), 0), 1);
        return (
          <span key={step} className="meter__segment">
            <span style={{ width: `${fill * 100}%` }} />
          </span>
        );
      })}
    </span>
  );
}

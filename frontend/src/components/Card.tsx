import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
  label?: string;
}

export function Card({
  children,
  className,
  as: Tag = "section",
  label,
}: CardProps) {
  return (
    <Tag
      className={`card${className ? ` ${className}` : ""}`}
      aria-label={label}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export function CardHeader({
  title,
  description,
  actions,
  children,
}: CardHeaderProps) {
  return (
    <header className="card__header">
      <div className="card__heading">
        <div>
          <h2 className="card__title">{title}</h2>
          {description && <p className="card__description">{description}</p>}
        </div>
        {actions && <div className="card__actions">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface NoticeProps {
  tone?: "info" | "error" | "success" | "warning";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

const NOTICE_ICON: Record<NonNullable<NoticeProps["tone"]>, IconName> = {
  info: "info",
  error: "alert",
  success: "checkCircle",
  warning: "clock",
};

export function Notice({
  tone = "info",
  title,
  children,
  action,
}: NoticeProps) {
  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon name={NOTICE_ICON[tone]} size={20} className="notice__icon" />
      <div className="notice__content">
        <p className="notice__title">{title}</p>
        {children && <div className="notice__body">{children}</div>}
      </div>
      {action && <div className="notice__action">{action}</div>}
    </div>
  );
}

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  icon = "users",
  title,
  children,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <p className="empty__title">{title}</p>
      {children && <p className="empty__body">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}

// Esqueleto exibido enquanto os dados carregam: evita "pulos" de layout.
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="card skeleton-list"
      aria-busy="true"
      aria-label="Carregando"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton-row">
          <span className="skeleton skeleton--circle" />
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--line" />
        </div>
      ))}
    </div>
  );
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

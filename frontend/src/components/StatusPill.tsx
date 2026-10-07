import type { ReactNode } from "react";

interface StatusPillProps {
  tone: "done" | "pending" | "neutral";
  children: ReactNode;
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span className={`pill pill--${tone}`}>
      <span className="pill__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

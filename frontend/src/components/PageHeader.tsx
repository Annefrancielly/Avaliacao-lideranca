import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  breadcrumb?: Crumb[];
  leading?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  breadcrumb,
  leading,
  title,
  subtitle,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <div className="hero">
      <div className="container hero__inner">
        {breadcrumb && (
          <nav className="breadcrumb" aria-label="Navegação">
            <ol>
              {breadcrumb.map((crumb, index) => (
                <li key={crumb.label}>
                  {index > 0 && (
                    <Icon
                      name="chevronRight"
                      size={14}
                      className="breadcrumb__sep"
                    />
                  )}
                  {crumb.to ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span aria-current="page">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="hero__row">
          <div className="hero__identity">
            {leading}
            <div>
              <h1 className="hero__title">{title}</h1>
              {subtitle && <p className="hero__subtitle">{subtitle}</p>}
              {meta && <div className="hero__meta">{meta}</div>}
            </div>
          </div>
          {actions && <div className="hero__actions">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

// Etiqueta de informação usada dentro da faixa (cargo, ID, relação...)
export function MetaChip({ children }: { children: ReactNode }) {
  return <span className="meta-chip">{children}</span>;
}

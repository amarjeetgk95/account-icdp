import type { ReactNode } from 'react';

interface WorkspaceHeaderProps {
  eyebrow?: string;
  title: string;
  context?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * The common page frame for operational screens. It keeps the current scope,
 * primary action, and supporting controls in predictable places.
 */
export function WorkspaceHeader({
  eyebrow,
  title,
  context,
  actions,
  children,
  className = '',
}: WorkspaceHeaderProps) {
  return (
    <section className={`workspace-header ${className}`}>
      <div className="workspace-header-main">
        <div className="min-w-0">
          {eyebrow && <p className="workspace-header-eyebrow">{eyebrow}</p>}
          <h1 className="workspace-header-title">{title}</h1>
        </div>
        {(context || actions) && (
          <div className="workspace-header-actions">
            {context && <div className="workspace-header-context">{context}</div>}
            {actions && <div className="workspace-header-primary-action">{actions}</div>}
          </div>
        )}
      </div>
      {children && <div className="workspace-header-support">{children}</div>}
    </section>
  );
}

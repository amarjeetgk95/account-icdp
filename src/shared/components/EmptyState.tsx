import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  illustration?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action, illustration, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10' : 'py-16'} ${className}`}>
      {illustration ? (
        <div className="mb-5">{illustration}</div>
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <Icon size={compact ? 24 : 28} className="text-slate-400" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1.5 max-w-xs">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

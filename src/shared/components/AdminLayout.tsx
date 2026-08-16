import { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { invalidateAdminQueries } from '@/shared/utilities/adminQuery';
import { WorkspaceHeader } from './WorkspaceHeader';

interface PageHeaderAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'primary';
  title?: string;
}

interface CompactAdminLayoutProps {
  title: string;
  icon: LucideIcon;
  actions?: PageHeaderAction[];
  refreshAction?: () => void;
  children: ReactNode;
}

export function AdminLayout({ title, icon: Icon, actions, refreshAction, children }: CompactAdminLayoutProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    if (refreshAction) {
      refreshAction();
    } else {
      void invalidateAdminQueries(queryClient);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <WorkspaceHeader
        eyebrow="Admin console"
        title={title}
        context={<Icon size={14} aria-hidden="true" />}
        actions={<div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 group/refresh"
            title="Refresh admin data"
          >
            <RefreshCw
              size={14}
              className="transition-transform duration-500 group-hover/refresh:rotate-180"
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {actions?.map((action, idx) => {
            const IconComp = action.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                 className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                   action.variant === 'ghost'
                     ? 'text-slate-600 hover:bg-slate-100'
                     : action.variant === 'primary'
                     ? 'bg-slate-900 text-white hover:bg-slate-800'
                     : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                 }`}
                title={action.title || action.label}
              >
                <IconComp size={13} />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            );
          })}
        </div>}
      />

      <div>{children}</div>
    </div>
  );
}

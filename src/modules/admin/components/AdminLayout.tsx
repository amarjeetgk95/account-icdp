import { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function AdminLayout({ title, subtitle, icon: Icon, children }: AdminLayoutProps) {
  const queryClient = useQueryClient();

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="page-header items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-primary shrink-0 ring-1 ring-white/20 dark:ring-slate-800 transition-transform duration-200 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #0D9488 100%)' }}
          >
            <Icon size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="page-title text-2xl dark:text-white">{title}</h1>
            {subtitle && <p className="page-subtitle dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries();
          }}
          className="btn btn-outline btn-sm text-xs group/refresh dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Refresh data"
        >
          <RefreshCw
            size={14}
            className="transition-transform duration-500 group-hover/refresh:rotate-180"
          />
          Refresh
        </button>
      </div>

      <div>{children}</div>
    </div>
  );
}
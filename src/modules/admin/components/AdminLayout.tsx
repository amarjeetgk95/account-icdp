import { ReactNode } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { isModuleEnabled } from '@/core/feature-flags/store';
import { getSectionIcon } from '@/shared/icons';
import { useModules } from '@/modules';
import type { LucideIcon } from 'lucide-react';

export interface AdminTab {
  path: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

interface AdminLayoutProps {
  children?: ReactNode;
}

function useAdminTabs(): AdminTab[] {
  const modules = useModules();

  return modules
    .filter(
      (m) =>
        m.navGroup === 'admin' &&
        (!m.featureFlag || isModuleEnabled(m.featureFlag))
    )
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .flatMap((m) =>
      m.children && m.children.length > 0
        ? m.children.map((child) => ({
            path: child.path,
            title: child.label,
            subtitle: child.subtitle ?? m.name,
            icon: getSectionIcon(child.icon ?? ''),
          }))
        : m.routes[0]
          ? [{ path: m.routes[0].path, title: m.name, subtitle: '', icon: getSectionIcon(m.icon ?? '') }]
          : []
    );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const tabs = useAdminTabs();

  const currentTab = tabs.find((t) => t.path === location.pathname) || tabs[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {currentTab && (
            <>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-primary shrink-0 ring-1 ring-white/20 dark:ring-slate-800 transition-transform duration-200 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #0D9488 100%)' }}
              >
                <currentTab.icon size={24} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h1 className="page-title text-2xl dark:text-white">{currentTab.title}</h1>
                <p className="page-subtitle dark:text-slate-400">{currentTab.subtitle}</p>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => {
            useAuthStore.getState().initialize();
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

      <div>{children || <Outlet />}</div>
    </div>
  );
}

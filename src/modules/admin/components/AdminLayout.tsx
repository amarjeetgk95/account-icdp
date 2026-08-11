import { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
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
  const navigate = useNavigate();
  const tabs = useAdminTabs();

  const currentTab = tabs.find((t) => t.path === location.pathname) || tabs[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          {currentTab && (
            <>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <currentTab.icon size={20} />
              </div>
              <div>
                <h1 className="page-title">Admin Console</h1>
                <p className="page-subtitle">{currentTab.subtitle}</p>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => {
            useAuthStore.getState().initialize();
          }}
          className="btn btn-ghost btn-sm text-xs"
          title="Refresh data"
        >
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </button>
      </div>

      {tabs.length > 0 && (
        <div className="step-nav">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(tab.path);
                }}
                className={`step-link ${isActive ? 'active' : ''}`}
              >
                <span className="step-num">
                  <TabIcon size={12} />
                </span>
                {tab.title}
              </NavLink>
            );
          })}
        </div>
      )}

      <div>{children || <Outlet />}</div>
    </div>
  );
}

import { NavLink, Link, useLocation } from 'react-router-dom';
import { usePermissions } from '@/core/permissions/hooks';
import { useUIStore } from '@/core/stores/ui-store';
import type { ModuleDefinition } from '@/shared/types/module';
import { ModuleIcon, SectionIcon } from '@/shared/icons';
import { isModuleEnabled } from '@/core/feature-flags/store';
import { X } from 'lucide-react';

interface SidebarProps {
  modules: ModuleDefinition[];
}

export function Sidebar({ modules }: SidebarProps) {
  const { isAdmin, isLoading } = usePermissions();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  if (isLoading) {
    return null;
  }

  const visibleModules = modules.filter((m) => {
    if (m.sidebar === false) return false;
    if (!m.featureFlag || !isModuleEnabled(m.featureFlag)) return false;
    if (m.permissions?.includes('admin') && !isAdmin) return false;
    if (isAdmin) return m.navGroup === 'admin';
    return true;
  });

  const overviewModules = visibleModules.filter((m) => m.navGroup === 'overview' || m.navGroup === 'main');
  const billsModules = visibleModules.filter((m) => m.navGroup === 'bills');
  const tdsModules = visibleModules.filter((m) => m.navGroup === 'tds');
  const employeeItModules = visibleModules.filter((m) => m.navGroup === 'it-employee');
  const systemModules = visibleModules.filter((m) => m.navGroup === 'system');
  const adminModules = visibleModules.filter((m) => m.navGroup === 'admin');

  const closeMobile = () => setMobileMenuOpen(false);

  const renderGroup = (label: string, items: ModuleDefinition[]) => (
    <div className="sidebar-group">
      {!sidebarCollapsed && <p className="sidebar-group-label">{label}</p>}
      {items.map((module) => (
        <NavItem key={module.id} module={module} collapsed={sidebarCollapsed} onNavClick={closeMobile} />
      ))}
    </div>
  );

  const renderAdminSidebar = () => {
    const adminConsoleItems: { path: string; label: string; icon?: string }[] = [];

    for (const module of adminModules) {
      if (module.children && module.children.length > 0) {
        for (const child of module.children) {
          adminConsoleItems.push({
            path: child.path,
            label: child.label,
            icon: child.icon,
          });
        }
      }
    }

    return (
      <div className="sidebar-group">
        {!sidebarCollapsed && <p className="sidebar-group-label">Admin Console</p>}
        {adminConsoleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={closeMobile}
            title={sidebarCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              `sidebar-link ${sidebarCollapsed ? 'justify-center px-0' : 'sidebar-child-link'} ${
                isActive ? 'sidebar-link-active' : ''
              }`
            }
          >
            <span className="sidebar-link-icon">
              <SectionIcon id={item.icon || ''} size={18} />
            </span>
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${
          mobileMenuOpen ? 'sidebar-mobile-open' : ''
        }`}
      >
        <div className="sidebar-logo flex items-center justify-between">
          <Link to="/" onClick={closeMobile} className="flex items-center gap-3" title="Go to Home">
            <span className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/80 dark:ring-slate-700/80 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.svg" alt="Account Branch Logo" className="sidebar-logo-icon" />
            </span>
            {!sidebarCollapsed && (
              <span className="sidebar-logo-text">Account Branch</span>
            )}
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={closeMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {isAdmin ? (
            renderAdminSidebar()
          ) : (
            <>
              <div className="sidebar-groups">
                {overviewModules.length > 0 && renderGroup('Overview', overviewModules)}
                {billsModules.length > 0 && renderGroup('1. Bill Creation', billsModules)}
                {tdsModules.length > 0 && renderGroup('2. TDS', tdsModules)}
                {employeeItModules.length > 0 && renderGroup('3. Employee IT', employeeItModules)}
              </div>
              {systemModules.length > 0 && (
                <div className={`sidebar-group sidebar-system-group ${sidebarCollapsed ? 'sidebar-system-collapsed' : ''}`}>
                  {!sidebarCollapsed && <p className="sidebar-group-label">System</p>}
                  {systemModules.map((module) => (
                    <NavItem key={module.id} module={module} collapsed={sidebarCollapsed} onNavClick={closeMobile} />
                  ))}
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

function NavItem({
  module,
  collapsed,
  onNavClick,
}: {
  module: ModuleDefinition;
  collapsed: boolean;
  onNavClick: () => void;
}) {
  const location = useLocation();
  const route = module.routes[0];
  if (!route) return null;

  const children = module.children;

  if (children && children.length > 0) {
    return (
      <div className="space-y-1 my-1">
        {!collapsed && (
          <div className="px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <ModuleIcon id={module.icon || module.id} size={13} />
            <span>{module.name}</span>
          </div>
        )}
        {children.map((child) => {
          const isChildActive = child.path.includes('?')
            ? location.pathname + location.search === child.path ||
              (location.pathname === child.path.split('?')[0] && !location.search && child.path.includes('tab=matrix'))
            : location.pathname === child.path;

          return (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={onNavClick}
              title={collapsed ? `${module.name} - ${child.label}` : undefined}
              className={`sidebar-link ${collapsed ? 'justify-center px-0' : 'sidebar-child-link'} ${
                isChildActive ? 'sidebar-link-active' : ''
              }`}
            >
              <span className="sidebar-link-icon">
                <SectionIcon id={child.icon ?? ''} size={17} />
              </span>
              {!collapsed && <span>{child.label}</span>}
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <NavLink
      to={route.path}
      onClick={onNavClick}
      title={collapsed ? module.name : undefined}
      className={({ isActive }) =>
        `sidebar-link ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'sidebar-link-active' : ''}`
      }
    >
      <span className="sidebar-link-icon">
        <ModuleIcon id={module.icon || module.id} size={18} />
      </span>
      {!collapsed && <span>{module.name}</span>}
    </NavLink>
  );
}

import { NavLink } from 'react-router-dom';
import { usePermissions } from '@/core/permissions/hooks';
import type { ModuleDefinition } from '@/shared/types/module';
import { ModuleIcon, SectionIcon } from '@/shared/icons';
import { isModuleEnabled } from '@/core/feature-flags/store';

interface SidebarProps {
  modules: ModuleDefinition[];
}

export function Sidebar({ modules }: SidebarProps) {
  const { isAdmin, isLoading } = usePermissions();

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

  const mainModules = visibleModules.filter((m) => m.navGroup === 'main');
  const reportModules = visibleModules.filter((m) => m.navGroup === 'reports');
  const adminModules = visibleModules.filter((m) => m.navGroup === 'admin');

  const renderOfficeSidebar = () => (
    <>
      {mainModules.length > 0 && (
        <div className="sidebar-group">
          <p className="sidebar-group-label">Workspace</p>
          {mainModules.map((module) => (
            <NavItem key={module.id} module={module} />
          ))}
        </div>
      )}
      {reportModules.length > 0 && (
        <div className="sidebar-group">
          <p className="sidebar-group-label">Reports</p>
          {reportModules.map((module) => (
            <NavItem key={module.id} module={module} />
          ))}
        </div>
      )}
    </>
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
        <p className="sidebar-group-label">Admin Console</p>
        {adminConsoleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link sidebar-child-link ${isActive ? 'sidebar-link-active sidebar-child-link-active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <SectionIcon id={item.icon || ''} size={18} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">IC</div>
        <div>
          <div className="text-sm font-bold text-slate-800 leading-tight">ICDP</div>
          <div className="text-[10px] text-slate-400 font-medium">Tax System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {isAdmin ? renderAdminSidebar() : renderOfficeSidebar()}
      </nav>
    </aside>
  );
}

function NavItem({ module }: { module: ModuleDefinition }) {
  const route = module.routes[0];
  if (!route) return null;

  const children = module.children;

  if (children && children.length > 0) {
    return (
      <div>
        {children.map((child) => (
          <NavLink
            key={child.path}
            to={child.path}
            className={({ isActive }) =>
              `sidebar-link sidebar-child-link ${isActive ? 'sidebar-link-active sidebar-child-link-active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <SectionIcon id={child.icon ?? ''} size={18} />
            </span>
            <span>{child.label}</span>
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <NavLink
      to={route.path}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
      }
    >
      <span className="sidebar-link-icon">
        <ModuleIcon id={module.icon || module.id} size={18} />
      </span>
      <span>{module.name}</span>
    </NavLink>
  );
}

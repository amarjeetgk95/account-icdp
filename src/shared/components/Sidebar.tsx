import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/store';
import { usePermissions } from '@/core/permissions/hooks';
import type { ModuleDefinition } from '@/shared/types/module';
import { getModuleIcon } from '@/shared/icons';
import { isModuleEnabled } from '@/core/feature-flags/store';

interface SidebarProps {
  modules: ModuleDefinition[];
}

export function Sidebar({ modules }: SidebarProps) {
  const { user, signOut } = useAuthStore();
  const { isAdmin } = usePermissions();

  const visibleModules = modules.filter((m) => {
    if (m.sidebar === false) return false;
    if (m.featureFlag && !isModuleEnabled(m.featureFlag)) return false;
    if (isAdmin) return m.navGroup === 'admin';
    if (m.permissions?.includes('admin')) return false;
    return true;
  });

  const mainModules = visibleModules.filter((m) => m.navGroup === 'main');
  const reportModules = visibleModules.filter((m) => m.navGroup === 'reports');
  const adminModules = visibleModules.filter((m) => m.navGroup === 'admin');

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
        {isAdmin ? (
          <div className="sidebar-group">
            <p className="sidebar-group-label">Admin Console</p>
            {adminModules.map((module) => (
              <NavItem key={module.id} module={module} />
            ))}
          </div>
        ) : (
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
        )}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.email?.[0]?.toUpperCase() || '?'}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-email">{user?.email}</div>
          <button onClick={signOut} className="sidebar-user-role hover:text-red-600 transition-colors text-left">
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

const TONE_MAP: Record<string, 'blue' | 'green'> = {
  dashboard: 'blue',
  payroll: 'blue',
  parties: 'green',
  reports: 'green',
  settings: 'blue',
  admin: 'blue',
};

function NavItem({ module }: { module: ModuleDefinition }) {
  const route = module.routes[0];
  if (!route) return null;

  const Icon = getModuleIcon(module.id);
  const tone = TONE_MAP[module.id] || 'blue';

  return (
    <NavLink
      to={route.path}
      data-tone={tone}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
      }
    >
      <Icon className="sidebar-link-icon" size={18} />
      <span>{module.name}</span>
    </NavLink>
  );
}

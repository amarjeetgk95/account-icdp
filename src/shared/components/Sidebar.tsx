import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/store';
import type { ModuleDefinition } from '@/shared/types/module';

interface SidebarProps {
  modules: ModuleDefinition[];
}

export function Sidebar({ modules }: SidebarProps) {
  const { user, signOut } = useAuthStore();

  const mainModules = modules.filter((m) => m.navGroup === 'main' && m.sidebar !== false);
  const adminModules = modules.filter((m) => m.navGroup === 'admin' && m.sidebar !== false);
  const reportModules = modules.filter((m) => m.navGroup === 'reports' && m.sidebar !== false);

  return (
    <aside className="w-64 bg-slate-800 text-white flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold">ICDP Tax System</h1>
        <p className="text-xs text-slate-400 mt-1">Surat Office</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {mainModules.length > 0 && (
          <div className="mb-4">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Main
            </p>
            {mainModules.map((module) => (
              <NavItem key={module.id} module={module} />
            ))}
          </div>
        )}

        {adminModules.length > 0 && (
          <div className="mb-4">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Administration
            </p>
            {adminModules.map((module) => (
              <NavItem key={module.id} module={module} />
            ))}
          </div>
        )}

        {reportModules.length > 0 && (
          <div className="mb-4">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Reports
            </p>
            {reportModules.map((module) => (
              <NavItem key={module.id} module={module} />
            ))}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 truncate mb-2">
          {user?.email}
        </p>
        <button
          onClick={signOut}
          className="w-full text-left text-sm text-slate-300 hover:text-white py-1"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function NavItem({ module }: { module: ModuleDefinition }) {
  const route = module.routes[0];
  if (!route) return null;

  return (
    <NavLink
      to={route.path}
      className={({ isActive }) =>
        `flex items-center px-4 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-slate-700 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`
      }
    >
      <span className="mr-3">{module.icon}</span>
      <span>{module.name}</span>
    </NavLink>
  );
}

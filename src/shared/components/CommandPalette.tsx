import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isModuleEnabled } from '@/core/feature-flags/store';
import { usePermissions } from '@/core/permissions/hooks';
import { useModules } from '@/modules';
import { useEmployees } from '@/modules/payroll/hooks/useEmployees';
import { Search, Command, X, User } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const modules = useModules();
  const { role, isLoading: isPermissionsLoading } = usePermissions();
  const { employees } = useEmployees();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', down);
      return () => window.removeEventListener('keydown', down);
    }
  }, [isOpen, onClose]);

  const filteredModules = isPermissionsLoading
    ? []
    : modules.filter(
        (mod) =>
          (!mod.featureFlag || isModuleEnabled(mod.featureFlag)) &&
          (!mod.permissions ||
            mod.permissions.length === 0 ||
            (role !== null && mod.permissions.includes(role))),
      );

  const flattenedRoutes = filteredModules.flatMap((mod) =>
    mod.routes.map((route) => ({
      label: `${mod.name} → ${route.path === '/' ? 'Main' : route.path}`,
      path: route.path,
      moduleName: mod.name,
      moduleId: mod.id,
    })),
  );

  const q = query.trim().toLowerCase();

  const pageResults = q
    ? flattenedRoutes.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.moduleName.toLowerCase().includes(q),
      )
    : flattenedRoutes.slice(0, 12);

  const employeeResults = q
    ? employees
        .filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            (e.hprn_no || '').toLowerCase().includes(q) ||
            e.pan.toLowerCase().includes(q),
        )
        .slice(0, 6)
    : [];

  const handleNavigate = (path: string) => {
    navigate(path);
    setQuery('');
    onClose();
  };

  const handleNavigateEmployee = (employee: (typeof employees)[number]) => {
    const params = employee.hprn_no ? `?tab=employees&hrpn=${encodeURIComponent(employee.hprn_no)}` : '?tab=employees';
    navigate(`/payroll${params}`);
    setQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xl flex items-start justify-center pt-20 px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden backdrop-blur-2xl">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search size={18} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, employees, or type quick actions... (Esc to close)"
            className="flex-1 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-transparent font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {pageResults.length === 0 && employeeResults.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              No matching pages or employees found
            </div>
          ) : (
            <>
              {employeeResults.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30">
                    Employees
                  </div>
                  {employeeResults.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => handleNavigateEmployee(employee)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <User size={14} />
                        </div>
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                          {employee.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {employee.hprn_no && (
                          <span className="text-slate-400 dark:text-slate-500 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {employee.hprn_no}
                          </span>
                        )}
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {employee.pan}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {pageResults.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                    Navigation &amp; Modules
                  </div>
                  {pageResults.map((route, idx) => (
                    <button
                      key={`${route.moduleId}-${route.path}`}
                      onClick={() => handleNavigate(route.path)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700">
                          {idx + 1}
                        </kbd>
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {route.moduleName}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {route.path === '/' ? 'Main' : route.path}
                        </span>
                      </div>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Jump to page →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Command size={12} className="text-indigo-500" />
            <span>Use search to quickly filter pages &amp; employee records</span>
          </div>
          <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
            Esc to close
          </span>
        </div>
      </div>
    </div>
  );
}

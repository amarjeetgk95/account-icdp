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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search size={20} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and employees... (Esc to close)"
            className="flex-1 outline-none text-sm text-slate-700 placeholder-slate-400"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {pageResults.length === 0 && employeeResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">No results found</div>
          ) : (
            <>
              {employeeResults.length > 0 && (
                <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Employees
                </div>
              )}
              {employeeResults.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => handleNavigateEmployee(employee)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors group"
                >
                  <User size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-slate-700 truncate">{employee.name}</span>
                    <span className="text-slate-400 font-mono text-xs shrink-0">{employee.hprn_no || '-'}</span>
                    <span className="text-slate-400 font-mono text-xs shrink-0">{employee.pan}</span>
                  </div>
                </button>
              ))}
              {pageResults.length > 0 && (
                <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Pages
                </div>
              )}
              {pageResults.map((route, idx) => (
                <button
                  key={`${route.moduleId}-${route.path}`}
                  onClick={() => handleNavigate(route.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors group"
                >
                  <Search size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 rounded">
                      {idx + 1}
                    </kbd>
                    <span className="font-medium text-slate-700">{route.moduleName}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-500">{route.path === '/' ? 'Main' : route.path}</span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center gap-1">
          <Command size={10} />
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}

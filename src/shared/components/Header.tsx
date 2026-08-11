import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { financialYearRepository } from '@/modules/settings/repositories/financialYear.repository';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { useState, useRef, useEffect } from 'react';
import { 
  CalendarDays, 
  LogOut, 
  Search, 
  Shield, 
  UserCheck, 
  Sun, 
  Moon, 
  Menu, 
  Building2,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from './Toast';

export function Header() {
  const { user, signOut } = useAuthStore();
  const { details } = useOfficeDetails();
  const activeFinancialYear = useUIStore((s) => s.activeFinancialYear);
  const setActiveFinancialYear = useUIStore((s) => s.setActiveFinancialYear);
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingFY, setPendingFY] = useState<number | null>(null);
  const [switchingFY, setSwitchingFY] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    financialYearRepository
      .getCurrent()
      .then((year) => {
        if (cancelled) return;
        if (Number.isInteger(year) && year !== useUIStore.getState().activeFinancialYear) {
          setActiveFinancialYear(year);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setActiveFinancialYear]);

  const handleFYChange = async (year: number) => {
    const previous = useUIStore.getState().activeFinancialYear;
    setActiveFinancialYear(year);
    try {
      await financialYearRepository.set(year);
      toast.success(`Financial year changed to FY ${year}-${(year + 1) % 100}`);
    } catch (error) {
      setActiveFinancialYear(previous);
      toast.error(error instanceof Error ? error.message : 'Failed to change financial year');
    }
  };

  const handleFYSelect = (year: number) => {
    if (year === activeFinancialYear) return;
    setPendingFY(year);
  };

  const confirmFYChange = async () => {
    if (pendingFY === null) return;
    setSwitchingFY(true);
    await handleFYChange(pendingFY);
    setSwitchingFY(false);
    setPendingFY(null);
  };

  const fyLabel = (y: number) => `FY ${y}-${String(y + 1).slice(-2)}`;

  const nowYear = new Date().getFullYear();
  const fyOptions = [nowYear, nowYear + 1];
  if (!fyOptions.includes(activeFinancialYear)) {
    fyOptions.push(activeFinancialYear);
    fyOptions.sort((a, b) => a - b);
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const initials = user?.email
    ? user.email
        .split('@')[0]
        .split(/[._-]/)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header className="app-header">
      {/* Mobile drawer toggle */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden justify-self-start p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        title="Toggle Navigation Menu"
      >
        <Menu size={19} />
      </button>

      {/* Center Office Identity Block */}
      <div className="hidden lg:flex flex-col items-center justify-center text-center w-full px-2">
        <div className="flex items-center justify-center gap-1.5 text-[18px] sm:text-[20px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
          <Building2 size={14} className="shrink-0 text-indigo-500 dark:text-indigo-400" />
          <span className="text-balance text-center leading-snug">{details?.officeName || 'Deputy Director of Animal Husbandry'}</span>
        </div>
        <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight text-balance text-center">
          {details?.subtitle || 'Intensive Cattle Development Programme-Surat'}
        </p>
      </div>

      <div className="app-header-actions justify-self-end">
        <button
          className="flex items-center gap-2 px-3 py-1.5 min-w-44 lg:min-w-56 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm group"
          title="Search pages and employees (Ctrl+K)"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        >
          <Search size={13} className="group-hover:text-indigo-500 transition-colors" />
          <span className="flex-1 text-left hidden sm:inline truncate">Search pages, employees…</span>
          <span className="flex-1 text-left sm:hidden">Search…</span>
          <kbd className="hidden sm:inline-flex font-mono text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-slate-400 dark:text-slate-300">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-all shadow-sm"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={15} className="text-amber-400 animate-spin-slow" /> : <Moon size={15} className="text-slate-700" />}
        </button>

        {activeFinancialYear && (
          <div className="relative inline-flex items-center">
            <CalendarDays size={13} className="pointer-events-none absolute left-3 text-emerald-600 dark:text-emerald-400" />
            <select
              value={activeFinancialYear}
              onChange={(e) => handleFYSelect(Number(e.target.value))}
              className="fy-badge cursor-pointer pl-8 pr-7 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl appearance-none hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm"
              title="Select active financial year (applies across all modules)"
            >
              {fyOptions.map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                  FY {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {user?.role === 'admin' && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80">
            <Shield size={11} />
            Admin
          </span>
        )}
        {user?.role === 'office' && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/80">
            <UserCheck size={11} />
            Office
          </span>
        )}

        <div className="relative" ref={menuRef}>
          <button 
            className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md hover:opacity-90 hover:scale-105 transition-all ring-2 ring-indigo-500/20" 
            onClick={() => setMenuOpen(!menuOpen)} 
            title={user?.email || ''}
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-60 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Signed in as</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                    {user?.role || 'User'}
                  </span>
                </div>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl font-semibold transition-colors flex items-center gap-2.5"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingFY !== null}
        title="Switch Financial Year"
        confirmLabel="Switch Year"
        busy={switchingFY}
        onConfirm={confirmFYChange}
        onCancel={() => setPendingFY(null)}
        message={
          <>
            Are you sure you want to switch the active financial year from{' '}
            <b>{fyLabel(activeFinancialYear)}</b> to <b>{pendingFY != null ? fyLabel(pendingFY) : ''}</b>?
            <br />
            <span className="text-slate-500">This applies across all modules (payroll, reports, and parties).</span>
          </>
        }
      />
    </header>
  );
}


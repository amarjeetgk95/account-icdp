import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { financialYearRepository } from '@/modules/settings/repositories/financialYear.repository';
import { useState, useRef, useEffect } from 'react';
import { CalendarDays, LogOut, Search, Shield, UserCheck, Sun, Moon } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from './Toast';

export function Header() {
  const { user, signOut } = useAuthStore();
  const activeFinancialYear = useUIStore((s) => s.activeFinancialYear);
  const setActiveFinancialYear = useUIStore((s) => s.setActiveFinancialYear);
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
  const fyOptions = [nowYear - 4, nowYear - 3, nowYear - 2, nowYear - 1, nowYear, nowYear + 1];
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
      <div className="app-header-brand">
        <div className="app-header-logo">IC</div>
        <div>
          <div className="app-header-title">ICDP Tax System</div>
          <div className="app-header-subtitle">Intensive Cattle Development Programme</div>
        </div>
      </div>

      <div className="app-header-actions">
        <button
          className="flex items-center gap-2 px-3 py-1.5 min-w-56 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm"
          title="Search pages and employees (Ctrl+K)"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        >
          <Search size={13} />
          <span className="flex-1 text-left">Search pages, employees…</span>
          <kbd className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5">Ctrl</kbd>
          <kbd className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5">K</kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-700" />}
        </button>

        {activeFinancialYear && (
          <div className="relative inline-flex items-center">
            <CalendarDays size={13} className="pointer-events-none absolute left-3 text-green-600" />
            <select
              value={activeFinancialYear}
              onChange={(e) => handleFYSelect(Number(e.target.value))}
              className="fy-badge cursor-pointer pl-8 pr-8 appearance-none"
              title="Select active financial year (applies across all modules)"
            >
              {fyOptions.map((y) => (
                <option key={y} value={y}>
                  FY {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {user?.role === 'admin' && (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[50px] text-xs font-bold border bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800">
            <Shield size={11} />
            Admin
          </span>
        )}
        {user?.role === 'office' && (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[50px] text-xs font-bold border bg-green-50 dark:bg-emerald-950/50 text-green-700 dark:text-emerald-300 border-green-300 dark:border-emerald-800">
            <UserCheck size={11} />
            Office User
          </span>
        )}

        <div className="relative" ref={menuRef}>
          <button className="user-avatar" onClick={() => setMenuOpen(!menuOpen)} title={user?.email || ''}>
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors flex items-center gap-2.5"
              >
                <LogOut size={15} />
                Sign Out
              </button>
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


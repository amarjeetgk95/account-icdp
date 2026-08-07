import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { useState, useRef, useEffect } from 'react';
import { CalendarDays, LogOut, Search } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAuthStore();
  const activeFinancialYear = useUIStore((s) => s.activeFinancialYear);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors hidden sm:flex items-center gap-1"
          title="Search (Ctrl+K)"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        >
          <Search size={12} />
          <kbd className="font-mono text-xs">Ctrl</kbd> + <kbd className="font-mono text-xs">K</kbd>
        </button>

        {activeFinancialYear && (
          <span className="fy-badge">
            <CalendarDays size={13} />
            FY {activeFinancialYear}-{String(activeFinancialYear + 1).slice(-2)}
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
    </header>
  );
}

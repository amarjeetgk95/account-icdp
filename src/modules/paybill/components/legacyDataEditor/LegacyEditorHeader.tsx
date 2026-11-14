import { Search, Save, Check, X, Calendar } from 'lucide-react';
import { MONTH_ORDER } from './constants';
import { formatInr } from './utils';

export interface LegacyEditorHeaderProps {
  /** Employee identity, pre-resolved by the editor (estEmployee match falls back to parsed rows). */
  employeeNameProp: string;
  designation?: string | null;
  payScale?: string | null;
  hrpnProp: string;
  fyLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  monthFilter: string[];
  onMonthFilterChange: (months: string[]) => void;
  dirtyRowsSize: number;
  saving: boolean;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  onSaveAll: () => Promise<boolean> | void;
  onSaveAndClose: () => Promise<void> | void;
  onClose: () => void;
}

/**
 * Top navigation bar + compact financial summary of the Legacy Paybill Editor.
 * Presentational: all state lives in the parent editor.
 */
export function LegacyEditorHeader({
  employeeNameProp,
  designation,
  payScale,
  hrpnProp,
  fyLabel,
  search,
  onSearchChange,
  monthFilter,
  onMonthFilterChange,
  dirtyRowsSize,
  saving,
  totalGross,
  totalDeductions,
  totalNet,
  onSaveAll,
  onSaveAndClose,
  onClose,
}: LegacyEditorHeaderProps) {
  return (
    <>
        <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs z-30">
          {/* Left: Employee Info & Identification */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              {employeeNameProp ? employeeNameProp.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {employeeNameProp || 'Legacy Paybill Editor'}
                </h1>
                {designation && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                    · {designation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="num font-semibold text-slate-700 dark:text-slate-300">
                  HRPN: {hrpnProp || '—'}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> FY {fyLabel}
                </span>
                {payScale && (
                  <>
                    <span>·</span>
                    <span className="px-1.5 py-0.2 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {payScale}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center: Search & Month filter controls */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative w-44">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filter parameter..."
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
            <select
              value={monthFilter.length === 0 ? '' : monthFilter[0]}
              onChange={(e) => onMonthFilterChange(e.target.value ? [e.target.value] : [])}
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="">All 12 Months</option>
              {MONTH_ORDER.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {dirtyRowsSize > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {dirtyRowsSize} modified
              </span>
            )}

            <button
              type="button"
              onClick={() => void onSaveAll()}
              disabled={saving || dirtyRowsSize === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              title="Save changes (Ctrl + S)"
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              onClick={() => void onSaveAndClose()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
              title="Save changes and close window"
            >
              <Check size={13} />
              <span>Save & Close</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Close Window (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* 2. Compact Financial Summary Bar */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross:</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatInr(totalGross)}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Deductions:</span>
              <span className="font-extrabold text-rose-700 dark:text-rose-400">{formatInr(totalDeductions)}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Net Take-Home:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{formatInr(totalNet)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
            <span>Excel Paste: <kbd className="font-mono px-1 py-0.2 bg-slate-200 dark:bg-slate-800 rounded text-xs">Ctrl+V</kbd></span>
          </div>
        </div>
    </>
  );
}

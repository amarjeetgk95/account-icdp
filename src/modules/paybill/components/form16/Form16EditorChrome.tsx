import { AlertTriangle, Calculator, CheckCircle2, Landmark, User } from 'lucide-react';
import { form16Inr as inr, type Form16EditorTab } from './Form16EditorShared';

/**
 * Shared chrome for the two Form-16 editors (`Form16EditorPage` + `Form16EditorModal`).
 * Standardized on the page's roomier density where the two hosts differed.
 */

interface Form16TdsBannerProps {
  totalQuarterTds: number;
  partBTds: number;
  netTaxPayable?: number | null;
}

/** Reconciliation & Status Meter banner (standardized on the page density). */
export function Form16TdsBanner({ totalQuarterTds, partBTds, netTaxPayable }: Form16TdsBannerProps) {
  const isTdsReconciled = Math.abs((Number(totalQuarterTds) || 0) - (Number(partBTds) || 0)) <= 1;

  return (
    <div className="flex items-center justify-between px-5 py-1.5 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0">
      <div className="flex items-center gap-2">
        {isTdsReconciled ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={13} /> Part A TDS reconciles with Part B ({inr(partBTds)})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={13} /> TDS Difference: Part A ({inr(totalQuarterTds)}) vs Part B ({inr(partBTds)})
          </span>
        )}
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">New Tax Regime u/s 115BAC</span> · Net Payable:{' '}
        <strong className="num text-indigo-600 dark:text-indigo-400 font-bold text-xs">
          {inr(netTaxPayable || 0)}
        </strong>
      </div>
    </div>
  );
}

interface Form16TabNavProps {
  activeTab: Form16EditorTab;
  onChange: (tab: Form16EditorTab) => void;
  totalTaxPayable?: number | null;
}

/** 3-tab nav (Part B / Part A / Details), standardized on the page density. */
export function Form16TabNav({ activeTab, onChange, totalTaxPayable }: Form16TabNavProps) {
  return (
    <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => onChange('partB')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'partB'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <Calculator size={14} />
          <span>Part B (Salary)</span>
          <span className="hidden sm:inline-block text-xs px-1.5 py-0.2 rounded-full num bg-indigo-500/30 text-white font-medium">
            {inr(totalTaxPayable || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange('partA')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'partA'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <Landmark size={14} />
          <span>Part A (Quarters)</span>
          <span className="hidden sm:inline-block text-xs px-1.5 py-0.2 rounded-full font-medium bg-blue-500/20 text-blue-700 dark:text-blue-200">
            4/4 Qtrs
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange('details')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'details'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <User size={14} />
          <span>Details & Sign</span>
        </button>
      </div>
    </div>
  );
}

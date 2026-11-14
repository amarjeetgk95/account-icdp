import { useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useUIStore } from '@/core/stores/ui-store';
import { getAvailableFinancialYears, formatFinancialYear } from '@/shared/utilities/date';

export function FinancialYearSettingsCard() {
  const activeFinancialYear = useUIStore((s) => s.activeFinancialYear);
  const setActiveFinancialYear = useUIStore((s) => s.setActiveFinancialYear);

  const availableYears = getAvailableFinancialYears(activeFinancialYear);
  const [selectedYear, setSelectedYear] = useState<number>(activeFinancialYear);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isCurrentActive = selectedYear === activeFinancialYear;

  const handleApplyYear = () => {
    setActiveFinancialYear(selectedYear);
    setStatusMessage(`Active financial year updated to ${formatFinancialYear(selectedYear)}. All registers and voucher views are now scoped to this period.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="card">
      <div className="card-body space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-xs font-heading font-semibold text-slate-800 dark:text-slate-100">
                Active Financial Year &amp; Accounting Scope
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Governs the working financial year reflected across the top navigation, paybills, DC bills, TDS challans, and reports.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-2xs">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Active: {formatFinancialYear(activeFinancialYear)}</span>
          </div>
        </div>

        {/* Informative callout */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-200 block">
              Accounting Governance Rule
            </span>
            <span>
              To prevent accidental cross-year modifications during daily operations, the financial year is locked in the top navigation and can only be switched here by an authorized officer.
            </span>
          </div>
        </div>

        {/* Year Selector Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-1">
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="fy-selector" className="label font-semibold text-slate-700 dark:text-slate-200">
              Select Operational Financial Year
            </label>
            <div className="relative">
              <select
                id="fy-selector"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="input cursor-pointer font-medium text-slate-800 dark:text-slate-100"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {formatFinancialYear(year)} (01-04-{year} to 31-03-{year + 1})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Selected range: 1st April {selectedYear} to 31st March {selectedYear + 1}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleApplyYear}
              disabled={isCurrentActive}
              className={`btn w-full justify-center transition-all ${
                isCurrentActive
                  ? 'btn-secondary opacity-60 cursor-not-allowed'
                  : 'btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
              }`}
            >
              {isCurrentActive ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Currently Applied</span>
                </>
              ) : (
                <>
                  <Calendar size={14} />
                  <span>Apply Financial Year</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className="alert alert-success animate-in fade-in duration-200 flex items-center gap-2 text-xs">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { payrollService } from '../services/payroll.service';
import { useEmployeeSalary } from '../hooks/useSalaryImport';
import { formatCurrency } from '@/shared/utilities';
import { Search, Banknote, ReceiptText, LoaderCircle, Wallet, X, Calendar } from 'lucide-react';

interface MonthOption {
  value: string;
  label: string;
}

export function SalaryLookup({ fy, initialHrpn }: { fy: number; initialHrpn?: string }) {
  const months: MonthOption[] = payrollService.getMonthOptions(fy);

  const [hrpn, setHrpn] = useState(initialHrpn || '');
  const [month, setMonth] = useState(() => payrollService.getEntryMonth());

  const { data: salary, isLoading, refetch } = useEmployeeSalary(hrpn.trim(), month, fy);

  const enabled = !!hrpn.trim();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (enabled) {
      refetch();
    }
  };

  const netPay = salary ? Number(salary.grossSalary) - Number(salary.incomeTax) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Search size={16} className="text-indigo-600 dark:text-indigo-400" />
          Salary HRPN Quick Lookup
        </h3>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Calendar size={12} /> FY {fy}-{String(fy + 1).slice(-2)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">HRPN No.</label>
          <div className="relative">
            <input
              type="text"
              value={hrpn}
              onChange={(e) => setHrpn(e.target.value.toUpperCase())}
              placeholder="e.g. 100123"
              className="input font-mono uppercase text-sm w-44 pr-7"
            />
            {hrpn && (
              <button
                type="button"
                onClick={() => setHrpn('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input text-sm w-52"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={!enabled || isLoading} className="btn btn-primary text-xs">
          {isLoading ? <LoaderCircle size={14} className="animate-spin mr-1" /> : <Search size={14} className="mr-1" />}
          Lookup Salary
        </button>
      </form>

      {/* Salary Result Cards Layout */}
      <div className="pt-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle size={16} className="animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Fetching salary record...</span>
          </div>
        ) : salary ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                  <Banknote size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Gross Salary
                </span>
                <div className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {formatCurrency(salary.grossSalary)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                  <ReceiptText size={14} className="text-amber-600 dark:text-amber-400" />
                  Income Tax (TDS)
                </span>
                <div className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {formatCurrency(salary.incomeTax)}
                </div>
              </div>

              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-3 rounded-xl">
                <span className="text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 mb-1">
                  <Wallet size={14} className="text-indigo-600 dark:text-indigo-400" />
                  Net Payable
                </span>
                <div className="font-extrabold text-base text-indigo-900 dark:text-indigo-200">
                  {formatCurrency(netPay)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span>
                Record: <strong>{salary.month}</strong> (FY {salary.financialYear})
              </span>
              <span>HRPN: {hrpn}</span>
            </div>
          </div>
        ) : hrpn.trim() ? (
          <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            No salary entry found for HRPN <strong>{hrpn}</strong> in {month}.
          </div>
        ) : (
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Enter an HRPN number above and select a month to view salary details.
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { payrollService } from '../services/payroll.service';
import { useEmployeeSalary } from '../hooks/useSalaryImport';
import { useUIStore } from '@/core/stores/ui-store';
import { formatCurrency } from '@/shared/utilities';
import { Search, Banknote, ReceiptText, LoaderCircle } from 'lucide-react';

interface MonthOption {
  value: string;
  label: string;
}

export function SalaryLookup() {
  const fy = useUIStore((state) => state.activeFinancialYear);
  const months: MonthOption[] = payrollService.getMonthOptions(fy);

  const [hrpn, setHrpn] = useState('');
  const [month, setMonth] = useState(() => payrollService.getEntryMonth());

  const { data: salary, isLoading, refetch } = useEmployeeSalary(hrpn, month, fy);

  const enabled = !!hrpn.trim();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
        <Search size={16} /> Salary Lookup (HRPN + Month)
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-[0.72rem] font-medium text-slate-500">HRPN No.</label>
          <input
            type="text"
            value={hrpn}
            onChange={(e) => setHrpn(e.target.value)}
            placeholder="e.g. 100123"
            className="w-44 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[0.72rem] font-medium text-slate-500">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-56 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => refetch()} disabled={!enabled} className="btn btn-primary btn-sm">
          <Search size={14} className="mr-1" /> Lookup
        </button>
      </div>

      <div className="pt-1 min-h-[3rem]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle size={14} className="animate-spin" /> Searching...
          </div>
        ) : salary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 p-2.5 rounded">
              <span className="text-slate-500 flex items-center gap-1">
                <Banknote size={12} /> Gross Salary
              </span>
              <div className="font-medium">{formatCurrency(salary.grossSalary)}</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded">
              <span className="text-slate-500 flex items-center gap-1">
                <ReceiptText size={12} /> Income Tax
              </span>
              <div className="font-medium">{formatCurrency(salary.incomeTax)}</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded">
              <span className="text-slate-500">Month</span>
              <div className="font-medium">{salary.month} FY {salary.financialYear}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">Enter an HRPN and pick a month, then click Lookup.</div>
        )}
      </div>
    </div>
  );
}

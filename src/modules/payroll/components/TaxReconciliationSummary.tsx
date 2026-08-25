import { formatCurrency } from '@/shared/utilities';
import type { TaxReconciliationSummary as TaxReconciliationSummaryType } from '../types/reconciliation';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowDownUp,
  Receipt,
} from 'lucide-react';


interface TaxReconciliationSummaryProps {
  summary: TaxReconciliationSummaryType;
}

export function TaxReconciliationSummary({ summary }: TaxReconciliationSummaryProps) {
  const isNetTaxZero = Math.abs(summary.netTaxDiff) < 0.01;
  const isAllMatched = summary.matchedCount === summary.totalEmployees && summary.totalEmployees > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {/* 1. Total Employees */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Records</span>
          <Users size={15} className="text-slate-400" />
        </div>
        <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-100">
          {summary.totalEmployees}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">In Quarter Evaluation</div>
      </div>

      {/* 2. Matched Count */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Matched</span>
          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
          {summary.matchedCount}
        </div>
        <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
          {isAllMatched ? '100% Reconciled' : `${summary.totalEmployees ? Math.round((summary.matchedCount / summary.totalEmployees) * 100) : 0}% of roster`}
        </div>
      </div>

      {/* 3. Tax Mismatches */}
      <div className={`border rounded-xl p-3 shadow-xs ${
        summary.taxMismatchCount > 0
          ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold ${
            summary.taxMismatchCount > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'
          }`}>Tax Mismatch</span>
          <AlertCircle size={15} className={summary.taxMismatchCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'} />
        </div>
        <div className={`mt-1 text-lg font-extrabold ${
          summary.taxMismatchCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'
        }`}>
          {summary.taxMismatchCount}
        </div>
        <div className={`text-[10px] mt-0.5 font-medium ${
          summary.taxMismatchCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
        }`}>
          {summary.taxMismatchCount > 0 ? `Δ ${formatCurrency(summary.netTaxDiff)}` : 'Zero IT Variance'}
        </div>
      </div>

      {/* 4. Missing in Payroll */}
      <div className={`border rounded-xl p-3 shadow-xs ${
        summary.missingInPayrollCount > 0
          ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold ${
            summary.missingInPayrollCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
          }`}>Missing in Payroll</span>
          <AlertTriangle size={15} className={summary.missingInPayrollCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
        </div>
        <div className={`mt-1 text-lg font-extrabold ${
          summary.missingInPayrollCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'
        }`}>
          {summary.missingInPayrollCount}
        </div>
        <div className={`text-[10px] mt-0.5 ${
          summary.missingInPayrollCount > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'
        }`}>
          {summary.missingInPayrollCount > 0 ? 'Ready for 1-Click Sync' : 'All in Payroll'}
        </div>
      </div>

      {/* 5. Paybill TDS vs Payroll TDS */}
      <div className="bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300">Paybill Total TDS</span>
          <Receipt size={15} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="mt-1 text-base font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
          {formatCurrency(summary.totalPaybillTax)}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
          Payroll: {formatCurrency(summary.totalPayrollTax)}
        </div>
      </div>

      {/* 6. Net Tax Variance */}
      <div className={`border rounded-xl p-3 shadow-xs ${
        !isNetTaxZero
          ? 'bg-rose-500 text-white'
          : 'bg-emerald-600 text-white'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold opacity-90">Net TDS Variance</span>
          <ArrowDownUp size={15} className="opacity-80" />
        </div>
        <div className="mt-1 text-base font-extrabold tabular-nums">
          {formatCurrency(summary.netTaxDiff)}
        </div>
        <div className="text-[10px] opacity-85 mt-0.5 font-medium">
          {isNetTaxZero ? 'Fully Balanced (₹0.00)' : 'Audit Attention Required'}
        </div>
      </div>
    </div>
  );
}

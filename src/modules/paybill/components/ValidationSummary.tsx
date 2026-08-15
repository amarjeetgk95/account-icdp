import { useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, HelpCircle, Check, ChevronDown, ChevronUp, Scale } from 'lucide-react';
import type { PayBillImportSummary, PayBillReconciliation } from '../types';

interface ValidationSummaryProps {
  summary: PayBillImportSummary;
  reconciliation: PayBillReconciliation | null;
}

export function ValidationSummary({ summary, reconciliation }: ValidationSummaryProps) {
  const [showReconciliationDetails, setShowReconciliationDetails] = useState(false);

  const formatInr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-3">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
          <span className="text-[0.7rem] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Extracted
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            {summary.totalRecords}
          </div>
          <span className="text-[0.65rem] text-slate-400">Employee rows</span>
        </div>

        {/* Matched */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Matched
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {summary.matchedCount}
          </div>
          <span className="text-[0.65rem] text-emerald-600/80 dark:text-emerald-400/80">In Master Data</span>
        </div>

        {/* Not Found */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Not Found
            </span>
            <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
            {summary.notFoundCount}
          </div>
          <span className="text-[0.65rem] text-amber-600/80 dark:text-amber-400/80">New / Unlinked</span>
        </div>

        {/* Duplicate */}
        <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 p-3 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-orange-800 dark:text-orange-300">
              Duplicate
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-xl font-extrabold text-orange-700 dark:text-orange-300 mt-0.5">
            {summary.duplicateCount}
          </div>
          <span className="text-[0.65rem] text-orange-600/80">Repeated HRPN</span>
        </div>

        {/* Errors */}
        <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 p-3 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-red-800 dark:text-red-300">
              Errors
            </span>
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-xl font-extrabold text-red-700 dark:text-red-300 mt-0.5">
            {summary.errorCount}
          </div>
          <span className="text-[0.65rem] text-red-600/80">Must resolve</span>
        </div>

        {/* Warnings */}
        <div className="bg-yellow-50/70 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/60 p-3 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-yellow-800 dark:text-yellow-300">
              Warnings
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
          </div>
          <div className="text-xl font-extrabold text-yellow-700 dark:text-yellow-300 mt-0.5">
            {summary.warningCount}
          </div>
          <span className="text-[0.65rem] text-yellow-600/80">Informational</span>
        </div>

        {/* Ready */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 p-3 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-blue-800 dark:text-blue-300">
              Ready
            </span>
            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">
            {summary.readyCount}
          </div>
          <span className="text-[0.65rem] text-blue-600/80">Ready to import</span>
        </div>
      </div>

      {/* Reconciliation Card */}
      {reconciliation && (
        <div
          className={`border rounded-xl p-4 transition-all shadow-sm ${
            reconciliation.isGrossMatched
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  reconciliation.isGrossMatched
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                }`}
              >
                <Scale className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Total Reconciliation Status:
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      reconciliation.isGrossMatched
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {reconciliation.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {reconciliation.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[0.68rem]">PDF Gross Total</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {formatInr(reconciliation.pdfGross)}
                </span>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[0.68rem]">Calculated Sum</span>
                <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">
                  {formatInr(reconciliation.calculatedGross)}
                </span>
              </div>

              {reconciliation.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReconciliationDetails(!showReconciliationDetails)}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-xs px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {showReconciliationDetails ? 'Hide' : 'Details'}
                  {showReconciliationDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Breakdown Table if expanded */}
          {showReconciliationDetails && reconciliation.items.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-1 font-semibold">Allowance Field</th>
                    <th className="text-right py-1 font-semibold">PDF Total</th>
                    <th className="text-right py-1 font-semibold">Calculated Total</th>
                    <th className="text-right py-1 font-semibold">Difference</th>
                    <th className="text-center py-1 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {reconciliation.items.map((item) => (
                    <tr key={item.key} className="hover:bg-white/40 dark:hover:bg-slate-800/40">
                      <td className="py-1 text-slate-800 dark:text-slate-200 font-sans font-medium">{item.label}</td>
                      <td className="py-1 text-right text-slate-700 dark:text-slate-300">{formatInr(item.pdfTotal)}</td>
                      <td className="py-1 text-right text-slate-900 dark:text-slate-100 font-semibold">{formatInr(item.calculatedTotal)}</td>
                      <td className={`py-1 text-right font-semibold ${item.diff === 0 ? 'text-slate-500' : 'text-amber-600'}`}>
                        {item.diff === 0 ? '₹0' : formatInr(item.diff)}
                      </td>
                      <td className="py-1 text-center">
                        {item.isMatched ? (
                          <span className="inline-flex items-center text-[0.65rem] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded font-sans font-bold">
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[0.65rem] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded font-sans font-bold">
                            DIFF
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

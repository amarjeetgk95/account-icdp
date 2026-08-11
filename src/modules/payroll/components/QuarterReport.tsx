import type { QuarterReport as QuarterReportType } from '../types';
import { formatCurrency, export24QExcel } from '@/shared/utilities';
import { FileSpreadsheet } from 'lucide-react';

interface QuarterReportProps {
  report: QuarterReportType | null;
  isLoading: boolean;
  showHeader?: boolean;
}

export function QuarterReportView({ report, isLoading, showHeader = true }: QuarterReportProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12 text-slate-500">
        Select quarter and generate the report to view data.
      </div>
    );
  }

  const sums = report.rows.reduce(
    (acc, row) => ({
      g1: acc.g1 + row.g[0],
      g2: acc.g2 + row.g[1],
      g3: acc.g3 + row.g[2],
      da: acc.da + row.d,
      total: acc.total + row.total,
      t1: acc.t1 + row.t[0],
      t2: acc.t2 + row.t[1],
      t3: acc.t3 + row.t[2],
      tax: acc.tax + row.tax,
    }),
    { g1: 0, g2: 0, g3: 0, da: 0, total: 0, t1: 0, t2: 0, t3: 0, tax: 0 }
  );

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="text-left space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">24Q Employee Salary &amp; Tax Deduction Statement</h2>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              FY: {report.fyLabel} | AY: {report.ayLabel} | Period: {report.quarter} Ending
            </p>
          </div>
          <button
            type="button"
            onClick={() => export24QExcel(report)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Formatted 24Q Excel
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold">
              <th rowSpan={2} className="px-2.5 py-2 border border-slate-300 dark:border-slate-700 align-middle text-center font-bold" style={{ width: '40px' }}>Sr.</th>
              <th rowSpan={2} className="px-2.5 py-2 border border-slate-300 dark:border-slate-700 align-middle text-left font-bold whitespace-nowrap">Name</th>
              <th rowSpan={2} className="px-2.5 py-2 border border-slate-300 dark:border-slate-700 align-middle text-center font-bold" style={{ width: '95px' }}>PAN No.</th>
              <th colSpan={5} className="px-2.5 py-2 border border-slate-300 dark:border-slate-700 text-center font-bold uppercase tracking-wider text-[11px] bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300">Income</th>
              <th colSpan={4} className="px-2.5 py-2 border border-slate-300 dark:border-slate-700 text-center font-bold uppercase tracking-wider text-[11px] bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300">Deduction</th>
            </tr>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {report.labels.map((label, i) => (
                <th key={i} className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-center font-semibold">
                  <div className="font-semibold">{label.work}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 normal-case font-normal">paid in ({label.paid})</div>
                </th>
              ))}
              <th className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-center font-bold">DA &amp; Other</th>
              <th className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-200/60 dark:bg-slate-700/60">Total Salary</th>
              {report.labels.map((label, i) => (
                <th key={i} className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-center font-semibold">
                  <div className="font-semibold">{label.work}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 normal-case font-normal">paid in ({label.paid})</div>
                </th>
              ))}
              <th className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-200/60 dark:bg-slate-700/60">Total Tax</th>
            </tr>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {Array(12)
                .fill(0)
                .map((_, i) => (
                  <th key={i} className="px-2 py-1 border border-slate-300 dark:border-slate-700 text-center font-mono">{i + 1}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-slate-800 dark:text-slate-200">
                <td className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400">{idx + 1}</td>
                <td className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.name}</td>
                <td className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-center font-mono text-slate-600 dark:text-slate-400">{row.pan}</td>
                {row.g.map((v, i) => (
                  <td key={i} className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-right tabular-nums">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-right tabular-nums">{formatCurrency(row.d)}</td>
                <td className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-right font-bold tabular-nums bg-slate-50/50 dark:bg-slate-800/40 text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(row.total)}
                </td>
                {row.t.map((v, i) => (
                  <td key={i} className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-right tabular-nums">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-right font-bold tabular-nums bg-slate-50/50 dark:bg-slate-800/40 text-rose-700 dark:text-rose-300">
                  {formatCurrency(row.tax)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100">
              <td colSpan={3} className="px-2 py-2 border border-slate-300 dark:border-slate-700 text-center uppercase tracking-wider text-[11px]">Total</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(sums.g1)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(sums.g2)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(sums.g3)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(sums.da)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums font-bold">{formatCurrency(sums.total)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(sums.t1)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(sums.t2)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(sums.t3)}</td>
              <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums font-bold">{formatCurrency(sums.tax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

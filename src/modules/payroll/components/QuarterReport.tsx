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
        <div className="flex items-center justify-between py-4 border-b border-slate-200">
          <div className="text-left space-y-1">
            <h2 className="text-lg font-bold">24Q Employee Salary &amp; Tax Deduction Statement</h2>
            <p className="text-sm text-slate-600">
              FY: {report.fyLabel} | AY: {report.ayLabel} | Period: {report.quarter} Ending
            </p>
          </div>
          <button
            type="button"
            onClick={() => export24QExcel(report)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Formatted 24Q Excel
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-300 align-middle text-center" style={{ width: '40px' }}>Sr.</th>
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-300 align-middle text-left whitespace-nowrap">Name</th>
              <th rowSpan={2} className="px-2 py-1.5 border border-slate-300 align-middle text-center" style={{ width: '90px' }}>PAN No.</th>
              <th colSpan={5} className="px-2 py-1.5 border border-slate-300 text-center font-semibold">Income</th>
              <th colSpan={4} className="px-2 py-1.5 border border-slate-300 text-center font-semibold">Deduction</th>
            </tr>
            <tr className="bg-slate-100">
              {report.labels.map((label, i) => (
                <th key={i} className="px-2 py-1 border border-slate-300 text-center">
                  <div className="font-semibold">{label.work}</div>
                  <div className="text-[10px] text-slate-500 normal-case">paid in ({label.paid})</div>
                </th>
              ))}
              <th className="px-2 py-1 border border-slate-300 text-center">DA &amp; Other</th>
              <th className="px-2 py-1 border border-slate-300 text-center">Total Salary</th>
              {report.labels.map((label, i) => (
                <th key={i} className="px-2 py-1 border border-slate-300 text-center">
                  <div className="font-semibold">{label.work}</div>
                  <div className="text-[10px] text-slate-500 normal-case">paid in ({label.paid})</div>
                </th>
              ))}
              <th className="px-2 py-1 border border-slate-300 text-center">Total Tax</th>
            </tr>
            <tr className="bg-slate-50 text-[10px] text-slate-500">
              {Array(12)
                .fill(0)
                .map((_, i) => (
                  <th key={i} className="px-2 py-0.5 border border-slate-300 text-center">{i + 1}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-2 py-1.5 border border-slate-300 text-center">{idx + 1}</td>
                <td className="px-2 py-1.5 border border-slate-300 font-medium whitespace-nowrap">{row.name}</td>
                <td className="px-2 py-1.5 border border-slate-300 text-center font-mono">{row.pan}</td>
                {row.g.map((v, i) => (
                  <td key={i} className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">{formatCurrency(row.d)}</td>
                <td className="px-2 py-1.5 border border-slate-300 text-right font-bold tabular-nums">
                  {formatCurrency(row.total)}
                </td>
                {row.t.map((v, i) => (
                  <td key={i} className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="px-2 py-1.5 border border-slate-300 text-right font-bold tabular-nums">
                  {formatCurrency(row.tax)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={3} className="px-2 py-1.5 border border-slate-300 text-center">Total</td>
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

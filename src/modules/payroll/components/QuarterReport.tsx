import type { QuarterReport as QuarterReportType } from '../types';
import { formatCurrency } from '@/shared/utilities';

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
        Select quarter and click Generate to view report.
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
        <div className="text-center space-y-1 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold">24Q Employee Salary & Tax Deduction Statement</h2>
          <p className="text-sm text-slate-600">
            FY: {report.fyLabel} | AY: {report.ayLabel} | Period: {report.quarter} Ending
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th rowSpan={2} className="px-2 py-1 border border-slate-300 align-middle">Sr.</th>
              <th rowSpan={2} className="px-2 py-1 border border-slate-300 align-middle">Name</th>
              <th rowSpan={2} className="px-2 py-1 border border-slate-300 align-middle">PAN No.</th>
              <th colSpan={5} className="px-2 py-1 border border-slate-300 text-center">Income</th>
              <th colSpan={4} className="px-2 py-1 border border-slate-300 text-center">Deduction</th>
            </tr>
            <tr className="bg-slate-100">
              {report.labels.map((label, i) => (
                <th key={i} className="px-2 py-1 border border-slate-300 text-[10px]">
                  {label.work}
                  <br />
                  paid in ({label.paid})
                </th>
              ))}
              <th className="px-2 py-1 border border-slate-300">DA & Other</th>
              <th className="px-2 py-1 border border-slate-300">Total Salary</th>
              {report.labels.map((label, i) => (
                <th key={i} className="px-2 py-1 border border-slate-300 text-[10px]">
                  {label.work}
                  <br />
                  paid in ({label.paid})
                </th>
              ))}
              <th className="px-2 py-1 border border-slate-300">Total Tax</th>
            </tr>
            <tr className="bg-slate-50 text-[10px]">
              {Array(12)
                .fill(0)
                .map((_, i) => (
                  <th key={i} className="px-2 py-0.5 border border-slate-300 text-slate-500">
                    {i + 1}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-2 py-1 border border-slate-300 text-center">{idx + 1}</td>
                <td className="px-2 py-1 border border-slate-300 font-medium">{row.name}</td>
                <td className="px-2 py-1 border border-slate-300 text-center">{row.pan}</td>
                {row.g.map((v, i) => (
                  <td key={i} className="px-2 py-1 border border-slate-300 text-right">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(row.d)}</td>
                <td className="px-2 py-1 border border-slate-300 text-right font-bold">
                  {formatCurrency(row.total)}
                </td>
                {row.t.map((v, i) => (
                  <td key={i} className="px-2 py-1 border border-slate-300 text-right">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="px-2 py-1 border border-slate-300 text-right font-bold">
                  {formatCurrency(row.tax)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={3} className="px-2 py-1 border border-slate-300 text-center">Total</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.g1)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.g2)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.g3)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.da)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.total)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.t1)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.t2)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.t3)}</td>
              <td className="px-2 py-1 border border-slate-300 text-right">{formatCurrency(sums.tax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

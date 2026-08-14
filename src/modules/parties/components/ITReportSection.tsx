import type { IncomeTaxReport } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface ITReportSectionProps {
  report: IncomeTaxReport | undefined;
  isLoading: boolean;
}

export function ITReportSection({ report, isLoading }: ITReportSectionProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!report || report.rows.length === 0) {
    return (
      <div className="empty-state py-12 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-slate-500 font-medium">No IT data for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="report-table">
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th style={{ textAlign: 'left' }}>Party Name</th>
            <th>Bill No</th>
            <th>Settlement Date</th>
            <th>Amount</th>
            <th>PAN No.</th>
            <th>Income Tax (TDS)</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
              <td>{idx + 1}</td>
              <td className="font-bold" style={{ textAlign: 'left' }}>
                {row.partyName}
              </td>
              <td>{row.billNo}</td>
              <td>{row.date}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
              <td className="font-bold">{row.panNo}</td>
              <td className="font-bold" style={{ textAlign: 'right' }}>
                {formatCurrency(row.incomeTax)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td colSpan={4} style={{ textAlign: 'right' }}>
              Grand Total
            </td>
            <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.amount)}</td>
            <td></td>
            <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.incomeTax)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

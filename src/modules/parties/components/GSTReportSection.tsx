import type { GSTReport } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface GSTReportSectionProps {
  report: GSTReport | undefined;
  isLoading: boolean;
}

export function GSTReportSection({ report, isLoading }: GSTReportSectionProps) {
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
        <p className="text-slate-500 font-medium">No GST data for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="report-table">
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>GST No.</th>
            <th>CPIN No</th>
            <th style={{ textAlign: 'left' }}>Party Name</th>
            <th>Bill No</th>
            <th>Date</th>
            <th>Amount</th>
            <th>SGST</th>
            <th>CGST</th>
            <th>IGST</th>
            <th>Total GST</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
              <td>{idx + 1}</td>
              <td>{row.gstNo}</td>
              <td className="font-bold">{row.cpinNo}</td>
              <td className="font-bold" style={{ textAlign: 'left' }}>
                {row.partyName}
              </td>
              <td>{row.billNo}</td>
              <td>{row.date}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(row.sgst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(row.cgst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(row.igst)}</td>
              <td className="font-bold" style={{ textAlign: 'right' }}>
                {formatCurrency(row.totalGst)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td colSpan={7} style={{ textAlign: 'right' }}>
              Grand Total
            </td>
            <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.sgst)}</td>
            <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.cgst)}</td>
            <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.igst)}</td>
            <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.totalGst)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

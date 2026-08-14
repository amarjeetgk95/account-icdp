import { Landmark } from 'lucide-react';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { EmptyState } from '@/shared/components/EmptyState';
import { ReportLoadingState } from './ReportLoadingState';
import { formatCurrency } from '@/shared/utilities';
import type { IncomeTaxReport } from '@/modules/parties/types';
import type { OfficeDetails } from '@/shared/components/ReportPrintArea';

interface IncomeTaxReportSectionProps {
  office: Partial<OfficeDetails>;
  report: IncomeTaxReport | undefined;
  isLoading: boolean;
  officeName: string;
  fyLabel: string;
}

export function IncomeTaxReportSection({ office, report, isLoading, officeName, fyLabel }: IncomeTaxReportSectionProps) {
  if (isLoading) {
    return <ReportLoadingState label="Loading Income Tax report..." />;
  }

  if (!report || report.rows.length === 0) {
    return (
      <div className="card animate-fade-in">
        <EmptyState
          className="card-body"
          icon={Landmark}
          title="No Income Tax data for this office / period."
          hint="Try a different office, financial year or quarter."
        />
      </div>
    );
  }

  return (
    <ReportPrintArea
      office={office}
      leftLabel="TAN NO :-"
      leftValue={office.tan || 'NOT SET'}
      rightMeta={
        <>
          <span>
            Financial Year: {fyLabel} | Quarter: {report.quarter} | Office: {officeName}
          </span>
        </>
      }
      title="26Q OTHER THAN SALARY STATEMENT"
      badgeClass="report-badge-it"
    >
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
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="font-bold" style={{ textAlign: 'left' }}>{row.partyName}</td>
                <td>{row.billNo}</td>
                <td>{row.date}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                <td className="font-bold">{row.panNo}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(row.incomeTax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: 'right' }}>Grand Total</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.amount)}</td>
              <td></td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(report.totals.incomeTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportPrintArea>
  );
}

import { useRef } from 'react';
import { Receipt } from 'lucide-react';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { EmptyState } from '@/shared/components/EmptyState';
import { ReportLoadingState } from './ReportLoadingState';
import { formatCurrency } from '@/shared/utilities';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GSTReport } from '@/modules/parties/types';
import type { OfficeDetails } from '@/shared/components/ReportPrintArea';

interface GSTReportSectionProps {
  office: Partial<OfficeDetails>;
  report: GSTReport | undefined;
  isLoading: boolean;
  officeName: string;
  fyLabel: string;
}

export function GSTReportSection({ office, report, isLoading, officeName, fyLabel }: GSTReportSectionProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 38;

  const count = report?.rows?.length || 0;
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  if (isLoading) {
    return <ReportLoadingState label="Loading GST report..." />;
  }

  if (!report || report.rows.length === 0) {
    return (
      <div className="card animate-fade-in">
        <EmptyState
          className="card-body"
          icon={Receipt}
          title="No GST data for this office / period."
          hint="Try a different office, financial year or quarter."
        />
      </div>
    );
  }

  return (
    <ReportPrintArea
      office={office}
      leftLabel="GSTIN NO :-"
      leftValue={office.gst || 'NOT SET'}
      rightMeta={
        <>
          <span>
            Financial Year: {fyLabel} | Quarter: {report.quarter} | Office: {officeName}
          </span>
        </>
      }
      title="GST 3B EXPENDITURE STATEMENT"
      badgeClass="report-badge-gst"
    >
      <div className="admin-table ec-scroll">
        <div ref={parentRef} className="h-[480px] overflow-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Party Name</th>
                <th>GSTIN</th>
                <th>Invoice</th>
                <th>Date</th>
                <th className="text-right">Taxable Amount</th>
                <th className="text-right">CGST</th>
                <th className="text-right">SGST</th>
                <th className="text-right">IGST</th>
                <th className="text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody style={{ height: `${report.rows.length * ROW_HEIGHT}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = report.rows[virtualRow.index];
                if (!row) return null;
                const idx = virtualRow.index;
                return (
                  <tr
                    key={idx}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${ROW_HEIGHT}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <td className="text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="font-semibold text-slate-800 dark:text-slate-100">{row.partyName}</td>
                    <td className="font-mono text-xs text-slate-500">{row.gstNo || '-'}</td>
                    <td className="text-slate-600 dark:text-slate-300">{row.billNo}</td>
                    <td className="text-slate-500 tabular-nums">{row.date}</td>
                    <td className="text-right font-medium tabular-nums">{formatCurrency(row.amount)}</td>
                    <td className="text-right tabular-nums text-slate-600">{formatCurrency(row.cgst)}</td>
                    <td className="text-right tabular-nums text-slate-600">{formatCurrency(row.sgst)}</td>
                    <td className="text-right tabular-nums text-slate-600">{formatCurrency(row.igst)}</td>
                    <td className="text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(row.totalGst)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Total</td>
                <td className="text-right tabular-nums font-bold">{formatCurrency(report.totals?.amount)}</td>
                <td className="text-right tabular-nums font-bold">{formatCurrency(report.totals?.cgst)}</td>
                <td className="text-right tabular-nums font-bold">{formatCurrency(report.totals?.sgst)}</td>
                <td className="text-right tabular-nums font-bold">{formatCurrency(report.totals?.igst)}</td>
                <td className="text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(report.totals?.totalGst)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </ReportPrintArea>
  );
}

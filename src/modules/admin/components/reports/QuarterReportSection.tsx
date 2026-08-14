import { FileText } from 'lucide-react';
import { QuarterReportView } from '@/modules/payroll/components/QuarterReport';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { EmptyState } from '@/shared/components/EmptyState';
import { ReportLoadingState } from './ReportLoadingState';
import type { QuarterReport } from '@/modules/payroll/types';
import type { OfficeDetails } from '@/shared/components/ReportPrintArea';

interface QuarterReportSectionProps {
  office: Partial<OfficeDetails>;
  report: QuarterReport | undefined;
  isLoading: boolean;
}

export function QuarterReportSection({ office, report, isLoading }: QuarterReportSectionProps) {
  if (isLoading) {
    return <ReportLoadingState label="Loading 24Q employee statement..." />;
  }

  if (!report || report.rows.length === 0) {
    return (
      <div className="card animate-fade-in">
        <EmptyState
          className="card-body"
          icon={FileText}
          title="No salary data for this office / period."
          hint="Try a different office, financial year or quarter."
        />
      </div>
    );
  }

  return (
    <ReportPrintArea
      office={office}
      leftLabel="Tax Deduction No :-"
      leftValue={office.tan || 'NOT SET'}
      rightMeta={
        <>
          <span>
            Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel} | Period:{' '}
            {report.quarter} Ending
          </span>
        </>
      }
      title="24Q Employee Salary & Tax Deduction Statement"
      badgeClass="report-badge-emp"
    >
      <QuarterReportView report={report} isLoading={false} showHeader={false} />
    </ReportPrintArea>
  );
}

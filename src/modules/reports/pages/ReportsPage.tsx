import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFinancialYears, useYearlyReport } from '../hooks/useReports';
import { useUIStore } from '@/core/stores/ui-store';
import type { YearlyReport } from '../types';
import { formatCurrency, popupNativePrint } from '@/shared/utilities';
import { export26QExcel, exportGSTExcel } from '@/shared/utilities/excelExport';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { GSTReportSection } from '@/modules/parties/components/GSTReportSection';
import { ITReportSection } from '@/modules/parties/components/ITReportSection';
import { FileSpreadsheet, Users, Store, CalendarDays, Printer, Info } from 'lucide-react';

type ReportTab = '24q' | '26q' | 'gst';

export function ReportsPage() {
  const { tab } = useParams<{ tab: string }>();
  const validTabs: ReportTab[] = ['24q', '26q', 'gst'];
  const activeTab: ReportTab = validTabs.includes(tab as ReportTab) ? (tab as ReportTab) : '24q';

  const storeFY = useUIStore((s) => s.activeFinancialYear);
  const [selection, setSelection] = useState<{ storeFY: number; value: number | null }>(() => ({ storeFY, value: null }));
  const { data: years, isLoading: yearsLoading } = useFinancialYears();
  const activeFY = selection.storeFY === storeFY && selection.value !== null ? selection.value : storeFY;
  const { data: report, isLoading: reportLoading } = useYearlyReport(activeFY);
  const { details: officeDetails } = useOfficeDetails();

  // Year selection hint: when the active FY has no data yet, point at years that do.
  const dataYears = (years ?? []).filter((y) => y !== activeFY);
  const suggestedFY = dataYears.length > 0 ? (dataYears.find((y) => y < activeFY) ?? dataYears[0]) : null;
  const reportHasNoData = !!report && report.summary.totalEmployees === 0 && report.summary.totalVendors === 0;

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };

  const fyOptions = (years && years.length > 0 ? years : [activeFY]).slice();
  if (activeFY && !fyOptions.includes(activeFY)) {
    fyOptions.push(activeFY);
    fyOptions.sort((a, b) => b - a);
  }

  const handleFYChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelection({ storeFY, value: parseInt(e.target.value, 10) });
  };

  if (yearsLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <WorkspaceHeader
        className="no-print"
        title="Annual Reports"
        context={<><CalendarDays size={13} /> FY {activeFY}-{String(activeFY + 1).slice(-2)}</>}
        actions={
          <div className="flex items-center gap-2">
            <select value={activeFY || ''} onChange={handleFYChange} className="input w-36">
              {fyOptions.map((y) => (
                <option key={y} value={y}>{y}-{String(y + 1).slice(-2)}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!report) return;
                if (activeTab === '26q') {
                  export26QExcel(report.itReport, office);
                } else if (activeTab === 'gst') {
                  exportGSTExcel(report.gstReport, office);
                }
              }}
              disabled={activeTab === '24q'}
              title={activeTab === '24q' ? 'Export 24Q from the Payroll module (per quarter)' : 'Download formatted Excel'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={() => {
                const el = document.querySelector('.report-print-area') as HTMLElement | null;
                if (el) {
                  popupNativePrint({
                    elements: [el],
                    title: `${activeTab.toUpperCase()}_Report_${activeFY}`,
                    pageSize: 'A4',
                    orientation: activeTab === '24q' ? 'landscape' : 'portrait',
                    pageMargin: '8mm',
                    pageContainerSelector: '.report-print-area',
                  });
                } else {
                  window.print();
                }
              }}
              className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        }
      />

      {reportHasNoData && suggestedFY !== null && (
        <div className="mb-4 flex items-start gap-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-800 rounded-xl p-3 no-print">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              No records for FY {activeFY}-{String(activeFY + 1).slice(-2)} yet.
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              Payroll, TDS and party data currently exists for{' '}
              {dataYears.map((y) => `${y}-${String(y + 1).slice(-2)}`).join(', ')}.
            </p>
          </div>
          <button
            onClick={() => setSelection({ storeFY, value: suggestedFY })}
            className="inline-flex items-center shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Switch to FY {suggestedFY}-{String(suggestedFY + 1).slice(-2)}
          </button>
        </div>
      )}

      {report && (
        <div className="space-y-3 mb-6 no-print">
          {/* Payroll Overview Group */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
              Payroll Overview (24Q Employee)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card p-3 border-l-4 border-l-emerald-500">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Employees</div>
                <div className="text-xs font-extrabold mt-0.5 text-slate-800 dark:text-slate-100">{report.summary.totalEmployees}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-indigo-500">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Annual Gross + DA Salary</div>
                <div className="text-xs font-extrabold mt-0.5 text-indigo-600 dark:text-indigo-400">{formatCurrency(report.summary.totalGross)}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-rose-500">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total TDS (24Q)</div>
                <div className="text-xs font-extrabold mt-0.5 text-rose-600 dark:text-rose-400">{formatCurrency(report.summary.totalTax)}</div>
              </div>
            </div>
          </div>

          {/* Vendor Overview Group */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Store size={14} className="text-amber-600 dark:text-amber-400" />
              Vendor Overview (26Q & GST)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card p-3 border-l-4 border-l-amber-500">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Vendors</div>
                <div className="text-xs font-extrabold mt-0.5 text-slate-800 dark:text-slate-100">{report.summary.totalVendors}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-red-500">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Vendor IT Deducted (26Q)</div>
                <div className="text-xs font-extrabold mt-0.5 text-red-600 dark:text-red-400">{formatCurrency(report.summary.totalIncomeTax)}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-teal-500">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total GST (Annual)</div>
                <div className="text-xs font-extrabold mt-0.5 text-teal-600 dark:text-teal-400">{formatCurrency(report.summary.totalGst)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : report ? (
        <>
          {activeTab === '24q' && <Employee24QReport report={report} office={office} />}
          {activeTab === '26q' && <Vendor26QReport report={report} office={office} />}
          {activeTab === 'gst' && <GSTReportView report={report} office={office} />}
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Select a financial year."
          hint="Pick a financial year above to load the report."
        />
      )}
    </div>
  );
}

const formatAmount = (value: number) =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Employee24QReport({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  if (report.employees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No employee data."
        hint="No salary entries were found for this financial year."
      />
    );
  }

  const totals = report.employees.reduce(
    (acc, emp) => ({
      q1Gross: acc.q1Gross + emp.qGross.Q1,
      q1Tax: acc.q1Tax + emp.qTax.Q1,
      q2Gross: acc.q2Gross + emp.qGross.Q2,
      q2Tax: acc.q2Tax + emp.qTax.Q2,
      q3Gross: acc.q3Gross + emp.qGross.Q3,
      q3Tax: acc.q3Tax + emp.qTax.Q3,
      q4Gross: acc.q4Gross + emp.qGross.Q4,
      q4Tax: acc.q4Tax + emp.qTax.Q4,
      annualGross: acc.annualGross + emp.gross,
      annualTax: acc.annualTax + emp.tax,
    }),
    {
      q1Gross: 0, q1Tax: 0,
      q2Gross: 0, q2Tax: 0,
      q3Gross: 0, q3Tax: 0,
      q4Gross: 0, q4Tax: 0,
      annualGross: 0, annualTax: 0,
    }
  );

  return (
    <ReportPrintArea
      office={office}
      leftLabel="Tax Deduction No :-"
      leftValue={office.tan || 'NOT SET'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="24Q Employee Annual TDS Statement"
      badgeClass="report-badge-emp"
      pageOrientation="landscape"
    >
      <div className="overflow-x-auto">
        <table className="report-table">
          <thead>
            <tr>
              <th rowSpan={2}>Sr.</th>
              <th rowSpan={2} style={{ textAlign: 'left' }}>Name</th>
              <th rowSpan={2}>PAN No.</th>
              <th colSpan={2}>Q1</th>
              <th colSpan={2}>Q2</th>
              <th colSpan={2}>Q3</th>
              <th colSpan={2}>Q4</th>
              <th colSpan={2}>Annual</th>
            </tr>
            <tr>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
            </tr>
          </thead>
          <tbody>
            {report.employees.map((emp, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="font-bold" style={{ textAlign: 'left' }}>{emp.name}</td>
                <td>{emp.pan}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qGross.Q1)}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qTax.Q1)}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qGross.Q2)}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qTax.Q2)}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qGross.Q3)}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qTax.Q3)}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qGross.Q4)}</td>
                <td style={{ textAlign: 'right' }}>{formatAmount(emp.qTax.Q4)}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatAmount(emp.gross)}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatAmount(emp.tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: 'right' }}>Grand Total</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q1Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q1Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q2Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q2Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q3Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q3Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q4Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.q4Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.annualGross)}</td>
              <td style={{ textAlign: 'right' }}>{formatAmount(totals.annualTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportPrintArea>
  );
}

function Vendor26QReport({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  return (
    <ReportPrintArea
      office={office}
      leftLabel="TAN NO :-"
      leftValue={office.tan || 'NOT SET'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="26Q OTHER THAN SALARY STATEMENT"
      badgeClass="report-badge-it"
    >
      <ITReportSection report={report.itReport} isLoading={false} />
    </ReportPrintArea>
  );
}

function GSTReportView({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  return (
    <ReportPrintArea
      office={office}
      leftLabel="GSTIN NO :-"
      leftValue={office.gst || 'NOT SET'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="GST TDS STATEMENT SUMMARY REPORT"
      badgeClass="report-badge-gst"
    >
      <GSTReportSection report={report.gstReport} isLoading={false} />
    </ReportPrintArea>
  );
}

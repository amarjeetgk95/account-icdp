import { useState } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Building2,
  CalendarRange,
  CalendarDays,
  FileText,
  Receipt,
  Landmark,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useOfficeFinancialYears, useReportOfficeDetails, useAdminQuarterReport, useAdminGSTReport, useAdminIncomeTaxReport } from '../hooks/useAdmin';
import { QuarterReportView } from '@/modules/payroll/components/QuarterReport';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { formatCurrency, downloadCsv } from '@/shared/utilities';
import type { Office } from '../types';
import '../styles/reports.css';

type ReportSub = '24q' | 'gst' | 'it';

interface AdminReportsProps {
  offices: Office[];
  officesLoading: boolean;
  officeId: string;
  onOfficeIdChange: (officeId: string) => void;
}

function ReportLoadingState({ label }: { label: string }) {
  return (
    <div className="card animate-fade-in" role="status" aria-label={label}>
      <div className="card-body space-y-5">
        <div className="flex items-center gap-3">
          <div className="skeleton h-5 w-5 rounded-full" />
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6">
              <div className="skeleton h-3.5 w-10" />
              <div className="skeleton h-3.5 w-32" />
              <div className="skeleton h-3.5 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportEmptyState({ icon: Icon, message, hint }: { icon: LucideIcon; message: string; hint: string }) {
  return (
    <div className="card animate-fade-in">
      <div className="empty-state card-body">
        <div className="empty-state-icon dark:text-slate-600 flex items-center justify-center">
          <Icon size={40} className="mx-auto" />
        </div>
        <p className="empty-state-text dark:text-slate-400">{message}</p>
        <p className="mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

export function AdminReports({ offices, officesLoading, officeId, onOfficeIdChange }: AdminReportsProps) {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [activeSub, setActiveSub] = useState<ReportSub>('24q');

  const { data: years } = useOfficeFinancialYears(officeId || null);
  const { data: officeDetails } = useReportOfficeDetails(officeId || null);

  const defaultCurrentFY = () => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  };
  const activeFY = selectedFY ?? (years && years.length > 0 ? years[0] : defaultCurrentFY());
  const { data: quarterReport, isLoading: quarterLoading } = useAdminQuarterReport(activeSub === '24q' ? selectedQuarter : null, activeFY, officeId || null);
  const { data: gstReport, isLoading: gstLoading } = useAdminGSTReport(activeSub === 'gst' ? selectedQuarter : null, activeFY, officeId || null);
  const { data: itReport, isLoading: itLoading } = useAdminIncomeTaxReport(activeSub === 'it' ? selectedQuarter : null, activeFY, officeId || null);

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };
  const fyLabel = activeFY != null ? `${activeFY}-${String(activeFY + 1).slice(-2)}` : '-';

  const exportCSV = () => {
    if (activeSub === '24q' && quarterReport) {
      downloadCsv(
        `24Q_${fyLabel}_${selectedQuarter}.csv`,
        ['Sr', 'Name', 'PAN No.', 'M1_Gross', 'M2_Gross', 'M3_Gross', 'DA_Other', 'Total_Salary', 'M1_Tax', 'M2_Tax', 'M3_Tax', 'Total_Tax'],
        quarterReport.rows.map((row, idx) => [idx + 1, row.name, row.pan, row.g[0], row.g[1], row.g[2], row.d, row.total, row.t[0], row.t[1], row.t[2], row.tax])
      );
    } else if (activeSub === 'gst' && gstReport) {
      downloadCsv(
        `GST_${fyLabel}_${selectedQuarter}.csv`,
        ['Sr. No.', 'GST No.', 'CPIN No', 'Party Name', 'Bill No', 'Date', 'Amount', 'SGST', 'CGST', 'IGST', 'Total GST'],
        gstReport.rows.map((row, idx) => [idx + 1, row.gstNo, row.cpinNo, row.partyName, row.billNo, row.date, row.amount, row.sgst, row.cgst, row.igst, row.totalGst])
      );
    } else if (activeSub === 'it' && itReport) {
      downloadCsv(
        `IT_26Q_${fyLabel}_${selectedQuarter}.csv`,
        ['Sr. No.', 'Party Name', 'Bill No', 'Settlement Date', 'Amount', 'PAN No.', 'Income Tax (TDS)'],
        itReport.rows.map((row, idx) => [idx + 1, row.partyName, row.billNo, row.date, row.amount, row.panNo, row.incomeTax])
      );
    }
  };

  const officeName = offices.find((o) => o.id === officeId)?.name || '';

  return (
    <div className="space-y-4">
      <div className="card no-print animate-fade-in animate-fade-in-delay-1">
        <div className="card-header">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-600 text-white shadow-primary flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Report Controls</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Configure office, financial year and quarter for the selected report</span>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
            <div className="report-controls">
              <label className="label inline-flex items-center gap-1.5 dark:text-slate-400">
                <Building2 size={13} />
                Report Office
              </label>
              <div className="relative">
                <Building2 size={15} className="field-icon" />
                <select
                  value={officeId}
                  onChange={(e) => {
                    onOfficeIdChange(e.target.value);
                    setSelectedFY(null);
                  }}
                  className="input dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                  disabled={officesLoading}
                >
                  <option value="">{officesLoading ? 'Loading offices...' : 'Select office'}</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="report-controls">
              <label className="label inline-flex items-center gap-1.5 dark:text-slate-400">
                <CalendarRange size={13} />
                Financial Year
              </label>
              <div className="relative">
                <CalendarRange size={15} className="field-icon" />
                <select
                  value={activeFY ?? ''}
                  onChange={(e) => setSelectedFY(parseInt(e.target.value, 10))}
                  className="input dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 disabled:opacity-50"
                  disabled={!officeId}
                >
                  <option value="">Select FY</option>
                  {(years || []).map((y) => (
                    <option key={y} value={y}>{y}-{String(y + 1).slice(-2)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="report-controls">
              <label className="label inline-flex items-center gap-1.5 dark:text-slate-400">
                <CalendarDays size={13} />
                Quarter
              </label>
              <div className="relative">
                <CalendarDays size={15} className="field-icon" />
                <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="input dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
                  <option value="Q1">Q1 (Apr-Jun)</option>
                  <option value="Q2">Q2 (Jul-Sep)</option>
                  <option value="Q3">Q3 (Oct-Dec)</option>
                  <option value="Q4">Q4 (Jan-Mar)</option>
                  {activeSub !== '24q' && <option value="Yearly">Yearly</option>}
                </select>
              </div>
            </div>
            <div className="report-controls">
              <label className="label inline-flex items-center gap-1.5 dark:text-slate-400">Actions</label>
              <div className="flex flex-col gap-2">
                <button onClick={() => window.print()} className="btn btn-primary w-full">
                  <Printer size={15} />
                  Print PDF
                </button>
                <button onClick={exportCSV} className="btn btn-outline w-full">
                  <Download size={15} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="payroll-tabs report-subtabs no-print animate-fade-in animate-fade-in-delay-2">
        <button
          onClick={() => { setActiveSub('24q'); setSelectedQuarter((q) => (q === 'Yearly' ? 'Q1' : q)); }}
          className={`payroll-tab ${activeSub === '24q' ? 'active' : ''}`}
        >
          <FileText size={15} />
          <span>24Q Employee Statement</span>
        </button>
        <button onClick={() => setActiveSub('gst')} className={`payroll-tab ${activeSub === 'gst' ? 'active' : ''}`}>
          <Receipt size={15} />
          <span>GST Report</span>
        </button>
        <button onClick={() => setActiveSub('it')} className={`payroll-tab ${activeSub === 'it' ? 'active' : ''}`}>
          <Landmark size={15} />
          <span>26Q Income Tax</span>
        </button>
      </div>

      {!officeId ? (
        <ReportEmptyState icon={Building2} message="Select an office to generate reports." hint="Pick an office from Report Controls to begin." />
      ) : activeSub === '24q' ? (
        quarterLoading ? (
          <ReportLoadingState label="Loading 24Q employee statement..." />
        ) : quarterReport && quarterReport.rows.length > 0 ? (
          <ReportPrintArea
            office={office}
            leftLabel="Tax Deduction No :-"
            leftValue={office.tan || 'SRTDO0979G'}
            rightMeta={<><span>Financial Year: {quarterReport.fyLabel} | Assessment Year: {quarterReport.ayLabel} | Period: {quarterReport.quarter} Ending</span></>}
            title="24Q Employee Salary & Tax Deduction Statement"
            badgeClass="report-badge-emp"
          >
            <QuarterReportView report={quarterReport} isLoading={false} showHeader={false} />
          </ReportPrintArea>
        ) : (
          <ReportEmptyState icon={FileText} message="No salary data for this office / period." hint="Try a different office, financial year or quarter." />
        )
      ) : activeSub === 'gst' ? (
        gstLoading ? (
          <ReportLoadingState label="Loading GST report..." />
        ) : gstReport && gstReport.rows.length > 0 ? (
          <ReportPrintArea
            office={office}
            leftLabel="GSTIN NO :-"
            leftValue={office.gst || '24SRTD00979G1DD'}
            rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {gstReport.quarter} | Office: {officeName}</span></>}
            title="GST TDS STATEMENT SUMMARY REPORT"
            badgeClass="report-badge-gst"
          >
            <div className="overflow-x-auto">
              <table className="report-table">
                <thead>
                  <tr><th>Sr. No.</th><th>GST No.</th><th>CPIN No</th><th style={{ textAlign: 'left' }}>Party Name</th><th>Bill No</th><th>Date</th><th>Amount</th><th>SGST</th><th>CGST</th><th>IGST</th><th>Total GST</th></tr>
                </thead>
                <tbody>
                  {gstReport.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{row.gstNo}</td>
                      <td className="font-bold">{row.cpinNo}</td>
                      <td className="font-bold" style={{ textAlign: 'left' }}>{row.partyName}</td>
                      <td>{row.billNo}</td>
                      <td>{row.date}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.sgst)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.cgst)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.igst)}</td>
                      <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(row.totalGst)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={7} style={{ textAlign: 'right' }}>Grand Total</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.sgst)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.cgst)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.igst)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.totalGst)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </ReportPrintArea>
        ) : (
          <ReportEmptyState icon={Receipt} message="No GST data for this office / period." hint="Try a different office, financial year or quarter." />
        )
      ) : itLoading ? (
        <ReportLoadingState label="Loading Income Tax report..." />
      ) : itReport && itReport.rows.length > 0 ? (
        <ReportPrintArea
          office={office}
          leftLabel="TAN NO :-"
          leftValue={office.tan || 'SRTDO0979G'}
          rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {itReport.quarter} | Office: {officeName}</span></>}
          title="26Q OTHER THAN SALARY STATEMENT"
          badgeClass="report-badge-it"
        >
          <div className="overflow-x-auto">
            <table className="report-table">
              <thead>
                <tr><th>Sr. No.</th><th style={{ textAlign: 'left' }}>Party Name</th><th>Bill No</th><th>Settlement Date</th><th>Amount</th><th>PAN No.</th><th>Income Tax (TDS)</th></tr>
              </thead>
              <tbody>
                {itReport.rows.map((row, idx) => (
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
                  <td colSpan={6} style={{ textAlign: 'right' }}>Grand Total</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(itReport.totals.incomeTax)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </ReportPrintArea>
      ) : (
        <ReportEmptyState icon={Landmark} message="No Income Tax data for this office / period." hint="Try a different office, financial year or quarter." />
      )}
    </div>
  );
}

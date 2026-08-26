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
import { useOfficeFinancialYears } from '../hooks/useAdmin';
import {
  useReportOfficeDetails,
  useQuarterReport,
  useGSTReport,
  useIncomeTaxReport,
} from '../hooks/useAdminReports';
import { QuarterReportSection } from './reports/QuarterReportSection';
import { GSTReportSection } from './reports/GSTReportSection';
import { IncomeTaxReportSection } from './reports/IncomeTaxReportSection';
import { EmptyState } from '@/shared/components/EmptyState';
import { downloadCsv } from '@/shared/utilities';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import type { Office } from '../types';
import '../styles/reports.css';

type ReportSub = '24q' | 'gst' | 'it';

interface AdminReportsProps {
  offices: Office[];
  officesLoading: boolean;
  officeId: string;
  onOfficeIdChange: (officeId: string) => void;
}

export function AdminReports({ offices, officesLoading, officeId, onOfficeIdChange }: AdminReportsProps) {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [activeSub, setActiveSub] = useState<ReportSub>('24q');

  const { data: years } = useOfficeFinancialYears(officeId || null);
  const { data: officeDetails } = useReportOfficeDetails(officeId || null);
  const activeFY = selectedFY ?? (years && years.length > 0 ? years[0] : null);

  const { data: quarterReport, isLoading: quarterLoading } = useQuarterReport(
    officeId || null,
    activeSub === '24q' ? selectedQuarter : null,
    activeFY
  );
  const { data: gstReport, isLoading: gstLoading } = useGSTReport(
    officeId || null,
    activeSub === 'gst' ? selectedQuarter : null,
    activeFY
  );
  const { data: itReport, isLoading: itLoading } = useIncomeTaxReport(
    officeId || null,
    activeSub === 'it' ? selectedQuarter : null,
    activeFY
  );

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };
  const fyLabel = activeFY != null ? `${activeFY}-${String(activeFY + 1).slice(-2)}` : '-';
  const officeName = offices.find((o) => o.id === officeId)?.name || '';

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
                  onChange={(e) => setSelectedFY(e.target.value === '' ? null : parseInt(e.target.value, 10))}
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
                <button
                  onClick={() => {
                    const el = document.querySelector('.report-print-area') as HTMLElement | null;
                    if (el) {
                      popupNativePrint({
                        elements: [el],
                        title: `${activeSub.toUpperCase()}_Report_${officeName || 'Office'}`,
                        pageSize: 'A4',
                        orientation: activeSub === '24q' ? 'landscape' : 'portrait',
                        pageContainerSelector: '.report-print-area',
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="btn btn-primary w-full"
                >
                  <Printer size={15} />
                  Print
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
        <div className="card animate-fade-in"><EmptyState className="card-body" icon={Building2} title="Select an office to generate reports." hint="Pick an office from Report Controls to begin." /></div>
      ) : activeSub === '24q' ? (
        <QuarterReportSection office={office} report={quarterReport} isLoading={quarterLoading} />
      ) : activeSub === 'gst' ? (
        <GSTReportSection office={office} report={gstReport} isLoading={gstLoading} officeName={officeName} fyLabel={fyLabel} />
      ) : (
        <IncomeTaxReportSection office={office} report={itReport} isLoading={itLoading} officeName={officeName} fyLabel={fyLabel} />
      )}
    </div>
  );
}

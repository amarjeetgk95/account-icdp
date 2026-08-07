import { useState } from 'react';
import { useUIStore } from '@/core/stores/ui-store';
import { payrollService } from '../services/payroll.service';
import { useRoster, useSaveSalary, useQuarterReport, useMonthDataCheck } from '../hooks/usePayroll';
import { SalaryEntryGrid } from '../components/SalaryEntryGrid';
import { QuarterReportView } from '../components/QuarterReport';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { PreviewModal } from '@/shared/components/PreviewModal';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { downloadCsv } from '@/shared/utilities';
import { ChevronDown, Download, FileText, FileImage } from 'lucide-react';

type Mode = 'entry' | 'report';

export function PayrollPage() {
  const [mode, setMode] = useState<Mode>('entry');
  const [selectedMonth, setSelectedMonth] = useState(() => payrollService.getEntryMonth());
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showDA, setShowDA] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fy = useUIStore((state) => state.activeFinancialYear);
  const monthOptions = payrollService.getMonthOptions(fy);

  const { data: roster = [], isLoading: rosterLoading } = useRoster(selectedMonth);
  const { data: monthDataCheck } = useMonthDataCheck(selectedMonth);
  const saveSalary = useSaveSalary();
  const { data: quarterReport, isLoading: reportLoading } = useQuarterReport(selectedQuarter);
  const { details: officeDetails } = useOfficeDetails();

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const hasExistingData = monthDataCheck && monthDataCheck.count > 0;

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setShowMonthDropdown(false);
  };

  const handleAutoFillToggle = (checked: boolean) => {
    setShowAutoFill(checked);
  };

  const export24QCSV = () => {
    if (!quarterReport || quarterReport.rows.length === 0) return;
    downloadCsv(
      `24Q_${fyLabel}_${selectedQuarter}.csv`,
      ['Sr', 'Name', 'PAN No.', 'M1_Gross', 'M2_Gross', 'M3_Gross', 'DA_Other', 'Total_Salary', 'M1_Tax', 'M2_Tax', 'M3_Tax', 'Total_Tax'],
      quarterReport.rows.map((row, idx) => [
        idx + 1,
        row.name,
        row.pan,
        row.g[0],
        row.g[1],
        row.g[2],
        row.d,
        row.total,
        row.t[0],
        row.t[1],
        row.t[2],
        row.tax,
      ])
    );
  };

  const exportPDF = () => {
    setShowPreview(true);
  };

  const handleSave = async (entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>) => {
    setSaveStatus({ type: 'info', message: 'Saving...' });
    try {
      const result = await saveSalary.mutateAsync({ month: selectedMonth, entries });
      setSaveStatus({ type: 'success', message: result });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save' });
    }
  };

  const getMonthDisplay = (month: string) => {
    const option = monthOptions.find((m) => m.value === month);
    return option ? option.label : month;
  };

  const getCurrentQuarterMonths = () => {
    const quarterMap: Record<string, string[]> = {
      Q1: ['April', 'May', 'June'],
      Q2: ['July', 'August', 'September'],
      Q3: ['October', 'November', 'December'],
      Q4: ['January', 'February', 'March'],
    };
    return quarterMap[selectedQuarter] || quarterMap.Q1;
  };

  const quarterMonths = getCurrentQuarterMonths();
  const y1 = String(fy).slice(-2);
  const y2 = String(fy + 1).slice(-2);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Entry</h1>
          <p className="page-subtitle">Enter monthly salary data and generate 24Q quarterly reports</p>
        </div>
      </div>

      <div className="step-nav">
        <button
          onClick={() => setMode('entry')}
          className={"step-link " + (mode === 'entry' ? 'active' : '')}
        >
          <span className="step-num">1</span> Monthly Entry
        </button>
        <button
          onClick={() => setMode('report')}
          className={"step-link " + (mode === 'report' ? 'active' : '')}
        >
          <span className="step-num">2</span> Quarterly Report (24Q)
        </button>
      </div>

      {saveStatus && (
        <div
          className={
            'alert mb-4 ' +
            (saveStatus.type === 'success'
              ? 'alert-success'
              : saveStatus.type === 'error'
              ? 'alert-danger'
              : 'alert-info')
          }
        >
          {saveStatus.message}
        </div>
      )}

      {mode === 'entry' && (
        <div className="space-y-4">
          <div className="alert alert-info">
            Data entry lag: You are entering the previous month salary in the current month.
          </div>

          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="label">Financial Year</label>
                <div className="input bg-slate-50 text-center font-semibold">
                  {fy}-{y2}
                </div>
              </div>

              <div className="relative">
                <label className="label">Paying Month</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    className="input w-full flex items-center justify-between text-left"
                  >
                    <span>{getMonthDisplay(selectedMonth)}</span>
                    <ChevronDown size={16} />
                  </button>
                  {showMonthDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {monthOptions.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => handleMonthSelect(m.value)}
                          className={
                            'w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ' +
                            (selectedMonth === m.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700')
                          }
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">&nbsp;</label>
                <button className="btn btn-primary w-full">Load Roster</button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDA}
                  onChange={(e) => setShowDA(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-amber-700">DA & Other</label>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAutoFill}
                  onChange={(e) => handleAutoFillToggle(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Auto-fill with previous month</span>
              </label>
            </div>

            {hasExistingData && (
              <div className="mt-3 text-sm text-slate-600">
                Existing data for {getMonthDisplay(selectedMonth)}: {monthDataCheck.count} records found
              </div>
            )}
          </div>

          <div className="card p-4">
            <SalaryEntryGrid
              roster={roster}
              isLoading={rosterLoading}
              showDA={showDA}
              selectedMonth={selectedMonth}
              onSave={handleSave}
            />
          </div>
        </div>
      )}

      {mode === 'report' && (
        <div className="space-y-4">
          <div className="card p-4 no-print">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="label">Financial Year</label>
                <div className="input bg-slate-50 text-center font-semibold">
                  {fy}-{y2}
                </div>
              </div>

              <div>
                <label className="label">Quarter</label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="input"
                >
                  <option value="Q1">Q1 (Apr-Jun)</option>
                  <option value="Q2">Q2 (Jul-Sep)</option>
                  <option value="Q3">Q3 (Oct-Dec)</option>
                  <option value="Q4">Q4 (Jan-Mar)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button onClick={() => window.print()} className="btn btn-secondary w-full">
                  <FileText size={16} className="mr-1" /> Print PDF
                </button>
                <button onClick={export24QCSV} className="btn btn-outline w-full">
                  <Download size={16} className="mr-1" /> CSV
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={exportPDF} className="btn btn-outline w-full">
                  <FileImage size={16} className="mr-1" /> Preview
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-slate-600 mb-2 block">
                Period: {quarterMonths.map((m, i) => `${m} (${i === quarterMonths.length - 1 ? y2 : y1})`).join(', ')}
              </label>
              <div className="flex gap-2">
                {quarterMonths.map((m, i) => {
                  const monthYear = i === quarterMonths.length - 1 && selectedQuarter === 'Q4' ? y2 : y1;
                  return (
                    <span
                      key={m}
                      className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700"
                    >
                      {m}-{monthYear}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {reportLoading ? (
            <div className="flex justify-center py-12">
              <div className="spinner h-10 w-10"></div>
            </div>
          ) : quarterReport && quarterReport.rows.length > 0 ? (
            <ReportPrintArea
              office={office}
              leftLabel="Tax Deduction No.:-"
              leftValue={office.tan || 'SRTDO0979G'}
              rightMeta={
                <>
                  <span>
                    Financial Year: {quarterReport.fyLabel} | Assessment Year: {quarterReport.ayLabel} | Period: {quarterReport.quarter} Ending
                  </span>
                </>
              }
              title="24Q Employee Salary & Tax Deduction Statement"
              badgeClass="report-badge-emp"
            >
              <QuarterReportView report={quarterReport} isLoading={false} showHeader={false} />
            </ReportPrintArea>
          ) : (
            <div className="empty-state">
              <p>No salary data for this period.</p>
            </div>
          )}
        </div>
      )}

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="24Q Report Preview"
      >
        {reportLoading ? (
          <div className="flex justify-center py-12">
            <div className="spinner h-10 w-10"></div>
          </div>
        ) : quarterReport && quarterReport.rows.length > 0 ? (
          <ReportPrintArea
            office={office}
            leftLabel="Tax Deduction No.:-"
            leftValue={office.tan || 'SRTDO0979G'}
            rightMeta={
              <>
                <span>
                  Financial Year: {quarterReport.fyLabel} | Assessment Year: {quarterReport.ayLabel} | Period: {quarterReport.quarter} Ending
                </span>
              </>
            }
            title="24Q Employee Salary & Tax Deduction Statement"
            badgeClass="report-badge-emp"
          >
            <QuarterReportView report={quarterReport} isLoading={false} showHeader={false} />
          </ReportPrintArea>
        ) : (
          <div className="text-center py-12 text-slate-500">No data to preview.</div>
        )}
      </PreviewModal>
    </div>
  );
}

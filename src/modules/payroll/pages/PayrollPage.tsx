import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/core/stores/ui-store';
import { payrollService } from '../services/payroll.service';
import { useRoster, useSaveSalary, useQuarterReport, useMonthDataCheck, useClearMonth } from '../hooks/usePayroll';
import { SalaryEntryGrid, type SalaryEntryGridHandle } from '../components/SalaryEntryGrid';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import { QuarterReportView } from '../components/QuarterReport';
import { SalaryExcelImport } from '../components/SalaryExcelImport';
import { SalaryLookup } from '../components/SalaryLookup';
import type { ClassifiedSalaryRecord } from '../validation/salary.schema';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { PreviewModal } from '@/shared/components/PreviewModal';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { downloadCsv } from '@/shared/utilities';
import {
  ChevronDown,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Banknote,
  Users,
  Calendar,
} from 'lucide-react';

type Mode = 'entry' | 'report' | 'employees';

const TABS: { id: Mode; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'entry', label: 'Monthly Entry', icon: Banknote, description: 'Enter salary, DA, and tax for the selected month' },
  { id: 'report', label: 'Quarterly Report', icon: FileText, description: 'Generate 24Q TDS reports for compliance' },
  { id: 'employees', label: 'Employee Registration', icon: Users, description: 'Add, edit, and manage employee master data' },
];

export function PayrollPage() {
  const [mode, setMode] = useState<Mode>('entry');
  const [selectedMonth, setSelectedMonth] = useState(() => payrollService.getEntryMonth());
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showDA, setShowDA] = useState(false);
  const [autoFill, setAutoFill] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const salaryGridRef = useRef<SalaryEntryGridHandle>(null);

  const fy = useUIStore((state) => state.activeFinancialYear);
  const monthOptions = payrollService.getMonthOptions(fy);

  const { data: roster = [], isLoading: rosterLoading, refetch: refetchRoster } = useRoster(selectedMonth);
  const { data: monthDataCheck } = useMonthDataCheck(selectedMonth);
  const saveSalary = useSaveSalary();
  const clearMonth = useClearMonth();
  const { data: quarterReport, isLoading: reportLoading } = useQuarterReport(selectedQuarter);
  const { details: officeDetails } = useOfficeDetails();

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const hasExistingData = monthDataCheck && monthDataCheck.count > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMonthDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setShowMonthDropdown(false);
    setAutoFill(false);
  };

  const handleAutoFillToggle = (checked: boolean) => {
    setAutoFill(checked);
  };

  const handleLoadRoster = () => {
    refetchRoster();
  };

  const handleImported = (records: ClassifiedSalaryRecord[]) => {
    const applied = salaryGridRef.current?.applyImportedValues(records) ?? 0;
    const monthName = getMonthDisplay(selectedMonth);
    const matched = records.filter((r) => r.status === 'matched').length;
    if (applied > 0) {
      setSaveStatus({
        type: 'success',
        message: `Imported ${matched} record${matched !== 1 ? 's' : ''} (all months saved). ${applied} placed into ${monthName} grid.`,
      });
    } else {
      setSaveStatus({
        type: 'info',
        message: `Imported ${matched} record${matched !== 1 ? 's' : ''}. No rows for ${monthName} FY ${fyLabel} — select a month present in the file to view them.`,
      });
    }
    setTimeout(() => setSaveStatus(null), 5000);
    setShowExcelImport(false);
  };

  const export24QCSV = () => {
    if (!quarterReport || quarterReport.rows.length === 0) return;
    downloadCsv(
      `24Q_${fyLabel}_${selectedQuarter}.csv`,
      [
        'Sr',
        'Name',
        'PAN No.',
        'M1_Gross',
        'M2_Gross',
        'M3_Gross',
        'DA_Other',
        'Total_Salary',
        'M1_Tax',
        'M2_Tax',
        'M3_Tax',
        'Total_Tax',
      ],
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
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save',
      });
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
    <div className="max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
      {saveStatus && (
        <div
          className={
            'alert mb-4 flex items-center gap-2 flex-shrink-0 ' +
            (saveStatus.type === 'success'
              ? 'alert-success'
              : saveStatus.type === 'error'
              ? 'alert-danger'
              : 'alert-info')
          }
        >
          {saveStatus.type === 'info' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : saveStatus.type === 'success' ? (
            <Banknote size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {saveStatus.message}
        </div>
      )}

      {/* Tab navigation */}
      <div className="payroll-tabs flex-shrink-0">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`payroll-tab ${mode === tab.id ? 'active' : ''}`}
              title={tab.description}
            >
              <TabIcon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {mode === 'employees' && (
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1"
        >
          <div className="px-1 pb-4 space-y-4">
            <SalaryLookup />
          </div>
          <EmployeeRegistration scrollRef={scrollRef} />
        </div>
      )}

      {mode === 'entry' && (
        <div className="flex-shrink-0 mb-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Left: FY badge + Month selector */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                <span className="fy-badge shrink-0">FY {fyLabel}</span>
              </div>

              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  title="Select the month for which you are entering salary data"
                  className="flex items-center gap-2 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <span>{getMonthDisplay(selectedMonth)}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showMonthDropdown && (
                  <div className="absolute z-50 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto py-1">
                      {monthOptions.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => handleMonthSelect(m.value)}
                          className={
                            'w-full px-3.5 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ' +
                            (selectedMonth === m.value
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-slate-700')
                          }
                        >
                          <span>{m.label}</span>
                          {selectedMonth === m.value && (
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 shrink-0 hidden sm:block" />

            {/* Center: Toggle switches */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none shrink-0" title="Show DA & Other column">
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showDA}
                    onChange={(e) => setShowDA(e.target.checked)}
                  />
                  <span className="toggle-slider toggle-amber" />
                </span>
                <span className="text-xs font-semibold text-slate-600">DA &amp; Other</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none shrink-0" title="Auto-fill from previous month data">
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoFill}
                    onChange={(e) => handleAutoFillToggle(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </span>
                <span className="text-xs font-semibold text-slate-600">Auto-fill</span>
              </label>
              <button
                type="button"
                onClick={() => setShowExcelImport(true)}
                className="btn btn-outline btn-sm text-xs shrink-0 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                title="Import salary data from an Excel file"
              >
                <FileSpreadsheet size={13} className="mr-1" />
                Excel Import
              </button>
            </div>

            {/* Right: Actions + record count */}
            <div className="flex items-center gap-2 ml-auto">
              {hasExistingData && (
                <span className="stat-pill shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {monthDataCheck.count} record{monthDataCheck.count > 1 ? 's' : ''}
                </span>
              )}

              <button
                onClick={handleLoadRoster}
                disabled={rosterLoading}
                className="btn btn-primary btn-sm text-xs shrink-0"
              >
                <RefreshCw size={13} className={rosterLoading ? 'animate-spin mr-1' : 'mr-1'} />
                {rosterLoading ? 'Loading…' : 'Load Roster'}
              </button>

              {hasExistingData && (
                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Clear ALL salary entries for ${getMonthDisplay(selectedMonth)}? This cannot be undone.`
                      )
                    ) {
                      try {
                        await clearMonth.mutateAsync(selectedMonth);
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Failed to clear month');
                      }
                    }
                  }}
                  disabled={clearMonth.isPending}
                  className="btn btn-outline btn-sm text-xs shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                  title="Delete all saved salary entries for the selected month"
                >
                  {clearMonth.isPending ? 'Clearing…' : 'Clear All'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'report' && (
        <div className="flex-shrink-0 mb-3 flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-slate-400" />
            <span className="text-[0.72rem] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 shrink-0">
              FY {fyLabel}
            </span>
          </div>

          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-[0.82rem] font-semibold text-slate-800 bg-white shrink-0"
          >
            <option value="Q1">Q1 (Apr-Jun)</option>
            <option value="Q2">Q2 (Jul-Sep)</option>
            <option value="Q3">Q3 (Oct-Dec)</option>
            <option value="Q4">Q4 (Jan-Mar)</option>
          </select>

          <span className="text-[0.82rem] text-slate-500 shrink-0">
            {quarterMonths.map((m, i) => `${m}-${i === quarterMonths.length - 1 && selectedQuarter === 'Q4' ? y2 : y1}`).join(', ')}
          </span>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button onClick={() => window.print()} className="btn btn-secondary btn-sm text-[0.82rem]">
              <FileText size={14} className="mr-1" /> Print
            </button>
            <button
              onClick={export24QCSV}
              disabled={!quarterReport || quarterReport.rows.length === 0}
              className="btn btn-outline btn-sm text-[0.82rem]"
            >
              <Download size={14} className="mr-1" /> CSV
            </button>
            <button
              onClick={exportPDF}
              disabled={!quarterReport || quarterReport.rows.length === 0}
              className="btn btn-outline btn-sm text-[0.82rem]"
            >
              <FileImage size={14} className="mr-1" /> Preview
            </button>
          </div>
        </div>
      )}

      {mode === 'entry' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="card flex-1 flex flex-col overflow-hidden contain-none min-h-0 rounded-xl">
            <div className="card-body p-0 flex-1 overflow-hidden min-h-0">
              <SalaryEntryGrid
                key={`${fy}-${selectedMonth}`}
                ref={salaryGridRef}
                roster={roster}
                isLoading={rosterLoading}
                showDA={showDA}
                selectedMonth={selectedMonth}
                autoFill={autoFill}
                onSave={handleSave}
              />
            </div>
          </div>
        </div>
      )}

      {mode === 'report' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="card flex-1 flex flex-col overflow-hidden contain-none min-h-0 rounded-xl">
            <div className="card-header no-print flex-shrink-0 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-400" />
                <h2 className="font-semibold text-slate-800">24Q Report Preview</h2>
              </div>
            </div>
            <div className="card-body overflow-y-auto flex-1 p-4">
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
                        Financial Year: {quarterReport.fyLabel} | Assessment Year: {quarterReport.ayLabel}{' '}
                        | Period: {quarterReport.quarter} Ending
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
                  <p className="text-xs text-slate-400 mt-1">
                    Switch to Monthly Entry to add salary data first.
                  </p>
                </div>
              )}
            </div>
          </div>
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
                  Financial Year: {quarterReport.fyLabel} | Assessment Year: {quarterReport.ayLabel} | Period:{' '}
                  {quarterReport.quarter} Ending
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

      <PreviewModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        title="Excel Salary Import"
      >
        <SalaryExcelImport onImported={handleImported} />
      </PreviewModal>
    </div>
  );
}

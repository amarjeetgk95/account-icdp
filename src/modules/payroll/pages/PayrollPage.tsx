import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/core/stores/ui-store';
import { payrollService } from '../services/payroll.service';
import { useRoster, useSaveSalary, useQuarterReport, useMonthDataCheck, useClearMonth } from '../hooks/usePayroll';
import { SalaryEntryGrid, type SalaryEntryGridHandle } from '../components/SalaryEntryGrid';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import { QuarterReportView } from '../components/QuarterReport';
import { SalaryExcelImport } from '../components/SalaryExcelImport';
import { SalaryLookup } from '../components/SalaryLookup';
import { BudgetHeadManager } from '../components/BudgetHeadManager';
import { BudgetHeadReport } from '../components/BudgetHeadReport';
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
  Landmark,
} from 'lucide-react';

type Mode = 'entry' | 'report' | 'employees' | 'budget';

const TABS: { id: Mode; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'entry', label: 'Monthly Entry', icon: Banknote, description: 'Enter salary, DA, and tax for the selected month' },
  { id: 'report', label: 'Quarterly Report', icon: FileText, description: 'Generate 24Q TDS reports for compliance' },
  { id: 'budget', label: 'Budget Head Report', icon: Landmark, description: 'Manage budget heads and view head-wise salary statements' },
  { id: 'employees', label: 'Employee Registration', icon: Users, description: 'Add, edit, and manage employee master data' },
];

export function PayrollPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'employees' ? 'employees' : 'entry';
  const initialHrpn = searchParams.get('hrpn') || '';
  const [mode, setMode] = useState<Mode>(initialTab);
  const [selectedMonth, setSelectedMonth] = useState(() => payrollService.getEntryMonth());
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showDA, setShowDA] = useState(false);
  const [autoFill, setAutoFill] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isGridDirty, setIsGridDirty] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const salaryGridRef = useRef<SalaryEntryGridHandle>(null);

  const fy = useUIStore((state) => state.activeFinancialYear);
  const monthOptions = payrollService.getMonthOptions(fy);

  const { data: roster = [], isLoading: rosterLoading, refetch: refetchRoster } = useRoster(selectedMonth, fy);
  const { data: monthDataCheck } = useMonthDataCheck(selectedMonth, fy);
  const saveSalary = useSaveSalary();
  const clearMonth = useClearMonth();
  const { data: quarterReport, isLoading: reportLoading } = useQuarterReport(selectedQuarter, fy);
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
    if (month === selectedMonth) {
      setShowMonthDropdown(false);
      return;
    }
    if (
      isGridDirty &&
      !window.confirm(
        `You have unsaved changes in ${getMonthDisplay(selectedMonth)}. Switch to ${getMonthDisplay(month)} anyway? Your edits are kept as a draft.`
      )
    ) {
      return;
    }
    setSelectedMonth(month);
    setShowMonthDropdown(false);
    setAutoFill(false);
    setIsGridDirty(false);
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
      const result = await saveSalary.mutateAsync({ month: selectedMonth, entries, fy });
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
    <div className="w-full h-full flex flex-col overflow-hidden">
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
      <div className="payroll-tabs flex-shrink-0 mb-2.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl flex border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-x-auto">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
              title={tab.description}
            >
              <TabIcon size={14} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
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
            <SalaryLookup fy={fy} initialHrpn={initialHrpn} />
          </div>
          <EmployeeRegistration scrollRef={scrollRef} fy={fy} />
        </div>
      )}

      {mode === 'budget' && (
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
          <div className="px-1 pb-4 space-y-4">
            <BudgetHeadManager />
            <BudgetHeadReport fy={fy} />
          </div>
        </div>
      )}

      {mode === 'entry' && (
        <div className="w-full flex-shrink-0 mb-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-xs">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            {/* Left Controls: FY badge + Month Select Dropdown */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                <Calendar size={15} className="text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">FY {fyLabel}</span>
              </div>

              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  title="Select the month for salary entry"
                  className="flex items-center gap-2.5 border border-slate-200 dark:border-slate-700 rounded-full px-5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer"
                >
                  <span>{getMonthDisplay(selectedMonth)}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showMonthDropdown && (
                  <div className="absolute left-0 z-50 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto py-1">
                      {monthOptions.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => handleMonthSelect(m.value)}
                          className={
                            'w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ' +
                            (selectedMonth === m.value
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-700 dark:text-slate-200')
                          }
                        >
                          <span>{m.label}</span>
                          {selectedMonth === m.value && (
                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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

            {/* Right Action Controls: Toggles + Increased Excel Import button + Roster buttons */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none shrink-0" title="Show DA & Other column">
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showDA}
                    onChange={(e) => setShowDA(e.target.checked)}
                  />
                  <span className="toggle-slider toggle-amber" />
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">DA &amp; Other</span>
              </label>

              <label
                className="flex items-center gap-2 cursor-pointer select-none shrink-0"
                title="When ON, empty salary cells are automatically filled from previous month data"
              >
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoFill}
                    onChange={(e) => handleAutoFillToggle(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto-fill Prev</span>
              </label>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0 hidden sm:block" />

              {/* Prominent, Expanded Excel Import Button */}
              <button
                type="button"
                onClick={() => setShowExcelImport(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <FileSpreadsheet size={16} />
                <span>Import Excel Salary Sheet</span>
              </button>

              <button
                onClick={handleLoadRoster}
                disabled={rosterLoading}
                className="btn btn-primary btn-md text-xs shrink-0"
              >
                <RefreshCw size={14} className={rosterLoading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
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
                        await clearMonth.mutateAsync({ month: selectedMonth, fy });
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Failed to clear month');
                      }
                    }
                  }}
                  disabled={clearMonth.isPending}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
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
        <div className="flex-shrink-0 mb-3 flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-slate-400 dark:text-slate-500" />
            <span className="fy-badge shrink-0">FY {fyLabel}</span>
          </div>

          {/* Segmented Quarter Selector Buttons */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedQuarter === q
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">
            ({quarterMonths.map((m, i) => `${m}-${i === quarterMonths.length - 1 && selectedQuarter === 'Q4' ? y2 : y1}`).join(', ')})
          </span>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={export24QCSV}
              disabled={!quarterReport || quarterReport.rows.length === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Download size={14} />
              <span>CSV</span>
            </button>
            <button
              onClick={exportPDF}
              disabled={!quarterReport || quarterReport.rows.length === 0}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <FileImage size={14} />
              <span>Preview</span>
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
                fy={fy}
                onSave={handleSave}
                onDirtyChange={setIsGridDirty}
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

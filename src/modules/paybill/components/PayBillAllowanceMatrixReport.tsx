import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Printer,
  RefreshCw,
  CalendarDays,
  Landmark,
  Upload,
} from 'lucide-react';
import { paybillReportService, PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import { paybillExcelService } from '../services/paybillExcel.service';
import { paybillPdfService } from '../services/paybillPdf.service';
import { paybillRepository } from '../repositories/paybill.repository';
import { orderItems } from '../utils/columnOrder';
import { PbButton, PbPanel } from './ui';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import type { PayBillMonthlyEmployeeMatrixReport, PayBillMonthlyMatrixColumn } from '../types';

interface PayBillAllowanceMatrixReportProps {
  financialYear: number;
  onOpenUploadModal?: () => void;
  refreshTrigger?: number;
}

const MONTH_OPTIONS = [
  'April', 'May', 'June',
  'July', 'August', 'September',
  'October', 'November', 'December',
  'January', 'February', 'March',
];

function defaultMonthForFy(financialYear: number): string {
  const now = new Date();
  const monthIdx = now.getMonth(); // 0 = January
  const currentFy = monthIdx >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  if (currentFy !== financialYear) return 'April';
  return MONTH_OPTIONS[monthIdx >= 3 ? monthIdx - 3 : monthIdx + 9];
}

export function PayBillAllowanceMatrixReport({
  financialYear,
  onOpenUploadModal,
  refreshTrigger = 0,
}: PayBillAllowanceMatrixReportProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => defaultMonthForFy(financialYear));
  const [report, setReport] = useState<PayBillMonthlyEmployeeMatrixReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualAllowances, setManualAllowances] = useState<string[]>([]);
  const [manualDeductions, setManualDeductions] = useState<string[]>([]);
  const [earningColumnOrder, setEarningColumnOrder] = useState<string[]>([]);
  const [deductionColumnOrder, setDeductionColumnOrder] = useState<string[]>([]);
  const [manualValues, setManualValues] = useState<
    Record<string, Record<string, Record<string, number>>>
  >({});

  // Load manual parameter config & manually entered values (async callbacks only)
  useEffect(() => {
    let cancelled = false;
    Promise.all([paybillRepository.getSettings(), paybillRepository.getManualLedgerValues()])
      .then(([settings, manualVals]) => {
        if (cancelled) return;
        setManualAllowances(settings.manualAllowances || []);
        setManualDeductions(settings.manualDeductions || []);
        setEarningColumnOrder(settings.earningColumnOrder || []);
        setDeductionColumnOrder(settings.deductionColumnOrder || []);
        setManualValues(manualVals);
      })
      .catch((err) => {
        console.error('[PayBillAllowanceMatrixReport] settings load error:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  // Manual allowance columns come before Gross Amt so they count into the earning total;
  // manual deduction columns come before Total Deductions / Net Pay so they count into deductions.
  const earningCols = useMemo<PayBillMonthlyMatrixColumn[]>(() => {
    const regular = PAYBILL_EARNING_COLUMNS.filter((c) => c.key !== 'grossAmount');
    const manual = manualAllowances.map((l) => ({
      key: `manual::${l}`,
      label: l,
      group: 'EARNING' as const,
    }));
    const grossCol = PAYBILL_EARNING_COLUMNS.find((c) => c.key === 'grossAmount') as PayBillMonthlyMatrixColumn;
    return orderItems([...regular, ...manual], earningColumnOrder, ['grossAmount']).concat(grossCol);
  }, [manualAllowances, earningColumnOrder]);

  const deductionCols = useMemo<PayBillMonthlyMatrixColumn[]>(() => {
    const regular = PAYBILL_DEDUCTION_COLUMNS.filter(
      (c) => c.key !== 'totalDeductions' && c.key !== 'netPay'
    );
    const manual = manualDeductions.map((l) => ({
      key: `manual::${l}`,
      label: l,
      group: 'DEDUCTION' as const,
    }));
    const totalCol = PAYBILL_DEDUCTION_COLUMNS.find((c) => c.key === 'totalDeductions') as PayBillMonthlyMatrixColumn;
    const netCol = PAYBILL_DEDUCTION_COLUMNS.find((c) => c.key === 'netPay') as PayBillMonthlyMatrixColumn;
    return orderItems([...regular, ...manual], deductionColumnOrder, ['totalDeductions', 'netPay']).concat(
      totalCol,
      netCol
    );
  }, [manualDeductions, deductionColumnOrder]);

  const allCols = useMemo(() => [...earningCols, ...deductionCols], [earningCols, deductionCols]);

  const manualValueFor = (hrpn: string, label: string): number =>
    Number(manualValues[hrpn]?.[label]?.[selectedMonth] ?? 0);

  const manualSumFor = (hrpn: string, labels: string[]): number =>
    labels.reduce((s, l) => s + manualValueFor(hrpn, l), 0);

  const manualAllowanceSumFor = (hrpn: string): number => manualSumFor(hrpn, manualAllowances);
  const manualDeductionSumFor = (hrpn: string): number => manualSumFor(hrpn, manualDeductions);

  const manualColTotal = (label: string): number =>
    (report?.rows ?? []).reduce((sum, row) => sum + manualValueFor(row.hrpn, label), 0);

  const cellValueFor = (row: PayBillMonthlyEmployeeMatrixReport['rows'][number], col: PayBillMonthlyMatrixColumn): number => {
    if (col.key.startsWith('manual::')) return manualValueFor(row.hrpn, col.label);
    if (col.key === 'grossAmount') return row.values.grossAmount + manualAllowanceSumFor(row.hrpn);
    if (col.key === 'totalDeductions') return row.values.totalDeductions + manualDeductionSumFor(row.hrpn);
    if (col.key === 'netPay')
      return row.values.netPay + manualAllowanceSumFor(row.hrpn) - manualDeductionSumFor(row.hrpn);
    return row.values[col.key] ?? 0;
  };

  const manualColSum = (labels: string[]): number =>
    (report?.rows ?? []).reduce((sum, row) => sum + manualSumFor(row.hrpn, labels), 0);

  const totalValueFor = (col: PayBillMonthlyMatrixColumn): number => {
    if (col.key.startsWith('manual::')) return manualColTotal(col.label);
    if (col.key === 'grossAmount') return (report?.totals.grossAmount ?? 0) + manualColSum(manualAllowances);
    if (col.key === 'totalDeductions')
      return (report?.totals.totalDeductions ?? 0) + manualColSum(manualDeductions);
    if (col.key === 'netPay')
      return (report?.totals.netPay ?? 0) + manualColSum(manualAllowances) - manualColSum(manualDeductions);
    return report?.totals[col.key] ?? 0;
  };

  const loadReport = async () => {
    setLoadError(null);
    try {
      const data = await paybillReportService.getMonthlyEmployeeMatrix(financialYear, selectedMonth);
      setReport(data);
    } catch (err) {
      console.error('[PayBillAllowanceMatrixReport] load error:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load the matrix report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const data = await paybillReportService.getMonthlyEmployeeMatrix(financialYear, selectedMonth);
        if (!cancelled) setReport(data);
      } catch (err) {
        console.error('[PayBillAllowanceMatrixReport] load error:', err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load the matrix report.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [financialYear, selectedMonth, refreshTrigger]);

  const formatInr = (n: number | undefined) => {
    if (n === undefined || n === null || isNaN(n)) return '₹0';
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  };

  const handleExportCsv = () => {
    if (report) {
      paybillReportService.exportMonthlyMatrixCsv(report);
    }
  };

  const handleExportPdf = () => {
    if (report && report.rows.length > 0) {
      paybillPdfService.exportMonthlyEmployeeMatrixPdf(report);
    }
  };

  const handlePrint = () => {
    const tableEl = document.querySelector('.space-y-4') as HTMLElement | null;
    if (tableEl) {
      popupNativePrint({
        elements: [tableEl],
        title: `PayBill_Matrix_${selectedMonth}_${financialYear}`,
        pageSize: 'A4',
        orientation: 'landscape',
      });
    } else {
      window.print();
    }
  };

  const fyLabel = `${financialYear}-${String(financialYear + 1).slice(-2)}`;
  const employeeCount = report?.rows.length ?? 0;
  const tableColSpan = 1 + allCols.length;

  const yearFor = (m: string) =>
    m === 'April' ? financialYear : m === 'January' || m === 'February' || m === 'March' ? financialYear + 1 : financialYear;

  return (
    <div className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <PbPanel
        icon={Landmark}
        iconClass="bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm"
        title="Pay Bill Allowance Matrix Report"
        actions={
          <>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} {yearFor(m)}
                  </option>
                ))}
              </select>
            </div>

            {onOpenUploadModal && (
              <PbButton variant="amber" icon={Upload} onClick={onOpenUploadModal} title="Upload Pay Bill PDF">
                Upload
              </PbButton>
            )}

            <PbButton
              variant="ghost"
              icon={RefreshCw}
              onClick={() => {
                setIsLoading(true);
                loadReport();
              }}
              disabled={isLoading}
              className={isLoading ? 'animate-spin pointer-events-none' : ''}
              title="Refresh Report"
            />

            <PbButton
              variant="primary"
              icon={Download}
              onClick={async () => {
                if (report) {
                  await paybillExcelService.exportMonthlyEmployeeMatrixToExcel(report, fyLabel);
                }
              }}
              disabled={!report || report.rows.length === 0}
            >
              Export Excel (.xlsx)
            </PbButton>

            <PbButton
              variant="success"
              icon={Download}
              onClick={handleExportPdf}
              disabled={!report || report.rows.length === 0}
            >
              Export PDF
            </PbButton>

            <PbButton
              variant="success"
              icon={Download}
              onClick={handleExportCsv}
              disabled={!report || report.rows.length === 0}
            >
              CSV
            </PbButton>

            <PbButton variant="secondary" icon={Printer} onClick={handlePrint}>
              Print Report
            </PbButton>
          </>
        }
      />

      {/* Main Matrix Table */}
      <PbPanel
        className="overflow-hidden"
        padded={false}
        bodyClassName="flex flex-col"
        actions={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            <span>
              Employees: <span className="text-emerald-600 dark:text-emerald-400">{employeeCount}</span>
            </span>
            <span>
              Gross Total: <span className="text-emerald-600 dark:text-emerald-400">{formatInr(report?.totals.grossAmount)}</span>
            </span>
            <span>
              Net Pay Total: <span className="text-emerald-600 dark:text-emerald-400">{formatInr(report?.totals.netPay)}</span>
            </span>
          </div>
        }
      >
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Statement Period:</span>
          <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">
            {selectedMonth} {yearFor(selectedMonth)} &bull; FY {fyLabel}
          </span>
          <span className="ml-auto hidden sm:inline text-[0.68rem] text-slate-400 font-medium">
            All amounts in INR
          </span>
        </div>

        {loadError && (
          <div className="px-4 py-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
            <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              !
            </span>
            <div className="text-xs text-rose-700 dark:text-rose-300">
              <div className="font-bold">Employee data could not be loaded</div>
              <div className="mt-0.5 opacity-90">{loadError}</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto max-h-[560px] app-scroll">
          <table className="w-full text-xs text-left border-separate border-spacing-0">
              <thead className="text-slate-700 dark:text-slate-200 sticky top-0 z-30 shadow-sm font-sans">
                {/* Group Header Row */}
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90">
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 font-bold sticky left-0 bg-slate-100 dark:bg-slate-800 min-w-[190px] z-20 border-r border-b border-slate-200 dark:border-slate-700"
                  >
                    Employee
                  </th>
                  <th
                    colSpan={earningCols.length}
                    className="py-2 px-2.5 text-center font-extrabold text-blue-900 dark:text-blue-200 bg-blue-100/80 dark:bg-blue-950/60 border-r border-slate-200 dark:border-slate-700"
                  >
                    EARNING
                  </th>
                  <th
                    colSpan={deductionCols.length}
                    className="py-2 px-2.5 text-center font-extrabold text-rose-900 dark:text-rose-200 bg-rose-100/80 dark:bg-rose-950/40"
                  >
                    DEDUCTION
                  </th>
                </tr>
                {/* Parameter Label Row (vertical text) */}
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90">
                  {allCols.map((col) => (
                    <th
                      key={col.key}
                      className={`py-1.5 px-1 text-center font-semibold align-bottom min-w-[52px] max-w-[64px] border-r border-slate-200 dark:border-slate-700 ${
                        col.key === 'grossAmount'
                          ? 'text-blue-900 dark:text-blue-200'
                          : col.key === 'netPay'
                            ? 'text-emerald-900 dark:text-emerald-200'
                            : col.key === 'totalDeductions'
                              ? 'text-rose-900 dark:text-rose-200'
                              : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className="inline-block leading-tight"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[0.72rem]">
                {isLoading && (
                  <tr>
                    <td colSpan={tableColSpan} className="py-6 text-center">
                      <div className="inline-flex items-center gap-2 text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Loading matrix...
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading && (report?.rows ?? []).map((row) => (
                  <tr key={row.hrpn} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 sticky left-0 z-10 bg-white dark:bg-slate-900 font-sans border-r border-slate-100 dark:border-slate-800">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {row.employeeName}
                      </div>
                      <div className="text-[0.65rem] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {row.hrpn}
                        {row.designation ? `  •  ${row.designation}` : ''}
                      </div>
                    </td>
                    {allCols.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2 px-2.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap ${
                          col.key === 'grossAmount'
                            ? 'font-bold text-blue-700 dark:text-blue-300'
                            : col.key === 'netPay'
                              ? 'font-bold text-emerald-700 dark:text-emerald-300'
                              : col.key === 'totalDeductions'
                                ? 'font-bold text-rose-700 dark:text-rose-300'
                                : ''
                        }`}
                      >
                        {formatInr(cellValueFor(row, col))}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Totals Row */}
                {!isLoading && report && report.rows.length > 0 && (
                  <tr className="bg-slate-100/80 dark:bg-slate-800/60 font-sans">
                    <td className="py-2.5 px-3 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                      Total ({employeeCount} Employees)
                    </td>
                    {allCols.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2.5 px-2.5 text-right font-extrabold whitespace-nowrap ${
                          col.key === 'grossAmount'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
                            : col.key === 'netPay'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                              : col.key === 'totalDeductions'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
                                : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatInr(totalValueFor(col))}
                      </td>
                    ))}
                  </tr>
                )}

                {!isLoading && report && report.rows.length === 0 && (
                  <tr>
                    <td colSpan={tableColSpan} className="py-6 text-center text-slate-400 font-sans">
                      No imported pay bill data available for {selectedMonth}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </PbPanel>
    </div>
  );
}
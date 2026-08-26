import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw, Upload, User } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState';
import { PbButton } from '../ui';
import { useEmployeeDirectory } from '../../hooks/useEmployeeDirectory';
import { useEmployeeLedger } from '../../hooks/useEmployeeLedger';
import { useForm16Defaults } from '../../hooks/useForm16';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import {
  buildLedgerMatrixRows,
  computeAdjustedTotals,
  computeAnomalyMonths,
  computeManualMonthlySums,
  sumDeductionTotals,
  sumEarningsTotals,
} from './ledgerMath';
import type { LedgerMatrixRow, ManualValuesMap } from './ledgerMath';
import { useLedgerExport } from './hooks/useLedgerExport';
import { EmployeeDirectoryPanel } from './EmployeeDirectoryPanel';
import { LedgerHeaderCard } from './LedgerHeaderCard';
import { LedgerSummaryStrip } from './LedgerSummaryStrip';
import { LedgerMatrixTable } from './LedgerMatrixTable';
import { MonthDetailDrawer } from './MonthDetailDrawer';

const RECENT_HRPNS_KEY = 'paybill-ledger-recent-hrpns';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface EmployeeLedgerViewProps {
  financialYear: number;
  initialHrpn?: string | null;
}

export function EmployeeLedgerView({
  financialYear,
  initialHrpn = null,
}: EmployeeLedgerViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHrpn = searchParams.get('hrpn');
  const [pickedHrpn, setPickedHrpnState] = useState<string>(urlHrpn || initialHrpn || '');
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [drawerMonth, setDrawerMonth] = useState<string | null>(null);

  const setSelectedHrpn = useCallback(
    (hrpn: string) => {
      setPickedHrpnState(hrpn);
      const next = new URLSearchParams(searchParams);
      if (hrpn) next.set('hrpn', hrpn);
      else next.delete('hrpn');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Sync state when user navigates back/forward with a different ?hrpn=
  // (render-time adjustment pattern — no effect needed)
  const [lastUrlHrpn, setLastUrlHrpn] = useState(urlHrpn);
  if (urlHrpn !== lastUrlHrpn) {
    setLastUrlHrpn(urlHrpn);
    if (urlHrpn !== null && urlHrpn !== pickedHrpn) setPickedHrpnState(urlHrpn);
  }

  // Record a recently-viewed employee (persisted locally, max 5).
  // Read-side lives in EmployeeDirectoryPanel, which resolves recents on open.
  const trackRecent = useCallback((hrpn: string) => {
    if (!hrpn) return;
    try {
      const raw = localStorage.getItem(RECENT_HRPNS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const prev: string[] = Array.isArray(parsed)
        ? parsed.filter((h) => typeof h === 'string')
        : [];
      const next = [hrpn, ...prev.filter((h) => h !== hrpn)].slice(0, 5);
      if (next.join('|') === prev.join('|')) return;
      localStorage.setItem(RECENT_HRPNS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const selectEmployee = useCallback(
    (hrpn: string) => {
      setSelectedHrpn(hrpn);
      trackRecent(hrpn);
      setDirectoryOpen(false);
    },
    [setSelectedHrpn, trackRecent]
  );

  const { employees, isLoading: directoryLoading, isError: directoryIsError, error: directoryError, refetch: refetchDirectory } =
    useEmployeeDirectory(financialYear);

  // Effective selection: explicit pick (state/URL) or first known employee. Derived.
  const selectedHrpn = pickedHrpn || employees[0]?.hrpn || '';

  const {
    earnings,
    deductions,
    settings,
    manualValues,
    prevYearAgg,
    isLoading: ledgerLoading,
    isError: ledgerIsError,
    error: ledgerError,
    refetchAll,
  } = useEmployeeLedger(financialYear, selectedHrpn || null);

  // Full-viewport layout: cap the ledger to the visible main area so only the
  // table region scrolls — no nested page + panel scrollbars.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [maxAreaH, setMaxAreaH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      const el = rootRef.current;
      if (!el) return;
      const scroller = el.closest('.app-scroll') as HTMLElement | null;
      const scrollerRect = scroller?.getBoundingClientRect();
      const top = el.getBoundingClientRect().top;
      const visibleTop = scrollerRect ? Math.max(top, scrollerRect.top) : top;
      const bottom = scrollerRect ? scrollerRect.bottom : window.innerHeight;
      const h = Math.floor(bottom - visibleTop - 24);
      setMaxAreaH(h >= 360 ? h : null);
    };
    update();
    window.addEventListener('resize', update);
    const RO = typeof ResizeObserver !== 'undefined' ? ResizeObserver : null;
    const ro = RO ? new RO(update) : null;
    if (ro && rootRef.current) ro.observe(rootRef.current);
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, []);

  const isLoading = directoryLoading || ledgerLoading;
  // First failing query wins (directory, then earnings/deductions/config).
  const firstError = directoryError ?? ledgerError;
  const errorText =
    directoryIsError || ledgerIsError
      ? firstError instanceof Error && firstError.message
        ? firstError.message
        : 'Could not load employee ledger data.'
      : null;

  const refetchEverything = () => {
    void refetchAll();
    void refetchDirectory();
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PAYBILL_LEGACY_SAVED') {
        void refetchAll();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetchAll]);

  const manualAllowances = useMemo(
    () =>
      settings?.manualAllowances && settings.manualAllowances.length > 0
        ? settings.manualAllowances
        : ['Pay Difference', 'DA Difference'],
    [settings]
  );
  const manualDeductions = useMemo(() => settings?.manualDeductions || [], [settings]);
  const earningColumnOrder = useMemo(() => settings?.earningColumnOrder || [], [settings]);
  const deductionColumnOrder = useMemo(() => settings?.deductionColumnOrder || [], [settings]);

  const empManualValues = useMemo<ManualValuesMap[string]>(
    () => manualValues[selectedHrpn] || {},
    [manualValues, selectedHrpn]
  );

  const manualMonthlySums = useMemo(
    () => computeManualMonthlySums(empManualValues, manualAllowances, manualDeductions),
    [empManualValues, manualAllowances, manualDeductions]
  );

  // Per-employee rows for the matrix (scoped queries keep this O(selected employee))
  const employeeEarnings = useMemo(
    () => earnings.filter((e) => (e.hrpn || '').trim() === selectedHrpn.trim()),
    [earnings, selectedHrpn]
  );
  const employeeDeductions = useMemo(
    () => deductions.filter((d) => (d.hrpn || '').trim() === selectedHrpn.trim()),
    [deductions, selectedHrpn]
  );

  const ledgerMatrixRows = useMemo<LedgerMatrixRow[]>(
    () =>
      buildLedgerMatrixRows({
        earnings: employeeEarnings,
        deductions: employeeDeductions,
        manualAllowances,
        manualDeductions,
        empManualValues,
        earningColumnOrder,
        deductionColumnOrder,
      }),
    [
      employeeEarnings,
      employeeDeductions,
      manualAllowances,
      manualDeductions,
      empManualValues,
      earningColumnOrder,
      deductionColumnOrder,
    ]
  );

  // Anomalous months: zero gross (missing salary run) or negative net pay (over-deduction)
  const anomalyMonths = useMemo(() => computeAnomalyMonths(ledgerMatrixRows), [ledgerMatrixRows]);

  const annualEarningsTotals = useMemo(() => sumEarningsTotals(employeeEarnings), [employeeEarnings]);
  const annualDeductionTotals = useMemo(
    () => sumDeductionTotals(employeeDeductions),
    [employeeDeductions]
  );

  const fyLabel = `${financialYear}-${String(financialYear + 1).slice(-2)}`;
  const prevFyLabel = `${financialYear - 1}-${String(financialYear).slice(-2)}`;

  const { adjustedGross, adjustedTotalDeductions, netPayTotal } = computeAdjustedTotals(
    annualEarningsTotals,
    annualDeductionTotals,
    manualMonthlySums
  );
  const incomeTaxTotal = annualDeductionTotals.incomeTax;

  // YoY delta hint text (only shown when previous-FY data exists for this employee)
  const yoyHint = (current: number, key: 'gross' | 'net'): string | null => {
    const prev = prevYearAgg.get(selectedHrpn)?.[key];
    if (prev == null || prev === 0 || !current) return null;
    const pct = ((current - prev) / Math.abs(prev)) * 100;
    return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% vs FY ${prevFyLabel}`;
  };

  // Compact YoY direction arrow for the summary strip metric buttons
  const yoyArrow = (current: number, key: 'gross' | 'net'): string | null => {
    const prev = prevYearAgg.get(selectedHrpn)?.[key];
    if (prev == null || prev === 0 || !current) return null;
    return current - prev >= 0 ? '▲' : '▼';
  };

  const monthlyNetValues = useMemo(
    () => ledgerMatrixRows.find((r) => r.key === 'netPay')?.values ?? new Array<number>(12).fill(0),
    [ledgerMatrixRows]
  );

  // Scroll to (and flash) a ledger row — used by summary-strip metric shortcuts
  const jumpToRow = useCallback((rowKey: string) => {
    const el = document.getElementById(`ledger-row-${rowKey}`);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('flash-row');
    setTimeout(() => el.classList.remove('flash-row'), 1600);
  }, []);

  const currentEmployeeInfo = useMemo(
    () => employees.find((e) => e.hrpn === selectedHrpn) ?? null,
    [employees, selectedHrpn]
  );

  const { defaults: form16Defaults } = useForm16Defaults();
  const { details: officeDetails } = useOfficeDetails();

  const resolvedOfficeName = useMemo(() => {
    return (
      form16Defaults?.employerName?.trim() ||
      officeDetails?.officeName?.trim() ||
      'INTENSIVE CATTLE DEVELOPMENT PROJECT (ICDP)'
    );
  }, [form16Defaults?.employerName, officeDetails?.officeName]);

  const { exportPdf, exportExcel, printLedger, isExporting } = useLedgerExport({
    financialYear,
    hrpn: selectedHrpn,
    fyLabel,
    officeName: resolvedOfficeName,
    employee: currentEmployeeInfo
      ? {
          hrpn: currentEmployeeInfo.hrpn,
          name: currentEmployeeInfo.name,
          designation: currentEmployeeInfo.designation,
          payScale: currentEmployeeInfo.payScale,
        }
      : null,
    ledgerMatrixRows,
    summary: {
      annualGross: adjustedGross,
      annualDeductions: adjustedTotalDeductions,
      netTakeHome: netPayTotal,
    },
  });

  // Fullscreen view toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!rootRef.current) return;
    if (!document.fullscreenElement && !isFullscreen) {
      if (rootRef.current.requestFullscreen) {
        rootRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut: Esc to exit CSS fallback fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handlePrint = () =>
    printLedger('paybill-employee-ledger-print', `Employee_Ledger_${selectedHrpn}_${fyLabel}`);

  const hasEmployeeData = employeeEarnings.length > 0 || employeeDeductions.length > 0 || Boolean(currentEmployeeInfo);

  return (
    <div
      ref={rootRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 p-3 h-screen w-screen max-h-none flex gap-2 overflow-hidden'
          : 'flex gap-2 h-full min-h-0'
      }
      style={!isFullscreen && maxAreaH ? { maxHeight: `${maxAreaH}px` } : undefined}
    >
      {/* Directory rail (persistent from lg up in normal mode; collapsed in fullscreen to maximize table area) */}
      {!isFullscreen && (
        <aside className="w-[280px] shrink-0 hidden lg:flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <EmployeeDirectoryPanel
            employees={employees}
            selectedHrpn={selectedHrpn}
            onSelect={selectEmployee}
          />
        </aside>
      )}

      {/* Directory overlay (below lg OR in fullscreen mode when toggled) */}
      {directoryOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/50"
            onClick={() => setDirectoryOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-0 inset-y-0 w-[300px] z-50 shadow-2xl bg-white dark:bg-slate-900 flex flex-col">
            <EmployeeDirectoryPanel
              employees={employees}
              selectedHrpn={selectedHrpn}
              onSelect={selectEmployee}
            />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
        <div id="paybill-employee-ledger-print" className="report-print-area flex flex-col flex-1 min-h-0 gap-3">
          <LedgerHeaderCard
            employeeName={currentEmployeeInfo?.name ?? null}
            designation={currentEmployeeInfo?.designation ?? null}
            payScale={currentEmployeeInfo?.payScale ?? null}
            fyLabel={fyLabel}
            selectedHrpn={selectedHrpn}
            hasData={hasEmployeeData}
            isLoading={isLoading}
            isExporting={isExporting}
            errorText={errorText}
            isFullscreen={isFullscreen}
            joinDate={currentEmployeeInfo?.joinDate ?? null}
            transferDate={currentEmployeeInfo?.transferDate ?? null}
            onRefresh={refetchEverything}
            onRetry={refetchEverything}
            onExportPdf={() => void exportPdf()}
            onExportExcel={() => void exportExcel()}
            onPrint={handlePrint}
            onToggleDirectory={() => setDirectoryOpen((o) => !o)}
            onToggleFullscreen={toggleFullscreen}
          />

          {/* Loading skeleton — shown while fetching and nothing rendered yet */}
          {isLoading && !currentEmployeeInfo ? (
            <div className="space-y-3 shrink-0" aria-busy="true" aria-live="polite">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-52 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-2.5 w-32 rounded bg-slate-100 dark:bg-slate-800/70" />
                  </div>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="hidden md:block space-y-1">
                      <div className="h-2 w-16 rounded bg-slate-100 dark:bg-slate-800/70" />
                      <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="h-3.5 w-64 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/70 flex gap-3 animate-pulse"
                  >
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800 shrink-0" />
                    {[0, 1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800/70" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : currentEmployeeInfo && hasEmployeeData ? (
            <>
              <LedgerSummaryStrip
                annualGross={adjustedGross}
                incomeTax={incomeTaxTotal}
                totalDeductions={adjustedTotalDeductions}
                netPay={netPayTotal}
                yoyArrow={yoyArrow}
                yoyHint={yoyHint}
                onJump={jumpToRow}
                monthlyNetValues={monthlyNetValues}
              />
              <LedgerMatrixTable
                rows={ledgerMatrixRows}
                employeeName={currentEmployeeInfo.name}
                hrpn={currentEmployeeInfo.hrpn}
                fyLabel={fyLabel}
                anomalyMonths={anomalyMonths}
                onMonthClick={setDrawerMonth}
              />
            </>
          ) : !isLoading ? (
            /* Empty State */
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm">
              <EmptyState
                icon={User}
                title="No earnings or deduction records found for this employee"
                hint="Upload pay bills (Earning & Deduction side) for this Financial Year to build the complete employee ledger. The matrix will fill in once both sheets have data."
                action={
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <PbButton
                      variant="primary"
                      size="sm"
                      icon={Upload}
                      onClick={() => navigate('/paybill/import')}
                    >
                      Upload Pay Bill
                    </PbButton>
                    <PbButton variant="ghost" size="sm" icon={RefreshCw} onClick={refetchEverything}>
                      Refresh
                    </PbButton>
                  </div>
                }
              />
            </div>
          ) : null}
        </div>
      </main>

      {/* Month drill-down drawer (opened from a matrix month column header) */}
      {currentEmployeeInfo && (
        <MonthDetailDrawer
          open={drawerMonth !== null}
          onOpenChange={(o) => {
            if (!o) setDrawerMonth(null);
          }}
          month={drawerMonth}
          employeeName={currentEmployeeInfo.name}
          earnings={employeeEarnings}
          deductions={employeeDeductions}
        />
      )}
    </div>
  );
}

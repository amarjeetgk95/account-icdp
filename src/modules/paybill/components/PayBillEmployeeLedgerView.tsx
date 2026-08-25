import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paybillRepository } from '../repositories/paybill.repository';
import { paybillReportService, PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import { paybillExcelService } from '../services/paybillExcel.service';
import { orderItems } from '../utils/columnOrder';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import { servesInFinancialYear } from '@/modules/establishment/types';
import {
  User,
  Search,
  Download,
  Printer,
  RefreshCw,
  Edit3,
  ChevronDown,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState';
import { PbButton, PbChip } from './ui';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import type {
  PayBillStoredEarning,
  PayBillStoredDeduction,
  PayBillAllowanceMatrixReport,
} from '../types';


interface PayBillEmployeeLedgerViewProps {
  financialYear: number;
  initialHrpn?: string | null;
  refreshTrigger?: number;
}

const MONTH_ORDER = [
  'March', 'April', 'May',
  'June', 'July', 'August',
  'September', 'October', 'November',
  'December', 'January', 'February',
];

type ManualValuesMap = Record<string, Record<string, Record<string, number>>>;

const RECENT_HRPNS_KEY = 'paybill-ledger-recent-hrpns';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animates a number towards its target with an ease-out count-up (respects reduced motion). */
function useAnimatedNumber(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target || prefersReducedMotion()) {
      setDisplay(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

/** Lightweight inline SVG sparkline for the 12-month Net Pay trend. */
function NetPaySparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const w = 132;
  const h = 34;
  const p = 3;
  const safe = values.map((v) => (Number.isFinite(v) ? v : 0));
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = max - min || 1;
  const pts = safe.map(
    (v, i) =>
      `${(p + (i * (w - 2 * p)) / Math.max(safe.length - 1, 1)).toFixed(1)},${(
        h -
        p -
        ((v - min) / range) * (h - 2 * p)
      ).toFixed(1)}`
  );
  const last = pts[pts.length - 1]?.split(',') || [];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label={`Monthly net pay trend across 12 months`}
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-500 dark:text-emerald-400"
      />
      <polygon
        points={`${p},${h - p} ${pts.join(' ')} ${w - p},${h - p}`}
        className="fill-emerald-500/10 dark:fill-emerald-400/10"
        stroke="none"
      />
      {last.length === 2 && (
        <circle cx={last[0]} cy={last[1]} r="2.4" className="fill-emerald-500 dark:fill-emerald-300" />
      )}
    </svg>
  );
}

export function PayBillEmployeeLedgerView({
  financialYear,
  initialHrpn = null,
  refreshTrigger = 0,
}: PayBillEmployeeLedgerViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHrpn = searchParams.get('hrpn');
  const [allEarnings, setAllEarnings] = useState<PayBillStoredEarning[]>([]);
  const [allDeductions, setAllDeductions] = useState<PayBillStoredDeduction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState(-1);
  const [pickedHrpn, setPickedHrpnState] = useState<string>(urlHrpn || initialHrpn || '');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [matrixReport, setMatrixReport] = useState<PayBillAllowanceMatrixReport | null>(null);
  const [manualAllowances, setManualAllowances] = useState<string[]>([]);
  const [manualDeductions, setManualDeductions] = useState<string[]>([]);
  const [earningColumnOrder, setEarningColumnOrder] = useState<string[]>([]);
  const [deductionColumnOrder, setDeductionColumnOrder] = useState<string[]>([]);
  const [manualValues, setManualValues] = useState<ManualValuesMap>({});
  const [estEmployees, setEstEmployees] = useState<EstablishmentEmployee[]>([]);
  const [recentHrpns, setRecentHrpns] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_HRPNS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((h) => typeof h === 'string') : [];
    } catch {
      return [];
    }
  });

  // Month range focus: full fiscal year or either half
  const [monthRange, setMonthRange] = useState<'FULL' | 'H1' | 'H2'>('FULL');
  // Collapsible ledger sections
  const [earningsOpen, setEarningsOpen] = useState(true);
  const [deductionsOpen, setDeductionsOpen] = useState(true);
  // Cross-highlighting: month column currently hovered
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  // Export split-button menu
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

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

  // Record a recently-viewed employee (persisted locally, max 5)
  const trackRecent = useCallback((hrpn: string) => {
    if (!hrpn) return;
    setRecentHrpns((prev) => {
      const next = [hrpn, ...prev.filter((h) => h !== hrpn)].slice(0, 5);
      if (next.join('|') === prev.join('|')) return prev;
      try {
        localStorage.setItem(RECENT_HRPNS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  // Load establishment register (backend-first, local fallback) per FY change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let employees = await establishmentService.syncEmployees();
        if (employees.length === 0) employees = establishmentService.loadEmployees();
        if (!cancelled) setEstEmployees(employees);
      } catch (err) {
        console.warn('[PayBillEmployeeLedgerView] establishment sync failed:', err);
        if (!cancelled) setEstEmployees(establishmentService.loadEmployees());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  // Load manual parameter config & manually entered values (async callbacks only)
  useEffect(() => {
    let cancelled = false;
    Promise.all([paybillRepository.getSettings(), paybillRepository.getManualLedgerValues()])
      .then(([settings, manualVals]) => {
        if (cancelled) return;
        const allowances = settings.manualAllowances && settings.manualAllowances.length > 0
          ? settings.manualAllowances
          : ['Pay Difference', 'DA Difference'];
        setManualAllowances(allowances);
        setManualDeductions(settings.manualDeductions || []);
        setEarningColumnOrder(settings.earningColumnOrder || []);
        setDeductionColumnOrder(settings.deductionColumnOrder || []);
        setManualValues(manualVals);
      })
      .catch((err) => {
        console.error('[PayBillEmployeeLedgerView] settings load error:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [earnings, deductions] = await Promise.all([
        paybillRepository.listEarnings({ financialYear }),
        paybillRepository.listDeductions({ financialYear }),
      ]);
      setAllEarnings(earnings);
      setAllDeductions(deductions);

      // Auto-select first employee if none selected
      if (!selectedHrpn) {
        if (earnings.length > 0) setSelectedHrpn(earnings[0].hrpn);
        else if (deductions.length > 0) setSelectedHrpn(deductions[0].hrpn);
      }
    } catch (err) {
      console.error('[PayBillEmployeeLedgerView] load error:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load employee ledger data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const [earnings, deductions] = await Promise.all([
          paybillRepository.listEarnings({ financialYear }),
          paybillRepository.listDeductions({ financialYear }),
        ]);
        if (cancelled) return;
        setAllEarnings(earnings);
        setAllDeductions(deductions);
      } catch (err) {
        console.error('[PayBillEmployeeLedgerView] load error:', err);
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load employee ledger data.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  // Previous-FY aggregates per HRPN for YoY delta hints (best-effort, non-blocking)
  const [prevYearMap, setPrevYearMap] = useState<Map<string, { gross: number; net: number }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPrevYearMap(null);
      const prevFy = financialYear - 1;
      try {
        const [pe, pd] = await Promise.all([
          paybillRepository.listEarnings({ financialYear: prevFy }).catch(() => []),
          paybillRepository.listDeductions({ financialYear: prevFy }).catch(() => []),
        ]);
        if (cancelled) return;
        const m = new Map<string, { gross: number; net: number }>();
        for (const r of pe) {
          const s = m.get(r.hrpn) || { gross: 0, net: 0 };
          s.gross += r.grossAmount || 0;
          m.set(r.hrpn, s);
        }
        for (const r of pd) {
          const s = m.get(r.hrpn) || { gross: 0, net: 0 };
          s.net += r.netPay || 0;
          m.set(r.hrpn, s);
        }
        setPrevYearMap(m.size > 0 ? m : null);
      } catch {
        if (!cancelled) setPrevYearMap(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  // Distinct Employee list with latest designation & pay scale.
  // Merges paybill rows (has data) with the Establishment register scoped to
  // this FY so employees appear even before any paybill is uploaded.
  const distinctEmployees = useMemo(() => {
    const map = new Map<
      string,
      { hrpn: string; name: string; designation?: string | null; payScale?: string | null }
    >();

    for (const e of allEarnings) {
      if (!map.has(e.hrpn)) {
        map.set(e.hrpn, {
          hrpn: e.hrpn,
          name: e.employeeName,
          designation: e.designation,
          payScale: e.payScale,
        });
      }
    }
    for (const d of allDeductions) {
      if (!map.has(d.hrpn)) {
        map.set(d.hrpn, {
          hrpn: d.hrpn,
          name: d.employeeName,
          designation: d.designation,
          payScale: null,
        });
      }
    }
    for (const emp of estEmployees) {
      const hrpnKey = (emp.hrpnNo || '').trim();
      if (!hrpnKey || map.has(hrpnKey)) continue;
      if (!servesInFinancialYear(emp, financialYear)) continue;
      map.set(hrpnKey, {
        hrpn: hrpnKey,
        name: emp.name,
        designation: emp.designation || null,
        payScale: emp.payScale || null,
      });
    }
    return Array.from(map.values());
  }, [allEarnings, allDeductions, estEmployees, financialYear]);

  // Effective selection: explicit pick (state/URL) or first known employee.
  // Derived — avoids an effect writing state for the auto-select case.
  const selectedHrpn = pickedHrpn || distinctEmployees[0]?.hrpn || '';

  // Load individual matrix report when employee changes
  useEffect(() => {
    async function loadIndividualReport() {
      if (!selectedHrpn) return;
      try {
        const report = await paybillReportService.getMatrixReport(financialYear, selectedHrpn);
        setMatrixReport(report);
      } catch (err) {
        console.error('[PayBillEmployeeLedgerView] report error:', err);
      }
    }
    loadIndividualReport();
  }, [financialYear, selectedHrpn]);

  // Filtered employees for dropdown / quick search
  const filteredEmployeesList = useMemo(() => {
    if (!searchQuery.trim()) return distinctEmployees;
    const q = searchQuery.toLowerCase();
    return distinctEmployees.filter(
      (e) =>
        e.hrpn.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q)
    );
  }, [distinctEmployees, searchQuery]);

  // Recently viewed employees resolved against the current directory
  const recentEmployees = useMemo(
    () =>
      recentHrpns
        .map((h) => distinctEmployees.find((e) => e.hrpn === h))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [recentHrpns, distinctEmployees]
  );

  const selectEmployee = useCallback(
    (hrpn: string) => {
      setSelectedHrpn(hrpn);
      trackRecent(hrpn);
      setSearchQuery('');
      setSearchFocused(false);
      setActiveSearchIdx(-1);
    },
    [setSelectedHrpn, trackRecent]
  );

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

  // Scroll to (and flash) a ledger row — used by summary-bar metric shortcuts
  const jumpToRow = useCallback((rowKey: string) => {
    const el = document.getElementById(`ledger-row-${rowKey}`);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('flash-row');
    setTimeout(() => el.classList.remove('flash-row'), 1600);
  }, []);

  // Current selected employee info
  const currentEmployeeInfo = useMemo(() => {
    return distinctEmployees.find((e) => e.hrpn === selectedHrpn) || null;
  }, [distinctEmployees, selectedHrpn]);

  // Monthly earnings for the selected employee across all 12 months
  const employeeEarnings = useMemo(() => {
    if (!selectedHrpn) return [];
    return allEarnings.filter((e) => e.hrpn === selectedHrpn);
  }, [allEarnings, selectedHrpn]);

  // Monthly deductions for the selected employee across all 12 months
  const employeeDeductions = useMemo(() => {
    if (!selectedHrpn) return [];
    return allDeductions.filter((d) => d.hrpn === selectedHrpn);
  }, [allDeductions, selectedHrpn]);

  const empManualValues = useMemo(() => manualValues[selectedHrpn] || {}, [manualValues, selectedHrpn]);

  // Per-month sums of manual allowance / deduction entries for the selected employee
  const manualMonthlySums = useMemo(() => {
    const allowance = MONTH_ORDER.map((m) =>
      manualAllowances.reduce((s, label) => s + (Number(empManualValues[label]?.[m]) || 0), 0)
    );
    const deduction = MONTH_ORDER.map((m) =>
      manualDeductions.reduce((s, label) => s + (Number(empManualValues[label]?.[m]) || 0), 0)
    );
    return {
      allowance,
      deduction,
      allowanceTotal: allowance.reduce((a, b) => a + b, 0),
      deductionTotal: deduction.reduce((a, b) => a + b, 0),
    };
  }, [empManualValues, manualAllowances, manualDeductions]);

  // 12-Month matrix: allowance parameters as rows, months as columns
  interface LedgerMatrixRow {
    key: string;
    label: string;
    group: 'EARNING' | 'DEDUCTION';
    values: number[];
    total: number;
    isManual?: boolean;
  }

  const ledgerMatrixRows = useMemo<LedgerMatrixRow[]>(() => {
    const monthIdx = new Map(MONTH_ORDER.map((m, i) => [m, i]));
    const read = (rec: unknown, key: string): number =>
      Number((rec as Record<string, unknown>)?.[key] ?? 0);

    const standard = [...PAYBILL_EARNING_COLUMNS, ...PAYBILL_DEDUCTION_COLUMNS].map((col) => {
      const values = new Array<number>(12).fill(0);
      let total = 0;

      for (const e of employeeEarnings) {
        const i = monthIdx.get(e.month);
        if (i === undefined) continue;
        const v = read(e, col.key);
        values[i] += v;
        total += v;
      }

      for (const d of employeeDeductions) {
        const i = monthIdx.get(d.month);
        if (i === undefined) continue;
        const v = read(d, col.key);
        values[i] += v;
        total += v;
      }

      return { key: col.key, label: col.label, group: col.group, values, total };
    });

    // Fold manual allowances into Gross Amt and manual deductions into Total Deductions,
    // so added allowances count as earnings and added deductions count as deductions.
    const grossRow = standard.find((r) => r.key === 'grossAmount');
    if (grossRow) {
      grossRow.values = grossRow.values.map((v, i) => v + manualMonthlySums.allowance[i]);
      grossRow.total += manualMonthlySums.allowanceTotal;
    }

    const totalDedRow = standard.find((r) => r.key === 'totalDeductions');
    if (totalDedRow) {
      totalDedRow.values = totalDedRow.values.map((v, i) => v + manualMonthlySums.deduction[i]);
      totalDedRow.total += manualMonthlySums.deductionTotal;
    }

    // Net Pay reflects manual entries: stored net pay adjusted by the manual allowance/deduction delta
    const netPayRow = standard.find((r) => r.key === 'netPay');
    if (netPayRow) {
      netPayRow.values = netPayRow.values.map(
        (v, i) => v + manualMonthlySums.allowance[i] - manualMonthlySums.deduction[i]
      );
      netPayRow.total = netPayRow.values.reduce((a, b) => a + b, 0);
    }

    const manualRow = (label: string, group: 'EARNING' | 'DEDUCTION'): LedgerMatrixRow => {
      const param = empManualValues[label] || {};
      const values = MONTH_ORDER.map((m) => Number(param[m] ?? 0));
      return {
        key: `manual::${label}`,
        label,
        group,
        values,
        total: values.reduce((a, b) => a + b, 0),
        isManual: true,
      };
    };

    // EARNING rows: standard earnings + manual allowances.
    // DEDUCTION rows: individual standard deductions + manual deductions + Total Deductions + Net Pay.
    const earningStandard = PAYBILL_EARNING_COLUMNS.filter((c) => c.key !== 'grossAmount').map(
      (c) => standard.find((r) => r.key === c.key) as LedgerMatrixRow
    );
    const deductionStandard = PAYBILL_DEDUCTION_COLUMNS.filter(
      (c) => c.key !== 'totalDeductions' && c.key !== 'netPay'
    ).map((c) => standard.find((r) => r.key === c.key) as LedgerMatrixRow);

    const manualEarningRows = manualAllowances.map((label) => manualRow(label, 'EARNING'));
    const manualDeductionRows = manualDeductions.map((label) => manualRow(label, 'DEDUCTION'));

    // Apply the persisted display order or sensible default (difference rows in the last section of earning)
    const defaultEarningOrder = [
      'basicPay',
      'da',
      'hra',
      'cla',
      'medicalAllowance',
      'transportAllowance',
      'specialPay',
      'washingAllowance',
      'nppAllowance',
      'manual::Pay Difference',
      'manual::DA Difference',
    ];
    const effectiveEarningOrder =
      earningColumnOrder && earningColumnOrder.length > 0 ? earningColumnOrder : defaultEarningOrder;

    const orderedEarnings = orderItems(
      [...earningStandard, ...manualEarningRows],
      effectiveEarningOrder,
      ['grossAmount']
    ).concat(grossRow as LedgerMatrixRow);

    const orderedDeductions = orderItems(
      [...deductionStandard, ...manualDeductionRows],
      deductionColumnOrder,
      ['totalDeductions', 'netPay']
    ).concat(totalDedRow as LedgerMatrixRow, netPayRow as LedgerMatrixRow);

    return [...orderedEarnings, ...orderedDeductions];
  }, [
    employeeEarnings,
    employeeDeductions,
    manualAllowances,
    manualDeductions,
    manualMonthlySums,
    empManualValues,
    earningColumnOrder,
    deductionColumnOrder,
  ]);

  // Visible months based on the selected half-year/full-year focus
  const visibleMonthIndices = useMemo(
    () =>
      MONTH_ORDER.map((_, i) => i).filter(
        (i) => monthRange === 'FULL' || (monthRange === 'H1' ? i < 6 : i >= 6)
      ),
    [monthRange]
  );

  // Anomalous months: zero gross (missing salary run) or negative net pay (over-deduction)
  const anomalyMonths = useMemo(() => {
    const grossRow = ledgerMatrixRows.find((r) => r.key === 'grossAmount');
    const netRow = ledgerMatrixRows.find((r) => r.key === 'netPay');
    const zeroGross = new Set<number>();
    const negativeNet = new Set<number>();
    grossRow?.values.forEach((v, i) => {
      if (v <= 0) zeroGross.add(i);
    });
    netRow?.values.forEach((v, i) => {
      if (v < 0) negativeNet.add(i);
    });
    return { zeroGross, negativeNet };
  }, [ledgerMatrixRows]);

  const hasAnomalies = anomalyMonths.zeroGross.size > 0 || anomalyMonths.negativeNet.size > 0;

  // Annual Totals for this employee
  const annualEarningsTotals = useMemo(() => {
    return employeeEarnings.reduce(
      (acc, r) => {
        acc.basicPay += r.basicPay || 0;
        acc.da += r.da || 0;
        acc.hra += r.hra || 0;
        acc.cla += r.cla || 0;
        acc.medical += r.medicalAllowance || 0;
        acc.transport += r.transportAllowance || 0;
        acc.specialPay += r.specialPay || 0;
        acc.washing += r.washingAllowance || 0;
        acc.npp += r.nppAllowance || 0;
        acc.gross += r.grossAmount || 0;
        return acc;
      },
      {
        basicPay: 0,
        da: 0,
        hra: 0,
        cla: 0,
        medical: 0,
        transport: 0,
        specialPay: 0,
        washing: 0,
        npp: 0,
        gross: 0,
      }
    );
  }, [employeeEarnings]);

  const annualDeductionTotals = useMemo(() => {
    return employeeDeductions.reduce(
      (acc, r) => {
        acc.incomeTax += r.incomeTax || 0;
        acc.profTax += r.profTax || 0;
        acc.hbaInterest += r.hbaInterest || 0;
        acc.gpfRegular += r.gpfRegular || 0;
        acc.gpfClass4 += r.gpfClass4 || 0;
        acc.npsRegular += r.npsRegular || 0;
        acc.gisGovtFund += r.gisGovtFund || 0;
        acc.gisGovtSaving += r.gisGovtSaving || 0;
        acc.totalDeductions += r.totalDeductions || 0;
        acc.netPay += r.netPay || 0;
        return acc;
      },
      {
        incomeTax: 0,
        profTax: 0,
        hbaInterest: 0,
        gpfRegular: 0,
        gpfClass4: 0,
        npsRegular: 0,
        gisGovtFund: 0,
        gisGovtSaving: 0,
        totalDeductions: 0,
        netPay: 0,
      }
    );
  }, [employeeDeductions]);

  const formatInr = (n: number | undefined) =>
    `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const fyLabel = `${financialYear}-${String(financialYear + 1).slice(-2)}`;
  const prevFyLabel = `${financialYear - 1}-${String(financialYear).slice(-2)}`;

  const adjustedGross = annualEarningsTotals.gross + manualMonthlySums.allowanceTotal;
  const adjustedTotalDeductions = annualDeductionTotals.totalDeductions + manualMonthlySums.deductionTotal;
  const netPayTotal =
    annualDeductionTotals.netPay > 0
      ? annualDeductionTotals.netPay + manualMonthlySums.allowanceTotal - manualMonthlySums.deductionTotal
      : adjustedGross - adjustedTotalDeductions;

  const incomeTaxTotal = annualDeductionTotals.incomeTax;

  // Animated figures for stat cards / master card (count-up on employee change)
  const animGross = useAnimatedNumber(adjustedGross);
  const animIncomeTax = useAnimatedNumber(incomeTaxTotal);
  const animTotalDeductions = useAnimatedNumber(adjustedTotalDeductions);
  const animNetPay = useAnimatedNumber(netPayTotal);

  // YoY delta hint text (only shown when previous-FY data exists for this employee)
  const yoyHint = (current: number, key: 'gross' | 'net'): string | null => {
    const prev = prevYearMap?.get(selectedHrpn)?.[key];
    if (prev == null || prev === 0 || !current) return null;
    const pct = ((current - prev) / Math.abs(prev)) * 100;
    return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% vs FY ${prevFyLabel}`;
  };

  // Compact YoY direction arrow for the summary bar metric strip
  const yoyArrow = (current: number, key: 'gross' | 'net'): string | null => {
    const prev = prevYearMap?.get(selectedHrpn)?.[key];
    if (prev == null || prev === 0 || !current) return null;
    return current - prev >= 0 ? '▲' : '▼';
  };

  const monthlyNetValues = ledgerMatrixRows.find((r) => r.key === 'netPay')?.values || new Array(12).fill(0);

  const handleExportExcel = async () => {
    if (currentEmployeeInfo) {
      try {
        const report = await paybillReportService.getMatrixReport(financialYear, selectedHrpn);
        await paybillExcelService.exportAllowanceMatrixToExcel(
          report,
          fyLabel,
          'Intensive Cattle Development Project (ICDP)'
        );
      } catch (err) {
        console.error('[PayBillEmployeeLedgerView] export error:', err);
      }
    }
  };

  const handlePrint = () => {
    // Target only the ledger print area — not the page filter/search controls.
    // Generates a single-page landscape print: stat cards forced to 4-col row, table de-clipped and down-scaled.
    const ledgerEl = document.getElementById('paybill-employee-ledger-print') as HTMLElement | null;
    if (ledgerEl) {
      popupNativePrint({
        elements: [ledgerEl],
        title: `Employee_Ledger_${selectedHrpn}_${fyLabel}`,
        pageSize: 'A4',
        orientation: 'landscape',
        pageMargin: '5mm',
        customStyles: `
          #paybill-employee-ledger-print { padding: 3mm !important; display: block !important; }
          #paybill-employee-ledger-print .no-print,
          #paybill-employee-ledger-print input[type="search"],
          #paybill-employee-ledger-print select,
          #paybill-employee-ledger-print button:not(.keep-in-print) { display: none !important; }
          #paybill-employee-ledger-print .row-action-btn { display: none !important; }
          #paybill-employee-ledger-print input { border: none !important; background: transparent !important; text-align: right !important; padding: 0 !important; font-size: 8.5px !important; }
          #paybill-employee-ledger-print .diff-badge { border: none !important; background: transparent !important; color: #475569 !important; font-size: 7.5px !important; }
          /* Summary bar — compact identity + metric strip for print */
          #paybill-employee-ledger-print .summary-bar { padding: 4px 7px !important; border-radius: 6px !important; }
          #paybill-employee-ledger-print .summary-bar .w-8 { width: 22px !important; height: 22px !important; }
          #paybill-employee-ledger-print .summary-bar .w-8 svg { width: 12px !important; height: 12px !important; }
          #paybill-employee-ledger-print .summary-bar h3 { font-size: 10px !important; }
          #paybill-employee-ledger-print .mini-stat-label { font-size: 7.5px !important; }
          #paybill-employee-ledger-print .mini-stat-value { font-size: 11px !important; }
          #paybill-employee-ledger-print .mini-stat { padding-left: 6px !important; padding-right: 6px !important; }
          /* Remove scroll clipping so whole ledger flows onto one page */
          #paybill-employee-ledger-print,
          #paybill-employee-ledger-print .ledger-scroll { overflow: visible !important; max-height: none !important; min-height: 0 !important; height: auto !important; }
          /* Ledger table — 8.5px body / 7.5px header balances readability vs single-page fit */
          #paybill-employee-ledger-print table { font-size: 8.5px !important; border-collapse: collapse !important; }
          #paybill-employee-ledger-print th, #paybill-employee-ledger-print td { padding: 2px 3px !important; line-height: 1.2 !important; white-space: nowrap !important; }
          #paybill-employee-ledger-print thead th { font-size: 7.5px !important; padding-top: 3px !important; padding-bottom: 3px !important; }
          #paybill-employee-ledger-print .px-4 { padding-left: 6px !important; padding-right: 6px !important; }
          #paybill-employee-ledger-print .py-2\\.5 { padding-top: 3px !important; padding-bottom: 3px !important; }
          /* Ensure whole ledger prints as one flow — no mid-page breaks */
          #paybill-employee-ledger-print > div { break-inside: avoid !important; page-break-inside: avoid !important; }
          @media print {
            @page { margin: 4mm !important; size: A4 landscape; }
            /* Downscale just enough to guarantee one page — 0.86 keeps 11px value readable (~9.5pt) */
            #paybill-employee-ledger-print { zoom: 0.86; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `,
      });
    } else {
      window.print();
    }
  };

  const hasEmployeeData =
    employeeEarnings.length > 0 || employeeDeductions.length > 0;

  const visibleCount = visibleMonthIndices.length;
  const totalColLabel = monthRange === 'FULL' ? 'Annual Total' : monthRange === 'H1' ? 'H1 Total' : 'H2 Total';

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!searchFocused) return;
    const max = Math.min(filteredEmployeesList.length, 12) - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIdx((i) => (i < 0 || i >= max ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIdx((i) => Math.max(0, i <= 0 ? 0 : i - 1));
    } else if (e.key === 'Enter') {
      const pick = filteredEmployeesList[Math.max(activeSearchIdx, 0)];
      if (activeSearchIdx >= 0 && pick) {
        e.preventDefault();
        selectEmployee(pick.hrpn);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
      setActiveSearchIdx(-1);
    }
  };

  const renderMatrixRow = (row: LedgerMatrixRow) => {
    const isGross = row.key === 'grossAmount';
    const isTotalDed = row.key === 'totalDeductions';
    const isNetPay = row.key === 'netPay';
    const isDiff =
      row.label.toLowerCase().includes('difference') ||
      row.label.toLowerCase().includes('arrear') ||
      row.key.toLowerCase().includes('difference');

    const visibleTotal = visibleMonthIndices.reduce((s, i) => s + (row.values[i] || 0), 0);

    return (
      <tr
        key={row.key}
        id={`ledger-row-${row.key}`}
        className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors"
      >
        <td
          className={`py-1.5 px-3 sticky left-0 z-10 font-sans font-semibold border-r border-slate-100 dark:border-slate-800 ${
            isGross
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
              : isNetPay
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                : isTotalDed
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <span>{row.label}</span>
            {isDiff && (
              <span className="diff-badge px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                Arrears
              </span>
            )}
          </div>
        </td>
        {visibleMonthIndices.map((mi) => {
          const v = row.values[mi];
          const colHighlighted = hoveredCol === mi;
          const anomaly =
            (isGross && anomalyMonths.zeroGross.has(mi)) ||
            (isNetPay && anomalyMonths.negativeNet.has(mi));
          return (
            <td
              key={mi}
              onMouseEnter={() => setHoveredCol(mi)}
              className={`py-1.5 px-2 text-right whitespace-nowrap transition-colors ${
                colHighlighted ? 'bg-sky-50/80 dark:bg-sky-950/30' : ''
              } ${
                isGross
                  ? 'font-bold text-blue-700 dark:text-blue-300'
                  : isNetPay
                    ? 'font-bold text-emerald-700 dark:text-emerald-300'
                    : isTotalDed
                      ? 'font-bold text-rose-700 dark:text-rose-300'
                      : isDiff
                        ? 'font-medium text-amber-900 dark:text-amber-300'
                        : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-mono tabular-nums inline-flex items-center justify-end gap-1">
                {anomaly && (
                  <AlertTriangle
                    className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {formatInr(v)}
              </span>
            </td>
          );
        })}
        <td
          onMouseEnter={() => setHoveredCol(null)}
          className={`py-1.5 px-3 text-right font-mono font-extrabold whitespace-nowrap tabular-nums ${
            isGross
              ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
              : isNetPay
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                : isTotalDed
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
                  : isDiff
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                    : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
          }`}
        >
          {formatInr(visibleTotal)}
        </td>
      </tr>
    );
  };

  const renderSectionHeader = (
    label: string,
    open: boolean,
    onToggle: () => void,
    toneClasses: string,
    chipTone: 'blue' | 'rose'
  ) => (
    <tr key={label} className={toneClasses}>
      <td colSpan={visibleCount + 2} className="py-1 px-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="keep-in-print flex items-center gap-2 py-0.5 px-1 min-h-[28px] font-sans font-bold w-full text-left rounded hover:bg-white/40 dark:hover:bg-black/10 transition-colors"
          title={open ? `Collapse ${label} section` : `Expand ${label} section`}
        >
          <ChevronDown
            className={`w-3 h-3 no-print transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          {label} (Rs.)
          <PbChip tone={chipTone}>{open ? 'Hide' : 'Show'}</PbChip>
        </button>
      </td>
    </tr>
  );

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-2 overflow-hidden"
      style={maxAreaH ? { maxHeight: `${maxAreaH}px` } : undefined}
    >
      {/* Unified compact toolbar — identity, search and actions in one slim row */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap sm:flex-nowrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-2.5 pr-2 py-1.5 shadow-sm">
        <div className="flex items-center gap-2 shrink-0 mr-0.5">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <User size={14} strokeWidth={2.2} />
          </span>
          <h3 className="hidden md:block text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
            Employee Ledger
          </h3>
        </div>

        <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <input
                type="text"
                role="combobox"
                aria-expanded={searchFocused && filteredEmployeesList.length > 0}
                aria-controls="employee-search-listbox"
                aria-autocomplete="list"
                aria-activedescendant={
                  activeSearchIdx >= 0 ? `employee-opt-${activeSearchIdx}` : undefined
                }
                aria-label="Search employees by HRPN, name or designation"
                placeholder="Search by HRPN, Name or Designation..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveSearchIdx(-1);
                }}
                onFocus={(e) => {
                  setSearchFocused(true);
                  e.target.select();
                }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full font-medium text-slate-800 dark:text-slate-200 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 min-w-[24px] min-h-[24px] flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                >
                  ×
                </button>
              )}
              {searchFocused && filteredEmployeesList.length > 0 && (
                <div
                  id="employee-search-listbox"
                  role="listbox"
                  aria-label="Employee results"
                  className="absolute left-0 w-[380px] max-w-[90vw] top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-40 overflow-y-auto app-scroll max-h-[320px]"
                >
                  {!searchQuery.trim() && recentEmployees.length > 0 && (
                    <>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Recently Viewed
                      </div>
                      {recentEmployees.map((emp) => {
                        const idx = filteredEmployeesList.findIndex((e) => e.hrpn === emp.hrpn);
                        return (
                          <button
                            key={`recent-${emp.hrpn}`}
                            type="button"
                            role="option"
                            aria-selected={emp.hrpn === selectedHrpn}
                            id={idx >= 0 ? `employee-opt-${idx}` : undefined}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectEmployee(emp.hrpn)}
                            className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition flex items-start justify-between gap-3 ${emp.hrpn === selectedHrpn ? 'bg-blue-50 dark:bg-blue-950/40' : ''}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight break-words whitespace-normal">
                                {emp.name} <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">HRPN:{emp.hrpn}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 break-words whitespace-normal">{emp.designation || 'Staff'}</div>
                            </div>
                            {emp.hrpn === selectedHrpn && (
                              <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Viewing</span>
                            )}
                          </button>
                        );
                      })}
                      <div className="border-t border-slate-100 dark:border-slate-700 mt-1 mb-0.5" />
                    </>
                  )}
                  <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                    {searchQuery.trim()
                      ? `${filteredEmployeesList.length} match${filteredEmployeesList.length === 1 ? '' : 'es'} — click to view ledger`
                      : `${filteredEmployeesList.length} employees — click to view full name`}
                  </div>
                  {filteredEmployeesList.slice(0, 12).map((emp, idx) => (
                    <button
                      key={emp.hrpn}
                      type="button"
                      role="option"
                      aria-selected={emp.hrpn === selectedHrpn}
                      id={`employee-opt-${idx}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveSearchIdx(idx)}
                      onClick={() => selectEmployee(emp.hrpn)}
                      className={`w-full text-left px-3 py-2.5 transition flex items-start justify-between gap-3 ${
                        idx === activeSearchIdx
                          ? 'bg-blue-100 dark:bg-blue-950/60'
                          : emp.hrpn === selectedHrpn
                            ? 'bg-blue-50 dark:bg-blue-950/40'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight break-words whitespace-normal">
                          {emp.name} <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">HRPN:{emp.hrpn}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 break-words whitespace-normal">{emp.designation || 'Staff'}</div>
                      </div>
                      {emp.hrpn === selectedHrpn ? (
                        <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Viewing</span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-400">View →</span>
                      )}
                    </button>
                  ))}
                  {filteredEmployeesList.length > 12 && (
                    <div className="px-3 py-1.5 text-[11px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-700">
                      +{filteredEmployeesList.length - 12} more — refine search
                    </div>
                  )}
                </div>
              )}
              {searchFocused && searchQuery.trim() && filteredEmployeesList.length === 0 && (
                <div className="absolute left-0 w-[380px] max-w-[90vw] top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-40 p-3 text-xs text-slate-500 text-center">
                  No employee matches “{searchQuery.trim()}”
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:ml-auto">
            <PbButton
              variant="ghost"
              size="xs"
              icon={RefreshCw}
              onClick={loadData}
              disabled={isLoading}
              title="Refresh Ledger"
            />

            <PbButton
              variant="secondary"
              size="xs"
              icon={Edit3}
              onClick={() => navigate(`/paybill/legacy-edit?hrpn=${selectedHrpn}`)}
              disabled={!selectedHrpn}
              title="Edit salary records and difference arrears in Legacy Data Editor"
            >
              Edit in Legacy Entry
            </PbButton>

            {/* Combined Export split-button: Excel statement + Print/PDF */}
            <div className="relative">
              <div className="inline-flex">
                <PbButton
                  variant="primary"
                  size="xs"
                  icon={Download}
                  onClick={handleExportExcel}
                  disabled={!matrixReport || !hasEmployeeData || isLoading}
                  className="!rounded-r-none !pr-2"
                  title="Export statement to Excel (.xlsx)"
                >
                  Export
                </PbButton>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  aria-label="More export options"
                  onClick={() => setExportMenuOpen((o) => !o)}
                  disabled={!hasEmployeeData}
                  className="inline-flex items-center justify-center px-1 rounded-r-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all disabled:opacity-45 disabled:cursor-not-allowed border-l border-blue-400/40"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} aria-hidden="true" />
                  <div
                    role="menu"
                    aria-label="Export options"
                    className="absolute right-0 top-full mt-1 z-50 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 overflow-hidden"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenuOpen(false);
                        void handleExportExcel();
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Excel Statement (.xlsx)
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handlePrint();
                      }}
                      disabled={!hasEmployeeData}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Print / Save as PDF
                    </button>
                  </div>
                </>
              )}
            </div>

            <PbButton
              variant="secondary"
              size="xs"
              icon={Printer}
              onClick={handlePrint}
              disabled={!hasEmployeeData || isLoading}
              title="Print this ledger (landscape, single page)"
            >
              Print Ledger
            </PbButton>
            </div>
          </div>

      {loadError && (
        <div className="shrink-0 px-4 py-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5" role="alert">
          <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            !
          </span>
          <div className="text-xs text-rose-700 dark:text-rose-300">
            <div className="font-bold">Employee data could not be loaded</div>
            <div className="mt-0.5 opacity-90">{loadError}</div>
          </div>
        </div>
      )}

      {/* Loading skeleton — shown while fetching and nothing rendered yet */}
      {isLoading && !currentEmployeeInfo && (
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
              <div key={i} className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/70 flex gap-3 animate-pulse">
                <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800 shrink-0" />
                {[0, 1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800/70" />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee Financial Details */}
      {currentEmployeeInfo && hasEmployeeData ? (
        <div id="paybill-employee-ledger-print" className="report-print-area flex flex-col flex-1 min-h-0 gap-3">
          {/* Compact Employee Summary Bar — identity + key metrics + trend in one slim row */}
          <div className="summary-bar relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 shadow-sm shrink-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-100/60 dark:bg-blue-900/20 blur-2xl pointer-events-none" />
            <div className="relative flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <User size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[220px]">
                    {currentEmployeeInfo.name}
                  </h3>
                  <span className="font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded-full text-[0.65rem] whitespace-nowrap">
                    HRPN: {currentEmployeeInfo.hrpn}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{currentEmployeeInfo.designation || 'Staff'}</span>
                  {currentEmployeeInfo.payScale && (
                    <>
                      <span>&bull;</span>
                      <span className="font-mono">{currentEmployeeInfo.payScale}</span>
                    </>
                  )}
                  <span>&bull;</span>
                  <span className="font-bold">FY {fyLabel}</span>
                </div>
              </div>

              {/* Key metrics strip — click a metric to jump to its ledger row */}
              <div className="ml-auto flex items-center divide-x divide-slate-200/80 dark:divide-slate-800">
                {(
                  [
                    {
                      label: 'Annual Gross',
                      value: animGross,
                      valueClass: 'text-indigo-600 dark:text-indigo-400',
                      rowKey: 'grossAmount',
                      arrow: yoyArrow(adjustedGross, 'gross'),
                    },
                    {
                      label: 'Income Tax',
                      value: animIncomeTax,
                      valueClass: 'text-amber-600 dark:text-amber-400',
                      rowKey: 'incomeTax',
                      arrow: null,
                    },
                    {
                      label: 'Total Deductions',
                      value: animTotalDeductions,
                      valueClass: 'text-rose-600 dark:text-rose-400',
                      rowKey: 'totalDeductions',
                      arrow: null,
                    },
                    {
                      label: 'Net Take-Home',
                      value: animNetPay,
                      valueClass: 'text-emerald-600 dark:text-emerald-400',
                      rowKey: 'netPay',
                      arrow: yoyArrow(netPayTotal, 'net'),
                    },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.rowKey}
                    type="button"
                    onClick={() => jumpToRow(m.rowKey)}
                    title={
                      m.arrow
                        ? `${m.label} — click to jump (YoY ${yoyHint(m.value, m.rowKey === 'netPay' ? 'net' : 'gross') || ''})`
                        : `${m.label} — click to jump to row`
                    }
                    className="mini-stat keep-in-print px-3 first:pl-0 last:pr-0 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  >
                    <span className="mini-stat-label block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-0.5">
                      {m.label}
                    </span>
                    <span className={`mini-stat-value block text-[13px] font-extrabold font-mono tabular-nums leading-tight whitespace-nowrap ${m.valueClass}`}>
                      {formatInr(m.value)}
                      {m.arrow && (
                        <span
                          className={`ml-1 text-[9px] align-middle ${
                            m.arrow === '▲'
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-rose-500 dark:text-rose-400'
                          }`}
                          aria-label={m.arrow === '▲' ? 'higher than previous year' : 'lower than previous year'}
                        >
                          {m.arrow}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              <div
                className="no-print hidden md:block pl-3 ml-1 border-l border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                title="Monthly net pay trend across the fiscal year"
              >
                <NetPaySparkline values={monthlyNetValues} />
              </div>
            </div>
          </div>

          {/* LEDGER MATRIX: 12 Months across the top, allowance parameters as rows */}
          <section className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <header className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                12-Month Allowance Ledger
              </h4>
              <PbChip tone="slate">FY {fyLabel}</PbChip>
              <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                {/* Month range focus */}
                <div
                  role="group"
                  aria-label="Month range"
                  className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 mr-1"
                >
                  {([
                    { key: 'FULL', label: 'Full Year' },
                    { key: 'H1', label: 'Mar–Aug' },
                    { key: 'H2', label: 'Sep–Feb' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMonthRange(opt.key)}
                      aria-pressed={monthRange === opt.key}
                      className={`px-2.5 py-1.5 min-h-[28px] text-[11px] font-semibold transition-colors ${
                        monthRange === opt.key
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {hasAnomalies && (
                  <PbChip
                    tone="amber"
                    icon={AlertTriangle}
                    title="Amber warning markers flag months with zero gross salary or negative net pay"
                  >
                    {anomalyMonths.zeroGross.size > 0 && `${anomalyMonths.zeroGross.size} zero month${anomalyMonths.zeroGross.size === 1 ? '' : 's'}`}
                    {anomalyMonths.zeroGross.size > 0 && anomalyMonths.negativeNet.size > 0 && ' · '}
                    {anomalyMonths.negativeNet.size > 0 && `${anomalyMonths.negativeNet.size} negative`}
                  </PbChip>
                )}
                <div className="hidden xl:inline-flex items-center gap-1.5">
                  <PbChip tone="blue">EARNING</PbChip>
                  <PbChip tone="rose">DEDUCTION</PbChip>
                  <PbChip tone="indigo" title="Rows highlighted in colour are totals">TOTALS</PbChip>
                </div>
              </div>
            </header>

            <div
              className="ledger-scroll overflow-auto app-scroll flex-1 min-h-0"
              onMouseLeave={() => setHoveredCol(null)}
            >
              <table
                className="w-full text-sm text-left border-separate border-spacing-0"
                aria-label={`Employee ledger for ${currentEmployeeInfo.name}, HRPN ${currentEmployeeInfo.hrpn}, FY ${fyLabel}`}
              >
                <caption className="sr-only">
                  Twelve-month earnings and deductions ledger grouped by parameter with monthly values and totals
                </caption>
                <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider sticky top-0 z-30 backdrop-blur-xs">
                  <tr>
                    <th scope="col" className="py-1.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 min-w-[170px] border-r border-slate-200 dark:border-slate-700">
                      Allowance Parameter
                    </th>
                    {visibleMonthIndices.map((mi) => (
                      <th
                        scope="col"
                        key={mi}
                        onMouseEnter={() => setHoveredCol(mi)}
                        className={`py-1.5 px-2 font-bold border-b border-slate-200 dark:border-slate-700 text-right min-w-[74px] transition-colors ${
                          hoveredCol === mi ? 'bg-sky-100 dark:bg-sky-950/50' : ''
                        }`}
                      >
                        {MONTH_ORDER[mi]}
                      </th>
                    ))}
                    <th scope="col" className="py-1.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-slate-200/60 dark:bg-slate-700/60 min-w-[96px]">
                      {totalColLabel}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {renderSectionHeader(
                    'EARNING',
                    earningsOpen,
                    () => setEarningsOpen((o) => !o),
                    'bg-blue-100/80 dark:bg-blue-950/50',
                    'blue'
                  )}
                  {earningsOpen &&
                    ledgerMatrixRows
                      .filter((r) => r.group === 'EARNING')
                      .map((row) => renderMatrixRow(row))}
                  {renderSectionHeader(
                    'DEDUCTION',
                    deductionsOpen,
                    () => setDeductionsOpen((o) => !o),
                    'bg-rose-100/80 dark:bg-rose-950/40',
                    'rose'
                  )}
                  {deductionsOpen &&
                    ledgerMatrixRows
                      .filter((r) => r.group === 'DEDUCTION')
                      .map((row) => renderMatrixRow(row))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Flash animation styles for stat-card jump targets */}
          <style>{`
            @keyframes ledger-row-flash {
              0%, 100% { background-color: transparent; }
              25%, 75% { background-color: rgba(59, 130, 246, 0.18); }
            }
            .flash-row > td { animation: ledger-row-flash 1.5s ease-in-out; }
          `}</style>
        </div>
      ) : !isLoading ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm">
          <EmptyState
            icon={User}
            title="No earnings or deduction records found for this employee"
            hint="Upload pay bills (Earning & Deduction side) for this Financial Year to build the complete employee ledger."
          />
        </div>
      ) : null}
    </div>
  );
}

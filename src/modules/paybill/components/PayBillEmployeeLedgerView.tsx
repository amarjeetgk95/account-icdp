import { useState, useEffect, useMemo } from 'react';
import { paybillRepository } from '../repositories/paybill.repository';
import { paybillReportService, PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import { paybillExcelService } from '../services/paybillExcel.service';
import { orderItems } from '../utils/columnOrder';
import {
  User,
  Search,
  Download,
  Printer,
  RefreshCw,
  Wallet,
  Landmark,
  ArrowDownCircle,
  PiggyBank,
} from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState';
import { StatCard } from '@/shared/components/StatCard';
import { PbButton, PbChip, PbPanel } from './ui';
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
  'April', 'May', 'June',
  'July', 'August', 'September',
  'October', 'November', 'December',
  'January', 'February', 'March',
];

type ManualValuesMap = Record<string, Record<string, Record<string, number>>>;

export function PayBillEmployeeLedgerView({
  financialYear,
  initialHrpn = null,
  refreshTrigger = 0,
}: PayBillEmployeeLedgerViewProps) {
  const [allEarnings, setAllEarnings] = useState<PayBillStoredEarning[]>([]);
  const [allDeductions, setAllDeductions] = useState<PayBillStoredDeduction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHrpn, setSelectedHrpn] = useState<string>(initialHrpn || '');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [matrixReport, setMatrixReport] = useState<PayBillAllowanceMatrixReport | null>(null);
  const [manualAllowances, setManualAllowances] = useState<string[]>([]);
  const [manualDeductions, setManualDeductions] = useState<string[]>([]);
  const [earningColumnOrder, setEarningColumnOrder] = useState<string[]>([]);
  const [deductionColumnOrder, setDeductionColumnOrder] = useState<string[]>([]);
  const [manualValues, setManualValues] = useState<ManualValuesMap>({});

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
        setSelectedHrpn((prev) =>
          prev
            ? prev
            : earnings.length > 0
              ? earnings[0].hrpn
              : deductions.length > 0
                ? deductions[0].hrpn
                : ''
        );
      } catch (err) {
        console.error('[PayBillEmployeeLedgerView] load error:', err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load employee ledger data.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

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

  // Distinct Employee list with latest designation & pay scale
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
    return Array.from(map.values());
  }, [allEarnings, allDeductions]);

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

    // Apply the persisted display order; totals (Gross Amt / Total Deductions / Net Pay) stay pinned last.
    const orderedEarnings = orderItems(
      [...earningStandard, ...manualEarningRows],
      earningColumnOrder,
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

  const adjustedGross = annualEarningsTotals.gross + manualMonthlySums.allowanceTotal;
  const adjustedTotalDeductions = annualDeductionTotals.totalDeductions + manualMonthlySums.deductionTotal;
  const netPayTotal =
    annualDeductionTotals.netPay > 0
      ? annualDeductionTotals.netPay + manualMonthlySums.allowanceTotal - manualMonthlySums.deductionTotal
      : adjustedGross - adjustedTotalDeductions;

  const handleExportExcel = async () => {
    if (matrixReport && currentEmployeeInfo) {
      await paybillExcelService.exportAllowanceMatrixToExcel(
        matrixReport,
        fyLabel,
        'Intensive Cattle Development Project (ICDP)'
      );
    }
  };

  const handlePrint = () => {
    const ledgerEl = document.querySelector('.space-y-4') as HTMLElement | null;
    if (ledgerEl) {
      popupNativePrint({
        elements: [ledgerEl],
        title: `Employee_Ledger_${selectedHrpn}_${fyLabel}`,
        pageSize: 'A4',
        orientation: 'landscape',
      });
    } else {
      window.print();
    }
  };

  const hasEmployeeData =
    employeeEarnings.length > 0 || employeeDeductions.length > 0;

  const handleManualCellChange = (label: string, month: string, raw: string) => {
    const num = raw === '' ? 0 : Number(raw);
    setManualValues((prev) => {
      const hrpnMap = prev[selectedHrpn] || {};
      const paramMap = hrpnMap[label] || {};
      return {
        ...prev,
        [selectedHrpn]: {
          ...hrpnMap,
          [label]: { ...paramMap, [month]: Number.isFinite(num) ? num : 0 },
        },
      };
    });
  };

  const handleManualCellBlur = (label: string, month: string) => {
    const v = manualValues[selectedHrpn]?.[label]?.[month] ?? 0;
    paybillRepository
      .saveManualLedgerValue(selectedHrpn, label, month, v)
      .catch((err) => {
        console.error('[PayBillEmployeeLedgerView] save manual value error:', err);
      });
  };

  const renderMatrixRow = (row: LedgerMatrixRow) => {
    const isGross = row.key === 'grossAmount';
    const isTotalDed = row.key === 'totalDeductions';
    const isNetPay = row.key === 'netPay';

    return (
      <tr key={row.key} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
        <td
          className={`py-2 px-3 sticky left-0 z-10 font-sans font-semibold border-r border-slate-100 dark:border-slate-800 ${
            isGross
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
              : isNetPay
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                : isTotalDed
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
          }`}
        >
          {row.label}
        </td>
        {row.values.map((v, i) => (
          <td
            key={i}
            className={`py-1 px-1.5 text-right whitespace-nowrap ${
              isGross
                ? 'font-bold text-blue-700 dark:text-blue-300'
                : isNetPay
                  ? 'font-bold text-emerald-700 dark:text-emerald-300'
                  : isTotalDed
                    ? 'font-bold text-rose-700 dark:text-rose-300'
                    : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {row.isManual ? (
              <input
                type="number"
                min={0}
                step="any"
                value={v === 0 ? '' : String(v)}
                placeholder="0"
                onChange={(e) => handleManualCellChange(row.label, MONTH_ORDER[i], e.target.value)}
                onBlur={() => handleManualCellBlur(row.label, MONTH_ORDER[i])}
                className="w-full text-right bg-transparent border border-slate-200 dark:border-slate-700 hover:border-blue-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:text-slate-300 outline-none transition"
              />
            ) : (
              <span className="font-mono">{formatInr(v)}</span>
            )}
          </td>
        ))}
        <td
          className={`py-2 px-3 text-right font-mono font-extrabold whitespace-nowrap ${
            isGross
              ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
              : isNetPay
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                : isTotalDed
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
                  : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
          }`}
        >
          {formatInr(row.total)}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <PbPanel
        icon={User}
        iconClass="bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm"
        title="Employee Ledger"
        actions={
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Employee:
              </span>
              <select
                value={selectedHrpn}
                onChange={(e) => setSelectedHrpn(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[280px] shadow-xs"
              >
                {filteredEmployeesList.map((emp) => (
                  <option key={emp.hrpn} value={emp.hrpn}>
                    {emp.hrpn} — {emp.name} {emp.designation ? `(${emp.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by HRPN or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 font-medium text-slate-800 dark:text-slate-200 shadow-xs"
              />
            </div>

            <PbButton
              variant="ghost"
              icon={RefreshCw}
              onClick={loadData}
              disabled={isLoading}
              title="Refresh Ledger"
            />

            <PbButton
              variant="primary"
              icon={Download}
              onClick={handleExportExcel}
              disabled={!matrixReport || !hasEmployeeData}
            >
              Export Statement (.xlsx)
            </PbButton>

            <PbButton
              variant="secondary"
              icon={Printer}
              onClick={handlePrint}
              disabled={!hasEmployeeData}
            >
              Print Ledger
            </PbButton>
          </>
        }
      />

      {loadError && (
        <div className="px-4 py-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5">
          <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            !
          </span>
          <div className="text-xs text-rose-700 dark:text-rose-300">
            <div className="font-bold">Employee data could not be loaded</div>
            <div className="mt-0.5 opacity-90">{loadError}</div>
          </div>
        </div>
      )}

      {/* Employee Financial Details */}
      {currentEmployeeInfo && hasEmployeeData ? (
        <div className="space-y-4">
          {/* Employee Master Card */}
          <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-100/60 dark:bg-blue-900/20 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <User size={26} strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      {currentEmployeeInfo.name}
                    </h3>
                    <span className="font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full text-[0.7rem]">
                      HRPN: {currentEmployeeInfo.hrpn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                    <span className="font-medium">{currentEmployeeInfo.designation || 'Staff'}</span>
                    <span>&bull;</span>
                    <span className="font-mono">{currentEmployeeInfo.payScale || 'PB-1 / PB-2'}</span>
                    <span>&bull;</span>
                    <span className="font-bold">FY {fyLabel}</span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[0.7rem] text-slate-400 block font-semibold uppercase tracking-wide">
                  Annual Net Take-Home
                </span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {formatInr(netPayTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Annual Metric Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Annual Gross"
              value={formatInr(adjustedGross)}
              tone="indigo"
              icon={Wallet}
              sub="Total earnings credited"
            />
            <StatCard
              label="Income Tax (9510)"
              value={formatInr(annualDeductionTotals.incomeTax)}
              tone="amber"
              icon={Landmark}
              sub="Tax deducted at source"
            />
            <StatCard
              label="Total Deductions"
              value={formatInr(adjustedTotalDeductions)}
              tone="rose"
              icon={ArrowDownCircle}
              sub="All recoveries combined"
            />
            <StatCard
              label="Net Pay"
              value={formatInr(netPayTotal)}
              tone="emerald"
              icon={PiggyBank}
              sub="Take-home after deductions"
            />
          </div>

          {/* LEDGER MATRIX: 12 Months across the top, allowance parameters as rows */}
          <PbPanel
            padded={false}
            bodyClassName="flex flex-col"
            actions={
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">FY {fyLabel}</span>
            }
          >
            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                12-Month Allowance Ledger &bull; {currentEmployeeInfo.name} (HRPN: {currentEmployeeInfo.hrpn})
              </h4>
              <div className="flex items-center gap-1.5">
                <PbChip tone="blue">EARNING</PbChip>
                <PbChip tone="rose">DEDUCTION</PbChip>
                <PbChip tone="indigo" title="Rows highlighted in colour are totals">TOTALS</PbChip>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[560px] app-scroll">
              <table className="w-full text-xs text-left border-separate border-spacing-0">
                <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[0.68rem] tracking-wider sticky top-0 z-30 backdrop-blur-xs">
                  <tr>
                    <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 min-w-[170px] border-r border-slate-200 dark:border-slate-700">
                      Allowance Parameter
                    </th>
                    {MONTH_ORDER.map((m) => (
                      <th
                        key={m}
                        className="py-2.5 px-2 font-bold border-b border-slate-200 dark:border-slate-700 text-right min-w-[74px]"
                      >
                        {m}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-slate-200/60 dark:bg-slate-700/60 min-w-[96px]">
                      Annual Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <>
                    <tr className="bg-blue-100/80 dark:bg-blue-950/50">
                      <td colSpan={14} className="py-1.5 px-3 font-sans font-bold text-blue-900 dark:text-blue-200">
                        EARNING (Rs.)
                      </td>
                    </tr>
                    {ledgerMatrixRows
                      .filter((r) => r.group === 'EARNING')
                      .map((row) => renderMatrixRow(row))}
                  </>
                  <>
                    <tr className="bg-rose-100/80 dark:bg-rose-950/40">
                      <td colSpan={14} className="py-1.5 px-3 font-sans font-bold text-rose-900 dark:text-rose-200">
                        DEDUCTION (Rs.)
                      </td>
                    </tr>
                    {ledgerMatrixRows
                      .filter((r) => r.group === 'DEDUCTION')
                      .map((row) => renderMatrixRow(row))}
                  </>
                </tbody>
              </table>
            </div>
          </PbPanel>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm">
          <EmptyState
            icon={User}
            title="No earnings or deduction records found for this employee"
            hint="Upload pay bills (Earning & Deduction side) for this Financial Year to build the complete employee ledger."
          />
        </div>
      )}
    </div>
  );
}
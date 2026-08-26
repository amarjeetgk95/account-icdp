import { orderItems } from '../../utils/columnOrder';
import { PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../../services/paybillReport.service';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../../types';

export const MONTH_ORDER = [
  'March', 'April', 'May',
  'June', 'July', 'August',
  'September', 'October', 'November',
  'December', 'January', 'February',
];

export type MonthRange = 'FULL' | 'H1' | 'H2';

export type ManualValuesMap = Record<string, Record<string, Record<string, number>>>;

export interface LedgerMatrixRow {
  key: string;
  label: string;
  group: 'EARNING' | 'DEDUCTION';
  values: number[];
  total: number;
  isManual?: boolean;
}

/** Indices of the 12 fiscal-month columns shown for the selected range (H1 = Mar–Aug, H2 = Sep–Feb). */
export function getVisibleMonthIndices(monthRange: MonthRange): number[] {
  return MONTH_ORDER.map((_, i) => i).filter(
    (i) => monthRange === 'FULL' || (monthRange === 'H1' ? i < 6 : i >= 6)
  );
}

/** Per-month sums of manual allowance / deduction entries keyed by fiscal month index. */
export function computeManualMonthlySums(
  empManualValues: ManualValuesMap[string],
  manualAllowances: string[],
  manualDeductions: string[]
): {
  allowance: number[];
  deduction: number[];
  allowanceTotal: number;
  deductionTotal: number;
} {
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
}

interface LedgerMatrixInput {
  earnings: PayBillStoredEarning[];
  deductions: PayBillStoredDeduction[];
  manualAllowances: string[];
  manualDeductions: string[];
  empManualValues: ManualValuesMap[string];
  earningColumnOrder: string[];
  deductionColumnOrder: string[];
}

/**
 * Builds the 12-month ledger matrix rows using simple mathematical formulas:
 * - Gross Amount = Sum of all individual standard allowances + manual allowances
 * - Total Deductions = Sum of all individual standard deductions + manual deductions
 * - Net Pay = Gross Amount - Total Deductions
 */
export function buildLedgerMatrixRows(input: LedgerMatrixInput): LedgerMatrixRow[] {
  const {
    earnings,
    deductions,
    manualAllowances,
    manualDeductions,
    empManualValues,
    earningColumnOrder,
    deductionColumnOrder,
  } = input;

  const monthIdx = new Map(MONTH_ORDER.map((m, i) => [m, i]));
  const read = (rec: unknown, key: string): number =>
    Number((rec as Record<string, unknown>)?.[key] ?? 0);

  // 1. Build individual standard earning parameter rows (excluding grossAmount)
  const earningCols = PAYBILL_EARNING_COLUMNS.filter((c) => c.key !== 'grossAmount');
  const earningStandard: LedgerMatrixRow[] = earningCols.map((col) => {
    const values = new Array<number>(12).fill(0);
    let total = 0;
    for (const e of earnings) {
      const i = monthIdx.get(e.month);
      if (i === undefined) continue;
      const v = read(e, col.key);
      values[i] += v;
      total += v;
    }
    return { key: col.key, label: col.label, group: 'EARNING', values, total };
  });

  // 2. Build manual allowance difference rows
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
  const manualEarningRows = manualAllowances.map((label) => manualRow(label, 'EARNING'));
  const allEarningRows = [...earningStandard, ...manualEarningRows];

  // 3. Simple Formula for Gross Amount (Earning Total): Sum of all earning items per month
  const grossValues = MONTH_ORDER.map((_, i) =>
    allEarningRows.reduce((sum, row) => sum + (row.values[i] || 0), 0)
  );
  const grossTotal = grossValues.reduce((a, b) => a + b, 0);
  const grossRow: LedgerMatrixRow = {
    key: 'grossAmount',
    label: PAYBILL_EARNING_COLUMNS.find((c) => c.key === 'grossAmount')?.label || 'Gross Amt',
    group: 'EARNING',
    values: grossValues,
    total: grossTotal,
  };

  // 4. Build individual standard deduction parameter rows (excluding totalDeductions and netPay)
  const deductionCols = PAYBILL_DEDUCTION_COLUMNS.filter(
    (c) => c.key !== 'totalDeductions' && c.key !== 'netPay'
  );
  const deductionStandard: LedgerMatrixRow[] = deductionCols.map((col) => {
    const values = new Array<number>(12).fill(0);
    let total = 0;
    for (const d of deductions) {
      const i = monthIdx.get(d.month);
      if (i === undefined) continue;
      const v = read(d, col.key);
      values[i] += v;
      total += v;
    }
    return { key: col.key, label: col.label, group: 'DEDUCTION', values, total };
  });

  // 5. Build manual deduction rows
  const manualDeductionRows = manualDeductions.map((label) => manualRow(label, 'DEDUCTION'));
  const allDeductionRows = [...deductionStandard, ...manualDeductionRows];

  // 6. Simple Formula for Total Deductions: Sum of all deduction items per month
  const totalDedValues = MONTH_ORDER.map((_, i) =>
    allDeductionRows.reduce((sum, row) => sum + (row.values[i] || 0), 0)
  );
  const totalDedTotal = totalDedValues.reduce((a, b) => a + b, 0);
  const totalDedRow: LedgerMatrixRow = {
    key: 'totalDeductions',
    label: 'Total Deductions',
    group: 'DEDUCTION',
    values: totalDedValues,
    total: totalDedTotal,
  };

  // 7. Simple Formula for Net Amount (Net Take-Home Pay): Gross - Total Deductions
  const netPayValues = MONTH_ORDER.map((_, i) => grossValues[i] - totalDedValues[i]);
  const netPayTotal = grossTotal - totalDedTotal;
  const netPayRow: LedgerMatrixRow = {
    key: 'netPay',
    label: 'Net Pay',
    group: 'DEDUCTION',
    values: netPayValues,
    total: netPayTotal,
  };

  // 8. Order items
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
    allEarningRows,
    effectiveEarningOrder,
    ['grossAmount']
  ).concat(grossRow);

  const orderedDeductions = orderItems(
    allDeductionRows,
    deductionColumnOrder,
    ['totalDeductions', 'netPay']
  ).concat(totalDedRow, netPayRow);

  return [...orderedEarnings, ...orderedDeductions];
}

/**
 * Anomalous months: zero gross (missing salary run) or negative net pay (over-deduction).
 * Zero-gross months only count when at least one month has gross > 0 — an all-zero
 * year means no salary runs were uploaded at all, which is not an anomaly.
 */
export function computeAnomalyMonths(rows: LedgerMatrixRow[]): {
  zeroGross: Set<number>;
  negativeNet: Set<number>;
} {
  const grossRow = rows.find((r) => r.key === 'grossAmount');
  const netRow = rows.find((r) => r.key === 'netPay');
  const zeroGross = new Set<number>();
  const negativeNet = new Set<number>();
  const hasAnyPositiveGross = !!grossRow?.values.some((v) => v > 0);
  if (grossRow && hasAnyPositiveGross) {
    grossRow.values.forEach((v, i) => {
      if (v <= 0) zeroGross.add(i);
    });
  }
  netRow?.values.forEach((v, i) => {
    if (v < 0) negativeNet.add(i);
  });
  return { zeroGross, negativeNet };
}

export interface EarningsTotals {
  basicPay: number;
  da: number;
  hra: number;
  cla: number;
  medical: number;
  transport: number;
  specialPay: number;
  washing: number;
  npp: number;
  gross: number;
}

export interface DeductionTotals {
  incomeTax: number;
  profTax: number;
  hbaInterest: number;
  gpfRegular: number;
  gpfClass4: number;
  npsRegular: number;
  gisGovtFund: number;
  gisGovtSaving: number;
  totalDeductions: number;
  netPay: number;
}

/** Annual totals calculated directly from individual allowance components. */
export function sumEarningsTotals(earnings: PayBillStoredEarning[]): EarningsTotals {
  return earnings.reduce<EarningsTotals>(
    (acc, r) => {
      const basic = r.basicPay || 0;
      const da = r.da || 0;
      const hra = r.hra || 0;
      const cla = r.cla || 0;
      const med = r.medicalAllowance || 0;
      const trans = r.transportAllowance || 0;
      const spec = r.specialPay || 0;
      const wash = r.washingAllowance || 0;
      const npp = r.nppAllowance || 0;

      acc.basicPay += basic;
      acc.da += da;
      acc.hra += hra;
      acc.cla += cla;
      acc.medical += med;
      acc.transport += trans;
      acc.specialPay += spec;
      acc.washing += wash;
      acc.npp += npp;
      // Formula: sum of all individual earning components
      acc.gross += basic + da + hra + cla + med + trans + spec + wash + npp;
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
}

/** Annual totals calculated directly from individual deduction components. */
export function sumDeductionTotals(deductions: PayBillStoredDeduction[]): DeductionTotals {
  return deductions.reduce<DeductionTotals>(
    (acc, r) => {
      const it = r.incomeTax || 0;
      const pt = r.profTax || 0;
      const hba = r.hbaInterest || 0;
      const gpfReg = r.gpfRegular || 0;
      const gpfCl4 = r.gpfClass4 || 0;
      const nps = r.npsRegular || 0;
      const gisF = r.gisGovtFund || 0;
      const gisS = r.gisGovtSaving || 0;
      const other = r.otherDeductions || 0;

      acc.incomeTax += it;
      acc.profTax += pt;
      acc.hbaInterest += hba;
      acc.gpfRegular += gpfReg;
      acc.gpfClass4 += gpfCl4;
      acc.npsRegular += nps;
      acc.gisGovtFund += gisF;
      acc.gisGovtSaving += gisS;
      // Formula: sum of all individual deduction components
      const rowDed = it + pt + hba + gpfReg + gpfCl4 + nps + gisF + gisS + other;
      acc.totalDeductions += rowDed;
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
}

/**
 * Summary-bar figures calculated via standard accounting formula:
 * - Adjusted Gross = Sum(Earning components) + Manual Allowances
 * - Adjusted Total Deductions = Sum(Deduction components) + Manual Deductions
 * - Net Pay Total = Adjusted Gross - Adjusted Total Deductions
 */
export function computeAdjustedTotals(
  annualEarnings: Pick<EarningsTotals, 'gross'>,
  annualDeductions: Pick<DeductionTotals, 'totalDeductions'> | DeductionTotals,
  manualSums: { allowanceTotal: number; deductionTotal: number }
): { adjustedGross: number; adjustedTotalDeductions: number; netPayTotal: number } {
  const adjustedGross = annualEarnings.gross + manualSums.allowanceTotal;
  const adjustedTotalDeductions =
    annualDeductions.totalDeductions + manualSums.deductionTotal;
  // Formula: Net = Gross - Deductions
  const netPayTotal = adjustedGross - adjustedTotalDeductions;
  return { adjustedGross, adjustedTotalDeductions, netPayTotal };
}

/** Visible-period sum and row count for one matrix section (EARNING or DEDUCTION). */
export function summarizeSection(
  rows: LedgerMatrixRow[],
  group: 'EARNING' | 'DEDUCTION',
  visibleIndices: number[]
): { total: number; count: number } {
  const sectionRows = rows.filter((r) => r.group === group);
  const total = visibleIndices.reduce(
    (s, i) => s + sectionRows.reduce((rs, r) => rs + (r.values[i] || 0), 0),
    0
  );
  return { total, count: sectionRows.length };
}

/** Per-month totals across all rows for the sticky footer strip. */
export function monthlyColumnTotals(rows: LedgerMatrixRow[], visibleIndices: number[]): number[] {
  return visibleIndices.map((mi) => rows.reduce((s, r) => s + (r.values[mi] || 0), 0));
}

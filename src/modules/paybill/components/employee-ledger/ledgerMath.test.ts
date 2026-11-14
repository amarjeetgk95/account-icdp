import { describe, it, expect } from 'vitest';
import {
  MONTH_ORDER,
  getVisibleMonthIndices,
  buildLedgerMatrixRows,
  computeAnomalyMonths,
  computeAdjustedTotals,
  computeManualMonthlySums,
  summarizeSection,
  monthlyColumnTotals,
  sumEarningsTotals,
  sumDeductionTotals,
} from './ledgerMath';
import type { LedgerMatrixRow, ManualValuesMap } from './ledgerMath';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../../types';

const FINANCIAL_YEAR = 2026;

const makeEarning = (overrides: Partial<PayBillStoredEarning> = {}): PayBillStoredEarning => ({
  id: 'earn-1',
  importId: 'imp-1',
  officeId: 'office-123',
  employeeId: 'emp-1',
  hrpn: '20014113',
  employeeName: 'Dr. Ramesh Patel',
  designation: 'Veterinary Officer',
  payScale: 'Level 10',
  ph: null,
  slo: null,
  month: 'March',
  financialYear: FINANCIAL_YEAR,
  basicPay: 1000,
  da: 200,
  hra: 100,
  cla: 10,
  medicalAllowance: 50,
  transportAllowance: 30,
  specialPay: 0,
  washingAllowance: 0,
  nppAllowance: 0,
  grossAmount: 1390,
  mappingStatus: 'MATCHED',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makeDeduction = (overrides: Partial<PayBillStoredDeduction> = {}): PayBillStoredDeduction => ({
  id: 'ded-1',
  importId: 'imp-1',
  officeId: 'office-123',
  employeeId: 'emp-1',
  hrpn: '20014113',
  employeeName: 'Dr. Ramesh Patel',
  designation: 'Veterinary Officer',
  month: 'March',
  financialYear: FINANCIAL_YEAR,
  incomeTax: 100,
  profTax: 10,
  hbaInterest: 0,
  gpfRegular: 60,
  gpfClass4: 0,
  npsRegular: 0,
  gisGovtFund: 12,
  gisGovtSaving: 8,
  totalDeductions: 190,
  netPay: 1200,
  mappingStatus: 'MATCHED',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const buildInput = (
  overrides: Partial<Parameters<typeof buildLedgerMatrixRows>[0]> = {}
) => ({
  earnings: [] as PayBillStoredEarning[],
  deductions: [] as PayBillStoredDeduction[],
  manualAllowances: [] as string[],
  manualDeductions: [] as string[],
  empManualValues: {} as ManualValuesMap[string],
  earningColumnOrder: [] as string[],
  deductionColumnOrder: [] as string[],
  ...overrides,
});

const rowMap = (rows: LedgerMatrixRow[]) => new Map(rows.map((r) => [r.key, r]));

describe('MONTH_ORDER / getVisibleMonthIndices', () => {
  it('orders fiscal months from March to February', () => {
    expect(MONTH_ORDER[0]).toBe('March');
    expect(MONTH_ORDER[5]).toBe('August');
    expect(MONTH_ORDER[6]).toBe('September');
    expect(MONTH_ORDER[11]).toBe('February');
    expect(MONTH_ORDER).toHaveLength(12);
  });

  it('FULL returns all 12 indices, H1 the first six, H2 the last six', () => {
    expect(getVisibleMonthIndices('FULL')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(getVisibleMonthIndices('H1')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(getVisibleMonthIndices('H2')).toEqual([6, 7, 8, 9, 10, 11]);
  });
});

describe('buildLedgerMatrixRows', () => {
  it('places each record value into its own month column', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({
        earnings: [makeEarning(), makeEarning({ id: 'e2', month: 'September', basicPay: 500 })],
      })
    );
    const basic = rowMap(rows).get('basicPay');
    expect(basic?.values[0]).toBe(1000);
    expect(basic?.values[6]).toBe(500);
    expect(basic?.total).toBe(1500);
  });

  it('ignores records whose month is outside the fiscal calendar', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({ earnings: [makeEarning({ month: 'Marchember' as string })] })
    );
    const basic = rowMap(rows).get('basicPay');
    expect(basic?.values.every((v) => v === 0)).toBe(true);
    expect(basic?.total).toBe(0);
  });

  it('folds manual allowances into Gross Amt and manual deductions into Total Deductions', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({
        earnings: [makeEarning()],
        deductions: [makeDeduction()],
        manualAllowances: ['Pay Difference'],
        manualDeductions: ['Union Fee'],
        empManualValues: {
          'Pay Difference': { March: 500, April: 250 },
          'Union Fee': { March: 40 },
        },
      })
    );
    const map = rowMap(rows);

    const gross = map.get('grossAmount');
    expect(gross?.values[0]).toBe(1890); // 1390 stored + 500 manual
    expect(gross?.values[1]).toBe(250); // 0 stored + 250 manual
    expect(gross?.total).toBe(2140);

    const totalDed = map.get('totalDeductions');
    expect(totalDed?.values[0]).toBe(230); // 190 stored + 40 manual
    expect(totalDed?.values[1]).toBe(0);
    expect(totalDed?.total).toBe(230);

    // Net pay adjusts by (+allowance −deduction) per month and re-derives its total from values
    const netPay = map.get('netPay');
    expect(netPay?.values[0]).toBe(1660); // 1200 + 500 − 40
    expect(netPay?.values[1]).toBe(250); // 0 + 250 − 0
    expect(netPay?.total).toBe(1910);
    expect(netPay?.total).toBe(netPay!.values.reduce((a, b) => a + b, 0));
  });

  it('emits one manual row per configured parameter with the manual:: key prefix', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({
        manualAllowances: ['Pay Difference'],
        manualDeductions: ['Union Fee'],
        empManualValues: { 'Pay Difference': { May: 75 } },
      })
    );
    const payDiff = rows.find((r) => r.key === 'manual::Pay Difference');
    expect(payDiff).toMatchObject({ label: 'Pay Difference', group: 'EARNING', isManual: true });
    expect(payDiff?.values[2]).toBe(75);
    expect(payDiff?.total).toBe(75);

    const unionFee = rows.find((r) => r.key === 'manual::Union Fee');
    expect(unionFee).toMatchObject({ label: 'Union Fee', group: 'DEDUCTION', isManual: true });
    expect(unionFee?.values.every((v) => v === 0)).toBe(true);

    // Parameters absent from the settings produce no row at all
    expect(rows.find((r) => r.key === 'manual::DA Difference')).toBeUndefined();
  });

  it('default ordering puts difference rows before a trailing Gross Amt among earnings', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({
        manualAllowances: ['Pay Difference', 'DA Difference'],
      })
    );
    const earningKeys = rows.filter((r) => r.group === 'EARNING').map((r) => r.key);
    expect(earningKeys).toEqual([
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
      'grossAmount',
    ]);
  });

  it('default ordering pins Total Deductions and Net Pay last among deductions', () => {
    const rows = buildLedgerMatrixRows(buildInput());
    const dedKeys = rows.filter((r) => r.group === 'DEDUCTION').map((r) => r.key);
    expect(dedKeys.slice(-3)).toEqual(['otherDeductions', 'totalDeductions', 'netPay']);
    expect(dedKeys[0]).toBe('incomeTax');
  });

  it('respects a custom earning column order while keeping grossAmount pinned last', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({
        manualAllowances: ['Pay Difference'],
        earningColumnOrder: ['nppAllowance', 'basicPay'],
      })
    );
    const earningKeys = rows.filter((r) => r.group === 'EARNING').map((r) => r.key);
    expect(earningKeys[0]).toBe('nppAllowance');
    expect(earningKeys[1]).toBe('basicPay');
    // Items absent from the custom order keep their original relative order afterwards
    expect(earningKeys[2]).toBe('da');
    expect(earningKeys[earningKeys.length - 1]).toBe('grossAmount');
  });

  it('respects a custom deduction column order while pinning totals last', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({ deductionColumnOrder: ['gisGovtFund', 'profTax'] })
    );
    const dedKeys = rows.filter((r) => r.group === 'DEDUCTION').map((r) => r.key);
    expect(dedKeys.slice(0, 2)).toEqual(['gisGovtFund', 'profTax']);
    expect(dedKeys[2]).toBe('incomeTax'); // unordered items keep original relative order
    expect(dedKeys.slice(-2)).toEqual(['totalDeductions', 'netPay']);
  });
});

describe('computeAnomalyMonths', () => {
  it('flags zero-or-negative gross and strictly-negative net months', () => {
    const anomalies = computeAnomalyMonths([
      { key: 'grossAmount', label: 'Gross', group: 'EARNING', values: [0, 100, -5], total: 95 },
      { key: 'netPay', label: 'Net Pay', group: 'DEDUCTION', values: [-1, 50, 0], total: 49 },
    ]);
    expect([...anomalies.zeroGross].sort()).toEqual([0, 2]); // 0 and -5 both count as "zero"
    expect([...anomalies.negativeNet]).toEqual([0]);
  });

  it('returns empty sets when gross/net rows are missing', () => {
    const anomalies = computeAnomalyMonths([
      { key: 'basicPay', label: 'Basic Pay', group: 'EARNING', values: [1], total: 1 },
    ]);
    expect(anomalies.zeroGross.size).toBe(0);
    expect(anomalies.negativeNet.size).toBe(0);
  });

  it('quirk: months without records have gross 0 and are flagged too', () => {
    const rows = buildLedgerMatrixRows(
      buildInput({ earnings: [makeEarning()], deductions: [makeDeduction()] })
    );
    const anomalies = computeAnomalyMonths(rows);
    expect(anomalies.zeroGross.size).toBe(11); // every non-March month
    expect(anomalies.zeroGross.has(0)).toBe(false);
    expect(anomalies.negativeNet.size).toBe(0);
  });

  it('all-zero year (no salary runs uploaded) yields an empty anomaly set', () => {
    const rows = buildLedgerMatrixRows(buildInput()); // no records at all
    const anomalies = computeAnomalyMonths(rows);
    expect(anomalies.zeroGross.size).toBe(0);
    expect(anomalies.negativeNet.size).toBe(0);
  });

  it('still flags negative net even when every month has zero gross', () => {
    const anomalies = computeAnomalyMonths([
      { key: 'grossAmount', label: 'Gross', group: 'EARNING', values: [0, 0, 0], total: 0 },
      { key: 'netPay', label: 'Net Pay', group: 'DEDUCTION', values: [-7, 0, 0], total: -7 },
    ]);
    expect(anomalies.zeroGross.size).toBe(0);
    expect([...anomalies.negativeNet]).toEqual([0]);
  });
});

describe('sumEarningsTotals / sumDeductionTotals', () => {
  it('sums every accumulator across records, tolerating absent optional fields', () => {
    const totals = sumEarningsTotals([
      makeEarning(),
      makeEarning({ id: 'e2', basicPay: 900, da: 180, grossAmount: 1240 }),
      makeEarning({ id: 'e3', specialPay: undefined, washingAllowance: undefined }),
    ]);
    expect(totals.basicPay).toBe(2900);
    expect(totals.da).toBe(580);
    expect(totals.gross).toBe(4050);
    expect(totals.specialPay).toBe(0);
    expect(totals.washing).toBe(0);
    expect(totals.medical).toBe(150);
    expect(totals.npp).toBe(0);

    const empty = sumEarningsTotals([]);
    expect(empty.gross).toBe(0);
  });

  it('sums deduction accumulators across records', () => {
    const totals = sumDeductionTotals([
      makeDeduction(),
      makeDeduction({ id: 'd2', incomeTax: 50, totalDeductions: 140, netPay: 1100 }),
    ]);
    expect(totals.incomeTax).toBe(150);
    expect(totals.profTax).toBe(20);
    expect(totals.gpfRegular).toBe(120);
    expect(totals.gisGovtSaving).toBe(16);
    expect(totals.totalDeductions).toBe(330);
    expect(totals.netPay).toBe(2300);

    const empty = sumDeductionTotals([]);
    expect(empty.totalDeductions).toBe(0);
    expect(empty.netPay).toBe(0);
  });
});

describe('computeAdjustedTotals', () => {
  it('adjusts stored net pay by the manual delta when stored net pay is positive', () => {
    const result = computeAdjustedTotals(
      { gross: 6000 },
      { ...sumDeductionTotals([]), totalDeductions: 700, netPay: 5300 },
      { allowanceTotal: 300, deductionTotal: 100 }
    );
    expect(result.adjustedGross).toBe(6300);
    expect(result.adjustedTotalDeductions).toBe(800);
    expect(result.netPayTotal).toBe(5500); // 5300 + 300 − 100
  });

  it('derives net pay from adjusted gross minus deductions when stored net pay is 0', () => {
    const result = computeAdjustedTotals(
      { gross: 6000 },
      { ...sumDeductionTotals([]), totalDeductions: 700, netPay: 0 },
      { allowanceTotal: 300, deductionTotal: 100 }
    );
    expect(result.netPayTotal).toBe(5500); // 6300 − 800
  });
});

describe('computeManualMonthlySums', () => {
  it('sums each manual parameter per month plus grand totals', () => {
    const sums = computeManualMonthlySums(
      {
        A: { March: 10, April: 20 },
        B: { March: 5 },
        C: { March: 1, April: 2 },
      },
      ['A', 'B'],
      ['C']
    );
    expect(sums.allowance).toEqual([15, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sums.deduction[0]).toBe(1);
    expect(sums.allowanceTotal).toBe(35);
    expect(sums.deductionTotal).toBe(3);
  });

  it('treats non-numeric manual values as zero instead of NaN', () => {
    const sums = computeManualMonthlySums(
      { A: { March: 'x' as unknown as number } },
      ['A'],
      []
    );
    expect(sums.allowance[0]).toBe(0);
  });
});

describe('summarizeSection / monthlyColumnTotals', () => {
  const rows: LedgerMatrixRow[] = [
    { key: 'a', label: 'A', group: 'EARNING', values: [1, 2, 3, 4], total: 10 },
    { key: 'b', label: 'B', group: 'EARNING', values: [10, 20, 30, 40], total: 100 },
    { key: 'c', label: 'C', group: 'DEDUCTION', values: [5, 5, 5, 5], total: 20 },
  ];

  it('sums only the visible indices of the requested section and counts its rows', () => {
    expect(summarizeSection(rows, 'EARNING', [0, 1])).toEqual({ total: 33, count: 2 });
    expect(summarizeSection(rows, 'DEDUCTION', [0, 1, 2, 3])).toEqual({ total: 20, count: 1 });
    expect(summarizeSection(rows, 'DEDUCTION', [])).toEqual({ total: 0, count: 1 });
  });

  it('totals each visible column across all rows regardless of group', () => {
    expect(monthlyColumnTotals(rows, [0, 1])).toEqual([16, 27]);
    expect(monthlyColumnTotals([], [0, 1, 2])).toEqual([0, 0, 0]);
  });
});

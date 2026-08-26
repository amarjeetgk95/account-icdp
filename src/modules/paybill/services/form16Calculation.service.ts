import {
  DEFAULT_TAX_RULES_CONFIG,
  type Form16Certificate,
  type Form16ComputedTotals,
  type Form16PartA,
  type Form16PartB,
  type Form16TaxRulesSettings,
  type AssessmentYearTaxConfig,
  type TaxRegime,
} from '../types/form16';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';

/**
 * Versioned income-tax rules for New Tax Regime (u/s 115BAC) keyed by Assessment Year.
 * Slab boundaries and rates are INR amounts; fully configurable via Settings.
 */
export interface TaxRules {
  ay: string;
  slabs: Array<{ upto: number; rate: number }>;
  basicExemption: number;
  standardDeduction: number;
  rebate87ALimit: number;
  rebate87AMaxAmount: number;
  cessRate?: number;
  surchargeThresholds: Array<{ above: number; rate: number }>;
}

export function configToTaxRules(cfg: AssessmentYearTaxConfig): TaxRules {
  const rawSlabs = cfg.slabs || [];
  return {
    ay: cfg.ay,
    slabs: rawSlabs.map((s, idx) => {
      const isLast = idx === rawSlabs.length - 1;
      const rawUpto = s.upto;
      const upto =
        rawUpto === null ||
        rawUpto === undefined ||
        rawUpto === 0 ||
        rawUpto === Infinity ||
        (isLast && (Number(rawUpto) <= 0 || !isFinite(Number(rawUpto))))
          ? Infinity
          : Number(rawUpto);
      return {
        upto,
        rate: Number(s.rate) || 0,
      };
    }),
    basicExemption: Number(cfg.basicExemption) || 0,
    standardDeduction: Number(cfg.standardDeduction) || 0,
    rebate87ALimit: Number(cfg.rebate87ALimit) || 0,
    rebate87AMaxAmount: Number(cfg.rebate87AMaxAmount) || 0,
    cessRate: Number(cfg.cessRate) || 4,
    surchargeThresholds: (cfg.surchargeThresholds || []).map((sc) => ({
      above: Number(sc.above) || 0,
      rate: Number(sc.rate) || 0,
    })),
  };
}

let activeTaxRulesConfig: Form16TaxRulesSettings = DEFAULT_TAX_RULES_CONFIG;

export function setActiveTaxRulesConfig(config: Form16TaxRulesSettings | null | undefined) {
  if (config?.assessmentYears && Object.keys(config.assessmentYears).length > 0) {
    activeTaxRulesConfig = {
      ...DEFAULT_TAX_RULES_CONFIG,
      ...config,
      assessmentYears: {
        ...DEFAULT_TAX_RULES_CONFIG.assessmentYears,
        ...config.assessmentYears,
      },
    };
  }
}

export const DEFAULT_AY = '2026-27';

/** Latest AY key present in rules (sorted ascending). */
export function latestConfiguredAy(customSettings?: Form16TaxRulesSettings | null): string {
  const source = customSettings?.assessmentYears || activeTaxRulesConfig.assessmentYears || DEFAULT_TAX_RULES_CONFIG.assessmentYears;
  const keys = Object.keys(source).sort();
  return keys[keys.length - 1] || DEFAULT_AY;
}

export function getTaxRules(
  assessmentYear: string | number,
  _regime?: TaxRegime,
  customSettings?: Form16TaxRulesSettings | null
): TaxRules {
  const ayKey = String(assessmentYear);
  const source =
    customSettings?.assessmentYears ||
    activeTaxRulesConfig.assessmentYears ||
    DEFAULT_TAX_RULES_CONFIG.assessmentYears;

  if (source[ayKey]) {
    return configToTaxRules(source[ayKey]);
  }

  const fallbackKey = latestConfiguredAy(customSettings);
  if (source[fallbackKey]) {
    return configToTaxRules(source[fallbackKey]);
  }

  return configToTaxRules(DEFAULT_TAX_RULES_CONFIG.assessmentYears['2026-27']);
}

export function assessmentYearFor(fy: number): string {
  return `${fy + 1}-${String((fy + 2) % 100).padStart(2, '0')}`;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export function taxOnIncome(taxableIncome: number, rules: TaxRules): number {
  let remaining = Math.max(0, taxableIncome);
  let prev = 0;
  let tax = 0;
  for (let i = 0; i < rules.slabs.length; i++) {
    const slab = rules.slabs[i];
    const isLast = i === rules.slabs.length - 1;
    const slabUpto =
      slab.upto == null || slab.upto <= 0 || !isFinite(slab.upto) || isLast
        ? Infinity
        : Number(slab.upto);

    const span = Math.min(remaining, slabUpto - prev);
    if (span <= 0) break;
    tax += (span * (Number(slab.rate) || 0)) / 100;
    remaining -= span;
    prev = slabUpto;
    if (remaining <= 0) break;
  }
  return Math.ceil(tax);
}

/**
 * Calculates Section 87A rebate with statutory marginal relief under Section 87A proviso.
 */
export function calculateRebate87A(
  taxableIncome: number,
  taxOnIncomeAmount: number,
  rules: TaxRules
): number {
  if (taxableIncome < rules.basicExemption || taxOnIncomeAmount <= 0) {
    return 0;
  }

  // 1. Full rebate within threshold
  if (taxableIncome <= rules.rebate87ALimit) {
    return Math.min(taxOnIncomeAmount, rules.rebate87AMaxAmount);
  }

  // 2. Marginal relief under Section 87A proviso (New Tax Regime)
  // Tax payable cannot exceed excess taxable income above rebate limit
  const excessIncome = taxableIncome - rules.rebate87ALimit;
  if (taxOnIncomeAmount > excessIncome) {
    const marginalRebate = taxOnIncomeAmount - excessIncome;
    return Math.min(taxOnIncomeAmount, Math.max(0, Math.ceil(marginalRebate)));
  }

  return 0;
}

/**
 * Calculates Income Tax Surcharge with statutory Marginal Relief for High-Net-Worth individuals.
 */
export function calculateSurchargeWithMarginalRelief(
  taxableIncome: number,
  taxOnIncomeAmount: number,
  rules: TaxRules
): number {
  if (!rules.surchargeThresholds || rules.surchargeThresholds.length === 0 || taxOnIncomeAmount <= 0) {
    return 0;
  }

  const sorted = [...rules.surchargeThresholds].sort((a, b) => a.above - b.above);

  let activeThreshold: { above: number; rate: number } | null = null;
  for (const t of sorted) {
    if (taxableIncome > t.above) {
      activeThreshold = t;
    }
  }

  if (!activeThreshold || activeThreshold.rate <= 0) {
    return 0;
  }

  const rawSurcharge = (taxOnIncomeAmount * activeThreshold.rate) / 100;
  const totalTaxWithRawSurcharge = taxOnIncomeAmount + rawSurcharge;

  // Marginal relief check:
  // (Tax on threshold limit) + (Prior surcharge on threshold limit) + (Excess income over threshold)
  const taxAtThreshold = taxOnIncome(activeThreshold.above, rules);
  const priorThreshold = sorted.filter((t) => t.above < activeThreshold!.above).pop();
  const priorSurchargeAtThreshold = priorThreshold
    ? (taxAtThreshold * priorThreshold.rate) / 100
    : 0;

  const maxTotalPayable =
    taxAtThreshold + priorSurchargeAtThreshold + (taxableIncome - activeThreshold.above);

  if (totalTaxWithRawSurcharge > maxTotalPayable) {
    const relievedSurcharge = Math.max(0, maxTotalPayable - taxOnIncomeAmount);
    return Math.ceil(relievedSurcharge);
  }

  return Math.ceil(rawSurcharge);
}

export interface ComputeForm16Input {
  financialYear: number;
  assessmentYear?: string;
  taxRegime: TaxRegime;
  earnings: Pick<PayBillStoredEarning, 'grossAmount'>[];
  deductions: Pick<PayBillStoredDeduction, 'incomeTax'>[];
  partA?: Partial<Form16PartA>;
  partB: Partial<Form16PartB>;
  taxRulesSettings?: Form16TaxRulesSettings | null;
}

export function computeForm16Totals(input: ComputeForm16Input): Form16ComputedTotals {
  const ayKey = input.assessmentYear ?? assessmentYearFor(input.financialYear);
  const rules = getTaxRules(ayKey, input.taxRegime, input.taxRulesSettings);

  // 1. Gross Salary (Strictly fetched from Paybill Employee Ledger with respect to HRPN)
  const grossSalary17_1 = round2(
    input.earnings.reduce((s, e) => s + (Number(e.grossAmount) || 0), 0)
  );

  const perquisites17_2 = round2(Number(input.partB?.perquisites17_2) || 0);
  const profitsInLieu17_3 = round2(Number(input.partB?.profitsInLieu17_3) || 0);
  const totalGrossSalary1d = round2(grossSalary17_1 + perquisites17_2 + profitsInLieu17_3);
  const otherEmployerSalary = round2(Number(input.partB?.otherEmployerSalary) || 0);
  const totalSalaryHead = round2(totalGrossSalary1d + otherEmployerSalary);

  // 2. Deductions from salary under section 16 — New-regime applicable
  const stdDedMax = rules.standardDeduction;
  const standardDeduction16ia =
    input.partB?.standardDeductionOverride != null
      ? round2(Number(input.partB.standardDeductionOverride))
      : round2(Math.min(stdDedMax, totalSalaryHead));

  // 3. Income chargeable under the head 'Salaries' after standard deduction
  const incomeChargeableSalaries = round2(Math.max(0, totalSalaryHead - standardDeduction16ia));

  // 4. Add: Any other income reported by the employee under section 192(2B)
  const housePropertyIncome = round2(Number(input.partB?.housePropertyIncome) || 0);
  const otherSourcesIncome = round2(Number(input.partB?.otherSourcesIncome) || 0);

  // 5. Total other income reported by employee
  const totalOtherIncome = round2(housePropertyIncome + otherSourcesIncome);

  // 6. Gross Total Income
  const grossTotalIncome = round2(Math.max(0, incomeChargeableSalaries + totalOtherIncome));

  // 7 & 8. New Regime Deductions (80CCD(2) + 80CCH)
  const nps80CCD2 = round2(Number(input.partB?.nps80CCD2) || 0);
  const agnipath80CCH = round2(Number(input.partB?.agnipath80CCH) || 0);

  // 9. Aggregate new-regime deductions
  const aggregateNewRegimeDeductions = round2(nps80CCD2 + agnipath80CCH);

  // 10. Total Taxable Income
  const totalTaxableIncome = round2(Math.max(0, grossTotalIncome - aggregateNewRegimeDeductions));

  // 11. Tax on total income
  const taxOnTotalIncome = taxOnIncome(totalTaxableIncome, rules);

  // 12. Rebate under section 87A (with marginal relief)
  const rebate87A = calculateRebate87A(totalTaxableIncome, taxOnTotalIncome, rules);

  // 13. Surcharge (with marginal relief)
  const surcharge = calculateSurchargeWithMarginalRelief(totalTaxableIncome, taxOnTotalIncome, rules);

  // 14. Health and education cess (4%)
  const afterRebate = Math.max(0, taxOnTotalIncome - rebate87A + surcharge);
  const cessRate = (rules.cessRate ?? 4) / 100;
  const cess4 = round2(afterRebate * cessRate);

  // 15. Total Tax payable
  const totalTaxPayable = round2(afterRebate + cess4);

  // 16. Less: Relief under section 89
  const relief89 = round2(Number(input.partB?.relief89) || 0);

  // 17. Less: Tax deducted at source (Strictly fetched from Paybill Employee Ledger with respect to HRPN)
  const tdsDeducted = round2(
    (input.deductions || []).reduce((s, d) => s + (Number(d.incomeTax) || 0), 0)
  );

  // 18. Less: Tax collected at source
  const taxCollectedAtSource = round2(Number(input.partB?.taxCollectedAtSource) || 0);

  // 19. Net Tax Payable
  const netTaxPayable = round2(
    totalTaxPayable - relief89 - tdsDeducted - taxCollectedAtSource
  );

  return {
    grossSalary17_1,
    perquisites17_2,
    profitsInLieu17_3,
    totalGrossSalary1d,
    otherEmployerSalary,
    standardDeduction16ia,
    incomeChargeableSalaries,
    housePropertyIncome,
    otherSourcesIncome,
    totalOtherIncome,
    grossTotalIncome,
    nps80CCD2,
    agnipath80CCH,
    aggregateNewRegimeDeductions,
    totalTaxableIncome,
    taxOnTotalIncome,
    rebate87A,
    surcharge,
    cess4,
    totalTaxPayable,
    relief89,
    tdsDeducted,
    taxCollectedAtSource,
    netTaxPayable,
  };
}

/**
 * Quarter month mappings for Gujarat Government financial year cycle:
 * Q1: March, April, May (paid April-June)
 * Q2: June, July, August
 * Q3: September, October, November
 * Q4: December, January, February
 */
export const QUARTER_MONTHS: Record<string, string[]> = {
  Q1: ['March', 'April', 'May'],
  Q2: ['June', 'July', 'August'],
  Q3: ['September', 'October', 'November'],
  Q4: ['December', 'January', 'February'],
};

export interface PayrollMonthlySalaryRecord {
  month: string;
  gross: number;
  da?: number;
  tax: number;
}

/**
 * Derives Q1-Q4 quarterly breakdown from Payroll module (employee_salaries).
 * Supports both work month and paid month conventions.
 */
export function derivePayrollQuarterlySummary(
  salaries: PayrollMonthlySalaryRecord[]
): Record<string, { amountPaid: number; taxDeducted: number }> {
  const out: Record<string, { amountPaid: number; taxDeducted: number }> = {
    Q1: { amountPaid: 0, taxDeducted: 0 },
    Q2: { amountPaid: 0, taxDeducted: 0 },
    Q3: { amountPaid: 0, taxDeducted: 0 },
    Q4: { amountPaid: 0, taxDeducted: 0 },
  };

  const monthMap: Record<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
    April: 'Q1',
    May: 'Q1',
    June: 'Q1',
    July: 'Q2',
    August: 'Q2',
    September: 'Q2',
    October: 'Q3',
    November: 'Q3',
    December: 'Q3',
    January: 'Q4',
    February: 'Q4',
    March: 'Q4',
  };

  for (const s of salaries) {
    const rawMonth = (s.month || '').trim();
    if (!rawMonth) continue;
    const normalized = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1).toLowerCase();
    const qKey = monthMap[normalized] || monthMap[rawMonth];
    if (qKey && out[qKey]) {
      const grossPaid = Number(s.gross) || 0;
      const daPaid = Number(s.da) || 0;
      const taxPaid = Number(s.tax) || 0;
      out[qKey].amountPaid += grossPaid + daPaid;
      out[qKey].taxDeducted += taxPaid;
    }
  }

  for (const k of ['Q1', 'Q2', 'Q3', 'Q4']) {
    out[k].amountPaid = Math.round(out[k].amountPaid * 100) / 100;
    out[k].taxDeducted = Math.round(out[k].taxDeducted * 100) / 100;
  }

  return out;
}

export function deriveQuarterlySummary(
  earnings: Array<Pick<PayBillStoredEarning, 'month' | 'grossAmount'>>,
  deductions: Array<Pick<PayBillStoredDeduction, 'month' | 'incomeTax'>>
): Record<string, { amountPaid: number; taxDeducted: number }> {
  const out: Record<string, { amountPaid: number; taxDeducted: number }> = {
    Q1: { amountPaid: 0, taxDeducted: 0 },
    Q2: { amountPaid: 0, taxDeducted: 0 },
    Q3: { amountPaid: 0, taxDeducted: 0 },
    Q4: { amountPaid: 0, taxDeducted: 0 },
  };

  for (const e of earnings) {
    if (!e.month) continue;
    for (const [q, months] of Object.entries(QUARTER_MONTHS)) {
      if (months.includes(e.month)) {
        out[q].amountPaid = round2(out[q].amountPaid + (Number(e.grossAmount) || 0));
        break;
      }
    }
  }

  for (const d of deductions) {
    if (!d.month) continue;
    for (const [q, months] of Object.entries(QUARTER_MONTHS)) {
      if (months.includes(d.month)) {
        out[q].taxDeducted = round2(out[q].taxDeducted + (Number(d.incomeTax) || 0));
        break;
      }
    }
  }

  return out;
}

export function validateCertificate(cert: Form16Certificate): string[] {
  const errors: string[] = [];
  if (!cert.employee.name.trim()) errors.push('Employee name is required.');
  if (!cert.employee.pan.trim()) errors.push('Employee PAN is required.');
  else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cert.employee.pan.toUpperCase().trim()))
    errors.push('Employee PAN must match the pattern ABCDE1234F.');
  if (!cert.employer.pan.trim()) errors.push('Employer (deductor) PAN is required.');
  if (!cert.employer.tan.trim()) errors.push('Employer TAN is required.');
  if (!cert.signatory.name.trim()) errors.push('Signatory name is required before issuing.');

  const quartersDeposited = cert.partA.quarters.reduce(
    (s, q) => s + (Number(q.taxDeposited) || 0),
    0
  );
  if (
    cert.computedTotals &&
    cert.status !== 'DRAFT' &&
    Math.abs(quartersDeposited - cert.computedTotals.tdsDeducted) > 1
  ) {
    errors.push(
      `Part A deposited TDS (${quartersDeposited.toFixed(0)}) does not reconcile with computed TDS (${cert.computedTotals.tdsDeducted.toFixed(0)}).`
    );
  }
  return errors;
}

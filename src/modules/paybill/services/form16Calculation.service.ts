import {
  DEFAULT_TAX_RULES_CONFIG,
  type Form16Certificate,
  type Form16ComputedTotals,
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
  return {
    ay: cfg.ay,
    slabs: cfg.slabs.map((s) => ({ upto: Number(s.upto), rate: Number(s.rate) })),
    basicExemption: Number(cfg.basicExemption),
    standardDeduction: Number(cfg.standardDeduction),
    rebate87ALimit: Number(cfg.rebate87ALimit),
    rebate87AMaxAmount: Number(cfg.rebate87AMaxAmount),
    cessRate: Number(cfg.cessRate) || 4,
    surchargeThresholds: cfg.surchargeThresholds.map((sc) => ({
      above: Number(sc.above),
      rate: Number(sc.rate),
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

export function getActiveTaxRulesConfig(): Form16TaxRulesSettings {
  return activeTaxRulesConfig;
}

export const DEFAULT_AY = '2026-27';

/** Latest AY key present in rules (sorted ascending). */
export function latestConfiguredAy(customSettings?: Form16TaxRulesSettings | null): string {
  const source = customSettings?.assessmentYears || activeTaxRulesConfig.assessmentYears || DEFAULT_TAX_RULES_CONFIG.assessmentYears;
  const keys = Object.keys(source).sort();
  return keys[keys.length - 1] || DEFAULT_AY;
}

export function hasTaxRules(assessmentYear: string | number, customSettings?: Form16TaxRulesSettings | null): boolean {
  const source = customSettings?.assessmentYears || activeTaxRulesConfig.assessmentYears || DEFAULT_TAX_RULES_CONFIG.assessmentYears;
  return Object.prototype.hasOwnProperty.call(source, String(assessmentYear));
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
  for (const slab of rules.slabs) {
    const span = Math.min(remaining, slab.upto - prev);
    if (span <= 0) break;
    tax += (span * slab.rate) / 100;
    remaining -= span;
    prev = slab.upto;
  }
  return Math.ceil(tax);
}

export interface ComputeForm16Input {
  financialYear: number;
  assessmentYear?: string;
  taxRegime: TaxRegime;
  earnings: Pick<PayBillStoredEarning, 'grossAmount'>[];
  deductions: Pick<PayBillStoredDeduction, 'incomeTax'>[];
  partB: Partial<Form16PartB>;
  taxRulesSettings?: Form16TaxRulesSettings | null;
}

export function computeForm16Totals(input: ComputeForm16Input): Form16ComputedTotals {
  const ayKey = input.assessmentYear ?? assessmentYearFor(input.financialYear);
  const rules = getTaxRules(ayKey, input.taxRegime, input.taxRulesSettings);

  // 1. Gross Salary
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

  // 12. Rebate under section 87A
  let rebate87A = 0;
  if (
    totalTaxableIncome <= rules.rebate87ALimit &&
    totalTaxableIncome >= rules.basicExemption
  ) {
    rebate87A = Math.min(taxOnTotalIncome, rules.rebate87AMaxAmount);
  }

  // 13. Surcharge
  let surcharge = 0;
  for (const t of rules.surchargeThresholds) {
    if (totalTaxableIncome > t.above) surcharge = (taxOnTotalIncome * t.rate) / 100;
  }
  surcharge = Math.ceil(surcharge);

  // 14. Health and education cess
  const afterRebate = Math.max(0, taxOnTotalIncome - rebate87A + surcharge);
  const cessRate = (rules.cessRate ?? 4) / 100;
  const cess4 = round2(afterRebate * cessRate);

  // 15. Total Tax payable
  const totalTaxPayable = round2(afterRebate + cess4);

  // 16. Less: Relief under section 89
  const relief89 = round2(Number(input.partB?.relief89) || 0);

  // 17. Less: Tax deducted at source
  const tdsDeducted = round2(
    input.deductions.reduce((s, d) => s + (Number(d.incomeTax) || 0), 0)
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

import { describe, it, expect } from 'vitest';
import {
  computeForm16Totals,
  getTaxRules,
  taxOnIncome,
  calculateRebate87A,
  calculateSurchargeWithMarginalRelief,
} from './form16Calculation.service';
import type { Form16PartB } from '../types/form16';

const basePartB = (): Form16PartB => ({
  perquisites17_2: 0,
  profitsInLieu17_3: 0,
  otherEmployerSalary: 0,
  housePropertyIncome: 0,
  otherSourcesIncome: 0,
  nps80CCD2: 0,
  agnipath80CCH: 0,
  relief89: 0,
  taxCollectedAtSource: 0,
});

/** Gross needed so that (gross − 75,000 standard deduction) hits the target taxable income. */
const grossForTaxable = (taxable: number): number => taxable + 75000;

describe('87A rebate boundary — AY 2026-27 (limit 12,00,000)', () => {
  it('grants full rebate exactly at the limit (taxable = 12,00,000)', () => {
    const t = computeForm16Totals({
      financialYear: 2025,
      assessmentYear: '2026-27',
      taxRegime: 'NEW',
      earnings: [{ grossAmount: grossForTaxable(1200000) }],
      deductions: [],
      partB: basePartB(),
    });
    expect(t.totalTaxableIncome).toBe(1200000);
    expect(t.taxOnTotalIncome).toBe(60000);
    expect(t.rebate87A).toBe(60000);
    expect(t.totalTaxPayable).toBe(0);
  });

  it('applies marginal relief just above the limit (taxable = 12,00,001, payable ≈ Re 1)', () => {
    const t = computeForm16Totals({
      financialYear: 2025,
      assessmentYear: '2026-27',
      taxRegime: 'NEW',
      earnings: [{ grossAmount: grossForTaxable(1200001) }],
      deductions: [],
      partB: basePartB(),
    });
    expect(t.totalTaxableIncome).toBe(1200001);
    // Tax cannot exceed the Re 1 excess over the rebate limit (plus 4% cess)
    expect(t.totalTaxPayable).toBeLessThanOrEqual(2);
    expect(t.rebate87A).toBe(60000);
  });
});

describe('87A rebate boundary — AY 2025-26 (limit 7,00,000)', () => {
  it('grants full rebate exactly at the limit (taxable = 7,00,000)', () => {
    const rules = getTaxRules('2025-26', 'NEW');
    expect(rules.rebate87ALimit).toBe(700000);
    // Slabs: 0-3L @0% = 0, 3-6L @5% = 15,000, 6-7L @10% = 10,000
    const tax = taxOnIncome(700000, rules);
    expect(tax).toBe(25000);
    expect(calculateRebate87A(700000, tax, rules)).toBe(25000);
  });

  it('applies marginal relief just above the limit (taxable = 7,00,001)', () => {
    const rules = getTaxRules('2025-26', 'NEW');
    const tax = taxOnIncome(700001, rules);
    const rebate = calculateRebate87A(700001, tax, rules);
    // Net tax after rebate must equal the Re 1 excess
    expect(tax - rebate).toBe(1);
  });
});

describe('surcharge marginal relief — AY 2026-27 (first threshold above 50L)', () => {
  it('levies no surcharge exactly at 50,00,000', () => {
    const rules = getTaxRules('2026-27', 'NEW');
    const tax = taxOnIncome(5000000, rules);
    expect(calculateSurchargeWithMarginalRelief(5000000, tax, rules)).toBe(0);
  });

  it('caps surcharge via marginal relief just above 50L (taxable = 50,00,001)', () => {
    const rules = getTaxRules('2026-27', 'NEW');
    const tax = taxOnIncome(5000001, rules);
    // Relief binds: total cannot exceed tax-at-threshold + Re 1 excess
    expect(calculateSurchargeWithMarginalRelief(5000001, tax, rules)).toBe(0);
  });

  it('levies the full 10% surcharge well above the threshold (taxable = 59,25,000)', () => {
    const rules = getTaxRules('2026-27', 'NEW');
    const tax = taxOnIncome(5925000, rules);
    expect(tax).toBe(1357500);
    expect(calculateSurchargeWithMarginalRelief(5925000, tax, rules)).toBe(135750);
  });
});

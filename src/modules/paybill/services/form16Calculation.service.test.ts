import { describe, it, expect } from 'vitest';
import {
  computeForm16Totals,
  deriveQuarterlySummary,
  validateCertificate,
  getTaxRules,
  hasTaxRules,
  latestConfiguredAy,
} from './form16Calculation.service';
import type { Form16Certificate, Form16PartB, Form16TaxRulesSettings } from '../types/form16';

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

describe('computeForm16Totals', () => {
  it('computes exact figures matching uploaded Form-16 PDF for AY 2026-27 (New Regime)', () => {
    const t = computeForm16Totals({
      financialYear: 2025,
      assessmentYear: '2026-27',
      taxRegime: 'NEW',
      earnings: [{ grossAmount: 821468 }],
      deductions: [{ incomeTax: 0 }],
      partB: basePartB(),
    });

    expect(t.grossSalary17_1).toBe(821468);
    expect(t.totalGrossSalary1d).toBe(821468);
    expect(t.standardDeduction16ia).toBe(75000);
    expect(t.incomeChargeableSalaries).toBe(746468);
    expect(t.totalOtherIncome).toBe(0);
    expect(t.grossTotalIncome).toBe(746468);
    expect(t.aggregateNewRegimeDeductions).toBe(0);
    expect(t.totalTaxableIncome).toBe(746468);
    // Slabs: 0-400k = 0, 400k-746468 @ 5% = 17323.4 -> 17324
    expect(t.taxOnTotalIncome).toBe(17324);
    expect(t.rebate87A).toBe(17324);
    expect(t.surcharge).toBe(0);
    expect(t.cess4).toBe(0);
    expect(t.totalTaxPayable).toBe(0);
    expect(t.tdsDeducted).toBe(0);
    expect(t.netTaxPayable).toBe(0);
  });

  it('computes taxable income and tax above 87A rebate threshold (e.g. 15,00,000 gross)', () => {
    const t = computeForm16Totals({
      financialYear: 2025,
      assessmentYear: '2026-27',
      taxRegime: 'NEW',
      earnings: [{ grossAmount: 1500000 }],
      deductions: [{ incomeTax: 90000 }],
      partB: basePartB(),
    });

    // Gross = 15,00,000, Std ded = 75,000, Chargeable = 14,25,000
    expect(t.grossSalary17_1).toBe(1500000);
    expect(t.standardDeduction16ia).toBe(75000);
    expect(t.totalTaxableIncome).toBe(1425000);
    // 0-400k (0%) = 0
    // 400k-800k (5%) = 20,000
    // 800k-1200k (10%) = 40,000
    // 1200k-1425k (15%) = 33,750
    // Total raw tax = 93,750
    expect(t.taxOnTotalIncome).toBe(93750);
    // Above 12L -> no 87A rebate
    expect(t.rebate87A).toBe(0);
    // Cess 4% of 93750 = 3750
    expect(t.cess4).toBe(3750);
    // Total payable = 97,500
    expect(t.totalTaxPayable).toBe(97500);
    // Net payable = 97500 - 90000 (TDS) = 7500
    expect(t.netTaxPayable).toBe(7500);
  });

  it('correctly accounts for perquisites, profits in lieu, other employer salary, and 80CCD(2)', () => {
    const t = computeForm16Totals({
      financialYear: 2025,
      assessmentYear: '2026-27',
      taxRegime: 'NEW',
      earnings: [{ grossAmount: 1000000 }],
      deductions: [],
      partB: {
        ...basePartB(),
        perquisites17_2: 50000,
        profitsInLieu17_3: 20000,
        otherEmployerSalary: 100000,
        nps80CCD2: 50000,
      },
    });

    expect(t.totalGrossSalary1d).toBe(1070000);
    // Total salary head = 1070000 + 100000 = 1170000
    // Standard deduction = 75000
    // Income chargeable = 1170000 - 75000 = 1095000
    expect(t.incomeChargeableSalaries).toBe(1095000);
    // Gross total income = 1095000
    expect(t.grossTotalIncome).toBe(1095000);
    // Aggregate deductions (80CCD(2)) = 50000
    expect(t.aggregateNewRegimeDeductions).toBe(50000);
    // Total taxable income = 1095000 - 50000 = 1045000
    expect(t.totalTaxableIncome).toBe(1045000);
  });
});

describe('deriveQuarterlySummary', () => {
  it('aggregates quarterly earnings and TDS based on months', () => {
    const earnings = [
      { month: 'April', grossAmount: 200000 },
      { month: 'May', grossAmount: 200000 },
      { month: 'June', grossAmount: 200000 },
    ];
    const deductions = [
      { month: 'April', incomeTax: 5000 },
      { month: 'June', incomeTax: 6000 },
    ];
    const q = deriveQuarterlySummary(earnings, deductions);
    expect(q.Q1.amountPaid).toBe(400000);
    expect(q.Q1.taxDeducted).toBe(5000);
    expect(q.Q2.amountPaid).toBe(200000);
    expect(q.Q2.taxDeducted).toBe(6000);
  });
});

describe('validateCertificate', () => {
  const makeCert = (over?: Partial<Form16Certificate>): Form16Certificate => ({
    id: 'x',
    officeId: 'o',
    employeeId: null,
    hrpn: '123',
    financialYear: 2025,
    assessmentYear: 2026,
    certificateNumber: 'CERT-001',
    certificateLastUpdated: '01-Apr-2026',
    status: 'DRAFT',
    taxRegime: 'NEW',
    employer: { name: 'ICDP', address: '', pan: 'PANNOTREQD', tan: 'SRTD00979G', citTds: '' },
    employee: { name: 'Test Employee', designation: 'Officer', pan: 'DFHPK0914Q', hrpn: '123', address: '' },
    signatory: { name: 'Signing Officer', designation: 'AAO', place: 'Surat', date: '01-Apr-2026' },
    partA: {
      citTds: '',
      periodFrom: '01-Apr-2025',
      periodTo: '31-Mar-2026',
      quarters: [],
    },
    partB: basePartB(),
    computedTotals: null,
    issuedAt: null,
    createdAt: '',
    updatedAt: '',
    ...over,
  });

  it('validates required fields without error when complete', () => {
    const errors = validateCertificate(makeCert());
    expect(errors).toHaveLength(0);
  });

  it('flags missing PAN/TAN/signatory', () => {
    const errors = validateCertificate(
      makeCert({
        employee: { name: '', designation: '', pan: '', hrpn: '', address: '' },
        employer: { name: '', address: '', pan: '', tan: '' },
        signatory: { name: '', designation: '', place: '', date: '' },
      })
    );
    expect(errors.some((e) => e.includes('Employee PAN'))).toBe(true);
    expect(errors.some((e) => e.includes('Employer (deductor) PAN'))).toBe(true);
    expect(errors.some((e) => e.includes('Employer TAN'))).toBe(true);
    expect(errors.some((e) => e.includes('Signatory name'))).toBe(true);
  });

  it('accepts a valid PAN and rejects an invalid one', () => {
    const ok = validateCertificate(
      makeCert({ employee: { name: 'A', designation: 'd', pan: 'DFHPK0914Q', hrpn: '1', address: '' } })
    );
    expect(ok.some((e) => e.includes('Employee PAN must match'))).toBe(false);

    const bad = validateCertificate(
      makeCert({ employee: { name: 'A', designation: 'd', pan: 'INVALID', hrpn: '1', address: '' } })
    );
    expect(bad.some((e) => e.includes('Employee PAN must match'))).toBe(true);
  });
});

describe('getTaxRules', () => {
  it('has rules for AY 2026-27 (FY 2025-26)', () => {
    expect(hasTaxRules('2026-27')).toBe(true);
    const rules = getTaxRules('2026-27', 'NEW');
    expect(rules.standardDeduction).toBe(75000);
    expect(rules.ay).toBe('2026-27');
  });

  it('falls back to the latest configured AY for unknown future years', () => {
    expect(hasTaxRules('2099-00')).toBe(false);
    const rules = getTaxRules('2099-00', 'NEW');
    expect(rules.ay).toBe(latestConfiguredAy());
  });

  it('computes tax dynamically using custom tax brackets and rules passed via settings', () => {
    const customConfig: Form16TaxRulesSettings = {
      assessmentYears: {
        '2028-29': {
          ay: '2028-29',
          standardDeduction: 100000,
          basicExemption: 500000,
          rebate87ALimit: 1500000,
          rebate87AMaxAmount: 75000,
          cessRate: 5,
          slabs: [
            { id: 's1', upto: 500000, rate: 0 },
            { id: 's2', upto: 1000000, rate: 5 },
            { id: 's3', upto: 1500000, rate: 10 },
            { id: 's4', upto: Infinity, rate: 20 },
          ],
          surchargeThresholds: [],
        },
      },
    };

    const t = computeForm16Totals({
      financialYear: 2027,
      assessmentYear: '2028-29',
      taxRegime: 'NEW',
      earnings: [{ grossAmount: 1600000 }],
      deductions: [],
      partB: basePartB(),
      taxRulesSettings: customConfig,
    });

    // Gross = 16,00,000, Custom Std Ded = 1,00,000 -> Taxable = 15,00,000
    expect(t.grossSalary17_1).toBe(1600000);
    expect(t.standardDeduction16ia).toBe(100000);
    expect(t.totalTaxableIncome).toBe(1500000);
    // Custom Slabs:
    // 0-500k (0%) = 0
    // 500k-1000k (5%) = 25,000
    // 1000k-1500k (10%) = 50,000
    // Total raw tax = 75,000
    expect(t.taxOnTotalIncome).toBe(75000);
    // Taxable <= 15L -> Full rebate u/s 87A (75,000)
    expect(t.rebate87A).toBe(75000);
    expect(t.cess4).toBe(0);
    expect(t.totalTaxPayable).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import {
  roundSection288A,
  calculateFamilyPensionDeduction57iia,
  computeSelfAssessmentTaxWorking,
  recalculateSelfAssessmentMemo,
  suggestRemainingTds,
  computeLiveSalaryAndTds,
} from './selfAssessmentCalculation.service';
import { getTaxRules } from './form16Calculation.service';
import type { SelfAssessmentMemo } from '../types/selfAssessment';

describe('selfAssessmentCalculation.service', () => {
  it('correctly rounds to nearest ten rupees under Section 288A', () => {
    expect(roundSection288A(769584)).toBe(769580);
    expect(roundSection288A(769585)).toBe(769590);
    expect(roundSection288A(769588)).toBe(769590);
    expect(roundSection288A(769580)).toBe(769580);
    expect(roundSection288A(0)).toBe(0);
  });

  it('calculates Section 57(iia) family pension deduction capped at Rs. 25,000', () => {
    // 1/3 of 60,000 is 20,000 (< 25,000)
    expect(calculateFamilyPensionDeduction57iia(60000)).toBe(20000);
    // 1/3 of 150,000 is 50,000 (capped at 25,000)
    expect(calculateFamilyPensionDeduction57iia(150000)).toBe(25000);
    expect(calculateFamilyPensionDeduction57iia(0)).toBe(0);
  });

  it('matches the DTO Dangs real-world memo from the user image (AY 2026-27)', () => {
    const rules = getTaxRules('2026-27', 'NEW');

    // Taxpayer has Gross Salary 844,580
    // Standard deduction: 75,000
    // Taxable Total Income: 769,580
    const working = computeSelfAssessmentTaxWorking(769580, 0, 0, rules);

    // Slab 1: Up to 4,00,000 -> 0
    expect(working.slabs[0].taxableAmount).toBe(400000);
    expect(working.slabs[0].taxAmount).toBe(0);

    // Slab 2: 4,00,001 to 8,00,000 -> 369,580 * 5% = 18,479
    expect(working.slabs[1].taxableAmount).toBe(369580);
    expect(working.slabs[1].taxAmount).toBe(18479);

    // Total tax before rebate = 18,479
    expect(working.totalTaxBeforeRebate).toBe(18479);

    // Section 87A rebate for income <= 12,00,000 covers full 18,479
    expect(working.rebate87A).toBe(18479);

    // After rebate: 0 tax, 0 cess, 0 liability
    expect(working.taxAfterRebate).toBe(0);
    expect(working.cess4).toBe(0);
    expect(working.totalTaxLiability).toBe(0);
  });

  it('computes tax above 12 Lakhs when 87A rebate does not apply', () => {
    const rules = getTaxRules('2026-27', 'NEW');
    // Taxable income = 1,400,000 (14 Lakh)
    // Slabs:
    // 0 - 4L: 0
    // 4L - 8L (4L @ 5%): 20,000
    // 8L - 12L (4L @ 10%): 40,000
    // 12L - 14L (2L @ 15%): 30,000
    // Normal tax: 90,000
    // Cess 4%: 3,600
    // Total: 93,600
    const working = computeSelfAssessmentTaxWorking(1400000, 0, 0, rules);
    expect(working.totalTaxBeforeRebate).toBe(90000);
    expect(working.rebate87A).toBe(0);
    expect(working.taxAfterRebate).toBe(90000);
    expect(working.cess4).toBe(3600);
    expect(working.totalTaxLiability).toBe(93600);
  });

  it('recalculates full memo structure and updates deductions and monthly schedule', () => {
    const draftMemo: SelfAssessmentMemo = {
      id: 'test-memo-1',
      financialYear: 2025,
      assessmentYear: '2026-27',
      hrpn: '1001',
      status: 'DRAFT',
      preferredFormat: 'DANGS',
      departmentName: 'DISTRICT TREASURY OFFICE, DANGS',
      departmentDivision: 'Ahwa',
      district: 'Dangs',
      taxpayerName: 'KIRITCHANDRA JAYANTILAL PATEL',
      designation: 'RETIRED GOVERNMENT EMPLOYEE',
      isPensioner: true,
      pan: 'ATKJP1081C',
      employeeIdOrPsn: 'PPO-12345',
      residentialStatus: 'RESIDENT',
      residentialAddress: 'Ahwa Dangs GUJARAT',
      computationDate: '2026-10-18',
      grossSalaryFromLedger: 844580,
      grossSalaryTotal: 844580,
      honorariumBonus: 0,
      bonus: 0,
      bankInterest: 0,
      nscInterest: 0,
      housePropertyIncome: 0,
      retirementGratuity: 0,
      leaveSalaryEncashment: 0,
      retrenchmentCompensation: 0,
      agriculturalIncome: 0,
      familyPensionGross: 0,
      familyPensionDeduction57iia: 0,
      otherIncomeSources: 0,
      capitalGainsSpecialRate: 0,
      grossTotalIncome: 0,
      standardDeduction16ia: 0,
      nps80CCD2: 0,
      otherPermittedDeductions: 0,
      totalPermittedDeductions: 0,
      taxableTotalIncome: 0,
      working: {
        slabs: [],
        taxOnNormalIncome: 0,
        taxOnSpecialRate: 0,
        totalTaxBeforeRebate: 0,
        rebate87A: 0,
        taxAfterRebate: 0,
        surcharge: 0,
        cess4: 0,
        relief89: 0,
        totalTaxLiability: 0,
      },
      monthlyTds: {
        taxPaidUpToNov: 0,
        taxDeductedDec: 0,
        taxDeductedJan: 0,
        totalTaxPaidTillJan: 0,
        delayFiling234A: false,
        delayPenaltyAmount: 0,
        taxDeductedFeb: 0,
        challans: [],
        totalChallanAmount: 0,
        totalTaxCredits: 0,
        netTaxPayableOrRefund: 0,
      },
      agreedToNewTaxScheme: true,
      gujaratiConsentText: 'હું નવી કર યોજનામાં જોડાવા સંમતી આપું છું',
      place: 'AHWA',
      taxpayerSignatureName: 'SHRI K J PATEL',
      preparedByName: 'Staff Accountant',
      preparedByDesignation: 'Accountant',
      treasuryOfficerName: 'Treasury Officer',
      treasuryOfficerDesignation: 'District Treasury office, Dangs, Ahwa',
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    };

    const recalculated = recalculateSelfAssessmentMemo(draftMemo);
    expect(recalculated.standardDeduction16ia).toBe(75000);
    expect(recalculated.taxableTotalIncome).toBe(769580);
    expect(recalculated.working.totalTaxLiability).toBe(0);
    expect(recalculated.monthlyTds.netTaxPayableOrRefund).toBe(0);
  });

  it('suggests equal monthly distribution for remaining TDS', () => {
    const split = suggestRemainingTds(30000, 15000);
    // Remaining is 15,000 across Dec, Jan, Feb -> 5,000 each
    expect(split.dec).toBe(5000);
    expect(split.jan).toBe(5000);
    expect(split.feb).toBe(5000);
  });

  it('computes live salary, actual TDS, and NPS deductions without artificial projection', () => {
    const earnings = [
      { month: 'March-2026', grossAmount: 70000 },
      { month: 'April-2026', grossAmount: 70000 },
      { month: 'May-2026', grossAmount: 70000 },
      { month: 'June-2026', grossAmount: 70000 },
      { month: 'July-2026', grossAmount: 70000 },
      { month: 'August-2026', grossAmount: 70000 },
      { month: 'September-2026', grossAmount: 70000 },
      { month: 'October-2026', grossAmount: 70000 },
      { month: 'November-2026', grossAmount: 70000 },
      { month: 'December-2026', grossAmount: 75000 },
      { month: 'January-2027', grossAmount: 75000 },
    ];

    const deductions = [
      { month: 'March-2026', incomeTax: 2000, npsRegular: 5000 },
      { month: 'April-2026', incomeTax: 2000, npsRegular: 5000 },
      { month: 'November-2026', incomeTax: 2000, npsRegular: 5000 },
      { month: 'December-2026', incomeTax: 3000, npsRegular: 5500 },
      { month: 'January-2027', incomeTax: 3000, npsRegular: 5500 },
    ];

    const result = computeLiveSalaryAndTds(earnings, deductions, 5000); // 5000 manual allowance

    // Total gross: 9 * 70,000 + 2 * 75,000 + 5,000 = 630,000 + 150,000 + 5,000 = 785,000
    expect(result.grossPaidToDate).toBe(785000);
    expect(result.monthsPresentCount).toBe(11);
    expect(result.taxPaidUpToNov).toBe(6000); // 2000 * 3
    expect(result.taxDeductedDec).toBe(3000);
    expect(result.taxDeductedJan).toBe(3000);
    expect(result.taxDeductedFeb).toBe(0);
    expect(result.totalActualTds).toBe(12000);
    expect(result.npsRegularTotal).toBe(26000); // 5000 * 3 + 5500 * 2
  });
});

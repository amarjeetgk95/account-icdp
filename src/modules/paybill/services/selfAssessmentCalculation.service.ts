import {
  getTaxRules,
  assessmentYearFor,
  calculateRebate87A,
  calculateSurchargeWithMarginalRelief,
  type TaxRules,
} from './form16Calculation.service';
import type {
  SelfAssessmentMemo,
  SelfAssessmentTaxWorking,
  SelfAssessmentSlabRow,
  SelfAssessmentMonthlyTds,
  SelfAssessmentChallan,
  SelfAssessmentPrintFormat,
} from '../types/selfAssessment';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';

/**
 * Rounds an amount to the nearest multiple of ten rupees under Section 288A.
 */
export function roundSection288A(amount: number): number {
  if (!isFinite(amount) || isNaN(amount)) return 0;
  return Math.round(amount / 10) * 10;
}

/**
 * Section 57(iia) deduction on family pension under New Tax Regime:
 * Lower of 1/3rd of pension or Rs. 25,000.
 */
export function calculateFamilyPensionDeduction57iia(familyPensionGross: number): number {
  if (!familyPensionGross || familyPensionGross <= 0) return 0;
  const oneThird = familyPensionGross / 3;
  return Math.round(Math.min(oneThird, 25000));
}

/**
 * Calculates detailed slab rows and final tax working under Section 115BAC(1A).
 */
export function computeSelfAssessmentTaxWorking(
  taxableTotalIncome: number,
  specialRateTax: number = 0,
  relief89: number = 0,
  rules: TaxRules
): SelfAssessmentTaxWorking {
  const taxable = Math.max(0, taxableTotalIncome);
  let remaining = taxable;
  let prevUpto = 0;
  const slabRows: SelfAssessmentSlabRow[] = [];
  let taxOnNormalIncome = 0;

  for (let i = 0; i < rules.slabs.length; i++) {
    const s = rules.slabs[i];
    const isLast = i === rules.slabs.length - 1;
    const slabUpto =
      s.upto == null || s.upto <= 0 || !isFinite(s.upto) || isLast ? Infinity : Number(s.upto);

    const spanCapacity = slabUpto - prevUpto;
    const taxableAmount = Math.max(0, Math.min(remaining, spanCapacity));
    const rate = Number(s.rate) || 0;
    const taxAmount = rate > 0 ? (taxableAmount * rate) / 100 : 0;

    let label = '';
    if (prevUpto === 0) {
      label = `Up to Rs. ${slabUpto.toLocaleString('en-IN')}`;
    } else if (isLast || !isFinite(slabUpto)) {
      label = `Above Rs. ${prevUpto.toLocaleString('en-IN')}`;
    } else {
      label = `Rs. ${(prevUpto + 1).toLocaleString('en-IN')} to Rs. ${slabUpto.toLocaleString('en-IN')}`;
    }

    slabRows.push({
      label,
      from: prevUpto,
      to: slabUpto,
      rate,
      taxableAmount,
      taxAmount: Math.round(taxAmount),
    });

    taxOnNormalIncome += taxAmount;
    remaining -= taxableAmount;
    prevUpto = slabUpto;
  }

  taxOnNormalIncome = Math.ceil(taxOnNormalIncome);
  const totalTaxBeforeRebate = taxOnNormalIncome + Math.ceil(specialRateTax);

  // Section 87A rebate calculation (with marginal relief if income <= Rs. 12 Lakh)
  const rebate87A = calculateRebate87A(taxable, totalTaxBeforeRebate, rules);
  const taxAfterRebate = Math.max(0, totalTaxBeforeRebate - rebate87A);

  // High-net-worth surcharge
  const surcharge = calculateSurchargeWithMarginalRelief(taxable, taxAfterRebate, rules);

  // Health and Education Cess @ 4%
  const cessRate = rules.cessRate != null ? rules.cessRate : 4;
  const cess4 = taxAfterRebate > 0 ? Math.ceil(((taxAfterRebate + surcharge) * cessRate) / 100) : 0;

  // Relief under Section 89
  const totalTaxLiability = Math.max(0, taxAfterRebate + surcharge + cess4 - Math.max(0, relief89));

  return {
    slabs: slabRows,
    taxOnNormalIncome,
    taxOnSpecialRate: specialRateTax,
    totalTaxBeforeRebate,
    rebate87A,
    taxAfterRebate,
    surcharge,
    cess4,
    relief89,
    totalTaxLiability,
  };
}

/**
 * Normalizes month strings into standard English month names.
 */
export function normalizeMonthName(raw: string): string {
  const clean = (raw || '').trim().toLowerCase();
  if (clean.includes('mar')) return 'March';
  if (clean.includes('apr')) return 'April';
  if (clean.includes('may')) return 'May';
  if (clean.includes('jun')) return 'June';
  if (clean.includes('jul')) return 'July';
  if (clean.includes('aug')) return 'August';
  if (clean.includes('sep')) return 'September';
  if (clean.includes('oct')) return 'October';
  if (clean.includes('nov')) return 'November';
  if (clean.includes('dec')) return 'December';
  if (clean.includes('jan')) return 'January';
  if (clean.includes('feb')) return 'February';
  return raw.trim();
}

export interface LiveSalaryAndTdsResult {
  grossPaidToDate: number;
  monthsPresentCount: number;
  presentMonths: string[];
  totalActualTds: number;
  taxPaidUpToNov: number;
  taxDeductedDec: number;
  taxDeductedJan: number;
  taxDeductedFeb: number;
  npsRegularTotal: number;
}

/**
 * Computes live cumulative gross salary, actual monthly TDS, and NPS deductions
 * directly from parsed paybill records and manual ledger entries without projection.
 */
export function computeLiveSalaryAndTds(
  earnings: Array<{ grossAmount?: number; month?: string }>,
  deductions: Array<{ incomeTax?: number; npsRegular?: number; month?: string }>,
  manualAllowanceSum: number = 0
): LiveSalaryAndTdsResult {
  const presentMonths = new Set<string>();
  let grossPaidToDate = 0;

  for (const e of earnings) {
    const norm = normalizeMonthName(e.month || '');
    const g = Number(e.grossAmount) || 0;
    if (norm) {
      presentMonths.add(norm);
    }
    grossPaidToDate += g;
  }
  grossPaidToDate += Number(manualAllowanceSum) || 0;

  let taxPaidUpToNov = 0;
  let taxDeductedDec = 0;
  let taxDeductedJan = 0;
  let taxDeductedFeb = 0;
  let npsRegularTotal = 0;
  let totalActualTds = 0;

  for (const d of deductions) {
    const norm = normalizeMonthName(d.month || '');
    const it = Number(d.incomeTax) || 0;
    const nps = Number(d.npsRegular) || 0;

    totalActualTds += it;
    npsRegularTotal += nps;

    if (norm === 'December') {
      taxDeductedDec += it;
    } else if (norm === 'January') {
      taxDeductedJan += it;
    } else if (norm === 'February') {
      taxDeductedFeb += it;
    } else {
      // March through November
      taxPaidUpToNov += it;
    }
  }

  return {
    grossPaidToDate: Math.round(grossPaidToDate),
    monthsPresentCount: presentMonths.size,
    presentMonths: Array.from(presentMonths),
    totalActualTds: Math.round(totalActualTds),
    taxPaidUpToNov: Math.round(taxPaidUpToNov),
    taxDeductedDec: Math.round(taxDeductedDec),
    taxDeductedJan: Math.round(taxDeductedJan),
    taxDeductedFeb: Math.round(taxDeductedFeb),
    npsRegularTotal: Math.round(npsRegularTotal),
  };
}

/**
 * Live calculation wrapper for full-year gross salary and actual TDS (replaces projection).
 */
export function projectSalaryAndTds(
  earnings: Array<{ grossAmount?: number; month?: string }>,
  deductions: Array<{ incomeTax?: number; npsRegular?: number; month?: string }>,
  _financialYear?: number
): {
  grossPaidToDate: number;
  projectedRemainingGross: number;
  monthsPresentCount: number;
  monthsProjectedCount: number;
  totalProjectedGross: number;
  taxPaidUpToNov: number;
} {
  const live = computeLiveSalaryAndTds(earnings, deductions);
  return {
    grossPaidToDate: live.grossPaidToDate,
    projectedRemainingGross: 0,
    monthsPresentCount: live.monthsPresentCount,
    monthsProjectedCount: 0,
    totalProjectedGross: live.grossPaidToDate,
    taxPaidUpToNov: live.taxPaidUpToNov,
  };
}

/**
 * Computes monthly TDS schedule and net payable/refundable balance.
 */
export function computeMonthlyTdsSchedule(
  totalTaxLiability: number,
  taxPaidUpToNov: number,
  dec: number,
  jan: number,
  delayPenalty: number,
  feb: number,
  challans: SelfAssessmentChallan[] = [],
  otherTdsTcs: number = 0
): SelfAssessmentMonthlyTds {
  const totalTaxPaidTillJan = Math.round(taxPaidUpToNov + dec + jan);
  const totalChallanAmount = challans.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalTaxCredits = Math.round(totalTaxPaidTillJan + feb + totalChallanAmount + otherTdsTcs);
  const netTaxPayableOrRefund = Math.round(totalTaxLiability + delayPenalty - totalTaxCredits);

  return {
    taxPaidUpToNov,
    taxDeductedDec: dec,
    taxDeductedJan: jan,
    totalTaxPaidTillJan,
    delayFiling234A: delayPenalty > 0,
    delayPenaltyAmount: delayPenalty,
    taxDeductedFeb: feb,
    challans,
    totalChallanAmount,
    otherTdsTcsCredits: otherTdsTcs,
    totalTaxCredits,
    netTaxPayableOrRefund,
  };
}

/**
 * Suggests an optimal equal distribution of remaining tax across Dec, Jan, Feb.
 */
export function suggestRemainingTds(
  totalLiability: number,
  taxPaidUpToNov: number
): { dec: number; jan: number; feb: number } {
  const remaining = Math.max(0, totalLiability - taxPaidUpToNov);
  if (remaining === 0) {
    return { dec: 0, jan: 0, feb: 0 };
  }
  const each = Math.floor(remaining / 3);
  const rem = remaining - each * 2;
  return {
    dec: each,
    jan: each,
    feb: rem,
  };
}

/**
 * Master recalculation function for a SelfAssessmentMemo.
 */
export function recalculateSelfAssessmentMemo(
  memo: SelfAssessmentMemo,
  customRules?: TaxRules
): SelfAssessmentMemo {
  const ay = memo.assessmentYear || assessmentYearFor(memo.financialYear);
  const rules = customRules || getTaxRules(ay, 'NEW');

  // 1. Gross Salary (use override if provided, else ledger/projected)
  const grossSalary =
    memo.grossSalaryOverride != null && memo.grossSalaryOverride !== undefined
      ? Number(memo.grossSalaryOverride) || 0
      : Number(memo.grossSalaryTotal) || 0;

  // 2. Family Pension deduction u/s 57(iia)
  const fpGross = Number(memo.familyPensionGross) || 0;
  const fpDed = calculateFamilyPensionDeduction57iia(fpGross);

  // 3. Gross Total Income
  // Sum of gross salary + other incomes minus family pension deduction
  const otherIncomes =
    (Number(memo.honorariumBonus) || 0) +
    (Number(memo.bonus) || 0) +
    (Number(memo.bankInterest) || 0) +
    (Number(memo.nscInterest) || 0) +
    (Number(memo.housePropertyIncome) || 0) +
    (Number(memo.retirementGratuity) || 0) +
    (Number(memo.leaveSalaryEncashment) || 0) +
    (Number(memo.retrenchmentCompensation) || 0) +
    (Number(memo.agriculturalIncome) || 0) +
    Math.max(0, fpGross - fpDed) +
    (Number(memo.otherIncomeSources) || 0) +
    (Number(memo.capitalGainsSpecialRate) || 0);

  const grossTotalIncome = Math.round(grossSalary + otherIncomes);

  // 4. Deductions u/s 115BAC
  // Standard deduction capped to gross salary
  const stdDed = Math.min(rules.standardDeduction, grossSalary);
  const nps80CCD2 = Number(memo.nps80CCD2) || 0;
  const otherPermitted = Number(memo.otherPermittedDeductions) || 0;
  const totalPermittedDeductions = Math.round(stdDed + nps80CCD2 + otherPermitted);

  // 5. Net Taxable Income rounded u/s 288A
  const rawTaxable = Math.max(0, grossTotalIncome - totalPermittedDeductions);
  const taxableTotalIncome = roundSection288A(rawTaxable);

  // 6. Tax Working
  const working = computeSelfAssessmentTaxWorking(
    taxableTotalIncome,
    Number(memo.capitalGainsSpecialRate) > 0 ? (Number(memo.capitalGainsSpecialRate) * 0.2) : 0,
    Number(memo.working?.relief89) || 0,
    rules
  );

  // 7. Monthly TDS Schedule
  const monthlyTds = computeMonthlyTdsSchedule(
    working.totalTaxLiability,
    Number(memo.monthlyTds?.taxPaidUpToNov) || 0,
    Number(memo.monthlyTds?.taxDeductedDec) || 0,
    Number(memo.monthlyTds?.taxDeductedJan) || 0,
    Number(memo.monthlyTds?.delayPenaltyAmount) || 0,
    Number(memo.monthlyTds?.taxDeductedFeb) || 0,
    memo.monthlyTds?.challans || [],
    Number(memo.monthlyTds?.otherTdsTcsCredits) || 0
  );

  return {
    ...memo,
    grossSalaryTotal: grossSalary,
    familyPensionDeduction57iia: fpDed,
    grossTotalIncome,
    standardDeduction16ia: stdDed,
    totalPermittedDeductions,
    taxableTotalIncome,
    working,
    monthlyTds,
    updatedAt: new Date().toISOString(),
  };
}

export interface BuildMemoEmployeeInfo {
  hrpn: string;
  name: string;
  pan?: string | null;
  designation?: string | null;
  address?: string | null;
}

export interface BuildMemoOfficeInfo {
  departmentName: string;
  departmentDivision?: string;
  district?: string;
  officeAddress?: string;
  place?: string;
  treasuryOfficerDesignation?: string;
  treasuryOfficerName?: string;
}

export interface BuildEmployeeSelfAssessmentMemoOptions {
  employee: BuildMemoEmployeeInfo;
  savedMemo?: SelfAssessmentMemo | null;
  earnings?: PayBillStoredEarning[];
  deductions?: PayBillStoredDeduction[];
  manualLedger?: Record<string, Record<string, Record<string, number>>>;
  financialYear: number;
  assessmentYear?: string;
  resolvedOffice?: BuildMemoOfficeInfo;
  ddoCode?: string;
  formatOverride?: SelfAssessmentPrintFormat;
}

/**
 * Builds or refreshes a complete SelfAssessmentMemo for any employee,
 * using either their saved memo or dynamically computing an initial draft
 * from live paybill earnings, deductions, and manual ledger entries.
 */
export function buildEmployeeSelfAssessmentMemo(
  options: BuildEmployeeSelfAssessmentMemoOptions
): SelfAssessmentMemo {
  const {
    employee,
    savedMemo,
    earnings = [],
    deductions = [],
    manualLedger = {},
    financialYear: fy,
    assessmentYear,
    resolvedOffice = {
      departmentName: 'INTENSIVE CATTLE DEVELOPMENT PROJECT (ICDP)',
      departmentDivision: '',
      district: 'Surat',
      officeAddress: 'Surat, Gujarat',
      place: 'Surat',
      treasuryOfficerDesignation: 'Assistant Administrative cum Account Officer',
      treasuryOfficerName: 'DDO',
    },
    ddoCode = '',
    formatOverride,
  } = options;

  const ayLabel = assessmentYear || assessmentYearFor(fy);

  if (savedMemo) {
    const hasDummyOffice =
      (savedMemo.departmentDivision === 'Ahwa' && savedMemo.district === 'Dangs') ||
      !savedMemo.departmentName ||
      savedMemo.departmentName === 'DISTRICT TREASURY OFFICE, DANGS';

    let updated = savedMemo;
    if (hasDummyOffice) {
      updated = {
        ...updated,
        departmentName: resolvedOffice.departmentName || savedMemo.departmentName,
        departmentDivision: resolvedOffice.departmentDivision || '',
        district: resolvedOffice.district || '',
        officeAddress: resolvedOffice.officeAddress || savedMemo.officeAddress,
        place: savedMemo.place || resolvedOffice.place || 'Surat',
        treasuryOfficerDesignation:
          savedMemo.treasuryOfficerDesignation || resolvedOffice.treasuryOfficerDesignation || '',
      };
    }
    if (formatOverride) {
      updated = { ...updated, preferredFormat: formatOverride };
    }
    return updated;
  }

  // Filter earnings & deductions for this employee
  const cleanHrpn = (employee.hrpn || '').trim().toLowerCase();
  const empEarnings = earnings.filter(
    (e) => (e.hrpn || '').trim().toLowerCase() === cleanHrpn
  );
  const empDeductions = deductions.filter(
    (d) => (d.hrpn || '').trim().toLowerCase() === cleanHrpn
  );

  // Manual allowances from ledger if any
  const empManual = manualLedger[employee.hrpn] || manualLedger[cleanHrpn] || {};
  let manualAllowanceSum = 0;
  for (const mObj of Object.values(empManual)) {
    for (const mVal of Object.values(mObj || {})) {
      manualAllowanceSum += Number(mVal) || 0;
    }
  }

  const live = computeLiveSalaryAndTds(empEarnings, empDeductions, manualAllowanceSum);

  const initialDraft: SelfAssessmentMemo = {
    id: `memo-${fy}-${employee.hrpn}`,
    financialYear: fy,
    assessmentYear: ayLabel,
    hrpn: employee.hrpn,
    status: 'DRAFT',
    preferredFormat: formatOverride || 'DANGS',

    // Department & Office Details
    departmentName: resolvedOffice.departmentName,
    departmentDivision: resolvedOffice.departmentDivision || '',
    district: resolvedOffice.district || '',
    ddoCode: ddoCode || '',
    officeAddress: resolvedOffice.officeAddress || '',

    // Taxpayer Particulars
    taxpayerName: employee.name,
    designation: employee.designation || 'GOVERNMENT EMPLOYEE',
    isPensioner:
      employee.designation?.toLowerCase().includes('retir') ||
      employee.designation?.toLowerCase().includes('pension') ||
      false,
    pan: employee.pan || '',
    employeeIdOrPsn: employee.hrpn,
    residentialStatus: 'RESIDENT',
    residentialAddress: employee.address || resolvedOffice.officeAddress || 'Surat, GUJARAT',
    computationDate: new Date().toLocaleDateString('en-GB'),

    // Income Components
    grossSalaryFromLedger: live.grossPaidToDate,
    grossSalaryTotal: live.grossPaidToDate,
    projectedRemainingMonthsCount: 0,
    projectedSalaryAmount: 0,

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
    grossTotalIncome: live.grossPaidToDate,

    // Deductions u/s 115BAC (Standard deduction default)
    standardDeduction16ia: Math.min(75000, live.grossPaidToDate),
    nps80CCD2: 0,
    otherPermittedDeductions: 0,
    totalPermittedDeductions: Math.min(75000, live.grossPaidToDate),
    taxableTotalIncome: Math.max(
      0,
      live.grossPaidToDate - Math.min(75000, live.grossPaidToDate)
    ),

    // Working defaults
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

    // Monthly Schedule
    monthlyTds: {
      taxPaidUpToNov: live.taxPaidUpToNov,
      taxDeductedDec: live.taxDeductedDec,
      taxDeductedJan: live.taxDeductedJan,
      totalTaxPaidTillJan: live.taxPaidUpToNov + live.taxDeductedDec + live.taxDeductedJan,
      delayFiling234A: false,
      delayPenaltyAmount: 0,
      taxDeductedFeb: live.taxDeductedFeb,
      challans: [],
      totalChallanAmount: 0,
      totalTaxCredits: live.totalActualTds,
      netTaxPayableOrRefund: 0,
    },

    agreedToNewTaxScheme: true,
    gujaratiConsentText:
      'હું આથી બાંહેધરી આપું છું કે મેં આવકવેરા અધિનિયમ, ૧૯૬૧ ની કલમ ૧૧૫બીએસી હેઠળ નવી કર વ્યવસ્થા (New Tax Regime) નો વિકલ્પ પસંદ કરેલ છે.',
    place: resolvedOffice.place || 'Surat',
    taxpayerSignatureName: employee.name,
    preparedByName: 'Staff Accountant',
    preparedByDesignation: 'Accountant',
    treasuryOfficerName: resolvedOffice.treasuryOfficerName || 'DDO',
    treasuryOfficerDesignation:
      resolvedOffice.treasuryOfficerDesignation || 'Assistant Administrative cum Account Officer',

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return recalculateSelfAssessmentMemo(initialDraft);
}

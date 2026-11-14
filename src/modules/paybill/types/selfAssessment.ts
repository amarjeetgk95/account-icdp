export type SelfAssessmentPrintFormat = 'PERSONAL' | 'DANGS' | 'STANDARD';
export type SelfAssessmentStatus = 'DRAFT' | 'REVIEWED' | 'FINALIZED';

export interface SelfAssessmentChallan {
  id: string;
  challanNo: string;
  date: string;
  amount: number;
  bsrCode?: string;
  cin?: string;
}

export interface SelfAssessmentSlabRow {
  label: string;
  from: number;
  to: number;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface SelfAssessmentTaxWorking {
  slabs: SelfAssessmentSlabRow[];
  taxOnNormalIncome: number;
  taxOnSpecialRate: number;
  totalTaxBeforeRebate: number;
  rebate87A: number;
  taxAfterRebate: number;
  surcharge: number;
  cess4: number;
  relief89: number;
  totalTaxLiability: number;
}

export interface SelfAssessmentMonthlyTds {
  taxPaidUpToNov: number;
  taxDeductedDec: number;
  taxDeductedJan: number;
  totalTaxPaidTillJan: number;
  delayFiling234A: boolean;
  delayPenaltyAmount: number;
  taxDeductedFeb: number;
  challans: SelfAssessmentChallan[];
  totalChallanAmount: number;
  otherTdsTcsCredits?: number;
  totalTaxCredits: number;
  netTaxPayableOrRefund: number;
}

export interface SelfAssessmentMemo {
  id: string;
  officeId?: string;
  financialYear: number;       // e.g. 2025 for FY 2025-26
  assessmentYear: string;      // e.g. "2026-27"
  hrpn: string;
  employeeId?: string | null;
  status: SelfAssessmentStatus;
  preferredFormat: SelfAssessmentPrintFormat;

  // Department & Office Details
  departmentName: string;      // e.g. "DISTRICT TREASURY OFFICE, DANGS"
  departmentDivision: string;  // e.g. "Ahwa"
  district: string;            // e.g. "Dangs"
  ddoCode?: string;
  officeAddress?: string;

  // Taxpayer Particulars
  taxpayerName: string;
  designation: string;         // e.g. "RETIRED GOVERNMENT EMPLOYEE"
  isPensioner: boolean;
  pan: string;
  employeeIdOrPsn: string;     // PPO / PSN / HRPN
  residentialStatus: 'RESIDENT' | 'NON_RESIDENT';
  residentialAddress: string;
  computationDate: string;

  // Income Components
  grossSalaryFromLedger: number;
  grossSalaryOverride?: number | null;
  projectedRemainingMonthsCount?: number;
  projectedSalaryAmount?: number;
  grossSalaryTotal: number;

  honorariumBonus: number;
  bonus: number;
  bankInterest: number;
  nscInterest: number;
  housePropertyIncome: number;
  retirementGratuity: number;
  leaveSalaryEncashment: number;   // u/s 10(10AA)
  retrenchmentCompensation: number;
  agriculturalIncome: number;      // u/s 10(1)
  familyPensionGross: number;
  familyPensionDeduction57iia: number;
  otherIncomeSources: number;
  capitalGainsSpecialRate: number;
  grossTotalIncome: number;

  // Deductions Permitted u/s 115BAC
  standardDeduction16ia: number;
  nps80CCD2: number;
  otherPermittedDeductions: number;
  otherPermittedDeductionSection?: string;
  totalPermittedDeductions: number;
  taxableTotalIncome: number;      // Rounded u/s 288A

  // Tax Computation Working
  working: SelfAssessmentTaxWorking;

  // Monthly Advance TDS & Challan Schedule
  monthlyTds: SelfAssessmentMonthlyTds;

  // Consent & Verification
  agreedToNewTaxScheme: boolean;
  gujaratiConsentText: string;
  place: string;
  taxpayerSignatureName: string;
  preparedByName: string;
  preparedByDesignation: string;
  treasuryOfficerName: string;
  treasuryOfficerDesignation: string;

  createdAt: string;
  updatedAt: string;
}

export const GUJARATI_CONSENT_DEFAULT =
  'હું આથી બાંહેધરી આપું છું કે નાણાકીય વર્ષ માટે મેં આવકવેરા અધિનિયમ, ૧૯૬૧ ની કલમ ૧૧૫બીએસી હેઠળ નવી કર વ્યવસ્થા (New Tax Regime) નો વિકલ્પ પસંદ કરેલ છે.';

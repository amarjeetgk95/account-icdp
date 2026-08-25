export type Form16Status = 'DRAFT' | 'REVIEWED' | 'ISSUED' | 'VOIDED';
export type TaxRegime = 'NEW';

export type Form16Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export const FORM16_QUARTERS: Form16Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export interface Form16QuarterEntry {
  quarter: Form16Quarter;
  receiptNumber: string;
  amountPaid: number;
  taxDeducted: number;
  taxDeposited: number;
}

export type Form16PartA = {
  citTds: string;
  periodFrom: string;
  periodTo: string;
  quarters: Form16QuarterEntry[];
};

export type Form16PartB = {
  perquisites17_2: number;
  profitsInLieu17_3: number;
  otherEmployerSalary: number;
  standardDeductionOverride?: number | null;
  housePropertyIncome: number;
  otherSourcesIncome: number;
  nps80CCD2: number;
  agnipath80CCH: number;
  relief89: number;
  taxCollectedAtSource: number;
};

export type Form16EmployerSnapshot = {
  name: string;
  address: string;
  pan: string;
  tan: string;
  citTds?: string;
};

export type Form16EmployeeSnapshot = {
  name: string;
  designation: string;
  pan: string;
  hrpn: string;
  address: string;
  email?: string;
  joinDate?: string;
  transferDate?: string;
  employeeReference?: string;
};

export type Form16Signatory = {
  name: string;
  designation: string;
  place: string;
  date: string;
  fatherName?: string;
};

/**
 * Totals representing the 19 standard Form-16 line items for New Regime u/s 115BAC:
 * 1. Gross Salary
 *    (a) Salary as per provisions contained in sec 17(1)
 *    (b) Value of perquisites u/s 17(2)
 *    (c) Profits in lieu of salary u/s 17(3)
 *    (d) Total (a + b + c)
 *    (e) Reported total salary received from other employer(s)
 * 2. Deductions from salary under section 16 — New-regime applicable
 *    (a) Standard deduction under section 16(ia)
 * 3. Income chargeable under the head 'Salaries' after standard deduction (1d + 1e - 2a)
 * 4. Add: Any other income reported by employee u/s 192(2B)
 *    (a) Income / loss from house property reported for TDS
 *    (b) Income under the head Other Sources offered for TDS
 * 5. Total other income reported by employee (4a + 4b)
 * 6. Gross Total Income (3 + 5)
 * 7. Employer contribution to NPS u/s 80CCD(2)
 * 8. Contribution to Agnipath Scheme u/s 80CCH
 * 9. Aggregate new-regime deductions (7 + 8)
 * 10. Total Taxable Income (6 - 9)
 * 11. Tax on total income
 * 12. Rebate under section 87A, if applicable
 * 13. Surcharge
 * 14. Health and education cess (4%)
 * 15. Total Tax payable (11 - 12 + 13 + 14)
 * 16. Less: Relief under section 89
 * 17. Less: Tax deducted at source
 * 18. Less: Tax collected at source
 * 19. Net Tax Payable (15 - 16 - 17 - 18)
 */
export interface Form16ComputedTotals {
  grossSalary17_1: number;
  perquisites17_2: number;
  profitsInLieu17_3: number;
  totalGrossSalary1d: number;
  otherEmployerSalary: number;
  standardDeduction16ia: number;
  incomeChargeableSalaries: number;
  housePropertyIncome: number;
  otherSourcesIncome: number;
  totalOtherIncome: number;
  grossTotalIncome: number;
  nps80CCD2: number;
  agnipath80CCH: number;
  aggregateNewRegimeDeductions: number;
  totalTaxableIncome: number;
  taxOnTotalIncome: number;
  rebate87A: number;
  surcharge: number;
  cess4: number;
  totalTaxPayable: number;
  relief89: number;
  tdsDeducted: number;
  taxCollectedAtSource: number;
  netTaxPayable: number;
}

export interface Form16Certificate {
  id: string;
  officeId: string;
  employeeId: string | null;
  hrpn: string;
  financialYear: number;
  assessmentYear: number;
  certificateNumber: string;
  certificateLastUpdated: string;
  status: Form16Status;
  taxRegime: TaxRegime;
  employer: Form16EmployerSnapshot;
  employee: Form16EmployeeSnapshot;
  signatory: Form16Signatory;
  partA: Form16PartA;
  partB: Form16PartB;
  computedTotals: Form16ComputedTotals | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Office-level defaults shared by every Form 16 certificate of an office
 * (deductor identity + default signing officer). Stored in paybill_settings
 * under settings_key 'form16_deductor_defaults' and editable from Settings.
 */
export interface Form16DeductorDefaults {
  employerName: string;
  employerPan: string;
  employerTan: string;
  citTds: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatoryPlace: string;
  [key: string]: string | undefined;
}

export const EMPTY_FORM16_DEDUCTOR_DEFAULTS: Form16DeductorDefaults = {
  employerName: '',
  employerPan: '',
  employerTan: '',
  citTds: '',
  signatoryName: '',
  signatoryDesignation: '',
  signatoryPlace: '',
};

/**
 * Office-wide 24Q Quarterly Return filings configuration for a Financial Year.
 * Stored in paybill_settings under settings_key 'form16_24q_fy_<financialYear>'.
 */
export interface Form16Quarter24QInfo {
  receiptNumber: string;
  filingDate: string;
  challanHeading?: string;
}

export interface Form16Office24QSettings {
  financialYear: number;
  quarters: {
    Q1: Form16Quarter24QInfo;
    Q2: Form16Quarter24QInfo;
    Q3: Form16Quarter24QInfo;
    Q4: Form16Quarter24QInfo;
  };
  updatedAt?: string;
}

export const EMPTY_FORM16_24Q_SETTINGS = (fy: number): Form16Office24QSettings => ({
  financialYear: fy,
  quarters: {
    Q1: { receiptNumber: '', filingDate: '' },
    Q2: { receiptNumber: '', filingDate: '' },
    Q3: { receiptNumber: '', filingDate: '' },
    Q4: { receiptNumber: '', filingDate: '' },
  },
});

export interface Form16SummaryMetrics {
  totalEmployees: number;
  draftsCount: number;
  reviewedCount: number;
  issuedCount: number;
  missingPanCount: number;
  totalGrossSalary: number;
  totalTdsDeposited: number;
  totalNetTaxPayable: number;
}

/**
 * Dynamic Tax Bracket and Rules configuration for New Tax Regime u/s 115BAC.
 * Allows office / DDO to modify tax slabs, standard deduction, 87A rebate limits,
 * cess, and surcharge thresholds dynamically across Assessment Years without code changes.
 */
export interface TaxSlabConfig {
  id: string;
  upto: number; // e.g. 400000, 800000, or Infinity for highest
  rate: number; // percentage (0 to 100)
}

export interface SurchargeConfig {
  id: string;
  above: number; // e.g. 10000000 (1 Cr)
  rate: number; // percentage
}

export interface AssessmentYearTaxConfig {
  ay: string; // e.g. "2026-27"
  standardDeduction: number; // e.g. 75000
  basicExemption: number; // e.g. 400000
  rebate87ALimit: number; // e.g. 1200000
  rebate87AMaxAmount: number; // e.g. 60000
  cessRate: number; // e.g. 4
  slabs: TaxSlabConfig[];
  surchargeThresholds: SurchargeConfig[];
}

export interface Form16TaxRulesSettings {
  assessmentYears: Record<string, AssessmentYearTaxConfig>;
  updatedAt?: string;
}

export const DEFAULT_TAX_RULES_CONFIG: Form16TaxRulesSettings = {
  assessmentYears: {
    '2026-27': {
      ay: '2026-27',
      standardDeduction: 75000,
      basicExemption: 400000,
      rebate87ALimit: 1200000,
      rebate87AMaxAmount: 60000,
      cessRate: 4,
      slabs: [
        { id: 's1', upto: 400000, rate: 0 },
        { id: 's2', upto: 800000, rate: 5 },
        { id: 's3', upto: 1200000, rate: 10 },
        { id: 's4', upto: 1600000, rate: 15 },
        { id: 's5', upto: 2000000, rate: 20 },
        { id: 's6', upto: 2400000, rate: 25 },
        { id: 's7', upto: Infinity, rate: 30 },
      ],
      surchargeThresholds: [
        { id: 'sc1', above: 10000000, rate: 10 },
        { id: 'sc2', above: 20000000, rate: 15 },
        { id: 'sc3', above: 50000000, rate: 25 },
      ],
    },
    '2027-28': {
      ay: '2027-28',
      standardDeduction: 75000,
      basicExemption: 400000,
      rebate87ALimit: 1200000,
      rebate87AMaxAmount: 60000,
      cessRate: 4,
      slabs: [
        { id: 's1', upto: 400000, rate: 0 },
        { id: 's2', upto: 800000, rate: 5 },
        { id: 's3', upto: 1200000, rate: 10 },
        { id: 's4', upto: 1600000, rate: 15 },
        { id: 's5', upto: 2000000, rate: 20 },
        { id: 's6', upto: 2400000, rate: 25 },
        { id: 's7', upto: Infinity, rate: 30 },
      ],
      surchargeThresholds: [
        { id: 'sc1', above: 10000000, rate: 10 },
        { id: 'sc2', above: 20000000, rate: 15 },
        { id: 'sc3', above: 50000000, rate: 25 },
      ],
    },
    '2025-26': {
      ay: '2025-26',
      standardDeduction: 75000,
      basicExemption: 300000,
      rebate87ALimit: 700000,
      rebate87AMaxAmount: 25000,
      cessRate: 4,
      slabs: [
        { id: 's1', upto: 300000, rate: 0 },
        { id: 's2', upto: 600000, rate: 5 },
        { id: 's3', upto: 900000, rate: 10 },
        { id: 's4', upto: 1200000, rate: 15 },
        { id: 's5', upto: 1500000, rate: 20 },
        { id: 's6', upto: Infinity, rate: 30 },
      ],
      surchargeThresholds: [
        { id: 'sc1', above: 10000000, rate: 10 },
        { id: 'sc2', above: 20000000, rate: 15 },
        { id: 'sc3', above: 50000000, rate: 25 },
      ],
    },
  },
};



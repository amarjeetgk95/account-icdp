export type PaybillBillType = 'REGULAR' | 'DA_ARREAR' | 'PAY_ARREAR' | 'SUPPLEMENTARY';

export type TaxReconciliationStatus =
  | 'MATCHED'
  | 'TAX_MISMATCH'
  | 'GROSS_MISMATCH'
  | 'REGULAR_MISMATCH'
  | 'ARREARS_MISMATCH'
  | 'MISSING_IN_PAYROLL'
  | 'MISSING_IN_PAYBILL'
  | 'UNMAPPED_HRPN';

export interface TaxReconciliationMonthItem {
  month: string;
  paybillGross: number;
  paybillTax: number;
  payrollGross: number;
  payrollTax: number;
  taxDiff: number;
  grossDiff: number;
  isTaxMatched: boolean;
  isGrossMatched: boolean;
  hasPaybillData: boolean;
  hasPayrollData: boolean;
  /** False when employee was transferred out / not yet joined for this entry month. */
  isActive?: boolean;
  /** Manual Pay/DA Difference arrears folded into paybillGross for this month. */
  paybillArrears?: number;
  /** --- Three-track split (059). Totals above always = regular + da + pay. --- */
  /** Paybill regular (bill_type REGULAR component sum, excl. manual/supplementary). */
  pbRegular?: number;
  /** Paybill DA-difference track: DA_ARREAR bills + manual DA Difference. */
  pbDaDiff?: number;
  /** Paybill Pay-difference track: PAY_ARREAR/SUPPLEMENTARY bills + manual Pay Difference. */
  pbPayDiff?: number;
  /** Payroll regular: (gross + da) - pay_diff - da_diff. */
  prRegular?: number;
  /** Payroll DA-difference (employee_salaries.da_diff). */
  prDaDiff?: number;
  /** Payroll Pay-difference (employee_salaries.pay_diff). */
  prPayDiff?: number;
  regularDiff?: number;
  daDiffDiff?: number;
  payDiffDiff?: number;
  isRegularMatched?: boolean;
  isDaMatched?: boolean;
  isPayMatched?: boolean;
  /** Split of manual arrears for tooltip/detail (replaces single paybillArrears use). */
  paybillDaManual?: number;
  paybillPayManual?: number;
}

export interface TaxReconciliationRow {
  hrpn: string;
  employeeId: string | null;
  employeeName: string;
  /** Name as printed in the Paybill PDF for the matched HRPN (may differ — HRPN is the hard key). */
  paybillName?: string | null;
  /** True when employee-master name and paybill name differ after title/punctuation normalization. */
  nameMismatch?: boolean;
  /** True when the employee-master record has no usable HRPN — paybill can never join (shows as EMP-*). */
  missingHrpn?: boolean;
  pan: string;
  designation: string | null;
  months: [TaxReconciliationMonthItem, TaxReconciliationMonthItem, TaxReconciliationMonthItem];
  quarterPaybillTax: number;
  quarterPayrollTax: number;
  quarterTaxDiff: number;
  quarterPaybillGross: number;
  quarterPayrollGross: number;
  quarterGrossDiff: number;
  /** Quarter aggregates per track (059 three-track). */
  quarterPbRegular?: number;
  quarterPrRegular?: number;
  quarterRegularDiff?: number;
  quarterPbDaDiff?: number;
  quarterPrDaDiff?: number;
  quarterDaDiffDiff?: number;
  quarterPbPayDiff?: number;
  quarterPrPayDiff?: number;
  quarterPayDiffDiff?: number;
  status: TaxReconciliationStatus;
  statusMessage: string;
  canSync: boolean;
}

export interface TaxReconciliationSummary {
  totalEmployees: number;
  matchedCount: number;
  taxMismatchCount: number;
  grossMismatchCount: number;
  regularMismatchCount?: number;
  arrearsMismatchCount?: number;
  missingInPayrollCount: number;
  missingInPaybillCount: number;
  unmappedHrpnCount: number;
  totalPaybillTax: number;
  totalPayrollTax: number;
  netTaxDiff: number;
  totalPaybillGross: number;
  totalPayrollGross: number;
  netGrossDiff: number;
  totalPbRegular?: number;
  totalPrRegular?: number;
  netRegularDiff?: number;
  totalPbDaDiff?: number;
  totalPrDaDiff?: number;
  netDaDiffDiff?: number;
  totalPbPayDiff?: number;
  totalPrPayDiff?: number;
  netPayDiffDiff?: number;
}

export interface TaxReconciliationReport {
  fy: number;
  fyLabel: string;
  quarter: string;
  monthLabels: Array<{ work: string; paid: string }>;
  quarterMonths: string[];
  summary: TaxReconciliationSummary;
  rows: TaxReconciliationRow[];
}

export interface SyncPaybillToPayrollItem {
  employeeId: string;
  hrpn?: string;
  month: string;
  gross: number;
  da: number;
  tax: number;
  pay_diff?: number;
  da_diff?: number;
  arrears_tax?: number;
  old_gross?: number;
  old_da?: number;
  old_tax?: number;
  old_pay_diff?: number;
  old_da_diff?: number;
}

export interface SyncPaybillToPayrollPayload {
  fy: number;
  quarter: string;
  hrpns?: string[];
}

export interface SyncPaybillToPayrollResult {
  syncedCount: number;
  message: string;
}

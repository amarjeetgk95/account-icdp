export type TaxReconciliationStatus =
  | 'MATCHED'
  | 'TAX_MISMATCH'
  | 'GROSS_MISMATCH'
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
}

export interface TaxReconciliationRow {
  hrpn: string;
  employeeId: string | null;
  employeeName: string;
  pan: string;
  designation: string | null;
  months: [TaxReconciliationMonthItem, TaxReconciliationMonthItem, TaxReconciliationMonthItem];
  quarterPaybillTax: number;
  quarterPayrollTax: number;
  quarterTaxDiff: number;
  quarterPaybillGross: number;
  quarterPayrollGross: number;
  quarterGrossDiff: number;
  status: TaxReconciliationStatus;
  statusMessage: string;
  canSync: boolean;
}

export interface TaxReconciliationSummary {
  totalEmployees: number;
  matchedCount: number;
  taxMismatchCount: number;
  grossMismatchCount: number;
  missingInPayrollCount: number;
  missingInPaybillCount: number;
  unmappedHrpnCount: number;
  totalPaybillTax: number;
  totalPayrollTax: number;
  netTaxDiff: number;
  totalPaybillGross: number;
  totalPayrollGross: number;
  netGrossDiff: number;
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
  month: string;
  gross: number;
  da: number;
  tax: number;
}

export interface SyncPaybillToPayrollPayload {
  fy: number;
  quarter: string;
  hrpns?: string[];
  officeId?: string;
}

export interface SyncPaybillToPayrollResult {
  syncedCount: number;
  message: string;
}

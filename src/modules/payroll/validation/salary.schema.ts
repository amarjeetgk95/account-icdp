type SalaryImportStatus = 'matched' | 'unmatched' | 'duplicate' | 'not_detected';

// A single (HRPN, month, financial year, gross, incomeTax) record.
// NOTE: Karmayogi Excel carries only Gross + Tax. Regular DA is part of
// monthly pay inside grossSalary — there is no standalone DA column.
export interface ParsedSalaryRecord {
  hprnNo: string;
  name?: string;
  /** PAN from the file's PAN column, when present — HRPN-fallback match key. */
  pan?: string;
  month: string;
  financialYear: number;
  grossSalary: number;
  incomeTax: number;
}

export interface ClassifiedSalaryRecord extends ParsedSalaryRecord {
  employeeId: string | null;
  status: SalaryImportStatus;
}

export interface SalaryImportSummary {
  importId: string;
  total: number;
  matched: number;
  unmatched: number;
  duplicate: number;
  notDetected: number;
  appliedToGrid: number;
}

export interface SalaryPreviewSummary {
  fileName: string;
  hrpnColumnHeader: string;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  duplicateRecords: number;
  invalidRecords: number;
  distinctHrpnCount: number;
  grossColumns: number;
  incomeTaxColumns: number;
  months: Array<{ month: string; financialYear: number }>;
}

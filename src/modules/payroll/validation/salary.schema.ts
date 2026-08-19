type SalaryImportStatus = 'matched' | 'unmatched' | 'duplicate' | 'not_detected';

// A single (HRPN, month, financial year, gross, incomeTax) record.
export interface ParsedSalaryRecord {
  hprnNo: string;
  name?: string;
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

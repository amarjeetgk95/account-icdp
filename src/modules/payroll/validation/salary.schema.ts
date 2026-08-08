import { z } from 'zod';

export const salaryImportStatusSchema = z.enum([
  'matched',
  'unmatched',
  'duplicate',
  'not_detected',
]);

export type SalaryImportStatus = z.infer<typeof salaryImportStatusSchema>;

// A single (HRPN, month, financial year, gross, incomeTax) record.
export const parsedSalaryRecordSchema = z.object({
  hprnNo: z.string().min(1, 'HRPN No. is required'),
  name: z.string().optional(),
  month: z.string().min(1, 'Month is required'),
  financialYear: z.number().int(),
  grossSalary: z
    .number()
    .min(0, 'Gross salary cannot be negative')
    .transform((val) => Math.round(val * 100) / 100),
  incomeTax: z
    .number()
    .min(0, 'Income tax cannot be negative')
    .transform((val) => Math.round(val * 100) / 100),
});

export type ParsedSalaryRecord = z.infer<typeof parsedSalaryRecordSchema>;

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

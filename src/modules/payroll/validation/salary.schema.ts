import { z } from 'zod';

export const parsedSalarySchema = z.object({
  hprnNo: z.string().min(1, 'HRPN No. is required'),
  name: z.string().nullable().optional(),
  basic: z.number().nullable().optional(),
  da: z.number().nullable().optional(),
  hra: z.number().nullable().optional(),
  otherAllowance: z.number().nullable().optional(),
  totalSalary: z.number().nullable().optional(),
});

export type ParsedSalaryRow = z.infer<typeof parsedSalarySchema>;

export const salaryImportStatusSchema = z.enum([
  'matched',
  'unmatched',
  'duplicate',
  'not_detected',
]);

export type SalaryImportStatus = z.infer<typeof salaryImportStatusSchema>;

export interface ClassifiedSalaryRow extends ParsedSalaryRow {
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

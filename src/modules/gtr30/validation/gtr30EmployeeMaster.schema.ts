import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const gtr30EmployeeMasterSchema = z
  .object({
    id: z.string().optional(),
    srNo: z.coerce.number().int('Sr. No. must be a whole number').min(0, 'Sr. No. cannot be negative').default(0),
    hrpnNo: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim().toUpperCase() : val))
      .refine((val) => !val || val.length <= 50, 'HRPN No. must be at most 50 characters'),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .transform((val) => val.trim().replace(/\s+/g, ' ')),
    designation: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim() : val))
      .refine((val) => !val || val.length <= 100, 'Designation must be less than 100 characters'),
    payScale: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim() : val))
      .refine((val) => !val || val.length <= 100, 'Pay scale must be less than 100 characters'),
    currentPay: z.coerce
      .number()
      .min(0, 'Current pay cannot be negative')
      .max(99_999_999, 'Current pay is too large')
      .default(0),
    currentPayDate: z
      .string()
      .optional()
      .refine((val) => !val || dateRegex.test(val), 'Invalid date format (YYYY-MM-DD)'),
    hraPercent: z.coerce
      .number()
      .min(0, 'HRA % cannot be negative')
      .max(100, 'HRA % cannot exceed 100')
      .default(0),
    transportAllowance: z.coerce
      .number()
      .min(0, 'Transport allowance cannot be negative')
      .max(99_999_999, 'Transport allowance is too large')
      .default(0),
    medicalAllowance: z.coerce
      .number()
      .min(0, 'Medical allowance cannot be negative')
      .max(99_999_999, 'Medical allowance is too large')
      .default(0),
    claAllowance: z.coerce
      .number()
      .min(0, 'CLA allowance cannot be negative')
      .max(99_999_999, 'CLA allowance is too large')
      .default(0),
  })
  .superRefine((data, ctx) => {
    if (data.currentPay > 0 && !data.currentPayDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pay date is required when current pay is entered',
        path: ['currentPayDate'],
      });
    }
  });

export type GTR30EmployeeMasterInput = z.infer<typeof gtr30EmployeeMasterSchema>;

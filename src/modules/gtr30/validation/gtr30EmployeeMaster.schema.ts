import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const gtr30EmployeeMasterSchema = z
  .object({
    id: z.string().optional(),
    srNo: z.coerce.number().int('Sr. No. must be a whole number').min(0, 'Sr. No. cannot be negative').default(0),
    billCode: z.string().optional(),
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
      .transform((val) => (val ? val.trim() : ''))
      .default(''),
    designationGujarati: z.string().optional(),
    cadreClass: z.string().optional(),
    payScale: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim() : ''))
      .default(''),
    gradePay: z.string().optional(),
    payLevelCell: z.string().optional(),
    ppaNo: z.string().optional(),
    currentPay: z.coerce
      .number()
      .min(0, 'Current pay cannot be negative')
      .max(99_999_999, 'Current pay is too large')
      .default(0),
    currentPayDate: z
      .string()
      .optional()
      .refine((val) => !val || dateRegex.test(val), 'Invalid date format (YYYY-MM-DD)'),
    quarterAddress: z.string().optional(),
    insuranceGroup: z.string().optional(),
    insuranceType: z
      .enum(['savings_and_insurance', 'insurance_only'])
      .optional(),
    hraPercent: z.coerce
      .number()
      .min(0, 'HRA % cannot be negative')
      .max(100, 'HRA % cannot exceed 100')
      .default(0),
    da: z.coerce.number().min(0).max(99_999_999).optional(),
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
    rentOfBuilding: z.coerce.number().min(0).max(99_999_999).optional(),
    professionalTax: z.coerce.number().min(0).max(99_999_999).optional(),
    gis1981Insurance: z.coerce.number().min(0).max(99_999_999).optional(),
    gis1981Savings: z.coerce.number().min(0).max(99_999_999).optional(),
    npsPension: z.coerce.number().min(0).max(99_999_999).optional(),
    societyDeduction: z.coerce.number().min(0).max(99_999_999).optional(),
    remarks: z.string().optional(),
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

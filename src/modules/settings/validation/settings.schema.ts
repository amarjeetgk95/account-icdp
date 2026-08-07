import { z } from 'zod';

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const employeeSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .transform((val) => val.trim().replace(/\s+/g, ' ')),
  pan: z
    .string()
    .length(10, 'PAN must be exactly 10 characters')
    .regex(panRegex, 'Invalid PAN format (e.g., ABCDE1234F)')
    .transform((val) => val.toUpperCase()),
  joinDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      'Invalid date format'
    ),
  transferDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      'Invalid date format'
    ),
}).refine(
  (data) => {
    if (data.joinDate && data.transferDate) {
      return new Date(data.joinDate) <= new Date(data.transferDate);
    }
    return true;
  },
  {
    message: 'Join date cannot be after transfer date',
    path: ['transferDate'],
  }
);

export type EmployeeInput = z.infer<typeof employeeSchema>;

export const officeDetailsSchema = z.object({
  officeName: z.string().max(200).default(''),
  subtitle: z.string().max(200).default(''),
  address: z.string().max(500).default(''),
  phone: z.string().max(50).default(''),
  email: z.string().email('Invalid email address').or(z.literal('')).default(''),
  gst: z.string().max(20).default(''),
  tan: z.string().max(20).default(''),
});

export type OfficeDetailsInput = {
  officeName: string;
  subtitle: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
  tan: string;
};

export const financialYearSchema = z.object({
  newYear: z
    .number()
    .int('Year must be a whole number')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier'),
});

export type FinancialYearInput = z.infer<typeof financialYearSchema>;

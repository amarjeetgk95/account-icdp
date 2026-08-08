import { z } from 'zod';

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

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

export type OfficeDetailsInput = z.output<typeof officeDetailsSchema>;

export const form16DefaultsSchema = z.object({
  employerName: z.string().max(300).default(''),
  employerAddress: z.string().max(500).default(''),
  employerPan: z
    .string()
    .refine((v) => v === '' || /^[A-Za-z0-9]{10}$/.test(v), {
      message: 'PAN must be exactly 10 letters/digits',
    })
    .default(''),
  employerTan: z
    .string()
    .refine((v) => v === '' || /^[A-Za-z]{4}[0-9]{5}[A-Za-z]$/.test(v), {
      message: 'TAN format is AAAA99999A',
    })
    .default(''),
  citTds: z.string().max(200).default(''),
  signatoryName: z.string().max(120).default(''),
  signatoryDesignation: z.string().max(120).default(''),
  signatoryPlace: z.string().max(120).default(''),
});

export type Form16DefaultsInput = z.output<typeof form16DefaultsSchema>;

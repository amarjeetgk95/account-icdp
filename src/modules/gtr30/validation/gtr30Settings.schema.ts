import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const daRateEntrySchema = z.object({
  id: z.string(),
  effectiveFrom: z.string().refine((val) => dateRegex.test(val), 'Invalid date (YYYY-MM-DD)'),
  rate: z.coerce.number().min(0).max(100),
  description: z.string().optional(),
  resolutionNo: z.string().optional(),
});

const postItemSchema = z.object({
  id: z.string(),
  srNo: z.union([z.string(), z.coerce.number()]),
  designation: z.string().default(''),
  cadreClass: z.string().default('૩'),
  sanctioned: z.coerce.number().min(0).default(1),
  filled: z.coerce.number().min(0).default(0),
  vacant: z.coerce.number().min(0).default(1),
  total: z.coerce.number().min(0).default(1),
});

const defaultSettingsSchema = z.object({
  officeName: z.string().optional().default(''),
  officeFullName: z.string().optional().default(''),
  branchName: z.string().optional().default(''),
  treasuryName: z.string().optional().default(''),
  phoneNo: z.string().optional().default(''),
  district: z.string().optional().default(''),
  station: z.string().optional().default(''),
  cardexNo: z.string().optional().default(''),
  ddoCode: z.string().optional().default(''),
  controllingOfficer: z.string().optional().default(''),
  classOfExpenditure: z.string().optional().default(''),
  fund: z.string().optional().default(''),
  drawingOfficer: z.string().optional().default(''),
  demandNo: z.string().optional().default(''),
  typeOfBudget: z.string().optional().default(''),
  schemeNo: z.string().optional().default(''),
  headChargeable: z.string().optional().default(''),
  sector: z.string().optional().default(''),
  majorHead: z.string().optional().default(''),
  minorHead: z.string().optional().default(''),
  subHead: z.string().optional().default(''),
  budgetYear: z.string().optional().default(''),
  schemeResolutionText: z.string().optional().default(''),
  daResolutionText: z.string().optional().default(''),
  drawingOfficerName: z.string().optional().default(''),
  drawingOfficerNameGujarati: z.string().optional().default(''),
  drawingOfficerDesignation: z.string().optional().default(''),
  drawingOfficerDesignationGujarati: z.string().optional().default(''),
  drawingOfficerOffice: z.string().optional().default(''),
  drawingOfficerOfficeGujarati: z.string().optional().default(''),
  messengerName: z.string().optional().default(''),
  messengerDesignation: z.string().optional().default(''),
});

const insuranceGroupEnum = z.enum(['ક', 'ખ', 'ગ', 'ઘ', 'A', 'B', 'C', 'D', '']);

const employeeTemplateSchema = z.object({
  designation: z.string().optional().default(''),
  designationGujarati: z.string().optional().default(''),
  cadreClass: z.string().optional().default(''),
  payScale: z.string().optional().default(''),
  gradePay: z.string().optional().default(''),
  payLevelCell: z.string().optional().default(''),
  ppaNo: z.string().optional().default(''),
  quarterAddress: z.string().optional().default(''),
  insuranceGroup: insuranceGroupEnum.optional().default(''),
  insuranceType: z.enum(['savings_and_insurance', 'insurance_only']).default('savings_and_insurance'),
});

export const gtr30SettingsSchema = z.object({
  settings: defaultSettingsSchema.optional(),
  employeeTemplate: employeeTemplateSchema.optional(),
  defaultPosts: z.array(postItemSchema).optional().default([]),
  daRates: z.array(daRateEntrySchema).optional().default([]),
});

export type Gtr30SettingsInput = z.infer<typeof gtr30SettingsSchema>;
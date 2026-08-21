import { z } from 'zod';
import type { GTR44DefaultSettings } from '../store/gtr44SettingsStore';

/**
 * Phase 1 — Office & Treasury Master defaults validation
 * Uses Zod to validate all GTR44 default settings fields.
 * Backward compatible: new Office & Treasury fields are optional with fallbacks.
 */

const districtSchema = z.string().regex(/^\d{2}$/, 'District must be exactly 2 digits');
const detailedHeadSchema = z.string().regex(/^\d{2}$/, 'Detailed Head must be exactly 2 digits');
const drawingSchema = z.string().regex(/^\d{3}$/, 'Drawing DDO Code must be exactly 3 digits');
const classOfExpenditureSchema = z.string().regex(/^\d$/, 'Class of Expenditure must be 1 digit');
const fundSchema = z.string().regex(/^\d$/, 'Fund must be 1 digit');
const demandNoSchema = z.string().regex(/^\d{2,3}$/, 'Demand No. must be 2-3 digits');
const typeOfBudgetSchema = z.string().regex(/^\d$/, 'Type of Budget must be 1 digit');
const schemeNoSchema = z.string().regex(/^\d{4,6}$/, 'Scheme No. must be 4-6 digits');
const headChargeableSchema = z.string().regex(/^\d{13}$/, 'Head Chargeable must be exactly 13 digits').optional().or(z.literal(''));
const monthOfSchema = z.string().optional().or(z.literal(''));

export const gtr44SettingsSchema = z.object({
  officeName: z.string().min(1, 'Office / Institution Name is required'),
  treasuryName: z.string().min(1, 'Treasury Name is required'),
  district: districtSchema,
  drawing: drawingSchema,
  ddoCardexCode: z.string().min(1, 'DDO Cardex Code is required'),
  classOfExpenditure: classOfExpenditureSchema,
  fund: fundSchema,
  demandNo: demandNoSchema,
  typeOfBudget: typeOfBudgetSchema,
  schemeNo: schemeNoSchema,
  detailedHead: detailedHeadSchema,
  sector: z.string().min(1, 'Sector is required'),
  majorHead: z.string().min(1, 'Major Head is required'),
  subMajorHead: z.string().regex(/^\d{2}$/, 'Sub-Major Head must be 2 digits'),
  minorHead: z.string().min(1, 'Minor Head is required'),
  subHead: z.string().min(1, 'Sub Head is required'),
  payToDesignation: z.string().optional().or(z.literal('')),
  budgetGrantYearFrom: z.string().regex(/^\d{4}$/, 'Budget Grant Year From must be 4 digits'),
  budgetGrantYearTo: z.string().regex(/^\d{2,4}$/, 'Budget Grant Year To must be 2 or 4 digits'),
  // Office & Treasury Master — Phase 1 (optional for backward compat)
  officeAddress: z.string().optional().or(z.literal('')),
  drawingOfficerName: z.string().optional().or(z.literal('')),
  drawingOfficerDesignation: z.string().optional().or(z.literal('')),
  messengerName: z.string().optional().or(z.literal('')),
  countersigningOffice: z.string().optional().or(z.literal('')),
  auditorName: z.string().optional().or(z.literal('')),
  superintendentName: z.string().optional().or(z.literal('')),
  treasuryPayMode: z.enum(['TC', 'Cheque']).optional().or(z.literal('')),
  defaultMonthOf: monthOfSchema,
  // Head chargeable code extended validation (also part of budget head selection)
  headChargeableCode: headChargeableSchema.optional(),
});

/**
 * Additional explicit schemas for individual fields reused in bill validation
 */
export const headChargeableCodeSchema = z.string().regex(/^\d{13}$/, 'Head Chargeable must be exactly 13 digits');
export const detailedHeadCodeSchema = z.string().regex(/^\d{2}$/, 'Detailed Head must be exactly 2 digits');
export const districtCodeSchema = z.string().regex(/^\d{2}$/, 'District must be exactly 2 digits');

export type GTR44SettingsValidationResult = {
  success: boolean;
  errors: string[];
};

/**
 * Validate settings object, returning array of human-readable error messages.
 * Uses zod safeParse to collect all issues.
 */
export function validateGTR44Settings(data: Partial<GTR44DefaultSettings> & Record<string, unknown>): string[] {
  const result = gtr44SettingsSchema.safeParse(data);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export function validateGTR44SettingsDetailed(data: Partial<GTR44DefaultSettings> & Record<string, unknown>): GTR44SettingsValidationResult {
  const errors = validateGTR44Settings(data);
  return { success: errors.length === 0, errors };
}

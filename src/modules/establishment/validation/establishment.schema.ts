import { z } from 'zod';

/**
 * DB-tolerant string: PostgreSQL nullable columns arrive as JSON `null`.
 * `z.string().optional().default('')` rejects null, which used to invalidate
 * the entire employee list whenever any row had a NULL column.
 */
const dbString = z.preprocess((v) => (v === null || v === undefined ? '' : v), z.string());

const dbNumber = z.preprocess(
  (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return n < 0 ? 0 : n;
  },
  z.number()
);

export const establishmentPayEntrySchema = z.object({
  id: z.string().min(1),
  effectiveDate: dbString,
  basicPay: dbNumber,
  payScale: dbString,
  levelCell: dbString,
  notes: dbString,
});

export const establishmentAllowancesSchema = z.object({
  hraPercent: dbNumber,
  transportAllowance: dbNumber,
  medicalAllowance: dbNumber,
  claAllowance: dbNumber,
  otherAllowance: dbNumber,
});

export const establishmentDeductionsSchema = z.object({
  societyDeduction: dbNumber,
  gisSavings: dbNumber,
  gisInsurance: dbNumber,
  professionalTax: dbNumber,
  rentOfBuilding: dbNumber,
});

export const establishmentEmployeeSchema = z.object({
  id: z.string().min(1),
  hrpnNo: dbString,
  name: dbString,
  designation: dbString,
  designationGu: dbString,
  cadreClass: dbString,
  pan: dbString,
  payScale: dbString,
  gradePay: dbString,
  payLevel: dbString,
  payCell: dbString,
  ppaNo: dbString,
  joinDate: dbString,
  transferDate: dbString,
  headquarter: dbString,
  budgetHeadId: dbString,
  active: z.boolean().default(true),
  quartersAddress: dbString,
  gisGroup: dbString,
  allowances: z.preprocess((v) => v ?? {}, establishmentAllowancesSchema),
  deductions: z.preprocess((v) => v ?? {}, establishmentDeductionsSchema),
  payEntries: z.preprocess((v) => v ?? [], z.array(establishmentPayEntrySchema)),
});

export const establishmentEmployeeDbSchema = establishmentEmployeeSchema.passthrough();

export const establishmentPostSchema = z.object({
  id: z.string().min(1),
  srNo: z.number().int().min(0).default(0),
  designation: dbString,
  cadreClass: dbString,
  sanctioned: z.number().int().min(0).default(0),
  filled: z.number().int().min(0).default(0),
});

export const establishmentPostDbSchema = establishmentPostSchema.passthrough();

export const establishmentListDbSchema = z.array(establishmentEmployeeDbSchema);
export const establishmentPostsDbSchema = z.array(establishmentPostDbSchema);

export const establishmentBackfillDbSchema = z
  .object({
    inserted: z.coerce.number().int().default(0),
    updated: z.coerce.number().int().default(0),
    total: z.coerce.number().int().default(0),
  })
  .passthrough();

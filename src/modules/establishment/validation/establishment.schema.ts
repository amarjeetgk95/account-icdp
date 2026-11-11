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
  nameGu: dbString,
  mobileNo: dbString,
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
  displayOrder: z.preprocess(
    (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    },
    z.number().int().nullable().optional()
  ),
  active: z.boolean().default(true),
  quartersAddress: dbString,
  gisGroup: dbString,
  allowances: z.preprocess((v) => v ?? {}, establishmentAllowancesSchema),
  deductions: z.preprocess((v) => v ?? {}, establishmentDeductionsSchema),
  payEntries: z.preprocess((v) => v ?? [], z.array(establishmentPayEntrySchema)),
});

export const establishmentEmployeeDbSchema = establishmentEmployeeSchema.passthrough();

/**
 * HRPN is the single source of truth linking the Establishment directory,
 * the Paybill employee ledger and all imports. Every comparison must use
 * the normalized (trimmed + upper-cased) form so ` 20014113 ` and
 * `20014113` are the same employee.
 */
export function normalizeEstablishmentHrpn(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

const PLACEHOLDER_HRPNS = new Set(['0', '-', 'NA', 'N/A', 'NULL', 'NONE', 'NIL']);

/** True when the value is a usable HRPN identity (not empty/placeholder). */
export function isUsableEstablishmentHrpn(value: unknown): boolean {
  const cleaned = normalizeEstablishmentHrpn(value);
  if (!cleaned) return false;
  if (PLACEHOLDER_HRPNS.has(cleaned)) return false;
  return true;
}

/**
 * Input-level validation for create/update (stricter than the DB-tolerant
 * read schema above, which must keep accepting legacy rows with NULL/empty
 * HRPN so a single bad row never invalidates the whole register).
 * Returns an error message, or null when the HRPN is acceptable.
 */
export function validateEstablishmentHrpnInput(value: unknown): string | null {
  const cleaned = normalizeEstablishmentHrpn(value);
  if (!cleaned) return 'HRPN No. is required — it is the single source of truth linking Establishment and Paybill.';
  if (PLACEHOLDER_HRPNS.has(cleaned)) return `HRPN No. "${cleaned}" is not a valid identity.`;
  if (cleaned.length < 3) return 'HRPN No. must be at least 3 characters.';
  if (cleaned.length > 50) return 'HRPN No. must be at most 50 characters.';
  if (!/^[A-Z0-9]+$/.test(cleaned)) return 'HRPN No. may contain only letters and digits (A–Z, 0–9).';
  return null;
}

/**
 * Find duplicated HRPNs (normalized, case-insensitive) in a list.
 * Returns the normalized HRPNs that occur more than once, sorted.
 * Empty/placeholder HRPNs are ignored — they carry no identity.
 */
export function findDuplicateEstablishmentHrpns(
  employees: Array<{ hrpnNo?: string | null }>
): string[] {
  const counts = new Map<string, number>();
  for (const emp of employees) {
    const key = normalizeEstablishmentHrpn(emp.hrpnNo);
    if (!key || PLACEHOLDER_HRPNS.has(key)) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n > 1)
    .map(([hrpn]) => hrpn)
    .sort();
}

export const establishmentListDbSchema = z.array(establishmentEmployeeDbSchema);

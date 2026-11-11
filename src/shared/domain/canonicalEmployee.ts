/**
 * Canonical employee register — single source of truth.
 *
 * DECISION (Phase 3 canonicalization):
 * - `public.establishment_employees` is the ONLY writable employee master.
 *   One row per person, keyed by normalized HRPN (fallback PAN).
 * - `public.employees` (payroll, legacy `hprn_no` typo) is READ-ONLY legacy.
 *   It stays for roster / 24Q / salary history until the dual-read
 *   verification cycle completes, then becomes a view. Do NOT add new
 *   create/update UI against it.
 * - GTR-30 and GTR-44 are standalone treasury modules, not mapped to establishment.
 * - `paybill_employee_earnings/deductions` are Treasury transactions keyed by
 *   HRPN text + `establishment_employee_id` FK (migration 051).
 *
 * All comparisons must use the normalizers below (HRPN > PAN > name).
 */

export {
  normalizeHrpn,
  normalizePan,
  normalizeName,
  identityKey,
  matchTierForKey,
  type IdentityMatch,
} from './employeeIdentity';

import { normalizeHrpn, normalizePan } from './employeeIdentity';

export const CANONICAL_EMPLOYEE_TABLE = 'establishment_employees' as const;
export const LEGACY_PAYROLL_EMPLOYEE_TABLE = 'employees' as const;
export const CANONICAL_LEDGER_TABLES = [
  'paybill_employee_earnings',
  'paybill_employee_deductions',
] as const;

/**
 * UI-compatible canonical HRPN key: trimmed + upper-cased, '' when unusable.
 * Delegates placeholder handling ('0','-','NA',…) to `normalizeHrpn` so every
 * module agrees on what counts as identity. Keeps the '' contract that
 * `useEmployeeDirectory` / establishment validation already rely on.
 */
export function toCanonicalHrpn(value: unknown): string {
  return normalizeHrpn(value) ?? '';
}

/** True when the value can safely key a person (not empty/placeholder). */
export function isCanonicalHrpn(value: unknown): boolean {
  return toCanonicalHrpn(value) !== '';
}

/** Prefix for roster/save ids that have no legacy payroll row (see below). */
export const UNLINKED_ID_PREFIX = 'est:';

/** Minimal identity carried by a legacy payroll `employees` row. */
export interface LegacyEmployeeRef {
  id: string;
  /** Raw `hprn_no` (legacy typo column). */
  hprnNo: string | null;
  pan: string | null;
}

/**
 * Bridge index: canonical HRPN/PAN -> legacy payroll row id.
 *
 * The payroll salary stores (`employee_salaries`, `employee_salary`) are still
 * keyed by legacy `employees.id`, while the roster is canonical
 * (`establishment_employees`). This index resolves one side to the other
 * without any writes: HRPN wins, PAN is the fallback (HRPN match first so a
 * shared/blank PAN can never hijack the link — same rule as migration 051).
 */
export function buildLegacyBridge(
  legacyRows: Array<{ id: string | number; hprn_no?: unknown; pan?: unknown }>
): { byHrpn: Map<string, string>; byPan: Map<string, string> } {
  const byHrpn = new Map<string, string>();
  const byPan = new Map<string, string>();
  for (const row of legacyRows) {
    const rowId = String(row.id);
    const hrpn = toCanonicalHrpn(row.hprn_no);
    if (hrpn && !byHrpn.has(hrpn)) byHrpn.set(hrpn, rowId);
    const pan = normalizePan(row.pan);
    if (pan && !byPan.has(pan)) byPan.set(pan, rowId);
  }
  return { byHrpn, byPan };
}

/** Resolve a canonical person to its legacy payroll row id, if any. */
export function resolveLegacyId(
  hrpnNo: unknown,
  pan: unknown,
  bridge: { byHrpn: Map<string, string>; byPan: Map<string, string> }
): string | null {
  const hrpn = toCanonicalHrpn(hrpnNo);
  if (hrpn && bridge.byHrpn.has(hrpn)) return bridge.byHrpn.get(hrpn)!;
  const panKey = normalizePan(pan);
  if (panKey && bridge.byPan.has(panKey)) return bridge.byPan.get(panKey)!;
  return null;
}

/** True for roster/save ids that carry no legacy payroll row. */
export function isUnlinkedId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(UNLINKED_ID_PREFIX);
}

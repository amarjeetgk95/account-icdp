/**
 * Canonical employee-identity utilities (framework-free).
 *
 * All three employee registers spell the join key differently
 * (`employees.hprn_no` typo vs `hrpn_no` elsewhere) and store placeholder
 * junk ('0', '-', 'NA', …). Every comparison must go through these
 * normalizers so HRPN > PAN > name matching is consistent everywhere.
 */

/** Placeholder HRPN values observed in imports — never a real identity. */
const EMPTY_HRPN_VALUES = new Set(['', '0', '-', 'NA', 'N/A', 'NULL', 'NONE', 'NIL']);

/** Upper-cased HRPN, or null when missing/placeholder. */
export function normalizeHrpn(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toUpperCase();
  if (!cleaned || EMPTY_HRPN_VALUES.has(cleaned)) return null;
  return cleaned;
}

/** Upper-cased PAN, or null when missing. */
export function normalizePan(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toUpperCase();
  return cleaned || null;
}

/** Lower-cased, whitespace-collapsed name for comparison (raw names kept for display). */
export function normalizeName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** How two person records were linked. Strongest key wins. */
export type IdentityMatch = 'hrpn' | 'pan' | 'name';

/**
 * Canonical map key for a person. HRPN first, then PAN, then normalized name.
 * Persons without any usable key share the 'N:' (unknown) bucket and are
 * reported separately — they can never be auto-merged safely.
 */
export function identityKey(hrpn: string | null, pan: string | null, name: string): string {
  if (hrpn) return `H:${hrpn}`;
  if (pan) return `P:${pan}`;
  const nameKey = normalizeName(name);
  return nameKey ? `N:${nameKey}` : 'N:';
}

/** Which key tier backs an identityKey (for reporting match strength). */
export function matchTierForKey(key: unknown): IdentityMatch | 'unknown' {
  if (typeof key !== 'string') return 'unknown';
  if (key.startsWith('H:') && key.length > 2) return 'hrpn';
  if (key.startsWith('P:') && key.length > 2) return 'pan';
  if (key.startsWith('N:') && key.length > 2) return 'name';
  return 'unknown';
}

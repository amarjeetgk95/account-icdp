/**
 * Bill-code normalisation and legacy filtering helpers.
 *
 * Legacy dummy bill codes (`GTR30-SAL`, `GTR30-DA`, `GTR30-BONUS`) were seeded
 * by early prototype versions of the employee master / CSV import flow. They
 * are not real treasury bill codes and must never appear in bill-code
 * dropdowns or survive the local <-> backend sync round-trip.
 */
export const LEGACY_DUMMY_BILL_CODES: readonly string[] = [
  'GTR30-SAL',
  'GTR30-DA',
  'GTR30-BONUS',
];

const LEGACY_DUMMY_SET = new Set<string>(LEGACY_DUMMY_BILL_CODES);

/** True when the given bill code is a legacy dummy code that must be hidden. */
export function isLegacyBillCode(code: string | null | undefined): boolean {
  const normalized = (code || '').trim().toUpperCase();
  return normalized.length > 0 && LEGACY_DUMMY_SET.has(normalized);
}

/**
 * Dedupe key that collapses case / hyphen / spacing variants so
 * `GTR-30-GO-STATS`, `GTR30-GO-STATS` and `gtr 30 go stats` all resolve to
 * the same canonical entry (configured mappings win over derived codes).
 */
export function normalizeBillCodeKey(code: string | null | undefined): string {
  return (code || '').trim().toUpperCase().replace(/[\s-]+/g, '');
}

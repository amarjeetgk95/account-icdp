/**
 * GTR-44 formatting helpers. Currency words/figures live canonically in
 * `@/shared/domain/currency` — import them from there directly.
 */

export function splitAmount(amount: number | null | undefined): { rs: string; ps: string } {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return { rs: '', ps: '' };
  }
  const parts = Number(amount).toFixed(2).split('.');
  return {
    rs: parseInt(parts[0], 10).toLocaleString('en-IN'),
    ps: parts[1] || '00',
  };
}

/**
 * GTR-44 print format: YYYY-MM-DD -> DD/MM/YYYY (slash-separated).
 * NOT the same as the shared `formatDateDDMMYYYY` (dash-separated) — kept
 * module-local for the print preview.
 */
export function formatDateDDMMYYYY(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

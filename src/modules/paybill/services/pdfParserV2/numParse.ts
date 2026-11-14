/**
 * Shared money parser (thousands separators stripped).
 */
export function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

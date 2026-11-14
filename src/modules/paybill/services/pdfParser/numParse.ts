/**
 * Shared money parser for paybill text/coordinate extraction.
 * Strips thousands separators and any non numeric characters.
 */
export function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const clean = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * GTR-44 formatting helpers. Currency words/figures now live canonically in
 * `@/shared/domain/currency` — re-exported here so existing call sites keep working.
 */
export { numberToWordsINR, formatINR, formatIndianCurrency } from '@/shared/domain/currency';

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

export function formatDateDDMMYYYY(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/**
 * Canonical Indian currency utilities (single-office, framework-free).
 *
 * Canonical home of `numberToWordsINR` / `formatINR`. Previously duplicated
 * across `gtr44/utils/gtr44Utils.ts`, `gtr30/services/gtr30Calc.service.ts`
 * (`numberToWords`), `shared/utilities/gujaratiFormat.ts` and ad-hoc
 * `formatInr()` locals. New code must import from here; the old paths
 * re-export these symbols for backward compatibility.
 */

/** Format an amount in Indian digit grouping with 2 decimals (e.g. 12,34,567.80). */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Legacy alias kept so existing `formatIndianCurrency` call sites keep working. */
export const formatIndianCurrency = formatINR;

/**
 * Convert an amount to statutory words ("Rupees ... Only") using the
 * Indian digit system (Thousand / Lakh / Crore), with Paise support.
 */
export function numberToWordsINR(amount: number | null | undefined): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + inWords(num % 100) : '');
    if (num < 100000) return inWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + inWords(num % 1000) : '');
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + inWords(num % 100000) : '');
    return inWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + inWords(num % 10000000) : '');
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let words = 'Rupees ' + inWords(integerPart);
  if (decimalPart > 0) {
    words += ' and ' + inWords(decimalPart) + ' Paise';
  }
  return words + ' Only';
}

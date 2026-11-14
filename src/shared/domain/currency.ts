/**
 * Canonical Indian currency utilities (single-office, framework-free).
 *
 * Canonical home of `numberToWordsINR` / `formatINR` / `integerToIndianWords`
 * and the whole-rupee `formatINRWhole` / grouped-integer `formatINRInteger`.
 * Previously duplicated across `gtr44/utils/gtr44Utils.ts` (re-export),
 * `gtr30/services/gtr30Calc.service.ts` (`numberToWords`, `formatMoney`),
 * `shared/utilities/gujaratiFormat.ts` and ad-hoc `formatInr()` locals.
 * Import from here directly.
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

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/**
 * Convert a non-negative integer to English words using the Indian digit
 * system (Thousand / Lakh / Crore). Returns '' for zero — callers decide on a
 * zero label. Shared by `numberToWordsINR` (currency words) and the GTR-30
 * statutory certificate helpers.
 */
export function integerToIndianWords(num: number): string {
  const n = Math.floor(Math.abs(num));

  function inWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ONES[num];
    if (num < 100) return TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ONES[num % 10] : '');
    if (num < 1000) return ONES[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + inWords(num % 100) : '');
    if (num < 100000) return inWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + inWords(num % 1000) : '');
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + inWords(num % 100000) : '');
    return inWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + inWords(num % 10000000) : '');
  }

  return inWords(n);
}

/**
 * Format an amount rounded to whole rupees in Indian digit grouping WITHOUT a
 * currency symbol (e.g. 12,34,568). `null`/`undefined`/`NaN` become 0.
 */
export function formatINRInteger(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  return Math.round(n).toLocaleString('en-IN');
}

/**
 * Format an amount rounded to whole rupees in Indian digit grouping with a ₹
 * prefix (e.g. ₹12,34,568). `null`/`undefined`/`NaN` become ₹0.
 */
export function formatINRWhole(amount: number | null | undefined): string {
  return `₹${formatINRInteger(amount)}`;
}

/**
 * Convert an amount to statutory words ("Rupees ... Only") using the
 * Indian digit system (Thousand / Lakh / Crore), with Paise support.
 */
export function numberToWordsINR(amount: number | null | undefined): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let words = 'Rupees ' + integerToIndianWords(integerPart);
  if (decimalPart > 0) {
    words += ' and ' + integerToIndianWords(decimalPart) + ' Paise';
  }
  return words + ' Only';
}

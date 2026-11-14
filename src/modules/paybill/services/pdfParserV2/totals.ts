import type { PayBillTotalRow, PayBillDeductionTotalRow } from '../../types';
import type { V2Section } from './types';
import { AMOUNT_RE } from './constants';
import { parseNum } from './numParse';
import { valueColumns } from './cells';

/**
 * Locate and parse the footer Total row for a section.
 */
export function totalsFor(section: V2Section, type: 'EARNING' | 'DEDUCTION'): unknown {
  const text = section.bodyLines.join('\n');
  const m = text.match(/Total\s+([0-9.,\s]+)/i);
  if (!m) return null;
  const numbers = m[1].match(AMOUNT_RE);
  if (!numbers) return null;
  const amounts = numbers.map(parseNum);
  const valueCols = valueColumns(section);
  if (type === 'EARNING') {
    const byCode = new Map<string, number>();
    const nValue = Math.max(0, amounts.length - 1);
    for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
      byCode.set(valueCols[k]?.code || `C${k}`, amounts[k] ?? 0);
    }
    const get = (c: string) => byCode.get(c) || 0;
    const basicIdx = valueCols.findIndex(
      (c) => (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
    );
    const specialIdx = valueCols.findIndex(
      (c, idx) =>
        idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
    );
    const basicPay =
      basicIdx >= 0 && basicIdx < nValue
        ? amounts[basicIdx] ?? 0
        : get('0101') || get('0102');
    const specialPay =
      specialIdx >= 0 && specialIdx < nValue
        ? amounts[specialIdx] ?? 0
        : 0;
    return {
      basicPay,
      da: get('0103'),
      hra: get('0110'),
      cla: get('0111'),
      medicalAllowance: get('0107'),
      transportAllowance: get('0113'),
      specialPay,
      washingAllowance: get('0132'),
      nonPrivatePracticeAllowance: get('0128'),
      otherAllowance: 0,
      grossAmount: amounts[amounts.length - 1] ?? 0,
    } as PayBillTotalRow;
  }
  const hasTotalCol = amounts.length >= valueCols.length + 2;
  const fieldCount = hasTotalCol ? valueCols.length : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
  const byCode = new Map<string, number>();
  for (let k = 0; k < fieldCount; k++) {
    const bc = valueCols[k]?.code || `C${k}`;
    byCode.set(bc, (byCode.get(bc) || 0) + (amounts[k] || 0));
  }
  const get = (c: string) => byCode.get(c) || 0;
  return {
    incomeTax: get('9510'),
    profTax: get('9570'),
    hbaInterest: get('9591'),
    gpfRegular: get('9670'),
    gpfClass4: get('9531'),
    npsRegular: get('9534'),
    gisGovtFund: get('9581'),
    gisGovtSaving: get('9582'),
    totalDeductions: hasTotalCol ? amounts[amounts.length - 2] || 0 : 0,
    netPay: amounts[amounts.length - 1] || 0,
  } as PayBillDeductionTotalRow;
}

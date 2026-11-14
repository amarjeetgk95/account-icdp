import type {
  PayBillEmployeeRow,
  PayBillTotalRow,
} from '../../types';
import type { DetectedColumns } from './types';
import { parseNum } from './numParse';

/**
 * Extract bottom summary / Total row from text and compare
 */
export function extractTotals(
  text: string,
  detectedCols?: DetectedColumns,
  _rows?: PayBillEmployeeRow[]
): PayBillTotalRow | null {
  const clean = text.replace(/\r\n/g, '\n');
  const totalLineMatch = clean.match(/Total\s+([0-9.,\s]+)/i);


  if (totalLineMatch && totalLineMatch[1]) {
    const numbers = totalLineMatch[1].match(/\b\d[\d,]*\.\d{2}\b/g) || totalLineMatch[1].match(/\b\d[\d,]*(?:\.\d+)?\b/g);
    if (numbers && numbers.length >= 7) {
      const amounts = numbers.map(parseNum);
      const len = amounts.length;

      let specialPay = 0;
      let washingAllowance = 0;
      let nonPrivatePracticeAllowance = 0;
      let otherAllowance = 0;

      const intermediateCount = len - 7;
      if (intermediateCount === 1) {
        const extra = amounts[6];
        if (detectedCols?.hasSpecialPay) specialPay = extra;
        else if (detectedCols?.hasWashing) washingAllowance = extra;
        else nonPrivatePracticeAllowance = extra;
      } else if (intermediateCount === 2) {
        specialPay = amounts[6];
        washingAllowance = amounts[7];
      } else if (intermediateCount >= 3) {
        specialPay = amounts[6];
        washingAllowance = amounts[7];
        nonPrivatePracticeAllowance = amounts[8];
        if (intermediateCount > 3) {
          otherAllowance = amounts.slice(9, len - 1).reduce((s, v) => s + v, 0);
        }
      }

      return {
        basicPay: amounts[0],
        da: amounts[1],
        hra: amounts[2],
        cla: amounts[3],
        medicalAllowance: amounts[4],
        transportAllowance: amounts[5],
        specialPay,
        washingAllowance,
        nonPrivatePracticeAllowance,
        otherAllowance,
        grossAmount: amounts[len - 1],
      };
    }
  }

  // Also check Rupees field e.g. "Rupees : 433194"
  const rupeesMatch = clean.match(/Rupees\s*:\s*([0-9.,]+)/i);
  if (rupeesMatch) {
    const gross = parseNum(rupeesMatch[1]);
    return {
      basicPay: 0,
      da: 0,
      hra: 0,
      cla: 0,
      medicalAllowance: 0,
      transportAllowance: 0,
      specialPay: 0,
      washingAllowance: 0,
      nonPrivatePracticeAllowance: 0,
      otherAllowance: 0,
      grossAmount: gross,
    };
  }

  return null;
}

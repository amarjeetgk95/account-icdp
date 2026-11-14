import type { DetectedColumns } from './types';

export interface PositionalEarningAmounts {
  basicPay: number;
  da: number;
  hra: number;
  cla: number;
  medicalAllowance: number;
  transportAllowance: number;
  specialPay: number;
  washingAllowance: number;
  nonPrivatePracticeAllowance: number;
  otherAllowance: number;
  grossAmount: number;
}

/**
 * Map left-to-right positional amounts of an earnings row to earning fields.
 * Full bills carry 7+ amounts (Basic, DA, HRA, CLA, Med, Trans, [Special,
 * Washing, NPP, ...], Gross). Minimal-column bills (e.g. a flat bill with
 * only Basic Pay + Gross Amt) carry fewer: the first amount is Basic Pay,
 * the last is Gross Amt, and any middle amounts map positionally
 * (same fallback as the text extraction path).
 */
export function mapPositionalEarningAmounts(
  amounts: number[],
  detectedCols?: DetectedColumns
): PositionalEarningAmounts {
  const empty: PositionalEarningAmounts = {
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
    grossAmount: 0,
  };
  if (!amounts || amounts.length === 0) return empty;

  if (amounts.length >= 7) {
    const len = amounts.length;
    const mapped: PositionalEarningAmounts = {
      ...empty,
      basicPay: amounts[0],
      da: amounts[1],
      hra: amounts[2],
      cla: amounts[3],
      medicalAllowance: amounts[4],
      transportAllowance: amounts[5],
      grossAmount: amounts[len - 1],
    };

    const intermediateCount = len - 7;
    if (intermediateCount === 1) {
      const extra = amounts[6];
      if (detectedCols?.hasSpecialPay) mapped.specialPay = extra;
      else if (detectedCols?.hasWashing) mapped.washingAllowance = extra;
      else mapped.nonPrivatePracticeAllowance = extra;
    } else if (intermediateCount === 2) {
      mapped.specialPay = amounts[6];
      mapped.washingAllowance = amounts[7];
    } else if (intermediateCount >= 3) {
      mapped.specialPay = amounts[6];
      mapped.washingAllowance = amounts[7];
      mapped.nonPrivatePracticeAllowance = amounts[8];
      if (intermediateCount > 3) {
        mapped.otherAllowance = amounts.slice(9, len - 1).reduce((s, v) => s + v, 0);
      }
    }
    return mapped;
  }

  // Minimal-column bill: first = Basic Pay, last = Gross Amt.
  const len = amounts.length;
  const mapped: PositionalEarningAmounts = {
    ...empty,
    basicPay: amounts[0],
    grossAmount: amounts[len - 1],
  };
  if (len >= 3) mapped.da = amounts[1];
  if (len >= 4) mapped.hra = amounts[2];
  if (len >= 5) mapped.cla = amounts[3];
  if (len >= 6) mapped.medicalAllowance = amounts[4];
  return mapped;
}

import { GTR44FormData, GTR44Deductions, GTR44Entry, GTR44ObjectExpenditureItem } from '../types';
import { numberToWordsINR } from '../utils/gtr44Utils';

export interface GTR44Totals {
  grossAmount: number;
  totalDeduction: number;
  netAmount: number;
  expenditureItemsTotal: number;
  balance: number;
  treasuryTotalRs: number;
  treasuryPayRs: number;
  treasuryPayRsWords: string;
  underRsAmount: number;
  passedForAmount: number;
  passedForAmountWords: string;
  agTotalAmount: number;
  agAdmittedAmount: number;
}

export function sumPartyEntries(entries: GTR44Entry[] | undefined): number {
  return (entries || []).reduce((sum, e) => sum + (e.amount || 0), 0);
}

export function sumExpenditureItems(items: GTR44ObjectExpenditureItem[] | undefined): number {
  return (items || []).reduce((sum, i) => sum + (i.amount || 0), 0);
}

export function getGrossAmount(
  formData: Pick<GTR44FormData, 'partyEntries' | 'expenditureItems'>
): number {
  const partyTotal = sumPartyEntries(formData.partyEntries);
  if (partyTotal > 0) return partyTotal;
  return sumExpenditureItems(formData.expenditureItems);
}

export function getIncomeTax(deductions: GTR44Deductions | undefined): number {
  if (!deductions) return 0;
  return (deductions.incomeTax || 0) + (deductions.tds9510 || 0);
}

export function getGstTotal(deductions: GTR44Deductions | undefined): number {
  if (!deductions) return 0;
  return deductions.gst || 0;
}

export function getTotalDeductions(deductions: GTR44Deductions | undefined): number {
  if (!deductions) return 0;
  return (
    getIncomeTax(deductions) +
    getGstTotal(deductions) +
    (deductions.surcharge9520 || 0) +
    (deductions.sd9600 || 0) +
    (deductions.misc9910 || 0)
  );
}

export function getNetDifference(grossAmount: number, totalDeduction: number): number {
  return grossAmount - totalDeduction;
}

export function getNetAmount(grossAmount: number, totalDeduction: number): number {
  return Math.max(0, getNetDifference(grossAmount, totalDeduction));
}

export function getBalance(budgetGrant: number | null | undefined, grossAmount: number): number {
  const grant = budgetGrant || 0;
  return Math.max(0, grant - grossAmount);
}

// Normalizes an EDP code so codes entered differently (spaces, case) still match:
// "1 3 0 4 +" -> "1304+", "1304+" -> "1304+"
export function normalizeEDPCode(code?: string | null): string {
  return (code || '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Computes the amount to display on Page 1 for every Object of Expenditure row.
 *
 * When voucher entries are present, each voucher's amount is placed under the row
 * whose EDP code matches the voucher's EDP code. Multiple vouchers sharing the same
 * EDP code are added together. Vouchers whose EDP code matches no row fall back to
 * the "Other Charges" row. When no vouchers exist (legacy bills), the amount entered
 * directly on the item row is used as-is.
 */
export function aggregateExpenditureByEDPCode(
  formData: Pick<GTR44FormData, 'partyEntries' | 'expenditureItems'>
): number[] {
  const items = formData.expenditureItems || [];
  const entries = formData.partyEntries || [];

  if (entries.length === 0) {
    return items.map((item) => item.amount || 0);
  }

  const amounts = items.map(() => 0);
  const rowKeys = items.map((item) => normalizeEDPCode(item.edpCode));

  const perCode = new Map<string, number>();
  entries.forEach((entry) => {
    const key = normalizeEDPCode(entry.edpCode);
    if (!key) return;
    perCode.set(key, (perCode.get(key) || 0) + (entry.amount || 0));
  });

  items.forEach((_, idx) => {
    const key = rowKeys[idx];
    if (key && perCode.has(key)) {
      amounts[idx] = perCode.get(key) || 0;
      perCode.delete(key);
    }
  });

  // Unmatched EDP codes roll into the "Other Charges" row so nothing is lost
  const unmatched = Array.from(perCode.values()).reduce((sum, v) => sum + v, 0);
  if (unmatched > 0) {
    const otherIdx = items.findIndex((item) => item.name.toLowerCase().includes('other charges'));
    if (otherIdx >= 0) amounts[otherIdx] += unmatched;
  }

  return amounts;
}

export function computeTotals(formData: GTR44FormData): GTR44Totals {
  const grossAmount = getGrossAmount(formData);
  const totalDeduction = getTotalDeductions(formData.deductions);
  const netAmount = getNetAmount(grossAmount, totalDeduction);
  const balance = getBalance(formData.budgetGrant, grossAmount);
  const wordsINR = numberToWordsINR(grossAmount);

  return {
    grossAmount,
    totalDeduction,
    netAmount,
    expenditureItemsTotal: sumExpenditureItems(formData.expenditureItems),
    balance,
    treasuryTotalRs: grossAmount,
    treasuryPayRs: netAmount,
    treasuryPayRsWords: numberToWordsINR(netAmount),
    underRsAmount: Math.ceil(grossAmount + 1),
    passedForAmount: grossAmount,
    passedForAmountWords: wordsINR,
    agTotalAmount: grossAmount,
    agAdmittedAmount: grossAmount,
  };
}

export function applyTotals(formData: GTR44FormData): GTR44FormData {
  const totals = computeTotals(formData);
  return {
    ...formData,
    expenditureIncludingBill: totals.grossAmount,
    balance: totals.balance,
    treasuryTotalRs: totals.treasuryTotalRs,
    treasuryPayRs: totals.treasuryPayRs,
    treasuryPayRsWords: totals.treasuryPayRsWords,
    underRsAmount: totals.underRsAmount,
    passedForAmount: totals.passedForAmount,
    passedForAmountWords: totals.passedForAmountWords,
    agTotalAmount: totals.agTotalAmount,
    agAdmittedAmount: totals.agAdmittedAmount,
  };
}

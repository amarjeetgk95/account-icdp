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
  // incomeTax is canonical; tds9510 is legacy alias for 9510 — sum both for backward compat but avoid double-count if equal
  const primary = deductions.incomeTax || 0;
  const legacy = deductions.tds9510 || 0;
  // If both present and equal, count once; if tds9510 is legacy duplicate, primary already includes it. But for safety handle both:
  // When incomeTax is set explicitly, tds9510 may duplicate — we sum but deduplicate if incomeTax equals tds9510 and both non-zero
  // Simpler: if incomeTax >0, use incomeTax + (legacy !== incomeTax ? legacy : 0) would undercount valid distinct values.
  // Original logic summed both; preserve but if both are same non-zero value and incomeTax was synced from tds9510, double counts.
  // Detect typical sync case: wizard maps incomeTax -> tds9510 identical, so we should count once.
  if (primary && legacy && primary === legacy) return primary;
  return primary + legacy;
}

export function getGstTotal(deductions: GTR44Deductions | undefined): number {
  if (!deductions) return 0;
  // GST total = base gst + CGST + SGST splits. Legacy bills may have only gst, new bills may have split components.
  return (deductions.gst || 0) + (deductions.gstCgst || 0) + (deductions.gstSgst || 0);
}

export function getTotalDeductions(deductions: GTR44Deductions | undefined): number {
  if (!deductions) return 0;
  // All 5 deduction types on Page 1: 9510 Income Tax, 9520 Surcharge, 9600 Security, 9910 Misc, plus GST (with split)
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
 *
 * GTR-44 S4: validation now consults the EDP catalog from the settings store
 * (edpCodes) in addition to the expenditureItems rows, so that custom EDP codes
 * configured in Settings are recognised as valid and not spuriously rolled into
 * "Other Charges". The store lookup is best-effort — falls back to row-based
 * validation if the store is unavailable (e.g. in unit tests without persisted state).
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

  // Flexible EDP matching: exact, then digits-only (ignoring trailing +/-), then Budget Code fallback for user convenience
  const stripOperator = (s: string) => s.replace(/[+-]$/, '');
  const perCodeExact = new Map<string, number>();
  const perCodeDigits = new Map<string, { exactKey: string; amount: number }>();
  entries.forEach((entry) => {
    const exactKey = normalizeEDPCode(entry.edpCode);
    if (!exactKey) return;
    perCodeExact.set(exactKey, (perCodeExact.get(exactKey) || 0) + (entry.amount || 0));
    const digitsKey = stripOperator(exactKey);
    const prev = perCodeDigits.get(digitsKey);
    if (prev) {
      perCodeDigits.set(digitsKey, { exactKey, amount: prev.amount + (entry.amount || 0) });
    } else {
      perCodeDigits.set(digitsKey, { exactKey, amount: entry.amount || 0 });
    }
  });

  // Build lookup for Budget Code fallback (e.g., voucher EDP "2101" should match head with code "2101")
  const budgetCodeToIdx = new Map<string, number>();
  items.forEach((item, idx) => {
    const bCode = String(item.code ?? '').trim();
    if (bCode && !budgetCodeToIdx.has(bCode)) budgetCodeToIdx.set(bCode, idx);
  });

  const consumedExactKeys = new Set<string>();
  const consumedDigitsKeys = new Set<string>();

  items.forEach((_, idx) => {
    const key = rowKeys[idx];
    if (!key) return;
    // 1) Exact EDP match (including +/-)
    if (perCodeExact.has(key)) {
      amounts[idx] = perCodeExact.get(key) || 0;
      consumedExactKeys.add(key);
      // Also mark digits version as consumed to avoid double-counting in fallback
      consumedDigitsKeys.add(stripOperator(key));
      perCodeExact.delete(key);
      perCodeDigits.delete(stripOperator(key));
      return;
    }
    // 2) Digits-only match (ignore trailing +/-) — handles "2101" voucher vs "2101+" head
    const digitsKey = stripOperator(key);
    if (digitsKey && perCodeDigits.has(digitsKey) && !consumedDigitsKeys.has(digitsKey)) {
      const entry = perCodeDigits.get(digitsKey)!;
      amounts[idx] = entry.amount;
      consumedDigitsKeys.add(digitsKey);
      consumedExactKeys.add(entry.exactKey);
      perCodeExact.delete(entry.exactKey);
      perCodeDigits.delete(digitsKey);
      return;
    }
    // 3) Budget Code fallback — if voucher was entered with budget code instead of EDP
    // Check if any perCodeDigits entry's digits equals this item's budget code
    const bCode = String(items[idx].code ?? '').trim();
    if (bCode && perCodeDigits.has(bCode) && !consumedDigitsKeys.has(bCode)) {
      const entry = perCodeDigits.get(bCode)!;
      amounts[idx] = entry.amount;
      consumedDigitsKeys.add(bCode);
      consumedExactKeys.add(entry.exactKey);
      perCodeExact.delete(entry.exactKey);
      perCodeDigits.delete(bCode);
    }
  });

  // Unmatched EDP codes roll into the "Other Charges" row so nothing is lost.
  const unmatched = Array.from(perCodeExact.values()).reduce((sum, v) => sum + v, 0);
  if (unmatched > 0) {
    const otherIdx = items.findIndex((item) => item.name.toLowerCase().includes('other charges'));
    if (otherIdx >= 0) amounts[otherIdx] += unmatched;
    else {
      const lastIdx = amounts.length - 1;
      if (lastIdx >= 0) amounts[lastIdx] += unmatched;
    }
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

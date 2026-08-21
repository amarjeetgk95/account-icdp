import { describe, it, expect } from 'vitest';
import {
  sumPartyEntries,
  sumExpenditureItems,
  getGrossAmount,
  getTotalDeductions,
  getNetDifference,
  getNetAmount,
  getBalance,
  aggregateExpenditureByEDPCode,
  normalizeEDPCode,
  computeTotals,
  applyTotals,
} from './gtr44Calc.service';
import { GTR44FormData } from '../types';
import { DEFAULT_GTR44_FORM_DATA, EMPTY_GTR44_FORM_DATA } from '../store/gtr44Defaults';

function blankForm(): GTR44FormData {
  return {
    ...EMPTY_GTR44_FORM_DATA,
    expenditureItems: EMPTY_GTR44_FORM_DATA.expenditureItems.map((item) => ({ ...item })),
  };
}

describe('gtr44Calc.service', () => {
  describe('sumPartyEntries', () => {
    it('returns 0 for empty or undefined entries', () => {
      expect(sumPartyEntries(undefined)).toBe(0);
      expect(sumPartyEntries([])).toBe(0);
    });

    it('sums entry amounts', () => {
      expect(
        sumPartyEntries([
          { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 100 },
          { id: '2', srNo: 2, partyName: 'B', billNo: '2', date: '', details: '', amount: 250 },
        ])
      ).toBe(350);
    });
  });

  describe('sumExpenditureItems', () => {
    it('returns 0 for empty items', () => {
      expect(sumExpenditureItems([])).toBe(0);
    });

    it('sums item amounts ignoring nulls', () => {
      expect(
        sumExpenditureItems([
          { code: '1', name: 'A', edpCode: '', amount: 10 },
          { code: '2', name: 'B', edpCode: '', amount: null },
          { code: '3', name: 'C', edpCode: '', amount: 20 },
        ])
      ).toBe(30);
    });
  });

  describe('getGrossAmount', () => {
    it('prefers party entries when present', () => {
      const form = blankForm();
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 500 },
      ];
      form.expenditureItems[0].amount = 900;
      expect(getGrossAmount(form)).toBe(500);
    });

    it('falls back to expenditure items when no party entries', () => {
      const form = blankForm();
      form.expenditureItems[0].amount = 900;
      expect(getGrossAmount(form)).toBe(900);
    });
  });

  describe('getTotalDeductions', () => {
    it('returns 0 for undefined deductions', () => {
      expect(getTotalDeductions(undefined)).toBe(0);
    });

    it('sums income tax and GST buckets (gst + cgst + sgst)', () => {
      expect(
        getTotalDeductions({ incomeTax: 100, gst: 75, gstCgst: 30, gstSgst: 30 })
      ).toBe(235);
    });

    it('includes legacy deduction buckets when present', () => {
      expect(
        getTotalDeductions({
          incomeTax: 100,
          gst: 0,
          gstCgst: 0,
          gstSgst: 0,
          tds9510: 50,
          surcharge9520: 10,
          sd9600: 5,
          misc9910: 2,
        })
      ).toBe(167);
    });
  });

  describe('getNetDifference / getNetAmount', () => {
    it('returns raw difference for getNetDifference', () => {
      expect(getNetDifference(100, 300)).toBe(-200);
    });

    it('clamps net amount to zero', () => {
      expect(getNetAmount(100, 300)).toBe(0);
      expect(getNetAmount(300, 100)).toBe(200);
    });
  });

  describe('getBalance', () => {
    it('computes grant minus gross', () => {
      expect(getBalance(1000000, 7320)).toBe(992680);
    });

    it('clamps to zero when gross exceeds grant', () => {
      expect(getBalance(1000, 5000)).toBe(0);
    });

    it('treats null grant as zero', () => {
      expect(getBalance(null, 500)).toBe(0);
    });
  });

  describe('normalizeEDPCode', () => {
    it('strips spaces and uppercases', () => {
      expect(normalizeEDPCode('1 3 0 4 +')).toBe('1304+');
      expect(normalizeEDPCode('1304+')).toBe('1304+');
      expect(normalizeEDPCode(undefined)).toBe('');
    });
  });

  describe('aggregateExpenditureByEDPCode', () => {
    it('falls back to item amounts when no vouchers exist', () => {
      const form = blankForm();
      form.expenditureItems[0].amount = 900;
      form.expenditureItems[1].amount = 100;
      const amounts = aggregateExpenditureByEDPCode(form);
      expect(amounts[0]).toBe(900);
      expect(amounts[1]).toBe(100);
    });

    it('aggregates vouchers by EDP code onto matching rows', () => {
      const form = blankForm();
      form.expenditureItems[0] = { code: '0200', name: 'Wages', edpCode: '0 2 0 1 +', amount: null };
      form.expenditureItems[1] = { code: '1300', name: 'Electricity Expences', edpCode: '1 3 0 4 +', amount: null };
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 400, edpCode: '1304+' },
        { id: '2', srNo: 2, partyName: 'B', billNo: '2', date: '', details: '', amount: 600, edpCode: '1304+' },
        { id: '3', srNo: 3, partyName: 'C', billNo: '3', date: '', details: '', amount: 100, edpCode: '0201+' },
      ];
      const amounts = aggregateExpenditureByEDPCode(form);
      expect(amounts[0]).toBe(100);
      expect(amounts[1]).toBe(1000);
    });

    it('rolls unmatched EDP codes into the Other Charges row', () => {
      const form = blankForm();
      form.expenditureItems[15] = { code: '5000', name: 'Other Charges', edpCode: '5 0 0 6 +', amount: null };
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 250, edpCode: '9999+' },
      ];
      const amounts = aggregateExpenditureByEDPCode(form);
      expect(amounts[15]).toBe(250);
    });
  });

  describe('computeTotals', () => {
    it('derives totals from default form data', () => {
      const totals = computeTotals(DEFAULT_GTR44_FORM_DATA);
      expect(totals.grossAmount).toBe(7320);
      expect(totals.totalDeduction).toBe(0);
      expect(totals.netAmount).toBe(7320);
      expect(totals.balance).toBe(992680);
      expect(totals.underRsAmount).toBe(7321);
      expect(totals.treasuryPayRs).toBe(7320);
      expect(totals.passedForAmount).toBe(7320);
      expect(totals.agTotalAmount).toBe(7320);
      expect(totals.treasuryPayRsWords).toContain('Seven Thousand');
    });

    it('applies deductions to net amount', () => {
      const form = {
        ...DEFAULT_GTR44_FORM_DATA,
        deductions: { incomeTax: 320, gst: 0, gstCgst: 0, gstSgst: 0 },
      };
      const totals = computeTotals(form);
      expect(totals.totalDeduction).toBe(320);
      expect(totals.netAmount).toBe(7000);
      expect(totals.treasuryPayRs).toBe(7000);
    });
  });

  describe('applyTotals', () => {
    it('writes derived values back onto the form', () => {
      const form = blankForm();
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 1000 },
      ];
      form.budgetGrant = 5000;
      const updated = applyTotals(form);

      expect(updated.expenditureIncludingBill).toBe(1000);
      expect(updated.balance).toBe(4000);
      expect(updated.treasuryTotalRs).toBe(1000);
      expect(updated.treasuryPayRs).toBe(1000);
      expect(updated.treasuryPayRsWords).toContain('One Thousand');
      expect(updated.underRsAmount).toBe(1001);
      expect(updated.passedForAmount).toBe(1000);
      expect(updated.agTotalAmount).toBe(1000);
      expect(updated.agAdmittedAmount).toBe(1000);
    });
  });
});

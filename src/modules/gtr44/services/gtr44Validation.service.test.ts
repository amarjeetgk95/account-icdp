import { describe, it, expect } from 'vitest';
import { validatePartyEntry, validateStep, validateBill } from './gtr44Validation.service';
import { GTR44FormData } from '../types';
import { EMPTY_GTR44_FORM_DATA } from '../store/gtr44Defaults';

function blankForm(): GTR44FormData {
  return {
    ...EMPTY_GTR44_FORM_DATA,
    expenditureItems: EMPTY_GTR44_FORM_DATA.expenditureItems.map((item) => ({ ...item })),
    partyEntries: [],
  };
}

describe('gtr44Validation.service', () => {
  describe('validatePartyEntry', () => {
    it('rejects empty party name', () => {
      const result = validatePartyEntry({
        partyName: '  ',
        billNo: '1',
        date: '',
        details: '',
        amount: 100,
        edpCode: '1304+',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Party Name');
    });

    it('rejects empty bill number', () => {
      const result = validatePartyEntry({
        partyName: 'Acme',
        billNo: '',
        date: '',
        details: '',
        amount: 100,
        edpCode: '1304+',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bill No');
    });

    it('rejects non-positive amount', () => {
      const result = validatePartyEntry({
        partyName: 'Acme',
        billNo: '1',
        date: '',
        details: '',
        amount: 0,
        edpCode: '1304+',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount');
    });

    it('rejects a missing EDP Code', () => {
      const result = validatePartyEntry({
        partyName: 'Acme',
        billNo: '1',
        date: '',
        details: '',
        amount: 100,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('EDP Code');
    });

    it('accepts a valid entry', () => {
      const result = validatePartyEntry({
        partyName: 'Acme',
        billNo: '1',
        date: '2026-01-01',
        details: 'Office supplies',
        amount: 500,
        edpCode: '1301+',
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateStep', () => {
    it('requires at least one voucher entry', () => {
      const form = blankForm();
      form.partyEntries = [];
      const errors = validateStep(form, 'vouchers');
      expect(errors['partyEntries']).toBeDefined();
    });

    it('flags vouchers missing an EDP Code', () => {
      const form = blankForm();
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 1000 },
      ];
      const errors = validateStep(form, 'vouchers');
      expect(errors['partyEntries.0.edpCode']).toBeDefined();
    });

    it('accepts vouchers with EDP Codes', () => {
      const form = blankForm();
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 1000, edpCode: '1304+' },
      ];
      expect(validateStep(form, 'vouchers')['partyEntries']).toBeUndefined();
    });

    it('requires a Budget Head selection', () => {
      const form = blankForm();
      const errors = validateStep(form, 'budgetHead');
      expect(errors['budgetHeadId']).toBeDefined();
    });

    it('accepts a selected Budget Head', () => {
      const form = blankForm();
      form.budgetHeadId = 'bh-1';
      form.headChargeableCode = '240300102050';
      expect(validateStep(form, 'budgetHead')['budgetHeadId']).toBeUndefined();
    });

    it('flags negative net amount from excessive deductions', () => {
      const form = blankForm();
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 1000, edpCode: '1304+' },
      ];
      form.deductions = { incomeTax: 5000, gst: 0, gstCgst: 0, gstSgst: 0 };
      const errors = validateStep(form, 'deductions');
      expect(errors['netAmount']).toBeDefined();
    });

    it('returns no errors for a valid deductions step', () => {
      const form = blankForm();
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 1000, edpCode: '1304+' },
      ];
      expect(validateStep(form, 'deductions')['netAmount']).toBeUndefined();
    });
  });

  describe('validateBill', () => {
    it('aggregates errors across all required steps', () => {
      const form = blankForm();
      const errors = validateBill(form);
      expect(Object.keys(errors).length).toBeGreaterThanOrEqual(2);
      expect(errors['partyEntries']).toBeDefined();
      expect(errors['budgetHeadId']).toBeDefined();
    });

    it('passes a fully valid bill', () => {
      const form = blankForm();
      form.budgetHeadId = 'bh-1';
      form.headChargeableCode = '240300102050';
      form.partyEntries = [
        { id: '1', srNo: 1, partyName: 'A', billNo: '1', date: '', details: '', amount: 5000, edpCode: '1304+' },
      ];
      expect(validateBill(form)).toEqual({});
    });
  });
});

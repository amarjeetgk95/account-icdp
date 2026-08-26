import { describe, it, expect } from 'vitest';
import { entryToSubVoucher, subVoucherToEntry, formDataToBill } from './gtr44Mapping.service';
import { GTR44Entry, SubVoucher } from '../types';
import { DEFAULT_GTR44_FORM_DATA } from '../store/gtr44Defaults';

const entry: GTR44Entry = {
  id: 'e1',
  srNo: 1,
  subVoucherNo: 'SV-001',
  partyName: 'Torrent Power Ltd.',
  billNo: '3003436383',
  date: '2026-07-20',
  details: 'Electricity charges',
  amount: 7320,
  sanctionOrderNo: 'SO-1',
  sanctionDate: '2026-07-10',
  edpCode: '1304+',
};

describe('gtr44Mapping.service', () => {
  describe('entryToSubVoucher', () => {
    it('maps a party entry to a persisted sub-voucher', () => {
      const sv = entryToSubVoucher(entry, 0);
      expect(sv).toEqual({
        id: 'e1',
        subVoucherNo: 'SV-001',
        payeeName: 'Torrent Power Ltd.',
        description: 'Electricity charges',
        sanctionOrderNo: 'SO-1',
        sanctionDate: '2026-07-10',
        amount: 7320,
        edpCode: '1304+',
      });
    });

    it('defaults sub-voucher number from index', () => {
      const sv = entryToSubVoucher({ ...entry, subVoucherNo: undefined }, 3);
      expect(sv.subVoucherNo).toBe('4');
    });
  });

  describe('subVoucherToEntry', () => {
    it('maps a persisted sub-voucher back to a party entry', () => {
      const sv: SubVoucher = {
        id: 'e1',
        subVoucherNo: 'SV-001',
        payeeName: 'Torrent Power Ltd.',
        description: 'Electricity charges',
        sanctionOrderNo: 'SO-1',
        sanctionDate: '2026-07-10',
        amount: 7320,
        edpCode: '1304+',
      };
      const e = subVoucherToEntry(sv, 0);
      expect(e.id).toBe('e1');
      expect(e.srNo).toBe(1);
      expect(e.partyName).toBe('Torrent Power Ltd.');
      expect(e.billNo).toBe('SO-1');
      expect(e.amount).toBe(7320);
      expect(e.sanctionOrderNo).toBe('SO-1');
      expect(e.edpCode).toBe('1304+');
    });

    it('is reversible through both mappers', () => {
      const sv = entryToSubVoucher(entry, 0);
      const back = subVoucherToEntry(sv, 0);
      expect(back.partyName).toBe(entry.partyName);
      expect(back.details).toBe(entry.details);
      expect(back.amount).toBe(entry.amount);
      expect(back.subVoucherNo).toBe(entry.subVoucherNo);
      expect(back.edpCode).toBe(entry.edpCode);
    });
  });

  describe('formDataToBill', () => {
    it('maps default form data into a bill draft', () => {
      const bill = formDataToBill(DEFAULT_GTR44_FORM_DATA);
      expect(bill.billNo).toBe('104');
      expect(bill.officeName).toBe('Intensive Cattle Development Programme (ICDP), Surat');
      expect(bill.fy).toBe(2026);
      expect(bill.month).toBe('July 2026');
      expect(bill.district).toBe('66');
      expect(bill.grossAmount).toBe(7320);
      expect(bill.totalDeduction).toBe(0);
      expect(bill.netAmount).toBe(7320);
      expect(bill.status).toBe('draft');
      expect(bill.subVouchers).toHaveLength(1);
      expect(bill.subVouchers?.[0].payeeName).toBe('Torrent Power Ltd.');
      expect(bill.deductions).toHaveLength(2);
      expect(bill.deductions?.[0].code).toBe('9510');
      expect(bill.deductions?.[1].code).toBe('GST');
      expect(bill.edpCode).toBe('1304+');
      expect(bill.formData).toBe(DEFAULT_GTR44_FORM_DATA);
    });

    it('reflects income tax and GST deductions in net amount (gst + cgst + sgst)', () => {
      const form = {
        ...DEFAULT_GTR44_FORM_DATA,
        deductions: { incomeTax: 320, gst: 180, gstCgst: 90, gstSgst: 90 },
      };
      const bill = formDataToBill(form);
      expect(bill.totalDeduction).toBe(680);
      expect(bill.netAmount).toBe(6640);
      expect(bill.deductions?.[0]).toEqual({ code: '9510', label: 'Income Tax', amount: 320 });
      expect(bill.deductions?.[1]).toEqual({ code: 'GST', label: 'GST', amount: 360 });
    });
  });
});

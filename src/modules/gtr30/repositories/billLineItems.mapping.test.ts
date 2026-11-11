import { describe, expect, it, vi } from 'vitest';

// Network-free: repositories import the supabase client at module load, so mock it.
vi.mock('@/core/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { mapGtr30BillToLines } from './billRegister.repository';
import {
  mapGtr44BillToExpenditureLines,
  mapGtr44BillToSubVouchers,
} from '../../gtr44/repositories/gtr44BillsBackend.repository';
import type { GTR30Bill, GTR30Employee } from '../types';
import type { GTR44Bill } from '../../gtr44/types';

const gtr30Employee = (overrides: Record<string, unknown> = {}): GTR30Employee =>
  ({
    id: 'e1',
    srNo: 1,
    name: 'Test Employee',
    hrpnNo: 'HRPN-1',
    payOfOfficer: 10000,
    da: 2000,
    incomeTax: 500,
    ...overrides,
  }) as unknown as GTR30Employee;

const gtr30Bill = (employees: GTR30Employee[]): GTR30Bill =>
  ({ id: 'bill-1', employees }) as unknown as GTR30Bill;

describe('053 line-mapping pure logic', () => {
  it('maps GTR-30 employees via earningsTotal/deductionsTotal (net = gross - deductions)', () => {
    const lines = mapGtr30BillToLines(gtr30Bill([gtr30Employee()]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      bill_id: 'bill-1',
      hrpn: 'HRPN-1',
      employee_name: 'Test Employee',
      gross: 12000,
      deductions: 500,
      net: 11500,
    });
  });

  it('tolerates legacy GTR-30 key variants and blanks', () => {
    const emp = gtr30Employee({ hrpnNo: undefined, name: undefined });
    const rec = emp as unknown as Record<string, unknown>;
    rec.hrpn_no = '  X-9  ';
    rec.employeeName = 'Fallback Name';
    const lines = mapGtr30BillToLines(gtr30Bill([emp]));
    expect(lines[0].hrpn).toBe('X-9');
    expect(lines[0].employee_name).toBe('Fallback Name');
  });

  it('maps blank hrpn to null and empty bill to no lines', () => {
    const lines = mapGtr30BillToLines(gtr30Bill([gtr30Employee({ hrpnNo: '' })]));
    expect(lines[0].hrpn).toBeNull();
    expect(mapGtr30BillToLines(gtr30Bill([]))).toEqual([]);
  });

  it('maps GTR-44 expenditure items tolerantly (null/bad amounts -> 0)', () => {
    const bill = {
      id: 'g44-1',
      formData: {
        expenditureItems: [
          { code: '0200', name: 'Wages', edpCode: '0201+', amount: 900 },
          { item_code: '1300', label: 'Electricity', amount: null },
          { amount: 'not-a-number' },
        ],
        partyEntries: [],
      },
    } as unknown as GTR44Bill;
    expect(mapGtr44BillToExpenditureLines(bill)).toEqual([
      { bill_id: 'g44-1', item_code: '0200', label: 'Wages', amount: 900 },
      { bill_id: 'g44-1', item_code: '1300', label: 'Electricity', amount: 0 },
      { bill_id: 'g44-1', item_code: null, label: '', amount: 0 },
    ]);
  });

  it('maps GTR-44 party entries tolerantly (snake_case + srNo fallback)', () => {
    const bill = {
      id: 'g44-2',
      formData: {
        expenditureItems: [],
        partyEntries: [
          { srNo: 1, subVoucherNo: 'SV-1', partyName: 'ABC', details: 'Work', amount: 1500, edpCode: '0201+' },
          { srNo: 2, sub_voucher_no: 'SV-2', party_name: 'XYZ', description: 'Desc', amount: '200', edp_code: '1304+' },
          { srNo: 7, partyName: 'P', details: '', amount: 0 },
        ],
      },
    } as unknown as GTR44Bill;
    expect(mapGtr44BillToSubVouchers(bill)).toEqual([
      { bill_id: 'g44-2', sub_voucher_no: 'SV-1', payee_name: 'ABC', description: 'Work', amount: 1500, edp_code: '0201+' },
      { bill_id: 'g44-2', sub_voucher_no: 'SV-2', payee_name: 'XYZ', description: 'Desc', amount: 200, edp_code: '1304+' },
      { bill_id: 'g44-2', sub_voucher_no: '7', payee_name: 'P', description: '', amount: 0, edp_code: null },
    ]);
  });
});

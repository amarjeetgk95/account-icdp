import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taxReconciliationRepository } from './taxReconciliation.repository';
import { supabase } from '@/core/supabase/client';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/modules/paybill/repositories/paybill.repository', () => ({
  paybillRepository: {
    listDeductions: vi.fn().mockResolvedValue([]),
    listEarnings: vi.fn().mockResolvedValue([]),
    getManualLedgerValues: vi.fn().mockResolvedValue({}),
  },
}));

describe('taxReconciliationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuarterRawData', () => {
    const chainableOrder = (data: unknown, error: unknown = null) => {
      const second = vi.fn().mockResolvedValue({ data, error });
      const first = Object.assign(Promise.resolve({ data, error }), {
        order: second,
      });
      return vi.fn().mockReturnValue(first);
    };
    it('queries Supabase for employees, salaries, deductions, and earnings', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = chainableOrder([]);

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'employees' || table === 'establishment_employees') {
          return {
            select: mockSelect,
            eq: mockEq,
            order: mockOrder,
          };
        }
        return {
          select: mockSelect,
          eq: mockEq,
          in: mockIn,
        };
      });

      const result = await taxReconciliationRepository.getQuarterRawData('Q1', 2025);

      expect(supabase.from).toHaveBeenCalledWith('establishment_employees');
      expect(supabase.from).toHaveBeenCalledWith('employees');
      expect(supabase.from).toHaveBeenCalledWith('employee_salaries');
      expect(supabase.from).toHaveBeenCalledWith('paybill_employee_deductions');
      expect(supabase.from).toHaveBeenCalledWith('paybill_employee_earnings');
      expect(result.quarter).toBe('Q1');
      expect(result.fy).toBe(2025);
      // Payroll uses PAYMENT months, Paybill uses WORK months (off-by-one fix)
      expect(result.months).toEqual(['April', 'May', 'June']);
      expect(result.paybillMonths).toEqual(['March', 'April', 'May']);
    });

    it('queries Paybill with WORK months and Payroll with PAYMENT months', async () => {
      const inCalls: Array<{ table: string; col: string; vals: string[] }> = [];
      const mockChain = (table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: chainableOrder([]),
        in: vi.fn((col: string, vals: string[]) => {
          inCalls.push({ table, col, vals });
          return { data: [], error: null };
        }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'employees' || table === 'establishment_employees') {
          return {
            select: vi.fn().mockReturnThis(),
            order: chainableOrder([]),
          };
        }
        return mockChain(table);
      });

      await taxReconciliationRepository.getQuarterRawData('Q1', 2026);

      const salaryCall = inCalls.find((c) => c.table === 'employee_salaries');
      const dedCall = inCalls.find((c) => c.table === 'paybill_employee_deductions');
      const earnCall = inCalls.find((c) => c.table === 'paybill_employee_earnings');

      // Payroll (payment months)
      expect(salaryCall?.vals).toEqual(['April', 'May', 'June']);
      // Paybill (work months)
      expect(dedCall?.vals).toEqual(['March', 'April', 'May']);
      expect(earnCall?.vals).toEqual(['March', 'April', 'May']);
    });
  });

  describe('canonical roster merge', () => {
    const chainFor = (data: unknown) => {
      const orderSecond = vi.fn().mockResolvedValue({ data, error: null });
      const orderFirst = Object.assign(Promise.resolve({ data, error: null }), {
        order: orderSecond,
      });
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderFirst),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    };

    it('merges ledger HRPN onto the linked legacy row (Solanki: ledger 20105451 + legacy blank HRPN, same PAN)', async () => {
      const estRows = [
        {
          id: 'est-uuid-1',
          hrpn_no: '20105451',
          name: 'Smt. S.V.Solanki',
          pan: 'AKPPS2419E',
          designation: 'Office Superintendent',
          join_date: '2026-03-01',
          transfer_date: '2026-06-22',
        },
      ];
      const legRows = [
        {
          id: 7,
          hprn_no: null,
          name: 'Smt. S.V.Solanki',
          pan: 'AKPPS2419E',
          designation: null,
          join_date: null,
          transfer_date: null,
        },
      ];
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'establishment_employees') return chainFor(estRows);
        if (table === 'employees') return chainFor(legRows);
        return chainFor([]);
      });

      const result = await taxReconciliationRepository.getQuarterRawData('Q1', 2026);

      // One canonical person: ledger HRPN wins, salary key stays the legacy id.
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0]).toMatchObject({
        id: '7',
        hprn_no: '20105451',
        name: 'Smt. S.V.Solanki',
        transfer_date: '2026-06-22',
      });
    });

    it('links split records by exact name when HRPN and PAN both fail (Makwana: ledger HRPN/PAN blank + legacy PAN/HRPN blank)', async () => {
      const estRows = [
        {
          id: 'est-uuid-2',
          hrpn_no: '20138092',
          name: 'Shri R.B.Makwana',
          pan: null,
          designation: 'Research Assistant',
          join_date: '2026-03-01',
          transfer_date: null,
        },
      ];
      const legRows = [
        {
          id: 14,
          hprn_no: null,
          name: 'Shri R.B.Makwana',
          pan: 'ANIPM7821N',
          designation: null,
          join_date: null,
          transfer_date: null,
        },
      ];
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'establishment_employees') return chainFor(estRows);
        if (table === 'employees') return chainFor(legRows);
        return chainFor([]);
      });

      const result = await taxReconciliationRepository.getQuarterRawData('Q1', 2026);

      // Single merged person: ledger HRPN + legacy PAN + legacy salary key.
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0]).toMatchObject({
        id: '14',
        hprn_no: '20138092',
        pan: 'ANIPM7821N',
      });
    });

    it('falls back to legacy employees when the ledger is unavailable', async () => {
      const legRows = [
        { id: 7, hprn_no: null, name: 'Smt. S.V.Solanki', pan: 'AKPPS2419E', designation: null, join_date: null, transfer_date: null },
      ];
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'establishment_employees') {
          const second = vi.fn().mockResolvedValue({ data: null, error: new Error('down') });
          const first = Object.assign(Promise.resolve({ data: null, error: new Error('down') }), {
            order: second,
          });
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnValue(first),
          };
        }
        if (table === 'employees') return chainFor(legRows);
        return chainFor([]);
      });

      const result = await taxReconciliationRepository.getQuarterRawData('Q1', 2026);

      expect(result.employees).toHaveLength(1);
      expect(result.employees[0]).toMatchObject({ id: 7, hprn_no: null });
    });
  });

  describe('syncPaybillValuesToPayroll', () => {
    it('returns 0 when records array is empty', async () => {
      const result = await taxReconciliationRepository.syncPaybillValuesToPayroll([], 2025);
      expect(result).toBe(0);
    });

    it('calls upsert with formatted records and writes audit log', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'tax_recon_sync_log') {
          return { insert: mockInsert };
        }
        return { upsert: mockUpsert };
      });

      const records = [
        { employeeId: 'emp-1', hrpn: '2001001', month: 'April', gross: 50000, da: 10000, tax: 5000, old_gross: 40000, old_tax: 4000 },
      ];

      const result = await taxReconciliationRepository.syncPaybillValuesToPayroll(records, 2025, 'Q1');

      expect(supabase.from).toHaveBeenCalledWith('employee_salaries');
      expect(mockUpsert).toHaveBeenCalledWith(
        [
          {
            employee_id: 'emp-1',
            financial_year: 2025,
            month: 'April',
            gross: 50000,
            da: 10000,
            tax: 5000,
            pay_diff: 0,
            da_diff: 0,
            arrears_tax: 0,
          },
        ],
        { onConflict: 'employee_id,financial_year,month' }
      );
      expect(supabase.from).toHaveBeenCalledWith('tax_recon_sync_log');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          financial_year: 2025,
          quarter: 'Q1',
          month: 'April',
          employee_id: 'emp-1',
          hrpn: '2001001',
          new_gross: 50000,
          new_da: 10000,
          new_tax: 5000,
        }),
      ]);
      expect(result).toBe(1);
    });
  });
});

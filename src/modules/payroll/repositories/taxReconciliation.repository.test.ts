import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taxReconciliationRepository } from './taxReconciliation.repository';
import { supabase } from '@/core/supabase/client';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/shared/utilities/office', () => ({
  getOfficeScope: vi.fn(),
  requireOfficeId: vi.fn(),
}));

vi.mock('@/modules/paybill/repositories/paybill.repository', () => ({
  paybillRepository: {
    listDeductions: vi.fn().mockResolvedValue([]),
    listEarnings: vi.fn().mockResolvedValue([]),
  },
}));

describe('taxReconciliationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuarterRawData', () => {
    it('throws error when no office is selected', async () => {
      (getOfficeScope as ReturnType<typeof vi.fn>).mockReturnValue({ all: false, officeId: null });

      await expect(
        taxReconciliationRepository.getQuarterRawData('Q1', 2025)
      ).rejects.toThrow('No office selected');
    });

    it('queries Supabase for employees, salaries, deductions, and earnings', async () => {
      (getOfficeScope as ReturnType<typeof vi.fn>).mockReturnValue({ all: false, officeId: 'office-123' });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'employees') {
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

      const result = await taxReconciliationRepository.getQuarterRawData('Q1', 2025, 'office-123');

      expect(supabase.from).toHaveBeenCalledWith('employees');
      expect(supabase.from).toHaveBeenCalledWith('employee_salaries');
      expect(supabase.from).toHaveBeenCalledWith('paybill_employee_deductions');
      expect(supabase.from).toHaveBeenCalledWith('paybill_employee_earnings');
      expect(result.quarter).toBe('Q1');
      expect(result.fy).toBe(2025);
      expect(result.months).toEqual(['April', 'May', 'June']);
    });
  });

  describe('syncPaybillValuesToPayroll', () => {
    it('returns 0 when records array is empty', async () => {
      const result = await taxReconciliationRepository.syncPaybillValuesToPayroll([], 2025);
      expect(result).toBe(0);
    });

    it('calls upsert with formatted records', async () => {
      (requireOfficeId as ReturnType<typeof vi.fn>).mockReturnValue('office-123');

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        upsert: mockUpsert,
      });

      const records = [
        { employeeId: 'emp-1', month: 'April', gross: 50000, da: 10000, tax: 5000 },
      ];

      const result = await taxReconciliationRepository.syncPaybillValuesToPayroll(records, 2025);

      expect(supabase.from).toHaveBeenCalledWith('employee_salaries');
      expect(mockUpsert).toHaveBeenCalledWith(
        [
          {
            employee_id: 'emp-1',
            office_id: 'office-123',
            financial_year: 2025,
            month: 'April',
            gross: 50000,
            da: 10000,
            tax: 5000,
          },
        ],
        { onConflict: 'employee_id,financial_year,month' }
      );
      expect(result).toBe(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salaryRepository } from './salary.repository';
import { supabase } from '@/core/supabase/client';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: {
    getState: () => ({ user: { officeId: 'test-office-123' } }),
  },
}));

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: {
    getState: () => ({ activeOfficeId: 'test-office-123' }),
  },
}));

describe('salaryRepository.getEmployeeLookupDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates employee info, Q1-Q4 quarters, DA, Other allowances and monthly salaries', async () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        name: 'John Doe',
        pan: 'ABCDE1234F',
        hprn_no: 'H1001',
        join_date: '2023-04-01',
        transfer_date: null,
        budget_head_id: 'bh-1',
      },
    ];

    const mockBudgetHead = { code: '2071', name: 'Salaries & Wages' };

    const mockManualSalaries = [
      { month: 'April', gross: 50000, da: 10000, tax: 5000 },
      { month: 'May', gross: 50000, da: 10000, tax: 5000 },
      { month: 'June', gross: 50000, da: 10000, tax: 5000 },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === 'employees') {
        return {
          select: () => ({
            eq: () => ({
              or: vi.fn().mockResolvedValue({ data: mockEmployees, error: null }),
              ilike: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockEmployees[0], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'budget_heads') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBudgetHead, error: null }),
            }),
          }),
        };
      }
      if (table === 'employee_salaries') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: vi.fn().mockResolvedValue({ data: mockManualSalaries, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'employee_salary') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                or: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
              ilike: () => ({
                eq: () => ({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const result = await salaryRepository.getEmployeeLookupDetails('H1001', 2025);

    expect(result.employeeInfo).toEqual({
      id: 'emp-1',
      name: 'John Doe',
      pan: 'ABCDE1234F',
      hprnNo: 'H1001',
      joinDate: '2023-04-01',
      transferDate: null,
      budgetHeadCode: '2071',
      budgetHeadName: 'Salaries & Wages',
      isRegisteredInMaster: true,
    });

    expect(result.quarters.Q1).toEqual({
      gross: 150000,
      daAndOther: 30000,
      totalGross: 180000,
      tax: 15000,
      net: 165000,
      monthsWithData: 3,
    });

    expect(result.totals.totalGross).toBe(180000);
    expect(result.totals.daAndOther).toBe(30000);
    expect(result.totals.tax).toBe(15000);
  });
});

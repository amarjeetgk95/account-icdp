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
    getState: () => ({ user: { id: 'user-1' } }),
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

    // Canonical register row for the same person (Establishment-first).
    const mockCanonical = [
      {
        id: 'est-1',
        name: 'John Doe',
        pan: 'ABCDE1234F',
        hrpn_no: 'H1001',
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
      if (table === 'establishment_employees') {
        return {
          select: () => ({
            or: vi.fn().mockResolvedValue({ data: mockCanonical, error: null }),
          }),
        };
      }
      if (table === 'employees') {
        return {
          select: () => ({
            or: vi.fn().mockResolvedValue({ data: mockEmployees, error: null }),
            ilike: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockEmployees[0], error: null }),
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
            eq: vi.fn().mockImplementation(() => ({
              or: vi.fn().mockResolvedValue({ data: mockManualSalaries, error: null }),
            })),
          }),
        };
      }
      if (table === 'employee_salary') {
        return {
          select: () => ({
            eq: vi.fn().mockImplementation(() => ({
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            ilike: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
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

  it('resolves identity from Establishment when no legacy payroll row exists', async () => {
    const mockCanonicalOnly = [
      {
        id: 'est-9',
        name: 'Jane Smith',
        pan: 'XYZAB1234C',
        hrpn_no: 'H9009',
        join_date: '2024-04-01',
        transfer_date: null,
        budget_head_id: null,
      },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === 'establishment_employees') {
        return {
          select: () => ({
            or: vi.fn().mockResolvedValue({ data: mockCanonicalOnly, error: null }),
          }),
        };
      }
      if (table === 'employees') {
        return {
          select: () => ({
            or: vi.fn().mockResolvedValue({ data: [], error: null }),
            ilike: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'budget_heads') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'employee_salaries') {
        return {
          select: () => ({
            eq: vi.fn().mockImplementation(() => ({
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          }),
        };
      }
      if (table === 'employee_salary') {
        return {
          select: () => ({
            eq: vi.fn().mockImplementation(() => ({
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            ilike: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const result = await salaryRepository.getEmployeeLookupDetails('H9009', 2025);

    expect(result.employeeInfo).toMatchObject({
      name: 'Jane Smith',
      pan: 'XYZAB1234C',
      hprnNo: 'H9009',
      isRegisteredInMaster: true,
    });
    expect(result.matchingEmployees).toHaveLength(1);
    expect(result.totals.totalGross).toBe(0);
  });
});

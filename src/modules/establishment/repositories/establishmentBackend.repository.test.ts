import { describe, expect, it, vi, beforeEach } from 'vitest';
import { establishmentBackendRepository } from './establishmentBackend.repository';
import type { EstablishmentEmployee } from '../types';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/core/supabase/client';

describe('establishmentBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleEmployee: EstablishmentEmployee = {
    id: 'emp-123',
    name: 'Ramesh Patel',
    nameGu: 'રમેશ પટેલ',
    mobileNo: '9876543210',
    pan: 'ABCDE1234F',
    hrpnNo: '100456',
    designation: 'Accountant',
    budgetHeadId: 7 as unknown as string,
    active: true,
    allowances: {},
    deductions: {},
    payEntries: [
      {
        id: 'pe-1',
        effectiveDate: '2024-04-01',
        basicPay: 55000,
        payScale: 'Level 8',
      },
    ],
  };

  it('saveEmployee upserts single employee and syncs pay entries in batch', async () => {
    const mockEmpUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockPeSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [{ id: 'pe-1' }] }),
    });
    const mockPeUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'establishment_employees') {
        return {
          upsert: mockEmpUpsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'establishment_pay_entries') {
        return {
          select: mockPeSelect,
          upsert: mockPeUpsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const result = await establishmentBackendRepository.saveEmployee(sampleEmployee);

    expect(mockEmpUpsert).toHaveBeenCalledTimes(1);
    expect(mockEmpUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'emp-123',
        name: 'Ramesh Patel',
        name_gu: 'રમેશ પટેલ',
        mobile_no: '9876543210',
        pan: 'ABCDE1234F',
        hrpn_no: '100456',
        designation: 'Accountant',
        budget_head_id: '7',
      })
    );

    expect(mockPeUpsert).toHaveBeenCalledTimes(1);
    expect(mockPeUpsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'pe-1',
        employee_id: 'emp-123',
        basic_pay: 55000,
      }),
    ]);

    expect(result.id).toBe('emp-123');
    expect(result.name).toBe('Ramesh Patel');
  });

  it('skips pay-entry requests when pay history is unchanged', async () => {
    const mockEmpUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockPeSelect = vi.fn();
    const mockPeUpsert = vi.fn();

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'establishment_employees') {
        return {
          upsert: mockEmpUpsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'establishment_pay_entries') {
        return {
          select: mockPeSelect,
          upsert: mockPeUpsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const result = await establishmentBackendRepository.saveEmployee(sampleEmployee, {
      syncPayEntries: false,
    });

    expect(mockEmpUpsert).toHaveBeenCalledTimes(1);
    expect(mockPeSelect).not.toHaveBeenCalled();
    expect(mockPeUpsert).not.toHaveBeenCalled();
    expect(result.payEntries).toHaveLength(1);
  });

  it('deleteEmployee deletes single record by ID', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'establishment_employees') {
        return {
          delete: mockDelete,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await establishmentBackendRepository.deleteEmployee('emp-123');

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockEq).toHaveBeenCalledWith('id', 'emp-123');
  });
});

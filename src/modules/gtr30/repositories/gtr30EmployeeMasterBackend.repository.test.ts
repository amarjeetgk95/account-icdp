import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30EmployeeMasterBackendRepository } from './gtr30EmployeeMasterBackend.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/core/supabase/client';

describe('gtr30EmployeeMasterBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when table query errors', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30EmployeeMasterBackendRepository.listGroups();
    expect(result).toEqual([]);
  });

  it('returns grouped employees on success', async () => {
    const mockRows = [
      {
        id: 'e1',
        month_key: 'July-2024',
        bill_code: 'GTR30-SAL',
        sr_no: 1,
        name: 'Test Employee',
        designation: 'Officer',
        pay_scale: 'Level 10',
        current_pay: 50000,
        current_pay_date: '2024-01-01',
        hra_percent: 10,
        transport_allowance: 2000,
        medical_allowance: 1000,
        cla_allowance: 500,
        pay_entries: [],
      },
    ];
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: mockRows, error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30EmployeeMasterBackendRepository.listGroups();
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result?.[0].employees[0].id).toBe('e1');
    expect(result?.[0].employees[0].name).toBe('Test Employee');
  });
});
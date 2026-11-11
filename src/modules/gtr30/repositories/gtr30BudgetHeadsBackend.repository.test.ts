import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30BudgetHeadsBackendRepository } from './gtr30BudgetHeadsBackend.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/core/supabase/client';

describe('gtr30BudgetHeadsBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when table query errors', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30BudgetHeadsBackendRepository.list();
    expect(result).toEqual([]);
  });

  it('returns formatted heads on success', async () => {
    const mockRows = [
      { id: 'bh1', name: 'Salary Head', payload: { majorHead: '2401' } },
      { id: 'bh2', name: 'Arrears Head', payload: { majorHead: '2402' } },
    ];
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: mockRows, error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30BudgetHeadsBackendRepository.list();
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result?.[0].name).toBe('Salary Head');
    expect(result?.[0].majorHead).toBe('2401');
  });
});
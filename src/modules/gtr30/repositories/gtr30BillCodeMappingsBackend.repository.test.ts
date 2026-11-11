import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30BillCodeMappingsBackendRepository } from './gtr30BillCodeMappingsBackend.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/core/supabase/client';

describe('gtr30BillCodeMappingsBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when table query errors', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30BillCodeMappingsBackendRepository.list();
    expect(result).toEqual([]);
  });

  it('returns validated mappings on success', async () => {
    const mockRows = [
      { id: 'm1', bill_code: 'GTR-30-GO-STATS', description: 'Gazetted Officers (Stats) Bill', payload: {} },
      { id: 'm2', bill_code: 'GTR-30-NGO-STATS', description: 'Non-Gazetted Staff (Stats) Bill', payload: {} },
    ];
    vi.mocked(supabase.from).mockReturnValue({
      select: () => Promise.resolve({ data: mockRows, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30BillCodeMappingsBackendRepository.list();
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result?.[0].billCode).toBe('GTR-30-GO-STATS');
  });

  it('filters legacy dummy bill codes from backend rows', async () => {
    const mockRows = [
      { id: 'm1', bill_code: 'GTR30-SAL', description: 'Salary Bill', payload: {} },
      { id: 'm2', bill_code: 'GTR30-DA', description: 'DA Bill', payload: {} },
      { id: 'm3', bill_code: 'GTR30-BONUS', description: 'Bonus Bill', payload: {} },
      { id: 'm4', bill_code: 'GTR-30-GO-STATS', description: 'GO Stats Bill', payload: {} },
    ];
    vi.mocked(supabase.from).mockReturnValue({
      select: () => Promise.resolve({ data: mockRows, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30BillCodeMappingsBackendRepository.list();
    expect(result?.map((m) => m.billCode)).toEqual(['GTR-30-GO-STATS']);
  });
});
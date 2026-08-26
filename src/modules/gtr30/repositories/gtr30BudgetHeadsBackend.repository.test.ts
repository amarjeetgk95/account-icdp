import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30BudgetHeadsBackendRepository } from './gtr30BudgetHeadsBackend.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('./officeScope', () => ({
  resolveOfficeIdStrict: vi.fn(),
}));

import { supabase } from '@/core/supabase/client';
import { resolveOfficeIdStrict } from './officeScope';

describe('gtr30BudgetHeadsBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when officeId is null (all-offices mode)', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue(null);

    const result = await gtr30BudgetHeadsBackendRepository.list();
    expect(result).toBeNull();
  });

  it('returns validated heads on success', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue('office-1');
    const mockHeads = [
      { id: 'bh1', name: 'Salary Head' },
      { id: 'bh2', name: 'Arrears Head' },
    ];
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockHeads, error: null });

    const result = await gtr30BudgetHeadsBackendRepository.list();
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result?.[0].name).toBe('Salary Head');
  });

  it('returns null on validation failure', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue('office-1');
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ name: 'Missing ID' }],
      error: null,
    });

    const result = await gtr30BudgetHeadsBackendRepository.list();
    expect(result).toBeNull();
  });
});
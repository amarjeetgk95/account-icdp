import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30BillCodeMappingsBackendRepository } from './gtr30BillCodeMappingsBackend.repository';

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

describe('gtr30BillCodeMappingsBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when officeId is null (all-offices mode)', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue(null);

    const result = await gtr30BillCodeMappingsBackendRepository.list();
    expect(result).toBeNull();
  });

  it('returns validated mappings on success', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue('office-1');
    const mockMappings = [
      { id: 'm1', billCode: 'GTR30-SAL', description: 'Salary Bill' },
      { id: 'm2', billCode: 'GTR30-ARR', description: 'Arrears Bill' },
    ];
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMappings, error: null });

    const result = await gtr30BillCodeMappingsBackendRepository.list();
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result?.[0].billCode).toBe('GTR30-SAL');
  });

  it('returns null on validation failure', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue('office-1');
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ id: 'm1', description: 'Missing billCode' }],
      error: null,
    });

    const result = await gtr30BillCodeMappingsBackendRepository.list();
    expect(result).toBeNull();
  });
});
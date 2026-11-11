import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../repositories/gtr30BillCodeMappingsBackend.repository', () => ({
  gtr30BillCodeMappingsBackendRepository: {
    list: vi.fn(),
    replaceAll: vi.fn(),
  },
}));

import { gtr30BillCodeMappingsService } from './gtr30BillCodeMappings.service';
import { gtr30BillCodeMappingsBackendRepository } from '../repositories/gtr30BillCodeMappingsBackend.repository';

describe('gtr30BillCodeMappingsService.hydrateFromBackend', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('does not persist legacy dummy bill codes pulled from the backend', async () => {
    vi.mocked(gtr30BillCodeMappingsBackendRepository.list).mockResolvedValue([
      { id: 'm1', billCode: 'GTR30-SAL', description: 'Salary Bill' },
      { id: 'm2', billCode: 'GTR-30-GO-STATS', description: 'GO Stats Bill' },
    ]);

    await gtr30BillCodeMappingsService.hydrateFromBackend();

    const codes = gtr30BillCodeMappingsService.list().map((m) => m.billCode);
    expect(codes).toContain('GTR-30-GO-STATS');
    expect(codes).not.toContain('GTR30-SAL');
    expect(codes).not.toContain('GTR30-DA');
    expect(codes).not.toContain('GTR30-BONUS');
  });

  it('falls back to the default configured mappings when the backend only returns legacy codes', async () => {
    vi.mocked(gtr30BillCodeMappingsBackendRepository.list).mockResolvedValue([
      { id: 'm1', billCode: 'GTR30-SAL', description: 'Salary Bill' },
    ]);

    await gtr30BillCodeMappingsService.hydrateFromBackend();

    const codes = gtr30BillCodeMappingsService.list().map((m) => m.billCode);
    expect(codes).toEqual(expect.arrayContaining(['GTR-30-GO-STATS', 'GTR-30-NGO-STATS']));
    expect(codes).not.toContain('GTR30-SAL');
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30EmployeeMasterBackendRepository } from './gtr30EmployeeMasterBackend.repository';

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

describe('gtr30EmployeeMasterBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when officeId is null (all-offices mode)', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue(null);

    const result = await gtr30EmployeeMasterBackendRepository.listGroups();
    expect(result).toBeNull();
  });

  it('returns validated groups on success', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue('office-1');
    const mockGroups = [
      {
        monthKey: 'July-2024',
        billCode: 'GTR30-SAL',
        employees: [
          {
            id: 'e1',
            srNo: 1,
            name: 'Test Employee',
            designation: 'Officer',
            payScale: 'Level 10',
            currentPay: 50000,
            currentPayDate: '2024-01-01',
            hraPercent: 10,
            transportAllowance: 2000,
            medicalAllowance: 1000,
            claAllowance: 500,
          },
        ],
      },
    ];
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockGroups, error: null });

    const result = await gtr30EmployeeMasterBackendRepository.listGroups();
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result?.[0].employees[0].id).toBe('e1');
  });

  it('returns null on validation failure', async () => {
    vi.mocked(resolveOfficeIdStrict).mockResolvedValue('office-1');
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ monthKey: 'July-2024', billCode: 'GTR30-SAL', employees: [{ name: 'Test' }] }],
      error: null,
    });

    const result = await gtr30EmployeeMasterBackendRepository.listGroups();
    expect(result).toBeNull();
  });
});
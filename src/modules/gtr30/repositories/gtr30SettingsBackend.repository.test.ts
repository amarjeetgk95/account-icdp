import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30SettingsBackendRepository } from './gtr30SettingsBackend.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

import { supabase } from '@/core/supabase/client';

describe('gtr30SettingsBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when settings not found', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30SettingsBackendRepository.load();
    expect(result).toBeNull();
  });

  it('returns validated payload on success', async () => {
    const mockPayload = {
      settings: { officeName: 'Test' },
      employeeTemplate: { designation: 'Desig' },
      defaultPosts: [],
      daRates: [],
    };
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { settings_value: mockPayload },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30SettingsBackendRepository.load();
    expect(result).not.toBeNull();
    expect(result?.settings.officeName).toBe('Test');
  });

  it('returns null on validation failure', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { settings_value: { employeeTemplate: { insuranceGroup: 'INVALID' } } },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await gtr30SettingsBackendRepository.load();
    expect(result).toBeNull();
  });
});
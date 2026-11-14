import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchPostCatalog,
  savePostCatalog,
  syncPostWithExistingPositions,
  resetPostCatalogToDefault,
} from './postCatalogBackend.repository';
import { DEFAULT_POST_CATALOG } from '../constants/establishmentPostCatalog';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/core/supabase/client';

describe('postCatalogBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('fetches post catalog from app_config and falls back to default if empty', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await fetchPostCatalog();
    expect(result.length).toBe(DEFAULT_POST_CATALOG.length);
    // Order of sequence must be from higher pay to lower
    expect(result[0].nameGu).toBe('પશુપાલન નિયામક');
    expect(result[0].cadreClass).toBe('Class-1');
    expect(result[0].minPay).toBe(131100);
    expect(result[result.length - 1].cadreClass).toBe('Class-4');
    expect(result[result.length - 1].minPay).toBe(14800);
    // Verify each post has minPay >= next post
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].minPay).toBeGreaterThanOrEqual(result[i + 1].minPay);
    }
  });

  it('parses existing post catalog from app_config', async () => {
    const mockData = [
      {
        id: 'post-test-1',
        nameGu: 'ટેસ્ટ કારકુન',
        nameEn: 'Test Clerk',
        cadreClass: 'Class-3',
        payLevel: 'Level 4',
        payScale: '25500-81100',
        minPay: 25500,
        isActive: true,
      },
    ];

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { value: JSON.stringify(mockData) },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await fetchPostCatalog();
    expect(result).toHaveLength(1);
    expect(result[0].nameGu).toBe('ટેસ્ટ કારકુન');
    expect(result[0].nameEn).toBe('Test Clerk');
  });

  it('saves updated post catalog into app_config and updates cache', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: mockUpsert,
    } as unknown as ReturnType<typeof supabase.from>);

    const updated = [
      {
        id: 'post-1',
        nameGu: 'સિનિયર કારકુન',
        nameEn: 'Senior Clerk',
        cadreClass: 'Class-3' as const,
        payLevel: 'Level 4',
        payScale: '25500-81100',
        minPay: 25500,
        isActive: true,
      },
    ];

    await savePostCatalog(updated);

    const expectedSaved = [
      {
        ...updated[0],
        displayOrder: 1,
      },
    ];

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'establishment_post_catalog',
        value: JSON.stringify(expectedSaved),
      }),
      { onConflict: 'key' }
    );
    expect(localStorage.getItem('icdp_establishment_post_catalog')).toBe(JSON.stringify(expectedSaved));
  });

  it('cascades updated post details to all matching positions', async () => {
    const mockSelect = vi.fn().mockReturnValue({ data: [{ id: 'pos-1' }, { id: 'pos-2' }] });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as unknown as ReturnType<typeof supabase.from>);

    const item = {
      id: 'post-1',
      nameGu: 'સિનિયર કારકુન (સુધારેલ)',
      nameEn: 'Senior Clerk (Revised)',
      cadreClass: 'Class-3' as const,
      payLevel: 'Level 5',
      payScale: '29200-92300',
      minPay: 29200,
      isActive: true,
    };

    const count = await syncPostWithExistingPositions('સિનિયર કારકુન', item);

    expect(count).toBe(2);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        designation_title_gu: 'સિનિયર કારકુન (સુધારેલ)',
        designation_title: 'Senior Clerk (Revised)',
        cadre_class: 'Class-3',
        pay_matrix_level: 'Level 5',
        pay_scale: '29200-92300',
      })
    );
  });
});

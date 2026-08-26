import { describe, it, expect, vi } from 'vitest';
import { componentMasterService, DEFAULT_COMPONENT_SEED } from './componentMaster.service';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'seed-test-id' }, error: null }),
          single: () => Promise.resolve({ data: { id: 'seed-test-id' }, error: null }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

describe('ComponentMasterService', () => {
  it('should list all default components when default filters with "ALL" are passed', async () => {
    const filters = { search: '', type: 'ALL' as const, category: 'ALL', active: 'ALL' as const };
    const list = await componentMasterService.listComponents(filters);

    expect(list.length).toBe(DEFAULT_COMPONENT_SEED.length);
    expect(list.some((c) => c.componentName === 'Basic Pay')).toBe(true);
    expect(list.some((c) => c.componentName === 'DA')).toBe(true);
    expect(list.some((c) => c.componentName === 'Special Additional Pay')).toBe(true);
    expect(list.some((c) => c.componentName === 'Washing Allowance')).toBe(true);
    expect(list.some((c) => c.componentName === 'Income Tax')).toBe(true);
  });

  it('should filter by EARNING and DEDUCTION types properly', async () => {
    const earnings = await componentMasterService.listComponents({ type: 'EARNING', category: 'ALL', active: 'ALL' });
    const deductions = await componentMasterService.listComponents({ type: 'DEDUCTION', category: 'ALL', active: 'ALL' });

    expect(earnings.every((c) => c.type === 'EARNING')).toBe(true);
    expect(deductions.every((c) => c.type === 'DEDUCTION')).toBe(true);
    expect(earnings.length + deductions.length).toBe(DEFAULT_COMPONENT_SEED.length);
  });

  it('should match header fragments from PDF correctly', () => {
    const matcher = componentMasterService.getMatcher();

    const basicMatch = matcher.findComponent('Basic Pay (0101)/(0102)');
    expect(basicMatch.component?.componentName).toBe('Basic Pay');

    const daMatch = matcher.findComponent('DA (0103)');
    expect(daMatch.component?.componentName).toBe('DA');

    const washingMatch = matcher.findComponent('Washing Allow (0132)');
    expect(washingMatch.component?.componentName).toBe('Washing Allowance');

    const specialPayMatch = matcher.findComponent('Special Additional Pay (0101)/(0102)');
    expect(specialPayMatch.component?.componentName).toBe('Special Additional Pay');
  });
});

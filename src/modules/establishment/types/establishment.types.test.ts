import { describe, expect, it } from 'vitest';
import {
  latestPayOf,
  compareEstablishmentOrder,
  establishmentOrderRank,
  establishmentPostDisplayName,
} from './index';

describe('latestPayOf', () => {
  it('returns undefined without pay entries', () => {
    expect(latestPayOf({ id: 'e1', name: 'A', active: true, allowances: {}, deductions: {}, payEntries: [] })).toBeUndefined();
  });

  it('returns the most recent entry', () => {
    const employee = {
      id: 'e1',
      name: 'A',
      active: true,
      allowances: {},
      deductions: {},
      payEntries: [
        { id: 'p1', effectiveDate: '2026-01-01', basicPay: 30000 },
        { id: 'p2', effectiveDate: '2026-07-01', basicPay: 39900 },
      ],
    };
    expect(latestPayOf(employee)?.basicPay).toBe(39900);
  });
});

describe('establishmentOrderRank', () => {
  it('ranks arranged rows before never-arranged rows', () => {
    expect(establishmentOrderRank({ displayOrder: 1 })).toBe(1);
    expect(establishmentOrderRank({ displayOrder: null })).toBe(Number.MAX_SAFE_INTEGER);
    expect(establishmentOrderRank({})).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('compareEstablishmentOrder', () => {
  const base = { id: 'x', name: 'B', active: true, allowances: {}, deductions: {}, payEntries: [] } as unknown as import('./index').EstablishmentEmployee;
  it('manual sequence wins over alphabetical name', () => {
    const a = { ...base, id: 'a', name: 'Zebra', displayOrder: 1 };
    const b = { ...base, id: 'b', name: 'Apple', displayOrder: 2 };
    expect([...[b, a]].sort(compareEstablishmentOrder).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('falls back to name when sequence is missing', () => {
    const a = { ...base, id: 'a', name: 'Zebra', displayOrder: null };
    const b = { ...base, id: 'b', name: 'Apple', displayOrder: null };
    expect([...[a, b]].sort(compareEstablishmentOrder).map((e) => e.id)).toEqual(['b', 'a']);
  });
});

describe('establishmentPostDisplayName', () => {
  it('appends the headquarter after the designation', () => {
    expect(establishmentPostDisplayName('પશુધન નિરીક્ષક', 'સેગવા')).toBe('પશુધન નિરીક્ષક-સેગવા');
  });

  it('keeps the designation alone when headquarter is blank', () => {
    expect(establishmentPostDisplayName('પશુધન નિરીક્ષક', '')).toBe('પશુધન નિરીક્ષક');
    expect(establishmentPostDisplayName('પશુધન નિરીક્ષક', null)).toBe('પશુધન નિરીક્ષક');
  });
});

import { describe, expect, it } from 'vitest';
import { latestPayOf, vacantFor } from '../types';

describe('vacantFor', () => {
  it('computes vacant posts', () => {
    expect(vacantFor({ sanctioned: 5, filled: 2 })).toBe(3);
  });

  it('never goes negative', () => {
    expect(vacantFor({ sanctioned: 2, filled: 5 })).toBe(0);
  });
});

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

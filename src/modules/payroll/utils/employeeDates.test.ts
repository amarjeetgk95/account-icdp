import { describe, it, expect } from 'vitest';
import {
  getWorkMonthForEntrySlot,
  isActiveInEntryMonth,
  getActiveEntryMonths,
} from '../utils/employeeDates';

const FY = 2026;

describe('getWorkMonthForEntrySlot', () => {
  it('maps payment slots to previous work months', () => {
    expect(getWorkMonthForEntrySlot(FY, 'April')).toEqual({ year: 2026, month: 2 }); // Mar-2026
    expect(getWorkMonthForEntrySlot(FY, 'July')).toEqual({ year: 2026, month: 5 }); // Jun-2026
    expect(getWorkMonthForEntrySlot(FY, 'January')).toEqual({ year: 2026, month: 11 }); // Dec-2026
    expect(getWorkMonthForEntrySlot(FY, 'March')).toEqual({ year: 2027, month: 1 }); // Feb-2027
  });
});

describe('isActiveInEntryMonth', () => {
  it('includes active employees in every slot of the year', () => {
    expect(isActiveInEntryMonth(null, null, FY, 'April')).toBe(true);
    expect(isActiveInEntryMonth(null, null, FY, 'March')).toBe(true);
  });

  it('Solanki transferred 22-06-2026: active through the July slot (June work), gone from August', () => {
    const transfer = '2026-06-22';
    for (const m of ['April', 'May', 'June', 'July']) {
      expect(isActiveInEntryMonth(null, transfer, FY, m)).toBe(true);
    }
    for (const m of ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March']) {
      expect(isActiveInEntryMonth(null, transfer, FY, m)).toBe(false);
    }
  });

  it('includes employees who joined late in a work month (at least one day)', () => {
    expect(isActiveInEntryMonth('2026-06-30', null, FY, 'July')).toBe(true); // joined 30-06, June work
    expect(isActiveInEntryMonth('2026-07-01', null, FY, 'July')).toBe(false); // joined 01-07, not June work
  });

  it('excludes employees transferred at the very start of the work month', () => {
    expect(isActiveInEntryMonth(null, '2026-06-01', FY, 'July')).toBe(false); // left 01-06, no June work
    expect(isActiveInEntryMonth(null, '2026-06-02', FY, 'July')).toBe(true); // worked 01-06
  });

  it('excludes employees who had not yet joined', () => {
    expect(isActiveInEntryMonth('2026-08-15', null, FY, 'August')).toBe(false); // joined 15-08, not July work
    expect(isActiveInEntryMonth('2026-08-15', null, FY, 'September')).toBe(true); // August work, paid in September
  });
});

describe('getActiveEntryMonths', () => {
  it('returns the full year for an always-active employee', () => {
    const months = getActiveEntryMonths(FY, null, null);
    expect(months.length).toBe(12);
    expect(months[0]).toBe('April');
    expect(months[11]).toBe('March');
  });

  it('returns April to July for the Solanki transfer scenario', () => {
    expect(getActiveEntryMonths(FY, null, '2026-06-22')).toEqual([
      'April',
      'May',
      'June',
      'July',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  gtr30MonthKeyFor,
  gtr30ParseMonthKey,
  gtr30MonthOptions,
  gtr30YearOptions,
} from './gtr30MonthKey';

describe('gtr30MonthKey utils', () => {
  it('builds a month key from month name and year', () => {
    expect(gtr30MonthKeyFor('July', 2026)).toBe('July-2026');
    expect(gtr30MonthKeyFor(' March ', 2027)).toBe('March-2027');
  });

  it('parses a valid month key back into parts', () => {
    expect(gtr30ParseMonthKey('July-2026')).toEqual({ month: 'July', year: 2026 });
  });

  it('normalizes case when parsing', () => {
    expect(gtr30ParseMonthKey('july-2026')).toEqual({ month: 'July', year: 2026 });
    expect(gtr30ParseMonthKey('JULY-2026')).toEqual({ month: 'July', year: 2026 });
  });

  it('returns null for invalid or unknown month keys', () => {
    expect(gtr30ParseMonthKey('NotAMonth-2026')).toBeNull();
    expect(gtr30ParseMonthKey('July-26')).toBeNull();
    expect(gtr30ParseMonthKey('July2026')).toBeNull();
    expect(gtr30ParseMonthKey('')).toBeNull();
  });

  it('exposes FY-ordered month options (April first)', () => {
    expect(gtr30MonthOptions()[0]).toBe('April');
    expect(gtr30MonthOptions()).toHaveLength(12);
    expect(gtr30MonthOptions()[11]).toBe('March');
  });

  it('builds a sorted, de-duplicated year range around the active FY', () => {
    expect(gtr30YearOptions(2026)).toEqual([2025, 2026, 2027]);
  });
});

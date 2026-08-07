import { describe, it, expect } from 'vitest';
import {
  MONTHS,
  QUARTERS,
  QUARTER_MONTHS,
  getQuarterForMonth,
  getFinancialYear,
  getMonthsForQuarter,
} from './index';

describe('MONTHS', () => {
  it('has 12 months starting from April', () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe('April');
    expect(MONTHS[11]).toBe('March');
  });
});

describe('QUARTERS', () => {
  it('has 4 quarters', () => {
    expect(QUARTERS).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });
});

describe('QUARTER_MONTHS', () => {
  it('maps quarters to correct months', () => {
    expect(QUARTER_MONTHS.Q1).toEqual(['April', 'May', 'June']);
    expect(QUARTER_MONTHS.Q2).toEqual(['July', 'August', 'September']);
    expect(QUARTER_MONTHS.Q3).toEqual(['October', 'November', 'December']);
    expect(QUARTER_MONTHS.Q4).toEqual(['January', 'February', 'March']);
  });
});

describe('getQuarterForMonth', () => {
  it('returns correct quarter for each month', () => {
    expect(getQuarterForMonth('April')).toBe('Q1');
    expect(getQuarterForMonth('June')).toBe('Q1');
    expect(getQuarterForMonth('July')).toBe('Q2');
    expect(getQuarterForMonth('September')).toBe('Q2');
    expect(getQuarterForMonth('October')).toBe('Q3');
    expect(getQuarterForMonth('December')).toBe('Q3');
    expect(getQuarterForMonth('January')).toBe('Q4');
    expect(getQuarterForMonth('March')).toBe('Q4');
  });
});

describe('getFinancialYear', () => {
  it('returns correct financial year for dates', () => {
    expect(getFinancialYear(new Date(2025, 3, 1))).toBe(2025);
    expect(getFinancialYear(new Date(2025, 11, 31))).toBe(2025);
    expect(getFinancialYear(new Date(2025, 0, 1))).toBe(2024);
    expect(getFinancialYear(new Date(2025, 2, 31))).toBe(2024);
  });
});

describe('getMonthsForQuarter', () => {
  it('returns months for given quarter', () => {
    expect(getMonthsForQuarter('Q1')).toEqual(['April', 'May', 'June']);
    expect(getMonthsForQuarter('Q4')).toEqual(['January', 'February', 'March']);
  });
});

import { describe, it, expect, vi } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  parseDateLocal,
  toDateString,
  num,
  money,
  pad2,
  generateId,
  debounce,
} from './index';

describe('formatCurrency', () => {
  it('formats number as INR currency', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00');
    expect(formatCurrency(1234567.89)).toBe('₹12,34,567.89');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('₹0.00');
  });
});

describe('formatDate', () => {
  it('formats date string to Indian format', () => {
    expect(formatDate('2025-04-15')).toBe('15 Apr 2025');
  });

  it('handles Date object', () => {
    const date = new Date(2025, 3, 15);
    expect(formatDate(date)).toBe('15 Apr 2025');
  });
});

describe('formatNumber', () => {
  it('formats number with Indian grouping', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('12,34,567');
  });
});

describe('parseDateLocal', () => {
  it('parses YYYY-MM-DD string to Date', () => {
    const result = parseDateLocal('2025-04-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(3);
    expect(result?.getDate()).toBe(15);
  });

  it('returns null for empty string', () => {
    expect(parseDateLocal('')).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseDateLocal('invalid')).toBeNull();
  });
});

describe('toDateString', () => {
  it('converts Date to YYYY-MM-DD string', () => {
    const date = new Date(2025, 3, 15);
    expect(toDateString(date)).toBe('2025-04-15');
  });
});

describe('num', () => {
  it('converts value to number', () => {
    expect(num('100')).toBe(100);
    expect(num('invalid')).toBe(0);
    expect(num(undefined)).toBe(0);
  });
});

describe('money', () => {
  it('rounds to 2 decimal places', () => {
    expect(money(100.999)).toBe(101);
    expect(money(100.001)).toBe(100);
  });
});

describe('pad2', () => {
  it('pads single digit with leading zero', () => {
    expect(pad2(5)).toBe('05');
    expect(pad2(15)).toBe('15');
  });
});

describe('generateId', () => {
  it('generates unique string ID', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
  });
});

describe('debounce', () => {
  it('delays function execution', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');

    vi.useRealTimers();
  });
});

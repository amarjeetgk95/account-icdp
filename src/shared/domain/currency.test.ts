import { describe, it, expect } from 'vitest';
import {
  numberToWordsINR,
  formatINR,
  formatIndianCurrency,
  integerToIndianWords,
  formatINRInteger,
  formatINRWhole,
} from './currency';

describe('numberToWordsINR (canonical)', () => {
  it('handles zero / null / NaN', () => {
    expect(numberToWordsINR(0)).toBe('Rupees Zero Only');
    expect(numberToWordsINR(null)).toBe('Rupees Zero Only');
    expect(numberToWordsINR(undefined)).toBe('Rupees Zero Only');
    expect(numberToWordsINR(NaN)).toBe('Rupees Zero Only');
  });

  it('converts ones / tens / hundreds', () => {
    expect(numberToWordsINR(1)).toBe('Rupees One Only');
    expect(numberToWordsINR(19)).toBe('Rupees Nineteen Only');
    expect(numberToWordsINR(20)).toBe('Rupees Twenty Only');
    expect(numberToWordsINR(105)).toBe('Rupees One Hundred Five Only');
  });

  it('uses Indian digit grouping (Thousand / Lakh / Crore)', () => {
    expect(numberToWordsINR(1000)).toBe('Rupees One Thousand Only');
    expect(numberToWordsINR(100000)).toBe('Rupees One Lakh Only');
    expect(numberToWordsINR(2500000)).toBe('Rupees Twenty Five Lakh Only');
    expect(numberToWordsINR(10000000)).toBe('Rupees One Crore Only');
    expect(numberToWordsINR(12345678)).toBe(
      'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only'
    );
  });

  it('appends Paise for fractional amounts', () => {
    expect(numberToWordsINR(100.5)).toBe('Rupees One Hundred and Fifty Paise Only');
  });
});

describe('formatINR (canonical)', () => {
  it('formats with en-IN grouping and 2 decimals', () => {
    expect(formatINR(1234567.8)).toBe('12,34,567.80');
    expect(formatINR(0)).toBe('0.00');
    expect(formatINR(null)).toBe('0.00');
  });

  it('keeps the legacy alias identical', () => {
    expect(formatIndianCurrency(1234567.8)).toBe(formatINR(1234567.8));
  });
});

describe('integerToIndianWords', () => {
  it('returns empty string for zero', () => {
    expect(integerToIndianWords(0)).toBe('');
  });

  it('uses Indian digit grouping (Thousand / Lakh / Crore)', () => {
    expect(integerToIndianWords(20)).toBe('Twenty');
    expect(integerToIndianWords(105)).toBe('One Hundred Five');
    expect(integerToIndianWords(1234)).toBe('One Thousand Two Hundred Thirty Four');
    expect(integerToIndianWords(100000)).toBe('One Lakh');
    expect(integerToIndianWords(1234567)).toBe('Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven');
    expect(integerToIndianWords(10000000)).toBe('One Crore');
    expect(integerToIndianWords(12345678)).toBe(
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight'
    );
    expect(integerToIndianWords(100000000)).toBe('Ten Crore');
  });
});

describe('formatINRInteger / formatINRWhole', () => {
  it('rounds to whole rupees with en-IN grouping', () => {
    expect(formatINRInteger(1234567.8)).toBe('12,34,568');
    expect(formatINRInteger(0)).toBe('0');
    expect(formatINRInteger(null)).toBe('0');
    expect(formatINRWhole(1234567.8)).toBe('₹12,34,568');
    expect(formatINRWhole(0)).toBe('₹0');
    expect(formatINRWhole(undefined)).toBe('₹0');
    expect(formatINRWhole(NaN)).toBe('₹0');
  });
});

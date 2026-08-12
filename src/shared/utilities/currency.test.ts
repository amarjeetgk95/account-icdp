import { describe, it, expect } from 'vitest';
import {
  toPaise,
  toRupees,
  addCurrency,
  subtractCurrency,
  multiplyCurrency,
  calculateTaxRate,
} from './currency';

describe('Financial Calculation Precision Utilities', () => {
  describe('toPaise', () => {
    it('converts rupees to paise accurately', () => {
      expect(toPaise(100.5)).toBe(10050);
      expect(toPaise(0.1 + 0.2)).toBe(30);
      expect(toPaise(1234.56)).toBe(123456);
    });

    it('handles edge numbers cleanly', () => {
      expect(toPaise(NaN)).toBe(0);
      expect(toPaise(Infinity)).toBe(0);
    });
  });

  describe('toRupees', () => {
    it('converts paise to rupees accurately', () => {
      expect(toRupees(10050)).toBe(100.5);
      expect(toRupees(30)).toBe(0.3);
      expect(toRupees(123456)).toBe(1234.56);
    });

    it('handles edge numbers cleanly', () => {
      expect(toRupees(NaN)).toBe(0);
      expect(toRupees(Infinity)).toBe(0);
    });
  });

  describe('addCurrency', () => {
    it('adds amounts without floating point errors', () => {
      expect(addCurrency(0.1, 0.2)).toBe(0.3);
      expect(addCurrency(100.55, 200.45, 300.01)).toBe(601.01);
    });
  });

  describe('subtractCurrency', () => {
    it('subtracts amounts accurately', () => {
      expect(subtractCurrency(100.5, 40.25)).toBe(60.25);
    });
  });

  describe('multiplyCurrency', () => {
    it('multiplies currency cleanly', () => {
      expect(multiplyCurrency(100, 1.5)).toBe(150);
      expect(multiplyCurrency(50.25, 2)).toBe(100.5);
    });
  });

  describe('calculateTaxRate', () => {
    it('calculates tax rates cleanly', () => {
      expect(calculateTaxRate(1000, 18)).toBe(180); // 18% GST on 1000 = 180
      expect(calculateTaxRate(5000, 10)).toBe(500); // 10% TDS on 5000 = 500
      expect(calculateTaxRate(1000, 0)).toBe(0);
    });
  });
});

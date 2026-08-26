import { describe, expect, it } from 'vitest';
import {
  calculateDA,
  calculateNPS,
  calculateGujaratPT,
  getGISRatesForGroup,
  findPayScaleMappingByScale,
  DEFAULT_DA_PERCENT,
  GIS_RATES,
} from './gtr30GovRules';

describe('gtr30GovRules', () => {
  describe('calculateDA', () => {
    it('calculates 53% DA by default on current pay', () => {
      expect(calculateDA(39900)).toBe(21147);
      expect(calculateDA(100000, 50)).toBe(50000);
      expect(calculateDA(0)).toBe(0);
    });
  });

  describe('calculateNPS', () => {
    it('calculates 10% of basic + DA rounded to nearest integer', () => {
      const basic = 39900;
      const da = calculateDA(basic, DEFAULT_DA_PERCENT); // 21147
      expect(calculateNPS(basic, da)).toBe(6105);
    });

    it('returns 0 when basic pay is 0', () => {
      expect(calculateNPS(0, 0)).toBe(0);
    });
  });

  describe('calculateGujaratPT', () => {
    it('returns ₹200 for pay >= 12000 and ₹0 for pay < 12000', () => {
      expect(calculateGujaratPT(39900)).toBe(200);
      expect(calculateGujaratPT(12000)).toBe(200);
      expect(calculateGujaratPT(11999)).toBe(0);
      expect(calculateGujaratPT(0)).toBe(0);
    });
  });

  describe('getGISRatesForGroup', () => {
    it('maps Class 1 (ક/A) correctly', () => {
      expect(getGISRatesForGroup('ક')).toEqual(GIS_RATES.A);
      expect(getGISRatesForGroup('A')).toEqual(GIS_RATES.A);
    });

    it('maps Class 2 (ખ/B) correctly', () => {
      expect(getGISRatesForGroup('ખ')).toEqual(GIS_RATES.B);
      expect(getGISRatesForGroup('B')).toEqual(GIS_RATES.B);
      expect(getGISRatesForGroup('ખ')?.insuranceFund).toBe(240);
      expect(getGISRatesForGroup('ખ')?.savingsFund).toBe(560);
    });

    it('maps Class 3 (ગ/C) correctly', () => {
      expect(getGISRatesForGroup('ગ')).toEqual(GIS_RATES.C);
      expect(getGISRatesForGroup('C')).toEqual(GIS_RATES.C);
    });

    it('maps Class 4 (ઘ/D) correctly', () => {
      expect(getGISRatesForGroup('ઘ')).toEqual(GIS_RATES.D);
      expect(getGISRatesForGroup('D')).toEqual(GIS_RATES.D);
    });

    it('returns null for unknown groups', () => {
      expect(getGISRatesForGroup('')).toBeNull();
      expect(getGISRatesForGroup('Unknown')).toBeNull();
    });
  });

  describe('findPayScaleMappingByScale', () => {
    it('finds Grade Pay when 7th Pay Scale is passed', () => {
      const m = findPayScaleMappingByScale('34,500-1,12,400');
      expect(m).not.toBeNull();
      expect(m?.gradePay).toBe('GP:4200');
    });

    it('returns null for empty or invalid values', () => {
      expect(findPayScaleMappingByScale('')).toBeNull();
    });
  });
});

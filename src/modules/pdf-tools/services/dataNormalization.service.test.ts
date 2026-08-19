import { describe, it, expect } from 'vitest';
import { dataNormalizationService } from './dataNormalization.service';

describe('DataNormalizationService', () => {
  it('converts Gujarati numerals to standard digits', () => {
    expect(dataNormalizationService.convertGujaratiNumerals('૧૨૩૪૫')).toBe('12345');
    expect(dataNormalizationService.convertGujaratiNumerals('૧,૦૫,૬૦૦.૦૦')).toBe('1,05,600.00');
  });

  it('normalizes currency values with ₹ and Rs.', () => {
    const r1 = dataNormalizationService.normalize('₹ 25,000');
    expect(r1.type).toBe('currency');
    expect(r1.normalizedValue).toBe(25000);
    expect(r1.currencySymbol).toBe('₹');

    const r2 = dataNormalizationService.normalize('Rs. 1,05,600.50');
    expect(r2.type).toBe('currency');
    expect(r2.normalizedValue).toBe(105600.5);

    const r3 = dataNormalizationService.normalize('₹ ૧,૦૫,૬૦૦');
    expect(r3.type).toBe('currency');
    expect(r3.normalizedValue).toBe(105600);
  });

  it('normalizes accounting negative values in parentheses', () => {
    const res = dataNormalizationService.normalize('(500.00)');
    expect(res.type).toBe('currency');
    expect(res.normalizedValue).toBe(-500);
    expect(res.isNegative).toBe(true);
  });

  it('normalizes percentages', () => {
    const res = dataNormalizationService.normalize('18 %');
    expect(res.type).toBe('percentage');
    expect(res.normalizedValue).toBe(0.18);
  });

  it('normalizes dates in DD/MM/YYYY and YYYY-MM-DD formats', () => {
    const res1 = dataNormalizationService.normalize('01/04/2026');
    expect(res1.type).toBe('date');
    expect(res1.normalizedValue).toBeInstanceOf(Date);

    const res2 = dataNormalizationService.normalize('2026-07-15');
    expect(res2.type).toBe('date');
    expect(res2.normalizedValue).toBeInstanceOf(Date);
  });

  it('protects government identifiers from being corrupted into numbers', () => {
    const id1 = dataNormalizationService.normalize('GTR-44');
    expect(id1.type).toBe('text');
    expect(id1.normalizedValue).toBe('GTR-44');

    const id2 = dataNormalizationService.normalize('2403-00-102-02-00');
    expect(id2.type).toBe('text');
    expect(id2.normalizedValue).toBe('2403-00-102-02-00');

    const id3 = dataNormalizationService.normalize('SRTD00392F');
    expect(id3.type).toBe('text');
    expect(id3.normalizedValue).toBe('SRTD00392F');

    const id4 = dataNormalizationService.normalize('BID-7255384');
    expect(id4.type).toBe('text');
    expect(id4.normalizedValue).toBe('BID-7255384');
  });

  it('preserves Gujarati Unicode text intact without transliteration', () => {
    const guj = dataNormalizationService.normalize('સઘન પશુ સુધારણા યોજના');
    expect(guj.type).toBe('text');
    expect(guj.normalizedValue).toBe('સઘન પશુ સુધારણા યોજના');
  });
});

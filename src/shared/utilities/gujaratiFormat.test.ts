import { describe, it, expect } from 'vitest';
import {
  toGujaratiNumerals,
  parseGujaratiNumerals,
  createPinBoxesHTML,
  createPhoneBoxesHTML,
  createDateBoxesHTML,
  createCharBoxesHTML,
  formatDateStandardGujarati,
  formatDateForBox,
} from './gujaratiFormat';

describe('gujaratiFormat utilities', () => {
  describe('toGujaratiNumerals', () => {
    it('converts Arabic numerals to Gujarati numerals', () => {
      expect(toGujaratiNumerals('0123456789')).toBe('૦૧૨૩૪૫૬૭૮૯');
      expect(toGujaratiNumerals(2026)).toBe('૨૦૨૬');
      expect(toGujaratiNumerals('Rs. 50,000/-')).toBe('Rs. ૫૦,૦૦૦/-');
    });

    it('handles empty/null values', () => {
      expect(toGujaratiNumerals('')).toBe('');
      expect(toGujaratiNumerals(null)).toBe('');
      expect(toGujaratiNumerals(undefined)).toBe('');
    });
  });

  describe('parseGujaratiNumerals', () => {
    it('parses Gujarati digits back to number', () => {
      expect(parseGujaratiNumerals('૨૦૨૬')).toBe(2026);
      expect(parseGujaratiNumerals('૫૦૦૦૦.૫૦')).toBe(50000.5);
      expect(parseGujaratiNumerals('રૂ. ૧,૫૦૦')).toBe(1500);
    });

    it('returns 0 for empty or invalid input', () => {
      expect(parseGujaratiNumerals('')).toBe(0);
      expect(parseGujaratiNumerals(null)).toBe(0);
    });
  });

  describe('formatDateStandardGujarati and formatDateForBox', () => {
    it('formats dates into standard DD-MM-YYYY format', () => {
      const d = new Date(2026, 7, 22); // Month is 0-indexed: 7 = August
      expect(formatDateForBox(d)).toBe('22-08-2026');
      expect(formatDateStandardGujarati(d)).toBe('૨૨-૦૮-૨૦૨૬');
    });
  });

  describe('createPinBoxesHTML', () => {
    it('generates 6 boxed cells with Gujarati digits', () => {
      const html = createPinBoxesHTML('395008');
      expect(html).toContain('૩');
      expect(html).toContain('૯');
      expect(html).toContain('૫');
      expect(html).toContain('૦');
      expect(html).toContain('૮');
      expect(html).toContain('box-cell');
    });
  });

  describe('createPhoneBoxesHTML', () => {
    it('generates 10 boxed cells for phone', () => {
      const html = createPhoneBoxesHTML('9876543210');
      expect(html).toContain('૯');
      expect(html).toContain('૮');
      expect(html).toContain('૭');
      expect(html).toContain('box-cell');
    });
  });

  describe('createDateBoxesHTML', () => {
    it('generates boxed date with dashes', () => {
      const html = createDateBoxesHTML('22-08-2026');
      expect(html).toContain('૨');
      expect(html).toContain('૮');
      expect(html).toContain('-');
    });
  });

  describe('createCharBoxesHTML', () => {
    it('generates character cells for uppercase English text', () => {
      const html = createCharBoxesHTML('surat', 5);
      expect(html).toContain('S');
      expect(html).toContain('U');
      expect(html).toContain('R');
      expect(html).toContain('A');
      expect(html).toContain('T');
    });
  });
});

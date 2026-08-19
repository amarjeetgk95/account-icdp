import type { NormalizedCellData } from '../types/spatial.types';

export class DataNormalizationService {
  /**
   * Gujarati numerals to standard Arabic digits map
   * ૦=0, ૧=1, ૨=2, ૩=3, ૪=4, ૫=5, ૬=6, ૭=7, ૮=8, ૯=9
   */
  private gujaratiDigitMap: Record<string, string> = {
    '૦': '0',
    '૧': '1',
    '૨': '2',
    '૩': '3',
    '૪': '4',
    '૫': '5',
    '૬': '6',
    '૭': '7',
    '૮': '8',
    '૯': '9',
  };

  /**
   * Convert Gujarati digits in a string to standard ASCII numbers
   */
  convertGujaratiNumerals(text: string): string {
    return text.replace(/[૦-૯]/g, (ch) => this.gujaratiDigitMap[ch] || ch);
  }

  /**
   * Check if text is a government identifier or code that should NOT be parsed as number
   * (e.g. GTR-44, 2403-00-102-02-00, Srt0299002201, SRTD00392F, 123/2026, PB-3, Level-8)
   */
  isIdentifierOrCode(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;

    // Pattern for major head: "2403-00-102-02-00"
    if (/^\d{4}-\d{2}-\d{3}-\d{2}-\d{2}$/.test(trimmed)) return true;

    // Pattern for bills/alphanumeric IDs with hyphens, slashes, mixed letters and digits
    if (/^(GTR|BID|TAN|HRPN|PB|SRT|DDO|Level)[-_/A-Za-z0-9]+/i.test(trimmed)) return true;
    if (/^[A-Za-z]+[-_]\d+/i.test(trimmed)) return true;
    if (/^\d+[-_][A-Za-z]+/i.test(trimmed)) return true;

    // Code with slashes like "123/2026" or "(15600-39100)/6600"
    if (/\/\d{2,4}$/.test(trimmed) && /[A-Za-z-]/.test(trimmed)) return true;

    return false;
  }

  /**
   * Parse dates in Indian / International formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
   */
  parseDate(text: string): { isDate: boolean; date?: Date; format?: string } {
    const clean = this.convertGujaratiNumerals(text.trim());

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
        const d = new Date(year, month, day);
        return { isDate: true, date: d, format: 'DD/MM/YYYY' };
      }
    }

    // YYYY-MM-DD
    const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        const d = new Date(year, month, day);
        return { isDate: true, date: d, format: 'YYYY-MM-DD' };
      }
    }

    return { isDate: false };
  }

  /**
   * Normalize an extracted cell or text token into a typed, structured NormalizedCellData
   */
  normalize(rawText: string, confidence = 100): NormalizedCellData {
    if (!rawText || rawText.trim().length === 0) {
      return {
        rawText: '',
        normalizedValue: null,
        type: 'empty',
        confidence,
      };
    }

    const trimmed = rawText.trim();

    // 1. Guard against converting codes / identifiers
    if (this.isIdentifierOrCode(trimmed)) {
      return {
        rawText: trimmed,
        normalizedValue: trimmed,
        type: 'text',
        confidence,
      };
    }

    // 2. Dates
    const dateRes = this.parseDate(trimmed);
    if (dateRes.isDate && dateRes.date) {
      return {
        rawText: trimmed,
        normalizedValue: dateRes.date,
        type: 'date',
        dateFormat: dateRes.format,
        confidence,
      };
    }

    // 3. Percentages
    const percentageMatch = this.convertGujaratiNumerals(trimmed).match(/^(-?\d+(\.\d+)?)\s*%/);
    if (percentageMatch) {
      const num = parseFloat(percentageMatch[1]);
      if (!isNaN(num)) {
        return {
          rawText: trimmed,
          normalizedValue: num / 100,
          type: 'percentage',
          confidence,
        };
      }
    }

    // 4. Currency and numeric parsing
    let converted = this.convertGujaratiNumerals(trimmed);
    let currencySymbol: string | undefined;
    let isNegative = false;

    // Detect currency prefixes / suffixes
    if (/[₹]|Rs\.?|INR/i.test(converted)) {
      if (converted.includes('₹')) currencySymbol = '₹';
      else currencySymbol = 'Rs.';
      converted = converted.replace(/[₹$€£]|Rs\.?|INR/gi, '').trim();
    }

    // Accounting parenthesis negative: "(500.00)" -> "-500.00"
    if (/^\(.*\)$/.test(converted)) {
      isNegative = true;
      converted = '-' + converted.slice(1, -1).trim();
    } else if (converted.startsWith('-')) {
      isNegative = true;
    }

    // Remove thousands formatting commas and spaces
    const cleanNum = converted.replace(/,/g, '').replace(/\s+/g, '');

    // Check if cleanNum is a strict number
    if (/^-?\d+(\.\d+)?$/.test(cleanNum)) {
      const val = parseFloat(cleanNum);
      if (!isNaN(val)) {
        const isCommaGrouped = /,\d{2,3}/.test(trimmed);
        const isCurr =
          currencySymbol !== undefined ||
          isNegative ||
          isCommaGrouped ||
          /Amt|Gross|Net|Pay|Salary|Total|Rate|રકમ|પગાર|ભથ્થું/i.test(trimmed);
        return {
          rawText: trimmed,
          normalizedValue: val,
          type: isCurr ? 'currency' : 'number',
          currencySymbol: currencySymbol || (isCurr ? '₹' : undefined),
          isNegative,
          confidence,
        };
      }
    }

    // 5. Default: Plain text (Gujarati / English / Mixed)
    return {
      rawText: trimmed,
      normalizedValue: trimmed,
      type: 'text',
      confidence,
    };
  }
}

export const dataNormalizationService = new DataNormalizationService();

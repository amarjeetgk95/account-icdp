import { describe, it, expect } from 'vitest';
import { officeDetailsSchema, financialYearSchema } from './settings.schema';

describe('officeDetailsSchema', () => {
  it('validates valid office details', () => {
    const result = officeDetailsSchema.safeParse({
      officeName: 'Test Office',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@example.com',
      gst: '22AAAAA0000A1Z5',
      tan: 'ABCDE1234F',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = officeDetailsSchema.safeParse({
      officeName: 'Test',
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty strings as defaults', () => {
    const result = officeDetailsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.officeName).toBe('');
      expect(result.data.address).toBe('');
    }
  });
});

describe('financialYearSchema', () => {
  it('validates valid financial year', () => {
    const result = financialYearSchema.safeParse({ newYear: 2025 });
    expect(result.success).toBe(true);
  });

  it('rejects year below 2000', () => {
    const result = financialYearSchema.safeParse({ newYear: 1999 });
    expect(result.success).toBe(false);
  });

  it('rejects year above 2100', () => {
    const result = financialYearSchema.safeParse({ newYear: 2101 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer year', () => {
    const result = financialYearSchema.safeParse({ newYear: 2025.5 });
    expect(result.success).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { employeeSchema, officeDetailsSchema, financialYearSchema } from './settings.schema';

describe('employeeSchema', () => {
  it('validates valid employee input', () => {
    const result = employeeSchema.safeParse({
      name: 'John Doe',
      pan: 'ABCDE1234F',
      joinDate: '2025-04-01',
      transferDate: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = employeeSchema.safeParse({
      name: '',
      pan: 'ABCDE1234F',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid PAN format', () => {
    const result = employeeSchema.safeParse({
      name: 'John Doe',
      pan: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects join date after transfer date', () => {
    const result = employeeSchema.safeParse({
      name: 'John Doe',
      pan: 'ABCDE1234F',
      joinDate: '2025-06-01',
      transferDate: '2025-04-01',
    });
    expect(result.success).toBe(false);
  });

  it('normalizes name whitespace', () => {
    const result = employeeSchema.safeParse({
      name: '  John   Doe  ',
      pan: 'ABCDE1234F',
    });
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
    }
  });

  it('converts PAN to uppercase', () => {
    const result = employeeSchema.safeParse({
      name: 'John Doe',
      pan: 'abcde1234f',
    });
    if (result.success) {
      expect(result.data.pan).toBe('ABCDE1234F');
    }
  });
});

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

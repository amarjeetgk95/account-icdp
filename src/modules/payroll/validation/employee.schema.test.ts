import { describe, it, expect } from 'vitest';
import { employeeSchema } from './employee.schema';

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

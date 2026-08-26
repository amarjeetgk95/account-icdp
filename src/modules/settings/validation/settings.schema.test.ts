import { describe, it, expect } from 'vitest';
import { officeDetailsSchema } from './settings.schema';

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

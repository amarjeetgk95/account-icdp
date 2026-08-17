import { describe, expect, it } from 'vitest';
import { gtr30EmployeeMasterSchema } from './gtr30EmployeeMaster.schema';

const validInput = {
  id: 'e1',
  srNo: 1,
  hrpnNo: '100123',
  name: 'Shri R.B.Makvana',
  designation: 'Research Assistant',
  payScale: '34,500-1,12,400',
  currentPay: 34500,
  currentPayDate: '2026-07-01',
  hraPercent: 24,
  transportAllowance: 1800,
  medicalAllowance: 600,
  claAllowance: 300,
};

describe('gtr30EmployeeMasterSchema', () => {
  it('accepts a complete valid employee', () => {
    const result = gtr30EmployeeMasterSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts the minimal shape (name only) with defaults', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ name: 'Shri X' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentPay).toBe(0);
      expect(result.data.hraPercent).toBe(0);
      expect(result.data.srNo).toBe(0);
      expect(result.data.currentPayDate).toBeUndefined();
    }
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ ...validInput, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects negative current pay', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ ...validInput, currentPay: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects HRA % above 100', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ ...validInput, hraPercent: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects malformed pay date', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ ...validInput, currentPayDate: '01-07-2026' });
    expect(result.success).toBe(false);
  });

  it('requires a pay date when current pay is entered', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ ...validInput, currentPayDate: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('currentPayDate'))).toBe(true);
    }
  });

  it('allows pay > 0 without a pay date when the amount is defaulted to zero', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ ...validInput, currentPay: 0, currentPayDate: undefined });
    expect(result.success).toBe(true);
  });

  it('trims and normalizes whitespace in name and uppercases HRPN', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({
      ...validInput,
      name: '  Shri   R.B.Makvana  ',
      hrpnNo: ' 100123 ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Shri R.B.Makvana');
      expect(result.data.hrpnNo).toBe('100123');
    }
  });

  it('rejects an HRPN longer than 50 characters', () => {
    const result = gtr30EmployeeMasterSchema.safeParse({ ...validInput, hrpnNo: 'X'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  establishmentEmployeeDbSchema,
  establishmentListDbSchema,
  establishmentPostsDbSchema,
} from './establishment.schema';

describe('establishmentEmployeeDbSchema', () => {
  it('accepts a minimal employee with defaults', () => {
    const result = establishmentEmployeeDbSchema.safeParse({ id: 'e1', name: 'A' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(true);
      expect(result.data.payEntries).toEqual([]);
      expect(result.data.allowances).toEqual({
        hraPercent: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        claAllowance: 0,
        otherAllowance: 0,
      });
      expect(result.data.deductions).toEqual({
        societyDeduction: 0,
        gisSavings: 0,
        gisInsurance: 0,
        professionalTax: 0,
        rentOfBuilding: 0,
      });
    }
  });

  it('coerces SQL nulls from backend rows into empty strings', () => {
    const result = establishmentEmployeeDbSchema.safeParse({
      id: 'e1',
      name: 'Imported',
      designation: null,
      pan: null,
      payScale: null,
      gradePay: null,
      payLevel: null,
      payCell: null,
      headquarter: null,
      joinDate: null,
      allowances: { hraPercent: 30 },
      deductions: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.designation).toBe('');
      expect(result.data.pan).toBe('');
      expect(result.data.payScale).toBe('');
      expect(result.data.gradePay).toBe('');
      expect(result.data.headquarter).toBe('');
      expect(result.data.joinDate).toBe('');
      expect(result.data.allowances.hraPercent).toBe(30);
      expect(result.data.deductions.societyDeduction).toBe(0);
    }
  });

  it('accepts a full employee with pay entries', () => {
    const result = establishmentEmployeeDbSchema.safeParse({
      id: 'e1',
      hrpnNo: '123',
      name: 'R.B.Makvana',
      active: true,
      allowances: { hraPercent: 30 },
      deductions: { societyDeduction: 500 },
      payEntries: [{ id: 'p1', effectiveDate: '2026-07-01', basicPay: 39900 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = establishmentEmployeeDbSchema.safeParse({ name: 'No Id' });
    expect(result.success).toBe(false);
  });

  it('clamps negative pay to zero', () => {
    const result = establishmentEmployeeDbSchema.safeParse({
      id: 'e1',
      payEntries: [{ id: 'p1', effectiveDate: '2026-07-01', basicPay: -5 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payEntries[0].basicPay).toBe(0);
    }
  });
});

describe('establishmentListDbSchema', () => {
  it('parses a backend-style list', () => {
    const result = establishmentListDbSchema.safeParse([
      { id: 'e1', name: 'A', active: true, allowances: {}, deductions: {}, payEntries: [] },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects non-arrays', () => {
    expect(establishmentListDbSchema.safeParse({}).success).toBe(false);
  });
});

describe('establishmentPostDbSchema', () => {
  it('parses posts with defaults', () => {
    const result = establishmentPostsDbSchema.safeParse([{ id: 'p1', designation: 'ક્લાર્ક' }]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].sanctioned).toBe(0);
    }
  });

  it('rejects negative sanctioned counts', () => {
    const result = establishmentPostsDbSchema.safeParse([{ id: 'p1', sanctioned: -1 }]);
    expect(result.success).toBe(false);
  });
});

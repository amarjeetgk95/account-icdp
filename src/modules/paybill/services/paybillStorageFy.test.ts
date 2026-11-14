import { describe, it, expect, vi } from 'vitest';
import {
  paybillStorageService,
  resolvePaybillFinancialYear,
} from './paybillStorage.service';

vi.mock('@/core/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: { getState: () => ({ user: null }) },
}));

vi.mock('@/modules/payroll/services/employee.service', () => ({
  employeeService: { listEmployees: async () => [] },
}));

vi.mock('@/modules/establishment/services/establishment.service', () => ({
  establishmentService: { loadEmployees: () => [] },
}));

vi.mock('./componentMaster.service', () => ({
  componentMasterService: {},
}));

describe('resolvePaybillFinancialYear', () => {
  it('keeps April-December in the named year', () => {
    expect(resolvePaybillFinancialYear('April', 2026)).toBe(2026);
    expect(resolvePaybillFinancialYear('July', 2026)).toBe(2026);
    expect(resolvePaybillFinancialYear('December', 2026)).toBe(2026);
  });

  it('puts March in the named year (paid in April = first month of the FY)', () => {
    expect(resolvePaybillFinancialYear('March', 2026)).toBe(2026);
  });

  it('moves January/February to the previous FY (paid in Feb/March)', () => {
    expect(resolvePaybillFinancialYear('January', 2026)).toBe(2025);
    expect(resolvePaybillFinancialYear('February', 2026)).toBe(2025);
  });

  it('handles December paid in January of the next calendar year', () => {
    expect(resolvePaybillFinancialYear('December', 2026)).toBe(2026);
  });
});

describe('parseMonthAndFy', () => {
  it('parses March-2026 into FY 2026 (paid April-2026, first month of FY)', () => {
    expect(paybillStorageService.parseMonthAndFy('March-2026')).toEqual({
      month: 'March',
      financialYear: 2026,
    });
  });

  it('parses January/February into the previous FY', () => {
    expect(paybillStorageService.parseMonthAndFy('January-2026')).toEqual({
      month: 'January',
      financialYear: 2025,
    });
    expect(paybillStorageService.parseMonthAndFy('February-2026')).toEqual({
      month: 'February',
      financialYear: 2025,
    });
  });

  it('keeps April-December in the named year', () => {
    expect(paybillStorageService.parseMonthAndFy('July-2026')).toEqual({
      month: 'July',
      financialYear: 2026,
    });
    expect(paybillStorageService.parseMonthAndFy('April-2026')).toEqual({
      month: 'April',
      financialYear: 2026,
    });
    expect(paybillStorageService.parseMonthAndFy('December-2026')).toEqual({
      month: 'December',
      financialYear: 2026,
    });
  });

  it('handles numeric and spaced labels', () => {
    expect(paybillStorageService.parseMonthAndFy('01/2026')).toEqual({
      month: 'January',
      financialYear: 2025,
    });
    expect(paybillStorageService.parseMonthAndFy('March 2026')).toEqual({
      month: 'March',
      financialYear: 2026,
    });
  });
});

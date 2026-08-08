import { describe, it, expect } from 'vitest';
import { parseCurrencyCell, parseSalaryExcel, parseMonthYear } from '../utils/salaryParser';

describe('parseCurrencyCell', () => {
  it('parses Indian currency with ₹ and commas', () => {
    expect(parseCurrencyCell('₹30,000').value).toBe(30000);
    expect(parseCurrencyCell('12,000').value).toBe(12000);
    expect(parseCurrencyCell('₹ 1,23,456.50').value).toBe(123456.5);
  });
  it('parses plain numbers', () => {
    expect(parseCurrencyCell(12345).value).toBe(12345);
    expect(parseCurrencyCell(12345).valid).toBe(true);
  });
  it('rejects empty and non-numeric values', () => {
    expect(parseCurrencyCell('').valid).toBe(false);
    expect(parseCurrencyCell('-').valid).toBe(false);
    expect(parseCurrencyCell('N/A').valid).toBe(false);
  });
});

describe('parseMonthYear', () => {
  it('parses mmm-yy and derives financial year', () => {
    expect(parseMonthYear('Aug-25 (Paid in Aug-25) GROSS')).toEqual({
      month: 'August',
      financialYear: 2025,
      monthNum: 8,
    });
    const jan = parseMonthYear('Jan-26');
    expect(jan).toBeTruthy();
    expect(jan!.financialYear).toBe(2025);
    expect(jan!.month).toBe('January');
    const mar = parseMonthYear('Mar-25');
    expect(mar).toBeTruthy();
    expect(mar!.financialYear).toBe(2024);
  });
});

describe('parseSalaryExcel', () => {
  it('parses a combined-header table with multiple months', () => {
    const rows = [
      ['S.No', 'HRPN No.', 'Employee Name', 'Aug-25 (Paid in Aug-25) GROSS', 'Aug-25 (Paid in Aug-25) INCOME TAX', 'Sep-25 GROSS', 'Sep-25 INCOME TAX'],
      ['1', '100123', 'Employee A', '₹30,000', '12,000', '31,000', '12,500'],
      ['2', '100456', 'Employee B', '35,000', '14,000', '-', '15,000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.hrpnColumnHeader).toBe('HRPN No.');
    expect(result.monthColumns.length).toBe(4);
    expect(result.distinctHrpnCount).toBe(2);
    expect(result.dataRowCount).toBe(2);

    const key = (m: string, fy: number, hrpn: string) => `${hrpn}|${m}|${fy}`;
    const byKey = new Map(result.records.map((r) => [key(r.month, r.financialYear, r.hprnNo), r]));

    const augA = byKey.get(key('August', 2025, '100123'));
    expect(augA).toBeTruthy();
    expect(augA!.grossSalary).toBe(30000);
    expect(augA!.incomeTax).toBe(12000);

    const sepA = byKey.get(key('September', 2025, '100123'));
    expect(sepA).toBeTruthy();
    expect(sepA!.grossSalary).toBe(31000);
    expect(sepA!.incomeTax).toBe(12500);

    // Employee B Sep row is missing Gross -> invalid
    expect(result.invalidCount).toBe(1);
    expect(byKey.get(key('September', 2025, '100456'))).toBeUndefined();
  });

  it('parses a simple label/value table', () => {
    const rows = [
      ['HRPN No.', 'Name', 'Aug-25 GROSS', 'Aug-25 INCOME TAX'],
      ['100123', 'Employee A', '30,000', '12,000'],
      ['100456', 'Employee B', '35,000', '14,000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(2);
    expect(result.records[0]).toMatchObject({ hprnNo: '100123', month: 'August', financialYear: 2025, grossSalary: 30000, incomeTax: 12000 });
    expect(result.monthColumns.length).toBe(2);
  });

  it('flags duplicate (HRPN, month) entries', () => {
    const rows = [
      ['HRPN No.', 'Name', 'Aug-25 GROSS', 'Aug-25 INCOME TAX'],
      ['100123', 'A', '30,000', '12,000'],
      ['100123', 'A', '31,000', '12,500'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.duplicateCount).toBe(1);
    expect(result.records.length).toBe(1);
  });

  it('flags non-numeric salary values as invalid', () => {
    const rows = [
      ['HRPN No.', 'Name', 'Aug-25 GROSS', 'Aug-25 INCOME TAX'],
      ['100123', 'A', 'abc', '12,000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.invalidCount).toBe(1);
    expect(result.records.length).toBe(0);
  });

  it('returns empty result when no month header is found', () => {
    const rows = [['HRPN No.', 'Name'], ['100123', 'A']];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(0);
    expect(result.monthColumns.length).toBe(0);
  });

  it('computes financial year across the April boundary', () => {
    const rows = [
      ['HRPN No.', 'Name', 'Mar-25 GROSS', 'Mar-25 INCOME TAX'],
      ['100123', 'A', '30,000', '12,000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records[0].financialYear).toBe(2024);
  });
});

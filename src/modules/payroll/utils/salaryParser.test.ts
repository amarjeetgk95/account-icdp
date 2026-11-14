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
  it('maps the work month in the header to its payment slot (next month)', () => {
    // "Aug-25" = August work, paid in September (slot "September").
    expect(parseMonthYear('Aug-25 (Paid in Aug-25) GROSS')).toEqual({
      month: 'September',
      financialYear: 2025,
      monthNum: 9,
    });
    const jan = parseMonthYear('Jan-26'); // Jan-26 work, paid in Feb-26
    expect(jan).toBeTruthy();
    expect(jan!.financialYear).toBe(2025);
    expect(jan!.month).toBe('February');
    const mar = parseMonthYear('Mar-25'); // Mar-25 work, paid in Apr-25
    expect(mar).toBeTruthy();
    expect(mar!.financialYear).toBe(2025);
    expect(mar!.month).toBe('April');
    const dec = parseMonthYear('Dec-25'); // Dec-25 work, paid in Jan-26
    expect(dec).toBeTruthy();
    expect(dec!.financialYear).toBe(2025);
    expect(dec!.month).toBe('January');
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

    // Aug-25 work is paid in the September slot.
    const augA = byKey.get(key('September', 2025, '100123'));
    expect(augA).toBeTruthy();
    expect(augA!.grossSalary).toBe(30000);
    expect(augA!.incomeTax).toBe(12000);

    // Sep-25 work is paid in the October slot.
    const sepA = byKey.get(key('October', 2025, '100123'));
    expect(sepA).toBeTruthy();
    expect(sepA!.grossSalary).toBe(31000);
    expect(sepA!.incomeTax).toBe(12500);

    // Employee B Sep row is missing Gross -> invalid
    expect(result.invalidCount).toBe(1);
    expect(byKey.get(key('October', 2025, '100456'))).toBeUndefined();
  });

  it('parses a simple label/value table', () => {
    const rows = [
      ['HRPN No.', 'Name', 'Aug-25 GROSS', 'Aug-25 INCOME TAX'],
      ['100123', 'Employee A', '30,000', '12,000'],
      ['100456', 'Employee B', '35,000', '14,000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(2);
    // Aug-25 work is paid in the September slot.
    expect(result.records[0]).toMatchObject({ hprnNo: '100123', month: 'September', financialYear: 2025, grossSalary: 30000, incomeTax: 12000 });
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
    // Mar-25 work is paid in the April-25 slot (FY 2025-26).
    expect(result.records[0].month).toBe('April');
    expect(result.records[0].financialYear).toBe(2025);
  });

  it('recognises TDS as the income-tax column (month-year headers)', () => {
    const rows = [
      ['Sr', 'HPRN No', 'Name', 'Aug-25 Gross', 'Aug-25 TDS'],
      ['1', '100123', 'Employee A', '30000', '5000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.monthColumns.length).toBe(2);
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({ hprnNo: '100123', grossSalary: 30000, incomeTax: 5000 });
  });

  it('recognises the HPRN spelling variant for the identity column', () => {
    const rows = [
      ['HPRN', 'Name', 'Aug-25 GROSS', 'Aug-25 TDS'],
      ['100123', 'A', '30000', '5000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.hrpnColumnHeader).toBe('HPRN');
    expect(result.records.length).toBe(1);
  });

  it('parses single-month bare Gross/TDS files via fallback month/FY', () => {
    const rows = [
      ['HPRN No.', 'Employee Name', 'Gross', 'TDS'],
      ['100123', 'Employee A', '40000', '6000'],
    ];
    const result = parseSalaryExcel(rows, { fallbackMonth: 'August', fallbackFinancialYear: 2025 });
    expect(result.monthColumns.length).toBe(2);
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({ month: 'August', financialYear: 2025, grossSalary: 40000, incomeTax: 6000 });
  });

  it('parses month-only headers using the fallback financial year', () => {
    const rows = [
      ['HRPN No.', 'Name', 'August Gross', 'August TDS'],
      ['100123', 'A', '40000', '6000'],
    ];
    const result = parseSalaryExcel(rows, { fallbackFinancialYear: 2025 });
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({ financialYear: 2025, grossSalary: 40000, incomeTax: 6000 });
  });

  it('imports TDS-only files defaulting gross to 0', () => {
    const rows = [
      ['HPRN', 'Name', 'Aug-25 TDS'],
      ['100123', 'A', '5000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({ grossSalary: 0, incomeTax: 5000 });
  });

  it('prefers an explicit HRPN column over an earlier GPF column', () => {
    // Karmayogi payout sheets carry BOTH identities — keying records by GPF
    // numbers yields 0 register matches ("import saves nothing").
    const rows = [
      ['Sr', 'GPF No', 'Employee Name', 'HRPN No.', 'Aug-25 GROSS', 'Aug-25 TDS'],
      ['1', 'GPF001', 'Employee A', '100123', '30000', '5000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.hrpnColumnHeader).toBe('HRPN No.');
    expect(result.records.length).toBe(1);
    expect(result.records[0].hprnNo).toBe('100123');
  });

  it("parses apostrophe year headers (Aug'25) with the payment-slot shift", () => {
    const rows = [
      ['HPRN No', 'Name', "Aug'25 Gross", "Aug'25 TDS"],
      ['100123', 'A', '30000', '5000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(1);
    // Aug-25 work is paid in the September slot, same as "Aug-25" headers.
    expect(result.records[0]).toMatchObject({ month: 'September', financialYear: 2025 });
  });

  it('captures the PAN column for fallback matching', () => {
    const rows = [
      ['HRPN No.', 'Name', 'PAN', 'Aug-25 GROSS', 'Aug-25 TDS'],
      ['100123', 'Employee A', 'ABCDE1234F', '40000', '6000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(1);
    expect(result.records[0].pan).toBe('ABCDE1234F');
  });

  it('does not mistake "Company Name" for a PAN column', () => {
    const rows = [
      ['HRPN No.', 'Company Name', 'Aug-25 GROSS', 'Aug-25 TDS'],
      ['100123', 'Acme', '40000', '6000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(1);
    expect(result.records[0].pan).toBeUndefined();
  });

  it('prefers "Employee Name" over an earlier "DDO Name" column', () => {
    const rows = [
      ['HRPN No.', 'DDO Name', 'Employee Name', 'Aug-25 GROSS', 'Aug-25 TDS'],
      ['100123', 'DDO X', 'Employee A', '40000', '6000'],
    ];
    const result = parseSalaryExcel(rows);
    expect(result.records.length).toBe(1);
    expect(result.records[0].name).toBe('Employee A');
  });
});

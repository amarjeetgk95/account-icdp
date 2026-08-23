import { describe, expect, it } from 'vitest';
import {
  exportMasterToCsv,
  importMasterFromCsv,
  generateSampleCsvTemplate,
  parseCsvLine,
} from './gtr30Csv';
import type { GTR30EmployeeMaster } from '../types';

const SAMPLE_EMPLOYEES: GTR30EmployeeMaster[] = [
  {
    id: 'emp-1',
    srNo: 1,
    hrpnNo: '100123',
    name: 'Shri R.B. Makvana',
    designation: 'Research Assistant',
    designationGujarati: 'સંશોધન મદદનીશ',
    cadreClass: '૩',
    payScale: '34,500-1,12,400',
    gradePay: 'GP:4200',
    payLevelCell: 'PAY=39900 (LEVEL CELL-7)',
    ppaNo: 'Applied',
    currentPay: 39900,
    currentPayDate: '2026-07-01',
    quarterAddress: 'H-7, Government Quarters, Khatodara, Surat',
    insuranceGroup: 'ખ',
    insuranceType: 'savings_and_insurance',
    hraPercent: 18,
    da: 21147,
    transportAllowance: 3600,
    medicalAllowance: 1000,
    claAllowance: 270,
    rentOfBuilding: 300,
    professionalTax: 200,
    gis1981Insurance: 240,
    gis1981Savings: 560,
    npsPension: 6105,
    societyDeduction: 4154,
    remarks: 'Regular post',
  },
];

describe('gtr30Csv', () => {
  describe('parseCsvLine', () => {
    it('parses comma-separated values including quoted commas', () => {
      const line = '1,100123,"Shri R.B. Makvana","H-7, Govt Quarters",39900';
      const parsed = parseCsvLine(line);
      expect(parsed).toEqual(['1', '100123', 'Shri R.B. Makvana', 'H-7, Govt Quarters', '39900']);
    });
  });

  describe('exportMasterToCsv and importMasterFromCsv roundtrip', () => {
    it('exports master employees to CSV string', () => {
      const csv = exportMasterToCsv(SAMPLE_EMPLOYEES);
      expect(csv).toContain('Shri R.B. Makvana');
      expect(csv).toContain('H-7, Government Quarters, Khatodara, Surat');
      expect(csv).toContain('39900');
      expect(csv).toContain('સંશોધન મદદનીશ');
    });

    it('parses exported CSV back into employee partials with new return shape', () => {
      const csv = exportMasterToCsv(SAMPLE_EMPLOYEES);
      const result = importMasterFromCsv(csv);
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe('Shri R.B. Makvana');
      expect(result.employees[0].currentPay).toBe(39900);
      expect(result.employees[0].quarterAddress).toBe('H-7, Government Quarters, Khatodara, Surat');
      expect(result.employees[0].designationGujarati).toBe('સંશોધન મદદનીશ');
      expect(result.employees[0].insuranceGroup).toBe('ખ');
      expect(result.skippedRows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns empty result when CSV is empty or only header', () => {
      expect(importMasterFromCsv('')).toEqual({ employees: [], skippedRows: 0, errors: [] });
      expect(importMasterFromCsv('Sr No,Name,Current Pay')).toEqual({ employees: [], skippedRows: 0, errors: [] });
    });

    it('generates a valid sample template', () => {
      const template = generateSampleCsvTemplate();
      const result = importMasterFromCsv(template);
      expect(result.employees.length).toBeGreaterThan(0);
      expect(result.employees[0].name).toBeTruthy();
    });

    it('handles multi-line quoted fields correctly', () => {
      const csv = `Sr No,Employee Name,Quarter Address\n1,"Test Employee","Line 1\nLine 2\nLine 3"`;
      const result = importMasterFromCsv(csv);
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe('Test Employee');
      expect(result.employees[0].quarterAddress).toBe('Line 1\nLine 2\nLine 3');
    });

    it('skips rows with missing or too short name', () => {
      const csv = `Sr No,Employee Name,Current Pay,Current Pay Date\n1,Valid Employee,30000,2026-07-01\n2,A,25000,2026-07-01\n3,,20000,2026-07-01`;
      const result = importMasterFromCsv(csv);
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe('Valid Employee');
      expect(result.skippedRows).toBe(2);
    });

    it('does not inject fabricated default values for missing columns', () => {
      const csv = `Sr No,Employee Name,Current Pay,Current Pay Date\n1,Test Employee,30000,2026-07-01`;
      const result = importMasterFromCsv(csv);
      expect(result.employees).toHaveLength(1);
      const emp = result.employees[0];
      expect(emp.cadreClass).toBe('');
      expect(emp.payScale).toBe('');
      expect(emp.gradePay).toBe('');
      expect(emp.ppaNo).toBe('');
      expect(emp.insuranceGroup).toBe('');
    });

    it('uses monthKey for DA rate resolution', () => {
      const csv = `Sr No,Employee Name,Current Pay,Current Pay Date\n1,Test Employee,30000,2026-07-01`;
      const result = importMasterFromCsv(csv, 'July-2026');
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].da).toBeGreaterThan(0);
    });

    it('reports validation errors in errors array', () => {
      const csv = `Sr No,Employee Name,Current Pay,Current Pay Date\n1,Test Employee,30000,invalid-date`;
      const result = importMasterFromCsv(csv);
      expect(result.employees).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.skippedRows).toBe(1);
    });
  });
});
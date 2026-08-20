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

    it('parses exported CSV back into employee partials', () => {
      const csv = exportMasterToCsv(SAMPLE_EMPLOYEES);
      const imported = importMasterFromCsv(csv);
      expect(imported).toHaveLength(1);
      expect(imported[0].name).toBe('Shri R.B. Makvana');
      expect(imported[0].currentPay).toBe(39900);
      expect(imported[0].quarterAddress).toBe('H-7, Government Quarters, Khatodara, Surat');
      expect(imported[0].designationGujarati).toBe('સંશોધન મદદનીશ');
      expect(imported[0].insuranceGroup).toBe('ખ');
    });

    it('returns empty array when CSV is empty or only header', () => {
      expect(importMasterFromCsv('')).toEqual([]);
      expect(importMasterFromCsv('Sr No,Name,Current Pay')).toEqual([]);
    });

    it('generates a valid sample template', () => {
      const template = generateSampleCsvTemplate();
      const parsed = importMasterFromCsv(template);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].name).toBeTruthy();
    });
  });
});

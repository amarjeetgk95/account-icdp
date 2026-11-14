import { describe, it, expect } from 'vitest';
import { paybillValidationService } from './paybillValidation.service';
import type { PayBillExtractedRecord, PayBillTotalRow } from '../types';

describe('PayBillValidationService', () => {
  const sampleRecords: PayBillExtractedRecord[] = [
    {
      id: '1',
      row: {
        hrpn: '20013826',
        employeeName: 'Dr. Dineshbhai',
        designation: 'Deputy Director',
        payScale: 'PB-3',
        ph: 'No',
        slo: 'P',
        basicPay: 105600,
        da: 76032,
        hra: 16896,
        cla: 270,
        medicalAllowance: 1000,
        transportAllowance: 7200,
        nonPrivatePracticeAllowance: 21120,
        grossAmount: 228118,
      },
      mappingStatus: 'MATCHED',
      validationStatus: 'VALID',
      errors: [],
      warnings: [],
      normalizedString: '',
    },
    {
      id: '2',
      row: {
        hrpn: '20014113',
        employeeName: 'Dr. Hitendrabhai',
        designation: 'Assistant Director',
        payScale: 'PB-2',
        ph: 'No',
        slo: 'P',
        basicPay: 117800,
        da: 84816,
        hra: 18848,
        cla: 270,
        medicalAllowance: 1000,
        transportAllowance: 7200,
        nonPrivatePracticeAllowance: 23560,
        grossAmount: 253494,
      },
      mappingStatus: 'MATCHED',
      validationStatus: 'VALID',
      errors: [],
      warnings: [],
      normalizedString: '',
    },
  ];

  it('should validate correct records without errors', () => {
    const validated = paybillValidationService.validateRecords(sampleRecords);
    expect(validated[0].errors).toHaveLength(0);
    expect(validated[0].validationStatus).toBe('VALID');
    expect(validated[1].errors).toHaveLength(0);
    expect(validated[1].validationStatus).toBe('VALID');
  });

  it('should flag math error when gross amount does not equal sum of allowances', () => {
    const faultyRecord: PayBillExtractedRecord = {
      ...sampleRecords[0],
      row: {
        ...sampleRecords[0].row,
        grossAmount: 300000, // Incorrect gross
      },
    };

    const validated = paybillValidationService.validateRecords([faultyRecord]);
    expect(validated[0].errors.length).toBeGreaterThan(0);
    expect(validated[0].validationStatus).toBe('ERROR');
    expect(validated[0].errors[0]).toContain('does not match sum of allowances');
  });

  it('should reconcile matching totals correctly', () => {
    const pdfTotals: PayBillTotalRow = {
      basicPay: 223400,
      da: 160848,
      hra: 35744,
      cla: 540,
      medicalAllowance: 2000,
      transportAllowance: 14400,
      nonPrivatePracticeAllowance: 44680,
      grossAmount: 481612,
    };

    const rec = paybillValidationService.reconcile(sampleRecords, pdfTotals);
    expect(rec.isGrossMatched).toBe(true);
    expect(rec.status).toBe('MATCHED');
    expect(rec.diff).toBe(0);
  });

  it('should detect mismatch when pdf total differs from sum of rows', () => {
    const pdfTotals: PayBillTotalRow = {
      basicPay: 223400,
      da: 160848,
      hra: 35744,
      cla: 540,
      medicalAllowance: 2000,
      transportAllowance: 14400,
      nonPrivatePracticeAllowance: 44680,
      grossAmount: 500000, // Mismatched PDF Total
    };

    const rec = paybillValidationService.reconcile(sampleRecords, pdfTotals);
    expect(rec.isGrossMatched).toBe(false);
    expect(rec.status).toBe('MISMATCH');
    expect(rec.message).toContain('WARNING');
  });
});

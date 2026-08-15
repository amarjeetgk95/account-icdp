import { describe, it, expect } from 'vitest';
import { paybillAuditService } from './paybillAudit.service';
import type { PayBillParsedResult, PayBillExtractedRecord } from '../types';

describe('PayBillAuditService', () => {
  it('should compute DA percentage and detect 7th Pay DA rate', () => {
    const mockParsed: PayBillParsedResult = {
      sheetType: 'EARNING',
      metadata: {
        month: 'July-2026',
        ddoHrpn: '20105451',
        ddoName: 'Director',
        officeName: 'ICDP Surat',
        billNo: 'Srt0299002201',
        majorHead: '2403-00-101-02-00',
        ddoCode: '0299',
        department: 'Agriculture',
        tanNo: 'TAN123',
        cardexNo: 'CDX123',
        address: 'Surat',
        mobileNo: '9909913660',
      },
      rows: [
        {
          srNo: 1,
          hrpn: '20105536',
          employeeName: 'Shri.Amarjeet Kathodi',
          designation: 'Accountant',
          payScale: 'PB-2 (9300-34800)/4200',
          ph: 'No',
          slo: 'P',
          basicPay: 37600,
          da: 22560, // 60% DA
          hra: 6016,
          cla: 270,
          medicalAllowance: 1000,
          transportAllowance: 3600,
          nonPrivatePracticeAllowance: 0,
          grossAmount: 71046,
        },
      ],
      pdfTotals: null,
      rawText: '',
      pageCount: 1,
      parsingWarnings: [],
    };

    const mockRecords: PayBillExtractedRecord[] = [
      {
        id: 'rec-1',
        row: mockParsed.rows[0],
        mappingStatus: 'MATCHED',
        matchedEmployee: {
          id: 'emp-1',
          name: 'Shri.Amarjeet Kathodi',
          hprnNo: '20105536',
          designation: 'Accountant',
        },
        validationStatus: 'VALID',
        errors: [],
        warnings: [],
        normalizedString: 'HRPN=20105536',
      },
    ];

    const report = paybillAuditService.auditPayBill(mockParsed, mockRecords);

    expect(report.month).toBe('July-2026');
    expect(report.daPercentage).toBe(60);
    expect(report.isDaHiked).toBe(true);
    expect(report.healthyRecordCount).toBe(1);
  });

  it('should flag unmapped employees and designation promotions', () => {
    const mockParsed: PayBillParsedResult = {
      sheetType: 'EARNING',
      metadata: {
        month: 'August-2026',
        ddoHrpn: '20105451',
        ddoName: 'Director',
        officeName: 'ICDP Surat',
        billNo: 'Srt0299002202',
        majorHead: '2403-00-101-02-00',
        ddoCode: '0299',
        department: 'Agriculture',
        tanNo: 'TAN123',
        cardexNo: 'CDX123',
        address: 'Surat',
        mobileNo: '9909913660',
      },
      rows: [
        {
          srNo: 1,
          hrpn: '99999999',
          employeeName: 'New Staff Member',
          designation: 'Junior Clerk',
          payScale: 'Level-2',
          ph: 'No',
          slo: 'P',
          basicPay: 19900,
          da: 10547,
          hra: 1592,
          cla: 0,
          medicalAllowance: 1000,
          transportAllowance: 1350,
          nonPrivatePracticeAllowance: 0,
          grossAmount: 34389,
        },
      ],
      pdfTotals: null,
      rawText: '',
      pageCount: 1,
      parsingWarnings: [],
    };

    const mockRecords: PayBillExtractedRecord[] = [
      {
        id: 'rec-unmapped',
        row: mockParsed.rows[0],
        mappingStatus: 'NOT_FOUND',
        matchedEmployee: null,
        validationStatus: 'VALID',
        errors: [],
        warnings: [],
        normalizedString: 'HRPN=99999999',
      },
    ];

    const report = paybillAuditService.auditPayBill(mockParsed, mockRecords);

    expect(report.anomalies).toHaveLength(1);
    expect(report.anomalies[0].type).toBe('NEW_EMPLOYEE');
    expect(report.anomalies[0].hrpn).toBe('99999999');
  });
});

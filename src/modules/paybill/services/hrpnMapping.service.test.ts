import { describe, it, expect } from 'vitest';
import { hrpnMappingService } from './hrpnMapping.service';
import type { PayBillEmployeeRow, MasterEmployeeInfo } from '../types';

describe('HrpnMappingService', () => {
  const masterEmployees: MasterEmployeeInfo[] = [
    {
      id: 'emp-1',
      name: 'Dr. Dineshbhai Chamabhai Chaudhari',
      pan: 'ABCDE1234F',
      hprnNo: '20013826',
      designation: 'Deputy Director',
    },
    {
      id: 'emp-2',
      name: 'Dr. Hitendrabhai Manilal Patidar',
      pan: 'BCDEF2345G',
      hprnNo: '20014113',
      designation: 'Assistant Director',
    },
  ];

  it('should generate canonical normalized derived string', () => {
    const row: PayBillEmployeeRow = {
      hrpn: '20014113',
      employeeName: 'Dr. Hitendrabhai Manilal Patidar',
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
    };

    const str = hrpnMappingService.generateNormalizedString(row);
    expect(str).toBe(
      'HRPN=20014113|NAME=Dr. Hitendrabhai Manilal Patidar|BASIC=117800|DA=84816|HRA=18848|CLA=270|MEDICAL=1000|TRANSPORT=7200|NPP=23560|GROSS=253494'
    );
  });

  it('should match employee by HRPN and handle slight name variation', () => {
    const rows: PayBillEmployeeRow[] = [
      {
        hrpn: '20013826',
        employeeName: 'Shri.Dr Dineshbhai Chamabhai Chaudhari', // Has Shri.
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
    ];

    const records = hrpnMappingService.mapRows(rows, masterEmployees);
    expect(records).toHaveLength(1);
    expect(records[0].mappingStatus).toBe('MATCHED');
    expect(records[0].matchedEmployee?.id).toBe('emp-1');
  });

  it('should flag NOT_FOUND when HRPN is not in master dataset', () => {
    const rows: PayBillEmployeeRow[] = [
      {
        hrpn: '20099999',
        employeeName: 'Unknown Employee',
        designation: 'Staff',
        payScale: '',
        ph: 'No',
        slo: '',
        basicPay: 50000,
        da: 25000,
        hra: 5000,
        cla: 0,
        medicalAllowance: 1000,
        transportAllowance: 3600,
        nonPrivatePracticeAllowance: 0,
        grossAmount: 84600,
      },
    ];

    const records = hrpnMappingService.mapRows(rows, masterEmployees);
    expect(records[0].mappingStatus).toBe('NOT_FOUND');
    expect(records[0].matchedEmployee).toBeNull();
  });

  it('should flag DUPLICATE when same HRPN appears multiple times in file', () => {
    const rows: PayBillEmployeeRow[] = [
      {
        hrpn: '20014113',
        employeeName: 'Dr. Hitendrabhai Patidar',
        designation: 'Assistant Director',
        payScale: '',
        ph: 'No',
        slo: '',
        basicPay: 117800,
        da: 84816,
        hra: 18848,
        cla: 270,
        medicalAllowance: 1000,
        transportAllowance: 7200,
        nonPrivatePracticeAllowance: 23560,
        grossAmount: 253494,
      },
      {
        hrpn: '20014113',
        employeeName: 'Dr. Hitendrabhai Patidar (Duplicate)',
        designation: 'Assistant Director',
        payScale: '',
        ph: 'No',
        slo: '',
        basicPay: 117800,
        da: 84816,
        hra: 18848,
        cla: 270,
        medicalAllowance: 1000,
        transportAllowance: 7200,
        nonPrivatePracticeAllowance: 23560,
        grossAmount: 253494,
      },
    ];

    const records = hrpnMappingService.mapRows(rows, masterEmployees);
    expect(records[0].mappingStatus).toBe('DUPLICATE');
    expect(records[1].mappingStatus).toBe('DUPLICATE');
  });

  it('should flag INVALID_HRPN for malformed or missing HRPN', () => {
    const rows: PayBillEmployeeRow[] = [
      {
        hrpn: 'XYZ', // Too short
        employeeName: 'Invalid Person',
        designation: '',
        payScale: '',
        ph: 'No',
        slo: '',
        basicPay: 10000,
        da: 5000,
        hra: 1000,
        cla: 0,
        medicalAllowance: 0,
        transportAllowance: 0,
        nonPrivatePracticeAllowance: 0,
        grossAmount: 16000,
      },
    ];

    const records = hrpnMappingService.mapRows(rows, masterEmployees);
    expect(records[0].mappingStatus).toBe('INVALID_HRPN');
  });
});

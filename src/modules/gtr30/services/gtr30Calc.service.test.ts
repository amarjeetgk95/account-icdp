import { describe, it, expect, beforeEach } from 'vitest';
import { formatMoney, splitRsPs, earningsTotal, deductionsTotal, billTotals, numberToWords, formatWordsCertificate, groupInsuranceBreakdown } from './gtr30Calc.service';
import type { GTR30Employee } from '../types';

describe('gtr30Calc.service - Money Formatting', () => {
  describe('formatMoney', () => {
    it('formats zero as "0.00"', () => {
      expect(formatMoney(0)).toBe('0.00');
    });

    it('formats positive numbers with commas', () => {
      expect(formatMoney(12345.67)).toBe('12,345.67');
      expect(formatMoney(1234567.89)).toBe('12,34,567.89'); // en-IN grouping (Treasury standard)
    });

    it('formats negative numbers', () => {
      expect(formatMoney(-1234.56)).toBe('-1,234.56');
    });

    it('handles undefined as zero', () => {
      expect(formatMoney(undefined)).toBe('0.00');
    });

    it('handles null as zero', () => {
      expect(formatMoney(null)).toBe('0.00');
    });

    it('formats large amounts correctly', () => {
      expect(formatMoney(10000000)).toBe('1,00,00,000.00'); // 1 Crore
    });
  });

  describe('splitRsPs', () => {
    it('splits positive number into rupees and paise', () => {
      const result = splitRsPs(1234.56);
      expect(result.rs).toBe('1,234');
      expect(result.ps).toBe('56');
    });

    it('handles zero', () => {
      const result = splitRsPs(0);
      expect(result.rs).toBe('0');
      expect(result.ps).toBe('00');
    });

    it('handles negative numbers', () => {
      const result = splitRsPs(-1234.56);
      expect(result.rs).toBe('1,234');
      expect(result.ps).toBe('56');
    });
  });

  describe('numberToWords', () => {
    it('converts zero to "Zero"', () => {
      expect(numberToWords(0)).toBe('Zero');
    });

    it('converts small numbers', () => {
      expect(numberToWords(1)).toBe('One');
      expect(numberToWords(15)).toBe('Fifteen');
      expect(numberToWords(25)).toBe('Twenty Five');
    });

    it('converts large numbers', () => {
      expect(numberToWords(100000)).toBe('One Lakh');
      expect(numberToWords(10000000)).toBe('One Crore');
    });

    it('converts complex numbers', () => {
      expect(numberToWords(1234567)).toBe('Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven');
    });

    it('handles negative numbers', () => {
      expect(numberToWords(-1234)).toBe('One Thousand Two Hundred Thirty Four');
    });
  });

  describe('formatWordsCertificate', () => {
    it('formats certificate text', () => {
      expect(formatWordsCertificate(12345)).toBe('Rupees Twelve Thousand Three Hundred Forty Five Only');
    });
  });
});

describe('gtr30Calc.service - Employee Calculations', () => {
  let employee: GTR30Employee;

  beforeEach(() => {
    employee = {
      id: 'emp-1',
      srNo: 1,
      name: 'Test Employee',
      designation: 'Assistant',
      designationGujarati: '',
      cadreClass: '3',
      payScale: 'LEVEL-6',
      gradePay: '',
      payLevelCell: 'PAY=35400 (LEVEL-6 CELL-1)',
      ppaNo: '',
      quarterAddress: '',
      insuranceGroup: 'ખ',
      insuranceType: 'savings_and_insurance',
      payOfEstablishment: 35400,
      payOfOfficer: 0,
      da: 18762,
      hra: 7080,
      transportAllowance: 1600,
      medicalAllowance: 500,
      cla: 0,
      npsPension: 5416,
      rentOfBuilding: 2000,
      professionalTax: 200,
      gis1981Insurance: 500,
      gis1981Savings: 500,
      societyDeduction: 100,
      remarks: '',
      // Initialize other fields to 0
      nppa: 0, leaveSalary: 0, leaveEncashment: 0, dearnessPay: 0,
      otherAllowance: 0, bonus: 0, pta: 0, profSplService: 0,
      washingAllowance: 0, officeExpenseOther: 0, ca: 0,
      ropArrearsGaz: 0, ropArrearsNonGaz: 0, dpGaz: 0, dpNonGaz: 0,
      recovFestivalAdv: 0, recovFoodGrainAdv: 0, recovPay: 0, leaveSalaryAdv: 0,
      incomeTax: 0, surchargeIT: 0, housingFund: 0, policeHousing: 0,
      postalLifeInsurance: 0, bsiPremium: 0, gis1979Insurance: 0,
      aisInsurance: 0, aisSavings: 0, diviAcctInsurance: 0, diviAcctSavings: 0,
      pfDeputation: 0, govtHousingFund: 0, hba: 0, motorCarAdv: 0,
      securityDeposit: 0, iasProvidentFund: 0, gpfOtherThanClass4: 0,
      gpfDiviAcct: 0, contributoryPF: 0, gpfWorkCharged: 0, gpfRojamdar: 0,
      festivalAdv: 0, foodGrainAdv: 0, fanAdv: 0, otherConveyanceAdv: 0,
      interestOnAdv: 0, jeepRent: 0, pfAdjustableByAO: 0, recovPayLeaveSalary: 0,
      miscRecoveries: 0,
    };
  });

  describe('earningsTotal', () => {
    it('calculates total earnings', () => {
      const total = earningsTotal(employee);
      expect(total).toBeCloseTo(63342, 0); // 35400 + 18762 + 7080 + 1600 + 500
    });

    it('handles zero pay', () => {
      const zeroPayEmp = {
        ...employee,
        payOfEstablishment: 0,
        da: 0,
        hra: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
      };
      expect(earningsTotal(zeroPayEmp)).toBe(0);
    });
  });

  describe('deductionsTotal', () => {
    it('calculates total deductions', () => {
      const total = deductionsTotal(employee);
      // 5416 (NPS) + 2000 (rent) + 200 (PT) + 500 (GIS ins) + 500 (GIS sav).
      // societyDeduction is excluded here (handled separately in billTotals).
      expect(total).toBeCloseTo(8616, 0);
    });
  });

  describe('billTotals', () => {
    it('calculates bill totals correctly', () => {
      const bill = {
        ...employee,
        billRegisterNo: 'GTR-30-001',
        billDate: '2026-04-01',
        monthOf: 'April-2026',
        employees: [employee, { ...employee, id: 'emp-2', name: 'Employee 2' }],
      } as any;

      const totals = billTotals(bill);
      expect(totals.gross).toBeCloseTo(126684, 0); // 2 x 63342
      expect(totals.deductions).toBeCloseTo(17232, 0); // 2 x 8616
      expect(totals.net).toBeCloseTo(109452, 0); // 2 x (63342 - 8616)
    });
  });

  describe('groupInsuranceBreakdown', () => {
    it('groups employees by insurance group', () => {
      const employees: GTR30Employee[] = [
        { ...employee, id: 'emp-1', insuranceGroup: 'ક', gis1981Insurance: 500 },
        { ...employee, id: 'emp-2', insuranceGroup: 'ક', gis1981Insurance: 500, gis1981Savings: 500 },
        { ...employee, id: 'emp-3', insuranceGroup: 'ખ', gis1981Insurance: 300 },
      ];

      const breakdown = groupInsuranceBreakdown(employees);
      expect(breakdown.length).toBe(4); // 4 groups
    });
  });
});

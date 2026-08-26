import { describe, it, expect } from 'vitest';
import { calculateEmployeeSalary } from './gtr30SalaryCalc';
import { GTR30EmployeeMaster } from '../types/master';

describe('GTR30 Salary Calculator', () => {
  const baseEmp: GTR30EmployeeMaster = {
    id: '1',
    srNo: 1,
    name: 'Test Employee',
    designation: 'Clerk',
    payScale: 'Level 1',
    currentPay: 10000,
    hraPercent: 10,
    transportAllowance: 0,
    medicalAllowance: 0,
    claAllowance: 0
  };

  describe('calculateEmployeeSalary', () => {
    it('calculates correct salary for basic employee (only currentPay and hraPercent)', () => {
      const summary = calculateEmployeeSalary(baseEmp);
      
      expect(summary.basic).toBe(10000);
      expect(summary.da).toBe(5300); // 53% of 10000
      expect(summary.hra).toBe(1000); // 10% of 10000
      expect(summary.allowances).toBe(0);
      expect(summary.grossPay).toBe(16300); // 10000 + 5300 + 1000
      
      expect(summary.nps).toBe(1530); // 10% of (10000 + 5300)
      expect(summary.totalDeductions).toBe(1530);
      expect(summary.netTakeHome).toBe(14770); // 16300 - 1530
    });

    it('calculates correct salary with all fields set', () => {
      const emp: GTR30EmployeeMaster = {
        ...baseEmp,
        currentPay: 20000,
        hraPercent: 20,
        transportAllowance: 1000,
        medicalAllowance: 500,
        claAllowance: 200,
        rentOfBuilding: 1500,
        professionalTax: 200,
        gis1981Insurance: 100,
        gis1981Savings: 200,
        societyDeduction: 1000
      };

      const summary = calculateEmployeeSalary(emp);
      
      expect(summary.basic).toBe(20000);
      expect(summary.da).toBe(10600); // 53%
      expect(summary.hra).toBe(4000); // 20%
      expect(summary.allowances).toBe(1700); // 1000 + 500 + 200
      expect(summary.grossPay).toBe(36300); // 20000 + 10600 + 4000 + 1700
      
      expect(summary.rent).toBe(1500);
      expect(summary.professionalTax).toBe(200);
      expect(summary.gisInsurance).toBe(100);
      expect(summary.gisSavings).toBe(200);
      expect(summary.societyDeduction).toBe(1000);
      expect(summary.nps).toBe(3060); // 10% of (20000 + 10600)
      expect(summary.totalDeductions).toBe(6060); // 1500 + 200 + 100 + 200 + 1000 + 3060
      expect(summary.netTakeHome).toBe(30240); // 36300 - 6060
    });

    it('uses explicit DA and NPS when provided', () => {
      const emp: GTR30EmployeeMaster = {
        ...baseEmp,
        currentPay: 10000,
        da: 6000, // Explicit DA, not 5300
        npsPension: 2000 // Explicit NPS, not 10% of (10000 + 6000)
      };

      const summary = calculateEmployeeSalary(emp);
      
      expect(summary.da).toBe(6000);
      expect(summary.nps).toBe(2000);
      expect(summary.grossPay).toBe(17000); // 10000 + 6000 + 1000(hra)
      expect(summary.totalDeductions).toBe(2000);
      expect(summary.netTakeHome).toBe(15000); // 17000 - 2000
    });

    it('returns zero for zero pay', () => {
      const emp: GTR30EmployeeMaster = {
        ...baseEmp,
        currentPay: 0,
        hraPercent: 0
      };

      const summary = calculateEmployeeSalary(emp);
      
      expect(summary.basic).toBe(0);
      expect(summary.grossPay).toBe(0);
      expect(summary.totalDeductions).toBe(0);
      expect(summary.netTakeHome).toBe(0);
    });
  });
});

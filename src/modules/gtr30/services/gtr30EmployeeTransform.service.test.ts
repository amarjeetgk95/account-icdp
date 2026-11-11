import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gtr30EmployeeTransformService } from './gtr30EmployeeTransform.service';
import type { GTR30EmployeeMaster } from '../types';

describe('gtr30EmployeeTransform.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('masterToBillEmployee', () => {
    const masterEmployee: GTR30EmployeeMaster = {
      id: 'master-1',
      srNo: 1,
      hrpnNo: 'HRPN-001',
      name: 'Test Employee',
      designation: 'Assistant',
      designationGujarati: 'સહાયક',
      cadreClass: '૩',
      payScale: 'LEVEL-6',
      gradePay: '2800',
      payLevelCell: 'PAY=35400 (LEVEL-6 CELL-1)',
      ppaNo: 'PPA-001',
      quarterAddress: 'Quarter A-1',
      insuranceGroup: 'ક',
      insuranceType: 'savings_and_insurance',
      hraPercent: 20,
      transportAllowance: 1600,
      medicalAllowance: 500,
      claAllowance: 0,
      rentOfBuilding: 2000,
      professionalTax: 200,
      gis1981Insurance: 500,
      gis1981Savings: 500,
      npsPension: 5416,
      societyDeduction: 100,
      remarks: 'Regular employee',
      currentPay: 35400,
      da: 18762,
      payEntries: [
        {
          id: 'pay-1',
          startDate: '2026-01-01',
          basicPay: 35400,
        },
      ],
    };

    it('transforms master employee to bill employee', () => {
      const result = gtr30EmployeeTransformService.masterToBillEmployee(masterEmployee, 1);

      expect(result.id).toBeDefined();
      expect(result.masterId).toBe(masterEmployee.id);
      expect(result.name).toBe(masterEmployee.name);
      expect(result.designation).toBe(masterEmployee.designation);
      expect(result.payOfEstablishment).toBe(masterEmployee.currentPay);
      expect(result.da).toBe(masterEmployee.da);
      expect(result.transportAllowance).toBe(masterEmployee.transportAllowance);
    });

    it('calculates HRA based on percentage', () => {
      const result = gtr30EmployeeTransformService.masterToBillEmployee(masterEmployee, 1);
      expect(result.hra).toBe(7080); // 35400 * 20%
    });

    it('calculates NPS automatically if not set', () => {
      const masterWithoutNPS = { ...masterEmployee, npsPension: undefined };
      const result = gtr30EmployeeTransformService.masterToBillEmployee(masterWithoutNPS, 1);
      expect(result.npsPension).toBeCloseTo(5416, 0); // (35400 + 18762) * 10%
    });

    it('uses forced DA rate when specified', () => {
      const result = gtr30EmployeeTransformService.masterToBillEmployee(masterEmployee, 1, undefined, { daRate: 50 });
      expect(result.da).toBe(17700); // 35400 * 50%
    });

    it('overrides specific fields', () => {
      const overrides = { payOfEstablishment: 40000, da: 20000 };
      const result = gtr30EmployeeTransformService.masterToBillEmployee(masterEmployee, 1, overrides);
      expect(result.payOfEstablishment).toBe(40000);
      expect(result.da).toBe(20000);
    });

    it('creates new ID for bill employee', () => {
      const result1 = gtr30EmployeeTransformService.masterToBillEmployee(masterEmployee, 1);
      const result2 = gtr30EmployeeTransformService.masterToBillEmployee(masterEmployee, 2);
      expect(result1.id).not.toBe(result2.id);
    });
  });
});

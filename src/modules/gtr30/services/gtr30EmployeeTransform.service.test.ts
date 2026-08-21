import { describe, expect, it } from 'vitest';
import { gtr30EmployeeTransformService } from './gtr30EmployeeTransform.service';
import type { GTR30EmployeeMaster } from '../types';

const master: GTR30EmployeeMaster = {
  id: 'm1',
  srNo: 1,
  hrpnNo: 'HRPN-1',
  name: 'Shri X',
  designation: 'Officer',
  designationGujarati: 'સંશોધન મદદનીશ',
  payScale: '50000-100000',
  currentPay: 40000,
  currentPayDate: '2024-01-01',
  hraPercent: 20,
  transportAllowance: 3600,
  medicalAllowance: 1000,
  claAllowance: 270,
  rentOfBuilding: 300,
  professionalTax: 200,
  gis1981Insurance: 240,
  gis1981Savings: 560,
  societyDeduction: 4154,
  quarterAddress: 'H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat',
  insuranceGroup: 'ખ',
};

describe('gtr30EmployeeTransform.service', () => {
  it('maps a master row to a bill employee with derived HRA, DA 53%, NPS and carryover fields', () => {
    const result = gtr30EmployeeTransformService.masterToBillEmployee(master, 1);
    expect(result.name).toBe('Shri X');
    expect(result.designation).toBe('Officer');
    expect(result.designationGujarati).toBe('સંશોધન મદદનીશ');
    expect(result.payScale).toBe('50000-100000');
    expect(result.payOfEstablishment).toBe(40000);
    expect(result.hra).toBe(8000);
    expect(result.da).toBe(21200); // 53% of 40000
    expect(result.npsPension).toBe(6120); // 10% of 40000 + 21200
    expect(result.transportAllowance).toBe(3600);
    expect(result.medicalAllowance).toBe(1000);
    expect(result.cla).toBe(270);
    expect(result.rentOfBuilding).toBe(300);
    expect(result.professionalTax).toBe(200);
    expect(result.gis1981Insurance).toBe(240);
    expect(result.gis1981Savings).toBe(560);
    expect(result.societyDeduction).toBe(4154);
    expect(result.quarterAddress).toBe('H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat');
    expect(result.insuranceGroup).toBe('ખ');
    expect(result.srNo).toBe(1);
    expect(result.id).toBeTruthy();
  });

  it('keeps the srNo passed in', () => {
    const result = gtr30EmployeeTransformService.masterToBillEmployee(master, 7);
    expect(result.srNo).toBe(7);
  });

  it('master fields win over base overrides (master is authoritative)', () => {
    const result = gtr30EmployeeTransformService.masterToBillEmployee(master, 1, {
      name: 'OVERRIDE',
      payOfEstablishment: 50000,
    });
    expect(result.name).toBe('Shri X');
    expect(result.payOfEstablishment).toBe(40000);
    expect(result.hra).toBe(8000);
  });

  it('produces a fresh id every call', () => {
    const a = gtr30EmployeeTransformService.masterToBillEmployee(master, 1);
    const b = gtr30EmployeeTransformService.masterToBillEmployee(master, 2);
    expect(a.id).not.toBe(b.id);
  });

  it('handles zero HRA percent gracefully', () => {
    const zeroHra: GTR30EmployeeMaster = { ...master, hraPercent: 0 };
    const result = gtr30EmployeeTransformService.masterToBillEmployee(zeroHra, 1);
    expect(result.hra).toBe(0);
  });

  it('resolves pay from the pay matrix for a given bill month', () => {
    const withMatrix: GTR30EmployeeMaster = {
      ...master,
      payEntries: [
        { id: 'a', startDate: '2026-07-01', endDate: '2027-01-30', basicPay: 39900 },
        { id: 'b', startDate: '2027-02-01', basicPay: 42500 },
      ],
    };
    const july = gtr30EmployeeTransformService.masterToBillEmployee(withMatrix, 1, undefined, {
      monthKey: 'July-2026',
    });
    expect(july.payOfEstablishment).toBe(39900);
    expect(july.masterId).toBe('m1');

    const feb = gtr30EmployeeTransformService.masterToBillEmployee(withMatrix, 1, undefined, {
      monthKey: 'February-2027',
    });
    expect(feb.payOfEstablishment).toBe(42500);
  });

  it('day-weights the pay when a change falls mid-month', () => {
    const withMatrix: GTR30EmployeeMaster = {
      ...master,
      payEntries: [
        { id: 'a', startDate: '2026-07-01', endDate: '2027-01-30', basicPay: 39900 },
        { id: 'b', startDate: '2027-01-16', basicPay: 42500 },
      ],
    };
    const jan = gtr30EmployeeTransformService.masterToBillEmployee(withMatrix, 1, undefined, {
      monthKey: 'January-2027',
    });
    expect(jan.payOfEstablishment).toBe(41242);
    expect(jan.da).toBe(Math.round(41242 * 0.53));
  });

  it('falls back to currentPay when the matrix is empty or no month is given', () => {
    const withEmptyMatrix: GTR30EmployeeMaster = { ...master, payEntries: [] };
    const direct = gtr30EmployeeTransformService.masterToBillEmployee(withEmptyMatrix, 1);
    expect(direct.payOfEstablishment).toBe(40000);
    const withMonth = gtr30EmployeeTransformService.masterToBillEmployee(withEmptyMatrix, 1, undefined, {
      monthKey: 'January-2027',
    });
    expect(withMonth.payOfEstablishment).toBe(40000);
  });
});

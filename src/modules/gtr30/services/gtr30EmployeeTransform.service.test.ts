import { describe, expect, it } from 'vitest';
import { gtr30EmployeeTransformService } from './gtr30EmployeeTransform.service';
import type { GTR30EmployeeMaster } from '../types';

const master: GTR30EmployeeMaster = {
  id: 'm1',
  srNo: 1,
  hrpnNo: 'HRPN-1',
  name: 'Shri X',
  designation: 'Officer',
  payScale: '50000-100000',
  currentPay: 40000,
  currentPayDate: '2024-01-01',
  hraPercent: 20,
  transportAllowance: 3600,
  medicalAllowance: 1000,
  claAllowance: 270,
};

describe('gtr30EmployeeTransform.service', () => {
  it('maps a master row to a bill employee with derived HRA and carryover fields', () => {
    const result = gtr30EmployeeTransformService.masterToBillEmployee(master, 1);
    expect(result.name).toBe('Shri X');
    expect(result.designation).toBe('Officer');
    expect(result.payScale).toBe('50000-100000');
    expect(result.payOfEstablishment).toBe(40000);
    expect(result.hra).toBe(8000);
    expect(result.transportAllowance).toBe(3600);
    expect(result.medicalAllowance).toBe(1000);
    expect(result.cla).toBe(270);
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
});

import { describe, expect, it, beforeEach } from 'vitest';
import { gtr30EmployeeMasterService } from './gtr30EmployeeMaster.service';
import { gtr30EmployeeMasterLocalRepository } from '../repositories/gtr30EmployeeMasterLocal.repository';

describe('debug across-groups removal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inspects stored groups', () => {
    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
      id: 'e1', srNo: 1, name: 'Shri A', designation: 'RA', currentPay: 39900,
      currentPayDate: '2026-07-01', payScale: '34,500-1,12,400', hrpnNo: '100123',
      transportAllowance: 0, medicalAllowance: 0, claAllowance: 0, hraPercent: 0,
    });
    gtr30EmployeeMasterService.saveEmployee('August-2026', 'GTR30-SAL', {
      id: 'e1-aug', srNo: 1, name: 'Shri A', designation: 'RA', currentPay: 39900,
      currentPayDate: '2026-08-01', payScale: '34,500-1,12,400', hrpnNo: '100123',
      transportAllowance: 0, medicalAllowance: 0, claAllowance: 0, hraPercent: 0,
    });
    console.log('ALL GROUPS:', JSON.stringify(gtr30EmployeeMasterLocalRepository.loadAll(), null, 2));
    const result = gtr30EmployeeMasterService.removeEmployeeAcrossGroups('e1', '100123', 'GTR30-SAL');
    console.log('RESULT:', JSON.stringify(result));
    console.log('AFTER:', JSON.stringify(gtr30EmployeeMasterLocalRepository.loadAll(), null, 2));
    expect(true).toBe(true);
  });
});
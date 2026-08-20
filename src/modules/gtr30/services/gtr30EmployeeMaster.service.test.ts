import { describe, expect, it, beforeEach } from 'vitest';
import { gtr30EmployeeMasterService, gtr30GroupKey } from './gtr30EmployeeMaster.service';

function employee(id: string, srNo: number, name: string): Parameters<typeof gtr30EmployeeMasterService.saveEmployee>[2] {
  return {
    id,
    srNo,
    name,
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
    remarks: 'Regular cadre',
  };
}

describe('gtr30EmployeeMasterService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('groupKey', () => {
    it('lowercases and trims month/bill code', () => {
      expect(gtr30GroupKey('  July-2026 ', ' GTR30-SAL ')).toBe('july-2026|gtr30-sal');
    });
  });

  describe('CRUD & full field preservation', () => {
    it('returns empty group when not present', () => {
      expect(gtr30EmployeeMasterService.getGroup('Unknown', 'Unknown')).toEqual([]);
    });

    it('retains all extended schedule fields on save and fetch', () => {
      const saved = gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      expect(saved).toHaveLength(1);
      const emp = saved[0];
      expect(emp.designationGujarati).toBe('સંશોધન મદદનીશ');
      expect(emp.quarterAddress).toBe('H-7, Government Quarters, Khatodara, Surat');
      expect(emp.insuranceGroup).toBe('ખ');
      expect(emp.gis1981Insurance).toBe(240);
      expect(emp.gis1981Savings).toBe(560);
      expect(emp.societyDeduction).toBe(4154);
      expect(emp.remarks).toBe('Regular cadre');
    });

    it('saveEmployee appends to a fresh group and updates on second insert', () => {
      const a = gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      expect(a).toHaveLength(1);

      const b = gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e2', 2, 'Shri B'));
      expect(b).toHaveLength(2);

      const c = gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
        ...employee('e1', 1, 'Shri A'),
        name: 'Shri A Updated',
      });
      expect(c).toHaveLength(2);
      expect(c.find((e) => e.id === 'e1')?.name).toBe('Shri A Updated');
    });

    it('assigns an id and srNo when saving a brand-new employee', () => {
      const [saved] = gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', {
        id: '',
        srNo: 0,
        name: 'Shri Fresh',
        designation: '',
        payScale: '',
        currentPay: 0,
        currentPayDate: '',
        hraPercent: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        claAllowance: 0,
      });
      expect(saved.id).toBeTruthy();
      expect(saved.name).toBe('Shri Fresh');
    });

    it('removeEmployee filters by id', () => {
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e2', 2, 'Shri B'));
      gtr30EmployeeMasterService.removeEmployee('July-2026', 'GTR30-SAL', 'e1');
      expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')).toHaveLength(1);
    });

    it('listGroupsAsMap returns a flat map keyed by gtr30GroupKey', () => {
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      const map = gtr30EmployeeMasterService.listGroupsAsMap();
      expect(map['july-2026|gtr30-sal']).toHaveLength(1);
    });
  });

  describe('removeEmployeeAcrossGroups', () => {
    it('removes an employee from every month group of the same bill code', () => {
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      gtr30EmployeeMasterService.saveEmployee('August-2026', 'GTR30-SAL', employee('e1-aug', 1, 'Shri A'));

      const result = gtr30EmployeeMasterService.removeEmployeeAcrossGroups('e1', undefined, 'GTR30-SAL');

      expect(result.removedCount).toBe(2);
      expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')).toHaveLength(0);
      expect(gtr30EmployeeMasterService.getGroup('August-2026', 'GTR30-SAL')).toHaveLength(0);
    });

    it('also removes rolled-over copies matched by HRPN number', () => {
      const july = { ...employee('e1', 1, 'Shri A'), hrpnNo: '100123' };
      const august = { ...employee('e1-aug', 1, 'Shri A'), hrpnNo: '100123' };
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', july);
      gtr30EmployeeMasterService.saveEmployee('August-2026', 'GTR30-SAL', august);

      const result = gtr30EmployeeMasterService.removeEmployeeAcrossGroups('e1', '100123', 'GTR30-SAL');

      expect(result.removedCount).toBe(2);
      expect(gtr30EmployeeMasterService.getGroup('August-2026', 'GTR30-SAL')).toHaveLength(0);
    });

    it('leaves other bill codes untouched', () => {
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-DA', employee('e1', 1, 'Shri A'));

      const result = gtr30EmployeeMasterService.removeEmployeeAcrossGroups('e1', undefined, 'GTR30-SAL');

      expect(result.removedCount).toBe(1);
      expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')).toHaveLength(0);
      expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-DA')).toHaveLength(1);
    });

    it('reports zero when the employee is not present', () => {
      const result = gtr30EmployeeMasterService.removeEmployeeAcrossGroups('ghost', undefined, 'GTR30-SAL');
      expect(result.removedCount).toBe(0);
    });
  });

  describe('copyGroup (month-to-month rollover)', () => {
    it('copies employees from source month to target month with new ids', () => {
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e2', 2, 'Shri B'));

      const copied = gtr30EmployeeMasterService.copyGroup('July-2026', 'GTR30-SAL', 'August-2026', 'GTR30-SAL');
      expect(copied).toHaveLength(2);
      expect(copied[0].id).not.toBe('e1');
      expect(copied[0].name).toBe('Shri A');
      expect(copied[1].name).toBe('Shri B');
    });

    it('prevents accidental overwrite unless overwrite option is true', () => {
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
      gtr30EmployeeMasterService.saveEmployee('August-2026', 'GTR30-SAL', employee('e-aug', 1, 'Shri Existing'));

      expect(() => {
        gtr30EmployeeMasterService.copyGroup('July-2026', 'GTR30-SAL', 'August-2026', 'GTR30-SAL');
      }).toThrow(/already has employees/i);

      const overwritten = gtr30EmployeeMasterService.copyGroup(
        'July-2026',
        'GTR30-SAL',
        'August-2026',
        'GTR30-SAL',
        { overwrite: true }
      );
      expect(overwritten).toHaveLength(1);
      expect(overwritten[0].name).toBe('Shri A');
    });

    it('recalibrates DA if daPercent is provided during copy', () => {
      gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A')); // 39900

      const copied = gtr30EmployeeMasterService.copyGroup(
        'July-2026',
        'GTR30-SAL',
        'August-2026',
        'GTR30-SAL',
        { daPercent: 55 }
      );
      expect(copied[0].da).toBe(Math.round(39900 * 0.55));
    });
  });

  describe('validation', () => {
    it('rejects a blank name', () => {
      expect(() =>
        gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', { ...employee('e1', 1, 'Shri A'), name: '' })
      ).toThrow(/name/i);
    });

    it('rejects negative current pay', () => {
      expect(() =>
        gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', { ...employee('e1', 1, 'Shri A'), currentPay: -5 })
      ).toThrow(/current pay/i);
    });

    it('rejects saveGroup when any row is invalid', () => {
      expect(() =>
        gtr30EmployeeMasterService.saveGroup('July-2026', 'GTR30-SAL', [
          employee('e1', 1, 'Shri A'),
          { ...employee('e2', 2, 'Shri B'), hraPercent: 150 },
        ])
      ).toThrow(/hra/i);
    });

    it('does not mutate local storage when validation fails', () => {
      expect(() =>
        gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', { ...employee('e1', 1, 'Shri A'), name: 'X' })
      ).toThrow();
      expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')).toEqual([]);
    });
  });
});

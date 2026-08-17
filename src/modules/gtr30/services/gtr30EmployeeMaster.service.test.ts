import { describe, expect, it, beforeEach } from 'vitest';
import { gtr30EmployeeMasterService, gtr30GroupKey } from './gtr30EmployeeMaster.service';

function employee(id: string, srNo: number, name: string): Parameters<typeof gtr30EmployeeMasterService.saveEmployee>[2] {
  return {
    id,
    srNo,
    name,
    designation: 'X',
    payScale: 'P',
    currentPay: 0,
    currentPayDate: '',
    hraPercent: 0,
    transportAllowance: 0,
    medicalAllowance: 0,
    claAllowance: 0,
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

  describe('CRUD on local master', () => {
    it('returns empty group when not present', () => {
      expect(gtr30EmployeeMasterService.getGroup('Unknown', 'Unknown')).toEqual([]);
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

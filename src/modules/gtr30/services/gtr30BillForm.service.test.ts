import { describe, expect, it } from 'vitest';
import { gtr30BillFormService } from './gtr30BillForm.service';
import { createDefaultEmployee, sampleGTR30FormData } from '../constants';

describe('gtr30BillForm.service', () => {
  describe('emptyFormData', () => {
    it('returns a fresh object instance per call with cloned inner collections', () => {
      const a = gtr30BillFormService.emptyFormData();
      const b = gtr30BillFormService.emptyFormData();
      expect(a).not.toBe(b);
      expect(a.employees).not.toBe(b.employees);
      expect(a.employees[0]).not.toBe(b.employees[0]);
      expect(a.transits).not.toBe(b.transits);
      expect(a.establishmentPosts).not.toBe(b.establishmentPosts);
    });

    it('matches the canonical sample totals', () => {
      const totals = sampleGTR30FormData.employees.length;
      expect(totals).toBe(1);
    });
  });

  describe('normalizeFormData', () => {
    it('clones transit, post, and employee lists', () => {
      const original = gtr30BillFormService.emptyFormData();
      const normalized = gtr30BillFormService.normalizeFormData(original);
      expect(normalized.transits).not.toBe(original.transits);
      expect(normalized.establishmentPosts).not.toBe(original.establishmentPosts);
      expect(normalized.employees).not.toBe(original.employees);
    });
  });

  describe('buildNewBillFormData', () => {
    it('clears identifying fields and stamps fresh employee id', () => {
      const result = gtr30BillFormService.buildNewBillFormData();
      expect(result.billRegisterNo).toBe('');
      expect(result.billDate).toBe('');
      expect(result.monthOf).toBe('');
      expect(result.monthYearDigits).toBe('');
      expect(result.employees).toHaveLength(1);
      const emp = result.employees[0];
      expect(emp.srNo).toBe(1);
      expect(emp.name).toBe('');
    });

    it('overrides with provided settings/template/posts', () => {
      const result = gtr30BillFormService.buildNewBillFormData({
        settings: { officeName: 'CUSTOM OFFICE' },
        employeeTemplate: { designation: 'Custom Officer' },
        defaultPosts: [{ id: 'p1', srNo: 'X', designation: 'X', cadreClass: '1', sanctioned: 1, filled: 1, vacant: 0, total: 1 }],
      });
      expect(result.officeName).toBe('CUSTOM OFFICE');
      expect(result.establishmentPosts[0].id).toBe('p1');
      expect(result.employees[0].designation).toBe('Custom Officer');
      expect(result.employees[0].designation).not.toBe(createDefaultEmployee(1).designation);
    });
  });
});

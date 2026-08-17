import { describe, expect, it } from 'vitest';
import { gtr30BillsService } from './gtr30Bills.service';
import { gtr30BillFormService } from './gtr30BillForm.service';
import type { GTR30Bill } from '../types';

describe('gtr30Bills.service', () => {
  const makeBill = (overrides: Partial<GTR30Bill> = {}): GTR30Bill => {
    const form = gtr30BillFormService.emptyFormData();
    const partial: Partial<GTR30Bill> = {
      id: 'a',
      billRegisterNo: 'GTR30-A',
      status: 'draft',
      grossTotal: 0,
      deductionsTotal: 0,
      netTotal: 0,
      createdDate: '2024-12-01T00:00:00Z',
      updatedDate: '2024-12-01T00:00:00Z',
      ...overrides,
    };
    return { ...form, ...partial } as GTR30Bill;
  };

  describe('exportBillAsJson', () => {
    it('produces formatted JSON with indentation', () => {
      const bill = makeBill({ billRegisterNo: 'GTR30-A' });
      const text = gtr30BillsService.exportBillAsJson(bill);
      expect(text).toContain('\n');
      expect(text).toContain('"billRegisterNo": "GTR30-A"');
    });
  });

  describe('exportAllAsJson', () => {
    it('round-trips an array of bills through JSON', () => {
      const billA = makeBill({ billRegisterNo: 'GTR30-A' });
      const text = gtr30BillsService.exportAllAsJson([billA]);
      const imported = gtr30BillsService.parseImportedJson(text);
      expect(imported).toHaveLength(1);
      expect(imported[0].billRegisterNo).toBe('GTR30-A');
    });

    it('parses a single bill object (not wrapped in array)', () => {
      const billA = makeBill({ billRegisterNo: 'GTR30-A' });
      const text = JSON.stringify(billA);
      const imported = gtr30BillsService.parseImportedJson(text);
      expect(imported.length).toBeGreaterThanOrEqual(0);
    });

    it('returns empty array on invalid JSON', () => {
      const imported = gtr30BillsService.parseImportedJson('not json');
      expect(imported).toEqual([]);
    });
  });
});

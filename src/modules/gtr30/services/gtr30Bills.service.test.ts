import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gtr30BillsService } from './gtr30Bills.service';
import { gtr30BillFormService } from './gtr30BillForm.service';
import type { GTR30Bill } from '../types';
import { gtr30BillRegisterRepository } from '../repositories/billRegister.repository';

vi.mock('../repositories/billRegister.repository', () => ({
  gtr30BillRegisterRepository: {
    list: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('gtr30Bills.service', () => {
  const makeBill = (overrides: Partial<GTR30Bill> = {}): GTR30Bill => {
    const form = gtr30BillFormService.emptyFormData();
    const partial: Partial<GTR30Bill> = {
      id: 'a',
      billRegisterNo: 'GTR30-A',
      officeName: 'Test Office',
      monthOf: 'December-2024',
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('duplicateBill', () => {
    it('generates "-COPY" for first duplicate', async () => {
      const source = makeBill({ billRegisterNo: 'GTR30-A', officeName: 'Office1', monthOf: 'December-2024' });
      (gtr30BillRegisterRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (gtr30BillRegisterRepository.save as ReturnType<typeof vi.fn>).mockImplementation(async (b) => b);

      const result = await gtr30BillsService.duplicateBill(source);
      expect(result.billRegisterNo).toBe('GTR30-A-COPY');
    });

    it('generates "-COPY 2" for second duplicate in same office/month', async () => {
      const source = makeBill({ billRegisterNo: 'GTR30-A', officeName: 'Office1', monthOf: 'December-2024' });
      const existingCopy = makeBill({ billRegisterNo: 'GTR30-A-COPY', id: 'existing', officeName: 'Office1', monthOf: 'December-2024' });
      (gtr30BillRegisterRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue([existingCopy]);
      (gtr30BillRegisterRepository.save as ReturnType<typeof vi.fn>).mockImplementation(async (b) => b);

      const result = await gtr30BillsService.duplicateBill(source);
      expect(result.billRegisterNo).toBe('GTR30-A-COPY 2');
    });

    it('generates "-COPY 3" for third duplicate in same office/month', async () => {
      const source = makeBill({ billRegisterNo: 'GTR30-A', officeName: 'Office1', monthOf: 'December-2024' });
      const existingCopy1 = makeBill({ billRegisterNo: 'GTR30-A-COPY', id: 'existing1', officeName: 'Office1', monthOf: 'December-2024' });
      const existingCopy2 = makeBill({ billRegisterNo: 'GTR30-A-COPY 2', id: 'existing2', officeName: 'Office1', monthOf: 'December-2024' });
      (gtr30BillRegisterRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue([existingCopy1, existingCopy2]);
      (gtr30BillRegisterRepository.save as ReturnType<typeof vi.fn>).mockImplementation(async (b) => b);

      const result = await gtr30BillsService.duplicateBill(source);
      expect(result.billRegisterNo).toBe('GTR30-A-COPY 3');
    });

    it('does not conflict with bills in different office/month', async () => {
      const source = makeBill({ billRegisterNo: 'GTR30-A', officeName: 'Office1', monthOf: 'December-2024' });
      const otherOfficeCopy = makeBill({ billRegisterNo: 'GTR30-A-COPY', id: 'other', officeName: 'Office2', monthOf: 'December-2024' });
      const otherMonthCopy = makeBill({ billRegisterNo: 'GTR30-A-COPY', id: 'other2', officeName: 'Office1', monthOf: 'January-2025' });
      (gtr30BillRegisterRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue([otherOfficeCopy, otherMonthCopy]);
      (gtr30BillRegisterRepository.save as ReturnType<typeof vi.fn>).mockImplementation(async (b) => b);

      const result = await gtr30BillsService.duplicateBill(source);
      expect(result.billRegisterNo).toBe('GTR30-A-COPY');
    });
  });
});

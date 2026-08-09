import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetHeadService } from './budgetHead.service';
import { budgetHeadRepository } from '../repositories/budgetHead.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: {
    getState: () => ({ activeOfficeId: 'test-office', activeFinancialYear: 2025 }),
  },
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: {
    getState: () => ({ user: { officeId: 'test-office' } }),
  },
}));

vi.mock('../repositories/budgetHead.repository', () => ({
  budgetHeadRepository: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn(),
  },
}));

describe('BudgetHeadService', () => {
  const service = new BudgetHeadService();
  const mockRepo = budgetHeadRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists budget heads via repository', async () => {
    const heads = [{ id: 'h-1', office_id: 'test-office', code: '2071', name: 'Salaries', sort_order: 0 }];
    mockRepo.list.mockResolvedValue(heads);

    await expect(service.listBudgetHeads()).resolves.toEqual(heads);
    expect(mockRepo.list).toHaveBeenCalled();
  });

  it('rejects empty code on create', async () => {
    await expect(service.addBudgetHead({ code: '', name: 'Salaries' })).rejects.toThrow(
      'Budget head code is required'
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('rejects empty name on create', async () => {
    await expect(service.addBudgetHead({ code: '2071', name: '' })).rejects.toThrow(
      'Budget head name is required'
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('creates with trimmed code and name', async () => {
    const created = { id: 'h-1', office_id: 'test-office', code: '2071', name: 'Salaries', sort_order: 0 };
    mockRepo.create.mockResolvedValue(created);

    await expect(service.addBudgetHead({ code: ' 2071 ', name: '  Salaries  ' })).resolves.toEqual(created);
    expect(mockRepo.create).toHaveBeenCalledWith({ code: '2071', name: 'Salaries' });
  });

  it('rejects update without id', async () => {
    await expect(service.updateBudgetHead({ code: '2071', name: 'Salaries' })).rejects.toThrow(
      'Budget head ID is required for update'
    );
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('updates an existing head', async () => {
    const updated = { id: 'h-1', office_id: 'test-office', code: '2071', name: 'Salaries & Wages', sort_order: 0 };
    mockRepo.update.mockResolvedValue(updated);

    await expect(service.updateBudgetHead({ id: 'h-1', code: '2071', name: 'Salaries & Wages' })).resolves.toEqual(updated);
    expect(mockRepo.update).toHaveBeenCalledWith({ id: 'h-1', code: '2071', name: 'Salaries & Wages' });
  });

  it('rejects delete without id', async () => {
    await expect(service.deleteBudgetHead('')).rejects.toThrow('Budget head ID is required');
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });

  it('deletes a head', async () => {
    mockRepo.delete.mockResolvedValue(undefined);
    await service.deleteBudgetHead('h-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('h-1');
  });
});

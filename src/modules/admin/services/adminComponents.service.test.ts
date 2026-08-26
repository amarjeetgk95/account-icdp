import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminComponentsService } from './adminComponents.service';
import { adminComponentsRepository } from '../repositories/adminComponents.repository';

vi.mock('@/core/supabase/client', () => ({ supabase: {} }));

vi.mock('../repositories/adminComponents.repository', () => ({
  adminComponentsRepository: {
    list: vi.fn(),
    save: vi.fn(),
    setActive: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockRepo = vi.mocked(adminComponentsRepository);

const baseInput = {
  id: null,
  component_code: 'CLA',
  component_name: 'City Comp Allowance',
  short_name: 'CLA',
  type: 'EARNING' as const,
  kind: 'COMPONENT' as const,
  category: 'Allowance',
  sub_category: null,
  active: true,
  display_order: 10,
  is_mandatory: false,
  is_total_field: true,
  is_system_generated: false,
  validation_rule: null,
  notes: null,
  aliases: [
    { alias_type: 'HEADER' as const, alias_text: '  Comp Allow  ' },
    { alias_type: 'HEADER' as const, alias_text: '   ' },
    { alias_type: 'CODE' as const, alias_text: 'C1' },
  ],
};

describe('adminComponentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('delegates to the repository', async () => {
      mockRepo.list.mockResolvedValue([]);
      const rows = await adminComponentsService.list();
      expect(mockRepo.list).toHaveBeenCalled();
      expect(rows).toEqual([]);
    });
  });

  describe('save', () => {
    it('rejects a blank component name', async () => {
      await expect(adminComponentsService.save({ ...baseInput, component_name: '   ' })).rejects.toThrow(
        'Component name is required'
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('trims names, drops empty aliases and coerces booleans', async () => {
      mockRepo.save.mockResolvedValue({} as never);

      await adminComponentsService.save(baseInput);

      expect(mockRepo.save).toHaveBeenCalledWith({
        ...baseInput,
        component_name: 'City Comp Allowance',
        active: true,
        is_mandatory: false,
        is_total_field: true,
        is_system_generated: false,
        aliases: [
          { alias_type: 'HEADER', alias_text: 'Comp Allow' },
          { alias_type: 'CODE', alias_text: 'C1' },
        ],
      });
    });
  });

  describe('setActive', () => {
    it('requires a component id', async () => {
      await expect(adminComponentsService.setActive('', true)).rejects.toThrow('Component ID is required');
      expect(mockRepo.setActive).not.toHaveBeenCalled();
    });

    it('delegates to the repository', async () => {
      mockRepo.setActive.mockResolvedValue(undefined);
      await adminComponentsService.setActive('c1', false);
      expect(mockRepo.setActive).toHaveBeenCalledWith('c1', false);
    });
  });

  describe('remove', () => {
    it('requires a component id', async () => {
      await expect(adminComponentsService.remove('')).rejects.toThrow('Component ID is required');
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it('delegates to the repository', async () => {
      mockRepo.remove.mockResolvedValue({ deleted: true });
      await expect(adminComponentsService.remove('c1')).resolves.toEqual({ deleted: true });
      expect(mockRepo.remove).toHaveBeenCalledWith('c1');
    });
  });
});

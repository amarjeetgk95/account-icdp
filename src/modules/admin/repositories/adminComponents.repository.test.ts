import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminComponentsRepository } from './adminComponents.repository';
import { supabase } from '@/core/supabase/client';
import type { AdminComponent, AdminComponentInput } from '../types/components';

vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

const mockRpc = vi.mocked(supabase.rpc);

const rpcResult = (data: unknown, error: unknown = null) => ({ data, error });

const componentRow: AdminComponent = {
  id: 'c1',
  component_code: 'CLA',
  component_name: 'City Comp Allowance',
  short_name: 'CLA',
  type: 'EARNING',
  kind: 'COMPONENT',
  category: 'Allowance',
  sub_category: null,
  active: true,
  display_order: 10,
  is_mandatory: false,
  is_total_field: true,
  is_system_generated: false,
  validation_rule: null,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  aliases: [{ id: 'a1', alias_text: 'Comp Allow', alias_type: 'HEADER', created_at: '2026-01-01T00:00:00.000Z' }],
};

const baseInput: AdminComponentInput = {
  id: null,
  component_code: 'CLA',
  component_name: 'City Comp Allowance',
  short_name: 'CLA',
  type: 'EARNING',
  kind: 'COMPONENT',
  category: 'Allowance',
  sub_category: null,
  active: true,
  display_order: 10,
  is_mandatory: false,
  is_total_field: true,
  is_system_generated: false,
  validation_rule: null,
  notes: null,
  aliases: [{ alias_text: 'Comp Allow', alias_type: 'HEADER' }],
};

describe('adminComponentsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns rows from the RPC array', async () => {
      mockRpc.mockResolvedValue(rpcResult([componentRow]));

      const rows = await adminComponentsRepository.list();

      expect(mockRpc).toHaveBeenCalledWith('admin_component_list');
      expect(rows).toEqual([componentRow]);
    });

    it('returns empty array when no data is returned', async () => {
      mockRpc.mockResolvedValue(rpcResult(null));

      await expect(adminComponentsRepository.list()).resolves.toEqual([]);
    });

    it('throws when the RPC returns an error', async () => {
      mockRpc.mockResolvedValue(rpcResult(null, { message: 'boom' }));

      await expect(adminComponentsRepository.list()).rejects.toThrow('boom');
    });
  });

  describe('save', () => {
    it('omits the id when creating a new component', async () => {
      mockRpc.mockResolvedValue(rpcResult(componentRow));

      await adminComponentsRepository.save(baseInput);

      const [, args] = mockRpc.mock.calls[0];
      const payload = (args as { component: Record<string, unknown> }).component;
      expect(payload).not.toHaveProperty('id');
      expect(payload).toMatchObject({ component_name: 'City Comp Allowance', is_total_field: true });
    });

    it('includes the id when updating', async () => {
      mockRpc.mockResolvedValue(rpcResult(componentRow));

      await adminComponentsRepository.save({ ...baseInput, id: 'c1' });

      const [, args] = mockRpc.mock.calls[0];
      const payload = (args as { component: Record<string, unknown> }).component;
      expect(payload.id).toBe('c1');
    });

    it('returns the saved component from the RPC', async () => {
      mockRpc.mockResolvedValue(rpcResult(componentRow));

      const saved = await adminComponentsRepository.save(baseInput);

      expect(saved).toEqual(componentRow);
    });

    it('throws on an RPC-level error', async () => {
      mockRpc.mockResolvedValue(rpcResult(null, { message: 'db down' }));

      await expect(adminComponentsRepository.save(baseInput)).rejects.toThrow('db down');
    });
  });

  describe('setActive', () => {
    it('calls with the component id and active flag', async () => {
      mockRpc.mockResolvedValue(rpcResult({ message: 'ok' }));

      await adminComponentsRepository.setActive('c1', false);

      expect(mockRpc).toHaveBeenCalledWith('admin_component_set_active', { component_id: 'c1', active: false });
    });

    it('throws when the RPC returns an error', async () => {
      mockRpc.mockResolvedValue(rpcResult(null, { message: 'boom' }));

      await expect(adminComponentsRepository.setActive('c1', true)).rejects.toThrow('boom');
    });
  });

  describe('remove', () => {
    it('returns { deleted: false } with a reason when deletion is blocked', async () => {
      mockRpc.mockResolvedValue(rpcResult({ deleted: false, reason: 'In use' }));

      const result = await adminComponentsRepository.remove('c1');

      expect(mockRpc).toHaveBeenCalledWith('admin_component_delete', { component_id: 'c1' });
      expect(result).toEqual({ deleted: false, reason: 'In use' });
    });

    it('returns { deleted: true } when deletion succeeds', async () => {
      mockRpc.mockResolvedValue(rpcResult({ deleted: true }));

      await expect(adminComponentsRepository.remove('c1')).resolves.toEqual({ deleted: true });
    });

    it('throws when the RPC returns an error', async () => {
      mockRpc.mockResolvedValue(rpcResult(null, { message: 'boom' }));

      await expect(adminComponentsRepository.remove('c1')).rejects.toThrow('boom');
    });
  });
});

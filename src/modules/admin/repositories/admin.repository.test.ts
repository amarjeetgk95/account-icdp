import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminRepository } from './admin.repository';
import { supabase } from '@/core/supabase/client';

vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

const mockRpc = vi.mocked(supabase.rpc);

const rpcResult = (data: unknown, error: unknown = null) => ({ data, error });

describe('adminRepository (import health / office config)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getImportHealth', () => {
    it('calls admin_import_health with no args and stringifies office ids', async () => {
      mockRpc.mockResolvedValue(
        rpcResult([
          {
            office_id: 123,
            office_name: 'Alpha',
            fy: 2026,
            salary_imports: 2,
            paybill_imports: 1,
            salary_total_records: 50,
            salary_matched_count: 40,
            paybill_total_records: 30,
            paybill_matched_count: 25,
            mapping_issues: 1,
            name_mismatches: 2,
            validation_errors: 0,
            last_activity: '2026-07-01T00:00:00.000Z',
          },
        ])
      );

      const rows = await adminRepository.getImportHealth();

      expect(mockRpc).toHaveBeenCalledWith('admin_import_health');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ office_id: '123', office_name: 'Alpha', fy: 2026 });
    });

    it('throws when the RPC returns an error', async () => {
      mockRpc.mockResolvedValue(rpcResult(null, { message: 'boom' }));

      await expect(adminRepository.getImportHealth()).rejects.toThrow('boom');
    });

    it('returns empty array when no data is returned', async () => {
      mockRpc.mockResolvedValue(rpcResult(null));

      const rows = await adminRepository.getImportHealth();
      expect(rows).toEqual([]);
    });
  });

  describe('getOfficeConfig', () => {
    it('passes the target office id through', async () => {
      mockRpc.mockResolvedValue(
        rpcResult({
          office_id: '7',
          office_name: 'Beta',
          district: null,
          current_fy: 2026,
          financial_years: [2025, 2026],
          users: 2,
          employees: 10,
        })
      );

      const config = await adminRepository.getOfficeConfig('7');

      expect(mockRpc).toHaveBeenCalledWith('admin_office_config', { target_office_id: '7' });
      expect(config).toMatchObject({ office_id: '7', office_name: 'Beta', current_fy: 2026 });
    });

    it('throws when the RPC returns an error', async () => {
      mockRpc.mockResolvedValue(rpcResult(null, { message: 'nope' }));

      await expect(adminRepository.getOfficeConfig('1')).rejects.toThrow('nope');
    });
  });

  describe('setOfficeFy', () => {
    it('returns the message when the RPC returns { message }', async () => {
      mockRpc.mockResolvedValue(rpcResult({ message: 'Financial year updated' }));

      const result = await adminRepository.setOfficeFy('5', 2026);

      expect(mockRpc).toHaveBeenCalledWith('admin_set_office_fy', { target_office_id: '5', fy: 2026 });
      expect(result).toBe('Financial year updated');
    });

    it('throws when the RPC returns { error }', async () => {
      mockRpc.mockResolvedValue(rpcResult({ error: 'Office not found' }));

      await expect(adminRepository.setOfficeFy('5', 2026)).rejects.toThrow('Office not found');
    });

    it('returns the fallback when the envelope is empty', async () => {
      mockRpc.mockResolvedValue(rpcResult({ office_id: 5, fy: 2026 }));

      await expect(adminRepository.setOfficeFy('5', 2026)).resolves.toBe('Financial year updated');
    });

    it('throws on an RPC-level error', async () => {
      mockRpc.mockResolvedValue(rpcResult(null, { message: 'db down' }));

      await expect(adminRepository.setOfficeFy('5', 2026)).rejects.toThrow('db down');
    });
  });
});

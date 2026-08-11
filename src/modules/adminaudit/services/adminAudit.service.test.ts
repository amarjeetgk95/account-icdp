import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminAuditService } from './adminAudit.service';
import { adminAuditRepository } from '../repositories/adminAudit.repository';

vi.mock('@/core/supabase/client', () => ({ supabase: {} }));

vi.mock('../repositories/adminAudit.repository', () => ({
  adminAuditRepository: { listAuditLogs: vi.fn() },
}));

const mockRepo = vi.mocked(adminAuditRepository);

describe('adminAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAuditLogs', () => {
    it('calls the repository with the default limit of 100', async () => {
      await adminAuditService.listAuditLogs();
      expect(mockRepo.listAuditLogs).toHaveBeenCalledWith(100);
    });

    it('calls the repository with an explicit limit', async () => {
      await adminAuditService.listAuditLogs(50);
      expect(mockRepo.listAuditLogs).toHaveBeenCalledWith(50);
    });

    it('returns the repository result', async () => {
      const entries = [
        {
          id: 1,
          admin_email: 'admin@test.com',
          action: 'user.create',
          target_email: 'office@test.com',
          details: { office: 'X' },
          created_at: '2026-01-01T00:00:00Z',
        },
      ];
      mockRepo.listAuditLogs.mockResolvedValue(entries);
      await expect(adminAuditService.listAuditLogs()).resolves.toEqual(entries);
    });

    it('propagates repository errors', async () => {
      mockRepo.listAuditLogs.mockRejectedValue(new Error('rpc failed'));
      await expect(adminAuditService.listAuditLogs()).rejects.toThrow('rpc failed');
    });
  });
});

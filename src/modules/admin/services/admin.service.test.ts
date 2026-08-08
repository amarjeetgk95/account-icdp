import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from './admin.service';
import { adminRepository } from '../repositories/admin.repository';

vi.mock('@/core/supabase/client', () => ({ supabase: {} }));

vi.mock('@/core/stores/ui-store', () => ({
  useUIStore: { getState: () => ({}) },
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: { getState: () => ({ user: null }) },
}));

vi.mock('@/modules/settings/services/office.service', () => ({
  officeService: { getDetails: vi.fn() },
}));

vi.mock('@/modules/payroll/services/payroll.service', () => ({
  payrollService: { getQuarterReport: vi.fn() },
}));

vi.mock('@/modules/parties/services/party.service', () => ({
  partyService: { getGSTReport: vi.fn(), getIncomeTaxReport: vi.fn() },
}));

vi.mock('../repositories/admin.repository', () => ({
  adminRepository: {
    getSystemStats: vi.fn(),
    getOfficeStats: vi.fn(),
    listUsers: vi.fn(),
    listOffices: vi.fn(),
    setUserRole: vi.fn(),
    deleteUser: vi.fn(),
    createOffice: vi.fn(),
    createUser: vi.fn(),
    inviteUser: vi.fn(),
    getDataEntryReport: vi.fn(),
    getEntryCompletion: vi.fn(),
    getFinancialYears: vi.fn(),
    listAuditLogs: vi.fn(),
  },
}));

const mockRepo = vi.mocked(adminRepository);

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    service = new AdminService();
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('creates a new office when the name does not exist', async () => {
      mockRepo.listOffices.mockResolvedValue([]);
      mockRepo.createOffice.mockResolvedValue({ id: 'o1', name: 'Test Office', district: null, users: 0 });
      mockRepo.createUser.mockResolvedValue('User created');

      const result = await service.createUser({
        email: 'user@test.com',
        password: 'password123',
        role: 'office',
        officeName: 'Test Office',
      });

      expect(mockRepo.createOffice).toHaveBeenCalledWith('Test Office', '');
      expect(mockRepo.createUser).toHaveBeenCalledWith('user@test.com', 'password123', 'office', 'o1');
      expect(result).toBe('User created');
    });

    it('reuses an existing office with no login', async () => {
      mockRepo.listOffices.mockResolvedValue([{ id: 'o1', name: 'Existing', district: null, users: 0 }]);
      mockRepo.createUser.mockResolvedValue('User created');

      await service.createUser({
        email: 'a@b.com',
        password: 'password123',
        role: 'office',
        officeName: 'Existing',
      });

      expect(mockRepo.createOffice).not.toHaveBeenCalled();
      expect(mockRepo.createUser).toHaveBeenCalledWith('a@b.com', 'password123', 'office', 'o1');
    });

    it('matches office names case-insensitively after trim', async () => {
      mockRepo.listOffices.mockResolvedValue([{ id: 'o1', name: '  Alpha ', district: null, users: 0 }]);

      await service.createUser({
        email: 'a@b.com',
        password: 'password123',
        role: 'office',
        officeName: 'alpha',
      });

      expect(mockRepo.createOffice).not.toHaveBeenCalled();
      expect(mockRepo.createUser).toHaveBeenCalledWith('a@b.com', 'password123', 'office', 'o1');
    });

    it('rejects when the office already has a login', async () => {
      mockRepo.listOffices.mockResolvedValue([{ id: 'o1', name: 'Taken', district: null, users: 1 }]);

      await expect(
        service.createUser({
          email: 'a@b.com',
          password: 'password123',
          role: 'office',
          officeName: 'Taken',
        })
      ).rejects.toThrow('already has a login');
    });

    it('rejects invalid email', async () => {
      await expect(
        service.createUser({
          email: 'not-an-email',
          password: 'password123',
          role: 'office',
          officeName: 'Office',
        })
      ).rejects.toThrow('Invalid email');
    });

    it('rejects short password', async () => {
      await expect(
        service.createUser({
          email: 'a@b.com',
          password: 'short',
          role: 'office',
          officeName: 'Office',
        })
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('calls inviteUser when no password is provided', async () => {
      mockRepo.listOffices.mockResolvedValue([]);
      mockRepo.createOffice.mockResolvedValue({ id: 'o1', name: 'New', district: null, users: 0 });
      mockRepo.inviteUser.mockResolvedValue('Invitation created');

      const result = await service.createUser({
        email: 'invite@test.com',
        role: 'office',
        officeName: 'New',
      });

      expect(mockRepo.createUser).not.toHaveBeenCalled();
      expect(mockRepo.inviteUser).toHaveBeenCalledWith('invite@test.com', 'office', 'o1');
      expect(result).toBe('Invitation created');
    });
  });

  describe('setUserRole', () => {
    it('requires a user id', async () => {
      await expect(service.setUserRole('', 'admin', null)).rejects.toThrow('User ID is required');
    });

    it('delegates to the repository', async () => {
      mockRepo.setUserRole.mockResolvedValue('Role updated');
      const result = await service.setUserRole('u1', 'office', 'o1');
      expect(mockRepo.setUserRole).toHaveBeenCalledWith('u1', 'office', 'o1');
      expect(result).toBe('Role updated');
    });
  });

  describe('deleteUser', () => {
    it('requires a user id', async () => {
      await expect(service.deleteUser('')).rejects.toThrow('User ID is required');
    });
  });

  describe('reports', () => {
    it('passes through entry completion', async () => {
      mockRepo.getEntryCompletion.mockResolvedValue([
        { office_id: '1', office_name: 'X', fy: 2025, months: ['April'] },
      ]);
      await expect(service.getEntryCompletion()).resolves.toEqual([
        { office_id: '1', office_name: 'X', fy: 2025, months: ['April'] },
      ]);
    });

    it('passes through audit logs with a limit', async () => {
      mockRepo.listAuditLogs.mockResolvedValue([]);
      await service.listAuditLogs(50);
      expect(mockRepo.listAuditLogs).toHaveBeenCalledWith(50);
    });

    it('requires an office id for financial years', async () => {
      await expect(service.getFinancialYears('')).rejects.toThrow('No office selected');
    });
  });
});

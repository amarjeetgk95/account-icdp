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
    getEntryCompletion: vi.fn(),
    getDataEntryReport: vi.fn(),
    listUsers: vi.fn(),
    listOffices: vi.fn(),
    setUserRole: vi.fn(),
    deleteUser: vi.fn(),
    createOffice: vi.fn(),
    createUser: vi.fn(),
    inviteUser: vi.fn(),
    getFinancialYears: vi.fn(),
    getImportHealth: vi.fn(),
    getOfficeConfig: vi.fn(),
    setOfficeFy: vi.fn(),
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

    it('creates an admin without binding an office (password)', async () => {
      mockRepo.createUser.mockResolvedValue('User created');

      const result = await service.createUser({
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
      });

      expect(mockRepo.listOffices).not.toHaveBeenCalled();
      expect(mockRepo.createOffice).not.toHaveBeenCalled();
      expect(mockRepo.createUser).toHaveBeenCalledWith('admin@test.com', 'password123', 'admin', null);
      expect(result).toBe('User created');
    });

    it('creates an admin without binding an office (invite)', async () => {
      mockRepo.inviteUser.mockResolvedValue('Invitation created');

      const result = await service.createUser({
        email: 'admin@test.com',
        role: 'admin',
      });

      expect(mockRepo.createOffice).not.toHaveBeenCalled();
      expect(mockRepo.inviteUser).toHaveBeenCalledWith('admin@test.com', 'admin', null);
      expect(result).toBe('Invitation created');
    });

    it('rejects an office user without an office name', async () => {
      await expect(
        service.createUser({
          email: 'a@b.com',
          password: 'password123',
          role: 'office',
        })
      ).rejects.toThrow('Office name is required for office users');
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

  describe('overview and reporting', () => {
    it('delegates getSystemStats to repository', async () => {
      const mockStats = {
        users: 10,
        admins: 2,
        offices: 5,
        fy: 2026,
        employees: 50,
        salaries: 200,
        parties: 15,
        transactions: 80,
      };
      mockRepo.getSystemStats.mockResolvedValue(mockStats);
      const res = await service.getSystemStats();
      expect(mockRepo.getSystemStats).toHaveBeenCalled();
      expect(res).toEqual(mockStats);
    });

    it('delegates getOfficeStats to repository', async () => {
      mockRepo.getOfficeStats.mockResolvedValue([]);
      const res = await service.getOfficeStats();
      expect(mockRepo.getOfficeStats).toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('delegates getEntryCompletion to repository', async () => {
      mockRepo.getEntryCompletion.mockResolvedValue([]);
      const res = await service.getEntryCompletion();
      expect(mockRepo.getEntryCompletion).toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('delegates getDataEntryReport to repository', async () => {
      mockRepo.getDataEntryReport.mockResolvedValue([]);
      const res = await service.getDataEntryReport();
      expect(mockRepo.getDataEntryReport).toHaveBeenCalled();
      expect(res).toEqual([]);
    });
  });

  describe('reports', () => {
    it('requires an office id for financial years', async () => {
      await expect(service.getFinancialYears('')).rejects.toThrow('No office selected');
    });
  });

  describe('import health and office config', () => {
    it('delegates getImportHealth to repository', async () => {
      mockRepo.getImportHealth.mockResolvedValue([]);
      const res = await service.getImportHealth();
      expect(mockRepo.getImportHealth).toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('requires an office id for office config', async () => {
      await expect(service.getOfficeConfig('')).rejects.toThrow('Office ID is required');
      expect(mockRepo.getOfficeConfig).not.toHaveBeenCalled();
    });

    it('delegates getOfficeConfig to repository', async () => {
      const config = {
        office_id: '1',
        office_name: 'A',
        district: null,
        current_fy: 2026,
        financial_years: [2026],
        users: 1,
        employees: 2,
      };
      mockRepo.getOfficeConfig.mockResolvedValue(config);
      const res = await service.getOfficeConfig('1');
      expect(mockRepo.getOfficeConfig).toHaveBeenCalledWith('1');
      expect(res).toEqual(config);
    });

    it('rejects an invalid financial year', async () => {
      await expect(service.setOfficeFy('1', 1999)).rejects.toThrow('Financial year must be an integer');
      await expect(service.setOfficeFy('1', 2101)).rejects.toThrow('Financial year must be an integer');
      await expect(service.setOfficeFy('1', 2026.5)).rejects.toThrow('Financial year must be an integer');
      expect(mockRepo.setOfficeFy).not.toHaveBeenCalled();
    });

    it('requires an office id for setOfficeFy', async () => {
      await expect(service.setOfficeFy('', 2026)).rejects.toThrow('Office ID is required');
    });

    it('delegates setOfficeFy to repository', async () => {
      mockRepo.setOfficeFy.mockResolvedValue('Financial year updated');
      const res = await service.setOfficeFy('1', 2026);
      expect(mockRepo.setOfficeFy).toHaveBeenCalledWith('1', 2026);
      expect(res).toBe('Financial year updated');
    });
  });
});

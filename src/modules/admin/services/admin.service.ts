import { adminRepository } from '../repositories/admin.repository';
import type { UserInfo, Office, CreateUserInput, SystemStats, OfficeStats, OfficeCompletion, DataEntryReportRow, UpdateOfficeInput } from '../types';

export class AdminService {
  async getSystemStats(): Promise<SystemStats> {
    return adminRepository.getSystemStats();
  }

  async getOfficeStats(): Promise<OfficeStats[]> {
    return adminRepository.getOfficeStats();
  }

  async getEntryCompletion(): Promise<OfficeCompletion[]> {
    return adminRepository.getEntryCompletion();
  }

  async getDataEntryReport(): Promise<DataEntryReportRow[]> {
    return adminRepository.getDataEntryReport();
  }

  async listUsers(): Promise<UserInfo[]> {
    return adminRepository.listUsers();
  }

  async listOffices(): Promise<Office[]> {
    return adminRepository.listOffices();
  }

  async setUserRole(userId: string, role: 'admin' | 'office', officeId: string | null): Promise<string> {
    if (!userId) throw new Error('User ID is required');
    return adminRepository.setUserRole(userId, role, officeId);
  }

  async setUserStatus(userId: string, suspended: boolean): Promise<string> {
    if (!userId) throw new Error('User ID is required');
    return adminRepository.setUserStatus(userId, suspended);
  }

  async deleteUser(userId: string): Promise<string> {
    if (!userId) throw new Error('User ID is required');
    return adminRepository.deleteUser(userId);
  }

  async createOffice(name: string, district = ''): Promise<Office> {
    if (!name || name.trim().length < 2) {
      throw new Error('Office name must be at least 2 characters');
    }
    return adminRepository.createOffice(name.trim(), district);
  }

  async updateOffice(input: UpdateOfficeInput): Promise<string> {
    if (!input.officeId) throw new Error('Office ID is required');
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Office name must be at least 2 characters');
    }
    return adminRepository.updateOffice({
      officeId: input.officeId,
      name: input.name.trim(),
      district: input.district,
    });
  }

  async createUser(input: CreateUserInput): Promise<string> {
    this.validateUserInput(input);

    let officeId: string | null = null;
    const offices = await this.listOffices();
    const normalizedName = input.officeName.trim().toLowerCase();

    const existingOffice = offices.find(
      (o) => o.name.trim().toLowerCase() === normalizedName
    );

    if (existingOffice) {
      if (existingOffice.users > 0) {
        throw new Error(
          `Office "${existingOffice.name}" already has a login. Each office has exactly one user.`
        );
      }
      officeId = existingOffice.id;
    } else {
      const newOffice = await this.createOffice(input.officeName);
      officeId = newOffice?.id ?? null;
    }

    if (!officeId) {
      throw new Error('Failed to create or resolve the office for this user');
    }

    if (input.password) {
      return adminRepository.createUser(input.email, input.password, input.role, officeId);
    }
    return adminRepository.inviteUser(input.email, input.role, officeId);
  }

  async getFinancialYears(officeId: string): Promise<number[]> {
    if (!officeId) throw new Error('No office selected');
    return adminRepository.getFinancialYears(officeId);
  }

  private validateUserInput(input: CreateUserInput): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error('Invalid email format');
    }
    if (input.password !== undefined && input.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!input.officeName || input.officeName.trim().length < 2) {
      throw new Error('Office name must be at least 2 characters');
    }
    if (!['admin', 'office'].includes(input.role)) {
      throw new Error('Invalid role');
    }
  }
}

export const adminService = new AdminService();

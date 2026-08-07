import { adminRepository } from '../repositories/admin.repository';
import type {
  SystemStats,
  UserInfo,
  OfficeStats,
  Office,
  DataEntryReportRow,
  CreateUserInput,
} from '../types';

export class AdminService {
  async getSystemStats(): Promise<SystemStats> {
    return adminRepository.getSystemStats();
  }

  async getOfficeStats(): Promise<OfficeStats[]> {
    return adminRepository.getOfficeStats();
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

  async deleteUser(userId: string): Promise<string> {
    if (!userId) throw new Error('User ID is required');
    return adminRepository.deleteUser(userId);
  }

  async createOffice(name: string): Promise<Office> {
    if (!name || name.trim().length < 2) {
      throw new Error('Office name must be at least 2 characters');
    }
    return adminRepository.createOffice(name.trim(), '');
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
      officeId = newOffice.id;
    }

    return adminRepository.createUser(input.email, input.password, input.role, officeId!);
  }

  async getDataEntryReport(): Promise<DataEntryReportRow[]> {
    return adminRepository.getDataEntryReport();
  }

  private validateUserInput(input: CreateUserInput): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error('Invalid email format');
    }
    if (input.password.length < 8) {
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

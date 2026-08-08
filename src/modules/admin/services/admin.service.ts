import { adminRepository } from '../repositories/admin.repository';
import { officeService } from '@/modules/settings/services/office.service';
import { payrollService } from '@/modules/payroll/services/payroll.service';
import { partyService } from '@/modules/parties/services/party.service';
import type { QuarterReport } from '@/modules/payroll/types';
import type { GSTReport, IncomeTaxReport } from '@/modules/parties/types';
import type {
  SystemStats,
  UserInfo,
  OfficeStats,
  Office,
  DataEntryReportRow,
  CreateUserInput,
  OfficeCompletion,
  AuditLogEntry,
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

    if (input.password) {
      return adminRepository.createUser(input.email, input.password, input.role, officeId!);
    }
    return adminRepository.inviteUser(input.email, input.role, officeId!);
  }

  async getDataEntryReport(): Promise<DataEntryReportRow[]> {
    return adminRepository.getDataEntryReport();
  }

  async getEntryCompletion(): Promise<OfficeCompletion[]> {
    return adminRepository.getEntryCompletion();
  }

  async listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    return adminRepository.listAuditLogs(limit);
  }

  async getFinancialYears(officeId: string): Promise<number[]> {
    if (!officeId) throw new Error('No office selected');
    return adminRepository.getFinancialYears(officeId);
  }

  async getOfficeDetails(officeId: string) {
    if (!officeId) throw new Error('No office selected');
    return officeService.getDetails(officeId);
  }

  async getQuarterReport(quarter: string, fy: number, officeId: string): Promise<QuarterReport> {
    return payrollService.getQuarterReport(quarter, fy, officeId);
  }

  async getGSTReport(fy: number, quarter: string, officeId: string): Promise<GSTReport> {
    return partyService.getGSTReport(fy, quarter, officeId);
  }

  async getIncomeTaxReport(fy: number, quarter: string, officeId: string): Promise<IncomeTaxReport> {
    return partyService.getIncomeTaxReport(fy, quarter, officeId);
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

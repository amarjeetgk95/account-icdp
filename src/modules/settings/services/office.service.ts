import { officeRepository } from '../repositories/office.repository';
import type { OfficeDetailsInput } from '../validation/settings.schema';

export class OfficeService {
  async getName(officeId?: string): Promise<string> {
    return officeRepository.getName(officeId);
  }

  async getDetails(officeId?: string): Promise<OfficeDetailsInput> {
    return officeRepository.get(officeId);
  }

  async saveDetails(input: OfficeDetailsInput): Promise<void> {
    this.validateInput(input);
    return officeRepository.save(input);
  }

  private validateInput(input: OfficeDetailsInput): void {
    if (input.email && input.email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email)) {
        throw new Error('Invalid email format');
      }
    }
  }
}

export const officeService = new OfficeService();

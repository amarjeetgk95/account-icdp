import { reportRepository } from '../repositories/report.repository';
import type { YearlyReport } from '../types';

class ReportService {
  async getFinancialYears(): Promise<number[]> {
    return reportRepository.getFinancialYears();
  }

  async getYearlyReport(fy: number): Promise<YearlyReport> {
    if (!Number.isInteger(fy) || fy < 2000 || fy > 2100) {
      throw new Error('Invalid financial year');
    }
    return reportRepository.getYearlyReport(fy);
  }
}

export const reportService = new ReportService();

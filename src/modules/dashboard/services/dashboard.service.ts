import { dashboardRepository } from '../repositories/dashboard.repository';
import type { PayrollSummary, TreasurySummary, VendorTdsSummary } from '../types';

class DashboardService {
  getPayroll(fy: number): Promise<PayrollSummary> {
    return dashboardRepository.getPayrollSummary(fy);
  }

  getTreasury(): Promise<TreasurySummary> {
    return dashboardRepository.getTreasurySummary();
  }

  getVendor(fy: number): Promise<VendorTdsSummary> {
    return dashboardRepository.getVendorSummary(fy);
  }
}

export const dashboardService = new DashboardService();

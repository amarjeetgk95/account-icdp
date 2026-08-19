import { dashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardData } from '../types';

class DashboardService {
  async getSummary(): Promise<DashboardData> {
    return dashboardRepository.getSummary();
  }
}

export const dashboardService = new DashboardService();

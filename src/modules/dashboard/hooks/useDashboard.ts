import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';
import { useUIStore } from '@/core/stores/ui-store';

export function useDashboard() {
  const fy = useUIStore((state) => state.activeFinancialYear);

  const payrollQuery = useQuery({
    queryKey: ['dashboard-summary', fy, 'payroll'],
    queryFn: () => dashboardService.getPayroll(fy),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const treasuryQuery = useQuery({
    queryKey: ['dashboard-summary', fy, 'treasury'],
    queryFn: () => dashboardService.getTreasury(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const vendorQuery = useQuery({
    queryKey: ['dashboard-summary', fy, 'vendor'],
    queryFn: () => dashboardService.getVendor(fy),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const queries = [payrollQuery, treasuryQuery, vendorQuery];

  return {
    fy,
    payrollQuery,
    treasuryQuery,
    vendorQuery,
    refetchAll: () => Promise.all(queries.map((query) => query.refetch())),
    isFetching: queries.some((query) => query.isFetching),
    updatedAt: Math.max(0, ...queries.map((query) => query.dataUpdatedAt)),
  };
}

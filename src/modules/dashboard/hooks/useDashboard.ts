import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import { useUIStore } from '@/core/stores/ui-store';

export function useDashboard() {
  const officeId = useActiveOfficeId();
  const activeFinancialYear = useUIStore((state) => state.activeFinancialYear);

  return useQuery({
    queryKey: ['dashboard-summary', officeId, activeFinancialYear],
    queryFn: () => dashboardService.getSummary(),
    enabled: !!officeId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

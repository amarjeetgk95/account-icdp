import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useDashboard() {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['dashboard-summary', officeId],
    queryFn: () => dashboardService.getSummary(),
    enabled: !!officeId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

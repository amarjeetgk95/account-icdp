import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '../services/payroll.service';
import { useUIStore } from '@/core/stores/ui-store';

export function useRoster(month: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);

  return useQuery({
    queryKey: ['payroll-roster', month, fy],
    queryFn: () => payrollService.getRoster(month),
    enabled: !!month,
  });
}

export function useSaveSalary() {
  const queryClient = useQueryClient();
  const fy = useUIStore((state) => state.activeFinancialYear);

  return useMutation({
    mutationFn: ({
      month,
      entries,
    }: {
      month: string;
      entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>;
    }) => payrollService.saveBulkSalary(month, entries),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['payroll-roster', variables.month, fy],
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useCopyPreviousMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (month: string) => payrollService.copyPreviousMonth(month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-roster'] });
    },
  });
}

export function useQuarterReport(quarter: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);

  return useQuery({
    queryKey: ['payroll-quarter-report', quarter, fy],
    queryFn: () => payrollService.getQuarterReport(quarter, fy),
    enabled: !!quarter,
  });
}

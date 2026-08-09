import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '../services/payroll.service';
import { payrollRepository } from '../repositories/payroll.repository';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useRoster(month: string, fy: number) {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['payroll-roster', month, fy, officeId],
    queryFn: () => payrollService.getRoster(month, fy),
    enabled: !!month && !!officeId,
  });
}

export function useSaveSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      month,
      fy,
      entries,
    }: {
      month: string;
      fy: number;
      entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>;
    }) => payrollService.saveBulkSalary(month, entries, fy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['payroll-roster', variables.month, variables.fy],
      });
      queryClient.invalidateQueries({
        queryKey: ['payroll-month-check', variables.month, variables.fy],
      });
      queryClient.invalidateQueries({ queryKey: ['payroll-budget-head-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useClearMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ month, fy }: { month: string; fy: number }) =>
      payrollService.clearMonth(month, fy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['payroll-roster', variables.month, variables.fy],
      });
      queryClient.invalidateQueries({
        queryKey: ['payroll-month-check', variables.month, variables.fy],
      });
      queryClient.invalidateQueries({ queryKey: ['payroll-budget-head-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useQuarterReport(quarter: string, fy: number) {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['payroll-quarter-report', quarter, fy, officeId],
    queryFn: () => payrollService.getQuarterReport(quarter, fy),
    enabled: !!quarter && !!officeId,
  });
}

export function useBudgetHeadReport(fy: number) {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['payroll-budget-head-report', fy, officeId],
    queryFn: () => payrollService.getBudgetHeadReport(fy),
    enabled: !!officeId,
  });
}

export function useMonthDataCheck(month: string, fy: number) {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['payroll-month-check', month, fy, officeId],
    queryFn: () => payrollRepository.checkMonthData(month, fy, officeId || undefined),
    enabled: !!month && !!officeId,
    staleTime: 60000,
  });
}

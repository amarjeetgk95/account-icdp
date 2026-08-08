import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '../services/payroll.service';
import { payrollRepository } from '../repositories/payroll.repository';
import { useUIStore } from '@/core/stores/ui-store';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useRoster(month: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['payroll-roster', month, fy, officeId],
    queryFn: () => payrollService.getRoster(month),
    enabled: !!month && !!officeId,
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
  const fy = useUIStore((state) => state.activeFinancialYear);

  return useMutation({
    mutationFn: (month: string) => payrollService.copyPreviousMonth(month),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['payroll-roster', variables, fy],
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useClearMonth() {
  const queryClient = useQueryClient();
  const fy = useUIStore((state) => state.activeFinancialYear);

  return useMutation({
    mutationFn: (month: string) => payrollService.clearMonth(month),
    onSuccess: (_data, month) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-roster', month, fy] });
      queryClient.invalidateQueries({ queryKey: ['payroll-month-check', month, fy] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useQuarterReport(quarter: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['payroll-quarter-report', quarter, fy, officeId],
    queryFn: () => payrollService.getQuarterReport(quarter, fy),
    enabled: !!quarter && !!officeId,
  });
}

export function useMonthDataCheck(month: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['payroll-month-check', month, fy, officeId],
    queryFn: () => payrollRepository.checkMonthData(month, fy, officeId || undefined),
    enabled: !!month && !!officeId,
    staleTime: 60000,
  });
}

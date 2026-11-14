import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '../services/payroll.service';
import { payrollRepository } from '../repositories/payroll.repository';
import { taxReconciliationService } from '../services/taxReconciliation.service';
import type { SyncPaybillToPayrollPayload } from '../types/reconciliation';

export function useRoster(month: string, fy: number, enabled = true) {
  return useQuery({
    queryKey: ['payroll-roster', month, fy],
    queryFn: () => payrollService.getRoster(month, fy),
    enabled: !!month && enabled,
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
      queryClient.invalidateQueries({ queryKey: ['payroll-quarter-report'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-tax-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['salary-lookup-details'] });
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
      queryClient.invalidateQueries({ queryKey: ['payroll-quarter-report'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-tax-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['salary-lookup-details'] });
    },
  });
}

export function useQuarterReport(quarter: string, fy: number, enabled = true) {
  return useQuery({
    queryKey: ['payroll-quarter-report', quarter, fy],
    queryFn: () => payrollService.getQuarterReport(quarter, fy),
    enabled: !!quarter && enabled,
  });
}

export function useBudgetHeadReport(fy: number, enabled = true) {
  return useQuery({
    queryKey: ['payroll-budget-head-report', fy],
    queryFn: () => payrollService.getBudgetHeadReport(fy),
    enabled,
  });
}

export function useMonthDataCheck(month: string, fy: number, enabled = true) {
  return useQuery({
    queryKey: ['payroll-month-check', month, fy],
    queryFn: () => payrollRepository.checkMonthData(month, fy),
    enabled: !!month && enabled,
    staleTime: 60000,
  });
}

export function useTaxReconciliation(quarter: string, fy: number, enabled = true) {
  return useQuery({
    queryKey: ['payroll-tax-reconciliation', quarter, fy],
    queryFn: () => taxReconciliationService.getQuarterTaxReconciliation(quarter, fy),
    enabled: !!quarter && enabled,
  });
}

export function useSyncPaybillToPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SyncPaybillToPayrollPayload) =>
      taxReconciliationService.syncPaybillToPayroll(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-roster'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-month-check'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-budget-head-report'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-quarter-report'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-tax-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partyService } from '../services/party.service';
import { useUIStore } from '@/core/stores/ui-store';
import type { TransactionInput } from '../types';

export function useParties() {
  return useQuery({
    queryKey: ['parties-list'],
    queryFn: () => partyService.listParties(),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ['parties-transactions'],
    queryFn: () => partyService.listTransactions(),
  });
}

export function useSaveTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TransactionInput) => partyService.saveTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useGSTReport(quarter: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);

  return useQuery({
    queryKey: ['parties-gst-report', quarter, fy],
    queryFn: () => partyService.getGSTReport(fy, quarter),
    enabled: !!quarter,
  });
}

export function useIncomeTaxReport(quarter: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);

  return useQuery({
    queryKey: ['parties-it-report', quarter, fy],
    queryFn: () => partyService.getIncomeTaxReport(fy, quarter),
    enabled: !!quarter,
  });
}

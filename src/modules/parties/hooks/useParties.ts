import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partyService } from '../services/party.service';
import { officeService } from '@/modules/settings/services/office.service';
import { useUIStore } from '@/core/stores/ui-store';
import type { TransactionInput } from '../types';

export function useOfficeDetails() {
  return useQuery({
    queryKey: ['office-details'],
    queryFn: () => officeService.getDetails(),
  });
}

export function useParties() {
  return useQuery({
    queryKey: ['parties-list'],
    queryFn: () => partyService.listParties(),
  });
}

export function useTransactions(fy?: number) {
  return useQuery({
    queryKey: ['parties-transactions', fy ?? 'all'],
    queryFn: () => partyService.listTransactions(fy),
  });
}

export function useSaveTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TransactionInput) => partyService.saveTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['parties-gst-report'] });
      queryClient.invalidateQueries({ queryKey: ['parties-it-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useSaveBulkTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: TransactionInput[]) => partyService.saveBulkTransactions(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['parties-gst-report'] });
      queryClient.invalidateQueries({ queryKey: ['parties-it-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TransactionInput> }) =>
      partyService.updateTransaction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['parties-gst-report'] });
      queryClient.invalidateQueries({ queryKey: ['parties-it-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => partyService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['parties-gst-report'] });
      queryClient.invalidateQueries({ queryKey: ['parties-it-report'] });
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

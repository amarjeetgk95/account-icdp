import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partyService } from '../services/party.service';
import { officeService } from '@/modules/settings/services/office.service';
import { useUIStore } from '@/core/stores/ui-store';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { TransactionInput } from '../types';

export function useOfficeDetails() {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['office-details', officeId],
    queryFn: () => officeService.getDetails(),
    enabled: !!officeId,
  });
}

export function useParties() {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['parties-list', officeId],
    queryFn: () => partyService.listParties(),
    enabled: !!officeId,
  });
}

export function useTransactions() {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['parties-transactions', officeId],
    queryFn: () => partyService.listTransactions(),
    enabled: !!officeId,
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
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['parties-gst-report', quarter, fy, officeId],
    queryFn: () => partyService.getGSTReport(fy, quarter),
    enabled: !!quarter && !!officeId,
  });
}

export function useIncomeTaxReport(quarter: string) {
  const fy = useUIStore((state) => state.activeFinancialYear);
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['parties-it-report', quarter, fy, officeId],
    queryFn: () => partyService.getIncomeTaxReport(fy, quarter),
    enabled: !!quarter && !!officeId,
  });
}

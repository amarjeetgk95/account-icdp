import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gtr30BudgetHeadsService } from '../services/gtr30BudgetHeads.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';
import type { GTR30BudgetHead } from '../types';

function gtr30BudgetHeadsKey(): readonly unknown[] {
  return ['gtr30BudgetHeads', 'all'];
}

export function useGTR30BudgetHeads() {
  return useQuery({
    queryKey: gtr30BudgetHeadsKey(),
    queryFn: async () => {
      await gtr30BudgetHeadsService.hydrateFromBackend();
      return gtr30BudgetHeadsService.list();
    },
    initialData: () => gtr30BudgetHeadsService.list(),
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });
}

export function useSaveGTR30BudgetHead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (head: GTR30BudgetHead) => {
      gtr30BudgetHeadsService.saveHead(head);
      return head;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BudgetHeadsKey() });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30BudgetHead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      Promise.resolve(gtr30BudgetHeadsService.removeHead(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BudgetHeadsKey() });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useHydrateGTR30BudgetHeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gtr30BudgetHeadsService.hydrateFromBackend(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BudgetHeadsKey() });
    },
  });
}

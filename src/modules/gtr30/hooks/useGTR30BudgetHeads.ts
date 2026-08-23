import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gtr30BudgetHeadsService } from '../services/gtr30BudgetHeads.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { GTR30BudgetHead } from '../types';

function gtr30BudgetHeadsKey(officeId?: string | null): readonly unknown[] {
  return ['gtr30BudgetHeads', officeId ?? null];
}

export function useGTR30BudgetHeads() {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: gtr30BudgetHeadsKey(officeId),
    queryFn: () => Promise.resolve(gtr30BudgetHeadsService.list()),
    initialData: () => gtr30BudgetHeadsService.list(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSaveGTR30BudgetHead() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: async (head: GTR30BudgetHead) => {
      gtr30BudgetHeadsService.saveHead(head);
      return head;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BudgetHeadsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30BudgetHead() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (id: string) =>
      Promise.resolve(gtr30BudgetHeadsService.removeHead(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BudgetHeadsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useHydrateGTR30BudgetHeads() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: () => gtr30BudgetHeadsService.hydrateFromBackend(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BudgetHeadsKey(officeId) });
    },
  });
}

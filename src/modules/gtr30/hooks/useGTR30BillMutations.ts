import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GTR30Bill, GTR30FormData } from '../types';
import { gtr30BillsService } from '../services/gtr30Bills.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';

export function useGtr30SaveBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { form: GTR30FormData & { status?: GTR30Bill['status'] }; existing: GTR30Bill | null }) =>
      gtr30BillsService.saveBill(input.form, input.existing),
    onSuccess: (saved) => {
      queryClient.setQueryData(['gtr30Bills'], (prev: GTR30Bill[] | undefined) => {
        const list = prev ?? [];
        const idx = list.findIndex((b) => b.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next;
        }
        return [saved, ...list];
      });
      queryClient.setQueryData(['gtr30Bill', saved.id], saved);
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useGtr30UpdateBillStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: GTR30Bill['status'] }) =>
      gtr30BillsService.updateBillStatus(input.id, input.status),
    onSuccess: (saved) => {
      queryClient.setQueryData(['gtr30Bills'], (prev: GTR30Bill[] | undefined) => {
        const list = prev ?? [];
        const idx = list.findIndex((b) => b.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next;
        }
        return [saved, ...list];
      });
      queryClient.setQueryData(['gtr30Bill', saved.id], saved);
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useGtr30DeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gtr30BillsService.deleteBill(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData(['gtr30Bills'], (prev: GTR30Bill[] | undefined) =>
        (prev ?? []).filter((b) => b.id !== id)
      );
      queryClient.removeQueries({ queryKey: ['gtr30Bill', id] });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useGtr30DuplicateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (source: GTR30Bill) => {
      // Register rows are summaries; duplication needs the full JSONB snapshot.
      const full = await gtr30BillsService.getBill(source.id);
      if (!full) throw new Error('Unable to load the full bill for duplication');
      return gtr30BillsService.duplicateBill(full);
    },
    onSuccess: (dup) => {
      queryClient.setQueryData(['gtr30Bills'], (prev: GTR30Bill[] | undefined) => [
        dup,
        ...(prev ?? []),
      ]);
      queryClient.setQueryData(['gtr30Bill', dup.id], dup);
      void invalidateGtr30Queries(queryClient);
    },
  });
}

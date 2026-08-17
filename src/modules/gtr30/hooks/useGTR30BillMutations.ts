import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GTR30Bill, GTR30FormData } from '../types';
import { gtr30BillsService } from '../services/gtr30Bills.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useGtr30SaveBill() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  return useMutation({
    mutationFn: (input: { form: GTR30FormData; existing: GTR30Bill | null }) =>
      gtr30BillsService.saveBill(input.form, input.existing),
    onSuccess: (saved) => {
      queryClient.setQueryData(['gtr30Bills', officeId ?? null], (prev: GTR30Bill[] | undefined) => {
        const list = prev ?? [];
        const idx = list.findIndex((b) => b.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next;
        }
        return [saved, ...list];
      });
      queryClient.setQueryData(['gtr30Bill', officeId ?? null, saved.id], saved);
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useGtr30DeleteBill() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  return useMutation({
    mutationFn: (id: string) => gtr30BillsService.deleteBill(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData(['gtr30Bills', officeId ?? null], (prev: GTR30Bill[] | undefined) =>
        (prev ?? []).filter((b) => b.id !== id)
      );
      queryClient.removeQueries({ queryKey: ['gtr30Bill', officeId ?? null, id] });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useGtr30DuplicateBill() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  return useMutation({
    mutationFn: (source: GTR30Bill) => gtr30BillsService.duplicateBill(source),
    onSuccess: (dup) => {
      queryClient.setQueryData(['gtr30Bills', officeId ?? null], (prev: GTR30Bill[] | undefined) => [
        dup,
        ...(prev ?? []),
      ]);
      queryClient.setQueryData(['gtr30Bill', officeId ?? null, dup.id], dup);
      void invalidateGtr30Queries(queryClient);
    },
  });
}

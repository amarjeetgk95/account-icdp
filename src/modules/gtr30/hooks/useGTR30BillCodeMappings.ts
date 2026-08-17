import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gtr30BillCodeMappingsService } from '../services/gtr30BillCodeMappings.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { GTR30BillCodeMapping } from '../types';

export function gtr30BillCodeMappingsKey(officeId?: string | null): readonly unknown[] {
  return ['gtr30BillCodeMappings', officeId ?? null];
}

export function useGTR30BillCodeMappings() {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: gtr30BillCodeMappingsKey(officeId),
    queryFn: () => Promise.resolve(gtr30BillCodeMappingsService.list()),
    initialData: () => gtr30BillCodeMappingsService.list(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSaveGTR30BillCodeMapping() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (mapping: GTR30BillCodeMapping) =>
      Promise.resolve(gtr30BillCodeMappingsService.saveMapping(mapping)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BillCodeMappingsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30BillCodeMapping() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (id: string) =>
      Promise.resolve(gtr30BillCodeMappingsService.removeMapping(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BillCodeMappingsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useHydrateGTR30BillCodeMappings() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: () => gtr30BillCodeMappingsService.hydrateFromBackend(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BillCodeMappingsKey(officeId) });
    },
  });
}

export { gtr30BillCodeMappingsService };

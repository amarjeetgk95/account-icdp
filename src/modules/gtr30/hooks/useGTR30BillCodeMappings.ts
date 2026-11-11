import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gtr30BillCodeMappingsService } from '../services/gtr30BillCodeMappings.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';
import type { GTR30BillCodeMapping } from '../types';

function gtr30BillCodeMappingsKey(): readonly unknown[] {
  return ['gtr30BillCodeMappings', 'all'];
}

export function useGTR30BillCodeMappings() {
  return useQuery({
    queryKey: gtr30BillCodeMappingsKey(),
    queryFn: async () => {
      await gtr30BillCodeMappingsService.hydrateFromBackend();
      return gtr30BillCodeMappingsService.list();
    },
    initialData: () => gtr30BillCodeMappingsService.list(),
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });
}

export function useSaveGTR30BillCodeMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mapping: GTR30BillCodeMapping) =>
      Promise.resolve(gtr30BillCodeMappingsService.saveMapping(mapping)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BillCodeMappingsKey() });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30BillCodeMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      Promise.resolve(gtr30BillCodeMappingsService.removeMapping(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BillCodeMappingsKey() });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useHydrateGTR30BillCodeMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gtr30BillCodeMappingsService.hydrateFromBackend(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30BillCodeMappingsKey() });
    },
  });
}

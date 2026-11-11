import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPostCatalog,
  savePostCatalog,
  syncPostWithExistingPositions,
  resetPostCatalogToDefault,
} from '../repositories/postCatalogBackend.repository';
import type { PostCatalogItem } from '../types/postCatalog';

export function useEstablishmentPostCatalog() {
  return useQuery({
    queryKey: ['establishmentPostCatalog'],
    queryFn: fetchPostCatalog,
    staleTime: 60_000,
  });
}

export function useSavePostCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      catalog,
      cascade,
    }: {
      catalog: PostCatalogItem[];
      cascade?: { oldNameGu: string; updated: PostCatalogItem };
    }) => {
      await savePostCatalog(catalog);
      if (cascade) {
        await syncPostWithExistingPositions(cascade.oldNameGu, cascade.updated);
      }
      return catalog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishmentPostCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['establishmentPositions'] });
    },
  });
}

export function useResetPostCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetPostCatalogToDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishmentPostCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['establishmentPositions'] });
    },
  });
}

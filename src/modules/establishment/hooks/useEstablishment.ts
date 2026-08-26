import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { establishmentService } from '../services/establishment.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { EstablishmentEmployee, EstablishmentPost } from '../types';

function establishmentEmployeesKey(officeId?: string | null): readonly unknown[] {
  return ['establishmentEmployees', officeId ?? null];
}

function establishmentPostsKey(officeId?: string | null): readonly unknown[] {
  return ['establishmentPosts', officeId ?? null];
}

function establishmentSyncKey(officeId?: string | null): readonly unknown[] {
  return ['establishmentLastSync', officeId ?? null];
}

function invalidateEstablishmentQueries(queryClient: ReturnType<typeof useQueryClient>, officeId: string | null | undefined): void {
  queryClient.invalidateQueries({ queryKey: establishmentEmployeesKey(officeId) });
  queryClient.invalidateQueries({ queryKey: establishmentPostsKey(officeId) });
  queryClient.invalidateQueries({ queryKey: establishmentSyncKey(officeId) });
}

export function useEstablishmentEmployees() {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: establishmentEmployeesKey(officeId),
    queryFn: () => establishmentService.syncEmployees(),
    initialData: () => establishmentService.loadEmployees(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useEstablishmentPosts() {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: establishmentPostsKey(officeId),
    queryFn: () => establishmentService.syncPosts(),
    initialData: () => establishmentService.loadPosts(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useEstablishmentLastSyncedAt() {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: establishmentSyncKey(officeId),
    queryFn: () => Promise.resolve(establishmentService.loadState().lastSyncedAt ?? null),
    initialData: () => establishmentService.loadState().lastSyncedAt ?? null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Hydration must re-run whenever the active office changes — a once-ever
 * guard left the register empty when the first attempt ran before the
 * office scope was ready (it silently kept the empty local state).
 */
export function useEstablishmentAutoSync(): void {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  const syncedOfficeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!officeId || syncedOfficeRef.current === officeId) return;
    syncedOfficeRef.current = officeId;
    let cancelled = false;
    void Promise.all([
      establishmentService.syncEmployees(),
      establishmentService.syncPosts(),
      establishmentService.loadState().lastSyncedAt,
    ]).then(() => {
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['establishmentLastSync', officeId] });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [officeId, queryClient]);
}

export function useSaveEstablishmentEmployees() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (employees: EstablishmentEmployee[]) =>
      establishmentService.saveEmployees(employees),
    onSuccess: () => {
      invalidateEstablishmentQueries(queryClient, officeId);
    },
  });
}

export function useSaveEstablishmentPosts() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (posts: EstablishmentPost[]) => establishmentService.savePosts(posts),
    onSuccess: () => {
      invalidateEstablishmentQueries(queryClient, officeId);
    },
  });
}

export function useHydrateEstablishment() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: () => establishmentService.hydrateFromBackend(),
    onSuccess: () => {
      invalidateEstablishmentQueries(queryClient, officeId);
    },
  });
}

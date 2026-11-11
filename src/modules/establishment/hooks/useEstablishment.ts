import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { establishmentService } from '../services/establishment.service';
import type { EstablishmentEmployee } from '../types';

function establishmentEmployeesKey(): readonly unknown[] {
  return ['establishmentEmployees'];
}

function establishmentSyncKey(): readonly unknown[] {
  return ['establishmentLastSync'];
}

function invalidateEstablishmentQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: establishmentEmployeesKey() });
  queryClient.invalidateQueries({ queryKey: establishmentSyncKey() });
}

export function useEstablishmentEmployees() {
  return useQuery({
    queryKey: establishmentEmployeesKey(),
    queryFn: () => establishmentService.syncEmployees(),
    initialData: () => establishmentService.loadEmployees(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useEstablishmentLastSyncedAt() {
  return useQuery({
    queryKey: establishmentSyncKey(),
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
  const syncedOfficeRef = useRef<string | null>(null);

  useEffect(() => {
    if (syncedOfficeRef.current === '1') return;
    syncedOfficeRef.current = '1';
    let cancelled = false;
    void Promise.all([
      establishmentService.syncEmployees(),
      establishmentService.loadState().lastSyncedAt,
    ]).then(() => {
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['establishmentLastSync'] });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);
}

export function useSaveEstablishmentEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employee: EstablishmentEmployee) =>
      establishmentService.saveEmployee(employee),
    onSuccess: (saved) => {
      queryClient.setQueryData<EstablishmentEmployee[]>(
        establishmentEmployeesKey(),
        (old = []) => {
          const index = old.findIndex((e) => e.id === saved.id);
          if (index >= 0) {
            const next = [...old];
            next[index] = saved;
            return next;
          }
          return [...old, saved];
        }
      );
      // The saved row is already merged above. Do not refetch the entire
      // register (employees + pay history) after every single save.
      queryClient.invalidateQueries({ queryKey: establishmentSyncKey() });
    },
  });
}

export function useDeleteEstablishmentEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => establishmentService.deleteEmployee(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<EstablishmentEmployee[]>(
        establishmentEmployeesKey(),
        (old = []) => old.filter((e) => e.id !== deletedId)
      );
      invalidateEstablishmentQueries(queryClient);
    },
  });
}

export function useSaveEstablishmentEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employees: EstablishmentEmployee[]) =>
      establishmentService.saveEmployees(employees),
    onSuccess: () => {
      invalidateEstablishmentQueries(queryClient);
    },
  });
}

export function useReorderEstablishmentEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: string[]) => establishmentService.reorderEmployees(orderedIds),
    onSuccess: (sequenced) => {
      queryClient.setQueryData<EstablishmentEmployee[]>(
        establishmentEmployeesKey(),
        sequenced
      );
      invalidateEstablishmentQueries(queryClient);
    },
  });
}

export function useHydrateEstablishment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => establishmentService.hydrateFromBackend(),
    onSuccess: () => {
      invalidateEstablishmentQueries(queryClient);
    },
  });
}

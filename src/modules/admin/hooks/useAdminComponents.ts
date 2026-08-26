import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAdminQueries } from '@/shared/utilities/adminQuery';
import { adminComponentsService } from '../services/adminComponents.service';
import type { AdminComponentInput } from '../types/components';

export function useAdminComponents() {
  return useQuery({
    queryKey: ['admin-components'],
    queryFn: () => adminComponentsService.list(),
    select: (data) => data ?? [],
  });
}

export function useAdminComponentSave() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (input: AdminComponentInput) => adminComponentsService.save(input),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });

  return {
    saveComponentAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    error: saveMutation.error,
  };
}

export function useAdminComponentSetActive() {
  const queryClient = useQueryClient();

  const setActiveMutation = useMutation({
    mutationFn: ({ componentId, active }: { componentId: string; active: boolean }) =>
      adminComponentsService.setActive(componentId, active),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });

  return {
    setActiveAsync: setActiveMutation.mutateAsync,
    isSettingActive: setActiveMutation.isPending,
    error: setActiveMutation.error,
  };
}

export function useAdminComponentDelete() {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (componentId: string) => adminComponentsService.remove(componentId),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });

  return {
    deleteComponentAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    error: deleteMutation.error,
  };
}

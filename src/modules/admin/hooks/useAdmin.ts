import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
import { invalidateAdminQueries } from '@/shared/utilities/adminQuery';
import type { CreateUserInput } from '../types';

export function useSystemStats() {
  return useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: () => adminService.getSystemStats(),
  });
}

export function useOfficeStats() {
  return useQuery({
    queryKey: ['admin-office-stats'],
    queryFn: () => adminService.getOfficeStats(),
  });
}

export function useEntryCompletion() {
  return useQuery({
    queryKey: ['admin-entry-completion'],
    queryFn: () => adminService.getEntryCompletion(),
  });
}

export function useDataEntryReport() {
  return useQuery({
    queryKey: ['admin-data-entry-report'],
    queryFn: () => adminService.getDataEntryReport(),
  });
}

export function useUsers() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.listUsers(),
  });

  const setUserRoleMutation = useMutation({
    mutationFn: ({ userId, role, officeId }: { userId: string; role: 'admin' | 'office'; officeId: string | null }) =>
      adminService.setUserRole(userId, role, officeId),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });

  const setUserStatusMutation = useMutation({
    mutationFn: ({ userId, suspended }: { userId: string; suspended: boolean }) =>
      adminService.setUserStatus(userId, suspended),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    setUserRoleAsync: setUserRoleMutation.mutateAsync,
    isSettingRole: setUserRoleMutation.isPending,
    setUserStatusAsync: setUserStatusMutation.mutateAsync,
    isSettingStatus: setUserStatusMutation.isPending,
    deleteUserAsync: deleteUserMutation.mutateAsync,
    isDeleting: deleteUserMutation.isPending,
  };
}

export function useOffices() {
  return useQuery({
    queryKey: ['admin-offices'],
    queryFn: () => adminService.listOffices(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => adminService.createUser(input),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });
}

export function useOfficeFinancialYears(officeId: string | null) {
  return useQuery({
    queryKey: ['admin-office-financial-years', officeId],
    queryFn: () => adminService.getFinancialYears(officeId!),
    enabled: !!officeId,
  });
}

export function useImportHealth() {
  return useQuery({
    queryKey: ['admin-import-health'],
    queryFn: () => adminService.getImportHealth(),
  });
}

export function useOfficeConfig(officeId: string | null) {
  return useQuery({
    queryKey: ['admin-office-config', officeId],
    queryFn: () => adminService.getOfficeConfig(officeId!),
    enabled: !!officeId,
  });
}

export function useSetOfficeFy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ officeId, fy }: { officeId: string; fy: number }) =>
      adminService.setOfficeFy(officeId, fy),
    onSuccess: () => {
      void invalidateAdminQueries(queryClient);
    },
  });
}


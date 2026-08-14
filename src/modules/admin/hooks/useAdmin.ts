import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
import type { CreateUserInput, UpdateOfficeInput } from '../types';

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
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-office-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-data-entry-report'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  const setUserStatusMutation = useMutation({
    mutationFn: ({ userId, suspended }: { userId: string; suspended: boolean }) =>
      adminService.setUserStatus(userId, suspended),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-office-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-office-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-data-entry-report'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
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

export function useCreateOffice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, district }: { name: string; district?: string | null }) =>
      adminService.createOffice(name, district ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-office-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

export function useUpdateOffice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOfficeInput) => adminService.updateOffice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-office-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => adminService.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-office-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
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


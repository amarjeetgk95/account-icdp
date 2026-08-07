import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
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
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    setUserRole: setUserRoleMutation.mutate,
    isSettingRole: setUserRoleMutation.isPending,
    deleteUser: deleteUserMutation.mutate,
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
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
    },
  });
}

export function useDataEntryReport() {
  return useQuery({
    queryKey: ['admin-data-entry-report'],
    queryFn: () => adminService.getDataEntryReport(),
  });
}

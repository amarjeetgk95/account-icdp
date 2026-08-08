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
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    setUserRole: setUserRoleMutation.mutate,
    setUserRoleAsync: setUserRoleMutation.mutateAsync,
    isSettingRole: setUserRoleMutation.isPending,
    deleteUser: deleteUserMutation.mutate,
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
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });
}

export function useDataEntryReport() {
  return useQuery({
    queryKey: ['admin-data-entry-report'],
    queryFn: () => adminService.getDataEntryReport(),
  });
}

export function useEntryCompletion() {
  return useQuery({
    queryKey: ['admin-entry-completion'],
    queryFn: () => adminService.getEntryCompletion(),
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminService.listAuditLogs(),
  });
}

export function useOfficeFinancialYears(officeId: string | null) {
  return useQuery({
    queryKey: ['admin-office-financial-years', officeId],
    queryFn: () => adminService.getFinancialYears(officeId!),
    enabled: !!officeId,
  });
}

export function useReportOfficeDetails(officeId: string | null) {
  return useQuery({
    queryKey: ['admin-report-office-details', officeId],
    queryFn: () => adminService.getOfficeDetails(officeId!),
    enabled: !!officeId,
  });
}

export function useAdminQuarterReport(quarter: string | null, fy: number | null, officeId: string | null) {
  return useQuery({
    queryKey: ['admin-quarter-report', quarter, fy, officeId],
    queryFn: () => adminService.getQuarterReport(quarter!, fy!, officeId!),
    enabled: !!quarter && !!fy && !!officeId,
  });
}

export function useAdminGSTReport(quarter: string | null, fy: number | null, officeId: string | null) {
  return useQuery({
    queryKey: ['admin-gst-report', quarter, fy, officeId],
    queryFn: () => adminService.getGSTReport(fy!, quarter!, officeId!),
    enabled: !!quarter && !!fy && !!officeId,
  });
}

export function useAdminIncomeTaxReport(quarter: string | null, fy: number | null, officeId: string | null) {
  return useQuery({
    queryKey: ['admin-it-report', quarter, fy, officeId],
    queryFn: () => adminService.getIncomeTaxReport(fy!, quarter!, officeId!),
    enabled: !!quarter && !!fy && !!officeId,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employee.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { EmployeeInput } from '../validation/employee.schema';

export function useEmployees() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  const employeesQuery = useQuery({
    queryKey: ['employees', officeId],
    queryFn: () => employeeService.listEmployees(),
    enabled: !!officeId,
  });

  const createMutation = useMutation({
    mutationFn: (input: EmployeeInput) => employeeService.addEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: EmployeeInput) => employeeService.updateEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, pan }: { id: string; pan: string }) =>
      employeeService.deleteEmployee(id, pan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  return {
    employees: employeesQuery.data ?? [],
    isLoading: employeesQuery.isLoading,
    isError: employeesQuery.isError,
    error: employeesQuery.error,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

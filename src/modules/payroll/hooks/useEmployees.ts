import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employee.service';
import type { EmployeeInput } from '../validation/employee.schema';

export function useEmployees() {
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.listEmployees(),
  });

  const createMutation = useMutation({
    mutationFn: (input: EmployeeInput) => employeeService.addEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-roster'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-month-check'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-budget-head-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: EmployeeInput) => employeeService.updateEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-roster'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-month-check'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-budget-head-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, pan }: { id: string; pan: string }) =>
      employeeService.deleteEmployee(id, pan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-roster'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-month-check'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-budget-head-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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

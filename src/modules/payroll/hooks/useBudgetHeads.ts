import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetHeadService } from '../services/budgetHead.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { BudgetHeadInput } from '../types';

export function useBudgetHeads() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  const headsQuery = useQuery({
    queryKey: ['budget-heads', officeId],
    queryFn: () => budgetHeadService.listBudgetHeads(),
    enabled: !!officeId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-heads'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['payroll-budget-head-report'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: BudgetHeadInput) => budgetHeadService.addBudgetHead(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (input: BudgetHeadInput) => budgetHeadService.updateBudgetHead(input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetHeadService.deleteBudgetHead(id),
    onSuccess: invalidate,
  });

  return {
    heads: headsQuery.data ?? [],
    isLoading: headsQuery.isLoading,
    isError: headsQuery.isError,
    error: headsQuery.error,
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialYearRepository } from '../repositories/financialYear.repository';
import { useUIStore } from '@/core/stores/ui-store';

export function useFinancialYear() {
  const queryClient = useQueryClient();
  const setActiveFinancialYear = useUIStore((state) => state.setActiveFinancialYear);

  const yearQuery = useQuery({
    queryKey: ['financial-year'],
    queryFn: () => financialYearRepository.getCurrent(),
  });

  const changeMutation = useMutation({
    mutationFn: (year: number) => financialYearRepository.set(year),
    onSuccess: (_data, year) => {
      setActiveFinancialYear(year);
      queryClient.invalidateQueries({ queryKey: ['financial-year'] });
    },
  });

  return {
    currentYear: yearQuery.data,
    isLoading: yearQuery.isLoading,
    isError: yearQuery.isError,
    error: yearQuery.error,
    changeYear: changeMutation.mutate,
    changeYearAsync: changeMutation.mutateAsync,
    isChanging: changeMutation.isPending,
    changeError: changeMutation.error,
  };
}

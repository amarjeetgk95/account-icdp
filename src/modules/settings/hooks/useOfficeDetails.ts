import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { officeService } from '../services/office.service';
import type { OfficeDetailsInput } from '../validation/settings.schema';

export function useOfficeDetails() {
  const queryClient = useQueryClient();

  const detailsQuery = useQuery({
    queryKey: ['office-details'],
    queryFn: () => officeService.getDetails(),
  });

  const saveMutation = useMutation({
    mutationFn: (input: OfficeDetailsInput) => officeService.saveDetails(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-details'] });
    },
  });

  return {
    details: detailsQuery.data,
    isLoading: detailsQuery.isLoading,
    isError: detailsQuery.isError,
    error: detailsQuery.error,
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}

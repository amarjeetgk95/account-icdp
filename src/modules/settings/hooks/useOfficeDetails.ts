import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { officeService } from '../services/office.service';
import type { OfficeDetailsInput } from '../validation/settings.schema';

export function useOfficeDetails(enabled = true) {
  const queryClient = useQueryClient();

  const detailsQuery = useQuery({
    queryKey: ['office-details'],
    queryFn: () => officeService.getDetails(),
    enabled,
    // Don't silently retry a blocked read forever; surface it so the form
    // can show "load failed" instead of an empty form that discards saves.
    retry: 1,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: (input: OfficeDetailsInput) => officeService.saveDetails(input),
    onSuccess: (_data, input) => {
      // Optimistic cache: keep the just-saved values visible even if the
      // refetch is slow/fails, so the form never wipes typed data.
      queryClient.setQueryData(['office-details'], input);
      queryClient.invalidateQueries({ queryKey: ['office-details'] });
      queryClient.invalidateQueries({ queryKey: ['office-name'] });
    },
  });

  return {
    details: detailsQuery.data,
    isLoading: detailsQuery.isLoading,
    isError: detailsQuery.isError,
    error: detailsQuery.error,
    refetch: detailsQuery.refetch,
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}

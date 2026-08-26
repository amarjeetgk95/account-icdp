import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { officeService } from '../services/office.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import { isAllOfficesMode } from '@/shared/utilities/office';
import type { OfficeDetailsInput } from '../validation/settings.schema';

export function useOfficeDetails() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  const allOffices = isAllOfficesMode();

  const detailsQuery = useQuery({
    queryKey: ['office-details', officeId],
    queryFn: () => officeService.getDetails(),
    enabled: !!officeId && !allOffices,
  });

  const saveMutation = useMutation({
    mutationFn: (input: OfficeDetailsInput) => officeService.saveDetails(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-details'] });
      queryClient.invalidateQueries({ queryKey: ['office-name'] });
    },
  });

  return {
    details: allOffices ? undefined : detailsQuery.data,
    isLoading: allOffices ? false : detailsQuery.isLoading,
    isError: detailsQuery.isError,
    error: detailsQuery.error,
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}
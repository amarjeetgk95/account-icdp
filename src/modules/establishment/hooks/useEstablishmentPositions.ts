import { useQuery } from '@tanstack/react-query';
import { fetchPositionsList } from '../repositories/positionBackend.repository';

/**
 * Establishment-owned sanctioned post lookup.
 * Used by in-module pickers/reports so they never fall back to the legacy
 * `establishment_posts` aggregate or payroll masters.
 */
export function useEstablishmentPositions() {
  return useQuery({
    queryKey: ['establishmentPositions'],
    queryFn: fetchPositionsList,
    staleTime: 30_000,
  });
}

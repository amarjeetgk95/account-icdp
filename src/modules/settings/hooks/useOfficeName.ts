import { useQuery } from '@tanstack/react-query';
import { officeService } from '../services/office.service';

export function useOfficeName(): string {
  const query = useQuery({
    queryKey: ['office-name'],
    queryFn: () => officeService.getName(),
    staleTime: 5 * 60 * 1000,
  });

  return query.data || 'ICDP SURAT, GUJARAT';
}
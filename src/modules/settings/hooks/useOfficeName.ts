import { useQuery } from '@tanstack/react-query';
import { officeService } from '../services/office.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useOfficeName(): string {
  const officeId = useActiveOfficeId();

  const query = useQuery({
    queryKey: ['office-name', officeId],
    queryFn: () => officeService.getName(),
    enabled: !!officeId,
  });

  return query.data ?? '';
}

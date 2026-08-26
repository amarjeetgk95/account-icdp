import { useQuery } from '@tanstack/react-query';
import type { GTR30Bill } from '../types';
import { gtr30BillsService } from '../services/gtr30Bills.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useGtr30Bills() {
  const officeId = useActiveOfficeId();
  return useQuery<GTR30Bill[]>({
    queryKey: ['gtr30Bills', officeId ?? null],
    queryFn: () => gtr30BillsService.listBills(),
  });
}

export function useGtr30Bill(id: string | null | undefined) {
  const officeId = useActiveOfficeId();
  return useQuery<GTR30Bill | null>({
    queryKey: ['gtr30Bill', officeId ?? null, id],
    queryFn: () => (id ? gtr30BillsService.getBill(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export { gtr30BillsService };

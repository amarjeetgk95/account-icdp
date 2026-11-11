import { useQuery } from '@tanstack/react-query';
import type { GTR30Bill } from '../types';
import { gtr30BillsService } from '../services/gtr30Bills.service';

export function useGtr30Bills() {
  return useQuery<GTR30Bill[]>({
    queryKey: ['gtr30Bills'],
    queryFn: () => gtr30BillsService.listBills(),
  });
}

export function useGtr30Bill(id: string | null | undefined) {
  return useQuery<GTR30Bill | null>({
    queryKey: ['gtr30Bill', id],
    queryFn: () => (id ? gtr30BillsService.getBill(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export { gtr30BillsService };

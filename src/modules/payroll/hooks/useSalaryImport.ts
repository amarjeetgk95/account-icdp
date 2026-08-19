import { useQuery } from '@tanstack/react-query';
import { salaryRepository } from '../repositories/salary.repository';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { Database } from '@/shared/database.types';

type EmployeeSalary = Database['public']['Tables']['employee_salary']['Row'];

export function useEmployeeLookupDetails(searchQuery: string, financialYear: number, selectedHrpn?: string) {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['salary-lookup-details', officeId, searchQuery, financialYear, selectedHrpn],
    queryFn: () => salaryRepository.getEmployeeLookupDetails(searchQuery, financialYear, selectedHrpn),
    enabled: !!officeId && !!searchQuery && !!financialYear,
  });
}

export function useLatestSalaries() {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['latest-salaries', officeId],
    queryFn: async (): Promise<Map<string, EmployeeSalary>> => {
      const data = await salaryRepository.listLatestByOffice();
      const map = new Map<string, EmployeeSalary>();
      for (const row of data) {
        const key = row.hprn_no.toLowerCase();
        const existing = map.get(key);
        if (!existing || new Date(existing.created_at).getTime() < new Date(row.created_at).getTime()) {
          map.set(key, row);
        }
      }
      return map;
    },
    enabled: !!officeId,
  });
}
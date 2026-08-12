import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salaryRepository } from '../repositories/salary.repository';
import { salaryService } from '../services/salary.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import type { Database } from '@/shared/database.types';

type EmployeeSalary = Database['public']['Tables']['employee_salary']['Row'];

export function useSalaryImports(financialYear?: number) {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['salary-imports', officeId, financialYear],
    queryFn: () => salaryRepository.listImports(financialYear),
    enabled: !!officeId,
  });
}

export function useImportSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => salaryService.importSalary(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-imports'] });
      queryClient.invalidateQueries({ queryKey: ['latest-salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salary-lookup'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['latest-salaries'] });
    },
  });
}

export function useEmployeeSalaryHistory(hrpn: string, financialYear: number) {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['salary-history', officeId, hrpn, financialYear],
    queryFn: () => salaryRepository.listByHrpn(hrpn, financialYear),
    enabled: !!officeId && !!hrpn && !!financialYear,
    select: (data) => data || [],
  });
}

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
    queryFn: () => salaryRepository.listLatestByOffice(),
    enabled: !!officeId,
    select: (data): Map<string, EmployeeSalary> => {
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
  });
}

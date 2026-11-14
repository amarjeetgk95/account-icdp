import { useQuery } from '@tanstack/react-query';
import { establishmentBackendRepository } from '../repositories/establishmentBackend.repository';
import { employeeRepository } from '@/modules/payroll/repositories/employee.repository';
import { fetchParityReport, type ParityReport } from '../services/employeeParity.service';

/**
 * Diagnostic query for employee canonicalization: compares Establishment and Payroll
 * registers read-only. GTR-30 and GTR-44 are standalone and decoupled from this report.
 */
export function useEmployeeParity(enabled = true) {
  return useQuery<ParityReport>({
    queryKey: ['establishmentParity'],
    queryFn: () =>
      fetchParityReport({
        listEstablishment: () => establishmentBackendRepository.listEmployees(),
        listPayroll: () => employeeRepository.list(),
      }),
    enabled,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });
}

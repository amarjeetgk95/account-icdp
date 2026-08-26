import { useQuery } from '@tanstack/react-query';
import { paybillRepository } from '../repositories/paybill.repository';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import { employeeService } from '@/modules/payroll/services/employee.service';
import { servesInFinancialYear, type EstablishmentEmployee } from '@/modules/establishment/types';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';

export interface PaybillDirectoryEntry {
  hrpn: string;
  name: string;
  designation?: string | null;
  payScale?: string | null;
  joinDate?: string | null;
  transferDate?: string | null;
}

/**
 * Merge all employees who have drawn salary or served during the given financial year:
 * 1. Employees with paybill records in this FY (earnings or deductions)
 * 2. Establishment employees who served in this FY (joining and transfer dates overlapping this FY)
 * 3. Payroll master employees who served in this FY
 */
export function buildEmployeeDirectory(
  earnings: PayBillStoredEarning[],
  deductions: PayBillStoredDeduction[],
  estEmployees: EstablishmentEmployee[],
  financialYear: number,
  payrollEmployees?: Array<{ hprn_no?: string | null; name: string; designation?: string | null; pay_scale?: string | null; join_date?: string | null; transfer_date?: string | null }>
): PaybillDirectoryEntry[] {
  const map = new Map<string, PaybillDirectoryEntry>();

  // 1. Any employee with earnings in this financial year (even for 1 single month before transfer)
  for (const e of earnings) {
    const hrpnKey = (e.hrpn || '').trim();
    if (!hrpnKey || map.has(hrpnKey)) continue;
    map.set(hrpnKey, {
      hrpn: hrpnKey,
      name: e.employeeName || 'Employee',
      designation: e.designation || null,
      payScale: e.payScale || null,
    });
  }

  // 2. Any employee with deductions in this financial year
  for (const d of deductions) {
    const hrpnKey = (d.hrpn || '').trim();
    if (!hrpnKey || map.has(hrpnKey)) continue;
    map.set(hrpnKey, {
      hrpn: hrpnKey,
      name: d.employeeName || 'Employee',
      designation: d.designation || null,
      payScale: null,
    });
  }

  // 3. Establishment employees who served in this specific financial year
  for (const emp of estEmployees) {
    const hrpnKey = (emp.hrpnNo || emp.pan || emp.id || '').trim();
    if (!hrpnKey) continue;
    if (!servesInFinancialYear(emp, financialYear)) continue;

    if (!map.has(hrpnKey)) {
      map.set(hrpnKey, {
        hrpn: hrpnKey,
        name: emp.name,
        designation: emp.designation || null,
        payScale: emp.payScale || null,
        ...(emp.joinDate ? { joinDate: emp.joinDate } : {}),
        ...(emp.transferDate ? { transferDate: emp.transferDate } : {}),
      });
    } else {
      const existing = map.get(hrpnKey)!;
      if (!existing.joinDate && emp.joinDate) existing.joinDate = emp.joinDate;
      if (!existing.transferDate && emp.transferDate) existing.transferDate = emp.transferDate;
      if (!existing.designation && emp.designation) existing.designation = emp.designation;
      if (!existing.payScale && emp.payScale) existing.payScale = emp.payScale;
    }
  }

  // 4. Payroll Master employees who served in this specific financial year
  if (payrollEmployees && Array.isArray(payrollEmployees)) {
    for (const p of payrollEmployees) {
      const hrpnKey = (p.hprn_no || (p as { pan?: string }).pan || (p as { id?: string }).id || '').trim();
      if (!hrpnKey) continue;
      if (!servesInFinancialYear({ joinDate: p.join_date, transferDate: p.transfer_date }, financialYear)) continue;

      if (!map.has(hrpnKey)) {
        map.set(hrpnKey, {
          hrpn: hrpnKey,
          name: p.name,
          designation: p.designation || null,
          payScale: p.pay_scale || null,
          ...(p.join_date ? { joinDate: p.join_date } : {}),
          ...(p.transfer_date ? { transferDate: p.transfer_date } : {}),
        });
      }
    }
  }

  return Array.from(map.values());
}

export function useEmployeeDirectory(financialYear: number) {
  const query = useQuery({
    queryKey: ['paybill', 'directory', financialYear],
    queryFn: async () => {
      const [earnings, deductions] = await Promise.all([
        paybillRepository.listEarnings({ financialYear }),
        paybillRepository.listDeductions({ financialYear }),
      ]);

      let estEmployees: EstablishmentEmployee[] = [];
      try {
        estEmployees = await establishmentService.syncEmployees();
        if (!estEmployees || estEmployees.length === 0) estEmployees = establishmentService.loadEmployees();
      } catch (err) {
        console.warn('[useEmployeeDirectory] establishment sync failed:', err);
        estEmployees = establishmentService.loadEmployees();
      }

      let payrollEmployees: Array<{ hprn_no?: string | null; name: string; designation?: string | null; pay_scale?: string | null }> = [];
      try {
        payrollEmployees = await employeeService.listEmployees();
      } catch (err) {
        console.warn('[useEmployeeDirectory] payroll employees fetch failed:', err);
      }

      return buildEmployeeDirectory(earnings, deductions, estEmployees, financialYear, payrollEmployees);
    },
    staleTime: 60_000,
  });

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import { MONTHS } from '@/shared/constants';
import { isActiveInEntryMonth } from '../utils/employeeDates';
import type { EmployeeRosterItem, QuarterReport } from '../types';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type Salary = Database['public']['Tables']['employee_salaries']['Row'];

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

export const payrollRepository = {
  async checkMonthData(month: string, fy: number, officeId?: string): Promise<{ count: number }> {
    const targetOfficeId = officeId || getOfficeId();
    if (!targetOfficeId) throw new Error('No office selected');

    const { count } = await (supabase as any)
      .from('employee_salaries')
      .select('*', { count: 'exact', head: true })
      .eq('financial_year', fy)
      .eq('month', month)
      .eq('office_id', targetOfficeId);

    return { count: count || 0 };
  },

  async getRosterForMonth(month: string, fy: number): Promise<EmployeeRosterItem[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data: employees } = await (supabase as any)
      .from('employees')
      .select('id, name, pan, join_date, transfer_date')
      .eq('office_id', officeId)
      .order('name');

    const { data: salaries } = await (supabase as any)
      .from('employee_salaries')
      .select('employee_id, gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', month)
      .eq('office_id', officeId);

    const salMap: Record<string, Salary> = {};
    (salaries || []).forEach((s: Salary) => {
      salMap[s.employee_id] = s;
    });

    return (employees || [])
      .filter((emp: Employee) => emp.name && emp.pan)
      .filter((emp: Employee) => isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, month))
      .map((emp: Employee) => {
        const sal = salMap[emp.id];
        return {
          id: emp.id,
          name: emp.name,
          pan: emp.pan,
          hasEntry: !!sal,
          gross: sal?.gross || 0,
          da: sal?.da || 0,
          tax: sal?.tax || 0,
        };
      });
  },

  async saveBulkSalary(
    month: string,
    entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>,
    fy: number
  ): Promise<string> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    if (!officeId) throw new Error('No office selected');

    const records = entries.map((e) => ({
      employee_id: e.employeeId,
      office_id: officeId,
      financial_year: fy,
      month,
      gross: Math.round(e.gross * 100) / 100,
      da: Math.round(e.da * 100) / 100,
      tax: Math.round(e.tax * 100) / 100,
    }));

    const { error } = await (supabase as any)
      .from('employee_salaries')
      .upsert(records, { onConflict: 'employee_id,financial_year,month' });

    if (error) throw error;
    return `Successfully saved ${entries.length} records for ${month}.`;
  },

  async getEmployeeSalaryForMonth(employeeId: string, month: string, fy: number): Promise<{ gross: number; da: number; tax: number } | null> {
    const { data, error } = await (supabase as any)
      .from('employee_salaries')
      .select('gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', month)
      .eq('employee_id', employeeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? { gross: Number(data.gross) || 0, da: Number(data.da) || 0, tax: Number(data.tax) || 0 } : null;
  },

  async copyPreviousMonth(fromMonth: string, toMonth: string, fy: number): Promise<{ copied: number; created: number }> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const monthIdx = MONTHS.indexOf(fromMonth as any);
    if (monthIdx === -1) throw new Error('Invalid source month');
    if (fromMonth === toMonth) throw new Error('Source and target month cannot be the same');

    const { data: employees } = await (supabase as any)
      .from('employees')
      .select('id, name, join_date, transfer_date')
      .eq('office_id', officeId)
      .order('id');

    const { data: prevSalaries } = await (supabase as any)
      .from('employee_salaries')
      .select('employee_id, gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', fromMonth)
      .eq('office_id', officeId);

    const prevMap: Record<string, Salary> = {};
    (prevSalaries || []).forEach((s: Salary) => {
      prevMap[s.employee_id] = s;
    });

    const records: any[] = [];

    (employees || []).forEach((emp: Employee) => {
      // Only employees who worked at least one day in the TARGET month's
      // work period may be copied forward (uses the target slot, not today).
      if (!isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, toMonth)) return;

      const prev = prevMap[emp.id];
      if (!prev) return;

      records.push({
        employee_id: emp.id,
        office_id: officeId,
        financial_year: fy,
        month: toMonth,
        gross: prev.gross,
        da: prev.da,
        tax: prev.tax,
      });
    });

    if (records.length > 0) {
      const { error } = await (supabase as any)
        .from('employee_salaries')
        .upsert(records, { onConflict: 'employee_id,financial_year,month' });

      if (error) throw error;
    }

    return { copied: prevSalaries?.length || 0, created: records.length };
  },

  async clearMonthSalary(month: string, fy: number, officeId?: string): Promise<number> {
    const targetOfficeId = officeId || getOfficeId();
    if (!targetOfficeId) throw new Error('No office selected');

    const { count, error } = await (supabase as any)
      .from('employee_salaries')
      .delete()
      .eq('office_id', targetOfficeId)
      .eq('financial_year', fy)
      .eq('month', month);

    if (error) throw error;
    return count || 0;
  },

  async getQuarterReport(quarter: string, fy: number, officeId?: string): Promise<QuarterReport> {
    const targetOfficeId = officeId || getOfficeId();
    if (!targetOfficeId) throw new Error('No office selected');

    const quarterConfig: Record<string, string[]> = {
      Q1: ['April', 'May', 'June'],
      Q2: ['July', 'August', 'September'],
      Q3: ['October', 'November', 'December'],
      Q4: ['January', 'February', 'March'],
    };

    const months = quarterConfig[quarter] || quarterConfig.Q1;

    const { data: employees } = await (supabase as any)
      .from('employees')
      .select('id, name, pan')
      .eq('office_id', targetOfficeId)
      .order('id');

    const { data: salaries } = await (supabase as any)
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy)
      .eq('office_id', targetOfficeId);

    const salMap: Record<string, Record<string, Salary>> = {};
    (salaries || []).forEach((s: Salary) => {
      if (!salMap[s.employee_id]) salMap[s.employee_id] = {};
      salMap[s.employee_id][s.month] = s;
    });

    const rows = (employees || [])
      .filter((emp: Employee) => emp.name && emp.pan)
      .map((emp: Employee) => {
        const sm = salMap[emp.id] || {};
        const g = [0, 0, 0];
        const t = [0, 0, 0];
        let d = 0;

        months.forEach((m, i) => {
          const r = sm[m] || {};
          g[i] = Math.round((r.gross || 0) * 100) / 100;
          d += Math.round((r.da || 0) * 100) / 100;
          t[i] = Math.round((r.tax || 0) * 100) / 100;
        });

        const gross = g[0] + g[1] + g[2];
        const tax = t[0] + t[1] + t[2];
        const total = gross + d;

        if (total === 0 && tax === 0) return null;

        return { name: emp.name, pan: emp.pan, g, d, total, t, tax };
      })
      .filter(Boolean) as QuarterReport['rows'];

    const y1 = String(fy).slice(-2);
    const y2 = String(fy + 1).slice(-2);

    const quarterLabels: Record<string, { work: string[]; paid: string[]; workYear: number[]; paidYear: number[] }> = {
      Q1: { work: ['Mar', 'Apr', 'May'], paid: ['Apr', 'May', 'Jun'], workYear: [0, 0, 0], paidYear: [0, 0, 0] },
      Q2: { work: ['Jun', 'Jul', 'Aug'], paid: ['Jul', 'Aug', 'Sep'], workYear: [0, 0, 0], paidYear: [0, 0, 0] },
      Q3: { work: ['Sep', 'Oct', 'Nov'], paid: ['Oct', 'Nov', 'Dec'], workYear: [0, 0, 0], paidYear: [0, 0, 0] },
      Q4: { work: ['Dec', 'Jan', 'Feb'], paid: ['Jan', 'Feb', 'Mar'], workYear: [0, 1, 1], paidYear: [1, 1, 1] },
    };
    const labelCfg = quarterLabels[quarter] || quarterLabels.Q1;

    return {
      fy,
      fyLabel: `${fy}-${y2}`,
      ayLabel: `${fy + 1}-${String(fy + 2).slice(-2)}`,
      quarter,
      labels: labelCfg.work.map((_, i) => ({
        work: `${labelCfg.work[i]}-${labelCfg.workYear[i] ? y2 : y1}`,
        paid: `${labelCfg.paid[i]}-${labelCfg.paidYear[i] ? y2 : y1}`,
      })),
      rows,
    };
  },
};

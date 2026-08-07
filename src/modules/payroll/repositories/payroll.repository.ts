import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { MONTHS } from '@/shared/constants';
import type { EmployeeRosterItem, QuarterReport } from '../types';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type Salary = Database['public']['Tables']['employee_salaries']['Row'];

function getOfficeId(): string | null {
  return useUIStore.getState().activeOfficeId;
}

function getFinancialYear(): number {
  return useUIStore.getState().activeFinancialYear;
}

export const payrollRepository = {
  async getRosterForMonth(month: string): Promise<EmployeeRosterItem[]> {
    const officeId = getOfficeId();
    const fy = getFinancialYear();
    if (!officeId) throw new Error('No office selected');

    const { data: employees } = await (supabase as any)
      .from('employees')
      .select('id, name, pan')
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
    entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>
  ): Promise<string> {
    const officeId = getOfficeId();
    const fy = getFinancialYear();
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

  async copyPreviousMonth(fromMonth: string): Promise<void> {
    const officeId = getOfficeId();
    const fy = getFinancialYear();
    if (!officeId) throw new Error('No office selected');

    const monthIdx = MONTHS.indexOf(fromMonth as any);
    if (monthIdx === -1) throw new Error('Invalid month');

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

    const now = new Date();
    const records: any[] = [];

    (employees || []).forEach((emp: Employee) => {
      const join = emp.join_date ? new Date(emp.join_date) : null;
      const transfer = emp.transfer_date ? new Date(emp.transfer_date) : null;

      if (!join || join.getTime() > now.getTime()) return;
      if (transfer && transfer.getTime() <= now.getTime()) return;

      const prev = prevMap[emp.id];
      if (!prev) return;

      records.push({
        employee_id: emp.id,
        office_id: officeId,
        financial_year: fy,
        month: fromMonth,
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

    return {
      fy,
      fyLabel: `${fy}-${y2}`,
      ayLabel: `${fy + 1}-${String(fy + 2).slice(-2)}`,
      quarter,
      labels: months.map((m, i) => ({
        work: `${['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'][MONTHS.indexOf(m as any)]}-${i < 9 ? y1 : y2}`,
        paid: `${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][MONTHS.indexOf(m as any)]}-${i < 9 ? y1 : y2}`,
      })),
      rows,
    };
  },
};

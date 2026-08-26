import { supabase } from '@/core/supabase/client';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';
import { isActiveInEntryMonth } from '../utils/employeeDates';
import type { EmployeeRosterItem, QuarterReport, BudgetHeadReport, BudgetHeadReportGroup } from '../types';


export const payrollRepository = {
  async checkMonthData(month: string, fy: number, officeId?: string): Promise<{ count: number }> {
    const scope = getOfficeScope(officeId);
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    let q = supabase
      .from('employee_salaries')
      .select('*', { count: 'exact', head: true })
      .eq('financial_year', fy)
      .eq('month', month);
    if (!scope.all) q = q.eq('office_id', scope.officeId!);

    const { count } = await q;
    return { count: count || 0 };
  },

  async getRosterForMonth(month: string, fy: number): Promise<EmployeeRosterItem[]> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    let qEmployees = supabase
      .from('employees')
      .select('id, name, pan, hprn_no, join_date, transfer_date');
    if (!scope.all) qEmployees = qEmployees.eq('office_id', scope.officeId!);
    const { data: employees } = await qEmployees.order('id');

    let qSalaries = supabase
      .from('employee_salaries')
      .select('employee_id, gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', month);
    if (!scope.all) qSalaries = qSalaries.eq('office_id', scope.officeId!);
    const { data: salaries } = await qSalaries;

    const salMap: Record<string, { gross: number; da: number; tax: number }> = {};
    (salaries || []).forEach((s) => {
      salMap[s.employee_id] = s;
    });

    return (employees || [])
      .filter((emp) => emp.name && emp.pan)
      .filter((emp) => isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, month))
      .map((emp) => {
        const sal = salMap[emp.id];
        return {
          id: emp.id,
          name: emp.name,
          pan: emp.pan ? emp.pan.toUpperCase() : '',
          hprnNo: emp.hprn_no || undefined,
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
    const officeId = requireOfficeId();

    const records = entries.map((e) => ({
      employee_id: e.employeeId,
      office_id: officeId,
      financial_year: fy,
      month,
      gross: Math.round(e.gross * 100) / 100,
      da: Math.round(e.da * 100) / 100,
      tax: Math.round(e.tax * 100) / 100,
    }));

    const { error } = await supabase
      .from('employee_salaries')
      .upsert(records, { onConflict: 'employee_id,financial_year,month' });

    if (error) throw error;
    const withData = entries.filter((e) => e.gross > 0 || e.da > 0 || e.tax > 0).length;
    return `Saved ${withData} of ${entries.length} record${entries.length !== 1 ? 's' : ''} for ${month}.`;
  },

  async getEmployeeSalaryForMonth(employeeId: string, month: string, fy: number): Promise<{ gross: number; da: number; tax: number } | null> {
    const { data, error } = await supabase
      .from('employee_salaries')
      .select('gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', month)
      .eq('employee_id', employeeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? { gross: Number(data.gross) || 0, da: Number(data.da) || 0, tax: Number(data.tax) || 0 } : null;
  },

  async getPreviousMonthSalaries(
    month: string,
    fy: number
  ): Promise<Array<{ employeeId: string; gross: number; da: number; tax: number }>> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    let q = supabase
      .from('employee_salaries')
      .select('employee_id, gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', month);
    if (!scope.all) q = q.eq('office_id', scope.officeId!);
    const { data, error } = await q;

    if (error) throw error;

    return (data || []).map((s) => ({
      employeeId: s.employee_id,
      gross: Number(s.gross) || 0,
      da: Number(s.da) || 0,
      tax: Number(s.tax) || 0,
    }));
  },

  async clearMonthSalary(month: string, fy: number, officeId?: string): Promise<number> {
    const targetOfficeId = officeId || requireOfficeId();

    const { count, error } = await supabase
      .from('employee_salaries')
      .delete()
      .eq('office_id', targetOfficeId)
      .eq('financial_year', fy)
      .eq('month', month);

    if (error) throw error;
    return count || 0;
  },

  async getQuarterReport(quarter: string, fy: number, officeId?: string): Promise<QuarterReport> {
    const scope = getOfficeScope(officeId);
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    const quarterConfig: Record<string, string[]> = {
      Q1: ['April', 'May', 'June'],
      Q2: ['July', 'August', 'September'],
      Q3: ['October', 'November', 'December'],
      Q4: ['January', 'February', 'March'],
    };

    const months = quarterConfig[quarter] || quarterConfig.Q1;

    let qEmployees = supabase
      .from('employees')
      .select('id, name, pan');
    if (!scope.all) qEmployees = qEmployees.eq('office_id', scope.officeId!);
    const { data: employees } = await qEmployees.order('id');

    let qSalaries = supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy);
    if (!scope.all) qSalaries = qSalaries.eq('office_id', scope.officeId!);
    const { data: salaries } = await qSalaries;

    const salMap: Record<string, Record<string, { gross: number; da: number; tax: number }>> = {};
    (salaries || []).forEach((s) => {
      if (!salMap[s.employee_id]) salMap[s.employee_id] = {};
      salMap[s.employee_id][s.month] = s;
    });

    const rows = (employees || [])
      .filter((emp) => emp.name && emp.pan)
      .map((emp) => {
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

  async getBudgetHeadReport(fy: number, officeId?: string): Promise<BudgetHeadReport> {
    const scope = getOfficeScope(officeId);
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    const monthNames = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

    const round = (n: number) => Math.round(n * 100) / 100;

    let qEmployees = supabase
      .from('employees')
      .select('id, name, pan, budget_head_id');
    if (!scope.all) qEmployees = qEmployees.eq('office_id', scope.officeId!);
    const { data: employees } = await qEmployees.order('id');

    let qHeads = supabase
      .from('budget_heads')
      .select('id, code, name');
    if (!scope.all) qHeads = qHeads.eq('office_id', scope.officeId!);
    const { data: heads } = await qHeads.order('sort_order', { ascending: true }).order('code', { ascending: true });

    let qSalaries = supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy);
    if (!scope.all) qSalaries = qSalaries.eq('office_id', scope.officeId!);
    const { data: salaries } = await qSalaries;

    const headMap: Record<string, { code: string; name: string }> = {};
    (heads || []).forEach((h: { id: string; code: string; name: string }) => {
      headMap[h.id] = { code: h.code, name: h.name };
    });

    const salMap: Record<string, Record<string, { gross: number; da: number; tax: number }>> = {};
    (salaries || []).forEach((s) => {
      if (!salMap[s.employee_id]) salMap[s.employee_id] = {};
      salMap[s.employee_id][s.month] = s;
    });

    const emptyCell = () => ({ gross: 0, da: 0, tax: 0, net: 0 });

    const groups: BudgetHeadReportGroup[] = [];
    const groupIndex: Record<string, number> = {};
    const ensureGroup = (headId: string | null) => {
      const key = headId || '__unassigned__';
      if (groupIndex[key] === undefined) {
        const head = headId ? headMap[headId] : undefined;
        groupIndex[key] = groups.length;
        groups.push({
          code: head ? head.code : null,
          name: head ? head.name : '(Unassigned)',
          months: monthNames.map(() => emptyCell()),
          quarters: [emptyCell(), emptyCell(), emptyCell(), emptyCell()],
          totals: emptyCell(),
        });
      }
      return groups[groupIndex[key]];
    };

    (employees || []).forEach((emp) => {
      if (!emp.name || !emp.pan) return;

      const sm = salMap[emp.id] || {};
      const group = ensureGroup(emp.budget_head_id || null);

      monthNames.forEach((m, i) => {
        const r = sm[m] || {};
        const gross = round(r.gross || 0);
        const da = round(r.da || 0);
        const tax = round(r.tax || 0);
        const cell = group.months[i];
        cell.gross = round(cell.gross + gross);
        cell.da = round(cell.da + da);
        cell.tax = round(cell.tax + tax);
        cell.net = round(cell.gross + cell.da - cell.tax);
      });
    });

    const activeGroups = groups.filter((g) => {
      g.quarters = monthNames.reduce((acc, _m, i) => {
        const cell = g.months[i];
        const qi = Math.floor(i / 3);
        acc[qi].gross = round(acc[qi].gross + cell.gross);
        acc[qi].da = round(acc[qi].da + cell.da);
        acc[qi].tax = round(acc[qi].tax + cell.tax);
        acc[qi].net = round(acc[qi].net + cell.net);
        return acc;
      }, g.quarters);

      g.totals = g.months.reduce(
        (acc, cell) => {
          acc.gross = round(acc.gross + cell.gross);
          acc.da = round(acc.da + cell.da);
          acc.tax = round(acc.tax + cell.tax);
          acc.net = round(acc.net + cell.net);
          return acc;
        },
        emptyCell()
      );

      return g.totals.gross !== 0 || g.totals.da !== 0 || g.totals.tax !== 0;
    });

    const totals = activeGroups.reduce(
      (acc, g) => {
        acc.gross = round(acc.gross + g.totals.gross);
        acc.da = round(acc.da + g.totals.da);
        acc.tax = round(acc.tax + g.totals.tax);
        acc.net = round(acc.net + g.totals.net);
        return acc;
      },
      emptyCell()
    );

    const y1 = String(fy).slice(-2);
    const y2 = String(fy + 1).slice(-2);

    const monthLabels = monthNames.map((m, i) => `${m.slice(0, 3)}-${i < 9 ? y1 : y2}`);

    return {
      fy,
      fyLabel: `${fy}-${y2}`,
      monthLabels,
      groups: activeGroups,
      totals,
    };
  },
};

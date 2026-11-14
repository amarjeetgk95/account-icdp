import { supabase } from '@/core/supabase/client';
import { isActiveInEntryMonth } from '../utils/employeeDates';
import {
  buildLegacyBridge,
  resolveLegacyId,
  isUnlinkedId,
  toCanonicalHrpn,
  UNLINKED_ID_PREFIX,
} from '@/shared/domain/canonicalEmployee';
import type { EmployeeRosterItem, QuarterReport, BudgetHeadReport, BudgetHeadReportGroup, BudgetHeadMember } from '../types';

/**
 * Canonical roster bridge (Phase 3 canonicalization).
 *
 * READ path is Establishment-first: `establishment_employees` seeds every
 * person list (roster, 24Q, budget-head). The legacy payroll `employees`
 * table is only a salary-store key: `employee_salaries.employee_id` still
 * points at it, so each canonical person resolves to its legacy row id via
 * HRPN (fallback PAN) for salary reads/writes.
 *
 * Persons without a legacy row keep roster id `est:<uuid>` with
 * `hasPayrollLink: false` — visible everywhere, skipped by saves.
 */
interface CanonicalPerson {
  estId: string;
  hrpn: string;
  name: string;
  pan: string;
  joinDate: string | null;
  transferDate: string | null;
  budgetHeadId: string | null;
  legacyId: string | null;
  /** Manual office sequence (ક્રમ) from Establishment. NULL = never arranged. */
  displayOrder: number | null;
}

interface CanonicalRoster {
  persons: CanonicalPerson[];
  /** Legacy row id -> its budget_head_id (for budget-head grouping). */
  legacyHeadMap: Map<string, string | null>;
}

async function loadCanonicalRoster(): Promise<CanonicalRoster | null> {
  const { data: estRows, error: estErr } = await supabase
    .from('establishment_employees')
    .select('id, hrpn_no, name, pan, join_date, transfer_date, budget_head_id, display_order')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('name');

  if (estErr || !estRows) {
    console.warn('[PayrollRepo] Establishment roster unavailable, falling back to legacy employees:', estErr);
    return null;
  }

  const { data: legacyRows } = await supabase
    .from('employees')
    .select('id, hprn_no, name, pan, join_date, transfer_date, budget_head_id')
    .order('id');

  const legacy = (legacyRows || []) as Array<{
    id: string | number;
    hprn_no: string | null;
    name?: string | null;
    pan: string | null;
    join_date?: string | null;
    transfer_date?: string | null;
    budget_head_id: string | number | null;
  }>;
  const bridge = buildLegacyBridge(legacy);
  const legacyMap = new Map(legacy.map((r) => [String(r.id), r]));
  const legacyHeadMap = new Map<string, string | null>(legacy.map((r) => [String(r.id), r.budget_head_id ? String(r.budget_head_id) : null]));

  const matchedLegacyIds = new Set<string>();

  const persons: CanonicalPerson[] = (
    (estRows || []) as Array<{
      id: string | number;
      hrpn_no: string | null;
      name: string;
      pan: string | null;
      join_date: string | null;
      transfer_date: string | null;
      budget_head_id: string | number | null;
      display_order: number | null;
    }>
  ).map((r) => {
    const legacyId = resolveLegacyId(r.hrpn_no, r.pan, bridge);
    const leg = legacyId ? legacyMap.get(String(legacyId)) : null;
    if (legacyId) matchedLegacyIds.add(String(legacyId));

    return {
      estId: String(r.id),
      hrpn: toCanonicalHrpn(r.hrpn_no),
      name: r.name || leg?.name || '',
      pan: (r.pan || leg?.pan || '').toUpperCase(),
      joinDate: r.join_date ?? leg?.join_date ?? null,
      transferDate: r.transfer_date ?? leg?.transfer_date ?? null,
      budgetHeadId: r.budget_head_id ? String(r.budget_head_id) : (leg?.budget_head_id ? String(leg.budget_head_id) : null),
      legacyId: legacyId ? String(legacyId) : null,
      displayOrder:
        r.display_order === null || r.display_order === undefined ? null : Number(r.display_order),
    };
  });

  // Preserve legacy employees who have salary records or exist in employees master
  // but are not yet linked to establishment_employees
  for (const leg of legacy) {
    if (!matchedLegacyIds.has(String(leg.id))) {
      persons.push({
        estId: String(leg.id),
        hrpn: toCanonicalHrpn(leg.hprn_no),
        name: leg.name || '',
        pan: (leg.pan || '').toUpperCase(),
        joinDate: leg.join_date ?? null,
        transferDate: leg.transfer_date ?? null,
        budgetHeadId: leg.budget_head_id ? String(leg.budget_head_id) : null,
        legacyId: String(leg.id),
        displayOrder: null,
      });
    }
  }

  // Establishment manual sequence (ક્રમ) first, then name. DB already orders
  // this way, but re-sort here so offline/mocked unsorted inputs still follow
  // the same rule everywhere (roster, quarter, budget-head).
  persons.sort((a, b) => {
    const oa = typeof a.displayOrder === 'number' && Number.isFinite(a.displayOrder) ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const ob = typeof b.displayOrder === 'number' && Number.isFinite(b.displayOrder) ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    return oa - ob || (a.name || '').localeCompare(b.name || '');
  });

  return { persons, legacyHeadMap };
}

function buildQuarterReport(fy: number, quarter: string, rows: QuarterReport['rows']): QuarterReport {
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
}


export const payrollRepository = {
  async checkMonthData(month: string, fy: number): Promise<{ count: number }> {
    const { count } = await supabase
      .from('employee_salaries')
      .select('*', { count: 'exact', head: true })
      .eq('financial_year', fy)
      .eq('month', month);

    return { count: count || 0 };
  },

  async getRosterForMonth(month: string, fy: number): Promise<EmployeeRosterItem[]> {
    const canonical = await loadCanonicalRoster();

    // Fallback: canonical register unreachable — legacy behaviour unchanged.
    if (!canonical) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, pan, hprn_no, join_date, transfer_date')
        .order('id');

      const { data: salaries } = await supabase
        .from('employee_salaries')
        .select('employee_id, gross, da, tax')
        .eq('financial_year', fy)
        .eq('month', month);

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
            hasPayrollLink: true,
          };
        });
    }

    const { data: salaries } = await supabase
      .from('employee_salaries')
      .select('employee_id, establishment_employee_id, gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', month);

    const salByLegacy: Record<string, { gross: number; da: number; tax: number }> = {};
    const salByEst: Record<string, { gross: number; da: number; tax: number }> = {};
    (salaries || []).forEach((s: { employee_id: string; establishment_employee_id?: string | null; gross: number; da: number; tax: number }) => {
      if (s.employee_id) salByLegacy[s.employee_id] = s;
      if (s.establishment_employee_id) salByEst[s.establishment_employee_id] = s;
    });

    return canonical.persons
      .filter((p) => p.name && p.pan)
      .filter((p) => isActiveInEntryMonth(p.joinDate, p.transferDate, fy, month))
      .map((p) => {
        const sal = (p.legacyId && salByLegacy[p.legacyId]) || salByEst[p.estId];
        return {
          id: p.legacyId ? String(p.legacyId) : `${UNLINKED_ID_PREFIX}${p.estId}`,
          name: p.name,
          pan: p.pan,
          hprnNo: p.hrpn || undefined,
          hasEntry: !!sal,
          gross: sal?.gross || 0,
          da: sal?.da || 0,
          tax: sal?.tax || 0,
          establishmentId: String(p.estId),
          hasPayrollLink: !!p.legacyId,
        };
      });
  },

  async saveBulkSalary(
    month: string,
    entries: Array<{ employeeId: string | number; gross: number; da: number; tax: number }>,
    fy: number
  ): Promise<string> {
    // Canonical persons without a legacy payroll row (`est:` ids) have no
    // salary-store row — skip them loudly instead of hitting the FK.
    const skipped = entries.filter((e) => !e.employeeId || isUnlinkedId(String(e.employeeId))).length;
    const linked = entries.filter((e) => e.employeeId && !isUnlinkedId(String(e.employeeId)));
    const records = linked.map((e) => ({
      employee_id: String(e.employeeId),
      financial_year: fy,
      month,
      gross: Math.round(e.gross * 100) / 100,
      da: Math.round(e.da * 100) / 100,
      da_diff: Math.round(e.da * 100) / 100,
      pay_diff: 0,
      tax: Math.round(e.tax * 100) / 100,
    }));

    if (records.length > 0) {
      const { error } = await supabase
        .from('employee_salaries')
        .upsert(records, { onConflict: 'employee_id,financial_year,month' });

      if (error) throw error;
    }
    const withData = linked.filter((e) => e.gross > 0 || e.da > 0 || e.tax > 0).length;
    const skipNote = skipped > 0 ? ` ${skipped} without payroll link skipped (see Register Parity).` : '';
    return `Saved ${withData} of ${linked.length} record${linked.length !== 1 ? 's' : ''} for ${month}.${skipNote}`;
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
    const { data, error } = await supabase
      .from('employee_salaries')
      .select('employee_id, gross, da, tax')
      .eq('financial_year', fy)
      .eq('month', month);

    if (error) throw error;

    return (data || []).map((s) => ({
      employeeId: s.employee_id,
      gross: Number(s.gross) || 0,
      da: Number(s.da) || 0,
      tax: Number(s.tax) || 0,
    }));
  },

  async clearMonthSalary(month: string, fy: number): Promise<number> {
    const { count, error } = await supabase
      .from('employee_salaries')
      .delete()
      .eq('financial_year', fy)
      .eq('month', month);

    if (error) throw error;

    // Also clear from imported table so cleared months do not ghost in SalaryLookup
    try {
      await supabase
        .from('employee_salary')
        .delete()
        .eq('financial_year', fy)
        .eq('month', month);
    } catch (e) {
      console.warn('[payrollRepository] Could not clear employee_salary:', e);
    }

    return count || 0;
  },

  async getQuarterReport(quarter: string, fy: number): Promise<QuarterReport> {

    const quarterConfig: Record<string, string[]> = {
      Q1: ['April', 'May', 'June'],
      Q2: ['July', 'August', 'September'],
      Q3: ['October', 'November', 'December'],
      Q4: ['January', 'February', 'March'],
    };

    const months = quarterConfig[quarter] || quarterConfig.Q1;

    const canonical = await loadCanonicalRoster();

    // Fallback: legacy behaviour unchanged.
    if (!canonical) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, pan, join_date, transfer_date')
        .order('id');

      const { data: salaries } = await supabase
        .from('employee_salaries')
        .select('employee_id, month, gross, da, tax')
        .eq('financial_year', fy);

      const salMap: Record<string, Record<string, { gross: number; da: number; tax: number }>> = {};
      (salaries || []).forEach((s) => {
        if (!salMap[s.employee_id]) salMap[s.employee_id] = {};
        salMap[s.employee_id][s.month] = s;
      });

      const rows = (employees || [])
        .filter((emp) => emp.name && emp.pan)
        .map((emp) => {
          // Omit employee if their posting has ended prior to this quarter (or no active months in quarter)
          const hasActiveMonthInQuarter = months.some((m) =>
            isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, m)
          );
          if (!hasActiveMonthInQuarter) return null;

          const sm = salMap[emp.id] || {};
          const g = [0, 0, 0];
          const t = [0, 0, 0];
          let d = 0;

          months.forEach((m, i) => {
            const isActive = isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, m);
            if (!isActive) {
              g[i] = 0;
              t[i] = 0;
              return;
            }

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

      return buildQuarterReport(fy, quarter, rows);
    }

    const { data: salaries } = await supabase
      .from('employee_salaries')
      .select('employee_id, establishment_employee_id, month, gross, da, tax')
      .eq('financial_year', fy);

    const salByLegacy: Record<string, Record<string, { gross: number; da: number; tax: number }>> = {};
    const salByEst: Record<string, Record<string, { gross: number; da: number; tax: number }>> = {};
    (salaries || []).forEach((s: { employee_id: string; establishment_employee_id?: string | null; month: string; gross: number; da: number; tax: number }) => {
      if (s.employee_id) {
        if (!salByLegacy[s.employee_id]) salByLegacy[s.employee_id] = {};
        salByLegacy[s.employee_id][s.month] = s;
      }
      if (s.establishment_employee_id) {
        if (!salByEst[s.establishment_employee_id]) salByEst[s.establishment_employee_id] = {};
        salByEst[s.establishment_employee_id][s.month] = s;
      }
    });

    const rows = canonical.persons
      .filter((p) => p.name && p.pan)
      .map((p) => {
        // Omit employee if their posting has ended prior to this quarter (or no active months in quarter)
        const hasActiveMonthInQuarter = months.some((m) =>
          isActiveInEntryMonth(p.joinDate, p.transferDate, fy, m)
        );
        if (!hasActiveMonthInQuarter) return null;

        const g = [0, 0, 0];
        const t = [0, 0, 0];
        let d = 0;

        months.forEach((m, i) => {
          const isActive = isActiveInEntryMonth(p.joinDate, p.transferDate, fy, m);
          if (!isActive) {
            g[i] = 0;
            t[i] = 0;
            return;
          }

          const r = (p.legacyId && salByLegacy[p.legacyId]?.[m]) || salByEst[p.estId]?.[m] || {};
          g[i] = Math.round((r.gross || 0) * 100) / 100;
          d += Math.round((r.da || 0) * 100) / 100;
          t[i] = Math.round((r.tax || 0) * 100) / 100;
        });

        const gross = g[0] + g[1] + g[2];
        const tax = t[0] + t[1] + t[2];
        const total = gross + d;

        if (total === 0 && tax === 0) return null;

        return { name: p.name, pan: p.pan, g, d, total, t, tax };
      })
      .filter(Boolean) as QuarterReport['rows'];

    return buildQuarterReport(fy, quarter, rows);
  },

  async getBudgetHeadReport(fy: number): Promise<BudgetHeadReport> {
    const monthNames = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

    const round = (n: number) => Math.round(n * 100) / 100;

    const { data: heads } = await supabase
      .from('budget_heads')
      .select('id, code, name')
      .order('sort_order', { ascending: true }).order('code', { ascending: true });

    const canonical = await loadCanonicalRoster();

    const { data: salaries } = await supabase
      .from('employee_salaries')
      .select('employee_id, establishment_employee_id, month, gross, da, tax')
      .eq('financial_year', fy);

    const headMap: Record<string, { code: string; name: string }> = {};
    (heads || []).forEach((h: { id: string; code: string; name: string }) => {
      headMap[h.id] = { code: h.code, name: h.name };
    });

    // Salary months keyed both ways (legacy id + canonical id); the legacy
    // `employees` table is only consulted when the canonical register is
    // unreachable (fallback below).
    const salByLegacy: Record<string, Record<string, { gross: number; da: number; tax: number }>> = {};
    const salByEst: Record<string, Record<string, { gross: number; da: number; tax: number }>> = {};
    (salaries || []).forEach((s: { employee_id: string; establishment_employee_id?: string | null; month: string; gross: number; da: number; tax: number }) => {
      if (s.employee_id) {
        if (!salByLegacy[s.employee_id]) salByLegacy[s.employee_id] = {};
        salByLegacy[s.employee_id][s.month] = s;
      }
      if (s.establishment_employee_id) {
        if (!salByEst[s.establishment_employee_id]) salByEst[s.establishment_employee_id] = {};
        salByEst[s.establishment_employee_id][s.month] = s;
      }
    });

    // Person sources: [headId, salaryMonths, identity][]. The Establishment
    // (canonical) tag wins — assigning a head in the register moves the
    // person immediately. The legacy tag is only a fallback for rows whose
    // canonical tag is still empty (pre-056 backfill).
    // Sources preserve Establishment manual sequence (ક્રમ); members below
    // are re-sorted by that same sequence, not A-Z.
    let sources: Array<{
      headId: string | null;
      sm: Record<string, { gross: number; da: number; tax: number }>;
      name: string;
      pan: string;
      hprnNo: string | null;
      order: number;
      orderName: string;
    }>;
    if (canonical) {
      sources = canonical.persons
        .filter((p) => p.name && p.pan)
        .map((p) => ({
          headId: p.budgetHeadId || (p.legacyId && canonical.legacyHeadMap.get(p.legacyId)) || null,
          sm: (p.legacyId && salByLegacy[p.legacyId]) || salByEst[p.estId] || {},
          name: p.name,
          pan: p.pan,
          hprnNo: p.hrpn || null,
          order:
            typeof p.displayOrder === 'number' && Number.isFinite(p.displayOrder)
              ? p.displayOrder
              : Number.MAX_SAFE_INTEGER,
          orderName: p.name || '',
        }));
    } else {
      console.warn('[PayrollRepo] Establishment roster unavailable, budget report falls back to legacy employees.');
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, pan, hprn_no, budget_head_id')
        .order('id');
      sources = ((employees || []) as Array<{ id: string; name: string; pan: string; hprn_no: string | null; budget_head_id: string | null }>)
        .filter((emp) => emp.name && emp.pan)
        .map((emp) => ({ headId: emp.budget_head_id || null, sm: salByLegacy[emp.id] || {}, name: emp.name, pan: emp.pan, hprnNo: emp.hprn_no || null, order: Number.MAX_SAFE_INTEGER, orderName: emp.name || '' }));
    }

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
          members: [],
        });
      }
      return groups[groupIndex[key]];
    };

    sources.forEach(({ headId, sm, name, pan, hprnNo, order, orderName }) => {
      const group = ensureGroup(headId);
      const memberQuarters = [emptyCell(), emptyCell(), emptyCell(), emptyCell()];

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
        const mq = memberQuarters[Math.floor(i / 3)];
        mq.gross = round(mq.gross + gross);
        mq.da = round(mq.da + da);
        mq.tax = round(mq.tax + tax);
        mq.net = round(mq.gross + mq.da - mq.tax);
      });

      const memberTotals = memberQuarters.reduce(
        (acc, q) => {
          acc.gross = round(acc.gross + q.gross);
          acc.da = round(acc.da + q.da);
          acc.tax = round(acc.tax + q.tax);
          acc.net = round(acc.net + q.net);
          return acc;
        },
        emptyCell()
      );
      group.members.push({ name, pan, hprnNo, quarters: memberQuarters, totals: memberTotals } as BudgetHeadMember & { __order?: number; __orderName?: string });
      // Carry establishment sequence on the member for the sort below (stripped afterwards).
      const pushed = group.members[group.members.length - 1] as unknown as { __order?: number; __orderName?: string };
      pushed.__order = order;
      pushed.__orderName = orderName;
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

    for (const g of activeGroups) {
      g.members.sort((a, b) => {
        const oa = (a as unknown as { __order?: number }).__order ?? Number.MAX_SAFE_INTEGER;
        const ob = (b as unknown as { __order?: number }).__order ?? Number.MAX_SAFE_INTEGER;
        if (oa !== ob) return oa - ob;
        const na = (a as unknown as { __orderName?: string }).__orderName ?? a.name;
        const nb = (b as unknown as { __orderName?: string }).__orderName ?? b.name;
        return na.localeCompare(nb);
      });
      for (const m of g.members) {
        delete (m as unknown as { __order?: number }).__order;
        delete (m as unknown as { __orderName?: string }).__orderName;
      }
    }

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

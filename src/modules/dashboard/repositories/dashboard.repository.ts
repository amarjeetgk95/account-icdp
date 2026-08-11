import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import { MONTHS, QUARTER_MONTHS, getQuarterForMonth, type Quarter } from '@/shared/constants';
import { isActiveInEntryMonth } from '@/modules/payroll/utils/employeeDates';
import type { DashboardData, MonthlyRoadmapData, Task, RecentTransaction } from '../types';

interface EmployeeRow {
  id: string;
  name: string;
  pan: string | null;
  join_date: string | null;
  transfer_date: string | null;
}

interface SalaryItem {
  employee_id: string;
  month: string;
  gross: number;
  da: number;
  tax: number;
}

interface TransactionWithParty {
  id: string;
  transaction_date: string;
  amount: number;
  total_gst: number;
  income_tax: number;
  parties: { id: string; name: string } | null;
}

interface SalaryMap {
  [employeeId: string]: {
    [month: string]: SalaryItem;
  };
}

const PREV_QUARTER: Record<Quarter, Quarter> = { Q1: 'Q4', Q2: 'Q1', Q3: 'Q2', Q4: 'Q3' };

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

function buildSalaryMap(salaries: SalaryItem[]): SalaryMap {
  const map: SalaryMap = {};
  salaries.forEach((sal) => {
    if (!sal.employee_id || !sal.month) return;
    if (!map[sal.employee_id]) map[sal.employee_id] = {};
    map[sal.employee_id][sal.month] = sal;
  });
  return map;
}

function money(value: number | undefined | null): number {
  const n = Number(value);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

// Mirrors the payroll parseDate: YYYY-MM-DD is split and built as a LOCAL
// date so first/last-day-of-month boundary comparisons are timezone-safe, and
// anything that would become an Invalid Date is dropped instead of polluting
// date comparisons.
function parseDateOnly(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function getFinancialYear(): number {
  return useUIStore.getState().activeFinancialYear;
}

// Salary (work) months processed in a financial year run from March to
// February: the "April" payroll slot holds March's salary ("March paid in
// April"), the "May" slot holds April's salary, ... and the "March" slot
// holds February's salary. So the work-month sequence is MONTHS rotated so
// March comes first.
function getWorkMonths(): string[] {
  return [MONTHS[MONTHS.length - 1], ...MONTHS.slice(0, MONTHS.length - 1)];
}

const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The current calendar month processes the PREVIOUS month's salary, so the
// current work month is the month before today (e.g. in August it is July).
function getCurrentWorkMonthName(): string {
  const prevCalIdx = (new Date().getMonth() - 1 + 12) % 12;
  return CALENDAR_MONTHS[prevCalIdx];
}

function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth() + 1;
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

export const dashboardRepository = {
  async getSummary(): Promise<DashboardData> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    const fy = getFinancialYear();
    const now = new Date();

    const { data: employees } = await supabase
      .from('employees')
      .select('id, name, pan, join_date, transfer_date')
      .eq('office_id', officeId)
      .order('id');

    const { data: salaries } = await supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy)
      .eq('office_id', officeId);

    const { data: transactions } = await supabase
      .from('party_transactions')
      .select('id, transaction_date, amount, total_gst, income_tax, parties(id, name)')
      .eq('office_id', officeId)
      .order('id', { ascending: false })
      .limit(10);

    const empList = (employees || []) as EmployeeRow[];
    const txList = (transactions || []) as TransactionWithParty[];
    const salMap = buildSalaryMap(salaries || []);
    const workMonths = getWorkMonths();
    const entryMonthName = getCurrentWorkMonthName();
    const currentWorkIdx = workMonths.indexOf(entryMonthName);
    const currentSlotMonth = MONTHS[currentWorkIdx];
    const currentQuarter = getCurrentQuarter();
    const prevQuarterIndexes = new Set(
      QUARTER_MONTHS[PREV_QUARTER[currentQuarter]].map((m) => MONTHS.indexOf(m))
    );

    let activeEmployees = 0;
    let pendingEmployees = 0;
    let ytdSalary = 0;
    let ytdTax = 0;
    const missingPANs: string[] = [];
    const zeroTaxEntries: string[] = [];
    let newJoinersThisMonth = 0;
    let departuresThisMonth = 0;
    let prevQuarterPending = 0;
    const uniqueVendors = new Set<string>();

    const empQuarterlyTDS: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const empQuarterlySalary: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const monthlyData = MONTHS.map((month) => ({
      month,
      active: 0,
      processed: 0,
      salary: 0,
      tax: 0,
      pendingNames: [] as string[],
    }));

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    empList.forEach((emp) => {
      const name = emp.name?.trim() || '';
      const pan = emp.pan?.trim().toUpperCase() || '';
      if (!name) return;

      const sm = salMap[emp.id] || {};

      let hasAnyEntry = false;
      let hasZeroTax = false;
      MONTHS.forEach((month: string, i) => {
        const sal = sm[month];
        if (sal) {
          hasAnyEntry = true;
          monthlyData[i].processed++;
          const gross = money(sal.gross);
          const tax = money(sal.tax);
          monthlyData[i].salary += gross;
          monthlyData[i].tax += tax;
          if (tax === 0) hasZeroTax = true;

          const quarter = getQuarterForMonth(month);
          empQuarterlySalary[quarter] += gross;
          empQuarterlyTDS[quarter] += tax;
        }
      });

      if (hasAnyEntry) {
        ytdSalary += Object.values(sm).reduce((sum, s) => sum + money(s.gross), 0);
        ytdTax += Object.values(sm).reduce((sum, s) => sum + money(s.tax), 0);
      }
      if (hasZeroTax && hasAnyEntry) zeroTaxEntries.push(name);

      // The authoritative "worked in the current slot's work month" check:
      // employees who join after that work month, transfer before it, or have
      // a future join date are not expected to have an entry yet, so they are
      // neither active nor pending for the current month.
      const isActiveCurrentSlot = isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, currentSlotMonth);
      if (isActiveCurrentSlot) {
        activeEmployees++;
        if (!pan) missingPANs.push(name);

        if (!sm[currentSlotMonth]) pendingEmployees++;
      }

      // Roadmap denominator: an employee counts as "active" for a tile only if
      // they worked during that tile's work month (the month before the payment
      // month). Reuses the payroll roster rule so the roadmap's
      // processed/active percentages match the payroll page. Employees without
      // a PAN can't be on the roster, so they are excluded here too. Remaining
      // entries are only tracked for the current and past work months: a future
      // month's salary is paid in the following month, so nothing is due yet.
      let hasPrevQuarterPending = false;
      if (name && pan) {
        MONTHS.forEach((month: string, i) => {
          if (isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, month)) {
            monthlyData[i].active++;
            if (i <= currentWorkIdx && !sm[month]) {
              monthlyData[i].pendingNames.push(name);
              if (prevQuarterIndexes.has(i) && !hasPrevQuarterPending) {
                hasPrevQuarterPending = true;
                prevQuarterPending++;
              }
            }
          }
        });
      }

      const joinDate = parseDateOnly(emp.join_date);
      const transferDate = parseDateOnly(emp.transfer_date);
      if (joinDate && joinDate >= currentMonthStart && joinDate <= currentMonthEnd) {
        newJoinersThisMonth++;
      }
      if (transferDate && transferDate >= currentMonthStart && transferDate <= currentMonthEnd) {
        departuresThisMonth++;
      }
    });

    txList.forEach((tx) => {
      const partyName = tx.parties?.name;
      if (partyName) uniqueVendors.add(partyName);
    });

    const monthlyRoadmap: MonthlyRoadmapData[] = workMonths.map((workMonth, i) => {
      const m = monthlyData[i]; // slot MONTHS[i] holds workMonth's salary
      const isCurrent = i === currentWorkIdx;
      const future = i > currentWorkIdx;
      const pct = m.active > 0 ? Math.min(100, Math.round((m.processed / m.active) * 100)) : 0;

      let status: 'complete' | 'partial' | 'empty' | 'idle';
      if (future) status = 'idle';
      else if (pct >= 100) status = 'complete';
      else if (pct > 0) status = 'partial';
      else status = 'empty';

      if (activeEmployees === 0) status = 'idle';

      return { ...m, month: workMonth, pct, status, isCurrent, future };
    });

    const quarterReadiness = {
      Q1: { pct: 0, processed: 0, expected: 0 },
      Q2: { pct: 0, processed: 0, expected: 0 },
      Q3: { pct: 0, processed: 0, expected: 0 },
      Q4: { pct: 0, processed: 0, expected: 0 },
    };

    (['Q1', 'Q2', 'Q3', 'Q4'] as const).forEach((q) => {
      const months = QUARTER_MONTHS[q];
      let processed = 0;
      let expected = 0;
      months.forEach((m) => {
        const idx = MONTHS.indexOf(m);
        processed += monthlyData[idx]?.processed || 0;
        expected += monthlyData[idx]?.active || 0;
      });
      quarterReadiness[q].processed = processed;
      quarterReadiness[q].expected = expected;
      quarterReadiness[q].pct =
        expected > 0 ? Math.min(100, Math.round((processed / expected) * 100)) : 0;
    });

    const tasks: Task[] = [];
    if (pendingEmployees > 0) {
      tasks.push({
        severity: 'danger',
        icon: 'calendar-x',
        title: `${pendingEmployees} employees pending for ${entryMonthName}`,
        hint: 'Complete salary entries for the current month',
        action: '/payroll',
        actionLabel: 'Go to Payroll',
      });
    }
    if (missingPANs.length > 0) {
      tasks.push({
        severity: 'warning',
        icon: 'exclamation-triangle',
        title: `${missingPANs.length} employees missing PAN`,
        hint: 'Add PAN numbers in Settings > Employee Registration',
        action: '/settings',
        actionLabel: 'Open Settings',
      });
    }
    if (prevQuarterPending > 0) {
      tasks.push({
        severity: 'danger',
        icon: 'clipboard-x',
        title: `${prevQuarterPending} employees pending for previous quarter`,
        hint: 'Complete quarter-end verification',
        action: '/reports',
        actionLabel: 'View Reports',
      });
    }

    const recentTransactions: RecentTransaction[] = txList
      .slice(0, 5)
      .map((tx) => ({
        partyName: tx.parties?.name || 'Unknown',
        amount: money(tx.amount),
        gst: money(tx.total_gst),
        tax: money(tx.income_tax),
        date: tx.transaction_date || '',
      }));

    const currentQuarterCompletion = quarterReadiness[currentQuarter as keyof typeof quarterReadiness];

    return {
      fy,
      lastUpdated: now.toLocaleString('en-IN'),
      activeEmployees,
      pendingEmployees,
      ytdSalary,
      ytdTax,
      currentQuarter,
      currentQuarterCompletion: { pct: currentQuarterCompletion.pct },
      monthlyRoadmap: monthlyRoadmap,
      tasks,
      quarterReadiness,
      empQuarterlyTDS,
      empQuarterlySalary,
      vendorQuarterly: { Q1: { it: 0, gst: 0 }, Q2: { it: 0, gst: 0 }, Q3: { it: 0, gst: 0 }, Q4: { it: 0, gst: 0 } },
      recentTransactions,
      prevQuarterPending,
      zeroTaxEntries,
      missingPANs,
      newJoinersThisMonth,
      departuresThisMonth,
      vendorCount: uniqueVendors.size,
      entryMonthName: entryMonthName,
    };
  },
};

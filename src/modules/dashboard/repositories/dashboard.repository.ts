import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import { MONTHS, QUARTER_MONTHS, getQuarterForMonth } from '@/shared/constants';

const MONTH_ORDER = [...MONTHS];
import type { DashboardData, MonthlyRoadmapData, Task, RecentTransaction } from '../types';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type Salary = Database['public']['Tables']['employee_salaries']['Row'];

interface SalaryMap {
  [employeeId: string]: {
    [month: string]: Salary;
  };
}

function getOfficeId(): string | null {
  // Auth profile office is the source of truth; UI store is only an
  // admin office-switch override.
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

function buildSalaryMap(salaries: Salary[]): SalaryMap {
  const map: SalaryMap = {};
  salaries.forEach((sal) => {
    if (!map[sal.employee_id]) map[sal.employee_id] = {};
    map[sal.employee_id][sal.month] = sal;
  });
  return map;
}

function money(value: number | undefined | null): number {
  const n = Number(value);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function getFinancialYear(): number {
  return useUIStore.getState().activeFinancialYear;
}

function getCurrentMonthName(): string {
  const now = new Date();
  const monthIndex = now.getMonth() - 3;
  const adjustedIndex = monthIndex < 0 ? monthIndex + 12 : monthIndex;
  return MONTHS[adjustedIndex] as string;
}

function getEntryMonthName(): string {
  const currentIdx = Number(MONTHS.indexOf(getCurrentMonthName() as string));
  return MONTHS[(currentIdx - 1 + 12) % 12] as string;
}

function getCurrentQuarter(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

export const dashboardRepository = {
  async getSummary(): Promise<DashboardData> {
    const officeId = getOfficeId();
    const fy = getFinancialYear();
    const now = new Date();
    const nowTime = now.getTime();

    const { data: employees } = await (supabase as any)
      .from('employees')
      .select('id, name, pan, join_date, transfer_date')
      .eq('office_id', officeId)
      .order('id');

    const { data: salaries } = await (supabase as any)
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy)
      .eq('office_id', officeId);

    const { data: transactions } = await (supabase as any)
      .from('party_transactions')
      .select('id, transaction_date, amount, total_gst, income_tax, parties(id, name)')
      .eq('office_id', officeId)
      .order('id', { ascending: false })
      .limit(10);

    const salMap = buildSalaryMap(salaries || []);
    const entryMonthName = getEntryMonthName() as typeof MONTHS[number];
    const currentQuarter = getCurrentQuarter();

    let totalEmployees = 0;
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
    }));

    (employees || []).forEach((emp: Employee) => {
      const name = emp.name?.trim() || '';
      const pan = emp.pan?.trim().toUpperCase() || '';
      if (!name) return;

      totalEmployees++;
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

          const quarter = getQuarterForMonth(month as typeof MONTH_ORDER[number]);
          empQuarterlySalary[quarter] += gross;
          empQuarterlyTDS[quarter] += tax;
        }
      });

      if (hasAnyEntry) {
        ytdSalary += Object.values(sm).reduce((sum, s) => sum + money(s.gross), 0);
        ytdTax += Object.values(sm).reduce((sum, s) => sum + money(s.tax), 0);
      }
      if (hasZeroTax && hasAnyEntry) zeroTaxEntries.push(name);

      const joinDate = emp.join_date ? new Date(emp.join_date) : null;
      const transferDate = emp.transfer_date ? new Date(emp.transfer_date) : null;

      const joinTime = joinDate ? joinDate.getTime() : 0;
      const transferTime = transferDate ? transferDate.getTime() : 0;

      if (joinTime && joinTime <= nowTime && (!transferTime || transferTime > nowTime)) {
        activeEmployees++;
        if (!pan) missingPANs.push(name);

        const entryMonthSal = sm[entryMonthName as keyof typeof sm];
        if (!entryMonthSal) pendingEmployees++;
      }

      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (joinDate && joinDate >= currentMonthStart && joinDate <= currentMonthEnd) {
        newJoinersThisMonth++;
      }
      if (transferDate && transferDate >= currentMonthStart && transferDate <= currentMonthEnd) {
        departuresThisMonth++;
      }
    });

    (transactions || []).forEach((tx: any) => {
      const partyName = tx.parties?.name;
      if (partyName) uniqueVendors.add(partyName);
    });

    const monthlyRoadmap: MonthlyRoadmapData[] = monthlyData.map((m, i) => {
      const entryMonthIdx = MONTHS.indexOf(entryMonthName as typeof MONTHS[number]);
      const isCurrent = i === entryMonthIdx;
      const future = i > entryMonthIdx;
      const pct = m.active > 0 ? Math.round((m.processed / m.active) * 100) : 0;

      let status: 'complete' | 'partial' | 'empty' | 'idle';
      if (future) status = 'idle';
      else if (pct >= 100) status = 'complete';
      else if (pct > 0) status = 'partial';
      else status = 'empty';

      if (activeEmployees === 0) status = 'idle';

      return { ...m, pct, status, isCurrent, future };
    });

    const quarterReadiness = {
      Q1: { pct: 0, processed: 0, expected: activeEmployees * 3 },
      Q2: { pct: 0, processed: 0, expected: activeEmployees * 3 },
      Q3: { pct: 0, processed: 0, expected: activeEmployees * 3 },
      Q4: { pct: 0, processed: 0, expected: activeEmployees * 3 },
    };

    Object.keys(QUARTER_MONTHS).forEach((q) => {
      const months = QUARTER_MONTHS[q as keyof typeof QUARTER_MONTHS];
      let processed = 0;
      months.forEach((m) => {
        const idx = MONTHS.indexOf(m as string);
        processed += monthlyData[idx]?.processed || 0;
      });
      quarterReadiness[q as keyof typeof quarterReadiness].processed = processed;
      quarterReadiness[q as keyof typeof quarterReadiness].pct =
        quarterReadiness[q as keyof typeof quarterReadiness].expected > 0
          ? Math.round((processed / quarterReadiness[q as keyof typeof quarterReadiness].expected) * 100)
          : 0;
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

    const recentTransactions: RecentTransaction[] = (transactions || [])
      .slice(0, 5)
      .map((tx: any) => ({
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

import { supabase } from '@/core/supabase/client';
import { MONTHS, QUARTER_MONTHS, getQuarterForMonth, type Quarter } from '@/shared/constants';
import { currentFinancialYear } from '@/shared/utilities/date';
import { isActiveInEntryMonth } from '@/modules/payroll/utils/employeeDates';
import type {
  MonthlyRoadmapData,
  PayrollSummary,
  QuarterReadinessData,
  StatutoryDeadlineInfo,
  TreasurySummary,
  VendorTdsSummary,
} from '../types';

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
  tax: number;
}

type SalaryMap = Record<string, Record<string, SalaryItem>>;

const PREV_QUARTER: Record<Quarter, Quarter> = {
  Q1: 'Q4',
  Q2: 'Q1',
  Q3: 'Q2',
  Q4: 'Q3',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function money(value: number | undefined | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function buildSalaryMap(salaries: SalaryItem[]): SalaryMap {
  const map: SalaryMap = {};
  for (const salary of salaries) {
    if (!salary.employee_id || !salary.month) continue;
    if (!map[salary.employee_id]) map[salary.employee_id] = {};
    map[salary.employee_id][salary.month] = salary;
  }
  return map;
}

function resolveAsOfDate(fy: number, now = new Date()): Date {
  const currentFy = currentFinancialYear(now);
  if (fy < currentFy) return new Date(fy + 1, 2, 31);
  if (fy > currentFy) return new Date(fy, 3, 1);
  return now;
}

function getEntryMonthName(asOf: Date): string {
  return MONTHS[(asOf.getMonth() - 3 + 12) % 12];
}

function getPreviousMonthName(month: string): string {
  return MONTHS[(MONTHS.indexOf(month) + 11) % 12];
}

function calculateStatutoryDeadlines(
  fy: number,
  currentQuarter: Quarter,
  asOf: Date
): StatutoryDeadlineInfo {
  const nextMonthDate = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 7);
  const nextTdsDepositDate = nextMonthDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const deadlineDates: Record<Quarter, Date> = {
    Q1: new Date(fy, 6, 31),
    Q2: new Date(fy, 9, 31),
    Q3: new Date(fy + 1, 0, 31),
    Q4: new Date(fy + 1, 4, 31),
  };

  const filingDeadlineDate = deadlineDates[currentQuarter];
  const daysUntilFiling = Math.ceil(
    (filingDeadlineDate.getTime() - asOf.getTime()) / DAY_MS
  );
  const nextQuarterFilingDate = filingDeadlineDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    nextTdsDepositDate,
    nextQuarterFilingDate,
    nextQuarterName: `Form 24Q (${currentQuarter})`,
    daysUntilFiling,
  };
}

async function getPayrollSummary(fy: number): Promise<PayrollSummary> {
  const asOf = resolveAsOfDate(fy);
  const entryMonthName = getEntryMonthName(asOf);
  const entryWorkMonthName = getPreviousMonthName(entryMonthName);
  const currentQuarter = getQuarterForMonth(entryMonthName);
  const currentWorkIdx = MONTHS.indexOf(entryMonthName);

  const [employeesResult, salariesResult] = await Promise.all([
    supabase
      .from('employees')
      .select('id, name, pan, join_date, transfer_date')
      .order('id'),
    supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, tax')
      .eq('financial_year', fy),
  ]);

  if (employeesResult.error) throw employeesResult.error;
  if (salariesResult.error) throw salariesResult.error;

  let previousYearEntries: SalaryItem[] = [];
  if (currentQuarter === 'Q1') {
    const { data, error } = await supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, tax')
      .eq('financial_year', fy - 1);
    if (error) throw error;
    previousYearEntries = (data || []) as SalaryItem[];
  }

  const employees = (employeesResult.data || []) as EmployeeRow[];
  const salaries = (salariesResult.data || []) as SalaryItem[];
  const salaryMap = buildSalaryMap(salaries);
  const previousSalaryMap = buildSalaryMap(previousYearEntries);

  let activeEmployees = 0;
  let pendingEmployees = 0;
  let ytdSalary = 0;
  let ytdTax = 0;
  let prevQuarterPending = 0;
  const missingPANs: string[] = [];
  const zeroTaxEntries: string[] = [];

  const monthlyData = MONTHS.map((month) => ({
    month,
    active: 0,
    processed: 0,
    salary: 0,
    tax: 0,
    pendingNames: [] as string[],
  }));

  const previousQuarterMonths = QUARTER_MONTHS[PREV_QUARTER[currentQuarter]];
  const previousQuarterFy = currentQuarter === 'Q1' ? fy - 1 : fy;

  for (const employee of employees) {
    const name = employee.name?.trim() || '';
    if (!name) continue;

    const pan = employee.pan?.trim().toUpperCase() || '';
    const employeeSalaries = salaryMap[employee.id] || {};
    const previousEntries =
      currentQuarter === 'Q1'
        ? previousSalaryMap[employee.id] || {}
        : employeeSalaries;

    let hasEntry = false;
    let hasZeroTax = false;

    MONTHS.forEach((month, index) => {
      if (!isActiveInEntryMonth(employee.join_date, employee.transfer_date, fy, month)) {
        return;
      }

      monthlyData[index].active++;
      const salary = employeeSalaries[month];
      if (!salary) {
        if (index <= currentWorkIdx) monthlyData[index].pendingNames.push(name);
        return;
      }

      hasEntry = true;
      const gross = money(salary.gross);
      const tax = money(salary.tax);
      monthlyData[index].processed++;
      monthlyData[index].salary += gross;
      monthlyData[index].tax += tax;
      ytdSalary += gross;
      ytdTax += tax;
      if (gross > 0 && tax === 0) hasZeroTax = true;
    });

    if (hasEntry && hasZeroTax) zeroTaxEntries.push(name);

    const activeThisMonth = isActiveInEntryMonth(
      employee.join_date,
      employee.transfer_date,
      fy,
      entryMonthName
    );

    if (activeThisMonth) {
      activeEmployees++;
      if (!pan) missingPANs.push(name);
      if (!employeeSalaries[entryMonthName]) pendingEmployees++;
    }

    let hasPreviousQuarterGap = false;
    for (const month of previousQuarterMonths) {
      const active = isActiveInEntryMonth(
        employee.join_date,
        employee.transfer_date,
        previousQuarterFy,
        month
      );
      if (active && !previousEntries[month]) {
        hasPreviousQuarterGap = true;
        break;
      }
    }
    if (hasPreviousQuarterGap) prevQuarterPending++;
  }

  const monthlyRoadmap: MonthlyRoadmapData[] = monthlyData.map((monthData, index) => {
    const isCurrent = index === currentWorkIdx;
    const future = index > currentWorkIdx;
    const pct =
      monthData.active > 0
        ? Math.min(100, Math.round((monthData.processed / monthData.active) * 100))
        : 0;

    let status: MonthlyRoadmapData['status'];
    if (future) status = 'idle';
    else if (monthData.active === 0) status = 'idle';
    else if (pct >= 100) status = 'complete';
    else if (monthData.processed > 0) status = 'partial';
    else status = 'empty';

    return {
      ...monthData,
      pct,
      status,
      isCurrent,
      future,
    };
  });

  const quarterReadiness = {} as QuarterReadinessData;
  (['Q1', 'Q2', 'Q3', 'Q4'] as const).forEach((quarter) => {
    let processed = 0;
    let expected = 0;
    let future = true;

    for (const month of QUARTER_MONTHS[quarter]) {
      const index = MONTHS.indexOf(month);
      processed += monthlyData[index]?.processed || 0;
      expected += monthlyData[index]?.active || 0;
      if (index <= currentWorkIdx) future = false;
    }

    quarterReadiness[quarter] = {
      processed,
      expected,
      pct: expected > 0 ? Math.min(100, Math.round((processed / expected) * 100)) : 0,
      future,
    };
  });

  return {
    fy,
    activeEmployees,
    pendingEmployees,
    ytdSalary: money(ytdSalary),
    ytdTax: money(ytdTax),
    entryMonthName,
    entryWorkMonthName,
    currentQuarter,
    monthsElapsed: currentWorkIdx + 1,
    monthlyRoadmap,
    quarterReadiness,
    prevQuarterPending,
    zeroTaxEntries,
    missingPANs,
    statutoryDeadlines: calculateStatutoryDeadlines(fy, currentQuarter, asOf),
  };
}

async function getTreasurySummary(): Promise<TreasurySummary> {
  const [gtr30Result, gtr44Result] = await Promise.allSettled([
    supabase.from('gtr30_bills').select('gross_total,status'),
    supabase.from('gtr44_bills').select('gross_amount,status'),
  ]);

  const treasury: TreasurySummary = {
    gtr30Count: 0,
    gtr30GrossTotal: 0,
    gtr30PendingCount: 0,
    gtr44Count: 0,
    gtr44GrossTotal: 0,
    gtr44DraftCount: 0,
  };

  if (gtr30Result.status === 'fulfilled' && !gtr30Result.value.error && Array.isArray(gtr30Result.value.data)) {
    const rows = gtr30Result.value.data;
    treasury.gtr30Count = rows.length;
    treasury.gtr30GrossTotal = money(
      rows.reduce((total, bill) => total + (Number(bill.gross_total) || 0), 0)
    );
    treasury.gtr30PendingCount = rows.filter(
      (bill) => bill.status !== 'passed'
    ).length;
  }

  if (gtr44Result.status === 'fulfilled' && !gtr44Result.value.error && Array.isArray(gtr44Result.value.data)) {
    const rows = gtr44Result.value.data;
    treasury.gtr44Count = rows.length;
    treasury.gtr44GrossTotal = money(
      rows.reduce((total, bill) => total + (Number(bill.gross_amount) || 0), 0)
    );
    treasury.gtr44DraftCount = rows.filter(
      (bill) => bill.status === 'draft'
    ).length;
  }

  return treasury;
}

async function getVendorSummary(fy: number): Promise<VendorTdsSummary> {
  const [partiesResult, transactionsResult] = await Promise.all([
    supabase.from('parties').select('id', { count: 'exact', head: true }),
    supabase
      .from('party_transactions')
      .select('amount, income_tax, total_gst')
      .gte('transaction_date', `${fy}-04-01`)
      .lt('transaction_date', `${fy + 1}-04-01`),
  ]);

  if (partiesResult.error) throw partiesResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  const transactions = transactionsResult.data || [];
  return {
    partiesCount: partiesResult.count ?? 0,
    transactionCount: transactions.length,
    totalVendorAmount: money(
      transactions.reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0)
    ),
    totalVendorIncomeTax: money(
      transactions.reduce(
        (total, transaction) => total + (Number(transaction.income_tax) || 0),
        0
      )
    ),
    totalGstTds: money(
      transactions.reduce(
        (total, transaction) => total + (Number(transaction.total_gst) || 0),
        0
      )
    ),
  };
}

export const dashboardRepository = {
  getPayrollSummary,
  getTreasurySummary,
  getVendorSummary,
};

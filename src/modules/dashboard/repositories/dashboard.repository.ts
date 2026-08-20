import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { getOfficeScope } from '@/shared/utilities/office';
import { MONTHS, QUARTER_MONTHS, type Quarter } from '@/shared/constants';
import { isActiveInEntryMonth } from '@/modules/payroll/utils/employeeDates';
import { gtr30BillRegisterRepository } from '@/modules/gtr30/repositories/billRegister.repository';
import { gtr44Repository } from '@/modules/gtr44/repositories/gtr44.repository';
import { paybillRepository } from '@/modules/paybill/repositories/paybill.repository';
import type {
  DashboardData,
  MonthlyRoadmapData,
  Task,
  TreasurySummary,
  VendorTdsSummary,
  PaybillSummary,
  StatutoryDeadlineInfo,
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
  da: number;
  tax: number;
}

interface SalaryMap {
  [employeeId: string]: {
    [month: string]: SalaryItem;
  };
}

interface PartyRow {
  id: string;
  name: string;
  gst_no: string | null;
  pan_no: string | null;
}

interface PartyTxRow {
  id: string;
  amount: number;
  income_tax: number;
  total_gst: number;
  transaction_date: string;
}

const PREV_QUARTER: Record<Quarter, Quarter> = { Q1: 'Q4', Q2: 'Q1', Q3: 'Q2', Q4: 'Q3' };

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

function getFinancialYear(): number {
  return useUIStore.getState().activeFinancialYear;
}

function getWorkMonths(): string[] {
  return [MONTHS[MONTHS.length - 1], ...MONTHS.slice(0, MONTHS.length - 1)];
}

const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function calculateStatutoryDeadlines(fy: number, currentQuarter: Quarter): StatutoryDeadlineInfo {
  const now = new Date();
  
  // Next TDS Deposit: 7th of next month (or 30th April for March)
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 7);
  const nextTdsDepositDate = nextMonthDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Quarterly deadlines
  const deadlineDates: Record<Quarter, { month: number; day: number; yearOffset: number }> = {
    Q1: { month: 6, day: 31, yearOffset: 0 }, // July 31
    Q2: { month: 9, day: 31, yearOffset: 0 }, // October 31
    Q3: { month: 0, day: 31, yearOffset: 1 }, // January 31 of next year
    Q4: { month: 4, day: 31, yearOffset: 1 }, // May 31 of next year
  };

  const deadlineConfig = deadlineDates[currentQuarter];
  const targetYear = fy + deadlineConfig.yearOffset;
  const filingDeadlineDate = new Date(targetYear, deadlineConfig.month, deadlineConfig.day);

  const diffTime = filingDeadlineDate.getTime() - now.getTime();
  const daysUntilFiling = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let currentQuarterStatus: StatutoryDeadlineInfo['currentQuarterStatus'] = 'on-track';
  if (daysUntilFiling < 0) currentQuarterStatus = 'overdue';
  else if (daysUntilFiling <= 14) currentQuarterStatus = 'due-soon';
  else if (daysUntilFiling <= 30) currentQuarterStatus = 'approaching';

  const nextQuarterFilingDate = filingDeadlineDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    nextTdsDepositDate,
    nextQuarterFilingDate,
    nextQuarterName: `Form 24Q/26Q (${currentQuarter})`,
    daysUntilFiling,
    currentQuarterStatus,
  };
}

export const dashboardRepository = {
  async getSummary(): Promise<DashboardData> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');
    const fy = getFinancialYear();

    // 1. Fetch Primary Payroll Data (Core Requirement)
    let qEmployees = supabase
      .from('employees')
      .select('id, name, pan, join_date, transfer_date');
    if (!scope.all) qEmployees = qEmployees.eq('office_id', scope.officeId!);
    const { data: employees, error: empError } = await qEmployees.order('id');
    if (empError) throw empError;

    let qSalaries = supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy);
    if (!scope.all) qSalaries = qSalaries.eq('office_id', scope.officeId!);
    const { data: salaries, error: salError } = await qSalaries;
    if (salError) throw salError;

    // 2. Fetch Cross-Module Data in parallel with graceful fallbacks
    const [gtr30Result, gtr44Result, partiesResult, partyTxResult, paybillImportsResult] =
      await Promise.allSettled([
        gtr30BillRegisterRepository.list(),
        gtr44Repository.getBills(),
        (async () => {
          let q = supabase.from('parties').select('id, name, gst_no, pan_no');
          if (!scope.all) q = q.eq('office_id', scope.officeId!);
          const { data } = await q;
          return (data || []) as PartyRow[];
        })(),
        (async () => {
          let q = supabase
            .from('party_transactions')
            .select('id, amount, income_tax, total_gst, transaction_date')
            .gte('transaction_date', `${fy}-04-01`);
          if (!scope.all) q = q.eq('office_id', scope.officeId!);
          const { data } = await q;
          return (data || []) as PartyTxRow[];
        })(),
        paybillRepository.listImports(fy),
      ]);

    // Parse Treasury summaries
    let treasury: TreasurySummary = {
      gtr30Count: 0,
      gtr30GrossTotal: 0,
      gtr30NetTotal: 0,
      gtr30PendingCount: 0,
      gtr44Count: 0,
      gtr44GrossTotal: 0,
      gtr44DraftCount: 0,
    };

    if (gtr30Result.status === 'fulfilled' && Array.isArray(gtr30Result.value)) {
      const bills = gtr30Result.value;
      treasury.gtr30Count = bills.length;
      treasury.gtr30GrossTotal = money(bills.reduce((sum, b) => sum + (Number(b.grossTotal) || 0), 0));
      treasury.gtr30NetTotal = money(bills.reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0));
      treasury.gtr30PendingCount = bills.filter((b) => b.status !== 'passed').length;
    }

    if (gtr44Result.status === 'fulfilled' && Array.isArray(gtr44Result.value)) {
      const gtr44Bills = gtr44Result.value;
      treasury.gtr44Count = gtr44Bills.length;
      treasury.gtr44GrossTotal = money(gtr44Bills.reduce((sum, b) => sum + (Number(b.grossAmount) || 0), 0));
      treasury.gtr44DraftCount = gtr44Bills.filter((b) => b.status === 'draft').length;
    }

    // Parse Vendor TDS summaries
    let vendorTds: VendorTdsSummary = {
      activePartiesCount: 0,
      totalVendorAmount: 0,
      totalVendorIncomeTax: 0,
      totalGstTds: 0,
      transactionCount: 0,
    };

    if (partiesResult.status === 'fulfilled') {
      vendorTds.activePartiesCount = partiesResult.value.length;
    }

    if (partyTxResult.status === 'fulfilled') {
      const txs = partyTxResult.value;
      vendorTds.transactionCount = txs.length;
      vendorTds.totalVendorAmount = money(txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
      vendorTds.totalVendorIncomeTax = money(txs.reduce((sum, t) => sum + (Number(t.income_tax) || 0), 0));
      vendorTds.totalGstTds = money(txs.reduce((sum, t) => sum + (Number(t.total_gst) || 0), 0));
    }

    // Parse Paybill Import summaries
    let paybillStats: PaybillSummary = {
      importedBatchesCount: 0,
      lastImportedMonth: null,
      totalEarningsRecorded: 0,
    };

    if (paybillImportsResult.status === 'fulfilled' && Array.isArray(paybillImportsResult.value)) {
      const imports = paybillImportsResult.value;
      paybillStats.importedBatchesCount = imports.length;
      if (imports.length > 0) {
        paybillStats.lastImportedMonth = imports[0].month;
        paybillStats.totalEarningsRecorded = imports.reduce((sum, i) => sum + (i.totalRecords || 0), 0);
      }
    }

    // 3. Process Payroll & Salary Roster
    const empList = (employees || []) as EmployeeRow[];
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
    let prevQuarterPending = 0;

    const monthlyData = MONTHS.map((month) => ({
      month,
      active: 0,
      processed: 0,
      salary: 0,
      tax: 0,
      pendingNames: [] as string[],
    }));

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
        }
      });

      if (hasAnyEntry) {
        ytdSalary += Object.values(sm).reduce((sum, s) => sum + money(s.gross), 0);
        ytdTax += Object.values(sm).reduce((sum, s) => sum + money(s.tax), 0);
      }
      if (hasZeroTax && hasAnyEntry) zeroTaxEntries.push(name);

      const isActiveCurrentSlot = isActiveInEntryMonth(emp.join_date, emp.transfer_date, fy, currentSlotMonth);
      if (isActiveCurrentSlot) {
        activeEmployees++;
        if (!pan) missingPANs.push(name);
        if (!sm[currentSlotMonth]) pendingEmployees++;
      }

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
    });

    const monthlyRoadmap: MonthlyRoadmapData[] = workMonths.map((workMonth, i) => {
      const m = monthlyData[i];
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

    // 4. Generate Comprehensive Cross-Module Tasks
    const tasks: Task[] = [];
    
    // Payroll tasks
    if (pendingEmployees > 0) {
      tasks.push({
        severity: 'danger',
        category: 'payroll',
        title: `${pendingEmployees} salary entries pending for ${entryMonthName}`,
        hint: `Complete employee payroll roster for ${entryMonthName}`,
        action: '/payroll',
      });
    }
    if (missingPANs.length > 0) {
      tasks.push({
        severity: 'warning',
        category: 'compliance',
        title: `${missingPANs.length} employees missing valid PAN`,
        hint: 'Section 206AA requires valid PANs (attracts 20% TDS)',
        action: '/payroll?tab=employees',
      });
    }
    if (prevQuarterPending > 0) {
      tasks.push({
        severity: 'danger',
        category: 'compliance',
        title: `${prevQuarterPending} entries pending from previous quarter`,
        hint: 'Reconcile prior quarter to finalize Form 24Q return',
        action: '/reports',
      });
    }

    // Treasury tasks
    if (treasury.gtr30PendingCount > 0) {
      tasks.push({
        severity: 'warning',
        category: 'treasury',
        title: `${treasury.gtr30PendingCount} GTR-30 pay bills pending submission`,
        hint: 'Review and pass registered pay bills in GTR-30 register',
        action: '/gtr30/list',
      });
    }
    if (treasury.gtr44DraftCount > 0) {
      tasks.push({
        severity: 'info',
        category: 'treasury',
        title: `${treasury.gtr44DraftCount} GTR-44 DC bills in draft`,
        hint: 'Finalize contingency bills and generate treasury vouchers',
        action: '/gtr44/list',
      });
    }

    // Vendor / GST tasks
    if (vendorTds.totalGstTds > 0 && vendorTds.transactionCount > 0) {
      tasks.push({
        severity: 'info',
        category: 'vendor',
        title: `₹ ${vendorTds.totalGstTds.toLocaleString('en-IN')} GST TDS recorded for ${vendorTds.activePartiesCount} vendors`,
        hint: 'Generate GST TDS return and commercial bills summary',
        action: '/parties/gst',
      });
    }

    const currentQuarterCompletion = quarterReadiness[currentQuarter as keyof typeof quarterReadiness];
    const statutoryDeadlines = calculateStatutoryDeadlines(fy, currentQuarter);

    return {
      fy,
      lastUpdated: new Date().toLocaleString('en-IN'),
      activeEmployees,
      pendingEmployees,
      ytdSalary,
      ytdTax,
      currentQuarter,
      currentQuarterCompletion: { pct: currentQuarterCompletion.pct },
      monthlyRoadmap,
      tasks,
      quarterReadiness,
      prevQuarterPending,
      zeroTaxEntries,
      missingPANs,
      entryMonthName,
      treasury,
      vendorTds,
      paybillStats,
      statutoryDeadlines,
    };
  },
};

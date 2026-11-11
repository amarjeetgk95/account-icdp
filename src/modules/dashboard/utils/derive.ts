import { currentFinancialYear } from '@/shared/utilities/date';
import type {
  ActionItem,
  DashboardCategory,
  DashboardSeverity,
  MonthlyRoadmapData,
  PayrollPacing,
  PayrollSummary,
  TreasurySummary,
} from '../types';

const SEVERITY_BASE: Record<DashboardSeverity, number> = {
  danger: 300,
  warning: 200,
  info: 100,
};

export const CATEGORY_LABELS: Record<DashboardCategory, string> = {
  payroll: 'Payroll',
  treasury: 'Treasury',
  vendor: 'Vendor TDS',
  compliance: 'Compliance',
};

export const SEVERITY_LABELS: Record<DashboardSeverity, string> = {
  danger: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

function scoreFor(
  severity: DashboardSeverity,
  count = 0,
  dueInDays?: number
): number {
  let score = SEVERITY_BASE[severity] + Math.min(50, count);
  if (dueInDays !== undefined) {
    if (dueInDays < 0) score += 60;
    else if (dueInDays <= 7) score += 40;
    else if (dueInDays <= 15) score += 25;
    else if (dueInDays <= 45) score += 10;
  }
  return score;
}

export function buildActions(
  payroll?: PayrollSummary,
  treasury?: TreasurySummary,
  now: Date = new Date()
): ActionItem[] {
  const actions: ActionItem[] = [];

  if (payroll) {
    const pending = payroll.pendingEmployees;
    if (pending > 0) {
      actions.push({
        id: 'payroll-pending',
        severity: 'danger',
        category: 'payroll',
        title: `${pending} salary ${pending === 1 ? 'entry' : 'entries'} pending for ${payroll.entryMonthName}`,
        hint: `${payroll.entryWorkMonthName} work — ${payroll.activeEmployees} staff on the ${payroll.entryMonthName} roster`,
        action: '/payroll/entry',
        count: pending,
        score: scoreFor('danger', pending),
      });
    }

    const missingPANs = payroll.missingPANs.length;
    if (missingPANs > 0) {
      actions.push({
        id: 'compliance-missing-pan',
        severity: 'danger',
        category: 'compliance',
        title: `${missingPANs} ${missingPANs === 1 ? 'employee' : 'employees'} missing a valid PAN`,
        hint: 'Section 206AA attracts 20% TDS when PAN is absent or invalid',
        action: '/establishment',
        count: missingPANs,
        score: scoreFor('danger', missingPANs),
      });
    }

    const previousQuarterPending = payroll.prevQuarterPending;
    if (previousQuarterPending > 0) {
      actions.push({
        id: 'compliance-previous-quarter',
        severity: 'danger',
        category: 'compliance',
        title: `${previousQuarterPending} ${previousQuarterPending === 1 ? 'entry' : 'entries'} pending from the previous quarter`,
        hint: 'Reconcile the prior quarter before the Form 24Q return is filed',
        action: '/payroll/report',
        count: previousQuarterPending,
        score: scoreFor('danger', previousQuarterPending),
      });
    }

    const zeroTax = payroll.zeroTaxEntries.length;
    if (zeroTax > 0) {
      actions.push({
        id: 'compliance-zero-tax',
        severity: 'warning',
        category: 'compliance',
        title: `${zeroTax} zero-TDS ${zeroTax === 1 ? 'entry' : 'entries'} to verify`,
        hint: 'Gross salary recorded with no income tax deduction — confirm before filing',
        action: '/reports/24q',
        count: zeroTax,
        score: scoreFor('warning', zeroTax),
      });
    }

    const quarter = payroll.quarterReadiness[payroll.currentQuarter];
    if (payroll.fy === currentFinancialYear(now) && !quarter.future && quarter.pct < 100) {
      const days = payroll.statutoryDeadlines.daysUntilFiling;
      if (days <= 45) {
        const severity: DashboardSeverity = days <= 15 ? 'danger' : 'warning';
        const title =
          days < 0
            ? `${payroll.statutoryDeadlines.nextQuarterName} filing overdue by ${Math.abs(days)}d`
            : `${payroll.statutoryDeadlines.nextQuarterName} filing in ${days}d`;
        actions.push({
          id: 'compliance-filing-deadline',
          severity,
          category: 'compliance',
          title,
          hint: `${quarter.processed} of ${quarter.expected} entries ready for ${payroll.currentQuarter} — due ${payroll.statutoryDeadlines.nextQuarterFilingDate}`,
          action: '/reports/24q',
          dueInDays: days,
          score: scoreFor(severity, 0, days),
        });
      }
    }
  }

  if (treasury) {
    const pendingBills = treasury.gtr30PendingCount;
    if (pendingBills > 0) {
      actions.push({
        id: 'treasury-gtr30-pending',
        severity: 'warning',
        category: 'treasury',
        title: `${pendingBills} GTR-30 pay ${pendingBills === 1 ? 'bill' : 'bills'} pending submission`,
        hint: 'Review and pass the registered pay bills in the GTR-30 register',
        action: '/gtr30/list',
        count: pendingBills,
        score: scoreFor('warning', pendingBills),
      });
    }

    const draftBills = treasury.gtr44DraftCount;
    if (draftBills > 0) {
      actions.push({
        id: 'treasury-gtr44-draft',
        severity: 'info',
        category: 'treasury',
        title: `${draftBills} GTR-44 ${draftBills === 1 ? 'bill' : 'bills'} in draft`,
        hint: 'Finalize contingency bills and generate treasury vouchers',
        action: '/gtr44/list',
        count: draftBills,
        score: scoreFor('info', draftBills),
      });
    }
  }

  return actions.sort((a, b) => b.score - a.score);
}

export function derivePayrollPacing(roadmap: MonthlyRoadmapData[]): PayrollPacing {
  const considered = roadmap.filter((month) => !month.future);
  const current = roadmap.find((month) => month.isCurrent) ?? null;
  const priorPending = considered
    .filter((month) => !month.isCurrent)
    .reduce((total, month) => total + Math.max(0, month.active - month.processed), 0);
  const active = considered.reduce((total, month) => total + month.active, 0);
  const processed = considered.reduce((total, month) => total + month.processed, 0);

  return {
    current: current
      ? {
          month: current.month,
          active: current.active,
          processed: current.processed,
          pct: current.pct,
        }
      : null,
    ytd: {
      active,
      processed,
      pct: active > 0 ? Math.min(100, Math.round((processed / active) * 100)) : 0,
    },
    priorPending,
    isOnTrack:
      priorPending === 0 && (!current || current.active === 0 || current.processed >= current.active),
  };
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < 45_000) return 'just now';
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

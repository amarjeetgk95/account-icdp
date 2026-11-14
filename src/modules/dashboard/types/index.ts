import type { Quarter } from '@/shared/constants';

export type DashboardSeverity = 'danger' | 'warning' | 'info';
export type DashboardCategory = 'payroll' | 'treasury' | 'vendor' | 'compliance';

export interface MonthlyRoadmapData {
  month: string;
  active: number;
  processed: number;
  salary: number;
  tax: number;
  pct: number;
  status: 'complete' | 'partial' | 'empty' | 'idle';
  isCurrent: boolean;
  future: boolean;
  pendingNames: string[];
}

export interface QuarterProgress {
  pct: number;
  processed: number;
  expected: number;
  future: boolean;
}

export type QuarterReadinessData = Record<Quarter, QuarterProgress>;

export interface StatutoryDeadlineInfo {
  nextTdsDepositDate: string;
  nextQuarterFilingDate: string;
  nextQuarterName: string;
  daysUntilFiling: number;
}

export interface PayrollSummary {
  fy: number;
  activeEmployees: number;
  pendingEmployees: number;
  ytdSalary: number;
  ytdTax: number;
  entryMonthName: string;
  entryWorkMonthName: string;
  currentQuarter: Quarter;
  monthsElapsed: number;
  monthlyRoadmap: MonthlyRoadmapData[];
  quarterReadiness: QuarterReadinessData;
  prevQuarterPending: number;
  zeroTaxEntries: string[];
  missingPANs: string[];
  statutoryDeadlines: StatutoryDeadlineInfo;
}

export interface TreasurySummary {
  gtr30Count: number;
  gtr30GrossTotal: number;
  gtr30PendingCount: number;
  gtr44Count: number;
  gtr44GrossTotal: number;
  gtr44DraftCount: number;
}

export interface VendorTdsSummary {
  partiesCount: number;
  transactionCount: number;
  totalVendorAmount: number;
  totalVendorIncomeTax: number;
  totalGstTds: number;
}

export interface ActionItem {
  id: string;
  severity: DashboardSeverity;
  category: DashboardCategory;
  title: string;
  hint: string;
  action?: string;
  count?: number;
  amount?: number;
  dueInDays?: number;
  score: number;
}

export interface PayrollPacing {
  current: {
    month: string;
    active: number;
    processed: number;
    pct: number;
  } | null;
  ytd: {
    active: number;
    processed: number;
    pct: number;
  };
  priorPending: number;
  isOnTrack: boolean;
}

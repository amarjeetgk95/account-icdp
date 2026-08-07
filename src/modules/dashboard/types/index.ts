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
}

export interface QuarterReadiness {
  pct: number;
  processed: number;
  expected: number;
}

export interface QuarterReadinessData {
  Q1: QuarterReadiness;
  Q2: QuarterReadiness;
  Q3: QuarterReadiness;
  Q4: QuarterReadiness;
}

export interface Task {
  severity: 'danger' | 'warning' | 'info';
  icon: string;
  title: string;
  hint: string;
  action?: string;
  actionLabel?: string;
}

export interface RecentTransaction {
  partyName: string;
  amount: number;
  gst: number;
  tax: number;
  date: string;
}

export interface DashboardData {
  fy: number;
  lastUpdated: string;
  activeEmployees: number;
  pendingEmployees: number;
  ytdSalary: number;
  ytdTax: number;
  currentQuarter: string;
  currentQuarterCompletion: { pct: number };
  monthlyRoadmap: MonthlyRoadmapData[];
  tasks: Task[];
  quarterReadiness: QuarterReadinessData;
  empQuarterlyTDS: Record<string, number>;
  empQuarterlySalary: Record<string, number>;
  vendorQuarterly: Record<string, { it: number; gst: number }>;
  recentTransactions: RecentTransaction[];
  prevQuarterPending: number;
  zeroTaxEntries: string[];
  missingPANs: string[];
   newJoinersThisMonth: number;
   departuresThisMonth: number;
   vendorCount: number;
   entryMonthName?: string;
 }

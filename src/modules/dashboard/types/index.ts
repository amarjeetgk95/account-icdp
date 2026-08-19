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

interface QuarterReadiness {
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
  title: string;
  hint: string;
  action?: string;
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
  prevQuarterPending: number;
  zeroTaxEntries: string[];
  missingPANs: string[];
  entryMonthName?: string;
}

export interface EmployeeRosterItem {
  id: string;
  name: string;
  pan: string;
  hprnNo?: string;
  hasEntry: boolean;
  gross: number;
  da: number;
  tax: number;
}

export interface MonthOption {
  value: string;
  label: string;
}

export interface QuarterReport {
  fy: number;
  fyLabel: string;
  ayLabel: string;
  quarter: string;
  labels: Array<{ work: string; paid: string }>;
  rows: QuarterReportRow[];
}

interface QuarterReportRow {
  name: string;
  pan: string;
  g: [number, number, number];
  d: number;
  total: number;
  t: [number, number, number];
  tax: number;
}

export interface BudgetHeadInput {
  id?: string;
  code: string;
  name: string;
}

export interface BudgetHeadQuarterTotals {
  gross: number;
  da: number;
  tax: number;
  net: number;
}

export interface BudgetHeadReportGroup {
  code: string | null;
  name: string;
  months: BudgetHeadQuarterTotals[];
  quarters: [BudgetHeadQuarterTotals, BudgetHeadQuarterTotals, BudgetHeadQuarterTotals, BudgetHeadQuarterTotals];
  totals: BudgetHeadQuarterTotals;
}

export interface BudgetHeadReport {
  fy: number;
  fyLabel: string;
  monthLabels: string[];
  groups: BudgetHeadReportGroup[];
  totals: BudgetHeadQuarterTotals;
}

export * from './reconciliation';
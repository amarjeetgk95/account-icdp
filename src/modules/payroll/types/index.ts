export interface SalaryEntry {
  employeeId: string;
  employeeName: string;
  pan: string;
  gross: number;
  da: number;
  tax: number;
}

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

export interface QuarterReportRow {
  name: string;
  pan: string;
  g: [number, number, number];
  d: number;
  total: number;
  t: [number, number, number];
  tax: number;
}

export interface QuarterReport {
  fy: number;
  fyLabel: string;
  ayLabel: string;
  quarter: string;
  labels: Array<{ work: string; paid: string }>;
  rows: QuarterReportRow[];
}

export interface BudgetHead {
  id: string;
  officeId: string;
  code: string;
  name: string;
  sortOrder: number;
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

export interface EmployeeLookupInfo {
  id?: string;
  name: string;
  pan?: string;
  hprnNo: string;
  joinDate?: string | null;
  transferDate?: string | null;
  budgetHeadCode?: string | null;
  budgetHeadName?: string | null;
  isRegisteredInMaster: boolean;
}

export interface EmployeeLookupSalaryRow {
  month: string;
  gross: number;
  daAndOther: number;
  totalGross: number;
  tax: number;
  net: number;
  status: string;
  createdAt?: string;
}

export interface EmployeeLookupQuarterTotals {
  gross: number;
  daAndOther: number;
  totalGross: number;
  tax: number;
  net: number;
  monthsWithData: number;
}

export interface EmployeeLookupSearchResult {
  id?: string;
  name: string;
  hprnNo: string;
  pan?: string;
}

export interface EmployeeLookupDetails {
  matchingEmployees: EmployeeLookupSearchResult[];
  employeeInfo: EmployeeLookupInfo | null;
  salaries: EmployeeLookupSalaryRow[];
  quarters: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', EmployeeLookupQuarterTotals>;
  totals: EmployeeLookupQuarterTotals;
}


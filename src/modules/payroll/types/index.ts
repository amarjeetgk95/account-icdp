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

export interface BulkSalarySaveInput {
  month: string;
  financialYear: number;
  entries: Array<{
    employeeId: string;
    gross: number;
    da: number;
    tax: number;
  }>;
}

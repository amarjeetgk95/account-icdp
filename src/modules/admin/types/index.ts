export interface SystemStats {
  users: number;
  admins: number;
  suspended?: number;
  offices: number;
  fy: number;
  employees: number;
  salaries: number;
  parties: number;
  transactions: number;
  officeName?: string | null;
  salary_imports?: number;
  paybill_imports?: number;
  paybill_unmatched?: number;
}

export interface UserInfo {
  id: string;
  email: string;
  role: 'admin' | 'office';
  office_id: string | null;
  office_name: string | null;
  suspended?: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface OfficeStats {
  office_id: string;
  office_name: string;
  employees: number;
  salaries: number;
  parties: number;
  transactions: number;
  users: number;
}

export interface Office {
  id: string;
  name: string;
  district: string | null;
  current_fy?: number;
  users: number;
  suspended_users?: number;
}

export interface OfficeCompletion {
  office_id: string;
  office_name: string;
  fy: number;
  months: string[];
}

export interface DataEntryReportRow {
  office_id: string;
  office_name: string;
  user_email: string | null;
  current_fy: number;
  employees: number;
  salary_records: number;
  total_gross: number;
  total_da: number;
  total_tax: number;
  vendors: number;
  transactions: number;
  total_amount: number;
  total_gst: number;
  total_income_tax: number;
  last_activity: string | null;
  paybill_imports?: number;
  paybill_total_records?: number;
  paybill_matched_count?: number;
  mapping_issues?: number;
}

export interface ImportHealthRow {
  office_id: string;
  office_name: string;
  fy: number | null;
  salary_imports: number;
  salary_total_records: number;
  salary_matched_count: number;
  paybill_imports: number;
  paybill_total_records: number;
  paybill_matched_count: number;
  earnings_rows: number;
  deduction_rows: number;
  mapping_issues: number;
  name_mismatches: number;
  validation_errors: number;
  last_activity: string | null;
}

export interface OfficeConfig {
  office_id: string;
  office_name: string;
  district: string | null;
  current_fy: number | null;
  financial_years: number[];
  users: number;
  employees: number;
}

export interface CreateUserInput {
  email: string;
  password?: string;
  role: 'admin' | 'office';
  officeName?: string;
}


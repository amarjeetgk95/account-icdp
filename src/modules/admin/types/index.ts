export interface SystemStats {
  users: number;
  admins: number;
  offices: number;
  fy: number;
  employees: number;
  salaries: number;
  parties: number;
  transactions: number;
  officeName: string;
}

export interface UserInfo {
  id: string;
  email: string;
  role: 'admin' | 'office';
  office_id: string | null;
  office_name: string | null;
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
}

export interface CreateUserInput {
  email: string;
  password?: string;
  role: 'admin' | 'office';
  officeName: string;
}

export type UserInviteMethod = 'password' | 'invite';

export interface AuditLogEntry {
  id: number;
  admin_email: string | null;
  action: string;
  target_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

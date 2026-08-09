import type { Json } from './json.types';

export type Database = {
  public: {
    Views: Record<string, never>,
    Tables: {
      profiles: {
        Row: { id: string; email: string; role: 'admin' | 'office'; office_id: string | null; created_at: string; updated_at: string }
        Insert: { id: string; email: string; role?: 'admin' | 'office'; office_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; role?: 'admin' | 'office'; office_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      offices: {
        Row: { id: string; name: string; district: string | null; current_fy: number; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; district?: string | null; current_fy?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; district?: string | null; current_fy?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      office_details: {
        Row: { id: string; office_id: string; office_name: string | null; subtitle: string | null; address: string | null; phone: string | null; email: string | null; gst: string | null; tan: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; office_name?: string | null; subtitle?: string | null; address?: string | null; phone?: string | null; email?: string | null; gst?: string | null; tan?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; office_name?: string | null; subtitle?: string | null; address?: string | null; phone?: string | null; email?: string | null; gst?: string | null; tan?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      budget_heads: {
        Row: { id: string; office_id: string; code: string; name: string; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; code: string; name: string; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; code?: string; name?: string; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      employees: {
        Row: { id: string; hprn_no: string | null; name: string; pan: string; join_date: string | null; transfer_date: string | null; budget_head_id: string | null; office_id: string; created_at: string; updated_at: string }

        Insert: { id?: string; hprn_no?: string | null; name: string; pan: string; join_date?: string | null; transfer_date?: string | null; budget_head_id?: string | null; office_id: string; created_at?: string; updated_at?: string }

        Update: { id?: string; hprn_no?: string | null; name?: string; pan?: string; join_date?: string | null; transfer_date?: string | null; budget_head_id?: string | null; office_id?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      employee_salaries: {
        Row: { id: string; employee_id: string; financial_year: number; month: string; gross: number; da: number; tax: number; office_id: string; created_at: string; updated_at: string }
        Insert: { id?: string; employee_id: string; financial_year: number; month: string; gross?: number; da?: number; tax?: number; office_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; employee_id?: string; financial_year?: number; month?: string; gross?: number; da?: number; tax?: number; office_id?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      salary_imports: {
        Row: { id: string; office_id: string; excel_filename: string; financial_year: number; total_records: number; matched_count: number; uploaded_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; excel_filename: string; financial_year: number; total_records?: number; matched_count?: number; uploaded_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; excel_filename?: string; financial_year?: number; total_records?: number; matched_count?: number; uploaded_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      employee_salary: {
        Row: { id: string; salary_import_id: string; employee_id: string | null; hprn_no: string; office_id: string; name: string | null; month: string; financial_year: number; gross_salary: number; income_tax: number; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; salary_import_id: string; employee_id?: string | null; hprn_no: string; office_id: string; name?: string | null; month: string; financial_year: number; gross_salary?: number; income_tax?: number; status: string; created_at?: string; updated_at?: string }
        Update: { id?: string; salary_import_id?: string; employee_id?: string | null; hprn_no?: string; office_id?: string; name?: string | null; month?: string; financial_year?: number; gross_salary?: number; income_tax?: number; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      parties: {
        Row: { id: string; name: string; gst_no: string | null; pan_no: string | null; office_id: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; gst_no?: string | null; pan_no?: string | null; office_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; gst_no?: string | null; pan_no?: string | null; office_id?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      party_transactions: {
        Row: { id: string; party_id: string; office_id: string; cpin_no: string | null; bill_no: string; transaction_date: string; amount: number; cgst: number; sgst: number; igst: number; total_gst: number; income_tax: number; created_at: string; updated_at: string }
        Insert: { id?: string; party_id: string; office_id: string; cpin_no?: string | null; bill_no: string; transaction_date: string; amount?: number; cgst?: number; sgst?: number; igst?: number; total_gst?: number; income_tax?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; party_id?: string; office_id?: string; cpin_no?: string | null; bill_no?: string; transaction_date?: string; amount?: number; cgst?: number; sgst?: number; igst?: number; total_gst?: number; income_tax?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      app_config: {
        Row: { id: string; office_id: string; key: string; value: string; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; key: string; value: string; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; key?: string; value?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: { Args: Record<string, never>; Returns: Json }
      admin_set_role: { Args: { user_id: string; new_role: string; new_office_id: string | null }; Returns: Json }
      admin_delete_user: { Args: { user_id: string }; Returns: Json }
      admin_deleteUser: { Args: { user_id: string }; Returns: Json }
      admin_list_offices: { Args: Record<string, never>; Returns: Json }
      admin_create_office: { Args: { office_name: string; office_district: string }; Returns: Json }
      admin_create_user: { Args: { user_email: string; user_password: string; user_role: string; user_office_id: string }; Returns: Json }
      admin_invite_user: { Args: { user_email: string; user_role: string; user_office_id: string }; Returns: Json }
      admin_entry_completion: { Args: Record<string, never>; Returns: Json }
      admin_office_financial_years: { Args: { target_office_id: string }; Returns: Json }
      admin_audit_list: { Args: { limit_count?: number }; Returns: Json }
      get_system_stats: { Args: Record<string, never>; Returns: Json }
      admin_office_stats: { Args: Record<string, never>; Returns: Json }
      admin_data_entry_report: { Args: Record<string, never>; Returns: Json }
      current_office_id: { Args: Record<string, never>; Returns: string }
      can_access_office: { Args: { target_office_id: string }; Returns: boolean }
      is_admin: { Args: Record<string, never>; Returns: boolean }
    }
  }
}

import type { Json } from './json.types';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; role: 'admin' | 'office'; office_id: string | null; created_at: string; updated_at: string }
        Insert: { id: string; email: string; role?: 'admin' | 'office'; office_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; role?: 'admin' | 'office'; office_id?: string | null; created_at?: string; updated_at?: string }
      }
      offices: {
        Row: { id: string; name: string; district: string | null; current_fy: number; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; district?: string | null; current_fy?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; district?: string | null; current_fy?: number; created_at?: string; updated_at?: string }
      }
      office_details: {
        Row: { id: string; office_id: string; office_name: string | null; subtitle: string | null; address: string | null; phone: string | null; email: string | null; gst: string | null; tan: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; office_name?: string | null; subtitle?: string | null; address?: string | null; phone?: string | null; email?: string | null; gst?: string | null; tan?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; office_name?: string | null; subtitle?: string | null; address?: string | null; phone?: string | null; email?: string | null; gst?: string | null; tan?: string | null; created_at?: string; updated_at?: string }
      }
      employees: {
        Row: { id: string; name: string; pan: string; join_date: string | null; transfer_date: string | null; office_id: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; pan: string; join_date?: string | null; transfer_date?: string | null; office_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; pan?: string; join_date?: string | null; transfer_date?: string | null; office_id?: string; created_at?: string; updated_at?: string }
      }
      employee_salaries: {
        Row: { id: string; employee_id: string; financial_year: number; month: string; gross: number; da: number; tax: number; office_id: string; created_at: string; updated_at: string }
        Insert: { id?: string; employee_id: string; financial_year: number; month: string; gross?: number; da?: number; tax?: number; office_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; employee_id?: string; financial_year?: number; month?: string; gross?: number; da?: number; tax?: number; office_id?: string; created_at?: string; updated_at?: string }
      }
      parties: {
        Row: { id: string; name: string; gst_no: string | null; pan_no: string | null; office_id: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; gst_no?: string | null; pan_no?: string | null; office_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; gst_no?: string | null; pan_no?: string | null; office_id?: string; created_at?: string; updated_at?: string }
      }
      party_transactions: {
        Row: { id: string; party_id: string; office_id: string; cpin_no: string | null; bill_no: string; transaction_date: string; amount: number; cgst: number; sgst: number; igst: number; total_gst: number; income_tax: number; created_at: string; updated_at: string }
        Insert: { id?: string; party_id: string; office_id: string; cpin_no?: string | null; bill_no: string; transaction_date: string; amount?: number; cgst?: number; sgst?: number; igst?: number; total_gst?: number; income_tax?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; party_id?: string; office_id?: string; cpin_no?: string | null; bill_no?: string; transaction_date?: string; amount?: number; cgst?: number; sgst?: number; igst?: number; total_gst?: number; income_tax?: number; created_at?: string; updated_at?: string }
      }
      app_config: {
        Row: { id: string; office_id: string; key: string; value: string; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; key: string; value: string; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; key?: string; value?: string; created_at?: string; updated_at?: string }
      }
    }
    Functions: {
      admin_list_users: { Args: Record<string, never>; Returns: Json }
      admin_set_role: { Args: { user_id: string; new_role: string; new_office_id: string }; Returns: Json }
      admin_delete_user: { Args: { user_id: string }; Returns: Json }
      admin_list_offices: { Args: Record<string, never>; Returns: Json }
      admin_create_office: { Args: { office_name: string; office_district: string }; Returns: Json }
      get_system_stats: { Args: Record<string, never>; Returns: Json }
      admin_office_stats: { Args: Record<string, never>; Returns: Json }
      admin_data_entry_report: { Args: Record<string, never>; Returns: Json }
      current_office_id: { Args: Record<string, never>; Returns: string }
      can_access_office: { Args: { target_office_id: string }; Returns: boolean }
      is_admin: { Args: Record<string, never>; Returns: boolean }
    }
  }
}

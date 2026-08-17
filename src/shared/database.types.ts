import type { Json } from './json.types';

export type Database = {
  public: {
    Views: Record<string, never>,
    Tables: {
      profiles: {
        Row: { id: string; email: string; role: 'admin' | 'office'; office_id: string | null; suspended?: boolean; created_at: string; updated_at: string }
        Insert: { id: string; email: string; role?: 'admin' | 'office'; office_id?: string | null; suspended?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; role?: 'admin' | 'office'; office_id?: string | null; suspended?: boolean; created_at?: string; updated_at?: string }
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
        Row: { id: string; hprn_no: string | null; name: string; pan: string; designation?: string | null; pay_scale?: string | null; join_date: string | null; transfer_date: string | null; budget_head_id: string | null; office_id: string; created_at: string; updated_at: string }

        Insert: { id?: string; hprn_no?: string | null; name: string; pan: string; designation?: string | null; pay_scale?: string | null; join_date?: string | null; transfer_date?: string | null; budget_head_id?: string | null; office_id: string; created_at?: string; updated_at?: string }

        Update: { id?: string; hprn_no?: string | null; name?: string; pan?: string; designation?: string | null; pay_scale?: string | null; join_date?: string | null; transfer_date?: string | null; budget_head_id?: string | null; office_id?: string; created_at?: string; updated_at?: string }
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
        Relationships: [
          {
            foreignKeyName: "party_transactions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_audit_log: {
        Row: { id: number; admin_id: string | null; admin_email: string | null; action: string; target_email: string | null; details: Json | null; created_at: string }
        Insert: { id?: number; admin_id?: string | null; admin_email?: string | null; action: string; target_email?: string | null; details?: Json | null; created_at?: string }
        Update: { id?: number; admin_id?: string | null; admin_email?: string | null; action?: string; target_email?: string | null; details?: Json | null; created_at?: string }
        Relationships: []
      }
      app_config: {
        Row: { id: string; office_id: string; key: string; value: string; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; key: string; value: string; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; key?: string; value?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_imports: {
        Row: { id: string; office_id: string; bill_no: string; month: string; financial_year: number; sheet_type: string | null; ddo_hrpn: string | null; ddo_name: string | null; major_head: string | null; ddo_code: string | null; department: string | null; office_name: string | null; tan_no: string | null; cardex_no: string | null; total_records: number; matched_count: number; gross_total: number; uploaded_file: string | null; uploaded_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id: string; bill_no: string; month: string; financial_year: number; sheet_type?: string | null; ddo_hrpn?: string | null; ddo_name?: string | null; major_head?: string | null; ddo_code?: string | null; department?: string | null; office_name?: string | null; tan_no?: string | null; cardex_no?: string | null; total_records?: number; matched_count?: number; gross_total?: number; uploaded_file?: string | null; uploaded_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string; bill_no?: string; month?: string; financial_year?: number; sheet_type?: string | null; ddo_hrpn?: string | null; ddo_name?: string | null; major_head?: string | null; ddo_code?: string | null; department?: string | null; office_name?: string | null; tan_no?: string | null; cardex_no?: string | null; total_records?: number; matched_count?: number; gross_total?: number; uploaded_file?: string | null; uploaded_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_employee_deductions: {
        Row: { id: string; import_id: string; office_id: string; employee_id: string | null; hrpn: string; employee_name: string; designation: string | null; month: string; financial_year: number; basic_pay: number; da: number; hra: number; income_tax: number; prof_tax: number; hba_interest: number; gpf_regular: number; gpf_class4: number; nps_regular: number; gis_govt_fund: number; gis_govt_saving: number; other_deductions: number; total_deductions: number; net_pay: number; mapping_status: string; validation_status: string | null; mapping_message: string | null; name_mismatch: boolean; errors: unknown[]; warnings: unknown[]; validation_flags: Record<string, unknown> | null; created_at: string; updated_at: string }
        Insert: { id?: string; import_id: string; office_id: string; employee_id?: string | null; hrpn: string; employee_name: string; designation?: string | null; month: string; financial_year: number; basic_pay?: number; da?: number; hra?: number; income_tax?: number; prof_tax?: number; hba_interest?: number; gpf_regular?: number; gpf_class4?: number; nps_regular?: number; gis_govt_fund?: number; gis_govt_saving?: number; other_deductions?: number; total_deductions?: number; net_pay?: number; mapping_status: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Update: { id?: string; import_id?: string; office_id?: string; employee_id?: string | null; hrpn?: string; employee_name?: string; designation?: string | null; month?: string; financial_year?: number; basic_pay?: number; da?: number; hra?: number; income_tax?: number; prof_tax?: number; hba_interest?: number; gpf_regular?: number; gpf_class4?: number; nps_regular?: number; gis_govt_fund?: number; gis_govt_saving?: number; other_deductions?: number; total_deductions?: number; net_pay?: number; mapping_status?: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_employee_earnings: {
        Row: { id: string; import_id: string; office_id: string; employee_id: string | null; hrpn: string; employee_name: string; designation: string | null; pay_scale: string | null; ph: string | null; slo: string | null; month: string; financial_year: number; basic_pay: number; da: number; hra: number; cla: number; medical_allowance: number; transport_allowance: number; special_pay?: number; washing_allowance?: number; npp_allowance: number; gross_amount: number; mapping_status: string; validation_status: string | null; mapping_message: string | null; name_mismatch: boolean; errors: unknown[]; warnings: unknown[]; validation_flags: Record<string, unknown> | null; created_at: string; updated_at: string }
        Insert: { id?: string; import_id: string; office_id: string; employee_id?: string | null; hrpn: string; employee_name: string; designation?: string | null; pay_scale?: string | null; ph?: string | null; slo?: string | null; month: string; financial_year: number; basic_pay?: number; da?: number; hra?: number; cla?: number; medical_allowance?: number; transport_allowance?: number; special_pay?: number; washing_allowance?: number; npp_allowance?: number; gross_amount?: number; mapping_status: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Update: { id?: string; import_id?: string; office_id?: string; employee_id?: string | null; hrpn?: string; employee_name?: string; designation?: string | null; pay_scale?: string | null; ph?: string | null; slo?: string | null; month?: string; financial_year?: number; basic_pay?: number; da?: number; hra?: number; cla?: number; medical_allowance?: number; transport_allowance?: number; special_pay?: number; washing_allowance?: number; npp_allowance?: number; gross_amount?: number; mapping_status?: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_settings: {
        Row: { office_id: string; settings_key: string; settings_value: Json; updated_at: string | null; updated_by: string | null }
        Insert: { office_id: string; settings_key: string; settings_value?: Json; updated_at?: string | null; updated_by?: string | null }
        Update: { office_id?: string; settings_key?: string; settings_value?: Json; updated_at?: string | null; updated_by?: string | null }
        Relationships: []
      }
      paybill_vouchers: {
        Row: { id: string; office_id: string; voucher_no: string; bill_no: string; month: string; financial_year: number; voucher_date: string; major_head: string | null; gross_total: number; basic_pay_total: number; da_total: number; hra_total: number; cla_total: number; med_total: number; trans_total: number; special_pay_total: number; washing_total: number; npp_total: number; gpf_total: number; nps_total: number; income_tax_total: number; pt_total: number; gis_total: number; net_total: number; remarks: string | null; status: string; posted_by: string | null; created_at: string }
        Insert: { id?: string; office_id: string; voucher_no: string; bill_no: string; month: string; financial_year: number; voucher_date?: string; major_head?: string | null; gross_total?: number; basic_pay_total?: number; da_total?: number; hra_total?: number; cla_total?: number; med_total?: number; trans_total?: number; special_pay_total?: number; washing_total?: number; npp_total?: number; gpf_total?: number; nps_total?: number; income_tax_total?: number; pt_total?: number; gis_total?: number; net_total?: number; remarks?: string | null; status?: string; posted_by?: string | null; created_at?: string }
        Update: { id?: string; office_id?: string; voucher_no?: string; bill_no?: string; month?: string; financial_year?: number; voucher_date?: string; major_head?: string | null; gross_total?: number; basic_pay_total?: number; da_total?: number; hra_total?: number; cla_total?: number; med_total?: number; trans_total?: number; special_pay_total?: number; washing_total?: number; npp_total?: number; gpf_total?: number; nps_total?: number; income_tax_total?: number; pt_total?: number; gis_total?: number; net_total?: number; remarks?: string | null; status?: string; posted_by?: string | null; created_at?: string }
        Relationships: []
      }
      payroll_components: {
        Row: { id: string; component_code: string | null; component_name: string; short_name: string | null; type: string; kind: string; category: string | null; sub_category: string | null; active: boolean; display_order: number; is_mandatory: boolean; is_total_field: boolean; is_system_generated: boolean; validation_rule: Record<string, unknown> | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; component_code?: string | null; component_name: string; short_name?: string | null; type: string; kind?: string; category?: string | null; sub_category?: string | null; active?: boolean; display_order?: number; is_mandatory?: boolean; is_total_field?: boolean; is_system_generated?: boolean; validation_rule?: Record<string, unknown> | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; component_code?: string | null; component_name?: string; short_name?: string | null; type?: string; kind?: string; category?: string | null; sub_category?: string | null; active?: boolean; display_order?: number; is_mandatory?: boolean; is_total_field?: boolean; is_system_generated?: boolean; validation_rule?: Record<string, unknown> | null; notes?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      payroll_component_aliases: {
        Row: { id: string; component_id: string; alias_text: string; alias_type: string; created_at: string }
        Insert: { id?: string; component_id: string; alias_text: string; alias_type?: string; created_at?: string }
        Update: { id?: string; component_id?: string; alias_text?: string; alias_type?: string; created_at?: string }
        Relationships: []
      }
      paybill_employee_components: {
        Row: { id: string; paybill_employee_id: string | null; import_id: string | null; office_id: string; sheet_type: string; hrpn: string | null; component_id: string | null; component_code: string | null; component_name: string; amount: number; source: string; created_at: string }
        Insert: { id?: string; paybill_employee_id?: string | null; import_id?: string | null; office_id: string; sheet_type?: string; hrpn?: string | null; component_id?: string | null; component_code?: string | null; component_name: string; amount?: number; source?: string; created_at?: string }
        Update: { id?: string; paybill_employee_id?: string | null; import_id?: string | null; office_id?: string; sheet_type?: string; hrpn?: string | null; component_id?: string | null; component_code?: string | null; component_name?: string; amount?: number; source?: string; created_at?: string }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: { Args: Record<string, never>; Returns: Json }
      admin_set_role: { Args: { user_id: string; new_role: string; new_office_id: string | null }; Returns: Json }
      admin_set_user_status: { Args: { user_id: string; suspended: boolean }; Returns: Json }
      admin_delete_user: { Args: { user_id: string }; Returns: Json }
      admin_list_offices: { Args: Record<string, never>; Returns: Json }
      admin_create_office: { Args: { office_name: string; office_district: string }; Returns: Json }
      admin_update_office: { Args: { office_id: string; office_name: string; office_district: string }; Returns: Json }
      admin_create_user: { Args: { user_email: string; user_password: string; user_role: string; user_office_id: string | null }; Returns: Json }
      admin_invite_user: { Args: { user_email: string; user_role: string; user_office_id: string | null }; Returns: Json }
      admin_entry_completion: { Args: Record<string, never>; Returns: Json }
      admin_office_financial_years: { Args: { target_office_id: string }; Returns: Json }
      admin_audit_list: { Args: { limit_count?: number; offset_count?: number }; Returns: Json }
      admin_log: { Args: { action: string; target_email?: string | null; details?: Json | null }; Returns: void }
      get_system_stats: { Args: Record<string, never>; Returns: Json }
      admin_office_stats: { Args: Record<string, never>; Returns: Json }
      admin_data_entry_report: { Args: Record<string, never>; Returns: Json }
      admin_import_health: { Args: Record<string, never>; Returns: Json }
      admin_office_config: { Args: { target_office_id: string }; Returns: Json }
      admin_set_office_fy: { Args: { target_office_id: string; fy: number }; Returns: Json }
      admin_component_list: { Args: Record<string, never>; Returns: Json }
      admin_component_save: { Args: { component: Json }; Returns: Json }
      admin_component_set_active: { Args: { component_id: string; active: boolean }; Returns: Json }
      admin_component_delete: { Args: { component_id: string }; Returns: Json }
      current_office_id: { Args: Record<string, never>; Returns: string }
      can_access_office: { Args: { target_office_id: string }; Returns: boolean }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      get_payroll_quarter_report: { Args: { p_office_id: string; p_financial_year: number; p_quarter: string }; Returns: Json }
      get_budget_head_report: { Args: { p_office_id: string; p_financial_year: number }; Returns: Json }
      get_party_tds_summary: { Args: { p_office_id: string; p_financial_year: number }; Returns: Json }
      get_paybill_parameter_matrix: { Args: { p_office_id: string; p_financial_year: number; p_hrpn?: string | null }; Returns: Json }
      list_gtr30_employee_master: { Args: { p_office_id: string }; Returns: Json }
      get_gtr30_employee_master: { Args: { p_office_id: string; p_month_key: string; p_bill_code: string }; Returns: Json }
      upsert_gtr30_employee_master: { Args: { p_office_id: string; p_month_key: string; p_bill_code: string; p_employees: Json }; Returns: Json }
      get_gtr30_bill_code_mappings: { Args: { p_office_id: string }; Returns: Json }
      upsert_gtr30_bill_code_mappings: { Args: { p_office_id: string; p_mappings: Json }; Returns: Json }
      list_gtr30_bills: { Args: { p_office_id: string }; Returns: Json }
      get_gtr30_bill: { Args: { p_office_id: string; p_bill_id: string }; Returns: Json }
      upsert_gtr30_bill: { Args: { p_office_id: string; p_data: Json }; Returns: Json }
      delete_gtr30_bill: { Args: { p_office_id: string; p_bill_id: string }; Returns: Json }
    }
  }
}

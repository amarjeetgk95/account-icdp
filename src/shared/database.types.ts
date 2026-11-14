import type { Json } from './json.types';

export type Database = {
  public: {
    Views: Record<string, never>,
    Tables: {
      profiles: {
        Row: { id: string; email: string; role: 'admin' | 'office'; suspended?: boolean; created_at: string; updated_at: string }
        Insert: { id: string; email: string; role?: 'admin' | 'office'; suspended?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; role?: 'admin' | 'office'; suspended?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      offices: {
        Row: { id: string; name: string; district: string | null; current_fy: number; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; district?: string | null; current_fy?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; district?: string | null; current_fy?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      office_details: {
        Row: { id: string; office_id?: string | null; office_name: string | null; subtitle: string | null; address: string | null; phone: string | null; email: string | null; gst: string | null; tan: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; office_name?: string | null; subtitle?: string | null; address?: string | null; phone?: string | null; email?: string | null; gst?: string | null; tan?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; office_name?: string | null; subtitle?: string | null; address?: string | null; phone?: string | null; email?: string | null; gst?: string | null; tan?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      budget_heads: {
        Row: { id: string; office_id?: string | null; code: string; name: string; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; code: string; name: string; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; code?: string; name?: string; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      employees: {
        Row: { id: string; hprn_no: string | null; name: string; pan: string; designation?: string | null; pay_scale?: string | null; join_date: string | null; transfer_date: string | null; budget_head_id: string | null; office_id?: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; hprn_no?: string | null; name: string; pan: string; designation?: string | null; pay_scale?: string | null; join_date?: string | null; transfer_date?: string | null; budget_head_id?: string | null; office_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; hprn_no?: string | null; name?: string; pan?: string; designation?: string | null; pay_scale?: string | null; join_date?: string | null; transfer_date?: string | null; budget_head_id?: string | null; office_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      employee_salaries: {
        // Hand-synced to 051_canonical_employee_link (adds establishment_employee_id FK); regen via db:generate-types once linked.
        // 059_three_track_recon: pay_diff / da_diff / arrears_tax split arrears out of the totals.
        // gross/da/tax stay as TOTALS. regular = (gross + da) - pay_diff - da_diff.
        Row: { id: string; employee_id: string; establishment_employee_id?: string | null; financial_year: number; month: string; gross: number; da: number; tax: number; pay_diff?: number; da_diff?: number; arrears_tax?: number; office_id?: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; employee_id: string; establishment_employee_id?: string | null; financial_year: number; month: string; gross?: number; da?: number; tax?: number; pay_diff?: number; da_diff?: number; arrears_tax?: number; office_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; employee_id?: string; establishment_employee_id?: string | null; financial_year?: number; month?: string; gross?: number; da?: number; tax?: number; pay_diff?: number; da_diff?: number; arrears_tax?: number; office_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      salary_imports: {
        Row: { id: string; office_id?: string | null; excel_filename: string; financial_year: number; total_records: number; matched_count: number; uploaded_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; excel_filename: string; financial_year: number; total_records?: number; matched_count?: number; uploaded_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; excel_filename?: string; financial_year?: number; total_records?: number; matched_count?: number; uploaded_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      employee_salary: {
        Row: { id: string; salary_import_id: string; employee_id: string | null; hprn_no: string; office_id?: string | null; name: string | null; month: string; financial_year: number; gross_salary: number; income_tax: number; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; salary_import_id: string; employee_id?: string | null; hprn_no: string; office_id?: string | null; name?: string | null; month: string; financial_year: number; gross_salary?: number; income_tax?: number; status: string; created_at?: string; updated_at?: string }
        Update: { id?: string; salary_import_id?: string; employee_id?: string | null; hprn_no?: string; office_id?: string | null; name?: string | null; month?: string; financial_year?: number; gross_salary?: number; income_tax?: number; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      parties: {
        Row: { id: string; name: string; gst_no: string | null; pan_no: string | null; office_id?: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; gst_no?: string | null; pan_no?: string | null; office_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; gst_no?: string | null; pan_no?: string | null; office_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      party_transactions: {
        Row: { id: string; party_id: string; office_id?: string | null; cpin_no: string | null; ddo_bill_no?: string | null; bill_no: string; invoice_date?: string | null; settlement_date?: string | null; transaction_date: string; amount: number; cgst: number; sgst: number; igst: number; total_gst: number; income_tax: number; created_at: string; updated_at: string }
        Insert: { id?: string; party_id: string; office_id?: string | null; cpin_no?: string | null; ddo_bill_no?: string | null; bill_no: string; invoice_date?: string | null; settlement_date?: string | null; transaction_date?: string; amount?: number; cgst?: number; sgst?: number; igst?: number; total_gst?: number; income_tax?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; party_id?: string; office_id?: string | null; cpin_no?: string | null; ddo_bill_no?: string | null; bill_no?: string; invoice_date?: string | null; settlement_date?: string | null; transaction_date?: string; amount?: number; cgst?: number; sgst?: number; igst?: number; total_gst?: number; income_tax?: number; created_at?: string; updated_at?: string }
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
      app_config: {
        Row: { id?: string; office_id?: string | null; key: string; value: string; created_at?: string; updated_at?: string }
        Insert: { id?: string; office_id?: string | null; key: string; value: string; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; key?: string; value?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_imports: {
        Row: { id: string; office_id?: string | null; bill_no: string; month: string; financial_year: number; sheet_type: string | null; bill_type?: string; paid_month?: string | null; ddo_hrpn: string | null; ddo_name: string | null; major_head: string | null; ddo_code: string | null; department: string | null; office_name: string | null; tan_no: string | null; cardex_no: string | null; total_records: number; matched_count: number; gross_total: number; uploaded_file: string | null; uploaded_by: string | null; file_hash: string | null; source_file_name: string | null; status: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; bill_no: string; month: string; financial_year: number; sheet_type?: string | null; bill_type?: string; paid_month?: string | null; ddo_hrpn?: string | null; ddo_name?: string | null; major_head?: string | null; ddo_code?: string | null; department?: string | null; office_name?: string | null; tan_no?: string | null; cardex_no?: string | null; total_records?: number; matched_count?: number; gross_total?: number; uploaded_file?: string | null; uploaded_by?: string | null; file_hash?: string | null; source_file_name?: string | null; status?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; bill_no?: string; month?: string; financial_year?: number; sheet_type?: string | null; bill_type?: string; paid_month?: string | null; ddo_hrpn?: string | null; ddo_name?: string | null; major_head?: string | null; ddo_code?: string | null; department?: string | null; office_name?: string | null; tan_no?: string | null; cardex_no?: string | null; total_records?: number; matched_count?: number; gross_total?: number; uploaded_file?: string | null; uploaded_by?: string | null; file_hash?: string | null; source_file_name?: string | null; status?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_employee_deductions: {
        Row: { id: string; import_id: string; office_id?: string | null; employee_id: string | null; hrpn: string; employee_name: string; designation: string | null; month: string; financial_year: number; bill_type?: string; basic_pay: number; da: number; hra: number; income_tax: number; prof_tax: number; hba_interest: number; gpf_regular: number; gpf_class4: number; nps_regular: number; gis_govt_fund: number; gis_govt_saving: number; other_deductions: number; total_deductions: number; net_pay: number; mapping_status: string; validation_status: string | null; mapping_message: string | null; name_mismatch: boolean; errors: unknown[]; warnings: unknown[]; validation_flags: Record<string, unknown> | null; created_at: string; updated_at: string }
        Insert: { id?: string; import_id: string; office_id?: string | null; employee_id?: string | null; hrpn: string; employee_name: string; designation?: string | null; month: string; financial_year: number; bill_type?: string; basic_pay?: number; da?: number; hra?: number; income_tax?: number; prof_tax?: number; hba_interest?: number; gpf_regular?: number; gpf_class4?: number; nps_regular?: number; gis_govt_fund?: number; gis_govt_saving?: number; other_deductions?: number; total_deductions?: number; net_pay?: number; mapping_status: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Update: { id?: string; import_id?: string; office_id?: string | null; employee_id?: string | null; hrpn?: string; employee_name?: string; designation?: string | null; month?: string; financial_year?: number; bill_type?: string; basic_pay?: number; da?: number; hra?: number; income_tax?: number; prof_tax?: number; hba_interest?: number; gpf_regular?: number; gpf_class4?: number; nps_regular?: number; gis_govt_fund?: number; gis_govt_saving?: number; other_deductions?: number; total_deductions?: number; net_pay?: number; mapping_status?: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_employee_earnings: {
        Row: { id: string; import_id: string; office_id?: string | null; employee_id: string | null; hrpn: string; employee_name: string; designation: string | null; pay_scale: string | null; ph: string | null; slo: string | null; month: string; financial_year: number; bill_type?: string; basic_pay: number; da: number; hra: number; cla: number; medical_allowance: number; transport_allowance: number; special_pay?: number; washing_allowance?: number; npp_allowance: number; gross_amount: number; mapping_status: string; validation_status: string | null; mapping_message: string | null; name_mismatch: boolean; errors: unknown[]; warnings: unknown[]; validation_flags: Record<string, unknown> | null; created_at: string; updated_at: string }
        Insert: { id?: string; import_id: string; office_id?: string | null; employee_id?: string | null; hrpn: string; employee_name: string; designation?: string | null; pay_scale?: string | null; ph?: string | null; slo?: string | null; month: string; financial_year: number; bill_type?: string; basic_pay?: number; da?: number; hra?: number; cla?: number; medical_allowance?: number; transport_allowance?: number; special_pay?: number; washing_allowance?: number; npp_allowance?: number; gross_amount?: number; mapping_status: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Update: { id?: string; import_id?: string; office_id?: string | null; employee_id?: string | null; hrpn?: string; employee_name?: string; designation?: string | null; pay_scale?: string | null; ph?: string | null; slo?: string | null; month?: string; financial_year?: number; bill_type?: string; basic_pay?: number; da?: number; hra?: number; cla?: number; medical_allowance?: number; transport_allowance?: number; special_pay?: number; washing_allowance?: number; npp_allowance?: number; gross_amount?: number; mapping_status?: string; validation_status?: string | null; mapping_message?: string | null; name_mismatch?: boolean; errors?: unknown[]; warnings?: unknown[]; validation_flags?: Record<string, unknown> | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_settings: {
        Row: { office_id?: string | null; settings_key: string; settings_value: Json; updated_at: string | null; updated_by: string | null }
        Insert: { office_id?: string | null; settings_key: string; settings_value?: Json; updated_at?: string | null; updated_by?: string | null }
        Update: { office_id?: string | null; settings_key?: string; settings_value?: Json; updated_at?: string | null; updated_by?: string | null }
        Relationships: []
      }
      paybill_vouchers: {
        Row: { id: string; office_id?: string | null; voucher_no: string; bill_no: string; month: string; financial_year: number; voucher_date: string; major_head: string | null; gross_total: number; basic_pay_total: number; da_total: number; hra_total: number; cla_total: number; med_total: number; trans_total: number; special_pay_total: number; washing_total: number; npp_total: number; gpf_total: number; nps_total: number; income_tax_total: number; pt_total: number; gis_total: number; net_total: number; remarks: string | null; status: string; posted_by: string | null; created_at: string }
        Insert: { id?: string; office_id?: string | null; voucher_no: string; bill_no: string; month: string; financial_year: number; voucher_date?: string; major_head?: string | null; gross_total?: number; basic_pay_total?: number; da_total?: number; hra_total?: number; cla_total?: number; med_total?: number; trans_total?: number; special_pay_total?: number; washing_total?: number; npp_total?: number; gpf_total?: number; nps_total?: number; income_tax_total?: number; pt_total?: number; gis_total?: number; net_total?: number; remarks?: string | null; status?: string; posted_by?: string | null; created_at?: string }
        Update: { id?: string; office_id?: string | null; voucher_no?: string; bill_no?: string; month?: string; financial_year?: number; voucher_date?: string; major_head?: string | null; gross_total?: number; basic_pay_total?: number; da_total?: number; hra_total?: number; cla_total?: number; med_total?: number; trans_total?: number; special_pay_total?: number; washing_total?: number; npp_total?: number; gpf_total?: number; nps_total?: number; income_tax_total?: number; pt_total?: number; gis_total?: number; net_total?: number; remarks?: string | null; status?: string; posted_by?: string | null; created_at?: string }
        Relationships: []
      }
      gtr30_bills: {
        Row: { id: string; office_id?: string | null; bill_register_no: string; bill_date: string | null; month_of: string | null; bill_code: string | null; status: string; gross_total: number; deductions_total: number; net_total: number; data: Json; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; bill_register_no?: string; bill_date?: string | null; month_of?: string | null; bill_code?: string | null; status?: string; gross_total?: number; deductions_total?: number; net_total?: number; data?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; bill_register_no?: string; bill_date?: string | null; month_of?: string | null; bill_code?: string | null; status?: string; gross_total?: number; deductions_total?: number; net_total?: number; data?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      gtr30_budget_heads: {
        Row: { id: string; office_id?: string | null; name: string; payload: Json; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; name: string; payload?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; name?: string; payload?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      gtr30_employee_master: {
        Row: { id: string; office_id?: string | null; month_key: string; bill_code: string; sr_no: number; hrpn_no: string | null; name: string; designation: string | null; designation_gujarati: string | null; cadre_class: string | null; pay_scale: string | null; grade_pay: string | null; pay_level_cell: string | null; ppa_no: string | null; current_pay: number; current_pay_date: string | null; quarter_address: string | null; insurance_group: string | null; insurance_type: string | null; hra_percent: number; da: number | null; transport_allowance: number; medical_allowance: number; cla_allowance: number; rent_of_building: number | null; professional_tax: number | null; gis_1981_insurance: number | null; gis_1981_savings: number | null; nps_pension: number | null; society_deduction: number | null; remarks: string | null; pay_entries: Json; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; month_key: string; bill_code: string; sr_no?: number; hrpn_no?: string | null; name: string; designation?: string | null; designation_gujarati?: string | null; cadre_class?: string | null; pay_scale?: string | null; grade_pay?: string | null; pay_level_cell?: string | null; ppa_no?: string | null; current_pay?: number; current_pay_date?: string | null; quarter_address?: string | null; insurance_group?: string | null; insurance_type?: string | null; hra_percent?: number; da?: number | null; transport_allowance?: number; medical_allowance?: number; cla_allowance?: number; rent_of_building?: number | null; professional_tax?: number | null; gis_1981_insurance?: number | null; gis_1981_savings?: number | null; nps_pension?: number | null; society_deduction?: number | null; remarks?: string | null; pay_entries?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; month_key?: string; bill_code?: string; sr_no?: number; hrpn_no?: string | null; name?: string; designation?: string | null; designation_gujarati?: string | null; cadre_class?: string | null; pay_scale?: string | null; grade_pay?: string | null; pay_level_cell?: string | null; ppa_no?: string | null; current_pay?: number; current_pay_date?: string | null; quarter_address?: string | null; insurance_group?: string | null; insurance_type?: string | null; hra_percent?: number; da?: number | null; transport_allowance?: number; medical_allowance?: number; cla_allowance?: number; rent_of_building?: number | null; professional_tax?: number | null; gis_1981_insurance?: number | null; gis_1981_savings?: number | null; nps_pension?: number | null; society_deduction?: number | null; remarks?: string | null; pay_entries?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      gtr30_bill_code_mappings: {
        Row: { id: string; office_id?: string | null; bill_code: string; description: string; payload: Json; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; bill_code: string; description?: string; payload?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; bill_code?: string; description?: string; payload?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      gtr44_bills: {
        Row: { id: string; office_id?: string | null; bill_no: string; fy: number | null; month: string | null; status: string; gross_amount: number; net_amount: number; form_data: Json; created_at: string; updated_at: string; created_by: string | null }
        Insert: { id?: string; office_id?: string | null; bill_no?: string; fy?: number | null; month?: string | null; status?: string; gross_amount?: number; net_amount?: number; form_data?: Json; created_at?: string; updated_at?: string; created_by?: string | null }
        Update: { id?: string; office_id?: string | null; bill_no?: string; fy?: number | null; month?: string | null; status?: string; gross_amount?: number; net_amount?: number; form_data?: Json; created_at?: string; updated_at?: string; created_by?: string | null }
        Relationships: []
      }
      establishment_employees: {
        Row: { id: string; office_id?: string | null; hrpn_no: string | null; name: string; name_gu?: string | null; designation: string | null; designation_gu: string | null; cadre_class: string | null; pan: string | null; pay_scale: string | null; grade_pay: string | null; pay_level: string | null; pay_cell: string | null; ppa_no: string | null; join_date: string | null; transfer_date: string | null; headquarter: string | null; budget_head_id: string | null; display_order: number | null; active: boolean; quarters_address: string | null; mobile_no: string | null; gis_group: string | null; allowances: Json; deductions: Json; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; hrpn_no?: string | null; name: string; name_gu?: string | null; designation?: string | null; designation_gu?: string | null; cadre_class?: string | null; pan?: string | null; pay_scale?: string | null; grade_pay?: string | null; pay_level?: string | null; pay_cell?: string | null; ppa_no?: string | null; join_date?: string | null; transfer_date?: string | null; headquarter?: string | null; budget_head_id?: string | null; display_order?: number | null; active?: boolean; quarters_address?: string | null; mobile_no?: string | null; gis_group?: string | null; allowances?: Json; deductions?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; hrpn_no?: string | null; name?: string; name_gu?: string | null; designation?: string | null; designation_gu?: string | null; cadre_class?: string | null; pan?: string | null; pay_scale?: string | null; grade_pay?: string | null; pay_level?: string | null; pay_cell?: string | null; ppa_no?: string | null; join_date?: string | null; transfer_date?: string | null; headquarter?: string | null; budget_head_id?: string | null; display_order?: number | null; active?: boolean; quarters_address?: string | null; mobile_no?: string | null; gis_group?: string | null; allowances?: Json; deductions?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      establishment_pay_entries: {
        Row: { id: string; employee_id: string; effective_date: string; basic_pay: number; pay_scale: string | null; level_cell: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; employee_id: string; effective_date?: string; basic_pay?: number; pay_scale?: string | null; level_cell?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; employee_id?: string; effective_date?: string; basic_pay?: number; pay_scale?: string | null; level_cell?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      establishment_posts: {
        Row: { id: string; office_id?: string | null; sr_no: number; designation: string; cadre_class: string | null; sanctioned: number; filled: number; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; sr_no?: number; designation: string; cadre_class?: string | null; sanctioned?: number; filled?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; sr_no?: number; designation?: string; cadre_class?: string | null; sanctioned?: number; filled?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      positions: {
        Row: { id: string; position_no: string; designation_title: string; designation_title_gu: string; cadre_class: string | null; pay_matrix_level: string | null; pay_scale: string | null; budget_head_id: string | number | null; status: 'FILLED' | 'VACANT' | 'UNDER_CHARGE' | 'ABOLISHED' | 'CANCELLED'; status_date: string; current_employee_id: string | null; charge_employee_id: string | null; display_order: number | null; headquarter: string | null; resolution_note: string | null; resolution_pdf_url: string | null; remarks: string | null; is_active: boolean; created_at: string; updated_at: string; gr_id: string | null }
        Insert: { id?: string; position_no: string; designation_title?: string; designation_title_gu?: string; cadre_class?: string | null; pay_matrix_level?: string | null; pay_scale?: string | null; budget_head_id?: string | number | null; status?: 'FILLED' | 'VACANT' | 'UNDER_CHARGE' | 'ABOLISHED' | 'CANCELLED'; status_date?: string; current_employee_id?: string | null; charge_employee_id?: string | null; display_order?: number | null; headquarter?: string | null; resolution_note?: string | null; resolution_pdf_url?: string | null; remarks?: string | null; is_active?: boolean; created_at?: string; updated_at?: string; gr_id?: string | null }
        Update: { id?: string; position_no?: string; designation_title?: string; designation_title_gu?: string; cadre_class?: string | null; pay_matrix_level?: string | null; pay_scale?: string | null; budget_head_id?: string | number | null; status?: 'FILLED' | 'VACANT' | 'UNDER_CHARGE' | 'ABOLISHED' | 'CANCELLED'; status_date?: string; current_employee_id?: string | null; charge_employee_id?: string | null; display_order?: number | null; headquarter?: string | null; resolution_note?: string | null; resolution_pdf_url?: string | null; remarks?: string | null; is_active?: boolean; created_at?: string; updated_at?: string; gr_id?: string | null }
        Relationships: []
      }
      position_history: {
        Row: { id: string; position_id: string; employee_id: string; assignment_type: string; start_date: string; end_date: string | null; order_no: string | null; order_date: string | null; relieve_reason: string | null; remarks: string | null; created_at: string }
        Insert: { id?: string; position_id: string; employee_id: string; assignment_type?: string; start_date?: string; end_date?: string | null; order_no?: string | null; order_date?: string | null; relieve_reason?: string | null; remarks?: string | null; created_at?: string }
        Update: { id?: string; position_id?: string; employee_id?: string; assignment_type?: string; start_date?: string; end_date?: string | null; order_no?: string | null; order_date?: string | null; relieve_reason?: string | null; remarks?: string | null; created_at?: string }
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
        Row: { id: string; paybill_employee_id: string | null; import_id: string | null; office_id?: string | null; sheet_type: string; hrpn: string | null; component_id: string | null; component_code: string | null; component_name: string; amount: number; source: string; created_at: string }
        Insert: { id?: string; paybill_employee_id?: string | null; import_id?: string | null; office_id?: string | null; sheet_type?: string; hrpn?: string | null; component_id?: string | null; component_code?: string | null; component_name: string; amount?: number; source?: string; created_at?: string }
        Update: { id?: string; paybill_employee_id?: string | null; import_id?: string | null; office_id?: string | null; sheet_type?: string; hrpn?: string | null; component_id?: string | null; component_code?: string | null; component_name: string; amount?: number; source?: string; created_at?: string }
        Relationships: []
      }
      paybill_manual_adjustments: {
        Row: { id: string; office_id?: string | null; hrpn: string; param_key: string; param_label: string; month: string; financial_year: number; amount: number; group_type: string; reason: string | null; created_by: string | null; updated_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; hrpn: string; param_key: string; param_label: string; month: string; financial_year: number; amount?: number; group_type?: string; reason?: string | null; created_by?: string | null; updated_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; hrpn?: string; param_key?: string; param_label?: string; month?: string; financial_year?: number; amount?: number; group_type?: string; reason?: string | null; created_by?: string | null; updated_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      paybill_import_audits: {
        Row: { id: string; import_id: string; office_id?: string | null; action: string; actor_id: string | null; details: Json; created_at: string }
        Insert: { id?: string; import_id: string; office_id?: string | null; action: string; actor_id?: string | null; details?: Json; created_at?: string }
        Update: { id?: string; import_id?: string; office_id?: string | null; action?: string; actor_id?: string | null; details?: Json; created_at?: string }
        Relationships: []
      }
      tax_recon_sync_log: {
        Row: { id: string; financial_year: number; quarter: string; month: string; employee_id: string; hrpn: string; old_gross: number | null; old_da: number | null; old_tax: number | null; new_gross: number | null; new_da: number | null; new_tax: number | null; new_pay_diff: number; new_da_diff: number; actor_id: string | null; created_at: string }
        Insert: { id?: string; financial_year: number; quarter: string; month: string; employee_id: string; hrpn: string; old_gross?: number | null; old_da?: number | null; old_tax?: number | null; new_gross?: number | null; new_da?: number | null; new_tax?: number | null; new_pay_diff?: number; new_da_diff?: number; actor_id?: string | null; created_at?: string }
        Update: { id?: string; financial_year?: number; quarter?: string; month?: string; employee_id?: string; hrpn?: string; old_gross?: number | null; old_da?: number | null; old_tax?: number | null; new_gross?: number | null; new_da?: number | null; new_tax?: number | null; new_pay_diff?: number; new_da_diff?: number; actor_id?: string | null; created_at?: string }
        Relationships: []
      }
      form16_certificates: {
        Row: { id: string; office_id?: string | null; employee_id: string | null; hrpn: string; financial_year: number; assessment_year: number; certificate_number: string; certificate_last_updated: string; status: string; tax_regime: string; employer_snapshot: Record<string, unknown>; employee_snapshot: Record<string, unknown>; signatory_snapshot: Record<string, unknown>; part_a: Record<string, unknown>; part_b: Record<string, unknown>; computed_totals: Record<string, unknown> | null; issued_at: string | null; issued_by: string | null; voided_at: string | null; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; office_id?: string | null; employee_id?: string | null; hrpn: string; financial_year: number; assessment_year?: number; certificate_number?: string; certificate_last_updated?: string; status?: string; tax_regime?: string; employer_snapshot?: Record<string, unknown>; employee_snapshot?: Record<string, unknown>; signatory_snapshot?: Record<string, unknown>; part_a?: Record<string, unknown>; part_b?: Record<string, unknown>; computed_totals?: Record<string, unknown> | null; issued_at?: string | null; issued_by?: string | null; voided_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; office_id?: string | null; employee_id?: string | null; hrpn?: string; financial_year?: number; assessment_year?: number; certificate_number?: string; certificate_last_updated?: string; status?: string; tax_regime?: string; employer_snapshot?: Record<string, unknown>; employee_snapshot?: Record<string, unknown>; signatory_snapshot?: Record<string, unknown>; part_a?: Record<string, unknown>; part_b?: Record<string, unknown>; computed_totals?: Record<string, unknown> | null; issued_at?: string | null; issued_by?: string | null; voided_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      form16_audit_log: {
        Row: { id: string; certificate_id: string; office_id?: string | null; action: string; actor_id: string | null; details: Json; created_at: string }
        Insert: { id?: string; certificate_id: string; office_id?: string | null; action: string; actor_id?: string | null; details?: Json; created_at?: string }
        Update: { id?: string; certificate_id?: string; office_id?: string | null; action?: string; actor_id?: string | null; details?: Json; created_at?: string }
        Relationships: []
      }
      document_types: {
        Row: { id: string; name_en: string; name_gu: string; display_order: number; is_active: boolean; created_at: string }
        Insert: { id: string; name_en: string; name_gu: string; display_order?: number; is_active?: boolean; created_at?: string }
        Update: { id?: string; name_en?: string; name_gu?: string; display_order?: number; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      gr_departments: {
        Row: { id: string; name: string; code: string | null; description: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; code?: string | null; description?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; code?: string | null; description?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      gr_categories: {
        Row: { id: string; name_en: string; name_gu: string; display_order: number; is_active: boolean; created_at: string }
        Insert: { id: string; name_en: string; name_gu: string; display_order?: number; is_active?: boolean; created_at?: string }
        Update: { id?: string; name_en?: string; name_gu?: string; display_order?: number; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      gr_subcategories: {
        Row: { id: string; category_id: string; name_en: string; name_gu: string; display_order: number; is_active: boolean; created_at: string }
        Insert: { id: string; category_id: string; name_en: string; name_gu: string; display_order?: number; is_active?: boolean; created_at?: string }
        Update: { id?: string; category_id?: string; name_en?: string; name_gu?: string; display_order?: number; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      gr_repository: {
        Row: { id: string; gr_number: string; title: string; document_type_id: string | null; department_id: string | null; category_id: string | null; subcategory_id: string | null; department_name: string | null; category_name: string | null; subcategory_name: string | null; issue_date: string | null; issue_year?: number | null; description: string | null; keywords: string[] | null; file_name: string; storage_path: string; file_size: number; mime_type: string; visibility: 'public' | 'internal' | 'private' | 'restricted'; owner_user_id: string | null; status: 'active' | 'superseded' | 'cancelled' | 'archived'; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; gr_number: string; title: string; document_type_id?: string | null; department_id?: string | null; category_id?: string | null; subcategory_id?: string | null; department_name?: string | null; category_name?: string | null; subcategory_name?: string | null; issue_date?: string | null; description?: string | null; keywords?: string[] | null; file_name: string; storage_path: string; file_size?: number; mime_type?: string; visibility?: 'public' | 'internal' | 'private' | 'restricted'; owner_user_id?: string | null; status?: 'active' | 'superseded' | 'cancelled' | 'archived'; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; gr_number?: string; title?: string; document_type_id?: string | null; department_id?: string | null; category_id?: string | null; subcategory_id?: string | null; department_name?: string | null; category_name?: string | null; subcategory_name?: string | null; issue_date?: string | null; description?: string | null; keywords?: string[] | null; file_name?: string; storage_path?: string; file_size?: number; mime_type?: string; visibility?: 'public' | 'internal' | 'private' | 'restricted'; owner_user_id?: string | null; status?: 'active' | 'superseded' | 'cancelled' | 'archived'; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      gr_document_relations: {
        Row: { id: string; source_document_id: string; target_document_id: string; relation_type: string; created_by: string | null; created_at: string }
        Insert: { id?: string; source_document_id: string; target_document_id: string; relation_type: string; created_by?: string | null; created_at?: string }
        Update: { id?: string; source_document_id?: string; target_document_id?: string; relation_type?: string; created_by?: string | null; created_at?: string }
        Relationships: []
      }
      gr_repository_access: {
        Row: { id: string; gr_id: string; user_id: string; created_by: string | null; created_at: string }
        Insert: { id?: string; gr_id: string; user_id: string; created_by?: string | null; created_at?: string }
        Update: { id?: string; gr_id?: string; user_id?: string; created_by?: string | null; created_at?: string }
        Relationships: []
      }
      gr_audit_logs: {
        Row: { id: number | string; gr_id: string | null; gr_number: string | null; user_id: string | null; user_email: string | null; user_role: string | null; action: string; previous_visibility: string | null; new_visibility: string | null; details: Json; created_at: string }
        Insert: { id?: number | string; gr_id?: string | null; gr_number?: string | null; user_id?: string | null; user_email?: string | null; user_role?: string | null; action: string; previous_visibility?: string | null; new_visibility?: string | null; details?: Json; created_at?: string }
        Update: { id?: number | string; gr_id?: string | null; gr_number?: string | null; user_id?: string | null; user_email?: string | null; user_role?: string | null; action?: string; previous_visibility?: string | null; new_visibility?: string | null; details?: Json; created_at?: string }
        Relationships: []
      }
    }
    Functions: {
      get_payroll_quarter_report: { Args: { p_office_id?: string | number; p_financial_year: number; p_quarter: string }; Returns: Json }
      get_budget_head_report: { Args: { p_office_id?: string | number; p_financial_year: number }; Returns: Json }
      get_party_tds_summary: { Args: { p_office_id?: string | number; p_financial_year: number }; Returns: Json }
      get_paybill_parameter_matrix: { Args: { p_office_id?: string | number; p_financial_year: number; p_hrpn?: string | null }; Returns: Json }
      list_gtr30_employee_master: { Args: { p_office_id?: string | number }; Returns: Json }
      get_gtr30_employee_master: { Args: { p_office_id?: string | number; p_month_key: string; p_bill_code: string }; Returns: Json }
      upsert_gtr30_employee_master: { Args: { p_office_id?: string | number; p_month_key: string; p_bill_code: string; p_employees: Json }; Returns: Json }
      get_gtr30_bill_code_mappings: { Args: { p_office_id?: string | number }; Returns: Json }
      upsert_gtr30_bill_code_mappings: { Args: { p_office_id?: string | number; p_mappings: Json }; Returns: Json }
      get_gtr30_budget_heads: { Args: { p_office_id?: string | number }; Returns: Json }
      upsert_gtr30_budget_heads: { Args: { p_office_id?: string | number; p_heads: Json }; Returns: Json }
      list_gtr30_bills: { Args: { p_office_id?: string | number }; Returns: Json }
      get_gtr30_bill: { Args: { p_office_id?: string | number; p_bill_id: string }; Returns: Json }
      upsert_gtr30_bill: { Args: { p_office_id?: string | number; p_data: Json }; Returns: Json }
      delete_gtr30_bill: { Args: { p_office_id?: string | number; p_bill_id: string }; Returns: Json }
      list_gtr44_bills: { Args: { p_office_id?: string | number }; Returns: Json }
      get_gtr44_bill: { Args: { p_office_id?: string | number; p_bill_id: string }; Returns: Json }
      upsert_gtr44_bill: { Args: { p_office_id?: string | number; p_data: Json }; Returns: Json }
      delete_gtr44_bill: { Args: { p_office_id?: string | number; p_bill_id: string }; Returns: Json }
      list_establishment: { Args: { p_office_id?: string | number }; Returns: Json }
      upsert_establishment_employees: { Args: { p_office_id?: string | number; p_employees: Json }; Returns: Json }
      list_establishment_posts: { Args: { p_office_id?: string | number }; Returns: Json }
      upsert_establishment_posts: { Args: { p_office_id?: string | number; p_posts: Json }; Returns: Json }
      backfill_establishment_from_gtr30: { Args: { p_office_id?: string | number }; Returns: Json }
      backfill_establishment_from_payroll: { Args: { p_office_id?: string | number }; Returns: Json }
      log_paybill_import_audit: { Args: { p_import_id: string; p_action: string; p_details?: Json }; Returns: string }
      gr_log_action: { Args: { p_gr_id?: string | null; p_gr_number?: string | null; p_action: string; p_prev_visibility?: string | null; p_new_visibility?: string | null; p_details?: Json | null }; Returns: void }
    }
  }
}

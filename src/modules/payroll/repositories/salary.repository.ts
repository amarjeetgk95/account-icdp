import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import type { Database } from '@/shared/database.types';

type SalaryImport = Database['public']['Tables']['salary_imports']['Row'];
type SalaryImportInsert = Database['public']['Tables']['salary_imports']['Insert'];
type EmployeeSalary = Database['public']['Tables']['employee_salary']['Row'];
type EmployeeSalaryInsert = Database['public']['Tables']['employee_salary']['Insert'];

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

function getUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

export const salaryRepository = {
  async listImports(financialYear?: number): Promise<SalaryImport[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    let q = supabase.from('salary_imports').select('*').eq('office_id', officeId).order('created_at', { ascending: false });
    if (financialYear != null) q = q.eq('financial_year', financialYear);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async createImport(payload: {
    excelFilename: string;
    financialYear: number;
    totalRecords: number;
    matchedCount: number;
  }): Promise<SalaryImport> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    const insert: SalaryImportInsert = {
      office_id: officeId,
      excel_filename: payload.excelFilename,
      financial_year: payload.financialYear,
      total_records: payload.totalRecords,
      matched_count: payload.matchedCount,
      uploaded_by: getUserId(),
    };
    const { data, error } = await supabase.from('salary_imports').insert(insert).select().single();
    if (error) throw error;
    return data;
  },

  async upsertSalaries(rows: Omit<EmployeeSalaryInsert, 'office_id'>[]): Promise<void> {
    if (rows.length === 0) return;
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    const payload: EmployeeSalaryInsert[] = rows.map((r) => ({ ...r, office_id: officeId }));
    const { error } = await supabase.from('employee_salary').insert(payload);
    if (error) throw error;
  },

  async getByHrpn(
    hrpn: string,
    month: string,
    financialYear: number
  ): Promise<Pick<EmployeeSalary, 'gross_salary' | 'income_tax' | 'month' | 'financial_year'> | null> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    const { data, error } = await supabase
      .from('employee_salary')
      .select('gross_salary,income_tax,month,financial_year')
      .eq('office_id', officeId)
      .eq('hprn_no', hrpn)
      .eq('month', month)
      .eq('financial_year', financialYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async listLatestByOffice(): Promise<EmployeeSalary[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    const { data, error } = await supabase
      .from('employee_salary')
      .select('*')
      .eq('office_id', officeId)
      .in('status', ['matched', 'unmatched'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    const seen = new Map<string, EmployeeSalary>();
    for (const row of data || []) {
      const key = `${row.hprn_no}|${row.month}|${row.financial_year}`;
      if (!seen.has(key)) seen.set(key, row);
    }
    return Array.from(seen.values());
  },
};

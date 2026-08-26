import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';
import type { Database } from '@/shared/database.types';
import type { ClassifiedSalaryRecord } from '../validation/salary.schema';

type SalaryImport = Database['public']['Tables']['salary_imports']['Row'];
type SalaryImportInsert = Database['public']['Tables']['salary_imports']['Insert'];
type EmployeeSalary = Database['public']['Tables']['employee_salary']['Row'];
type EmployeeSalaryInsert = Database['public']['Tables']['employee_salary']['Insert'];

function getUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

export const salaryRepository = {
  async createImport(payload: {
    excelFilename: string;
    financialYear: number;
    totalRecords: number;
    matchedCount: number;
  }): Promise<SalaryImport> {
    const officeId = requireOfficeId();
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
    const officeId = requireOfficeId();
    const payload: EmployeeSalaryInsert[] = rows.map((r) => ({ ...r, office_id: officeId }));
    const { error } = await supabase
      .from('employee_salary')
      .upsert(payload, { onConflict: 'salary_import_id,hprn_no,month' });
    if (error) throw error;
  },

  async upsertToPayrollGrid(records: ClassifiedSalaryRecord[]): Promise<number> {
    const officeId = requireOfficeId();
    const rows = records
      .filter((r) => r.status === 'matched' && r.employeeId)
      .map((r) => ({
        employee_id: r.employeeId as string,
        office_id: officeId,
        financial_year: r.financialYear,
        month: r.month,
        gross: Math.round(r.grossSalary * 100) / 100,
        da: 0,
        tax: Math.round(r.incomeTax * 100) / 100,
      }));
    if (rows.length === 0) return 0;

    const { error } = await supabase
      .from('employee_salaries')
      .upsert(rows, { onConflict: 'employee_id,financial_year,month' });
    if (error) throw error;
    return rows.length;
  },

  async listLatestByOffice(): Promise<EmployeeSalary[]> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');
    let q = supabase
      .from('employee_salary')
      .select('*');
    if (!scope.all) q = q.eq('office_id', scope.officeId!);
    q = q
      .in('status', ['matched', 'unmatched'])
      .order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    const seen = new Map<string, EmployeeSalary>();
    for (const row of data || []) {
      const key = `${row.hprn_no}|${row.month}|${row.financial_year}`;
      if (!seen.has(key)) seen.set(key, row);
    }
    return Array.from(seen.values());
  },

  async getEmployeeLookupDetails(searchQuery: string, financialYear: number, selectedHrpn?: string) {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');
    const officeId = scope.officeId!;

    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) {
      return {
        matchingEmployees: [],
        employeeInfo: null,
        salaries: [],
        quarters: {
          Q1: { gross: 0, daAndOther: 0, totalGross: 0, tax: 0, net: 0, monthsWithData: 0 },
          Q2: { gross: 0, daAndOther: 0, totalGross: 0, tax: 0, net: 0, monthsWithData: 0 },
          Q3: { gross: 0, daAndOther: 0, totalGross: 0, tax: 0, net: 0, monthsWithData: 0 },
          Q4: { gross: 0, daAndOther: 0, totalGross: 0, tax: 0, net: 0, monthsWithData: 0 },
        },
        totals: { gross: 0, daAndOther: 0, totalGross: 0, tax: 0, net: 0, monthsWithData: 0 },
      };
    }

    // 1. Fetch matching employees from master table (by Name, HRPN, or PAN)
    let qMaster = supabase
      .from('employees')
      .select('id, name, pan, hprn_no, join_date, transfer_date, budget_head_id');
    if (!scope.all) qMaster = qMaster.eq('office_id', officeId);
    const { data: masterList, error: masterError } = await qMaster.or(
      `name.ilike.%${cleanQuery}%,hprn_no.ilike.%${cleanQuery}%,pan.ilike.%${cleanQuery}%`
    );
    if (masterError) throw masterError;

    // 2. Fetch matching imported salary records (by Name or HRPN)
    let qImported = supabase
      .from('employee_salary')
      .select('*');
    if (!scope.all) qImported = qImported.eq('office_id', officeId);
    const { data: importedList, error: importedError } = await qImported
      .eq('financial_year', financialYear)
      .or(`name.ilike.%${cleanQuery}%,hprn_no.ilike.%${cleanQuery}%`);
    if (importedError) throw importedError;

    // Build deduplicated matching employees list
    const matchingMap = new Map<string, { id?: string; name: string; hprnNo: string; pan?: string }>();

    for (const emp of masterList || []) {
      const hrpn = (emp.hprn_no || emp.id).toUpperCase();
      matchingMap.set(hrpn, {
        id: emp.id,
        name: emp.name,
        hprnNo: emp.hprn_no || '',
        pan: emp.pan || undefined,
      });
    }

    for (const imp of importedList || []) {
      const hrpn = (imp.hprn_no || '').toUpperCase();
      if (hrpn && !matchingMap.has(hrpn)) {
        matchingMap.set(hrpn, {
          name: imp.name || 'Employee',
          hprnNo: imp.hprn_no,
        });
      }
    }

    const matchingEmployees = Array.from(matchingMap.values());

    // 3. Determine target employee/HRPN to display details for
    let targetHrpn = selectedHrpn ? selectedHrpn.trim().toUpperCase() : '';
    if (!targetHrpn && matchingEmployees.length > 0) {
      // Find exact HRPN match or exact Name match, else take first
      const exactH = matchingEmployees.find(
        (m) => m.hprnNo.toLowerCase() === cleanQuery.toLowerCase()
      );
      const exactN = matchingEmployees.find(
        (m) => m.name.toLowerCase() === cleanQuery.toLowerCase()
      );
      targetHrpn = (exactH || exactN || matchingEmployees[0]).hprnNo;
    }

    if (!targetHrpn) {
      targetHrpn = cleanQuery;
    }

    // 4. Fetch details for target employee
    let emp = (masterList || []).find(
      (m) => (m.hprn_no || '').toUpperCase() === targetHrpn
    ) || null;

    if (!emp) {
      let qEmpFetch = supabase
        .from('employees')
        .select('id, name, pan, hprn_no, join_date, transfer_date, budget_head_id');
      if (!scope.all) qEmpFetch = qEmpFetch.eq('office_id', officeId);
      const { data: empFetch, error: empFetchError } = await qEmpFetch
        .ilike('hprn_no', targetHrpn)
        .maybeSingle();
      if (empFetchError) throw empFetchError;
      if (empFetch) emp = empFetch;
    }

    let budgetHeadCode: string | null = null;
    let budgetHeadName: string | null = null;

    if (emp?.budget_head_id) {
      const { data: bh, error: bhError } = await supabase
        .from('budget_heads')
        .select('code, name')
        .eq('id', emp.budget_head_id)
        .maybeSingle();
      if (bhError) throw bhError;
      if (bh) {
        budgetHeadCode = bh.code;
        budgetHeadName = bh.name;
      }
    }

    // Manual salaries
    let manualSalaries: Array<{ month: string; gross: number; da: number; tax: number }> = [];
    if (emp?.id) {
      let qManual = supabase
        .from('employee_salaries')
        .select('month, gross, da, tax');
      if (!scope.all) qManual = qManual.eq('office_id', officeId);
      const { data: ms, error: msError } = await qManual
        .eq('employee_id', emp.id)
        .eq('financial_year', financialYear);
      if (msError) throw msError;
      manualSalaries = ms || [];
    }

    // Imported salaries for target employee
    let qTargetImported = supabase
      .from('employee_salary')
      .select('*');
    if (!scope.all) qTargetImported = qTargetImported.eq('office_id', officeId);
    const { data: targetImportedSalaries, error: targetImportedError } = await qTargetImported
      .ilike('hprn_no', targetHrpn)
      .eq('financial_year', financialYear)
      .order('created_at', { ascending: false });
    if (targetImportedError) throw targetImportedError;

    // Build lookup maps
    const manualMap = new Map<string, { gross: number; da: number; tax: number }>();
    for (const ms of manualSalaries) {
      manualMap.set(ms.month, {
        gross: Number(ms.gross) || 0,
        da: Number(ms.da) || 0,
        tax: Number(ms.tax) || 0,
      });
    }

    const importedMap = new Map<string, EmployeeSalary>();
    for (const imp of targetImportedSalaries || []) {
      if (!importedMap.has(imp.month)) {
        importedMap.set(imp.month, imp);
      }
    }

    // Construct employeeInfo
    const firstImported = targetImportedSalaries && targetImportedSalaries.length > 0 ? targetImportedSalaries[0] : null;
    const empName = emp?.name || firstImported?.name || 'Employee';

    const employeeInfo = (emp || firstImported)
      ? {
          id: emp?.id,
          name: empName,
          pan: emp?.pan,
          hprnNo: targetHrpn || emp?.hprn_no || cleanQuery,
          joinDate: emp?.join_date || null,
          transferDate: emp?.transfer_date || null,
          budgetHeadCode,
          budgetHeadName,
          isRegisteredInMaster: !!emp,
        }
      : null;

    const monthList = [
      'April', 'May', 'June',
      'July', 'August', 'September',
      'October', 'November', 'December',
      'January', 'February', 'March',
    ];

    const salaries = monthList.map((month) => {
      const manual = manualMap.get(month);
      const imported = importedMap.get(month);

      let gross = 0;
      let daAndOther = 0;
      let tax = 0;
      let status = 'none';

      if (manual) {
        gross = manual.gross;
        daAndOther = manual.da;
        tax = manual.tax;
        status = 'matched';
      } else if (imported) {
        gross = Number(imported.gross_salary) || 0;
        daAndOther = 0;
        tax = Number(imported.income_tax) || 0;
        status = imported.status || 'imported';
      }

      const totalGross = gross + daAndOther;
      const net = totalGross - tax;

      return {
        month,
        gross,
        daAndOther,
        totalGross,
        tax,
        net,
        status,
        createdAt: imported?.created_at,
      };
    });

    const quarterMonths = {
      Q1: ['April', 'May', 'June'],
      Q2: ['July', 'August', 'September'],
      Q3: ['October', 'November', 'December'],
      Q4: ['January', 'February', 'March'],
    };

    const emptyQuarter = () => ({
      gross: 0,
      daAndOther: 0,
      totalGross: 0,
      tax: 0,
      net: 0,
      monthsWithData: 0,
    });

    const quarters = {
      Q1: emptyQuarter(),
      Q2: emptyQuarter(),
      Q3: emptyQuarter(),
      Q4: emptyQuarter(),
    };

    const totals = emptyQuarter();

    const round = (n: number) => Math.round(n * 100) / 100;

    for (const row of salaries) {
      const qKey = (quarterMonths.Q1.includes(row.month)
        ? 'Q1'
        : quarterMonths.Q2.includes(row.month)
        ? 'Q2'
        : quarterMonths.Q3.includes(row.month)
        ? 'Q3'
        : 'Q4') as 'Q1' | 'Q2' | 'Q3' | 'Q4';

      const q = quarters[qKey];
      const hasData = row.status !== 'none' || row.totalGross > 0 || row.tax > 0;

      if (hasData) {
        q.monthsWithData++;
        totals.monthsWithData++;
      }

      q.gross = round(q.gross + row.gross);
      q.daAndOther = round(q.daAndOther + row.daAndOther);
      q.totalGross = round(q.totalGross + row.totalGross);
      q.tax = round(q.tax + row.tax);
      q.net = round(q.net + row.net);

      totals.gross = round(totals.gross + row.gross);
      totals.daAndOther = round(totals.daAndOther + row.daAndOther);
      totals.totalGross = round(totals.totalGross + row.totalGross);
      totals.tax = round(totals.tax + row.tax);
      totals.net = round(totals.net + row.net);
    }

    return {
      matchingEmployees,
      employeeInfo,
      salaries,
      quarters,
      totals,
    };
  },
};


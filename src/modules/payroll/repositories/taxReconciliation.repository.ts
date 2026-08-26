import { supabase } from '@/core/supabase/client';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';
import { paybillRepository } from '@/modules/paybill/repositories/paybill.repository';
import type { SyncPaybillToPayrollItem } from '../types/reconciliation';

export interface RawEmployeeDbRow {
  id: string;
  name: string;
  pan: string | null;
  hprn_no: string | null;
  designation: string | null;
  join_date: string | null;
  transfer_date: string | null;
}

export interface RawSalaryDbRow {
  employee_id: string;
  month: string;
  gross: number | string | null;
  da: number | string | null;
  tax: number | string | null;
}

export interface RawPaybillDeductionRow {
  id: string;
  hrpn: string;
  employee_name: string;
  employee_id: string | null;
  designation: string | null;
  month: string;
  financial_year: number;
  income_tax: number | string | null;
  prof_tax: number | string | null;
  total_deductions: number | string | null;
  net_pay: number | string | null;
}

export interface RawPaybillEarningRow {
  id: string;
  hrpn: string;
  employee_name: string;
  employee_id: string | null;
  designation: string | null;
  month: string;
  financial_year: number;
  gross_amount: number | string | null;
  basic_pay: number | string | null;
  da: number | string | null;
}

export interface QuarterRawData {
  quarter: string;
  fy: number;
  months: string[];
  employees: RawEmployeeDbRow[];
  salaries: RawSalaryDbRow[];
  paybillDeductions: RawPaybillDeductionRow[];
  paybillEarnings: RawPaybillEarningRow[];
}

export const QUARTER_MONTH_MAP: Record<string, string[]> = {
  Q1: ['April', 'May', 'June'],
  Q2: ['July', 'August', 'September'],
  Q3: ['October', 'November', 'December'],
  Q4: ['January', 'February', 'March'],
};

export const taxReconciliationRepository = {
  async getQuarterRawData(
    quarter: string,
    fy: number,
    officeId?: string
  ): Promise<QuarterRawData> {
    const scope = getOfficeScope(officeId);
    if (!scope.all && !scope.officeId) {
      throw new Error('No office selected');
    }

    const months = QUARTER_MONTH_MAP[quarter] || QUARTER_MONTH_MAP.Q1;

    // 1. Fetch Payroll Employees
    let qEmployees = supabase
      .from('employees')
      .select('id, name, pan, hprn_no, designation, join_date, transfer_date');
    if (!scope.all) {
      qEmployees = qEmployees.eq('office_id', scope.officeId!);
    }
    const { data: employeesData, error: empErr } = await qEmployees.order('id');
    if (empErr) console.warn('[TaxReconciliationRepo] Failed to fetch employees:', empErr);
    const employees: RawEmployeeDbRow[] = (employeesData || []) as RawEmployeeDbRow[];

    // 2. Fetch Payroll Salaries for the quarter months
    let qSalaries = supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy)
      .in('month', months);
    if (!scope.all) {
      qSalaries = qSalaries.eq('office_id', scope.officeId!);
    }
    const { data: salariesData, error: salErr } = await qSalaries;
    if (salErr) console.warn('[TaxReconciliationRepo] Failed to fetch salaries:', salErr);
    const salaries: RawSalaryDbRow[] = (salariesData || []) as RawSalaryDbRow[];

    // 3. Fetch Paybill Deductions (IT code 9510)
    let paybillDeductions: RawPaybillDeductionRow[] = [];
    try {
      let qDeductions = supabase
        .from('paybill_employee_deductions')
        .select('id, hrpn, employee_name, employee_id, designation, month, financial_year, income_tax, prof_tax, total_deductions, net_pay')
        .eq('financial_year', fy)
        .in('month', months);
      if (!scope.all) {
        qDeductions = qDeductions.eq('office_id', scope.officeId!);
      }
      const { data: dedData, error: dedErr } = await qDeductions;
      if (dedErr) throw dedErr;
      if (dedData) {
        paybillDeductions = dedData as RawPaybillDeductionRow[];
      }
    } catch (err) {
      console.warn('[TaxReconciliationRepo] Falling back to paybillRepository for deductions:', err);
      const fallbackList = await paybillRepository.listDeductions({ financialYear: fy });
      paybillDeductions = fallbackList
        .filter((d) => months.includes(d.month))
        .map((d) => ({
          id: d.id,
          hrpn: d.hrpn,
          employee_name: d.employeeName,
          employee_id: d.employeeId,
          designation: d.designation,
          month: d.month,
          financial_year: d.financialYear,
          income_tax: d.incomeTax,
          prof_tax: d.profTax,
          total_deductions: d.totalDeductions,
          net_pay: d.netPay,
        }));
    }

    // 4. Fetch Paybill Earnings
    let paybillEarnings: RawPaybillEarningRow[] = [];
    try {
      let qEarnings = supabase
        .from('paybill_employee_earnings')
        .select('id, hrpn, employee_name, employee_id, designation, month, financial_year, gross_amount, basic_pay, da')
        .eq('financial_year', fy)
        .in('month', months);
      if (!scope.all) {
        qEarnings = qEarnings.eq('office_id', scope.officeId!);
      }
      const { data: earnData, error: earnErr } = await qEarnings;
      if (earnErr) throw earnErr;
      if (earnData) {
        paybillEarnings = earnData as RawPaybillEarningRow[];
      }
    } catch (err) {
      console.warn('[TaxReconciliationRepo] Falling back to paybillRepository for earnings:', err);
      const fallbackList = await paybillRepository.listEarnings({ financialYear: fy });
      paybillEarnings = fallbackList
        .filter((e) => months.includes(e.month))
        .map((e) => ({
          id: e.id,
          hrpn: e.hrpn,
          employee_name: e.employeeName,
          employee_id: e.employeeId,
          designation: e.designation,
          month: e.month,
          financial_year: e.financialYear,
          gross_amount: e.grossAmount,
          basic_pay: e.basicPay,
          da: e.da,
        }));
    }

    return {
      quarter,
      fy,
      months,
      employees,
      salaries,
      paybillDeductions,
      paybillEarnings,
    };
  },

  async syncPaybillValuesToPayroll(
    records: SyncPaybillToPayrollItem[],
    fy: number,
    officeId?: string
  ): Promise<number> {
    if (!records || records.length === 0) return 0;
    const targetOfficeId = officeId || requireOfficeId();

    const payload = records.map((r) => ({
      employee_id: r.employeeId,
      office_id: targetOfficeId,
      financial_year: fy,
      month: r.month,
      gross: Math.round(r.gross * 100) / 100,
      da: Math.round(r.da * 100) / 100,
      tax: Math.round(r.tax * 100) / 100,
    }));

    const { error } = await supabase
      .from('employee_salaries')
      .upsert(payload, { onConflict: 'employee_id,financial_year,month' });

    if (error) throw error;
    return payload.length;
  },
};

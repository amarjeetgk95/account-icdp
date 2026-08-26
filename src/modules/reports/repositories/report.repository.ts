import { supabase } from '@/core/supabase/client';
import { getOfficeScope } from '@/shared/utilities/office';
import { MONTHS } from '@/shared/constants';
import type { YearlyReport, YearlyEmployeeRecord, YearlyVendorRecord } from '../types';

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export const reportRepository = {
  async getFinancialYears(): Promise<number[]> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    let qYears = supabase.from('employee_salaries').select('financial_year');
    if (!scope.all) qYears = qYears.eq('office_id', scope.officeId!);
    const { data, error } = await qYears;

    if (error) throw error;

    const years = new Set<number>();
    (data || []).forEach((row) => years.add(row.financial_year));

    let qTxYears = supabase.from('party_transactions').select('transaction_date');
    if (!scope.all) qTxYears = qTxYears.eq('office_id', scope.officeId!);
    const { data: txRows, error: txError } = await qTxYears;

    if (txError) throw txError;

    (txRows || []).forEach((row) => {
      const d = new Date(row.transaction_date);
      const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      years.add(fy);
    });

    if (years.size === 0) {
      const now = new Date();
      const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      years.add(fy);
    }

    return Array.from(years).sort((a, b) => b - a);
  },

  async getYearlyReport(fy: number): Promise<YearlyReport> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    let qEmployees = supabase
      .from('employees')
      .select('id, name, pan');
    if (!scope.all) qEmployees = qEmployees.eq('office_id', scope.officeId!);
    const { data: employees, error: empError } = await qEmployees.order('id');
    if (empError) throw empError;

    let qSalaries = supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy);
    if (!scope.all) qSalaries = qSalaries.eq('office_id', scope.officeId!);
    const { data: salaries, error: salError } = await qSalaries;
    if (salError) throw salError;

    let qTx = supabase
      .from('party_transactions')
      .select('transaction_date, amount, cgst, sgst, igst, total_gst, income_tax, parties(id, name, gst_no, pan_no)');
    if (!scope.all) qTx = qTx.eq('office_id', scope.officeId!);
    const { data: transactions, error: txError } = await qTx;
    if (txError) throw txError;

    type SalaryRecord = { employee_id: string; month: string; gross: number; da: number; tax: number };
    const salMap: Record<string, Record<string, SalaryRecord>> = {};
    ((salaries || []) as SalaryRecord[]).forEach((s) => {
      if (!salMap[s.employee_id]) salMap[s.employee_id] = {};
      salMap[s.employee_id][s.month] = s;
    });

    const employeeRecords: YearlyEmployeeRecord[] = (employees || [])
      .filter((emp) => emp.name && emp.pan)
      .map((emp) => {
        const months = salMap[emp.id] || {};
        const rec: YearlyEmployeeRecord = {
          name: emp.name,
          pan: emp.pan,
          months: 0,
          gross: 0,
          da: 0,
          tax: 0,
          qGross: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          qTax: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
        };

        MONTHS.forEach((m, i) => {
          const s = months[m];
          if (!s) return;
          rec.months++;
          rec.gross += money(s.gross);
          rec.da += money(s.da);
          rec.tax += money(s.tax);
          const q = i < 3 ? 'Q1' : i < 6 ? 'Q2' : i < 9 ? 'Q3' : 'Q4';
          rec.qGross[q] += money(s.gross);
          rec.qTax[q] += money(s.tax);
        });

        return rec;
      })
      .filter((e) => e.months > 0);

    type ReportTxJoined = {
      transaction_date: string;
      amount: number;
      cgst: number;
      sgst: number;
      igst: number;
      total_gst: number;
      income_tax: number;
      parties: { id: string; name: string; gst_no: string | null; pan_no: string | null } | null;
    };

    const vendorMap: Record<string, YearlyVendorRecord> = {};
    ((transactions || []) as unknown as ReportTxJoined[]).forEach((tx) => {
      const partyName = tx.parties?.name;
      if (!partyName) return;

      const txYear = new Date(tx.transaction_date).getFullYear();
      const txMonth = new Date(tx.transaction_date).getMonth();
      const txFy = txMonth >= 3 ? txYear : txYear - 1;
      if (txFy !== fy) return;

      if (!vendorMap[partyName]) {
        vendorMap[partyName] = {
          name: partyName,
          gstNo: tx.parties?.gst_no || '-',
          panNo: tx.parties?.pan_no || '-',
          billCount: 0,
          totalAmount: 0,
          totalIncomeTax: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalGst: 0,
        };
      }

      const vendor = vendorMap[partyName];
      vendor.billCount++;
      vendor.totalAmount += money(tx.amount);
      vendor.totalIncomeTax += money(tx.income_tax);
      vendor.totalCgst += money(tx.cgst);
      vendor.totalSgst += money(tx.sgst);
      vendor.totalIgst += money(tx.igst);
      vendor.totalGst += money(tx.total_gst);
    });

    const vendors = Object.values(vendorMap);

    const summary = {
      totalEmployees: employeeRecords.length,
      totalGross: money(employeeRecords.reduce((s: number, e: YearlyEmployeeRecord) => s + e.gross, 0)),
      totalDA: money(employeeRecords.reduce((s: number, e: YearlyEmployeeRecord) => s + e.da, 0)),
      totalTax: money(employeeRecords.reduce((s: number, e: YearlyEmployeeRecord) => s + e.tax, 0)),
      totalVendors: vendors.length,
      totalVendorAmount: money(vendors.reduce((s, v) => s + v.totalAmount, 0)),
      totalIncomeTax: money(vendors.reduce((s, v) => s + v.totalIncomeTax, 0)),
      totalCgst: money(vendors.reduce((s, v) => s + v.totalCgst, 0)),
      totalSgst: money(vendors.reduce((s, v) => s + v.totalSgst, 0)),
      totalIgst: money(vendors.reduce((s, v) => s + v.totalIgst, 0)),
      totalGst: money(vendors.reduce((s, v) => s + v.totalGst, 0)),
    };

    return {
      fy,
      fyLabel: `${fy}-${String(fy + 1).slice(-2)}`,
      ayLabel: `${fy + 1}-${String(fy + 2).slice(-2)}`,
      employees: employeeRecords,
      vendors,
      summary,
    };
  },
};

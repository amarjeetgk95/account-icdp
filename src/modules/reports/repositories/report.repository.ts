import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import { MONTHS } from '@/shared/constants';
import type { YearlyReport, YearlyEmployeeRecord, YearlyVendorRecord } from '../types';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type Salary = Database['public']['Tables']['employee_salaries']['Row'];

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export const reportRepository = {
  async getFinancialYears(): Promise<number[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data, error } = await (supabase as any)
      .from('employee_salaries')
      .select('financial_year')
      .eq('office_id', officeId);

    if (error) throw error;

    const years = new Set<number>();
    (data || []).forEach((row: any) => years.add(row.financial_year));

    const { data: txRows, error: txError } = await (supabase as any)
      .from('party_transactions')
      .select('transaction_date')
      .eq('office_id', officeId);

    if (txError) throw txError;

    (txRows || []).forEach((row: any) => {
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
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data: employees } = await (supabase as any)
      .from('employees')
      .select('id, name, pan')
      .eq('office_id', officeId)
      .order('id');

    const { data: salaries } = await (supabase as any)
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy)
      .eq('office_id', officeId);

    const { data: transactions } = await (supabase as any)
      .from('party_transactions')
      .select('transaction_date, amount, cgst, sgst, igst, total_gst, income_tax, parties(id, name, gst_no, pan_no)')
      .eq('office_id', officeId);

    const salMap: Record<string, Record<string, Salary>> = {};
    (salaries || []).forEach((s: Salary) => {
      if (!salMap[s.employee_id]) salMap[s.employee_id] = {};
      salMap[s.employee_id][s.month] = s;
    });

    const employeeRecords: YearlyEmployeeRecord[] = (employees || [])
      .filter((emp: Employee) => emp.name && emp.pan)
      .map((emp: Employee) => {
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
      .filter((e: YearlyEmployeeRecord) => e.months > 0);

    const vendorMap: Record<string, YearlyVendorRecord> = {};
    (transactions || []).forEach((tx: any) => {
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

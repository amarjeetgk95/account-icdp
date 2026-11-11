import { supabase } from '@/core/supabase/client';
import { MONTHS } from '@/shared/constants';
import { currentFinancialYear } from '@/shared/utilities/date';
import type { YearlyReport, YearlyEmployeeRecord, YearlyVendorRecord } from '../types';
import type { GSTReport, GSTReportRow, IncomeTaxReport, IncomeTaxReportRow } from '@/modules/parties/types';

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export const reportRepository = {
  async getFinancialYears(): Promise<number[]> {
    const { data, error } = await supabase.from('employee_salaries').select('financial_year');

    if (error) throw error;

    const years = new Set<number>();
    (data || []).forEach((row) => years.add(row.financial_year));

    const { data: txRows, error: txError } = await supabase.from('party_transactions').select('transaction_date');

    if (txError) throw txError;

    (txRows || []).forEach((row) => {
      // transaction_date is YYYY-MM-DD; parse via string to avoid UTC->local shift.
      const s = String(row.transaction_date).slice(0, 10);
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(5, 7));
      if (!Number.isFinite(y) || !Number.isFinite(m)) return;
      years.add(m >= 4 ? y : y - 1);
    });

    if (years.size === 0) {
      years.add(currentFinancialYear());
    }

    return Array.from(years).sort((a, b) => b - a);
  },

  async getYearlyReport(fy: number): Promise<YearlyReport> {
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, pan')
      .order('id');
    if (empError) throw empError;

    const { data: salaries, error: salError } = await supabase
      .from('employee_salaries')
      .select('employee_id, month, gross, da, tax')
      .eq('financial_year', fy);
    if (salError) throw salError;

    const { data: transactions, error: txError } = await supabase
      .from('party_transactions')
      .select('id, transaction_date, ddo_bill_no, bill_no, cpin_no, invoice_date, settlement_date, amount, cgst, sgst, igst, total_gst, income_tax, parties(id, name, gst_no, pan_no)')
      .gte('transaction_date', `${fy}-04-01`)
      .lt('transaction_date', `${fy + 1}-04-01`)
      .order('transaction_date')
      .order('id');
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
      id: string;
      transaction_date: string;
      ddo_bill_no: string | null;
      bill_no: string;
      cpin_no: string | null;
      invoice_date: string | null;
      settlement_date: string | null;
      amount: number;
      cgst: number;
      sgst: number;
      igst: number;
      total_gst: number;
      income_tax: number;
      parties: { id: string; name: string; gst_no: string | null; pan_no: string | null } | null;
    };

    const gstRows: GSTReportRow[] = [];
    const itRows: IncomeTaxReportRow[] = [];

    const vendorMap: Record<string, YearlyVendorRecord> = {};
    ((transactions || []) as unknown as ReportTxJoined[]).forEach((tx) => {
      const partyName = tx.parties?.name;
      if (!partyName) return;

      // DB already FY-bounded; string compare is the safety net (no local-TZ shift).
      const d = tx.transaction_date.slice(0, 10);
      if (d < `${fy}-04-01` || d >= `${fy + 1}-04-01`) return;

      const settleDate = tx.settlement_date || tx.transaction_date.slice(0, 10);

      gstRows.push({
        partyName,
        gstNo: tx.parties?.gst_no || '-',
        cpinNo: tx.cpin_no || '-',
        ddoBillNo: tx.ddo_bill_no || '-',
        billNo: tx.bill_no,
        invoiceDate: tx.invoice_date || settleDate,
        settlementDate: settleDate,
        date: settleDate,
        amount: money(tx.amount),
        cgst: money(tx.cgst),
        sgst: money(tx.sgst),
        igst: money(tx.igst),
        totalGst: money(tx.total_gst),
      });

      itRows.push({
        partyName,
        panNo: tx.parties?.pan_no || '-',
        ddoBillNo: tx.ddo_bill_no || '-',
        billNo: tx.bill_no,
        invoiceDate: tx.invoice_date || settleDate,
        settlementDate: settleDate,
        date: settleDate,
        amount: money(tx.amount),
        incomeTax: money(tx.income_tax),
      });

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

    const gstReport: GSTReport = {
      fy,
      quarter: 'Yearly',
      rows: gstRows,
      totals: {
        amount: money(gstRows.reduce((s, r) => s + r.amount, 0)),
        cgst: money(gstRows.reduce((s, r) => s + r.cgst, 0)),
        sgst: money(gstRows.reduce((s, r) => s + r.sgst, 0)),
        igst: money(gstRows.reduce((s, r) => s + r.igst, 0)),
        totalGst: money(gstRows.reduce((s, r) => s + r.totalGst, 0)),
      },
    };

    const itReport: IncomeTaxReport = {
      fy,
      quarter: 'Yearly',
      rows: itRows,
      totals: {
        amount: money(itRows.reduce((s, r) => s + r.amount, 0)),
        incomeTax: money(itRows.reduce((s, r) => s + r.incomeTax, 0)),
      },
    };

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
      gstReport,
      itReport,
      summary,
    };
  },
};

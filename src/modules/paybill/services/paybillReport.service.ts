import { paybillRepository } from '../repositories/paybill.repository';
import type {
  PayBillAllowanceMatrixReport,
  PayBillMonthlyEmployeeMatrixReport,
  PayBillMonthlyMatrixColumn,
} from '../types';
import { downloadCsv } from '@/shared/utilities';

export const PAYBILL_EARNING_COLUMNS: PayBillMonthlyMatrixColumn[] = [
  { key: 'basicPay', label: 'Basic Pay', group: 'EARNING' },
  { key: 'da', label: 'DA', group: 'EARNING' },
  { key: 'hra', label: 'HRA', group: 'EARNING' },
  { key: 'cla', label: 'CLA', group: 'EARNING' },
  { key: 'medicalAllowance', label: 'Med Allow', group: 'EARNING' },
  { key: 'transportAllowance', label: 'Trans Allow', group: 'EARNING' },
  { key: 'specialPay', label: 'Special Pay', group: 'EARNING' },
  { key: 'washingAllowance', label: 'Washing Allowance', group: 'EARNING' },
  { key: 'nppAllowance', label: 'NPP Allowance', group: 'EARNING' },
  { key: 'grossAmount', label: 'Gross Amt', group: 'EARNING' },
];

export const PAYBILL_DEDUCTION_COLUMNS: PayBillMonthlyMatrixColumn[] = [
  { key: 'incomeTax', label: 'Income Tax', group: 'DEDUCTION' },
  { key: 'profTax', label: 'Prof Tax', group: 'DEDUCTION' },
  { key: 'hbaInterest', label: 'HBA Interest', group: 'DEDUCTION' },
  { key: 'gpfRegular', label: 'GPF Reg', group: 'DEDUCTION' },
  { key: 'gpfClass4', label: 'GPF Class 4', group: 'DEDUCTION' },
  { key: 'npsRegular', label: 'NPS Reg', group: 'DEDUCTION' },
  { key: 'gisGovtFund', label: 'GIS Govt Fund', group: 'DEDUCTION' },
  { key: 'gisGovtSaving', label: 'GIS Govt Saving', group: 'DEDUCTION' },
  { key: 'otherDeductions', label: 'Other Deductions', group: 'DEDUCTION' },
  { key: 'totalDeductions', label: 'Total Deductions', group: 'DEDUCTION' },
  { key: 'netPay', label: 'Net Pay', group: 'DEDUCTION' },
];

import { establishmentService } from '@/modules/establishment/services/establishment.service';
import { servesInMonth } from '@/modules/establishment/types';
import type { EstablishmentEmployee } from '@/modules/establishment/types';

class PayBillReportService {
  /**
   * Fetch matrix report for a financial year and optional employee HRPN
   */
  async getMatrixReport(
    financialYear: number,
    hrpn?: string | null
  ): Promise<PayBillAllowanceMatrixReport> {
    return paybillRepository.getAllowanceMatrix(financialYear, hrpn);
  }

  /**
   * Monthly employee parameter matrix: one row per employee, one column per
   * allowance parameter (earning side followed by deduction side).
   * Dynamically filters Establishment employees based on joining and transfer dates for this specific month.
   */
  async getMonthlyEmployeeMatrix(
    financialYear: number,
    month: string
  ): Promise<PayBillMonthlyEmployeeMatrixReport> {
    let estEmployees: EstablishmentEmployee[] = [];
    try {
      estEmployees = await establishmentService.syncEmployees();
      if (!estEmployees || estEmployees.length === 0) estEmployees = establishmentService.loadEmployees();
    } catch {
      estEmployees = establishmentService.loadEmployees();
    }

    const [earningsList, deductionsList] = await Promise.all([
      paybillRepository.listEarnings({ financialYear, month }),
      paybillRepository.listDeductions({ financialYear, month }),
    ]);

    const columns = [...PAYBILL_EARNING_COLUMNS, ...PAYBILL_DEDUCTION_COLUMNS];
    const emptyRow: Record<string, number> = Object.fromEntries(
      columns.map((c) => [c.key, 0])
    );

    const map = new Map<string, PayBillMonthlyEmployeeMatrixReport['rows'][number]>();
    const upsert = (
      hrpn: string,
      employeeName: string,
      designation: string | null,
      values: Record<string, number>
    ) => {
      const existing = map.get(hrpn);
      if (existing) {
        Object.assign(existing.values, values);
      } else {
        map.set(hrpn, {
          hrpn,
          employeeName,
          designation,
          values: { ...emptyRow, ...values },
        });
      }
    };

    // 1. First, populate establishment employees who served in this specific month
    for (const emp of estEmployees) {
      const hrpn = (emp.hrpnNo || '').trim();
      if (!hrpn) continue;
      if (!servesInMonth(emp, financialYear, month)) continue;
      upsert(hrpn, emp.name, emp.designation || null, {});
    }

    // 2. Overlay earnings data for this month
    for (const e of earningsList) {
      upsert(e.hrpn, e.employeeName, e.designation, {
        basicPay: e.basicPay,
        da: e.da,
        hra: e.hra,
        cla: e.cla,
        medicalAllowance: e.medicalAllowance,
        transportAllowance: e.transportAllowance,
        specialPay: e.specialPay || 0,
        washingAllowance: e.washingAllowance || 0,
        nppAllowance: e.nppAllowance,
        grossAmount: e.grossAmount,
      });
    }

    // 3. Overlay deductions data for this month
    for (const d of deductionsList) {
      upsert(d.hrpn, d.employeeName, d.designation, {
        incomeTax: d.incomeTax,
        profTax: d.profTax,
        hbaInterest: d.hbaInterest,
        gpfRegular: d.gpfRegular,
        gpfClass4: d.gpfClass4,
        npsRegular: d.npsRegular,
        gisGovtFund: d.gisGovtFund,
        gisGovtSaving: d.gisGovtSaving,
        otherDeductions: d.otherDeductions || 0,
        totalDeductions: d.totalDeductions,
        netPay: d.netPay,
      });
    }

    const rows = Array.from(map.values()).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName)
    );

    const totals: Record<string, number> = { ...emptyRow };
    for (const row of rows) {
      for (const col of columns) {
        totals[col.key] += row.values[col.key] || 0;
      }
    }

    return { month, financialYear, columns, rows, totals };
  }

  /**
   * Export the monthly employee parameter matrix to CSV
   */
  exportMonthlyMatrixCsv(report: PayBillMonthlyEmployeeMatrixReport): void {
    const headers = [
      'HRPN',
      'Employee Name',
      'Designation',
      ...report.columns.map((c) => `${c.group}: ${c.label}`),
    ];

    const rows = report.rows.map((r) => [
      r.hrpn,
      r.employeeName,
      r.designation || '',
      ...report.columns.map((c) => r.values[c.key] || 0),
    ]);

    rows.push([
      '',
      'Total',
      '',
      ...report.columns.map((c) => report.totals[c.key] || 0),
    ]);

    downloadCsv(
      `PayBill_Matrix_${report.month}_FY${report.financialYear}.csv`,
      headers,
      rows
    );
  }
}

export const paybillReportService = new PayBillReportService();

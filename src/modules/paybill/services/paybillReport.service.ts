import { paybillRepository } from '../repositories/paybill.repository';
import type { PayBillAllowanceMatrixReport } from '../types';
import { downloadCsv } from '@/shared/utilities';

export class PayBillReportService {
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
   * Export matrix report to CSV
   */
  exportToCsv(report: PayBillAllowanceMatrixReport): void {
    const headers = [
      'Allowance Parameter',
      ...report.monthLabels,
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Total (FY)',
    ];

    const rows = report.rows.map((r) => [
      r.parameter,
      r.months.April,
      r.months.May,
      r.months.June,
      r.months.July,
      r.months.August,
      r.months.September,
      r.months.October,
      r.months.November,
      r.months.December,
      r.months.January,
      r.months.February,
      r.months.March,
      r.q1,
      r.q2,
      r.q3,
      r.q4,
      r.total,
    ]);

    const titlePrefix = report.hrpn
      ? `PayBill_Matrix_${report.hrpn}_FY${report.financialYear}`
      : `PayBill_Allowance_Matrix_FY${report.financialYear}`;

    downloadCsv(`${titlePrefix}.csv`, headers, rows);
  }
}

export const paybillReportService = new PayBillReportService();

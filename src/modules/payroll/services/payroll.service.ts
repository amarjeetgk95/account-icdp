import { payrollRepository } from '../repositories/payroll.repository';
import { MONTHS } from '@/shared/constants';
import type { EmployeeRosterItem, MonthOption, QuarterReport, BudgetHeadReport } from '../types';

export class PayrollService {
  getMonthOptions(financialYear: number): MonthOption[] {
    const y1 = String(financialYear).slice(-2);
    const y2 = String(financialYear + 1).slice(-2);

    return [
      { value: 'April', label: `March-${y1} paid in April-${y1}` },
      { value: 'May', label: `April-${y1} paid in May-${y1}` },
      { value: 'June', label: `May-${y1} paid in June-${y1}` },
      { value: 'July', label: `June-${y1} paid in July-${y1}` },
      { value: 'August', label: `July-${y1} paid in August-${y1}` },
      { value: 'September', label: `August-${y1} paid in September-${y1}` },
      { value: 'October', label: `September-${y1} paid in October-${y1}` },
      { value: 'November', label: `October-${y1} paid in November-${y1}` },
      { value: 'December', label: `November-${y1} paid in December-${y1}` },
      { value: 'January', label: `December-${y1} paid in January-${y2}` },
      { value: 'February', label: `January-${y2} paid in February-${y2}` },
      { value: 'March', label: `February-${y2} paid in March-${y2}` },
    ];
  }

  getEntryMonth(): string {
    const now = new Date();
    const monthIdx = (now.getMonth() - 3 + 12) % 12;
    const entryIdx = (monthIdx - 1 + 12) % 12;
    return MONTHS[entryIdx];
  }

  async getRoster(month: string, fy: number): Promise<EmployeeRosterItem[]> {
    return payrollRepository.getRosterForMonth(month, fy);
  }

  async saveBulkSalary(
    month: string,
    entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>,
    fy: number
  ): Promise<string> {
    this.validateEntries(entries);
    return payrollRepository.saveBulkSalary(month, entries, fy);
  }

  async getPreviousMonthData(
    month: string,
    fy: number
  ): Promise<Array<{ employeeId: string; gross: number; da: number; tax: number }>> {
    const monthIdx = MONTHS.indexOf(month);
    if (monthIdx === -1) throw new Error('Invalid month');
    const prevMonth = MONTHS[(monthIdx - 1 + 12) % 12];
    return payrollRepository.getPreviousMonthSalaries(prevMonth, fy);
  }

  async clearMonth(month: string, fy: number): Promise<number> {
    return payrollRepository.clearMonthSalary(month, fy);
  }

  async getEmployeePreviousMonthData(employeeId: string, month: string, fy: number): Promise<{ gross: number; da: number; tax: number } | null> {
    const monthIdx = MONTHS.indexOf(month);
    if (monthIdx === -1) throw new Error('Invalid month');
    const prevMonth = MONTHS[(monthIdx - 1 + 12) % 12];
    return payrollRepository.getEmployeeSalaryForMonth(employeeId, prevMonth, fy);
  }

  async getQuarterReport(quarter: string, fy: number, officeId?: string): Promise<QuarterReport> {
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      throw new Error('Invalid quarter');
    }
    return payrollRepository.getQuarterReport(quarter, fy, officeId);
  }

  async getBudgetHeadReport(fy: number, officeId?: string): Promise<BudgetHeadReport> {
    return payrollRepository.getBudgetHeadReport(fy, officeId);
  }

  private validateEntries(
    entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>
  ): void {
    for (const entry of entries) {
      if (!entry.employeeId) throw new Error('Employee ID is required');
      if (entry.gross < 0 || entry.da < 0 || entry.tax < 0) {
        throw new Error('Salary values cannot be negative');
      }
    }
  }
}

export const payrollService = new PayrollService();

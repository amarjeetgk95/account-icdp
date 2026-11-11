import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxReconciliationService } from './taxReconciliation.service';
import { taxReconciliationRepository, type QuarterRawData } from '../repositories/taxReconciliation.repository';

vi.mock('../repositories/taxReconciliation.repository', () => ({
  QUARTER_MONTH_MAP: {
    Q1: ['April', 'May', 'June'],
    Q2: ['July', 'August', 'September'],
    Q3: ['October', 'November', 'December'],
    Q4: ['January', 'February', 'March'],
  },
  taxReconciliationRepository: {
    getQuarterRawData: vi.fn(),
    syncPaybillValuesToPayroll: vi.fn(),
  },
}));

describe('TaxReconciliationService', () => {
  const service = new TaxReconciliationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMonthLabelsForQuarter', () => {
    it('returns 3 month labels for Q1 with work and paid labels', () => {
      const labels = service.getMonthLabelsForQuarter('Q1', 2025);
      expect(labels).toHaveLength(3);
      expect(labels[0]).toEqual({ work: 'Mar-25', paid: 'Apr-25' });
      expect(labels[1]).toEqual({ work: 'Apr-25', paid: 'May-25' });
      expect(labels[2]).toEqual({ work: 'May-25', paid: 'Jun-25' });
    });

    it('returns correct month labels across year boundary for Q4', () => {
      const labels = service.getMonthLabelsForQuarter('Q4', 2025);
      expect(labels).toHaveLength(3);
      expect(labels[0]).toEqual({ work: 'Dec-25', paid: 'Jan-26' });
      expect(labels[1]).toEqual({ work: 'Jan-26', paid: 'Feb-26' });
      expect(labels[2]).toEqual({ work: 'Feb-26', paid: 'Mar-26' });
    });
  });

  describe('getQuarterTaxReconciliation', () => {
    it('throws error for invalid quarter', async () => {
      await expect(service.getQuarterTaxReconciliation('Q5', 2025)).rejects.toThrow('Invalid quarter');
    });

    it('calls repository for valid quarter', async () => {
      const mockRawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: [],
        salaries: [],
        paybillDeductions: [],
        paybillEarnings: [],
      };
      (taxReconciliationRepository.getQuarterRawData as ReturnType<typeof vi.fn>).mockResolvedValue(mockRawData);

      const result = await service.getQuarterTaxReconciliation('Q1', 2025);
      expect(taxReconciliationRepository.getQuarterRawData).toHaveBeenCalledWith('Q1', 2025);
      expect(result.quarter).toBe('Q1');
      expect(result.fy).toBe(2025);
    });
  });

  describe('processReconciliationData', () => {
    it('identifies MATCHED status when Paybill and Payroll IT and Gross match', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: [
          {
            id: 'emp-1',
            name: 'Ramesh Patel',
            pan: 'ABCDE1234F',
            hprn_no: '2001001',
            designation: 'Accountant',
            join_date: null,
            transfer_date: null,
          },
        ],
        salaries: [
          { employee_id: 'emp-1', month: 'April', gross: 60000, da: 0, tax: 5000 },
          { employee_id: 'emp-1', month: 'May', gross: 60000, da: 0, tax: 5000 },
          { employee_id: 'emp-1', month: 'June', gross: 60000, da: 0, tax: 5000 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'April', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd3', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'June', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'April', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e3', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'June', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };

      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      const row = report.rows[0];
      expect(row.status).toBe('MATCHED');
      expect(row.quarterTaxDiff).toBe(0);
      expect(row.quarterGrossDiff).toBe(0);
      expect(row.canSync).toBe(false);
      expect(report.summary.matchedCount).toBe(1);
      expect(report.summary.taxMismatchCount).toBe(0);
    });

    it('identifies TAX_MISMATCH when Paybill IT differs from Payroll IT', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: [
          {
            id: 'emp-1',
            name: 'Ramesh Patel',
            pan: 'ABCDE1234F',
            hprn_no: '2001001',
            designation: 'Accountant',
            join_date: null,
            transfer_date: null,
          },
        ],
        salaries: [
          { employee_id: 'emp-1', month: 'April', gross: 60000, da: 0, tax: 4000 }, // Tax is 4000 vs 5000
          { employee_id: 'emp-1', month: 'May', gross: 60000, da: 0, tax: 5000 },
          { employee_id: 'emp-1', month: 'June', gross: 60000, da: 0, tax: 5000 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'April', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd3', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'June', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'April', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e3', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'June', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };

      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      const row = report.rows[0];
      expect(row.status).toBe('TAX_MISMATCH');
      expect(row.quarterTaxDiff).toBe(1000);
      expect(row.canSync).toBe(true);
      expect(report.summary.taxMismatchCount).toBe(1);
      expect(report.summary.netTaxDiff).toBe(1000);
    });

    it('identifies MISSING_IN_PAYROLL when Paybill has entries but Payroll has none', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: [
          {
            id: 'emp-1',
            name: 'Sunita Sharma',
            pan: 'BCDEF2345G',
            hprn_no: '2001002',
            designation: 'Officer',
            join_date: null,
            transfer_date: null,
          },
        ],
        salaries: [], // No salary in payroll
        paybillDeductions: [
          { id: 'd1', hrpn: '2001002', employee_name: 'Sunita Sharma', employee_id: 'emp-1', designation: 'Officer', month: 'April', financial_year: 2025, income_tax: 3000, prof_tax: 200, total_deductions: 3200, net_pay: 46800 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001002', employee_name: 'Sunita Sharma', employee_id: 'emp-1', designation: 'Officer', month: 'April', financial_year: 2025, gross_amount: 50000, basic_pay: 40000, da: 10000 },
        ],
      };

      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      const row = report.rows[0];
      expect(row.status).toBe('MISSING_IN_PAYROLL');
      expect(row.quarterPaybillTax).toBe(3000);
      expect(row.quarterPayrollTax).toBe(0);
      expect(row.canSync).toBe(true);
      expect(report.summary.missingInPayrollCount).toBe(1);
    });

    it('ignores paybill-only HRPNs — roster comes strictly from employee master', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: [], // empty master
        salaries: [],
        paybillDeductions: [
          { id: 'd1', hrpn: '9999999', employee_name: 'Unknown Person', employee_id: null, designation: null, month: 'April', financial_year: 2025, income_tax: 2000, prof_tax: 200, total_deductions: 2200, net_pay: 27800 },
        ],
        paybillEarnings: [],
      };

      const report = service.processReconciliationData(rawData);
      // Employee-master-only roster: paybill-only HRPN produces no row.
      expect(report.rows).toHaveLength(0);
      expect(report.summary.unmappedHrpnCount).toBe(0);
      expect(report.summary.totalEmployees).toBe(0);
    });

    it('preserves all 50 registered employees even with missing, blank, or duplicate placeholder HRPNs', () => {
      const mockEmployees = Array.from({ length: 50 }, (_, i) => ({
        id: `emp-${i + 1}`,
        name: `Employee ${i + 1}`,
        pan: `ABCDE123${String(i).padStart(2, '0')}F`,
        hprn_no: i < 46 ? `20010${String(i).padStart(2, '0')}` : (i === 46 ? '0' : i === 47 ? '-' : i === 48 ? 'NA' : null),
        designation: 'Officer',
        join_date: null,
        transfer_date: null,
      }));

      const mockSalaries = mockEmployees.flatMap((emp) => [
        { employee_id: emp.id, month: 'April', gross: 40000, da: 8000, tax: 2000 },
        { employee_id: emp.id, month: 'May', gross: 40000, da: 8000, tax: 2000 },
        { employee_id: emp.id, month: 'June', gross: 40000, da: 8000, tax: 2000 },
      ]);

      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: mockEmployees,
        salaries: mockSalaries,
        paybillDeductions: [],
        paybillEarnings: [],
      };

      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(50);
      expect(report.summary.totalEmployees).toBe(50);
      // Since no paybill data was provided, all 50 should be cleanly identified as MISSING_IN_PAYBILL
      expect(report.summary.missingInPaybillCount).toBe(50);
    });

    it('aligns Paybill WORK months with Payroll PAYMENT months index-wise (Q1: Mar/Apr/May <=> Apr/May/Jun)', () => {
      // Regression test for the systemic "PB Tax = 0, 44/55 mismatches" bug:
      // Paybill stores WORK month (Mar), Payroll stores PAYMENT month (Apr for
      // March work). Reconciliation must compare paid[i] <=> work[i].
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2026,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          {
            id: 'emp-1',
            name: 'Dr D C Chaudhari',
            pan: 'ABCDE1234F',
            hprn_no: '20013826',
            designation: 'Deputy Director',
            join_date: null,
            transfer_date: null,
          },
        ],
        salaries: [
          // Payroll keyed by PAYMENT month: April = March work paid in April, etc.
          { employee_id: 'emp-1', month: 'April', gross: 219210, da: 0, tax: 0 },
          { employee_id: 'emp-1', month: 'May', gross: 219210, da: 0, tax: 30043 },
          { employee_id: 'emp-1', month: 'June', gross: 231510, da: 0, tax: 30000 },
        ],
        paybillDeductions: [
          // Paybill keyed by WORK month: March = March work, etc.
          { id: 'd1', hrpn: '20013826', employee_name: 'Dr D C Chaudhari', employee_id: 'emp-1', designation: 'Deputy Director', month: 'March', financial_year: 2026, income_tax: 0, prof_tax: 200, total_deductions: 200, net_pay: 219010 },
          { id: 'd2', hrpn: '20013826', employee_name: 'Dr D C Chaudhari', employee_id: 'emp-1', designation: 'Deputy Director', month: 'April', financial_year: 2026, income_tax: 30043, prof_tax: 200, total_deductions: 30243, net_pay: 188967 },
          { id: 'd3', hrpn: '20013826', employee_name: 'Dr D C Chaudhari', employee_id: 'emp-1', designation: 'Deputy Director', month: 'May', financial_year: 2026, income_tax: 30000, prof_tax: 200, total_deductions: 30200, net_pay: 201310 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '20013826', employee_name: 'Dr D C Chaudhari', employee_id: 'emp-1', designation: 'Deputy Director', month: 'March', financial_year: 2026, gross_amount: 219210, basic_pay: 209210, da: 10000 },
          { id: 'e2', hrpn: '20013826', employee_name: 'Dr D C Chaudhari', employee_id: 'emp-1', designation: 'Deputy Director', month: 'April', financial_year: 2026, gross_amount: 219210, basic_pay: 209210, da: 10000 },
          { id: 'e3', hrpn: '20013826', employee_name: 'Dr D C Chaudhari', employee_id: 'emp-1', designation: 'Deputy Director', month: 'May', financial_year: 2026, gross_amount: 231510, basic_pay: 221510, da: 10000 },
        ],
      };

      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      const row = report.rows[0];
      // April(paid Mar-work) <=> March(work): 219210 vs 219210, 0 vs 0
      expect(row.months[0].paybillGross).toBe(219210);
      expect(row.months[0].payrollGross).toBe(219210);
      expect(row.months[0].paybillTax).toBe(0);
      expect(row.months[0].payrollTax).toBe(0);
      // May(paid Apr-work) <=> April(work): 219210 vs 219210, 30043 vs 30043
      expect(row.months[1].paybillTax).toBe(30043);
      expect(row.months[1].payrollTax).toBe(30043);
      // June(paid May-work) <=> May(work): 231510 vs 231510
      expect(row.months[2].paybillGross).toBe(231510);
      expect(row.months[2].payrollGross).toBe(231510);
      expect(row.status).toBe('MATCHED');
      expect(row.canSync).toBe(false);
    });

    it('matches month names case-insensitively', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'emp-1', name: 'Ramesh Patel', pan: 'ABCDE1234F', hprn_no: '2001001', designation: 'Accountant', join_date: null, transfer_date: null },
        ],
        salaries: [
          { employee_id: 'emp-1', month: 'april', gross: 60000, da: 0, tax: 5000 },
          { employee_id: 'emp-1', month: 'MAY', gross: 60000, da: 0, tax: 5000 },
          { employee_id: 'emp-1', month: ' June ', gross: 60000, da: 0, tax: 5000 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'MARCH', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'april', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd3', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'March', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'April', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e3', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows[0].status).toBe('MATCHED');
    });

    it('accumulates income tax and gross across multiple bills in the same month without overwriting', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'emp-1', name: 'Dr. Dineshbhai Patel', pan: 'ABCDE1234F', hprn_no: '2001001', designation: 'Doctor', join_date: null, transfer_date: null },
        ],
        salaries: [
          { employee_id: 'emp-1', month: 'April', gross: 60000, da: 0, tax: 30043 },
        ],
        paybillDeductions: [
          // Bill 1 (Regular): Tax 30043
          { id: 'd1', hrpn: '2001001', employee_name: 'Dr. Dineshbhai Patel', employee_id: 'emp-1', designation: 'Doctor', month: 'March', financial_year: 2025, income_tax: 30043, prof_tax: 200, total_deductions: 30243, net_pay: 29757 },
          // Bill 2 (Supplementary): Tax 0 (must NOT overwrite 30043 to 0!)
          { id: 'd2', hrpn: '2001001', employee_name: 'Dr. Dineshbhai Patel', employee_id: 'emp-1', designation: 'Doctor', month: 'March', financial_year: 2025, income_tax: 0, prof_tax: 0, total_deductions: 0, net_pay: 5000 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001001', employee_name: 'Dr. Dineshbhai Patel', employee_id: 'emp-1', designation: 'Doctor', month: 'March', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].months[0].paybillTax).toBe(30043);
      expect(report.rows[0].quarterPaybillTax).toBe(30043);
      expect(report.rows[0].status).toBe('MATCHED');
    });

    it('deduplicates duplicate employee master records and merges their salaries', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          // Duplicate records in employees table for same HRPN
          { id: 'emp-1', name: 'Ramesh Patel', pan: 'ABCDE1234F', hprn_no: '2001001', designation: 'Accountant', join_date: null, transfer_date: null },
          { id: 'emp-dup', name: 'Ramesh Patel (Dup)', pan: 'ABCDE1234F', hprn_no: '2001001', designation: 'Accountant', join_date: null, transfer_date: null },
        ],
        salaries: [
          // Salary entered under emp-1 for April
          { employee_id: 'emp-1', month: 'April', gross: 60000, da: 0, tax: 5000 },
          // Salary entered under emp-dup for May
          { employee_id: 'emp-dup', month: 'May', gross: 60000, da: 0, tax: 5000 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: null, designation: 'Accountant', month: 'March', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: null, designation: 'Accountant', month: 'April', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: null, designation: 'Accountant', month: 'March', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: null, designation: 'Accountant', month: 'April', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };
      const report = service.processReconciliationData(rawData);
      // Must produce exactly 1 row, not 2 rows!
      expect(report.rows).toHaveLength(1);
      expect(report.summary.totalEmployees).toBe(1);
      // Both months of salaries merged
      expect(report.rows[0].months[0].payrollTax).toBe(5000);
      expect(report.rows[0].months[1].payrollTax).toBe(5000);
      expect(report.rows[0].quarterPayrollTax).toBe(10000);
      expect(report.rows[0].quarterPaybillTax).toBe(10000);
    });

    it('flags blank master HRPN with an actionable message (EMP-* rows can never join paybill)', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: '7', name: 'Smt. S.V.Solanki', pan: 'AKPPS2419E', hprn_no: null, designation: 'Office Superintendent', join_date: null, transfer_date: null },
        ],
        salaries: [
          { employee_id: '7', month: 'April', gross: 113098, da: 0, tax: 6268 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '20105451', employee_name: 'Smt.Sulochana Vijaykumar Solanki', employee_id: null, designation: 'Office Superintendent', month: 'March', financial_year: 2025, income_tax: 6268, prof_tax: 200, total_deductions: 6468, net_pay: 53532 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '20105451', employee_name: 'Smt.Sulochana Vijaykumar Solanki', employee_id: null, designation: 'Office Superintendent', month: 'March', financial_year: 2025, gross_amount: 113098, basic_pay: 103098, da: 10000 },
        ],
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].hrpn).toBe('EMP-7');
      expect(report.rows[0].missingHrpn).toBe(true);
      expect(report.rows[0].status).toBe('MISSING_IN_PAYBILL');
      expect(report.rows[0].statusMessage).toContain('No HRPN in Employee Master');
    });

    it('does NOT match by name — HRPN is the hard key (employee without HRPN stays MISSING_IN_PAYBILL)', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          // Payroll master has no HRPN — must NOT join to paybill HRPN 800555 by name.
          { id: 'emp-1', name: 'Dineshbhai Patel', pan: 'ABCDE1234F', hprn_no: null, designation: 'Vet Officer', join_date: null, transfer_date: null },
        ],
        salaries: [
          { employee_id: 'emp-1', month: 'April', gross: 60000, da: 0, tax: 6268 },
        ],
        paybillDeductions: [
          // Paybill has 'Shri. Dr. Dineshbhai Patel' with HRPN '800555'
          { id: 'd1', hrpn: '800555', employee_name: 'Shri. Dr. Dineshbhai Patel', employee_id: null, designation: 'Vet Officer', month: 'March', financial_year: 2025, income_tax: 6268, prof_tax: 200, total_deductions: 6468, net_pay: 53532 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '800555', employee_name: 'Shri. Dr. Dineshbhai Patel', employee_id: null, designation: 'Vet Officer', month: 'March', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };
      const report = service.processReconciliationData(rawData);
      // Employee-master-only roster, HRPN-only join: 1 row (the master employee),
      // paybill-only HRPN 800555 is ignored.
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].employeeId).toBe('emp-1');
      expect(report.rows[0].quarterPaybillTax).toBe(0);
      expect(report.rows[0].quarterPayrollTax).toBe(6268);
      expect(report.rows[0].status).toBe('MISSING_IN_PAYBILL');
    });

    it('maps by HRPN even when names differ — name drift is tolerated, HRPN wins', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'emp-1', name: 'Dineshbhai Patel', pan: 'ABCDE1234F', hprn_no: '800555', designation: 'Vet Officer', join_date: null, transfer_date: null },
        ],
        salaries: [
          { employee_id: 'emp-1', month: 'April', gross: 60000, da: 0, tax: 6268 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '800555', employee_name: 'Shri. Dr. Dineshbhai K Patel', employee_id: null, designation: 'Vet Officer', month: 'March', financial_year: 2025, income_tax: 6268, prof_tax: 200, total_deductions: 6468, net_pay: 53532 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '800555', employee_name: 'Shri. Dr. Dineshbhai K Patel', employee_id: null, designation: 'Vet Officer', month: 'March', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].employeeId).toBe('emp-1');
      // Master name stays canonical…
      expect(report.rows[0].employeeName).toBe('Dineshbhai Patel');
      // …paybill name is recorded separately and flagged, but still matched.
      expect(report.rows[0].paybillName).toBe('Shri. Dr. Dineshbhai K Patel');
      expect(report.rows[0].nameMismatch).toBe(true);
      expect(report.rows[0].quarterPaybillTax).toBe(6268);
      expect(report.rows[0].quarterPayrollTax).toBe(6268);
      expect(report.rows[0].status).toBe('MATCHED');
    });

    it('folds manual DA Difference arrears into paybill gross (May-26: PB 221670 + 9840 = PR 231510)', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2026,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'emp-a', name: 'Test Employee', pan: 'ABCDE1234F', hprn_no: '20100001', designation: 'Officer', join_date: null, transfer_date: null },
        ],
        salaries: [
          { employee_id: 'emp-a', month: 'April', gross: 219210, da: 0, tax: 0 },
          { employee_id: 'emp-a', month: 'May', gross: 221670, da: 0, tax: 30043 },
          // 059 three-track: payroll regular gross 221670 + DA-diff arrears 9840 = total 231510.
          { employee_id: 'emp-a', month: 'June', gross: 221670, da: 9840, tax: 30000, da_diff: 9840 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'March', financial_year: 2026, income_tax: 0, prof_tax: 200, total_deductions: 200, net_pay: 219010 },
          { id: 'd2', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'April', financial_year: 2026, income_tax: 30043, prof_tax: 200, total_deductions: 30243, net_pay: 201267 },
          { id: 'd3', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, income_tax: 30000, prof_tax: 200, total_deductions: 30200, net_pay: 201470 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'March', financial_year: 2026, gross_amount: 219210, basic_pay: 209210, da: 10000 },
          { id: 'e2', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'April', financial_year: 2026, gross_amount: 221670, basic_pay: 211670, da: 10000 },
          { id: 'e3', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, gross_amount: 221670, basic_pay: 211670, da: 10000 },
        ],
        manualLedgerValues: {
          '20100001': { 'DA Difference': { May: 9840 } },
        },
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      // June slot = May work month: bill 221670 + 9840 arrears = payroll 231510.
      expect(report.rows[0].months[2].paybillGross).toBe(231510);
      expect(report.rows[0].months[2].paybillArrears).toBe(9840);
      expect(report.rows[0].months[2].grossDiff).toBe(0);
      // 059 three-track splits: regular 221670 matches, DA-diff 9840 matches.
      expect(report.rows[0].months[2].pbRegular).toBe(221670);
      expect(report.rows[0].months[2].prRegular).toBe(221670);
      expect(report.rows[0].months[2].regularDiff).toBe(0);
      expect(report.rows[0].months[2].pbDaDiff).toBe(9840);
      expect(report.rows[0].months[2].prDaDiff).toBe(9840);
      expect(report.rows[0].months[2].isRegularMatched).toBe(true);
      expect(report.rows[0].months[2].isDaMatched).toBe(true);
      expect(report.rows[0].status).toBe('MATCHED');
      expect(report.rows[0].quarterGrossDiff).toBe(0);
    });

    it('flags unsplit arrears as ARREARS_MISMATCH when totals match but tracks do not', () => {
      const base: QuarterRawData = {
        quarter: 'Q1',
        fy: 2026,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'emp-a', name: 'Test Employee', pan: 'ABCDE1234F', hprn_no: '20100001', designation: 'Officer', join_date: null, transfer_date: null },
        ],
        salaries: [
          // Payroll total 231510 WITHOUT arrears split: regular absorbs the arrears into gross, da is 0.
          { employee_id: 'emp-a', month: 'June', gross: 231510, da: 0, tax: 30000 },
        ],
        paybillDeductions: [
          { id: 'd3', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, income_tax: 30000, prof_tax: 200, total_deductions: 30200, net_pay: 201470 },
        ],
        paybillEarnings: [
          { id: 'e3', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, gross_amount: 221670, basic_pay: 211670, da: 10000 },
        ],
        manualLedgerValues: {
          '20100001': { 'DA Difference': { May: 9840 } },
        },
      };
      const report = service.processReconciliationData(base);
      expect(report.rows).toHaveLength(1);
      // Total matches (231510) but tracks don't: regular 221670 vs 231510, DA 9840 vs 0.
      expect(report.rows[0].months[2].grossDiff).toBe(0);
      expect(report.rows[0].months[2].regularDiff).toBe(-9840);
      expect(report.rows[0].months[2].daDiffDiff).toBe(9840);
      // Totals agree → actionable unsplit message, not a regular-pay error.
      expect(report.rows[0].status).toBe('ARREARS_MISMATCH');
      expect(report.rows[0].statusMessage).toContain('not split');
      expect(report.rows[0].canSync).toBe(true);
    });

    it('flags REGULAR_MISMATCH when monthly pay itself differs (totals differ too)', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2026,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'emp-a', name: 'Test Employee', pan: 'ABCDE1234F', hprn_no: '20100001', designation: 'Officer', join_date: null, transfer_date: null },
        ],
        salaries: [
          // Payroll regular total 210000 vs paybill regular 221670 — genuine shortfall.
          { employee_id: 'emp-a', month: 'June', gross: 210000, da: 9840, da_diff: 9840, tax: 30000 },
        ],
        paybillDeductions: [
          { id: 'd3', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, income_tax: 30000, prof_tax: 200, total_deductions: 30200, net_pay: 201470 },
        ],
        paybillEarnings: [
          { id: 'e3', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, gross_amount: 221670, basic_pay: 211670, da: 10000 },
        ],
        manualLedgerValues: {
          '20100001': { 'DA Difference': { May: 9840 } },
        },
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].months[2].grossDiff).toBe(11670);
      expect(report.rows[0].months[2].regularDiff).toBe(11670);
      expect(report.rows[0].status).toBe('REGULAR_MISMATCH');
      expect(report.rows[0].canSync).toBe(true);
    });

    it('never double-counts arrears when a supplementary bill is already imported', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2026,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'emp-a', name: 'Test Employee', pan: 'ABCDE1234F', hprn_no: '20100001', designation: 'Officer', join_date: null, transfer_date: null },
        ],
        salaries: [
          { employee_id: 'emp-a', month: 'June', gross: 221670, da: 9840, da_diff: 9840, tax: 30000 },
        ],
        paybillDeductions: [
          { id: 'd3', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, income_tax: 30000, prof_tax: 200, total_deductions: 30200, net_pay: 201470 },
        ],
        paybillEarnings: [
          // Regular bill + supplementary arrears bill accumulated in the import.
          { id: 'e3a', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, gross_amount: 221670, basic_pay: 211670, da: 10000, bill_type: 'REGULAR' as const },
          { id: 'e3b', hrpn: '20100001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'May', financial_year: 2026, gross_amount: 9840, basic_pay: 9840, da: 0, bill_type: 'DA_ARREAR' as const },
        ],
        manualLedgerValues: {
          '20100001': { 'DA Difference': { May: 9840 } },
        },
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].months[2].paybillGross).toBe(231510);
      expect(report.rows[0].months[2].paybillArrears).toBe(0);
      expect(report.rows[0].status).toBe('MATCHED');
    });

    it('maps ledger-only (est:) persons by HRPN — visible, never syncable', () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2026,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          { id: 'est:uuid-1', name: 'Smt. S.V.Solanki', pan: 'AKPPS2419E', hprn_no: '20105451', designation: 'Office Superintendent', join_date: '2026-03-01', transfer_date: null },
        ],
        salaries: [],
        paybillDeductions: [
          { id: 'd1', hrpn: '20105451', employee_name: 'Smt.Sulochana Vijaykumar Solanki', employee_id: null, designation: 'Office Superintendent', month: 'March', financial_year: 2026, income_tax: 6268, prof_tax: 200, total_deductions: 6468, net_pay: 53532 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '20105451', employee_name: 'Smt.Sulochana Vijaykumar Solanki', employee_id: null, designation: 'Office Superintendent', month: 'March', financial_year: 2026, gross_amount: 113098, basic_pay: 103098, da: 10000 },
        ],
      };
      const report = service.processReconciliationData(rawData);
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].hrpn).toBe('20105451');
      expect(report.rows[0].employeeId).toBeNull();
      expect(report.rows[0].quarterPaybillTax).toBe(6268);
      expect(report.rows[0].status).toBe('MISSING_IN_PAYROLL');
      // No salary-store key, so sync must stay off.
      expect(report.rows[0].canSync).toBe(false);
    });
  });

  describe('syncPaybillToPayroll', () => {
    it('returns zero when no syncable rows match', async () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: [],
        salaries: [],
        paybillDeductions: [],
        paybillEarnings: [],
      };
      (taxReconciliationRepository.getQuarterRawData as ReturnType<typeof vi.fn>).mockResolvedValue(rawData);

      const result = await service.syncPaybillToPayroll({ quarter: 'Q1', fy: 2025 });
      expect(result.syncedCount).toBe(0);
      expect(result.message).toContain('No eligible');
    });

    it('syncs eligible rows into Payroll and returns count', async () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2025,
        months: ['April', 'May', 'June'],
        employees: [
          {
            id: 'emp-1',
            name: 'Ramesh Patel',
            pan: 'ABCDE1234F',
            hprn_no: '2001001',
            designation: 'Accountant',
            join_date: null,
            transfer_date: null,
          },
        ],
        salaries: [],
        paybillDeductions: [
          { id: 'd1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'April', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
          { id: 'd2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, income_tax: 5000, prof_tax: 200, total_deductions: 5200, net_pay: 54800 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'April', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
          { id: 'e2', hrpn: '2001001', employee_name: 'Ramesh Patel', employee_id: 'emp-1', designation: 'Accountant', month: 'May', financial_year: 2025, gross_amount: 60000, basic_pay: 50000, da: 10000 },
        ],
      };

      (taxReconciliationRepository.getQuarterRawData as ReturnType<typeof vi.fn>).mockResolvedValue(rawData);
      (taxReconciliationRepository.syncPaybillValuesToPayroll as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      const result = await service.syncPaybillToPayroll({ quarter: 'Q1', fy: 2025 });
      expect(taxReconciliationRepository.syncPaybillValuesToPayroll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ employeeId: 'emp-1', month: 'April', gross: 60000, da: 0, tax: 5000 }),
          expect.objectContaining({ employeeId: 'emp-1', month: 'May', gross: 60000, da: 0, tax: 5000 }),
        ]),
        2025,
        'Q1'
      );
      expect(result.syncedCount).toBe(2);
      expect(result.message).toContain('Successfully synchronized 2 salary entries');
    });

    it('writes regular total to gross and arrears-only to da (never regular DA)', async () => {
      const rawData: QuarterRawData = {
        quarter: 'Q1',
        fy: 2026,
        months: ['April', 'May', 'June'],
        paybillMonths: ['March', 'April', 'May'],
        employees: [
          {
            id: 'emp-1',
            name: 'Test Employee',
            pan: 'ABCDE1234F',
            hprn_no: '2001001',
            designation: 'Officer',
            join_date: null,
            transfer_date: null,
          },
        ],
        salaries: [
          { employee_id: 'emp-1', month: 'May', gross: 221510, da: 10000, tax: 30043 },
        ],
        paybillDeductions: [
          { id: 'd1', hrpn: '2001001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'April', financial_year: 2026, income_tax: 30043, prof_tax: 200, total_deductions: 30243, net_pay: 196627 },
        ],
        paybillEarnings: [
          { id: 'e1', hrpn: '2001001', employee_name: 'Test Employee', employee_id: null, designation: 'Officer', month: 'April', financial_year: 2026, gross_amount: 221670, basic_pay: 211670, da: 10000 },
        ],
        manualLedgerValues: {
          '2001001': { 'DA Difference': { April: 5000 } },
        },
      };

      (taxReconciliationRepository.getQuarterRawData as ReturnType<typeof vi.fn>).mockResolvedValue(rawData);
      (taxReconciliationRepository.syncPaybillValuesToPayroll as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await service.syncPaybillToPayroll({ quarter: 'Q1', fy: 2026 });
      // PB regular 221670 (incl. regular DA) + DA-diff 5000. Gross takes the
      // regular total, da takes arrears ONLY — regular DA must not leak into it.
      expect(taxReconciliationRepository.syncPaybillValuesToPayroll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ employeeId: 'emp-1', month: 'May', gross: 221670, da: 5000, tax: 30043, pay_diff: 0, da_diff: 5000 }),
        ]),
        2026,
        'Q1'
      );
      expect(result.syncedCount).toBe(1);
    });
  });
});



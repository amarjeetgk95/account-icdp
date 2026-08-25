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

      const result = await service.getQuarterTaxReconciliation('Q1', 2025, 'office-1');
      expect(taxReconciliationRepository.getQuarterRawData).toHaveBeenCalledWith('Q1', 2025, 'office-1');
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
          { employee_id: 'emp-1', month: 'April', gross: 50000, da: 10000, tax: 5000 },
          { employee_id: 'emp-1', month: 'May', gross: 50000, da: 10000, tax: 5000 },
          { employee_id: 'emp-1', month: 'June', gross: 50000, da: 10000, tax: 5000 },
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
          { employee_id: 'emp-1', month: 'April', gross: 50000, da: 10000, tax: 4000 }, // Tax is 4000 vs 5000
          { employee_id: 'emp-1', month: 'May', gross: 50000, da: 10000, tax: 5000 },
          { employee_id: 'emp-1', month: 'June', gross: 50000, da: 10000, tax: 5000 },
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

    it('identifies UNMAPPED_HRPN when Paybill has HRPN not in master employees', () => {
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
      expect(report.rows).toHaveLength(1);
      const row = report.rows[0];
      expect(row.status).toBe('UNMAPPED_HRPN');
      expect(row.canSync).toBe(false); // Can't sync because no employeeId in master yet
      expect(report.summary.unmappedHrpnCount).toBe(1);
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
          expect.objectContaining({ employeeId: 'emp-1', month: 'April', gross: 50000, da: 10000, tax: 5000 }),
          expect.objectContaining({ employeeId: 'emp-1', month: 'May', gross: 50000, da: 10000, tax: 5000 }),
        ]),
        2025,
        undefined
      );
      expect(result.syncedCount).toBe(2);
      expect(result.message).toContain('Successfully synchronized 2 salary entries');
    });
  });
});



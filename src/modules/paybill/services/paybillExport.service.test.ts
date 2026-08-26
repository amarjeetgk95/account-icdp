import { describe, it, expect, vi } from 'vitest';
import { paybillPdfService } from './paybillPdf.service';
import { paybillExcelService } from './paybillExcel.service';
import type { LedgerMatrixRow } from '../components/employee-ledger/ledgerMath';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('paybill export services (PDF & Excel)', () => {
  const sampleRows: LedgerMatrixRow[] = [
    {
      key: 'basicPay',
      label: 'Basic Pay',
      group: 'EARNING',
      values: [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
      total: 600000,
    },
    {
      key: 'da',
      label: 'DA (0103)',
      group: 'EARNING',
      values: [25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000, 25000],
      total: 300000,
    },
    {
      key: 'grossAmount',
      label: 'Gross Amt',
      group: 'EARNING',
      values: [75000, 75000, 75000, 75000, 75000, 75000, 75000, 75000, 75000, 75000, 75000, 75000],
      total: 900000,
    },
    {
      key: 'incomeTax',
      label: 'Income Tax',
      group: 'DEDUCTION',
      values: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
      total: 60000,
    },
    {
      key: 'profTax',
      label: 'Professional Tax',
      group: 'DEDUCTION',
      values: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200],
      total: 2400,
    },
    {
      key: 'totalDeductions',
      label: 'Total Deductions',
      group: 'DEDUCTION',
      values: [5200, 5200, 5200, 5200, 5200, 5200, 5200, 5200, 5200, 5200, 5200, 5200],
      total: 62400,
    },
    {
      key: 'netPay',
      label: 'Net Pay',
      group: 'DEDUCTION',
      values: [69800, 69800, 69800, 69800, 69800, 69800, 69800, 69800, 69800, 69800, 69800, 69800],
      total: 837600,
    },
  ];

  it('generates high-level employee ledger PDF statement without errors', () => {
    expect(() => {
      paybillPdfService.exportEmployeeLedgerPdf({
        financialYear: 2024,
        fyLabel: '2024-25',
        employee: {
          hrpn: '20014113',
          name: 'PATEL SURESHBHAI',
          designation: 'Senior Clerk',
          payScale: 'Level 4 (25500-81100)',
        },
        rows: sampleRows,
        summary: {
          annualGross: 900000,
          annualDeductions: 62400,
          netTakeHome: 837600,
        },
      });
    }).not.toThrow();
  });

  it('generates high-level employee ledger Excel statement workbook without errors', async () => {
    await expect(
      paybillExcelService.exportEmployeeLedgerExcel({
        financialYear: 2024,
        fyLabel: '2024-25',
        employee: {
          hrpn: '20014113',
          name: 'PATEL SURESHBHAI',
          designation: 'Senior Clerk',
          payScale: 'Level 4 (25500-81100)',
        },
        rows: sampleRows,
        summary: {
          annualGross: 900000,
          annualDeductions: 62400,
          netTakeHome: 837600,
        },
      })
    ).resolves.not.toThrow();
  }, 20000);
});

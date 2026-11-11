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

  it('handles multiline office names cleanly without header collisions', async () => {
    const { doc, fileName } = await paybillPdfService.generateEmployeeLedgerPdfDoc({
      officeName: 'DEPUTY DIRECTOR OF ANIMAL HUSBANDRY\nINTENSIVE CATTLE DEVELOPMENT PROGRAMME-SURAT',
      financialYear: 2026,
      fyLabel: '2026-27',
      employee: {
        hrpn: '20013826',
        name: 'Dr. D.C. Chaudhari',
        designation: 'Deputy Director (Animal Husbandry)',
        payScale: 'PB-3 (15600-39100)/6600',
      },
      rows: sampleRows,
    });
    expect(doc).toBeDefined();
    expect(fileName).toContain('20013826');
    expect(doc.internal.getNumberOfPages()).toBe(1);
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
  }, 40000);

  it('generates a ZIP archive containing individual PDFs for multiple employees', async () => {
    const progressCalls: unknown[] = [];
    const employees = [
      { hrpn: '20013826', name: 'Dr. D.C. Chaudhari', designation: 'Deputy Director' },
      { hrpn: '20014113', name: 'Dr. H.M. Patidar', designation: 'Assistant Director' },
    ];
    const earnings = [
      {
        id: '1',
        importId: 'imp1',
        officeId: 'off1',
        hrpn: '20013826',
        employeeName: 'Dr. D.C. Chaudhari',
        month: 'March',
        financialYear: 2026,
        basicPay: 102500,
        da: 71340,
        hra: 16400,
        grossAmount: 190240,
        createdAt: '2026-03-01',
      },
      {
        id: '2',
        importId: 'imp1',
        officeId: 'off1',
        hrpn: '20014113',
        employeeName: 'Dr. H.M. Patidar',
        month: 'March',
        financialYear: 2026,
        basicPay: 85000,
        da: 59000,
        hra: 13600,
        grossAmount: 157600,
        createdAt: '2026-03-01',
      },
    ];
    const deductions = [
      {
        id: '1',
        importId: 'imp1',
        officeId: 'off1',
        hrpn: '20013826',
        employeeName: 'Dr. D.C. Chaudhari',
        month: 'March',
        financialYear: 2026,
        incomeTax: 15000,
        profTax: 200,
        totalDeductions: 15200,
        netPay: 175040,
        createdAt: '2026-03-01',
      },
      {
        id: '2',
        importId: 'imp1',
        officeId: 'off1',
        hrpn: '20014113',
        employeeName: 'Dr. H.M. Patidar',
        month: 'March',
        financialYear: 2026,
        incomeTax: 10000,
        profTax: 200,
        totalDeductions: 10200,
        netPay: 147400,
        createdAt: '2026-03-01',
      },
    ];

    const { zipBlob, fileName, total } = await paybillPdfService.generateAllEmployeesLedgerPdfZip({
      financialYear: 2026,
      fyLabel: '2026-27',
      employees,
      allEarnings: earnings as any,
      allDeductions: deductions as any,
      settings: null,
      manualValues: {},
      onProgress: (p) => progressCalls.push(p),
    });

    expect(total).toBe(2);
    expect(fileName).toBe('Employee_Ledgers_FY2026-27.zip');
    expect(zipBlob).toBeDefined();

    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(zipBlob);
    const filenames = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
    expect(filenames.length).toBe(2);
    expect(filenames.some((f) => f.includes('20013826') && f.endsWith('.pdf'))).toBe(true);
    expect(filenames.some((f) => f.includes('20014113') && f.endsWith('.pdf'))).toBe(true);

    expect(progressCalls.some((p: any) => p.status === 'preparing')).toBe(true);
    expect(progressCalls.some((p: any) => p.status === 'generating' && p.current === 1)).toBe(true);
    expect(progressCalls.some((p: any) => p.status === 'generating' && p.current === 2)).toBe(true);
    expect(progressCalls.some((p: any) => p.status === 'completed')).toBe(true);
  });

  it('cancels bulk export when AbortSignal is triggered', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      paybillPdfService.generateAllEmployeesLedgerPdfZip({
        financialYear: 2026,
        fyLabel: '2026-27',
        employees: [{ hrpn: '20013826', name: 'Dr. D.C. Chaudhari' }],
        allEarnings: [],
        allDeductions: [],
        settings: null,
        manualValues: {},
        signal: controller.signal,
      })
    ).rejects.toThrow('Export cancelled');
  });
});

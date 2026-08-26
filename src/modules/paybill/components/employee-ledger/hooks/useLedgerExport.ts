import { useState } from 'react';
import { paybillReportService } from '../../../services/paybillReport.service';
import { paybillExcelService } from '../../../services/paybillExcel.service';
import { paybillPdfService } from '../../../services/paybillPdf.service';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import { LEDGER_PRINT_STYLES } from '../ledgerPrint';
import type { LedgerMatrixRow } from '../ledgerMath';

interface EmployeeExportInfo {
  hrpn: string;
  name: string;
  designation?: string | null;
  payScale?: string | null;
}

interface UseLedgerExportArgs {
  financialYear: number;
  hrpn: string;
  fyLabel: string;
  officeName?: string;
  employee?: EmployeeExportInfo | null;
  ledgerMatrixRows?: LedgerMatrixRow[];
  summary?: {
    annualGross: number;
    annualDeductions: number;
    netTakeHome: number;
  };
}

/**
 * High-level PDF, Excel, and Print exports for the Employee Ledger.
 */
export function useLedgerExport({
  financialYear,
  hrpn,
  fyLabel,
  officeName,
  employee,
  ledgerMatrixRows,
  summary,
}: UseLedgerExportArgs) {
  const [isExporting, setIsExporting] = useState(false);

  const exportExcel = async () => {
    if (!hrpn) return;
    setIsExporting(true);
    try {
      if (ledgerMatrixRows && ledgerMatrixRows.length > 0) {
        await paybillExcelService.exportEmployeeLedgerExcel({
          officeName,
          financialYear,
          fyLabel,
          employee: {
            hrpn,
            name: employee?.name || 'Employee',
            designation: employee?.designation || null,
            payScale: employee?.payScale || null,
          },
          rows: ledgerMatrixRows,
          summary: summary || {
            annualGross: ledgerMatrixRows.find((r) => r.key === 'grossAmount')?.total || 0,
            annualDeductions: ledgerMatrixRows.find((r) => r.key === 'totalDeductions')?.total || 0,
            netTakeHome: ledgerMatrixRows.find((r) => r.key === 'netPay')?.total || 0,
          },
        });
      } else {
        const report = await paybillReportService.getMatrixReport(financialYear, hrpn);
        await paybillExcelService.exportAllowanceMatrixToExcel(
          report,
          fyLabel,
          officeName || 'Intensive Cattle Development Project (ICDP)'
        );
      }
    } catch (err) {
      console.error('[useLedgerExport] Excel export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!hrpn) return;
    setIsExporting(true);
    try {
      if (ledgerMatrixRows && ledgerMatrixRows.length > 0) {
        paybillPdfService.exportEmployeeLedgerPdf({
          officeName,
          financialYear,
          fyLabel,
          employee: {
            hrpn,
            name: employee?.name || 'Employee',
            designation: employee?.designation || null,
            payScale: employee?.payScale || null,
          },
          rows: ledgerMatrixRows,
          summary: summary || {
            annualGross: ledgerMatrixRows.find((r) => r.key === 'grossAmount')?.total || 0,
            annualDeductions: ledgerMatrixRows.find((r) => r.key === 'totalDeductions')?.total || 0,
            netTakeHome: ledgerMatrixRows.find((r) => r.key === 'netPay')?.total || 0,
          },
        });
      } else {
        printLedger('paybill-employee-ledger-print', `Employee_Ledger_${hrpn}_${fyLabel}`);
      }
    } catch (err) {
      console.error('[useLedgerExport] PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const printLedger = (elementId: string, fileName: string) => {
    // Target only the ledger print area — not the page filter/search controls.
    // Generates a single-page landscape print: stat cards forced to 4-col row, table de-clipped and down-scaled.
    const ledgerEl = document.getElementById(elementId) as HTMLElement | null;
    if (ledgerEl) {
      popupNativePrint({
        elements: [ledgerEl],
        title: fileName,
        pageSize: 'A4',
        orientation: 'landscape',
        pageMargin: '5mm',
        customStyles: LEDGER_PRINT_STYLES,
      });
    } else {
      window.print();
    }
  };

  return { exportPdf, exportExcel, printLedger, isExporting };
}


import type { jsPDF as JsPDFType } from 'jspdf';
import type {
  PayBillMonthlyEmployeeMatrixReport,
  PayBillStoredEarning,
  PayBillStoredDeduction,
  PayBillSettings,
} from '../types';
import { paybillRepository } from '../repositories/paybill.repository';
import { toCanonicalHrpn } from '@/shared/domain/canonicalEmployee';
import { buildLedgerMatrixRows, type ManualValuesMap } from '../components/employee-ledger/ledgerMath';

type AutoTableFn = (doc: JsPDFType, options: Record<string, unknown>) => void;

async function loadPdfLibs(): Promise<{ jsPDF: new (options?: Record<string, unknown>) => JsPDFType; autoTable: AutoTableFn }> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF, autoTable: autoTable as unknown as AutoTableFn };
}

const fmt = (n: number): string => `Rs. ${(n || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function headerLines(doc: JsPDFType, lines: string[]) {
  let y = 40;
  for (const line of lines) {
    doc.setFontSize(line.startsWith('PAY BILL') ? 13 : 9);
    doc.setTextColor(line.startsWith('PAY BILL') ? 20 : 60);
    doc.text(line, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += line.startsWith('PAY BILL') ? 20 : 14;
  }
  return y;
}

export interface EmployeeLedgerPdfExportOptions {
  officeName?: string;
  financialYear: number;
  fyLabel: string;
  employee: {
    hrpn: string;
    name: string;
    designation?: string | null;
    payScale?: string | null;
  };
  rows: Array<{
    key: string;
    label: string;
    group: 'EARNING' | 'DEDUCTION';
    values: number[];
    total: number;
    isManual?: boolean;
  }>;
  summary?: {
    annualGross: number;
    annualDeductions: number;
    netTakeHome: number;
  };
  customFileName?: string;
}

export interface BulkEmployeeExportProgress {
  current: number;
  total: number;
  currentEmployeeName: string;
  status: 'preparing' | 'generating' | 'zipping' | 'completed' | 'error';
  errorMessage?: string;
}

export interface BulkEmployeeLedgerPdfZipOptions {
  officeName?: string;
  financialYear: number;
  fyLabel: string;
  employees: Array<{
    hrpn: string;
    name: string;
    designation?: string | null;
    payScale?: string | null;
  }>;
  allEarnings?: PayBillStoredEarning[];
  allDeductions?: PayBillStoredDeduction[];
  settings?: PayBillSettings | null;
  manualValues?: ManualValuesMap;
  onProgress?: (progress: BulkEmployeeExportProgress) => void;
  signal?: AbortSignal;
}

export const paybillPdfService = {
  /**
   * Export the monthly employee parameter matrix (earning + deduction columns) as a PDF
   */
  exportMonthlyEmployeeMatrixPdf(
    report: PayBillMonthlyEmployeeMatrixReport,
    title = 'Monthly Employee Parameter Matrix'
  ): Promise<void> {
    return (async () => {
    const { jsPDF, autoTable } = await loadPdfLibs();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const earningCols = report.columns.filter((c) => c.group === 'EARNING');
    const deductionCols = report.columns.filter((c) => c.group === 'DEDUCTION');

    const y = headerLines(doc, [
      'PAY BILL PARAMETER MATRIX',
      `${title}  |  Month: ${report.month}  |  FY ${report.financialYear}-${report.financialYear + 1}`,
    ]);

    autoTable(doc, {
      startY: y + 8,
      head: [
        [
          { content: 'Employee', rowSpan: 2, styles: { halign: 'left' } },
          {
            content: 'EARNING',
            colSpan: earningCols.length,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [31, 58, 95] },
          },
          {
            content: 'DEDUCTION',
            colSpan: deductionCols.length,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [190, 75, 75] },
          },
        ],
        ['', ...earningCols.map((c) => c.label), ...deductionCols.map((c) => c.label)],
      ],
      body: report.rows.map((r) => [
        `${r.employeeName} (${r.hrpn})`,
        ...report.columns.map((c) => fmt(r.values[c.key] || 0)),
      ]),
      foot: [[
        'Total',
        ...report.columns.map((c) => fmt(report.totals[c.key] || 0)),
      ]],
      theme: 'grid',
      headStyles: { fontSize: 8 },
      footStyles: { fillColor: [222, 226, 230], textColor: [20, 20, 20], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 2.5, lineColor: [200, 200, 200] },
    });

    const fileName = `PayBill_Matrix_${report.month.replace(/[^A-Za-z0-9-]/g, '_')}_FY${report.financialYear}.pdf`;
    doc.save(fileName);
    })();
  },

  /**
   * Internal generator: builds the jsPDF document instance for an employee ledger statement
   */
  async generateEmployeeLedgerPdfDoc(
    options: EmployeeLedgerPdfExportOptions
  ): Promise<{ doc: JsPDFType; fileName: string }> {
    const { jsPDF, autoTable } = await loadPdfLibs();
    const {
      officeName = 'INTENSIVE CATTLE DEVELOPMENT PROJECT (ICDP)',
      financialYear,
      fyLabel,
      employee,
      rows,
      customFileName,
    } = options;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 841.89 pt
    const cleanHrpn = (employee.hrpn || '').trim() || 'Employee';

    const marginX = 28;
    const tableWidth = pageWidth - marginX * 2; // 785.89 pt

    // 1. Official Header Block (Dynamic multiline support preventing text collisions)
    const rawOfficeLines = officeName
      ? officeName.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      : ['INTENSIVE CATTLE DEVELOPMENT PROJECT (ICDP)'];

    let cursorY = 17;
    doc.setTextColor(30, 58, 138); // Royal Navy 900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(rawOfficeLines.length > 1 ? 11 : 12.5);

    for (const line of rawOfficeLines) {
      doc.text(line.toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 13;
    }

    cursorY += 1;
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`ANNUAL FINANCIAL STATEMENT — FY ${fyLabel}`, pageWidth / 2, cursorY, { align: 'center' });

    cursorY += 7;
    // Subtle header separator line
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.75);
    doc.line(marginX, cursorY, marginX + tableWidth, cursorY);

    cursorY += 5;
    // 2. Employee Profile & Metadata Table Box (Refined 2-Column Format)
    const metaY = cursorY;
    const metaH = 26;
    doc.setFillColor(240, 247, 255); // Soft Ice Blue (Blue 50)
    doc.setDrawColor(191, 219, 254); // Blue 200
    doc.setLineWidth(0.6);
    doc.roundedRect(marginX, metaY, tableWidth, metaH, 2, 2, 'FD');

    // Left Column: Employee Name & Designation (Spacious 430 pt width)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Navy 900
    doc.text('Employee Name:', marginX + 10, metaY + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text(employee.name || '—', marginX + 80, metaY + 10.5, { maxWidth: 430 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('Designation:', marginX + 10, metaY + 21.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(employee.designation || '—', marginX + 80, metaY + 21.5, { maxWidth: 430 });

    // Right Column: HRPN & Pay Scale
    const rightColX = marginX + 530;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('HRPN:', rightColX, metaY + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(employee.hrpn || '—', rightColX + 38, metaY + 10.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('Pay Scale:', rightColX, metaY + 21.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(employee.payScale || '—', rightColX + 50, metaY + 21.5, { maxWidth: 190 });

    const tableStartY = metaY + metaH + 6;

    // 3. Build Table Rows with Month-YY Labels
    const startYearShort = String(financialYear || 2024).slice(-2);
    const endYearShort = String((financialYear || 2024) + 1).slice(-2);
    const months = [
      `March-${startYearShort}`,
      `April-${startYearShort}`,
      `May-${startYearShort}`,
      `June-${startYearShort}`,
      `July-${startYearShort}`,
      `Aug-${startYearShort}`,
      `Sept-${startYearShort}`,
      `Oct-${startYearShort}`,
      `Nov-${startYearShort}`,
      `Dec-${startYearShort}`,
      `Jan-${endYearShort}`,
      `Feb-${endYearShort}`,
    ];

    const fmtVal = (v: number) =>
      v === 0 || !v ? '-' : (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    const earningRows = rows.filter((r) => r.group === 'EARNING' && r.key !== 'grossAmount');
    const grossRow = rows.find((r) => r.key === 'grossAmount');
    const deductionRows = rows.filter(
      (r) => r.group === 'DEDUCTION' && r.key !== 'totalDeductions' && r.key !== 'netPay'
    );
    const totalDedRow = rows.find((r) => r.key === 'totalDeductions');
    const netPayRow = rows.find((r) => r.key === 'netPay');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableBody: any[] = [];

    // Section 1: Earnings Header (Soft Navy Bar)
    tableBody.push([
      {
        content: 'EARNINGS & ALLOWANCES',
        colSpan: 14,
        styles: {
          fillColor: [224, 231, 255], // Light Indigo/Blue
          textColor: [30, 58, 138], // Royal Navy
          fontStyle: 'bold',
          halign: 'left',
          fontSize: 7.5,
          cellPadding: 2.2,
        },
      },
    ]);

    for (const r of earningRows) {
      tableBody.push([
        r.label,
        ...r.values.map(fmtVal),
        fmtVal(r.total),
      ]);
    }

    if (grossRow) {
      tableBody.push([
        {
          content: 'GROSS SALARY (A)',
          styles: { fontStyle: 'bold', fillColor: [209, 250, 229], textColor: [6, 95, 70] },
        },
        ...grossRow.values.map((v) => ({
          content: fmtVal(v),
          styles: { fontStyle: 'bold', fillColor: [209, 250, 229], textColor: [6, 95, 70] },
        })),
        {
          content: fmtVal(grossRow.total),
          styles: { fontStyle: 'bold', fillColor: [209, 250, 229], textColor: [6, 95, 70] },
        },
      ]);
    }

    // Section 2: Deductions Header (Soft Rose/Crimson Bar)
    tableBody.push([
      {
        content: 'DEDUCTIONS & RECOVERIES',
        colSpan: 14,
        styles: {
          fillColor: [255, 228, 230], // Light Rose/Crimson
          textColor: [159, 18, 57], // Crimson Maroon
          fontStyle: 'bold',
          halign: 'left',
          fontSize: 7.5,
          cellPadding: 2.2,
        },
      },
    ]);

    for (const r of deductionRows) {
      tableBody.push([
        r.label,
        ...r.values.map(fmtVal),
        fmtVal(r.total),
      ]);
    }

    if (totalDedRow) {
      tableBody.push([
        {
          content: 'TOTAL DEDUCTIONS (B)',
          styles: { fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [153, 27, 27] },
        },
        ...totalDedRow.values.map((v) => ({
          content: fmtVal(v),
          styles: { fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [153, 27, 27] },
        })),
        {
          content: fmtVal(totalDedRow.total),
          styles: { fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [153, 27, 27] },
        },
      ]);
    }

    if (netPayRow) {
      tableBody.push([
        {
          content: 'NET TAKE-HOME PAY (A - B)',
          styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [29, 78, 216] },
        },
        ...netPayRow.values.map((v) => ({
          content: fmtVal(v),
          styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [29, 78, 216] },
        })),
        {
          content: fmtVal(netPayRow.total),
          styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [29, 78, 216] },
        },
      ]);
    }

    // Proportional column sizing summing to 786 pt
    const col0Width = 138;
    const monthColWidth = 46; // 12 * 46 = 552
    const totalColWidth = 96; // 138 + 552 + 96 = 786 pt

    const columnStyles: Record<number, { halign: 'left' | 'right'; cellWidth: number; fontStyle?: 'normal' | 'bold' }> = {
      0: { halign: 'left', cellWidth: col0Width, fontStyle: 'normal' },
    };
    for (let i = 1; i <= 12; i++) {
      columnStyles[i] = { halign: 'right', cellWidth: monthColWidth };
    }
    columnStyles[13] = { halign: 'right', cellWidth: totalColWidth, fontStyle: 'bold' };

    // Adaptive row padding based on row count to ensure perfect single-page fit
    const totalRowCount = tableBody.length;
    const vPadding = totalRowCount > 28 ? 2.2 : totalRowCount > 24 ? 2.8 : 3.4;
    const fontSize = totalRowCount > 28 ? 6.8 : 7.2;

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: marginX, right: marginX, top: tableStartY, bottom: 20 },
      tableWidth: 786,
      head: [
        ['Allowance / Deduction Parameter', ...months, 'Annual Total (Rs.)'],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138], // Royal Navy
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center',
        cellPadding: { top: 2.8, bottom: 2.8, left: 2, right: 2 },
      },
      columnStyles,
      styles: {
        fontSize,
        cellPadding: { top: vPadding, bottom: vPadding, left: 3, right: 3 },
        lineColor: [226, 232, 240],
        lineWidth: 0.4,
        textColor: [51, 65, 85],
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    const cleanName = (employee.name || '')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_');
    const defaultFileName = cleanName
      ? `Employee_Ledger_${cleanHrpn}_${cleanName}_FY${fyLabel}.pdf`
      : `Employee_Ledger_${cleanHrpn}_FY${fyLabel}.pdf`;

    const fileName = customFileName || defaultFileName;
    return { doc, fileName };
  },

  /**
   * Export the complete 12-Month Employee Ledger Statement as a high-fidelity PDF
   */
  async exportEmployeeLedgerPdf(options: EmployeeLedgerPdfExportOptions): Promise<void> {
    const { doc, fileName } = await this.generateEmployeeLedgerPdfDoc(options);
    doc.save(fileName);
  },

  /**
   * Generate a ZIP archive containing individual PDF statements for all requested employees.
   */
  async generateAllEmployeesLedgerPdfZip(
    options: BulkEmployeeLedgerPdfZipOptions
  ): Promise<{ zipBlob: Blob; fileName: string; total: number }> {
    const {
      officeName = 'INTENSIVE CATTLE DEVELOPMENT PROJECT (ICDP)',
      financialYear,
      fyLabel,
      employees,
      onProgress,
      signal,
    } = options;

    if (!employees || employees.length === 0) {
      throw new Error('No employees available to export.');
    }

    onProgress?.({
      current: 0,
      total: employees.length,
      currentEmployeeName: '',
      status: 'preparing',
    });

    // 1. Fetch missing bulk data in parallel if not passed in
    const [allEarnings, allDeductions, settings, manualValues] = await Promise.all([
      options.allEarnings ? Promise.resolve(options.allEarnings) : paybillRepository.listEarnings({ financialYear }),
      options.allDeductions ? Promise.resolve(options.allDeductions) : paybillRepository.listDeductions({ financialYear }),
      options.settings ? Promise.resolve(options.settings) : paybillRepository.getSettings(),
      options.manualValues ? Promise.resolve(options.manualValues) : paybillRepository.getManualLedgerValues(),
    ]);

    if (signal?.aborted) throw new Error('Export cancelled');

    const [{ default: JSZip }] = await Promise.all([
      import('jszip'),
    ]);

    const zip = new JSZip();
    const folderName = `Employee_Ledgers_FY${fyLabel}`;
    const zipFolder = zip.folder(folderName) || zip;

    const manualAllowances =
      settings?.manualAllowances && settings.manualAllowances.length > 0
        ? settings.manualAllowances
        : ['Pay Difference', 'DA Difference'];
    const manualDeductions = settings?.manualDeductions || [];
    const earningColumnOrder = settings?.earningColumnOrder || [];
    const deductionColumnOrder = settings?.deductionColumnOrder || [];

    // Pre-group earnings and deductions by canonical HRPN for O(1) lookup
    const earningsByHrpn = new Map<string, PayBillStoredEarning[]>();
    for (const e of allEarnings) {
      const key = toCanonicalHrpn(e.hrpn);
      if (!key) continue;
      const arr = earningsByHrpn.get(key) || [];
      arr.push(e);
      earningsByHrpn.set(key, arr);
    }

    const deductionsByHrpn = new Map<string, PayBillStoredDeduction[]>();
    for (const d of allDeductions) {
      const key = toCanonicalHrpn(d.hrpn);
      if (!key) continue;
      const arr = deductionsByHrpn.get(key) || [];
      arr.push(d);
      deductionsByHrpn.set(key, arr);
    }

    // 2. Generate PDF per employee
    let processed = 0;
    for (let idx = 0; idx < employees.length; idx++) {
      if (signal?.aborted) throw new Error('Export cancelled');

      const emp = employees[idx];
      const hrpnKey = toCanonicalHrpn(emp.hrpn);

      onProgress?.({
        current: idx + 1,
        total: employees.length,
        currentEmployeeName: emp.name || emp.hrpn,
        status: 'generating',
      });

      const empEarnings = earningsByHrpn.get(hrpnKey) || [];
      const empDeductions = deductionsByHrpn.get(hrpnKey) || [];
      const empManualValues = (manualValues && (manualValues[emp.hrpn] || manualValues[hrpnKey])) || {};

      const rows = buildLedgerMatrixRows({
        earnings: empEarnings,
        deductions: empDeductions,
        manualAllowances,
        manualDeductions,
        empManualValues,
        earningColumnOrder,
        deductionColumnOrder,
      });

      const { doc, fileName } = await this.generateEmployeeLedgerPdfDoc({
        officeName,
        financialYear,
        fyLabel,
        employee: emp,
        rows,
        summary: {
          annualGross: rows.find((r) => r.key === 'grossAmount')?.total || 0,
          annualDeductions: rows.find((r) => r.key === 'totalDeductions')?.total || 0,
          netTakeHome: rows.find((r) => r.key === 'netPay')?.total || 0,
        },
      });

      const pdfArrayBuffer = doc.output('arraybuffer');
      zipFolder.file(fileName, pdfArrayBuffer);
      processed++;

      // Yield every 2 items to let the browser re-render UI
      if (idx % 2 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (signal?.aborted) throw new Error('Export cancelled');

    onProgress?.({
      current: employees.length,
      total: employees.length,
      currentEmployeeName: '',
      status: 'zipping',
    });

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFileName = `Employee_Ledgers_FY${fyLabel}.zip`;

    onProgress?.({
      current: employees.length,
      total: employees.length,
      currentEmployeeName: '',
      status: 'completed',
    });

    return { zipBlob, fileName: zipFileName, total: processed };
  },

  /**
   * Export all employee ledger PDFs bundled as a single ZIP file download.
   */
  async exportAllEmployeesLedgerPdfZip(
    options: BulkEmployeeLedgerPdfZipOptions
  ): Promise<{ total: number; fileName: string }> {
    const { zipBlob, fileName, total } = await this.generateAllEmployeesLedgerPdfZip(options);
    const { saveAs } = await import('file-saver');
    saveAs(zipBlob, fileName);
    return { total, fileName };
  },
};

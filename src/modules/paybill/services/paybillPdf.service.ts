import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type {
  PayBillMonthlyEmployeeMatrixReport,
} from '../types';

const fmt = (n: number): string => `Rs. ${(n || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function headerLines(doc: jsPDF, lines: string[]) {
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
  summary: {
    annualGross: number;
    annualDeductions: number;
    netTakeHome: number;
  };
}

export const paybillPdfService = {
  /**
   * Export the monthly employee parameter matrix (earning + deduction columns) as a PDF
   */
  exportMonthlyEmployeeMatrixPdf(
    report: PayBillMonthlyEmployeeMatrixReport,
    title = 'Monthly Employee Parameter Matrix'
  ) {
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
  },

  /**
   * Export the complete 12-Month Employee Ledger Statement as a high-fidelity PDF
   */
  exportEmployeeLedgerPdf(options: EmployeeLedgerPdfExportOptions) {
    const {
      officeName = 'INTENSIVE CATTLE DEVELOPMENT PROJECT (ICDP)',
      financialYear,
      fyLabel,
      employee,
      rows,
    } = options;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 841.89 pt
    const cleanHrpn = (employee.hrpn || '').trim() || 'Employee';

    const marginX = 28;
    const tableWidth = pageWidth - marginX * 2; // 785.89 pt

    // 1. Official Header Block (Clean 2-Line Format)
    doc.setTextColor(30, 58, 138); // Royal Navy 900
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(officeName.toUpperCase(), pageWidth / 2, 22, { align: 'center' });

    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`ANNUAL FINANCIAL STATEMENT — FY ${fyLabel}`, pageWidth / 2, 36, { align: 'center' });

    // Subtle header separator line
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.75);
    doc.line(marginX, 43, marginX + tableWidth, 43);

    // 2. Employee Profile & Metadata Table Box (Refined 2-Column Format)
    const metaY = 48;
    const metaH = 28;
    doc.setFillColor(240, 247, 255); // Soft Ice Blue (Blue 50)
    doc.setDrawColor(191, 219, 254); // Blue 200
    doc.setLineWidth(0.6);
    doc.roundedRect(marginX, metaY, tableWidth, metaH, 2, 2, 'FD');

    // Left Column: Employee Name & Designation (Spacious 430 pt width)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Navy 900
    doc.text('Employee Name:', marginX + 10, metaY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text(employee.name || '—', marginX + 80, metaY + 11, { maxWidth: 430 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('Designation:', marginX + 10, metaY + 23);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(employee.designation || '—', marginX + 80, metaY + 23, { maxWidth: 430 });

    // Right Column: HRPN & Pay Scale
    const rightColX = marginX + 530;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('HRPN:', rightColX, metaY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(employee.hrpn || '—', rightColX + 38, metaY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('Pay Scale:', rightColX, metaY + 23);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(employee.payScale || '—', rightColX + 50, metaY + 23, { maxWidth: 190 });

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

    autoTable(doc, {
      startY: 82,
      margin: { left: marginX, right: marginX, top: 82, bottom: 20 },
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
        fontSize: 7,
        halign: 'center',
        cellPadding: 2.4,
      },
      columnStyles,
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
        lineColor: [226, 232, 240],
        lineWidth: 0.4,
        textColor: [51, 65, 85],
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    const fileName = `Employee_Ledger_${cleanHrpn}_FY${fyLabel}.pdf`;
    doc.save(fileName);
  },
};

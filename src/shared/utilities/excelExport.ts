import type ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { QuarterReport, BudgetHeadReport, TaxReconciliationReport } from '@/modules/payroll/types';
import type { IncomeTaxReport, GSTReport } from '@/modules/parties/types';

interface OfficeHeaderDetails {
  officeName?: string | null;
  subtitle?: string | null;
  address?: string | null;
  tan?: string | null;
  gst?: string | null;
}

// --- Styling Helpers ---
const THEME = {
  headerFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } } as ExcelJS.Fill,
  headerFont: { color: { argb: 'FFFFFFFF' }, bold: true } as ExcelJS.Font,
  titleFont: { size: 14, bold: true } as ExcelJS.Font,
  boldFont: { bold: true } as ExcelJS.Font,
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  } as Partial<ExcelJS.Borders>,
  totalFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } } as ExcelJS.Fill,
  alignCenter: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  alignRight: { horizontal: 'right', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  alignLeft: { horizontal: 'left', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
};

async function saveWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}

async function createWorkbook(): Promise<ExcelJS.Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  return new ExcelJS.Workbook();
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = THEME.headerFill;
    cell.font = THEME.headerFont;
    cell.border = THEME.border;
    cell.alignment = THEME.alignCenter;
  });
}

function applyDataStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.border = THEME.border;
    if (typeof cell.value === 'number') {
      cell.alignment = THEME.alignRight;
      cell.numFmt = '#,##0.00';
    }
  });
}

function applyTotalStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = THEME.totalFill;
    cell.font = THEME.boldFont;
    cell.border = THEME.border;
    if (typeof cell.value === 'number') {
      cell.alignment = THEME.alignRight;
      cell.numFmt = '#,##0.00';
    }
  });
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 12 ? 12 : maxLength + 2;
  });
}

/**
 * Formats and downloads Form 24Q Excel compliance return workbook.
 */
export async function export24QExcel(report: QuarterReport, office?: OfficeHeaderDetails): Promise<void> {
  const officeName = office?.officeName || 'GOVERNMENT OF GUJARAT — ICDP SURAT';
  const tan = office?.tan || 'NOT PROVIDED';
  const address = office?.address || 'Surat, Gujarat';

  const m1 = report.labels[0]?.work || 'Month 1';
  const m2 = report.labels[1]?.work || 'Month 2';
  const m3 = report.labels[2]?.work || 'Month 3';

  const workbook = await createWorkbook();
  const ws = workbook.addWorksheet(`24Q ${report.quarter}`);

  // 24Q-specific palette matching the on-screen report (Income=indigo, Deduction=rose, Total=slate)
  const incomeFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } } as ExcelJS.Fill; // indigo-50
  const incomeFont = { bold: true, color: { argb: 'FF4338CA' } } as ExcelJS.Font; // indigo-700
  const deductionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } } as ExcelJS.Fill; // rose-50
  const deductionFont = { bold: true, color: { argb: 'FFBE123C' } } as ExcelJS.Font; // rose-700
  const groupFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } } as ExcelJS.Fill; // indigo-600
  const deductionGroupFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } } as ExcelJS.Fill; // rose-600
  const slate200 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } as ExcelJS.Fill; // slate-200
  const slate100 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } as ExcelJS.Fill; // slate-100
  const slate50 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } as ExcelJS.Fill; // slate-50

  ws.addRow(['FORM 24Q — DEDUCTION OF TAX FROM SALARIES']).font = THEME.titleFont;
  ws.addRow([`Office Name: ${officeName}`]).font = THEME.boldFont;
  ws.addRow([`TAN: ${tan} | Address: ${address}`]);
  ws.addRow([`Financial Year: ${report.fyLabel} | Assessment Year: ${report.ayLabel} | Quarter: ${report.quarter}`]);
  ws.addRow([]);

  // Grouped header matching the on-screen 24Q report layout
  const header1 = ws.addRow(['S.No', 'Employee Name', 'PAN No.', 'Income', '', '', '', '', 'Deduction', '', '', '']);
  const header2 = ws.addRow([
    '', '', '',
    `Gross (${m1})`, `Gross (${m2})`, `Gross (${m3})`,
    'DA & Other', 'Total Salary',
    `TDS (${m1})`, `TDS (${m2})`, `TDS (${m3})`, 'Total TDS',
  ]);
  const header3 = ws.addRow([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  applyHeaderStyle(header1);
  applyHeaderStyle(header2);
  header3.eachCell((cell) => {
    cell.border = THEME.border;
    cell.alignment = THEME.alignCenter;
    cell.fill = slate50;
  });

  // Color-code the Income / Deduction group bands
  for (let col = 4; col <= 8; col++) {
    const c1 = header1.getCell(col);
    c1.fill = groupFill;
    const c2 = header2.getCell(col);
    c2.fill = incomeFill;
    c2.font = incomeFont;
  }
  for (let col = 9; col <= 12; col++) {
    const c1 = header1.getCell(col);
    c1.fill = deductionGroupFill;
    const c2 = header2.getCell(col);
    c2.fill = deductionFill;
    c2.font = deductionFont;
  }
  // Emphasize the Total Salary / Total TDS header cells like the PDF
  header2.getCell(8).fill = slate200;
  header2.getCell(12).fill = slate200;

  ws.mergeCells(`A${header1.number}:A${header3.number}`);
  ws.mergeCells(`B${header1.number}:B${header3.number}`);
  ws.mergeCells(`C${header1.number}:C${header3.number}`);
  ws.mergeCells(`D${header1.number}:H${header1.number}`);
  ws.mergeCells(`I${header1.number}:L${header1.number}`);

  let sumG1 = 0, sumG2 = 0, sumG3 = 0, sumDA = 0, sumTotal = 0;
  let sumT1 = 0, sumT2 = 0, sumT3 = 0, sumTax = 0;

  report.rows.forEach((r, idx) => {
    const g1 = r.g[0] || 0, g2 = r.g[1] || 0, g3 = r.g[2] || 0;
    const da = r.d || 0, total = r.total || 0;
    const t1 = r.t[0] || 0, t2 = r.t[1] || 0, t3 = r.t[2] || 0;
    const tax = r.tax || 0;

    sumG1 += g1; sumG2 += g2; sumG3 += g3; sumDA += da; sumTotal += total;
    sumT1 += t1; sumT2 += t2; sumT3 += t3; sumTax += tax;

    const row = ws.addRow([idx + 1, r.name, r.pan, g1, g2, g3, da, total, t1, t2, t3, tax]);
    applyDataStyle(row);
  });

  const totalRow = ws.addRow(['TOTAL', '', '', sumG1, sumG2, sumG3, sumDA, sumTotal, sumT1, sumT2, sumT3, sumTax]);
  totalRow.eachCell((cell) => {
    cell.fill = slate100;
    cell.font = THEME.boldFont;
    cell.border = THEME.border;
    if (typeof cell.value === 'number') {
      cell.alignment = THEME.alignRight;
      cell.numFmt = '#,##0.00';
    }
  });
  totalRow.getCell(8).fill = slate200;
  totalRow.getCell(12).fill = slate200;
  ws.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

  // Explicit column widths (names/amounts render predictably, no auto-fit truncation)
  const widths = [6, 34, 16, 14, 14, 14, 14, 14, 14, 14, 14, 14];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Freeze the header block so it stays visible while scrolling data rows
  ws.views = [{ state: 'frozen', ySplit: header3.number }];

  // Print setup: landscape A4, fit-to-width, centered, with print area
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    paperSize: 9, // A4
  };
  ws.pageSetup.margins = { top: 0.4, bottom: 0.4, left: 0.3, right: 0.3, header: 0.2, footer: 0.2 };
  ws.pageSetup.printArea = `A1:L${totalRow.number}`;
  ws.pageSetup.printTitlesRow = `1:${header3.number}`;

  await saveWorkbook(workbook, `Form24Q_${report.quarter}_FY${report.fyLabel}.xlsx`);
}

/**
 * Formats and downloads Form 26Q Excel compliance return workbook (Party/Contractor TDS).
 */
export async function export26QExcel(report: IncomeTaxReport, office?: OfficeHeaderDetails): Promise<void> {
  const officeName = office?.officeName || 'GOVERNMENT OF GUJARAT — ICDP SURAT';
  const tan = office?.tan || 'NOT PROVIDED';
  const address = office?.address || 'Surat, Gujarat';

  const workbook = await createWorkbook();
  const ws = workbook.addWorksheet(`26Q ${report.quarter}`);

  ws.addRow(['FORM 26Q — DEDUCTION OF TAX AT SOURCE (NON-SALARY PAYMENTS)']).font = THEME.titleFont;
  ws.addRow([`Office Name: ${officeName}`]).font = THEME.boldFont;
  ws.addRow([`TAN: ${tan} | Address: ${address}`]);
  ws.addRow([`Financial Year: ${report.fy}-${String(report.fy + 1).slice(-2)} | Quarter: ${report.quarter}`]);
  ws.addRow([]);

  const headerRow = ws.addRow([
    'S.No', 'Party / Vendor Name', 'PAN', 'Bill / Invoice No',
    'Payment Date', 'Gross Amount Paid (₹)', 'TDS / Income Tax Deducted (₹)',
  ]);
  applyHeaderStyle(headerRow);

  let sumAmount = 0, sumTds = 0;
  report.rows.forEach((r, idx) => {
    sumAmount += r.amount || 0;
    sumTds += r.incomeTax || 0;
    const row = ws.addRow([idx + 1, r.partyName, r.panNo, r.billNo, r.date, r.amount, r.incomeTax]);
    applyDataStyle(row);
  });

  const totalRow = ws.addRow(['TOTAL', '', '', '', '', sumAmount, sumTds]);
  applyTotalStyle(totalRow);
  ws.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

  autoFitColumns(ws);
  await saveWorkbook(workbook, `Form26Q_${report.quarter}_FY${report.fy}.xlsx`);
}

/**
 * Formats and downloads GST Purchase & TDS Statement Excel workbook.
 */
export async function exportGSTExcel(report: GSTReport, office?: OfficeHeaderDetails): Promise<void> {
  const officeName = office?.officeName || 'GOVERNMENT OF GUJARAT — ICDP SURAT';
  const gst = office?.gst || 'NOT PROVIDED';

  const workbook = await createWorkbook();
  const ws = workbook.addWorksheet(`GST ${report.quarter}`);

  ws.addRow(['GST PURCHASE & TAX DEDUCTION STATEMENT']).font = THEME.titleFont;
  ws.addRow([`Office Name: ${officeName}`]).font = THEME.boldFont;
  ws.addRow([`GSTIN: ${gst}`]);
  ws.addRow([`Financial Year: ${report.fy}-${String(report.fy + 1).slice(-2)} | Quarter: ${report.quarter}`]);
  ws.addRow([]);

  const headerRow = ws.addRow([
    'S.No', 'Vendor / Party Name', 'GSTIN', 'CPIN / Challan No',
    'Bill No', 'Date', 'Taxable Amount (₹)', 'CGST (₹)', 'SGST (₹)',
    'IGST (₹)', 'Total GST (₹)',
  ]);
  applyHeaderStyle(headerRow);

  report.rows.forEach((r, idx) => {
    const row = ws.addRow([
      idx + 1, r.partyName, r.gstNo, r.cpinNo, r.billNo, r.date,
      r.amount, r.cgst, r.sgst, r.igst, r.totalGst,
    ]);
    applyDataStyle(row);
  });

  const t = report.totals;
  const totalRow = ws.addRow(['TOTAL', '', '', '', '', '', t.amount, t.cgst, t.sgst, t.igst, t.totalGst]);
  applyTotalStyle(totalRow);
  ws.mergeCells(`A${totalRow.number}:F${totalRow.number}`);

  autoFitColumns(ws);
  await saveWorkbook(workbook, `GST_Statement_${report.quarter}_FY${report.fy}.xlsx`);
}

/**
 * Formats and downloads Budget Head Wise Salary Statement Excel workbook.
 */
export async function exportBudgetHeadExcel(report: BudgetHeadReport, office?: OfficeHeaderDetails): Promise<void> {
  const officeName = office?.officeName || 'GOVERNMENT OF GUJARAT — ICDP SURAT';
  const tan = office?.tan || 'NOT PROVIDED';
  const address = office?.address || 'Surat, Gujarat';
  const fyLabel = `${report.fy}-${String(report.fy + 1).slice(-2)}`;

  const workbook = await createWorkbook();

  // ==========================================
  // Sheet 1: Quarter-wise Summary (Table 1)
  // ==========================================
  const ws1 = workbook.addWorksheet('Quarterly Summary');
  ws1.addRow(['BUDGET HEAD WISE SALARY STATEMENT — QUARTERLY SUMMARY']).font = THEME.titleFont;
  ws1.addRow([`Office Name: ${officeName}`]).font = THEME.boldFont;
  ws1.addRow([`TAN: ${tan} | Address: ${address}`]);
  ws1.addRow([`Financial Year: ${fyLabel} | Assessment Year: ${report.fy + 1}-${String(report.fy + 2).slice(-2)}`]);
  ws1.addRow([]);

  const h1 = ws1.addRow([
    'Budget Head Code', 'Budget Head Name',
    'Q1 (Apr-Jun)', '', 'Q2 (Jul-Sep)', '',
    'Q3 (Oct-Dec)', '', 'Q4 (Jan-Mar)', '',
    'FY Total', ''
  ]);
  const h2 = ws1.addRow([
    '', '',
    'Gross (₹)', 'IT (₹)', 'Gross (₹)', 'IT (₹)',
    'Gross (₹)', 'IT (₹)', 'Gross (₹)', 'IT (₹)',
    'Gross (₹)', 'IT (₹)'
  ]);

  applyHeaderStyle(h1);
  applyHeaderStyle(h2);

  ws1.mergeCells(`A${h1.number}:A${h2.number}`);
  ws1.mergeCells(`B${h1.number}:B${h2.number}`);
  ws1.mergeCells(`C${h1.number}:D${h1.number}`);
  ws1.mergeCells(`E${h1.number}:F${h1.number}`);
  ws1.mergeCells(`G${h1.number}:H${h1.number}`);
  ws1.mergeCells(`I${h1.number}:J${h1.number}`);
  ws1.mergeCells(`K${h1.number}:L${h1.number}`);

  let totalFYGross = 0;
  let totalFYIT = 0;

  report.groups.forEach((g) => {
    const q1Gross = g.quarters[0].gross + g.quarters[0].da;
    const q1IT = g.quarters[0].tax;
    const q2Gross = g.quarters[1].gross + g.quarters[1].da;
    const q2IT = g.quarters[1].tax;
    const q3Gross = g.quarters[2].gross + g.quarters[2].da;
    const q3IT = g.quarters[2].tax;
    const q4Gross = g.quarters[3].gross + g.quarters[3].da;
    const q4IT = g.quarters[3].tax;
    const fyGross = g.totals.gross + g.totals.da;
    const fyIT = g.totals.tax;

    totalFYGross += fyGross;
    totalFYIT += fyIT;

    const row = ws1.addRow([
      g.code || 'UNASSIGNED', g.name,
      q1Gross, q1IT, q2Gross, q2IT, q3Gross, q3IT, q4Gross, q4IT, fyGross, fyIT
    ]);
    applyDataStyle(row);
  });

  const t1GrandTotalRow: Array<string | number> = ['TOTAL', 'GRAND TOTAL'];
  for (let qi = 0; qi < 4; qi++) {
    const qGross = report.groups.reduce((acc, g) => acc + g.quarters[qi].gross + g.quarters[qi].da, 0);
    const qIT = report.groups.reduce((acc, g) => acc + g.quarters[qi].tax, 0);
    t1GrandTotalRow.push(qGross, qIT);
  }
  t1GrandTotalRow.push(totalFYGross, totalFYIT);
  
  const tr1 = ws1.addRow(t1GrandTotalRow);
  applyTotalStyle(tr1);
  ws1.mergeCells(`A${tr1.number}:B${tr1.number}`);
  autoFitColumns(ws1);

  // ==========================================
  // Sheet 2: Month-wise Detail (Table 2)
  // ==========================================
  const ws2 = workbook.addWorksheet('Monthly Detail');
  ws2.addRow(['BUDGET HEAD WISE SALARY STATEMENT — MONTHLY DETAIL']).font = THEME.titleFont;
  ws2.addRow([`Office Name: ${officeName}`]).font = THEME.boldFont;
  ws2.addRow([`TAN: ${tan} | Address: ${address}`]);
  ws2.addRow([`Financial Year: ${fyLabel}`]);
  ws2.addRow([]);

  const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'];
  const QUARTER_MONTHS = ['Mar-May', 'Jun-Aug', 'Sep-Nov', 'Dec-Feb'];

  for (let qi = 0; qi < 4; qi++) {
    const startMonth = qi * 3;
    const m1 = report.monthLabels[startMonth];
    const m2 = report.monthLabels[startMonth + 1];
    const m3 = report.monthLabels[startMonth + 2];

    const qTitleRow = ws2.addRow([`${QUARTER_NAMES[qi]} (${QUARTER_MONTHS[qi]})`]);
    qTitleRow.font = THEME.boldFont;
    qTitleRow.fill = THEME.totalFill; // Highlight quarter title

    const h1Row = ws2.addRow([
      'Budget Head Code', 'Budget Head Name',
      m1, '', m2, '', m3, '',
      `${QUARTER_NAMES[qi]} Total`, ''
    ]);
    const h2Row = ws2.addRow([
      '', '',
      'Gross (₹)', 'IT (₹)', 'Gross (₹)', 'IT (₹)', 'Gross (₹)', 'IT (₹)',
      'Gross (₹)', 'IT (₹)'
    ]);

    applyHeaderStyle(h1Row);
    applyHeaderStyle(h2Row);

    ws2.mergeCells(`A${h1Row.number}:A${h2Row.number}`);
    ws2.mergeCells(`B${h1Row.number}:B${h2Row.number}`);
    ws2.mergeCells(`C${h1Row.number}:D${h1Row.number}`);
    ws2.mergeCells(`E${h1Row.number}:F${h1Row.number}`);
    ws2.mergeCells(`G${h1Row.number}:H${h1Row.number}`);
    ws2.mergeCells(`I${h1Row.number}:J${h1Row.number}`);

    report.groups.forEach((g) => {
      const c1 = g.months[startMonth];
      const c2 = g.months[startMonth + 1];
      const c3 = g.months[startMonth + 2];
      const q = g.quarters[qi];

      const row = ws2.addRow([
        g.code || 'UNASSIGNED', g.name,
        c1.gross + c1.da, c1.tax,
        c2.gross + c2.da, c2.tax,
        c3.gross + c3.da, c3.tax,
        q.gross + q.da, q.tax
      ]);
      applyDataStyle(row);
    });

    const qGrandTotalRow: Array<string | number> = ['TOTAL', 'GRAND TOTAL'];
    for (let mi = 0; mi < 3; mi++) {
      const monthIdx = startMonth + mi;
      const mGross = report.groups.reduce((acc, g) => acc + g.months[monthIdx].gross + g.months[monthIdx].da, 0);
      const mIT = report.groups.reduce((acc, g) => acc + g.months[monthIdx].tax, 0);
      qGrandTotalRow.push(mGross, mIT);
    }
    const qtGross = report.groups.reduce((acc, g) => acc + g.quarters[qi].gross + g.quarters[qi].da, 0);
    const qtIT = report.groups.reduce((acc, g) => acc + g.quarters[qi].tax, 0);
    qGrandTotalRow.push(qtGross, qtIT);

    const tr2 = ws2.addRow(qGrandTotalRow);
    applyTotalStyle(tr2);
    ws2.mergeCells(`A${tr2.number}:B${tr2.number}`);
    
    ws2.addRow([]); // Spacing
  }

  autoFitColumns(ws2);
  await saveWorkbook(workbook, `BudgetHead_Statement_FY${fyLabel}.xlsx`);
}

/**
 * Formats and downloads Employee Income Tax Reconciliation Excel return workbook.
 */
export async function exportTaxReconciliationExcel(
  report: TaxReconciliationReport,
  office?: OfficeHeaderDetails
): Promise<void> {
  const officeName = office?.officeName || 'GOVERNMENT OF GUJARAT — ICDP SURAT';
  const tan = office?.tan || 'NOT PROVIDED';
  const address = office?.address || 'Surat, Gujarat';

  const workbook = await createWorkbook();
  const ws = workbook.addWorksheet(`Tax Reconciliation ${report.quarter}`);

  // Styles
  const greenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } } as ExcelJS.Fill; // green-100
  const greenFont = { bold: true, color: { argb: 'FF15803D' } } as ExcelJS.Font; // green-700
  const roseFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } } as ExcelJS.Fill; // rose-100
  const roseFont = { bold: true, color: { argb: 'FFBE123C' } } as ExcelJS.Font; // rose-700
  const amberFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } } as ExcelJS.Fill; // amber-100
  const amberFont = { bold: true, color: { argb: 'FFB45309' } } as ExcelJS.Font; // amber-700
  const slateFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } as ExcelJS.Fill; // slate-100

  // Title Block
  ws.addRow(['EMPLOYEE INCOME TAX RECONCILIATION STATEMENT (PAYBILL VS PAYROLL)']).font = THEME.titleFont;
  ws.addRow([`Office Name: ${officeName}`]).font = THEME.boldFont;
  ws.addRow([`TAN: ${tan} | Address: ${address}`]);
  ws.addRow([`Financial Year: ${report.fyLabel} | Quarter: ${report.quarter} (${report.quarterMonths.join(', ')})`]);
  ws.addRow([]);

  // Summary Metrics Card Row
  const s = report.summary;
  const sumRow1 = ws.addRow([
    'Total Employees:', s.totalEmployees,
    'Matched:', s.matchedCount,
    'Tax Mismatch:', s.taxMismatchCount,
    'Missing in Payroll:', s.missingInPayrollCount,
    'Paybill Total TDS (₹):', s.totalPaybillTax,
    'Payroll Total TDS (₹):', s.totalPayrollTax,
    'Net Tax Diff (₹):', s.netTaxDiff,
  ]);
  sumRow1.font = THEME.boldFont;
  sumRow1.eachCell((cell) => {
    cell.fill = slateFill;
    cell.border = THEME.border;
  });
  ws.addRow([]);

  // Grouped Header
  const m1 = report.monthLabels[0] || { work: 'M1', paid: 'M1' };
  const m2 = report.monthLabels[1] || { work: 'M2', paid: 'M2' };
  const m3 = report.monthLabels[2] || { work: 'M3', paid: 'M3' };

  const h1 = ws.addRow([
    'Sr.', 'HRPN', 'Employee Name', 'PAN No.',
    `Month 1: ${m1.work} (paid in ${m1.paid})`, '', '', '', '', '',
    `Month 2: ${m2.work} (paid in ${m2.paid})`, '', '', '', '', '',
    `Month 3: ${m3.work} (paid in ${m3.paid})`, '', '', '', '', '',
    'Quarterly Gross Salary', '', '',
    'Quarterly Tax (TDS)', '', '',
    'Reconciliation Status',
  ]);

  const h2 = ws.addRow([
    '', '', '', '',
    'PB Gross', 'PR Gross', 'Gross Diff', 'PB IT', 'PR IT', 'Tax Diff',
    'PB Gross', 'PR Gross', 'Gross Diff', 'PB IT', 'PR IT', 'Tax Diff',
    'PB Gross', 'PR Gross', 'Gross Diff', 'PB IT', 'PR IT', 'Tax Diff',
    'Paybill Gross', 'Payroll Gross', 'Net Gross Diff',
    'Paybill Total', 'Payroll Total', 'Net Tax Diff',
    '',
  ]);

  applyHeaderStyle(h1);
  applyHeaderStyle(h2);

  ws.mergeCells(`A${h1.number}:A${h2.number}`);
  ws.mergeCells(`B${h1.number}:B${h2.number}`);
  ws.mergeCells(`C${h1.number}:C${h2.number}`);
  ws.mergeCells(`D${h1.number}:D${h2.number}`);
  ws.mergeCells(`E${h1.number}:J${h1.number}`);
  ws.mergeCells(`K${h1.number}:P${h1.number}`);
  ws.mergeCells(`Q${h1.number}:V${h1.number}`);
  ws.mergeCells(`W${h1.number}:Y${h1.number}`);
  ws.mergeCells(`Z${h1.number}:AB${h1.number}`);
  ws.mergeCells(`AC${h1.number}:AC${h2.number}`);

  // Data Rows
  report.rows.forEach((r, idx) => {
    const m = r.months;
    const row = ws.addRow([
      idx + 1,
      r.hrpn,
      r.employeeName,
      r.pan,
      m[0].paybillGross, m[0].payrollGross, m[0].grossDiff, m[0].paybillTax, m[0].payrollTax, m[0].taxDiff,
      m[1].paybillGross, m[1].payrollGross, m[1].grossDiff, m[1].paybillTax, m[1].payrollTax, m[1].taxDiff,
      m[2].paybillGross, m[2].payrollGross, m[2].grossDiff, m[2].paybillTax, m[2].payrollTax, m[2].taxDiff,
      r.quarterPaybillGross, r.quarterPayrollGross, r.quarterGrossDiff,
      r.quarterPaybillTax, r.quarterPayrollTax, r.quarterTaxDiff,
      r.status,
    ]);

    applyDataStyle(row);

    // Color code monthly and total diff cells (Gross Diff: 7, 13, 19, 25; Tax Diff: 10, 16, 22, 28)
    const taxDiffCols = [10, 16, 22, 28];
    taxDiffCols.forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      const val = Number(cell.value) || 0;
      if (Math.abs(val) > 0.01) {
        cell.fill = roseFill;
        cell.font = roseFont;
      }
    });

    const grossDiffCols = [7, 13, 19, 25];
    grossDiffCols.forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      const val = Number(cell.value) || 0;
      if (Math.abs(val) > 0.01) {
        cell.fill = amberFill;
        cell.font = amberFont;
      }
    });

    // Color code status column (Col 29 / AC)
    const statusCell = row.getCell(29);
    if (r.status === 'MATCHED') {
      statusCell.fill = greenFill;
      statusCell.font = greenFont;
    } else if (r.status === 'TAX_MISMATCH') {
      statusCell.fill = roseFill;
      statusCell.font = roseFont;
    } else if (r.status === 'GROSS_MISMATCH') {
      statusCell.fill = amberFill;
      statusCell.font = amberFont;
    } else if (r.status === 'MISSING_IN_PAYROLL' || r.status === 'MISSING_IN_PAYBILL') {
      statusCell.fill = amberFill;
      statusCell.font = amberFont;
    } else {
      statusCell.fill = slateFill;
    }
  });

  // Grand Total Row
  const totalRow = ws.addRow([
    'TOTAL', '', '', '',
    report.rows.reduce((s, r) => s + r.months[0].paybillGross, 0),
    report.rows.reduce((s, r) => s + r.months[0].payrollGross, 0),
    report.rows.reduce((s, r) => s + r.months[0].grossDiff, 0),
    report.rows.reduce((s, r) => s + r.months[0].paybillTax, 0),
    report.rows.reduce((s, r) => s + r.months[0].payrollTax, 0),
    report.rows.reduce((s, r) => s + r.months[0].taxDiff, 0),

    report.rows.reduce((s, r) => s + r.months[1].paybillGross, 0),
    report.rows.reduce((s, r) => s + r.months[1].payrollGross, 0),
    report.rows.reduce((s, r) => s + r.months[1].grossDiff, 0),
    report.rows.reduce((s, r) => s + r.months[1].paybillTax, 0),
    report.rows.reduce((s, r) => s + r.months[1].payrollTax, 0),
    report.rows.reduce((s, r) => s + r.months[1].taxDiff, 0),

    report.rows.reduce((s, r) => s + r.months[2].paybillGross, 0),
    report.rows.reduce((s, r) => s + r.months[2].payrollGross, 0),
    report.rows.reduce((s, r) => s + r.months[2].grossDiff, 0),
    report.rows.reduce((s, r) => s + r.months[2].paybillTax, 0),
    report.rows.reduce((s, r) => s + r.months[2].payrollTax, 0),
    report.rows.reduce((s, r) => s + r.months[2].taxDiff, 0),

    s.totalPaybillGross,
    s.totalPayrollGross,
    s.netGrossDiff,

    s.totalPaybillTax,
    s.totalPayrollTax,
    s.netTaxDiff,
    '',
  ]);
  applyTotalStyle(totalRow);
  ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);

  autoFitColumns(ws);
  await saveWorkbook(workbook, `Tax_Reconciliation_${report.quarter}_FY${report.fyLabel}.xlsx`);
}



import type ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type {
  PayBillAllowanceMatrixReport,
  PayBillMonthlyEmployeeMatrixReport,
} from '../types';

const THEME = {
  headerFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Blue 800
  } as ExcelJS.Fill,
  headerFont: {
    name: 'Segoe UI',
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 11,
  } as ExcelJS.Font,
  quarterFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Slate 100
  } as ExcelJS.Fill,
  quarterFont: {
    name: 'Segoe UI',
    bold: true,
    size: 10,
    color: { argb: 'FF334155' },
  } as ExcelJS.Font,
  totalFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD1FAE5' }, // Emerald 100
  } as ExcelJS.Fill,
  totalFont: {
    name: 'Segoe UI',
    bold: true,
    size: 11,
    color: { argb: 'FF065F46' },
  } as ExcelJS.Font,
  cellBorder: {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  } as Partial<ExcelJS.Borders>,
  alignCenter: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  alignRight: { horizontal: 'right', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  alignLeft: { horizontal: 'left', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
};

async function createWorkbook(): Promise<ExcelJS.Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  return new ExcelJS.Workbook();
}

async function saveWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}

class PayBillExcelService {
  /**
   * Export 12-Month Allowance Matrix to a formatted Excel workbook (.xlsx)
   */
  async exportAllowanceMatrixToExcel(
    report: PayBillAllowanceMatrixReport,
    fyLabel: string,
    officeName = 'Intensive Cattle Development Project (ICDP)'
  ): Promise<void> {
    const workbook = await createWorkbook();
    const sheet = workbook.addWorksheet('12-Month Allowance Matrix', {
      pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4
    });

    // 1. Office & Title Banner
    sheet.mergeCells('A1:R1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = officeName.toUpperCase();
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = THEME.alignCenter;
    sheet.getRow(1).height = 24;

    sheet.mergeCells('A2:R2');
    const subtitleCell = sheet.getCell('A2');
    const empSub = report.hrpn
      ? `Employee: ${report.employeeName || ''} (HRPN: ${report.hrpn})`
      : 'All Employees Consolidated';
    subtitleCell.value = `ANNUAL SALARY & ALLOWANCE MATRIX STATEMENT — FINANCIAL YEAR ${fyLabel} (${empSub})`;
    subtitleCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF475569' } };
    subtitleCell.alignment = THEME.alignCenter;
    sheet.getRow(2).height = 20;

    // Blank row
    sheet.getRow(3).height = 8;

    // 2. Table Column Headers
    const headers = [
      'Allowance Parameter',
      'March',
      'April',
      'May',
      'Q1 Total',
      'June',
      'July',
      'August',
      'Q2 Total',
      'September',
      'October',
      'November',
      'Q3 Total',
      'December',
      'January',
      'February',
      'Q4 Total',
      'Annual Total',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell, colNum) => {
      cell.fill = THEME.headerFill;
      cell.font = THEME.headerFont;
      cell.alignment = colNum === 1 ? THEME.alignLeft : THEME.alignCenter;
      cell.border = THEME.cellBorder;
    });

    // 3. Allowance Data Rows
    for (const row of report.rows) {
      const isGross =
        row.key === 'gross_amount' ||
        row.key === 'grossAmount' ||
        row.parameter.toLowerCase().includes('gross');

      const rowValues = [
        row.parameter,
        row.months.March || 0,
        row.months.April || 0,
        row.months.May || 0,
        row.q1 || 0,
        row.months.June || 0,
        row.months.July || 0,
        row.months.August || 0,
        row.q2 || 0,
        row.months.September || 0,
        row.months.October || 0,
        row.months.November || 0,
        row.q3 || 0,
        row.months.December || 0,
        row.months.January || 0,
        row.months.February || 0,
        row.q4 || 0,
        row.total || 0,
      ];

      const excelRow = sheet.addRow(rowValues);
      excelRow.height = isGross ? 24 : 20;

      excelRow.eachCell((cell, colNum) => {
        cell.border = THEME.cellBorder;

        if (colNum === 1) {
          cell.alignment = THEME.alignLeft;
          cell.font = isGross ? THEME.totalFont : { name: 'Segoe UI', size: 10 };
          if (isGross) cell.fill = THEME.totalFill;
        } else {
          cell.alignment = THEME.alignRight;
          cell.numFmt = '₹ #,##0';

          const isQuarterCol = [5, 9, 13, 17].includes(colNum);
          const isTotalCol = colNum === 18;

          if (isGross) {
            cell.fill = THEME.totalFill;
            cell.font = THEME.totalFont;
          } else if (isTotalCol) {
            cell.fill = THEME.totalFill;
            cell.font = THEME.totalFont;
          } else if (isQuarterCol) {
            cell.fill = THEME.quarterFill;
            cell.font = THEME.quarterFont;
          } else {
            cell.font = { name: 'Segoe UI', size: 10 };
          }
        }
      });
    }

    // 4. Auto-fit column widths
    sheet.columns.forEach((col, idx) => {
      if (idx === 0) {
        col.width = 30;
      } else {
        col.width = 14;
      }
    });

    const filePrefix = report.hrpn ? `PayBill_${report.hrpn}` : 'PayBill_Consolidated';
    await saveWorkbook(workbook, `${filePrefix}_Matrix_FY${fyLabel}.xlsx`);
  }

  /**
   * Export the monthly employee parameter matrix (earning + deduction columns) to Excel
   */
  async exportMonthlyEmployeeMatrixToExcel(
    report: PayBillMonthlyEmployeeMatrixReport,
    fyLabel: string,
    officeName = 'Intensive Cattle Development Project (ICDP)'
  ): Promise<void> {
    const workbook = await createWorkbook();
    const sheet = workbook.addWorksheet(`PayBill Matrix ${report.month}`, {
      pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4
    });

    const earningCols = report.columns.filter((c) => c.group === 'EARNING');
    const totalCols = report.columns.length; // excludes the Employee column
    const lastCol = totalCols + 1; // A = Employee, B.. = parameters

    // 1. Office & Title Banner
    sheet.mergeCells(1, 1, 1, lastCol);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = officeName.toUpperCase();
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = THEME.alignCenter;
    sheet.getRow(1).height = 24;

    sheet.mergeCells(2, 1, 2, lastCol);
    const subtitleCell = sheet.getCell(2, 1);
    subtitleCell.value = `MONTHLY SALARY & ALLOWANCE PARAMETER MATRIX — ${report.month.toUpperCase()}, FINANCIAL YEAR ${fyLabel}`;
    subtitleCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF475569' } };
    subtitleCell.alignment = THEME.alignCenter;
    sheet.getRow(2).height = 20;

    // Blank row
    sheet.getRow(3).height = 8;

    // 2. Group Header Row (EARNING / DEDUCTION)
    const groupRow = sheet.getRow(4);
    const employeeGroupCell = groupRow.getCell(1);
    employeeGroupCell.value = 'Employee';
    employeeGroupCell.fill = THEME.headerFill;
    employeeGroupCell.font = THEME.headerFont;
    employeeGroupCell.alignment = THEME.alignLeft;
    employeeGroupCell.border = THEME.cellBorder;

    sheet.mergeCells(4, 2, 4, 1 + earningCols.length);
    const earningGroupCell = groupRow.getCell(2);
    earningGroupCell.value = 'EARNING (Rs.)';
    earningGroupCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    } as ExcelJS.Fill;
    earningGroupCell.font = THEME.headerFont;
    earningGroupCell.alignment = THEME.alignCenter;
    groupRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = THEME.cellBorder;
    });

    sheet.mergeCells(4, 2 + earningCols.length, 4, lastCol);
    const deductionGroupCell = groupRow.getCell(2 + earningCols.length);
    deductionGroupCell.value = 'DEDUCTION (Rs.)';
    deductionGroupCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB91C1C' },
    } as ExcelJS.Fill;
    deductionGroupCell.font = THEME.headerFont;
    deductionGroupCell.alignment = THEME.alignCenter;
    groupRow.height = 22;

    // 3. Column Label Row
    const labelRow = sheet.addRow([
      'HRPN',
      ...report.columns.map((c) => c.label),
    ]);
    labelRow.height = 24;
    labelRow.eachCell((cell, colNum) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF64748B' },
      } as ExcelJS.Fill;
      cell.font = {
        name: 'Segoe UI',
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 10,
      };
      cell.alignment = colNum === 1 ? THEME.alignLeft : THEME.alignCenter;
      cell.border = THEME.cellBorder;
    });

    // 4. Employee Rows
    for (const row of report.rows) {
      const excelRow = sheet.addRow([
        `${row.employeeName} (${row.hrpn})`,
        ...report.columns.map((c) => row.values[c.key] || 0),
      ]);
      excelRow.height = 20;

      excelRow.eachCell((cell, colNum) => {
        cell.border = THEME.cellBorder;

        if (colNum === 1) {
          cell.alignment = THEME.alignLeft;
          cell.font = { name: 'Segoe UI', size: 10 };
        } else {
          cell.alignment = THEME.alignRight;
          cell.numFmt = '₹ #,##0';
          cell.font = { name: 'Segoe UI', size: 10 };
        }
      });
    }

    // 5. Total Row
    const totalRow = sheet.addRow([
      'Total',
      ...report.columns.map((c) => report.totals[c.key] || 0),
    ]);
    totalRow.height = 22;
    totalRow.eachCell((cell, colNum) => {
      cell.fill = THEME.totalFill;
      cell.font = THEME.totalFont;
      cell.border = THEME.cellBorder;
      cell.alignment = colNum === 1 ? THEME.alignLeft : THEME.alignRight;
      if (colNum > 1) cell.numFmt = '₹ #,##0';
    });

    // 6. Auto-fit column widths
    sheet.columns.forEach((col, idx) => {
      col.width = idx === 0 ? 42 : 14;
    });

    const filePrefix = `PayBill_Matrix_${report.month}_FY${fyLabel}`;
    await saveWorkbook(workbook, `${filePrefix}.xlsx`);
  }

  /**
   * Export Annual Salary Statement (Form 16 / IT calculation preparation)
   */
  async exportAnnualSalaryStatementToExcel(
    report: PayBillAllowanceMatrixReport,
    _employeeName: string,
    _hrpn: string,
    fyLabel: string,
    officeName = 'Intensive Cattle Development Project (ICDP)'
  ): Promise<void> {
    await this.exportAllowanceMatrixToExcel(report, fyLabel, officeName);
  }
}

export const paybillExcelService = new PayBillExcelService();

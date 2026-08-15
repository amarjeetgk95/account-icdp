import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type {
  PayBillStoredEarning,
  PayBillStoredDeduction,
  PayBillAllowanceMatrixReport,
  PayBillParameterMatrixRow,
  PayBillMonthlyEmployeeMatrixReport,
} from '../types';

type PdfWithTableMeta = jsPDF & { lastAutoTable?: { finalY?: number } };

interface MonthlyPdfOptions {
  month: string;
  financialYear: number;
  billNo: string;
  majorHead?: string | null;
  voucherNo?: string;
  earnings: PayBillStoredEarning[];
  deductions?: PayBillStoredDeduction[];
}

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

function sum(list: PayBillStoredEarning[], pick: (r: PayBillStoredEarning) => number): number {
  return list.reduce((acc, r) => acc + (pick(r) || 0), 0);
}

function sumDed(list: PayBillStoredDeduction[], pick: (r: PayBillStoredDeduction) => number): number {
  return list.reduce((acc, r) => acc + (pick(r) || 0), 0);
}

export const paybillPdfService = {
  /**
   * Export the monthly pay bill summary (earning side + deduction side + totals) as a PDF.
   * Note: standard PDF fonts cannot render the Rupee symbol, so amounts use "Rs." prefix.
   */
  exportMonthlyBillPdf(options: MonthlyPdfOptions) {
    const { month, financialYear, billNo, majorHead, voucherNo, earnings, deductions } = options;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const y = headerLines(doc, [
      'PAY BILL SUMMARY',
      `Month: ${month}  |  Financial Year: ${financialYear}  |  Bill No: ${billNo || '-'}  |  Major Head: ${majorHead || '-'}`,
      voucherNo ? `Ledger Voucher No: ${voucherNo}` : '',
    ]);

    let cursorY = y + 6;

    const totalBasic = sum(earnings, (r) => r.basicPay);
    const totalDa = sum(earnings, (r) => r.da);
    const totalHra = sum(earnings, (r) => r.hra);
    const totalCla = sum(earnings, (r) => r.cla);
    const totalMed = sum(earnings, (r) => r.medicalAllowance);
    const totalTrans = sum(earnings, (r) => r.transportAllowance);
    const totalSpecial = sum(earnings, (r) => r.specialPay || 0);
    const totalWashing = sum(earnings, (r) => r.washingAllowance || 0);
    const totalNpp = sum(earnings, (r) => r.nppAllowance);
    const totalGross = sum(earnings, (r) => r.grossAmount);

    if (earnings.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text('EARNING SIDE', 40, cursorY);
      cursorY += 4;

      autoTable(doc, {
        startY: cursorY,
        head: [['HRPN', 'Employee Name', 'Designation', 'Basic Pay', 'DA', 'HRA', 'CLA', 'Med', 'Trans', 'Special', 'Washing', 'NPP', 'Gross Amt']],
        body: earnings.map((r) => [
          r.hrpn,
          r.employeeName,
          r.designation || '-',
          fmt(r.basicPay),
          fmt(r.da),
          fmt(r.hra),
          fmt(r.cla),
          fmt(r.medicalAllowance),
          fmt(r.transportAllowance),
          fmt(r.specialPay || 0),
          fmt(r.washingAllowance || 0),
          fmt(r.nppAllowance),
          fmt(r.grossAmount),
        ]),
        foot: [['Total', '', '', fmt(totalBasic), fmt(totalDa), fmt(totalHra), fmt(totalCla), fmt(totalMed), fmt(totalTrans), fmt(totalSpecial), fmt(totalWashing), fmt(totalNpp), fmt(totalGross)]],
        theme: 'grid',
        headStyles: { fillColor: [31, 58, 95], fontSize: 8 },
        footStyles: { fillColor: [222, 226, 230], textColor: [20, 20, 20], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        styles: { cellPadding: 2.5, lineColor: [200, 200, 200] },
      });

      const tbl = (doc as PdfWithTableMeta).lastAutoTable;
      cursorY = tbl && tbl.finalY ? tbl.finalY + 24 : cursorY + 160;
    }

    if (deductions && deductions.length > 0) {
      const totalIncomeTax = sumDed(deductions, (r) => r.incomeTax);
      const totalProfTax = sumDed(deductions, (r) => r.profTax);
      const totalHba = sumDed(deductions, (r) => r.hbaInterest);
      const totalGpf = sumDed(deductions, (r) => r.gpfRegular);
      const totalGpf4 = sumDed(deductions, (r) => r.gpfClass4);
      const totalNps = sumDed(deductions, (r) => r.npsRegular);
      const totalFund = sumDed(deductions, (r) => r.gisGovtFund);
      const totalSaving = sumDed(deductions, (r) => r.gisGovtSaving);
      const totalDed = sumDed(deductions, (r) => r.totalDeductions);
      const totalNet = sumDed(deductions, (r) => r.netPay);

      if (cursorY > 420) {
        doc.addPage('a4', 'landscape');
        cursorY = 50;
      }

      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text('DEDUCTION SIDE', 40, cursorY);
      cursorY += 4;

      autoTable(doc, {
        startY: cursorY,
        head: [['HRPN', 'Employee Name', 'Income Tax', 'Prof Tax', 'HBA Int', 'GPF', 'GPF C4', 'NPS', 'Govt Fund', 'Govt Sav', 'Total Ded', 'Net Pay']],
        body: deductions.map((r) => [
          r.hrpn,
          r.employeeName,
          fmt(r.incomeTax),
          fmt(r.profTax),
          fmt(r.hbaInterest),
          fmt(r.gpfRegular),
          fmt(r.gpfClass4),
          fmt(r.npsRegular),
          fmt(r.gisGovtFund),
          fmt(r.gisGovtSaving),
          fmt(r.totalDeductions),
          fmt(r.netPay),
        ]),
        foot: [['Total', '', fmt(totalIncomeTax), fmt(totalProfTax), fmt(totalHba), fmt(totalGpf), fmt(totalGpf4), fmt(totalNps), fmt(totalFund), fmt(totalSaving), fmt(totalDed), fmt(totalNet)]],
        theme: 'grid',
        headStyles: { fillColor: [31, 58, 95], fontSize: 8 },
        footStyles: { fillColor: [222, 226, 230], textColor: [20, 20, 20], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        styles: { cellPadding: 2.5, lineColor: [200, 200, 200] },
      });

      const tbl = (doc as PdfWithTableMeta).lastAutoTable;
      cursorY = tbl && tbl.finalY ? tbl.finalY + 20 : cursorY + 150;

      doc.setFontSize(9);
      doc.setTextColor(20);
      doc.text(
        `Net Payable: ${fmt(totalNet)}  |  Gross Pay: ${fmt(totalGross)}  |  Total Deductions: ${fmt(totalDed)}`,
        40,
        cursorY
      );
    } else {
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(`Grand Total (Gross Pay): ${fmt(totalGross)}`, 40, cursorY + 8);
    }

    const fileName = `PayBill_Month_${month.replace(/[^A-Za-z0-9-]/g, '_')}.pdf`;
    doc.save(fileName);
  },

  /**
   * Export the allowance/deduction parameter matrix as a PDF
   */
  exportAllowanceMatrixPdf(report: PayBillAllowanceMatrixReport, title = 'Pay Bill Parameter Matrix') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const months = report.monthLabels;
    const y = headerLines(doc, [
      'PAY BILL PARAMETER MATRIX',
      `${title}  |  FY ${report.financialYear}-${report.financialYear + 1}`,
      report.hrpn && report.employeeName
        ? `Employee: ${report.employeeName} (HRPN ${report.hrpn})`
        : report.hrpn
          ? `HRPN: ${report.hrpn}`
          : 'All Employees',
    ]);

    autoTable(doc, {
      startY: y + 8,
      head: [
        ['Parameter', ...months, 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
      ],
      body: report.rows.map((row: PayBillParameterMatrixRow) => [
        row.parameter,
        ...months.map((m) => fmt(row.months[m] || 0)),
        fmt(row.q1),
        fmt(row.q2),
        fmt(row.q3),
        fmt(row.q4),
        fmt(row.total),
      ]),
      foot: [['Grand Total (Gross)', ...months.map(() => ''), '', '', '', '', fmt(report.totalGross || 0)]],
      theme: 'striped',
      headStyles: { fillColor: [31, 58, 95], fontSize: 8 },
      footStyles: { fillColor: [222, 226, 230], textColor: [20, 20, 20], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 2.5 },
    });

    const fileName = `PayBill_Matrix_FY${report.financialYear}-${report.financialYear + 1}.pdf`;
    doc.save(fileName);
  },

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
};

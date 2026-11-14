import type { jsPDF as JsPDFType } from 'jspdf';
import type { SelfAssessmentMemo } from '../types/selfAssessment';
import { inr, inrOrDash, formatDesignation } from '../utils/selfAssessmentFormat';

type AutoTableFn = (doc: JsPDFType, options: Record<string, unknown>) => void;

async function loadPdfLibs(): Promise<{
  jsPDF: new (options?: Record<string, unknown>) => JsPDFType;
  autoTable: AutoTableFn;
}> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = ((autoTableModule as unknown as { default?: AutoTableFn; autoTable?: AutoTableFn }).default ||
    (autoTableModule as unknown as { autoTable?: AutoTableFn }).autoTable ||
    autoTableModule) as unknown as AutoTableFn;
  return { jsPDF, autoTable };
}

export interface BulkSelfAssessmentExportProgress {
  current: number;
  total: number;
  currentEmployeeName: string;
  status: 'preparing' | 'generating' | 'zipping' | 'completed' | 'error';
  errorMessage?: string;
}

export type SelfAssessmentPdfEngineMode = 'vector' | 'canvas';

export interface BulkSelfAssessmentZipOptions {
  financialYear: number;
  fyLabel: string;
  memos: SelfAssessmentMemo[];
  getElementForMemo?: (memo: SelfAssessmentMemo) => HTMLElement | null;
  mode?: SelfAssessmentPdfEngineMode;
  onProgress?: (progress: BulkSelfAssessmentExportProgress) => void;
  signal?: AbortSignal;
}

export interface GeneratedPdfResult {
  doc: JsPDFType;
  fileName: string;
  arrayBuffer: ArrayBuffer;
  blob: Blob;
}

/**
 * Standardized filename generation for Self-Assessment Memo PDF
 */
export function getSelfAssessmentPdfFileName(memo: SelfAssessmentMemo): string {
  const fyLabel = `${memo.financialYear}-${String(memo.financialYear + 1).slice(-2)}`;
  const cleanName = (memo.taxpayerName || '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_');
  const cleanHrpn = (memo.hrpn || memo.employeeIdOrPsn || 'EMP')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_');

  return cleanName
    ? `Self_Assessment_Memo_${cleanHrpn}_${cleanName}_FY${fyLabel}.pdf`
    : `Self_Assessment_Memo_${cleanHrpn}_FY${fyLabel}.pdf`;
}

export const selfAssessmentPdfService = {
  /**
   * Helper to format filename
   */
  getFileName(memo: SelfAssessmentMemo): string {
    return getSelfAssessmentPdfFileName(memo);
  },

  /**
   * Generates a 100% native vector text-based A4 PDF for a SelfAssessmentMemo.
   * Completely eliminates raster canvas artifacts, blurry rendering, and line clipping.
   * Produces searchable, selectable text that strictly fits on 1 single A4 page.
   */
  async generateTextBasedMemoPdfDoc(memo: SelfAssessmentMemo): Promise<GeneratedPdfResult> {
    const { jsPDF, autoTable } = await loadPdfLibs();

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const fyLabel = `${memo.financialYear}-${String(memo.financialYear + 1).slice(-2)}`;
    const ayLabel = memo.assessmentYear || `${memo.financialYear + 1}-${String(memo.financialYear + 2).slice(-2)}`;

    const rawDept = memo.departmentName || 'DISTRICT TREASURY OFFICE';
    const displayOfficeName = rawDept.toUpperCase().startsWith('OFFICE OF')
      ? rawDept
      : `OFFICE OF THE ${rawDept}`;

    const cleanDesignation = formatDesignation(memo.designation);

    const marginX = 8;
    const contentWidth = 194;
    const centerX = 105;
    let cursorY = 8;

    // 1. Header Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(displayOfficeName.toUpperCase(), centerX, cursorY, { align: 'center', maxWidth: 190 });
    cursorY += 4.2;

    const divisionText = memo.departmentDivision || memo.district;
    if (divisionText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(divisionText, centerX, cursorY, { align: 'center' });
      cursorY += 3.5;
    }

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(centerX - 35, cursorY, centerX + 35, cursorY);
    cursorY += 3.8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(
      `Self Assessment Income Tax Calculation Memo for Accounting Year ${fyLabel} And Assessment Year ${ayLabel}`,
      centerX,
      cursorY,
      { align: 'center' }
    );
    cursorY += 3.4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('(New Tax Regime Only — Section 115BAC)', centerX, cursorY, { align: 'center' });
    cursorY += 2.8;

    // 2. Particulars Table (4 Rows)
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      tableWidth: contentWidth,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.8, right: 1.8 },
        lineColor: [50, 50, 50],
        lineWidth: 0.18,
        textColor: [0, 0, 0],
        valign: 'middle',
      },
      body: [
        [
          { content: 'Name :', styles: { fontStyle: 'bold', cellWidth: 38 } },
          { content: (memo.taxpayerName || '—').toUpperCase(), colSpan: 3, styles: { fontStyle: 'bold' } },
        ],
        [
          { content: 'Designation :', styles: { fontStyle: 'bold', cellWidth: 38 } },
          { content: (cleanDesignation || 'RETIRED GOVERNMENT EMPLOYEE').toUpperCase(), colSpan: 3 },
        ],
        [
          { content: 'Residential Address :', styles: { fontStyle: 'bold', cellWidth: 38 } },
          { content: memo.residentialAddress || memo.district || '—', colSpan: 3 },
        ],
        [
          { content: 'PAN NO. :', styles: { fontStyle: 'bold', cellWidth: 38 } },
          { content: memo.pan || '—', styles: { fontStyle: 'bold', cellWidth: 59 } },
          { content: 'PSN / EMP ID :', styles: { fontStyle: 'bold', cellWidth: 38 } },
          { content: memo.employeeIdOrPsn || memo.hrpn || '—', styles: { fontStyle: 'bold', cellWidth: 59 } },
        ],
      ],
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY) + 1.2;

    // 3. Main Calculation Table
    const otherIncomeSum =
      (memo.honorariumBonus || 0) +
      (memo.bonus || 0) +
      (memo.bankInterest || 0) +
      (memo.nscInterest || 0) +
      (memo.housePropertyIncome || 0) +
      (memo.retirementGratuity || 0) +
      (memo.leaveSalaryEncashment || 0) +
      (memo.retrenchmentCompensation || 0) +
      (memo.agriculturalIncome || 0) +
      Math.max(0, (memo.familyPensionGross || 0) - (memo.familyPensionDeduction57iia || 0)) +
      (memo.otherIncomeSources || 0);

    const w = memo.working || {
      slabs: [],
      taxOnNormalIncome: 0,
      taxOnSpecialRate: 0,
      totalTaxBeforeRebate: 0,
      rebate87A: 0,
      taxAfterRebate: 0,
      surcharge: 0,
      cess4: 0,
      relief89: 0,
      totalTaxLiability: 0,
    };

    const m = memo.monthlyTds || {
      taxPaidUpToNov: 0,
      taxDeductedDec: 0,
      taxDeductedJan: 0,
      totalTaxPaidTillJan: 0,
      delayFiling234A: false,
      delayPenaltyAmount: 0,
      taxDeductedFeb: 0,
      challans: [],
      totalChallanAmount: 0,
      totalTaxCredits: 0,
      netTaxPayableOrRefund: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calcRows: any[] = [
      // Row 1: Income
      [
        { content: '1', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Income :', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      ],
      [
        '',
        '[a] Gross Salary Income (Statement enclose) PAY+DA+D.PAY+HRA+CLA+MA+TA and Other Allowance',
        '',
        inr(memo.grossSalaryTotal),
      ],
      ['', '[b] Honorarium, Bonus, Bank NSC Interest, House Rent Income', inrOrDash(memo.honorariumBonus), ''],
      ['', '[c] Bonus', inrOrDash(memo.bonus), ''],
      ['', '[d] Bank Interest', inrOrDash(memo.bankInterest), ''],
      ['', '[e] NSC Interest', inrOrDash(memo.nscInterest), ''],
      ['', '[f] House Rent Income', inrOrDash(memo.housePropertyIncome), ''],
      ['', '[g] Retirement Gratuity', inrOrDash(memo.retirementGratuity), ''],
      ['', '[h] Leave Salary in Retirement Govt. Employee (U/s 10 10AA)', inrOrDash(memo.leaveSalaryEncashment), ''],
      ['', '[i] Retrenchment Compensation', inrOrDash(memo.retrenchmentCompensation), ''],
      ['', '[j] Agricultural Income (U/s Section 10(1) Ded. Max. 5000)', inrOrDash(memo.agriculturalIncome), ''],
      [
        '',
        '[k] Family Pension (U/s 57(iia) Ded. Max. 25000 or 1/3 which is less)',
        inrOrDash(Math.max(0, (memo.familyPensionGross || 0) - (memo.familyPensionDeduction57iia || 0))),
        '',
      ],
      ['', '[l] Other Income Sources [ if any ]', inrOrDash(memo.otherIncomeSources), ''],
      [
        '',
        { content: 'Total [b] to [l]', styles: { fontStyle: 'bold' } },
        { content: inr(otherIncomeSum), styles: { fontStyle: 'bold' } },
        { content: inr(memo.grossTotalIncome), styles: { fontStyle: 'bold' } },
      ],

      // Row 2: Standard Deduction
      [
        { content: '2', styles: { halign: 'center', fontStyle: 'bold' } },
        'Standard deduction under section 16 (ia) (A Deduction of Rs. 75,000)',
        '',
        inr(memo.standardDeduction16ia),
      ],

      // Row 3: Gross Total Income
      [
        { content: '3', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Gross Total Income (1+ (1.a to 1.l)) - 2(Standard deduction)', styles: { fontStyle: 'bold' } },
        '',
        { content: inr(Math.max(0, memo.grossTotalIncome - memo.standardDeduction16ia)), styles: { fontStyle: 'bold' } },
      ],

      // Row 4: Less: 80CCD(2) NPS
      [
        { content: '4', styles: { halign: 'center', fontStyle: 'bold' } },
        'Less : Deduction - Sec. 80CCD(2) NPS Contribution (Max. 14% of Salary Govt. Contribution)',
        inr(memo.nps80CCD2),
        inr(memo.nps80CCD2),
      ],

      // Row 5: Net Taxable Total Income
      [
        { content: '5', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Net Taxable Total Income [3 - 4 ] rounded to Multiple of ten Rupees', styles: { fontStyle: 'bold' } },
        '',
        { content: inr(memo.taxableTotalIncome), styles: { fontStyle: 'bold' } },
      ],

      // Row 6: Income Tax Payable on Total Income
      [
        { content: '6', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Income Tax Payable on Total Income Calculation of Income Tax on', styles: { fontStyle: 'bold' } },
        '',
        { content: inr(w.taxOnNormalIncome), styles: { fontStyle: 'bold' } },
      ],
    ];

    // Slabs Breakdown Sub-rows
    if (w.slabs && w.slabs.length > 0) {
      w.slabs.forEach((s) => {
        calcRows.push([
          '',
          `    * ${s.label} @ ${s.rate}% (Taxable: Rs. ${inr(s.taxableAmount)})`,
          s.rate === 0 ? '0' : inr(s.taxAmount),
          '',
        ]);
      });
    }

    // Rebate 87A
    calcRows.push([
      '',
      'Less: Tax Credit (Available only to assessees having total taxable income upto Rs. 12 lacs) u/s 87A',
      '',
      inr(w.rebate87A),
    ]);

    // Row 7: After Rebate
    calcRows.push([
      { content: '7', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'After Rebate Payable Income Tax Amount', styles: { fontStyle: 'bold' } },
      '',
      { content: inr(w.taxAfterRebate), styles: { fontStyle: 'bold' } },
    ]);

    // Row 8: Surcharge
    calcRows.push([
      { content: '8', styles: { halign: 'center', fontStyle: 'bold' } },
      'Add: Surcharge',
      '',
      inr(w.surcharge),
    ]);

    // Row 9: Cess
    calcRows.push([
      { content: '9', styles: { halign: 'center', fontStyle: 'bold' } },
      'Add: Health and Education Cess @ 4% on Payable Income Tax Amount',
      '',
      inr(w.cess4),
    ]);

    // Row 10: Relief 89
    calcRows.push([
      { content: '10', styles: { halign: 'center', fontStyle: 'bold' } },
      'Less : Relief U/s 89 [Attach Details Form 10 E]',
      '',
      inr(w.relief89),
    ]);

    // Row 11: Total Tax Payable after relief
    calcRows.push([
      { content: '11', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Total Tax Payable [ after relief ]', styles: { fontStyle: 'bold' } },
      '',
      { content: inr(w.totalTaxLiability), styles: { fontStyle: 'bold' } },
    ]);

    // Row 12: Tax Paid Till January
    calcRows.push([
      { content: '12', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Total Tax Paid Till January', styles: { fontStyle: 'bold' } },
      '',
      { content: inr(m.totalTaxPaidTillJan), styles: { fontStyle: 'bold' } },
    ]);

    // Row 13: Delay Penalty 234A
    calcRows.push([
      { content: '13', styles: { halign: 'center', fontStyle: 'bold' } },
      `Total Tax Including Delay in filing of Tax Returns - (Section 234(A)): ${m.delayFiling234A ? 'Yes' : 'No'}`,
      '',
      inr(m.delayPenaltyAmount),
    ]);

    // Row 14: Tax to be deducted in February
    calcRows.push([
      { content: '14', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: `Tax to be deducted in February ${memo.financialYear + 1}`, styles: { fontStyle: 'bold' } },
      '',
      { content: inr(m.taxDeductedFeb), styles: { fontStyle: 'bold' } },
    ]);

    // Row 15: Challans
    const challanInfo =
      m.challans && m.challans.length > 0
        ? ` (C. No: ${m.challans[0]?.challanNo || '—'} Date: ${m.challans[0]?.date || '—'})`
        : '';
    calcRows.push([
      { content: '15', styles: { halign: 'center', fontStyle: 'bold' } },
      `Taxes Deposited Through Challan${challanInfo}`,
      '',
      { content: inr(m.totalChallanAmount), styles: { fontStyle: 'bold' } },
    ]);

    // Row 16: Tax Payable / Refundable
    const netTaxDisplay =
      m.netTaxPayableOrRefund < 0
        ? `${inr(Math.abs(m.netTaxPayableOrRefund))} (Refund)`
        : inr(m.netTaxPayableOrRefund);

    calcRows.push([
      { content: '16', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Tax Payable / Refundable [ 11 - (12+14+15) ]', styles: { fontStyle: 'bold' } },
      '',
      { content: netTaxDisplay, styles: { fontStyle: 'bold' } },
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      tableWidth: contentWidth,
      theme: 'grid',
      head: [['No.', 'Particular', 'Details Rs.', 'Total Rs.']],
      body: calcRows,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center',
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 },
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 125, halign: 'left' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      styles: {
        fontSize: 7,
        cellPadding: { top: 0.85, bottom: 0.85, left: 1.5, right: 1.5 },
        lineColor: [50, 50, 50],
        lineWidth: 0.18,
        textColor: [0, 0, 0],
        valign: 'middle',
      },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY) + 1.2;

    // 4. Statutory Declaration Box
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      tableWidth: contentWidth,
      theme: 'grid',
      head: [
        [
          {
            content: 'DECLARATION / CONSENT FORM (U/S 115BAC - NEW TAX REGIME)',
            styles: { halign: 'left', fontStyle: 'bold', fontSize: 7, fillColor: [248, 250, 252] },
          },
        ],
      ],
      body: [
        [
          {
            content: `I hereby declare that for the Financial Year ${fyLabel} (Assessment Year ${ayLabel}), I have exercised the option to be assessed under the New Tax Regime under Section 115BAC of the Income-tax Act, 1961. I confirm that all particulars stated above are true and correct to the best of my knowledge and belief.`,
            styles: { fontSize: 6.8, cellPadding: { top: 1.0, bottom: 1.0, left: 2, right: 2 } },
          },
        ],
      ],
      styles: {
        lineColor: [50, 50, 50],
        lineWidth: 0.18,
        textColor: [0, 0, 0],
      },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY) + 2.5;

    // 5. Place, Date & Signatures Block
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Place : ${memo.place || memo.district || 'Surat'}`, marginX + 2, cursorY);
    doc.text(
      `Date : ${memo.computationDate || new Date().toLocaleDateString('en-GB')}`,
      contentWidth + marginX - 2,
      cursorY,
      { align: 'right' }
    );

    cursorY += 11;

    const sigLineWidth = 65;
    doc.setLineWidth(0.3);

    // Left Signature: Employee / Taxpayer
    doc.line(marginX + 5, cursorY, marginX + 5 + sigLineWidth, cursorY);
    cursorY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('Signature of Employee / Taxpayer', marginX + 5 + sigLineWidth / 2, cursorY, { align: 'center' });
    cursorY += 3;
    doc.text(
      (memo.taxpayerSignatureName || memo.taxpayerName || '').toUpperCase(),
      marginX + 5 + sigLineWidth / 2,
      cursorY,
      { align: 'center' }
    );
    cursorY += 2.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(cleanDesignation.toUpperCase(), marginX + 5 + sigLineWidth / 2, cursorY, { align: 'center' });

    // Right Signature: DDO Signature & Office Seal
    const rightSigX = contentWidth + marginX - 5 - sigLineWidth;
    const rCursorY = cursorY - 8.8;
    doc.line(rightSigX, rCursorY, rightSigX + sigLineWidth, rCursorY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    const ddoDesignation = memo.treasuryOfficerDesignation || 'Assistant Administrative cum Account Officer';
    doc.text(ddoDesignation, rightSigX + sigLineWidth / 2, rCursorY + 3, {
      align: 'center',
      maxWidth: sigLineWidth + 10,
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('(Signature & Office Seal of DDO)', rightSigX + sigLineWidth / 2, rCursorY + 5.8, { align: 'center' });

    const fileName = getSelfAssessmentPdfFileName(memo);
    const arrayBuffer = doc.output('arraybuffer');
    const blob = doc.output('blob');

    return { doc, fileName, arrayBuffer, blob };
  },

  /**
   * Converts a rendered DOM element representing a SelfAssessmentDocument into an A4 PDF using canvas.
   * Kept for backward compatibility or screenshot export.
   */
  async convertElementToMemoPdfDoc(
    element: HTMLElement,
    memo: SelfAssessmentMemo
  ): Promise<GeneratedPdfResult> {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Isolate into an off-screen wrapper to guarantee full A4 dimensions (210mm)
    // and avoid any parent overflow-scroll clipping, flex compression, or dark mode bleed.
    let offscreenWrapper: HTMLDivElement | null = null;
    let targetElement = element;

    if (typeof document !== 'undefined') {
      offscreenWrapper = document.createElement('div');
      offscreenWrapper.style.position = 'fixed';
      offscreenWrapper.style.left = '-9999px';
      offscreenWrapper.style.top = '0';
      offscreenWrapper.style.width = '210mm';
      offscreenWrapper.style.minWidth = '210mm';
      offscreenWrapper.style.maxWidth = '210mm';
      offscreenWrapper.style.background = '#ffffff';
      offscreenWrapper.style.color = '#000000';
      offscreenWrapper.style.zIndex = '-99999';
      offscreenWrapper.style.margin = '0';
      offscreenWrapper.style.padding = '0';

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '210mm';
      clone.style.minWidth = '210mm';
      clone.style.maxWidth = '210mm';
      clone.style.boxShadow = 'none';
      clone.style.margin = '0 auto';
      clone.style.background = '#ffffff';
      clone.style.color = '#000000';

      offscreenWrapper.appendChild(clone);
      document.body.appendChild(offscreenWrapper);
      targetElement = clone;
    }

    try {
      const canvas = await html2canvas(targetElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1024,
        scrollX: 0,
        scrollY: 0,
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const canvasWidth = canvas.width || 1;
      const canvasHeight = canvas.height || 1;
      const renderedHeightMm = (canvasHeight * pdfWidth) / canvasWidth;

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      if (renderedHeightMm <= pdfHeight) {
        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderedHeightMm, undefined, 'FAST');
      } else {
        const scale = pdfHeight / renderedHeightMm;
        const scaledWidth = pdfWidth * scale;
        const xOffset = Math.max(0, (pdfWidth - scaledWidth) / 2);
        doc.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, pdfHeight, undefined, 'FAST');
      }

      const fileName = getSelfAssessmentPdfFileName(memo);
      const arrayBuffer = doc.output('arraybuffer');
      const blob = doc.output('blob');

      return { doc, fileName, arrayBuffer, blob };
    } finally {
      if (offscreenWrapper && offscreenWrapper.parentNode) {
        offscreenWrapper.parentNode.removeChild(offscreenWrapper);
      }
    }
  },

  /**
   * Downloads a single Self-Assessment Memo PDF directly in the browser.
   * Defaults to text-based vector PDF for crystal-clear, searchable, unclipped rendering.
   */
  async downloadSingleMemoPdf(
    memoOrElement: SelfAssessmentMemo | HTMLElement,
    maybeMemo?: SelfAssessmentMemo,
    mode: SelfAssessmentPdfEngineMode = 'vector'
  ): Promise<{ fileName: string }> {
    const isElement = typeof HTMLElement !== 'undefined' && memoOrElement instanceof HTMLElement;
    const memo: SelfAssessmentMemo = isElement ? (maybeMemo as SelfAssessmentMemo) : (memoOrElement as SelfAssessmentMemo);

    if (!memo) {
      throw new Error('SelfAssessmentMemo object is required for PDF export.');
    }

    let doc: JsPDFType;
    let fileName: string;

    if (mode === 'canvas' && isElement) {
      const res = await this.convertElementToMemoPdfDoc(memoOrElement, memo);
      doc = res.doc;
      fileName = res.fileName;
    } else {
      const res = await this.generateTextBasedMemoPdfDoc(memo);
      doc = res.doc;
      fileName = res.fileName;
    }

    doc.save(fileName);
    return { fileName };
  },

  /**
   * Generates a ZIP archive containing individual PDF statements for all requested employees.
   * By default, uses the ultra-fast vector text-based PDF engine directly in memory.
   */
  async generateAllMemosPdfZip(
    options: BulkSelfAssessmentZipOptions
  ): Promise<{ zipBlob: Blob; fileName: string; total: number }> {
    const { fyLabel, memos, getElementForMemo, mode = 'vector', onProgress, signal } = options;

    if (!memos || memos.length === 0) {
      throw new Error('No self-assessment memos available to export.');
    }

    onProgress?.({
      current: 0,
      total: memos.length,
      currentEmployeeName: '',
      status: 'preparing',
    });

    const [{ default: JSZip }] = await Promise.all([import('jszip')]);

    if (signal?.aborted) throw new Error('Export cancelled');

    const zip = new JSZip();
    const folderName = `Self_Assessment_Memos_FY${fyLabel}`;
    const zipFolder = zip.folder(folderName) || zip;

    let processed = 0;

    for (let idx = 0; idx < memos.length; idx++) {
      if (signal?.aborted) throw new Error('Export cancelled');

      const memo = memos[idx];
      onProgress?.({
        current: idx + 1,
        total: memos.length,
        currentEmployeeName: memo.taxpayerName || memo.hrpn,
        status: 'generating',
      });

      let fileName: string;
      let arrayBuffer: ArrayBuffer;

      if (mode === 'canvas') {
        const el = getElementForMemo?.(memo);
        if (!el) {
          console.warn(`[BulkSelfAssessment] DOM element not found for HRPN: ${memo.hrpn}`);
          continue;
        }
        const res = await this.convertElementToMemoPdfDoc(el, memo);
        fileName = res.fileName;
        arrayBuffer = res.arrayBuffer;
      } else {
        // Fast vector text-based PDF directly from data model
        const res = await this.generateTextBasedMemoPdfDoc(memo);
        fileName = res.fileName;
        arrayBuffer = res.arrayBuffer;
      }

      zipFolder.file(fileName, arrayBuffer);
      processed++;

      // Yield event loop to keep browser responsive
      await new Promise((r) => setTimeout(r, mode === 'canvas' ? 20 : 5));
    }

    if (signal?.aborted) throw new Error('Export cancelled');

    onProgress?.({
      current: memos.length,
      total: memos.length,
      currentEmployeeName: '',
      status: 'zipping',
    });

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFileName = `Self_Assessment_Memos_FY${fyLabel}.zip`;

    onProgress?.({
      current: memos.length,
      total: memos.length,
      currentEmployeeName: '',
      status: 'completed',
    });

    return { zipBlob, fileName: zipFileName, total: processed };
  },

  /**
   * Export all self-assessment memos bundled as a single ZIP file download.
   */
  async exportAllMemosPdfZip(
    options: BulkSelfAssessmentZipOptions
  ): Promise<{ total: number; fileName: string }> {
    const { zipBlob, fileName, total } = await this.generateAllMemosPdfZip(options);
    const { saveAs } = await import('file-saver');
    saveAs(zipBlob, fileName);
    return { total, fileName };
  },
};

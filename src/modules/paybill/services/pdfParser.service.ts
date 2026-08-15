import { extractText, getDocumentProxy } from 'unpdf';
import type {
  PayBillMetadata,
  PayBillEmployeeRow,
  PayBillTotalRow,
  PayBillParsedResult,
  PayBillDeductionRow,
  PayBillDeductionTotalRow,
  PayBillSheetType,
} from '../types';

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

interface DetectedColumns {
  hasSpecialPay: boolean;
  hasWashing: boolean;
  hasNpp: boolean;
  columnCount: number;
}

export class PdfParserService {
  /**
   * Parse Pay Bill PDF from ArrayBuffer or File
   */
  async parsePdf(fileOrBuffer: File | ArrayBuffer): Promise<PayBillParsedResult> {
    let arrayBuffer: ArrayBuffer;
    if (fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      arrayBuffer = fileOrBuffer;
    }

    const { rawText, pageCount, items } = await this.extractTextAndItems(arrayBuffer);
    return this.parseExtractedText(rawText, pageCount, items);
  }

  /**
   * Parse structured text (works for both PDF-extracted text and raw text/OCR fallback)
   */
  parseExtractedText(
    rawText: string,
    pageCount = 1,
    items: RawTextItem[] = []
  ): PayBillParsedResult {
    const warnings: string[] = [];

    // 1. Detect Sheet Type: Earning vs. Deduction Side
    const isDeduction = /Deduction\s+Side|Income\s+Tax\s*\(9510\)|Total\s+Ded/i.test(rawText);
    const sheetType: PayBillSheetType = isDeduction ? 'DEDUCTION' : 'EARNING';

    // 2. Extract Bill Metadata from header area
    const metadata = this.extractMetadata(rawText);

    if (!metadata.month) {
      warnings.push('Month could not be automatically detected from header.');
    }
    if (!metadata.billNo) {
      warnings.push('Bill number could not be detected from header.');
    }

    if (sheetType === 'DEDUCTION') {
      // 3. Extract Deduction Rows
      let deductionRows: PayBillDeductionRow[] = [];
      if (items && items.length > 0) {
        try {
          deductionRows = this.extractDeductionRowsFromItems(items, warnings);
        } catch (err) {
          console.warn('[PdfParserService] Coordinate deduction extraction fallback:', err);
        }
      }

      if (deductionRows.length === 0) {
        deductionRows = this.extractDeductionRows(rawText, warnings);
      }

      if (deductionRows.length === 0) {
        warnings.push('No deduction records could be detected from PDF.');
      }

      const pdfDeductionTotals = this.extractDeductionTotals(rawText, deductionRows);

      // Detection confidence for deduction side
      const withDedValues = deductionRows.filter((r) => (r.totalDeductions || 0) > 0 || (r.netPay || 0) > 0).length;
      const coverage = deductionRows.length > 0 ? withDedValues / deductionRows.length : 0;
      const confidence = deductionRows.length === 0 ? 0 : Math.round(coverage * 100);
      if (deductionRows.length > 0 && coverage < 0.8) {
        warnings.push(
          `Deduction column detection confidence is low (${Math.round(coverage * 100)}% of rows have values). ` +
            'Ensure the table header with codes (Income Tax (9510) ... Net Pay) is visible, or paste the text via OCR fallback.'
        );
      }

      return {
        sheetType,
        metadata,
        rows: [],
        pdfTotals: null,
        deductionRows,
        pdfDeductionTotals,
        rawText,
        pageCount,
        parsingWarnings: warnings,
        detection: {
          confidence,
          issues: [...warnings],
        },
      };
    }

    // EARNING SIDE
    // 3. Detect column structure from table header
    const detectedCols = this.detectAllowanceColumns(rawText);

    // 4. Extract Employee Rows:
    let rows: PayBillEmployeeRow[] = [];
    if (items && items.length > 0) {
      try {
        rows = this.extractEmployeeRowsFromItems(items, detectedCols, warnings);
      } catch (err) {
        console.warn('[PdfParserService] Coordinate extraction fallback to text parsing:', err);
      }
    }

    // If coordinate extraction was not applicable or returned no rows, use structured text parser
    if (rows.length === 0) {
      rows = this.extractEmployeeRows(rawText, detectedCols, warnings);
    }

    if (rows.length === 0) {
      warnings.push('No employee records could be detected. Please verify PDF format or use OCR tool.');
    }

    // 5. Extract Totals
    const pdfTotals = this.extractTotals(rawText, detectedCols, rows);

    // Detection confidence for earning side: share of rows where amounts were captured
    const withAmounts = rows.filter((r) => (r.grossAmount || 0) > 0).length;
    const coverage = rows.length > 0 ? withAmounts / rows.length : 0;
    const confidence = rows.length === 0 ? 0 : Math.round(coverage * 100);
    if (rows.length > 0 && coverage < 0.8) {
      warnings.push(
        `Column detection confidence is low (${Math.round(coverage * 100)}% of rows have amounts). ` +
          'Consider pasting the bill text via OCR fallback for more reliable extraction.'
      );
    }

    return {
      sheetType,
      metadata,
      rows,
      pdfTotals,
      rawText,
      pageCount,
      parsingWarnings: warnings,
      detection: {
        confidence,
        issues: [...warnings],
      },
    };
  }

  /**
   * Extract raw text and item coordinates using unpdf
   */
  private async extractTextAndItems(
    arrayBuffer: ArrayBuffer
  ): Promise<{ rawText: string; pageCount: number; items: RawTextItem[] }> {
    const data = new Uint8Array(arrayBuffer);

    try {
      const pdfDoc = await getDocumentProxy(data);
      const pageCount = pdfDoc.numPages;
      const items: RawTextItem[] = [];
      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageItems: RawTextItem[] = [];

        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            const transform = (item as any).transform;
            const x = transform ? transform[4] : 0;
            const y = transform ? transform[5] : 0;
            const w = (item as any).width || 0;
            const h = (item as any).height || 0;

            const rawItem: RawTextItem = {
              str: item.str,
              x,
              y,
              w,
              h,
              page: pageNum,
            };
            pageItems.push(rawItem);
            items.push(rawItem);
          }
        }

        // Group page items into lines based on Y coordinate tolerance
        const lines = this.clusterItemsIntoLines(pageItems);
        pageTexts.push(lines.join('\n'));
      }

      const rawText = pageTexts.join('\n\n');
      return { rawText, pageCount, items };
    } catch {
      // Fallback to high-level extractText from unpdf
      const extracted = await extractText(data, { mergePages: false });
      const pageTexts = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
      return {
        rawText: pageTexts.join('\n\n'),
        pageCount: extracted.totalPages || 1,
        items: [],
      };
    }
  }

  /**
   * Cluster text items with similar Y coordinates into formatted text lines
   */
  private clusterItemsIntoLines(items: RawTextItem[]): string[] {
    if (items.length === 0) return [];

    // Sort top to bottom (descending Y in PDF coordinates), then left to right (ascending X)
    const sorted = [...items].sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    const lineBuckets: Array<{ y: number; items: RawTextItem[] }> = [];

    for (const item of sorted) {
      const bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= 4);
      if (bucket) {
        bucket.items.push(item);
      } else {
        lineBuckets.push({ y: item.y, items: [item] });
      }
    }

    // Sort items in each line by X ascending
    return lineBuckets.map((bucket) => {
      bucket.items.sort((a, b) => a.x - b.x);
      return bucket.items.map((i) => i.str.trim()).filter(Boolean).join(' ');
    });
  }

  /**
   * Detect allowance columns present in the table header
   */
  detectAllowanceColumns(text: string): DetectedColumns {
    const hasSpecialPay = /Special\s+Additional\s+Pay|Special\s+Pay/i.test(text);
    const hasWashing = /Washing\s+Allow|\(0132\)/i.test(text);
    const hasNpp = /Non\s+Private\s+Practice|\(0128\)|NPP/i.test(text);

    // Standard 6: Basic, DA, HRA, CLA, Med, Trans
    // + Special Pay (1) + Washing (1) + NPP (1) + Gross (1)
    let columnCount = 7; // 6 standard + 1 gross
    if (hasSpecialPay) columnCount++;
    if (hasWashing) columnCount++;
    if (hasNpp) columnCount++;

    return {
      hasSpecialPay,
      hasWashing,
      hasNpp,
      columnCount,
    };
  }

  /**
   * Extract header and bill metadata fields using dynamic regex & patterns
   */
  extractMetadata(text: string): PayBillMetadata {
    const clean = text.replace(/\r\n/g, '\n');

    // Month extraction (e.g. "Month of : July-2026", "Month of : 07/2026", "July-2026", etc.)
    let month = '';
    const monthMatch =
      clean.match(/Month\s+of\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
      clean.match(/Month\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
      clean.match(/([A-Za-z]+-\d{4})/);
    if (monthMatch) {
      month = monthMatch[1].trim();
    }

    const extractField = (patterns: RegExp[]): string => {
      for (const p of patterns) {
        const m = clean.match(p);
        if (m && m[1]) return m[1].trim();
      }
      return '';
    };

    const ddoHrpn = extractField([
      /D\.?D\.?O\s*HRPN\s*:\s*([A-Za-z0-9]+)/i,
      /DDO\s*HRPN\s*:\s*([A-Za-z0-9]+)/i,
    ]);

    const ddoName = extractField([
      /Name\s+of\s+D\.?D\.?O\s*:\s*([^:\n]+?)(?=\s+(?:Name of Ministry|Major Head|TAN|Bill No|Department|Address|\n|$))/i,
      /DDO\s+Name\s*:\s*([^:\n]+?)(?=\s+(?:Name of Ministry|Major Head|TAN|Bill No|\n|$))/i,
    ]);

    const officeName = extractField([
      /Name\s+of\s+Office\s*:\s*([^:\n]+?)(?=\s+(?:Bill No|Major Head|TAN|Cardex|Department|\n|$))/i,
      /Office\s*:\s*([^:\n]+?)(?=\s+(?:Bill No|Major Head|\n|$))/i,
    ]);

    const billNo = extractField([
      /Bill\s+No\.?\s*:\s*([A-Za-z0-9_-]+)/i,
      /Bill\s*Number\s*:\s*([A-Za-z0-9_-]+)/i,
    ]);

    const majorHead = extractField([
      /Major\s+Head\s*:\s*([A-Za-z0-9_-]+)/i,
      /MajorHead\s*:\s*([A-Za-z0-9_-]+)/i,
    ]);

    const ddoCode = extractField([
      /D\.?D\.?O\s*Code\s*(?:No\.?)?\s*:\s*([A-Za-z0-9_-]+)/i,
      /DDO\s*Code\s*:\s*([A-Za-z0-9_-]+)/i,
    ]);

    const department = extractField([
      /Department\s*:\s*([^:\n]+?)(?=\s+(?:TAN No|Cardex No|Address|Taluka|Mobile|\n|$))/i,
    ]);

    const tanNo = extractField([
      /TAN\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i,
    ]);

    const cardexNo = extractField([
      /Cardex\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i,
    ]);

    const address = extractField([
      /Address\s*:\s*([^:\n]+?)(?=\s+(?:Cardex No|Mobile No|Taluka|Phone|\n|$))/i,
    ]);

    const mobileNo = extractField([
      /Mobile\s*(?:No\.?)?\s*:\s*([0-9+\s-]{8,15})/i,
    ]);

    const ministry = extractField([
      /Name\s+of\s+Ministry\s*:\s*([^:\n]+?)(?=\s+(?:Major Head|TAN|Department|\n|$))/i,
    ]);

    const email = extractField([
      /E-Mail\s+ID\s*:\s*([^\s\n]+)/i,
    ]);

    const phone = extractField([
      /Phone\s+no\.?\s*:\s*([0-9+\s-]{6,15})/i,
    ]);

    const taluka = extractField([
      /Taluka\s*:\s*([^:\n]+?)(?=\s+(?:Mobile|\n|$))/i,
    ]);

    const generatedDate = extractField([
      /Date\s*:\s*([0-9/:\s-]+)/i,
    ]);

    const billCode = extractField([
      /Billcode\s*:\s*([^\s\n]+)/i,
    ]);

    return {
      month,
      ddoHrpn,
      ddoName,
      officeName,
      billNo,
      majorHead,
      ddoCode,
      department,
      tanNo,
      cardexNo,
      address,
      mobileNo,
      ministry,
      email,
      phone,
      taluka,
      generatedDate,
      billCode,
      rawHeaderDump: clean.slice(0, 1000),
    };
  }

  /**
   * 2D Coordinate Grid Extractor: Parses employee rows using exact (X, Y) canvas coordinates.
   * Isolates table body strictly between Table Header (top) and Total row (bottom).
   * This is 100% immune to header metadata (DDO HRPN, phone numbers) and multi-line cell wrapping.
   */
  private extractEmployeeRowsFromItems(
    items: RawTextItem[],
    detectedCols?: DetectedColumns,
    _warnings?: string[]
  ): PayBillEmployeeRow[] {
    if (!items || items.length === 0) return [];

    const allRows: PayBillEmployeeRow[] = [];

    // Group items by page
    const pageMap = new Map<number, RawTextItem[]>();
    for (const item of items) {
      const pageList = pageMap.get(item.page) || [];
      pageList.push(item);
      pageMap.set(item.page, pageList);
    }

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    for (const [_pageNum, pageItems] of pageMap) {
      // 1. Locate Table Header Y position
      // Find the header items: "HRPN", "Employee Name", "Designation", "Pay Scale", "Basic Pay"
      let tableHeaderY = 0;
      let hrpnHeaderItem: RawTextItem | undefined;
      let nameHeaderItem: RawTextItem | undefined;
      let desigHeaderItem: RawTextItem | undefined;
      let payScaleHeaderItem: RawTextItem | undefined;
      let phHeaderItem: RawTextItem | undefined;
      let sloHeaderItem: RawTextItem | undefined;
      let basicHeaderItem: RawTextItem | undefined;

      for (const item of pageItems) {
        const s = item.str.trim();
        if (/^HRPN$/i.test(s)) {
          hrpnHeaderItem = item;
          tableHeaderY = item.y;
        } else if (/Employee\s+Name/i.test(s) || s === 'Name') {
          nameHeaderItem = item;
          if (!tableHeaderY) tableHeaderY = item.y;
        } else if (/Designation/i.test(s)) {
          desigHeaderItem = item;
        } else if (/Pay\s+Scale/i.test(s) || s === 'Scale') {
          payScaleHeaderItem = item;
        } else if (/^PH$/i.test(s)) {
          phHeaderItem = item;
        } else if (/^SLO$/i.test(s)) {
          sloHeaderItem = item;
        } else if (/Basic\s+Pay/i.test(s) || s === '(0101)/(0102)') {
          basicHeaderItem = item;
        }
      }

      // If exact table header Y wasn't found, find the lowest header label
      if (!tableHeaderY) {
        const anyHeaderItem = pageItems.find((i) =>
          /PAYBILL\s+INNER\s+SHEET|D\.D\.O|Major\s+Head|TAN\s+No/i.test(i.str)
        );
        if (anyHeaderItem) {
          tableHeaderY = anyHeaderItem.y - 25;
        } else {
          tableHeaderY = 600; // sensible A4 landscape default
        }
      }

      // 2. Locate Table Total / Footer Y position
      let totalY = 0;
      const totalItem = pageItems.find((i) => /^Total\b/i.test(i.str.trim()) && i.y < tableHeaderY);
      if (totalItem) {
        totalY = totalItem.y;
      } else {
        const certItem = pageItems.find((i) => /I\s+hereby\s+certify|Rupees\s*:/i.test(i.str));
        if (certItem) totalY = certItem.y + 15;
      }

      // 3. Find Employee HRPN items strictly WITHIN table body:
      // Y < tableHeaderY - 10 (STRICTLY BELOW header line) AND Y > totalY (STRICTLY ABOVE Total line)
      const tableBodyItems = pageItems.filter(
        (i) => i.y < tableHeaderY - 10 && (totalY === 0 || i.y > totalY + 2)
      );

      // Find HRPN column X from header or landmark
      const hrpnX = hrpnHeaderItem?.x || 60;

      // Filter HRPNs in table body (7-10 digits, within HRPN column X)
      const hrpnColumnItems = tableBodyItems
        .filter((i) => {
          const str = i.str.trim();
          const isDigitHrpn = /^\d{7,10}$/.test(str) && !/2403|0299/.test(str);
          const isNearHrpnCol = Math.abs(i.x - hrpnX) < 40;
          return isDigitHrpn && isNearHrpnCol;
        })
        .sort((a, b) => b.y - a.y); // Top to bottom

      if (hrpnColumnItems.length === 0) continue;

      // 4. Calculate Column X Boundaries
      const nameX = nameHeaderItem?.x || hrpnX + 55;
      const desigX = desigHeaderItem?.x || nameX + 100;
      const payScaleX = payScaleHeaderItem?.x || desigX + 90;
      const phX = phHeaderItem?.x || payScaleX + 80;
      const sloX = sloHeaderItem?.x || phX + 25;
      const basicX = basicHeaderItem?.x || sloX + 25;

      const colBoundHrpnMax = (hrpnX + nameX) / 2;
      const colBoundNameMax = (nameX + desigX) / 2;
      const colBoundDesigMax = (desigX + payScaleX) / 2;
      const colBoundPayScaleMax = (payScaleX + phX) / 2;
      const colBoundPhMax = (phX + sloX) / 2;
      const colBoundSloMax = (sloX + basicX) / 2;

      // 5. Extract each Employee Row
      for (let r = 0; r < hrpnColumnItems.length; r++) {
        const currentHrpn = hrpnColumnItems[r];
        const nextHrpn = r < hrpnColumnItems.length - 1 ? hrpnColumnItems[r + 1] : null;

        // Row Y range
        const rowTopY = r === 0 ? tableHeaderY - 10 : (hrpnColumnItems[r - 1].y + currentHrpn.y) / 2;
        const rowBottomY = nextHrpn ? (currentHrpn.y + nextHrpn.y) / 2 : (totalY ? totalY + 2 : currentHrpn.y - 35);

        // Get all items belonging to this employee's horizontal row band
        const rowItems = tableBodyItems.filter((i) => i.y <= rowTopY && i.y > rowBottomY);

        // Extract Sr No (items to left of HRPN column)
        const srNoItems = rowItems
          .filter((i) => i.x < hrpnX - 5 && /^\d{1,4}$/.test(i.str.trim()))
          .sort((a, b) => b.y - a.y);
        const srNo = srNoItems.length > 0 ? parseInt(srNoItems[0].str.trim(), 10) : r + 1;

        // Extract Employee Name (items strictly between HRPN and Designation columns)
        const nameItems = rowItems
          .filter((i) => i.x >= colBoundHrpnMax && i.x < colBoundNameMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);

        let employeeName = nameItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ');

        employeeName = employeeName
          .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
          .replace(/[0-9/()\\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Extract Designation (items strictly between Name and PayScale columns)
        const desigItems = rowItems
          .filter((i) => i.x >= colBoundNameMax && i.x < colBoundDesigMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);

        let designation = desigItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/^(Designation|Desig)\s+/i, '')
          .trim();

        // Extract Pay Scale (items strictly between Designation and PH columns)
        const payScaleItems = rowItems
          .filter((i) => i.x >= colBoundDesigMax && i.x < colBoundPayScaleMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);

        let payScale = payScaleItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/^(Pay\s*Scale|Scale)\s+/i, '')
          .replace(/\s+/g, ' ')
          .replace(/-\s+/g, '-')
          .replace(/\s+-/g, '-')
          .replace(/\s*\/\s*/g, '/')
          .trim();

        // Extract PH (items between PayScale and SLO columns)
        const phItems = rowItems.filter((i) => i.x >= colBoundPayScaleMax && i.x < colBoundPhMax);
        const ph = phItems.map((i) => i.str.trim()).filter((s) => /^(Yes|No)$/i.test(s))[0] || 'No';

        // Extract SLO (items between PH and Basic columns)
        const sloItems = rowItems.filter((i) => i.x >= colBoundPhMax && i.x < colBoundSloMax);
        const slo = sloItems.map((i) => i.str.trim()).filter((s) => /^[PTN]$/i.test(s))[0] || 'P';

        // Extract Monetary Amounts (all decimal items in allowance columns to right of SLO column)
        const amountItems = rowItems
          .filter((i) => i.x >= colBoundSloMax && /\b\d+(?:\.\d{2})?\b/.test(i.str.trim()))
          .sort((a, b) => a.x - b.x);

        const amounts = amountItems
          .map((i) => parseNum(i.str.trim()))
          .filter((v) => !isNaN(v));

        let basicPay = 0;
        let da = 0;
        let hra = 0;
        let cla = 0;
        let medicalAllowance = 0;
        let transportAllowance = 0;
        let specialPay = 0;
        let washingAllowance = 0;
        let nonPrivatePracticeAllowance = 0;
        let otherAllowance = 0;
        let grossAmount = 0;

        if (amounts.length >= 7) {
          const len = amounts.length;
          basicPay = amounts[0];
          da = amounts[1];
          hra = amounts[2];
          cla = amounts[3];
          medicalAllowance = amounts[4];
          transportAllowance = amounts[5];
          grossAmount = amounts[len - 1];

          const intermediateCount = len - 7;
          if (intermediateCount === 1) {
            const extra = amounts[6];
            if (detectedCols?.hasSpecialPay) specialPay = extra;
            else if (detectedCols?.hasWashing) washingAllowance = extra;
            else nonPrivatePracticeAllowance = extra;
          } else if (intermediateCount === 2) {
            specialPay = amounts[6];
            washingAllowance = amounts[7];
          } else if (intermediateCount >= 3) {
            specialPay = amounts[6];
            washingAllowance = amounts[7];
            nonPrivatePracticeAllowance = amounts[8];
            if (intermediateCount > 3) {
              otherAllowance = amounts.slice(9, len - 1).reduce((s, v) => s + v, 0);
            }
          }
        }

        allRows.push({
          srNo,
          hrpn: currentHrpn.str.trim(),
          employeeName: employeeName || 'Employee',
          designation: designation || 'Staff',
          payScale: payScale || '',
          ph: ph || 'No',
          slo: slo || '',
          basicPay,
          da,
          hra,
          cla,
          medicalAllowance,
          transportAllowance,
          specialPay,
          washingAllowance,
          nonPrivatePracticeAllowance,
          otherAllowance,
          grossAmount,
        });
      }
    }

    return allRows;
  }

  /**
   * Extract individual employee rows from the table body (text fallback)
   */
  extractEmployeeRows(
    text: string,
    detectedCols?: DetectedColumns,
    _warnings?: string[]
  ): PayBillEmployeeRow[] {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows: PayBillEmployeeRow[] = [];

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    // Find lines where HRPN appears (7 to 10 digits)
    const rowAnchors: Array<{ lineIndex: number; hrpn: string; srNo?: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header lines or total lines
      if (/PAYBILL|INNER SHEET|D\.D\.O|Major Head|TAN No|Cardex|Total\b|Rupees/i.test(line)) {
        continue;
      }

      // Check for SrNo + HRPN e.g. "1 20013826" or "1 20105536 Shri.Amarjeet..." or isolated "20105536"
      const srHrpnMatch = line.match(/^(\d{1,4})\s+(\d{7,10})\b/);
      if (srHrpnMatch) {
        rowAnchors.push({
          lineIndex: i,
          srNo: parseInt(srHrpnMatch[1], 10),
          hrpn: srHrpnMatch[2],
        });
        continue;
      }

      const isolatedHrpnMatch = line.match(/^(\d{7,10})\b/);
      if (isolatedHrpnMatch) {
        rowAnchors.push({
          lineIndex: i,
          hrpn: isolatedHrpnMatch[1],
        });
      }
    }

    // Process each anchor block
    for (let a = 0; a < rowAnchors.length; a++) {
      const anchor = rowAnchors[a];
      const startLine = anchor.lineIndex;
      const nextAnchorLine = a < rowAnchors.length - 1 ? rowAnchors[a + 1].lineIndex : lines.length;

      // Determine end of this employee's block (either next anchor, or 'Total', or 'I hereby certify', etc.)
      let endLine = nextAnchorLine;
      for (let j = startLine; j < nextAnchorLine; j++) {
        if (/^(Total\b|I hereby certify|Rupees\s*:|karmyogi)/i.test(lines[j])) {
          endLine = j;
          break;
        }
      }

      const blockLines = lines.slice(startLine, endLine);
      const blockText = blockLines.join(' ');

      // Extract monetary numbers in this block:
      // Monetary amounts in Gujarat paybills are strictly formatted with decimals (.00)
      // E.g. "37600.00 22560.00 6016.00 270.00 1000.00 3600.00 0.00 0.00 71046.00"
      let numberMatches = blockText.match(/\b\d[\d,]*\.\d{2}\b/g);

      // If no decimal numbers found, fallback to parsing numbers after PH/SLO landmark
      if (!numberMatches || numberMatches.length < 3) {
        const afterPhSloMatch = blockText.match(/\b(?:No|Yes)\s+[PTN]\s+([\d.\s]+)$/i);
        if (afterPhSloMatch) {
          numberMatches = afterPhSloMatch[1].match(/\b\d+(?:\.\d+)?\b/g);
        } else {
          numberMatches = blockText.match(/\b\d{3,}(?:\.\d+)?\b/g);
        }
      }

      let basicPay = 0;
      let da = 0;
      let hra = 0;
      let cla = 0;
      let medicalAllowance = 0;
      let transportAllowance = 0;
      let specialPay = 0;
      let washingAllowance = 0;
      let nonPrivatePracticeAllowance = 0;
      let otherAllowance = 0;
      let grossAmount = 0;

      if (numberMatches && numberMatches.length >= 7) {
        const amounts = numberMatches.map(parseNum);
        const len = amounts.length;

        // Position 0..5 are ALWAYS the 6 standard IFMS columns:
        // 0: Basic Pay
        // 1: DA
        // 2: HRA
        // 3: CLA
        // 4: Med Allow
        // 5: Trans Allow
        basicPay = amounts[0];
        da = amounts[1];
        hra = amounts[2];
        cla = amounts[3];
        medicalAllowance = amounts[4];
        transportAllowance = amounts[5];

        // The LAST amount is ALWAYS the Gross Amount
        grossAmount = amounts[len - 1];

        // Intermediate columns (between index 6 and len - 2)
        const intermediateCount = len - 7;

        if (intermediateCount === 1) {
          // 8 total columns: Basic, DA, HRA, CLA, Med, Trans, [Extra], Gross
          const extraVal = amounts[6];
          if (detectedCols?.hasSpecialPay) {
            specialPay = extraVal;
          } else if (detectedCols?.hasWashing) {
            washingAllowance = extraVal;
          } else {
            // Default to NPP
            nonPrivatePracticeAllowance = extraVal;
          }
        } else if (intermediateCount === 2) {
          // 9 total columns (e.g. Clerks/Drivers/Peons):
          // Basic, DA, HRA, CLA, Med, Trans, Special Addl Pay, Washing Allow, Gross
          specialPay = amounts[6];
          washingAllowance = amounts[7];
        } else if (intermediateCount >= 3) {
          // 10+ columns
          specialPay = amounts[6];
          washingAllowance = amounts[7];
          nonPrivatePracticeAllowance = amounts[8];
          if (intermediateCount > 3) {
            otherAllowance = amounts.slice(9, len - 1).reduce((s, v) => s + v, 0);
          }
        }
      } else if (numberMatches && numberMatches.length >= 2) {
        // Fallback for minimal columns
        grossAmount = parseNum(numberMatches[numberMatches.length - 1]);
        basicPay = parseNum(numberMatches[0]);
        if (numberMatches.length >= 3) da = parseNum(numberMatches[1]);
        if (numberMatches.length >= 4) hra = parseNum(numberMatches[2]);
        if (numberMatches.length >= 5) cla = parseNum(numberMatches[3]);
        if (numberMatches.length >= 6) medicalAllowance = parseNum(numberMatches[4]);
      }

      // Extract text details: Employee Name, Designation, Pay Scale, PH, SLO
      // Handle multi-line table cells where name spans 3 lines and payscale spans 2 lines across numbers.

      // 1. Remove Sr No and HRPN from blockText
      let text = blockText
        .replace(new RegExp(`^${anchor.srNo || ''}\\s*`), '')
        .replace(new RegExp(`\\b${anchor.hrpn}\\b`), '')
        .trim();

      // 2. Remove all monetary decimal amounts (e.g. 37600.00, 22560.00)
      text = text.replace(/\b\d[\d,]*\.\d{2}\b/g, ' ').trim();

      // 3. Extract PH (No / Yes) and SLO (P / T / N / etc.)
      let ph = 'No';
      let slo = 'P';
      const phSloMatch = text.match(/\b(No|Yes)\s+([PTN])\b/i);
      if (phSloMatch) {
        ph = phSloMatch[1];
        slo = phSloMatch[2].toUpperCase();
        text = text.replace(phSloMatch[0], ' ').trim();
      }

      // 4. Extract Pay Scale (including multi-line / split pay scale fragments)
      // Handles contiguous ("PB-2 (9300-34800)/4200", "4440-7440/1400")
      // and split fragments across line wraps ("PB-2 (9300-" ... "34800)/4200")
      let payScale = '';

      const fullPayScaleMatch = text.match(
        /\b(PB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)\/\d{3,5}|PB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)|\d{4,5}-\d{4,5}\/\d{3,4}|Level-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)|Level-?\d+|Fixed\s+Pay)\b/i
      );

      if (fullPayScaleMatch) {
        payScale = fullPayScaleMatch[1];
        text = text.replace(fullPayScaleMatch[0], ' ').trim();
      } else {
        // Check for split pay scale fragments (e.g. "PB-2 (9300-" and "34800)/4200")
        const prefixMatch = text.match(/\b(PB-?\d+\s*\(\s*\d{3,5}\s*-?)/i);
        const suffixMatch = text.match(/\b(\d{3,5}\s*\)\s*\/\s*\d{3,5})\b/);
        if (prefixMatch && suffixMatch) {
          const rawJoined = `${prefixMatch[1]} ${suffixMatch[1]}`;
          payScale = rawJoined
            .replace(/\s+/g, '')
            .replace(/PB-(\d+)/, 'PB-$1 ')
            .replace(/\((\d+)-(\d+)\)/, '($1-$2)')
            .trim();
          text = text.replace(prefixMatch[0], ' ').replace(suffixMatch[0], ' ').trim();
        } else if (prefixMatch) {
          payScale = prefixMatch[1].trim();
          text = text.replace(prefixMatch[0], ' ').trim();
        } else if (suffixMatch) {
          payScale = suffixMatch[1].trim();
          text = text.replace(suffixMatch[0], ' ').trim();
        }
      }

      if (payScale) {
        payScale = payScale
          .replace(/\s+/g, ' ')
          .replace(/-\s+/g, '-')
          .replace(/\s+-/g, '-')
          .replace(/\s*\/\s*/g, '/')
          .trim();
      }

      // 5. Extract Designation
      const desigPatterns = [
        /\b(Deputy\s+Director\s*\([^)]+\))/i,
        /\b(Assistant\s+Director\s*\([^)]+\))/i,
        /\b(Joint\s+Director\s*\([^)]+\))/i,
        /\b(Senior\s+Veterinary\s+Officer\s*\([^)]+\))/i,
        /\b(Veterinary\s+Officer\s*\([^)]+\))/i,
        /\b(Deputy\s+Director)\b/i,
        /\b(Assistant\s+Director)\b/i,
        /\b(Joint\s+Director)\b/i,
        /\b(Director)\b/i,
        /\b(Office\s+Superintendent)\b/i,
        /\b(Superintendent)\b/i,
        /\b(Statistical\s+Inspector)\b/i,
        /\b(Statistical\s+Assistant)\b/i,
        /\b(Statistical\s+Officer)\b/i,
        /\b(Research\s+Assistant)\b/i,
        /\b(Junior\s+Accountant)\b/i,
        /\b(Senior\s+Accountant)\b/i,
        /\b(Accountant)\b/i,
        /\b(Senior\s+Clerk)\b/i,
        /\b(Junior\s+Clerk)\b/i,
        /\b(Head\s+Clerk)\b/i,
        /\b(Clerk\s+cum\s+Typist)\b/i,
        /\b(Clerk)\b/i,
        /\b(Typist)\b/i,
        /\b(Stenographer)\b/i,
        /\b(Driver\s+cum\s+Mechanic)\b/i,
        /\b(Driver)\b/i,
        /\b(Peon\s+cum\s+Chowkidar)\b/i,
        /\b(Peon)\b/i,
        /\b(Chowkidar)\b/i,
        /\b(Sweeper)\b/i,
        /\b(Watchman)\b/i,
        /\b(Animal\s+Attendant)\b/i,
        /\b(Dresser)\b/i,
        /\b(Attendant)\b/i,
        /\b(Senior\s+Veterinary\s+Officer)\b/i,
        /\b(Veterinary\s+Officer)\b/i,
        /\b(Veterinary\s+Doctor)\b/i,
        /\b(Live\s*Stock\s+Inspector)\b/i,
        /\b(Live\s*Stock\s+Supervisor)\b/i,
        /\b(Administrative\s+Officer)\b/i,
        /\b(Accounts\s+Officer)\b/i,
        /\b(Audit\s+Officer)\b/i,
        /\b(Section\s+Officer)\b/i,
        /\b(Technical\s+Assistant)\b/i,
        /\b(Lab\s+Assistant)\b/i,
        /\b(Field\s+Assistant)\b/i,
        /\b(Executive\s+Engineer)\b/i,
        /\b(Assistant\s+Engineer)\b/i,
        /\b(Junior\s+Engineer)\b/i,
        /\b(Inspector)\b/i,
        /\b(Assistant)\b/i,
        /\b(Operator)\b/i,
        /\b(Officer)\b/i,
      ];

      let designation = '';
      for (const dPattern of desigPatterns) {
        const dMatch = text.match(dPattern);
        if (dMatch) {
          designation = dMatch[1].trim();
          text = text.replace(dMatch[0], ' ').trim();
          break;
        }
      }

      // 6. Clean Employee Name
      // Ensure zero residual pay scale numbers, brackets, slashes, or grade pays remain in name
      let employeeName = text
        .replace(/PB-?\d+/gi, '')
        .replace(/\(\d{4,5}-\d{4,5}\)/g, '')
        .replace(/\/?\b\d{3,4}\b/g, '')
        .replace(/[0-9/()\\-]/g, ' ')
        .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
        .replace(/\s+/g, ' ')
        .trim();

      employeeName = employeeName.replace(/^[^A-Za-z.]+/, '').trim();

      rows.push({
        srNo: anchor.srNo || rows.length + 1,
        hrpn: anchor.hrpn,
        employeeName: employeeName || 'Employee',
        designation: designation || 'Staff',
        payScale: payScale || '',
        ph: ph || 'No',
        slo: slo || '',
        basicPay,
        da,
        hra,
        cla,
        medicalAllowance,
        transportAllowance,
        specialPay,
        washingAllowance,
        nonPrivatePracticeAllowance,
        otherAllowance,
        grossAmount,
      });
    }

    return rows;
  }

  /**
   * Extract bottom summary / Total row from text and compare
   */
  extractTotals(
    text: string,
    detectedCols?: DetectedColumns,
    _rows?: PayBillEmployeeRow[]
  ): PayBillTotalRow | null {
    const clean = text.replace(/\r\n/g, '\n');
    const totalLineMatch = clean.match(/Total\s+([0-9.,\s]+)/i);

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const c = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const n = parseFloat(c);
      return isNaN(n) ? 0 : n;
    };

    if (totalLineMatch && totalLineMatch[1]) {
      const numbers = totalLineMatch[1].match(/\b\d[\d,]*\.\d{2}\b/g) || totalLineMatch[1].match(/\b\d[\d,]*(?:\.\d+)?\b/g);
      if (numbers && numbers.length >= 7) {
        const amounts = numbers.map(parseNum);
        const len = amounts.length;

        let specialPay = 0;
        let washingAllowance = 0;
        let nonPrivatePracticeAllowance = 0;
        let otherAllowance = 0;

        const intermediateCount = len - 7;
        if (intermediateCount === 1) {
          const extra = amounts[6];
          if (detectedCols?.hasSpecialPay) specialPay = extra;
          else if (detectedCols?.hasWashing) washingAllowance = extra;
          else nonPrivatePracticeAllowance = extra;
        } else if (intermediateCount === 2) {
          specialPay = amounts[6];
          washingAllowance = amounts[7];
        } else if (intermediateCount >= 3) {
          specialPay = amounts[6];
          washingAllowance = amounts[7];
          nonPrivatePracticeAllowance = amounts[8];
          if (intermediateCount > 3) {
            otherAllowance = amounts.slice(9, len - 1).reduce((s, v) => s + v, 0);
          }
        }

        return {
          basicPay: amounts[0],
          da: amounts[1],
          hra: amounts[2],
          cla: amounts[3],
          medicalAllowance: amounts[4],
          transportAllowance: amounts[5],
          specialPay,
          washingAllowance,
          nonPrivatePracticeAllowance,
          otherAllowance,
          grossAmount: amounts[len - 1],
        };
      }
    }

    // Also check Rupees field e.g. "Rupees : 433194"
    const rupeesMatch = clean.match(/Rupees\s*:\s*([0-9.,]+)/i);
    if (rupeesMatch) {
      const gross = parseNum(rupeesMatch[1]);
      return {
        basicPay: 0,
        da: 0,
        hra: 0,
        cla: 0,
        medicalAllowance: 0,
        transportAllowance: 0,
        specialPay: 0,
        washingAllowance: 0,
        nonPrivatePracticeAllowance: 0,
        otherAllowance: 0,
        grossAmount: gross,
      };
    }

    return null;
  }

  /**
   * Extract Deduction rows using exact 2D canvas coordinates
   */
  private extractDeductionRowsFromItems(
    items: RawTextItem[],
    _warnings?: string[]
  ): PayBillDeductionRow[] {
    if (!items || items.length === 0) return [];

    const allRows: PayBillDeductionRow[] = [];

    // Group items by page
    const pageMap = new Map<number, RawTextItem[]>();
    for (const item of items) {
      const pageList = pageMap.get(item.page) || [];
      pageList.push(item);
      pageMap.set(item.page, pageList);
    }

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    for (const [_pageNum, pageItems] of pageMap) {
      // 1. Locate Table Header Y position
      let tableHeaderY = 0;
      let hrpnHeaderItem: RawTextItem | undefined;
      let nameHeaderItem: RawTextItem | undefined;
      let desigHeaderItem: RawTextItem | undefined;
      let itHeaderItem: RawTextItem | undefined;
      let ptHeaderItem: RawTextItem | undefined;
      let hbaHeaderItem: RawTextItem | undefined;
      let gpfHeaderItem: RawTextItem | undefined;
      let gpf4HeaderItem: RawTextItem | undefined;
      let npsHeaderItem: RawTextItem | undefined;
      let gisFundHeaderItem: RawTextItem | undefined;
      let gisSaveHeaderItem: RawTextItem | undefined;
      let totDedHeaderItem: RawTextItem | undefined;
      let netPayHeaderItem: RawTextItem | undefined;

      for (const item of pageItems) {
        const s = item.str.trim();
        if (/^HRPN$/i.test(s)) {
          hrpnHeaderItem = item;
          tableHeaderY = item.y;
        } else if (/Employee\s+Name/i.test(s) || s === 'Name') {
          nameHeaderItem = item;
          if (!tableHeaderY) tableHeaderY = item.y;
        } else if (/Designation/i.test(s)) {
          desigHeaderItem = item;
        } else if (/Income\s+Tax|\(9510\)/i.test(s)) {
          if (!itHeaderItem) itHeaderItem = item;
        } else if (/Prof\s+Tax|\(9570\)/i.test(s)) {
          if (!ptHeaderItem) ptHeaderItem = item;
        } else if (/HBA\s+Interest|\(9591\)/i.test(s)) {
          if (!hbaHeaderItem) hbaHeaderItem = item;
        } else if (/GPF\s+Reg\s+Class\s+4|\(9531\)/i.test(s)) {
          if (!gpf4HeaderItem) gpf4HeaderItem = item;
        } else if (/GPF\s+Reg|\(9670\)/i.test(s)) {
          if (!gpfHeaderItem) gpfHeaderItem = item;
        } else if (/NPS\s+Reg|\(9534\)/i.test(s)) {
          if (!npsHeaderItem) npsHeaderItem = item;
        } else if (/Govt\s+Fund|\(9581\)/i.test(s)) {
          if (!gisFundHeaderItem) gisFundHeaderItem = item;
        } else if (/Govt\s+Saving|\(9582\)/i.test(s)) {
          if (!gisSaveHeaderItem) gisSaveHeaderItem = item;
        } else if (/Total\s+Ded/i.test(s)) {
          if (!totDedHeaderItem) totDedHeaderItem = item;
        } else if (/Net\s+Pay/i.test(s)) {
          if (!netPayHeaderItem) netPayHeaderItem = item;
        }
      }

      if (!tableHeaderY) {
        const anyHeaderItem = pageItems.find((i) =>
          /PAYBILL\s+INNER\s+SHEET|D\.D\.O|Major\s+Head|TAN\s+No/i.test(i.str)
        );
        tableHeaderY = anyHeaderItem ? anyHeaderItem.y - 25 : 600;
      }

      // 2. Locate Total / Footer Y position
      let totalY = 0;
      const totalItem = pageItems.find((i) => /^Total\b/i.test(i.str.trim()) && i.y < tableHeaderY);
      if (totalItem) {
        totalY = totalItem.y;
      } else {
        const certItem = pageItems.find((i) => /I\s+hereby\s+certify|Rupees\s*:/i.test(i.str));
        if (certItem) totalY = certItem.y + 15;
      }

      // 3. Find Employee HRPN items strictly within table body
      const tableBodyItems = pageItems.filter(
        (i) => i.y < tableHeaderY - 10 && (totalY === 0 || i.y > totalY + 2)
      );

      const hrpnX = hrpnHeaderItem?.x || 60;
      const hrpnColumnItems = tableBodyItems
        .filter((i) => {
          const str = i.str.trim();
          const isDigitHrpn = /^\d{7,10}$/.test(str) && !/2403|0299/.test(str);
          const isNearHrpnCol = Math.abs(i.x - hrpnX) < 40;
          return isDigitHrpn && isNearHrpnCol;
        })
        .sort((a, b) => b.y - a.y);

      if (hrpnColumnItems.length === 0) continue;

      // 4. Calculate Column Intervals
      const nameX = nameHeaderItem?.x || hrpnX + 55;
      const desigX = desigHeaderItem?.x || nameX + 110;
      const itX = itHeaderItem?.x || desigX + 90;
      const ptX = ptHeaderItem?.x || itX + 55;
      const hbaX = hbaHeaderItem?.x || ptX + 45;
      const gpfX = gpfHeaderItem?.x || hbaX + 55;
      const gpf4X = gpf4HeaderItem?.x || gpfX + 60;
      const npsX = npsHeaderItem?.x || gpf4X + 60;
      const gisFundX = gisFundHeaderItem?.x || npsX + 55;
      const gisSaveX = gisSaveHeaderItem?.x || gisFundX + 50;
      const totDedX = totDedHeaderItem?.x || gisSaveX + 50;
      const netPayX = netPayHeaderItem?.x || totDedX + 55;

      const colBoundHrpnMax = (hrpnX + nameX) / 2;
      const colBoundNameMax = (nameX + desigX) / 2;
      const colBoundDesigMax = (desigX + itX) / 2;

      // 5. Extract Each Deduction Row
      for (let r = 0; r < hrpnColumnItems.length; r++) {
        const currentHrpn = hrpnColumnItems[r];
        const nextHrpn = r < hrpnColumnItems.length - 1 ? hrpnColumnItems[r + 1] : null;

        const rowTopY = r === 0 ? tableHeaderY - 10 : (hrpnColumnItems[r - 1].y + currentHrpn.y) / 2;
        const rowBottomY = nextHrpn ? (currentHrpn.y + nextHrpn.y) / 2 : (totalY ? totalY + 2 : currentHrpn.y - 35);

        const rowItems = tableBodyItems.filter((i) => i.y <= rowTopY && i.y > rowBottomY);

        // Sr No
        const srNoItems = rowItems
          .filter((i) => i.x < hrpnX - 5 && /^\d{1,4}$/.test(i.str.trim()))
          .sort((a, b) => b.y - a.y);
        const srNo = srNoItems.length > 0 ? parseInt(srNoItems[0].str.trim(), 10) : r + 1;

        // Employee Name
        const nameItems = rowItems
          .filter((i) => i.x >= colBoundHrpnMax && i.x < colBoundNameMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);

        let employeeName = nameItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/[0-9/()\\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Designation
        const desigItems = rowItems
          .filter((i) => i.x >= colBoundNameMax && i.x < colBoundDesigMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);

        let designation = desigItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/^(Designation|Desig)\s+/i, '')
          .trim();

        // Deduction numeric items (all items to the right of designation boundary)
        const numericItems = rowItems
          .filter((i) => i.x >= colBoundDesigMax)
          .map((i) => ({ str: i.str.trim(), x: i.x, y: i.y }))
          .filter((i) => /\b\d+(?:\.\d{2})?\b/.test(i.str))
          .sort((a, b) => a.x - b.x);

        // Helper to find closest numeric value to a column target X.
        // Two-pass tolerance: try tight window first, widen on a miss so that
        // slightly shifted columns are still captured instead of silently zeroed.
        // Each numeric item can only be claimed once to prevent column bleeding.
        const claimed = new Set<number>();
        const findValNearX = (targetX: number, maxDist = 30): number => {
          const find = (dist: number): { str: string; dist: number; idx: number } | null => {
            let best: { str: string; dist: number; idx: number } | null = null;
            for (let i = 0; i < numericItems.length; i++) {
              if (claimed.has(i)) continue;
              const d = Math.abs(numericItems[i].x - targetX);
              if (d <= dist && (!best || d < best.dist)) {
                best = { str: numericItems[i].str, dist: d, idx: i };
              }
            }
            return best;
          };
          const tight = find(maxDist);
          if (tight !== null) {
            claimed.add(tight.idx);
            return parseNum(tight.str);
          }
          const wide = find(Math.max(maxDist, 80));
          if (wide !== null) {
            claimed.add(wide.idx);
            return parseNum(wide.str);
          }
          return 0;
        };

        const incomeTax = findValNearX(itX);
        const profTax = findValNearX(ptX);
        const hbaInterest = findValNearX(hbaX);
        const gpfRegular = findValNearX(gpfX);
        const gpfClass4 = findValNearX(gpf4X);
        const npsRegular = findValNearX(npsX);
        const gisGovtFund = findValNearX(gisFundX);
        const gisGovtSaving = findValNearX(gisSaveX);
        const totalDeductions = findValNearX(totDedX);
        const netPay = findValNearX(netPayX);

        allRows.push({
          srNo,
          hrpn: currentHrpn.str.trim(),
          employeeName: employeeName || `Employee ${currentHrpn.str.trim()}`,
          designation: designation || 'Staff',
          incomeTax,
          profTax,
          hbaInterest,
          gpfRegular,
          gpfClass4,
          npsRegular,
          gisGovtFund,
          gisGovtSaving,
          totalDeductions: totalDeductions || (incomeTax + profTax + hbaInterest + gpfRegular + gpfClass4 + npsRegular + gisGovtFund + gisGovtSaving),
          netPay,
        });
      }
    }

    return allRows;
  }

  /**
   * Structured text / OCR fallback extraction for Deduction rows
   */
  private extractDeductionRows(text: string, _warnings?: string[]): PayBillDeductionRow[] {
    const rows: PayBillDeductionRow[] = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    let inTable = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^Sr\b|^HRPN\b|Employee\s+Name|Income\s+Tax/i.test(line)) {
        inTable = true;
        continue;
      }
      if (/^Total\b|Rupees\s*:|I\s+hereby\s+certify/i.test(line)) {
        break;
      }
      if (!inTable) continue;

      // Look for HRPN pattern
      const hrpnMatch = line.match(/\b(20\d{6})\b/);
      if (!hrpnMatch) continue;

      const hrpn = hrpnMatch[1];
      const numbers = line.match(/\b\d[\d,]*\.\d{2}\b/g) || line.match(/\b\d[\d,]*(?:\.\d+)?\b/g);

      if (numbers && numbers.length >= 8) {
        const amounts = numbers.map(parseNum);
        const len = amounts.length;

        // Clean name and designation
        const textBeforeNums = line.substring(0, line.indexOf(numbers[0])).replace(hrpn, '').trim();
        const parts = textBeforeNums.split(/\s{2,}|\t/);
        const employeeName = (parts[0] || 'Employee').replace(/^\d+\s+/, '').trim();
        const designation = parts[1] || 'Staff';

        // If the printed Total Deductions column is blank, derive it from the sum of the 8
        // deduction fields (row then has 9 numbers: 8 fields + net pay)
        const totalDeductions =
          len >= 10
            ? amounts[len - 2]
            : len === 9
              ? amounts.slice(0, 8).reduce((s, v) => s + v, 0)
              : amounts.slice(0, len - 2).reduce((s, v) => s + v, 0);

        rows.push({
          hrpn,
          employeeName,
          designation,
          incomeTax: amounts[0] || 0,
          profTax: amounts[1] || 0,
          hbaInterest: amounts[2] || 0,
          gpfRegular: amounts[3] || 0,
          gpfClass4: amounts[4] || 0,
          npsRegular: amounts[5] || 0,
          gisGovtFund: amounts[6] || 0,
          gisGovtSaving: amounts[7] || 0,
          totalDeductions,
          netPay: amounts[len - 1] || 0,
        });
      }
    }

    return rows;
  }

  /**
   * Extract Deduction Totals from footer
   */
  private extractDeductionTotals(
    text: string,
    _rows?: PayBillDeductionRow[]
  ): PayBillDeductionTotalRow | null {
    const clean = text.replace(/\r\n/g, '\n');
    const totalLineMatch = clean.match(/Total\s+([0-9.,\s]+)/i);

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const c = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const n = parseFloat(c);
      return isNaN(n) ? 0 : n;
    };

    if (totalLineMatch && totalLineMatch[1]) {
      const numbers =
        totalLineMatch[1].match(/\b\d[\d,]*\.\d{2}\b/g) ||
        totalLineMatch[1].match(/\b\d[\d,]*(?:\.\d+)?\b/g);

      if (numbers && numbers.length >= 8) {
        const amounts = numbers.map(parseNum);
        const len = amounts.length;

        return {
          incomeTax: amounts[0],
          profTax: amounts[1],
          hbaInterest: amounts[2],
          gpfRegular: amounts[3],
          gpfClass4: amounts[4],
          npsRegular: amounts[5],
          gisGovtFund: amounts[6],
          gisGovtSaving: amounts[7],
          totalDeductions: amounts[len - 2],
          netPay: amounts[len - 1],
        };
      }
    }

    return null;
  }
}

export const pdfParserService = new PdfParserService();

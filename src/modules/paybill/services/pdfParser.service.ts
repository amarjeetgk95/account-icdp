import { componentMasterService } from './componentMaster.service';
import { splitBundledNameAndDesignation } from './hrpnMapping.service';
import type {
  PayBillMetadata,
  PayBillEmployeeRow,
  PayBillTotalRow,
  PayBillParsedResult,
  PayBillDeductionRow,
  PayBillDeductionTotalRow,
  PayBillSheetType,
  PayBillEmployeeComponent,
  DetectedComponentInfo,
  ComponentMatchResult,
} from '../types';

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

interface PdfTextItem {
  str: string;
  transform?: number[];
  width?: number;
  height?: number;
}

interface DetectedColumns {
  hasSpecialPay: boolean;
  hasWashing: boolean;
  hasNpp: boolean;
  columnCount: number;
  /** Component columns detected in the PDF header, in PDF (left-to-right) order. */
  components?: DetectedComponentInfo[];
}

export interface PositionalEarningAmounts {
  basicPay: number;
  da: number;
  hra: number;
  cla: number;
  medicalAllowance: number;
  transportAllowance: number;
  specialPay: number;
  washingAllowance: number;
  nonPrivatePracticeAllowance: number;
  otherAllowance: number;
  grossAmount: number;
}

/**
 * Map left-to-right positional amounts of an earnings row to earning fields.
 * Full bills carry 7+ amounts (Basic, DA, HRA, CLA, Med, Trans, [Special,
 * Washing, NPP, ...], Gross). Minimal-column bills (e.g. a flat bill with
 * only Basic Pay + Gross Amt) carry fewer: the first amount is Basic Pay,
 * the last is Gross Amt, and any middle amounts map positionally
 * (same fallback as the text extraction path).
 */
export function mapPositionalEarningAmounts(
  amounts: number[],
  detectedCols?: DetectedColumns
): PositionalEarningAmounts {
  const empty: PositionalEarningAmounts = {
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
    grossAmount: 0,
  };
  if (!amounts || amounts.length === 0) return empty;

  if (amounts.length >= 7) {
    const len = amounts.length;
    const mapped: PositionalEarningAmounts = {
      ...empty,
      basicPay: amounts[0],
      da: amounts[1],
      hra: amounts[2],
      cla: amounts[3],
      medicalAllowance: amounts[4],
      transportAllowance: amounts[5],
      grossAmount: amounts[len - 1],
    };

    const intermediateCount = len - 7;
    if (intermediateCount === 1) {
      const extra = amounts[6];
      if (detectedCols?.hasSpecialPay) mapped.specialPay = extra;
      else if (detectedCols?.hasWashing) mapped.washingAllowance = extra;
      else mapped.nonPrivatePracticeAllowance = extra;
    } else if (intermediateCount === 2) {
      mapped.specialPay = amounts[6];
      mapped.washingAllowance = amounts[7];
    } else if (intermediateCount >= 3) {
      mapped.specialPay = amounts[6];
      mapped.washingAllowance = amounts[7];
      mapped.nonPrivatePracticeAllowance = amounts[8];
      if (intermediateCount > 3) {
        mapped.otherAllowance = amounts.slice(9, len - 1).reduce((s, v) => s + v, 0);
      }
    }
    return mapped;
  }

  // Minimal-column bill: first = Basic Pay, last = Gross Amt.
  const len = amounts.length;
  const mapped: PositionalEarningAmounts = {
    ...empty,
    basicPay: amounts[0],
    grossAmount: amounts[len - 1],
  };
  if (len >= 3) mapped.da = amounts[1];
  if (len >= 4) mapped.hra = amounts[2];
  if (len >= 5) mapped.cla = amounts[3];
  if (len >= 6) mapped.medicalAllowance = amounts[4];
  return mapped;
}

class PdfParserService {
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
    // Broadened: real Karmayogi PDFs vary ("Deduction", "DEDUCTION SIDE",
    // "Income Tax" without code, Gujarati headers, split header items).
    // Any deduction-only marker (codes 9510/9570, Net Pay, Total Ded) forces
    // DEDUCTION so income-tax rows are never silently parsed as earnings.
    const isDeduction =
      /Deduct/i.test(rawText) ||
      /9510/.test(rawText) ||
      /9570/.test(rawText) ||
      /Net\s*Pay/i.test(rawText) ||
      /Total\s+Ded/i.test(rawText) ||
      /Income\s*Tax/i.test(rawText);
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
      // 3. Extract Deduction Rows — coordinate (header-X) path first, text
      // path as cross-check. Real PDFs (e.g. gazetted March-2026) return rows
      // from coordinates but can miss a single cell (IT) when its number is
      // printed slightly off its header X. Merging fills such holes instead
      // of silently leaving income-tax at 0.
      let deductionRows: PayBillDeductionRow[] = [];
      let coordRows: PayBillDeductionRow[] = [];
      if (items && items.length > 0) {
        try {
          coordRows = this.extractDeductionRowsFromItems(items, warnings);
        } catch (err) {
          console.warn('[PdfParserService] Coordinate deduction extraction fallback:', err);
        }
      }

      let textRows: PayBillDeductionRow[] = [];
      try {
        textRows = this.extractDeductionRows(rawText, warnings);
      } catch (err) {
        console.warn('[PdfParserService] Text deduction extraction failed:', err);
      }

      if (coordRows.length === 0) {
        deductionRows = textRows;
      } else if (textRows.length === 0) {
        deductionRows = coordRows;
      } else {
        deductionRows = this.mergeDeductionRows(coordRows, textRows, warnings);
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
        detectedComponents: componentMasterService.detectHeaderComponents(rawText, 'DEDUCTION'),
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
      detectedComponents: detectedCols.components || [],
    };
  }

  /**
   * Extract raw text and item coordinates using unpdf
   */
  private async extractTextAndItems(
    arrayBuffer: ArrayBuffer
  ): Promise<{ rawText: string; pageCount: number; items: RawTextItem[] }> {
    const data = new Uint8Array(arrayBuffer);
    const { extractText, getDocumentProxy } = await import('unpdf');

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
            const pdfItem = item as PdfTextItem;
            const transform = pdfItem.transform;
            const x = transform ? transform[4] : 0;
            const y = transform ? transform[5] : 0;
            const w = pdfItem.width || 0;
            const h = pdfItem.height || 0;

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
      components: componentMasterService.detectHeaderComponents(text, 'EARNING'),
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

    for (const [, pageItems] of pageMap) {
      // 1. Locate Table Header Y position
      // Find the header items: "HRPN", "Employee Name", "Designation", "Pay Scale", "Basic Pay"
      let tableHeaderY = 0;
      let hrpnHeaderItem: RawTextItem | undefined;
      let nameHeaderItem: RawTextItem | undefined;
      let desigHeaderItem: RawTextItem | undefined;
      let payScaleHeaderItem: RawTextItem | undefined;
      let phHeaderItem: RawTextItem | undefined;
      let sloHeaderItem: RawTextItem | undefined;
      const componentHeaderItems: Array<{ match: ComponentMatchResult; item: RawTextItem }> = [];

      const matcher = componentMasterService.getMatcher();

      for (const item of pageItems) {
        const s = item.str.trim();
        if (/^HRPN$/i.test(s)) {
          hrpnHeaderItem = item;
          tableHeaderY = item.y;
        } else if (
          /Employee\s+Name/i.test(s) ||
          /Name\s+of\s+(?:Govt\s+Servant|Government\s+Servant|Employee)/i.test(s) ||
          /^(?:Emp\.?\s*Name|Employee|Name)$/i.test(s) ||
          /કર્મચારીનું\s*નામ/i.test(s)
        ) {
          nameHeaderItem = item;
          if (!tableHeaderY) tableHeaderY = item.y;
        } else if (
          /Designation/i.test(s) ||
          /^Desig\.?$/i.test(s) ||
          /Designation\s+of\s+Post/i.test(s) ||
          /હોદ્દો/i.test(s)
        ) {
          desigHeaderItem = item;
        } else if (/Pay\s+Scale/i.test(s) || s === 'Scale') {
          payScaleHeaderItem = item;
        } else if (/^PH$/i.test(s)) {
          phHeaderItem = item;
        } else if (/^SLO$/i.test(s)) {
          sloHeaderItem = item;
        } else {
          const match = matcher.findComponent(s);
          if (match.component && match.matchMethod !== 'UNKNOWN') {
            componentHeaderItems.push({ match, item });
          }
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

      // Basic Pay is the leftmost detected component column (code 0101 / Basic Pay),
      // restricted to the table header band (excludes footer "Total" and DDO metadata lines).
      const basicCandidate = componentHeaderItems.find(
        ({ match, item }) =>
          (match.component?.componentName === 'Basic Pay' ||
            match.component?.componentCode === '0101' ||
            /Basic/i.test(item.str)) &&
          Math.abs(item.y - tableHeaderY) < 100
      );
      const basicHeaderItem = basicCandidate?.item;

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

      const minBasicX = Math.max(payScaleX + 60, phX + 40, sloX + 20);
      const basicX = Math.max(basicHeaderItem?.x || minBasicX, minBasicX);

      const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 25);
      const colBoundNameMax = (nameX + desigX) / 2;
      const colBoundDesigMax = (desigX + payScaleX) / 2;
      const colBoundPayScaleMax = (payScaleX + phX) / 2;
      const colBoundPhMax = (phX + sloX) / 2;
      const colBoundSloMax = Math.max(basicX - 35, (sloX + basicX) / 2);

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

        // Fallback for employee name if not captured in the strict column band
        if (!employeeName) {
          const fallbackNameItems = rowItems
            .filter((i) => {
              if (i.x <= hrpnX + 10 || i.x >= colBoundDesigMax) return false;
              if (desigItems.some((d) => d.x === i.x && d.y === i.y)) return false;
              const s = i.str.trim();
              if (/^\d+(?:\.\d+)?$/.test(s)) return false;
              if (designation && designation.includes(s)) return false;
              return true;
            })
            .sort((a, b) => b.y - a.y || a.x - b.x);

          employeeName = fallbackNameItems
            .map((i) => i.str.trim())
            .filter(Boolean)
            .join(' ')
            .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
            .replace(/[0-9/()\\-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Check if designation accidentally bundled the employee name
        // (handles both "Name Designation" and "Designation Name" orders)
        if (!employeeName && designation) {
          const split = splitBundledNameAndDesignation(designation);
          if (split) {
            employeeName = split.name;
            designation = split.designation;
          }
        }

        // Extract Pay Scale (items strictly between Designation and PH columns, or containing pay scale patterns)
        const payScaleItems = rowItems
          .filter(
            (i) =>
              (i.x >= colBoundDesigMax && i.x < colBoundPayScaleMax) ||
              /PB-?\d|Level|\/\d{3,5}|\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)/i.test(i.str.trim())
          )
          .sort((a, b) => b.y - a.y || a.x - b.x);

        const payScale = payScaleItems
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

        // Extract Monetary Amounts:
        // In Gujarat paybills, all salary numbers in table columns are strictly formatted with 2 decimal places (e.g. 105600.00, 270.00, 0.00).
        // Pay scales (e.g. "PB-3 (15600-", "39100)/6600") and PH/SLO codes MUST NEVER be included in amounts.
        const amountItems = rowItems
          .filter((i) => {
            const s = i.str.trim();
            // Reject any item containing pay scale patterns or non-numeric characters
            if (/PB|Level|Fixed|\/|\(|\)|[a-zA-Z]/i.test(s)) return false;
            // Reject if item is to the left of the allowances area
            if (i.x < colBoundSloMax) return false;
            // Must strictly match decimal currency format (e.g. "105600.00", "0.00")
            return /^\d[\d,]*\.\d{2}$/.test(s) || /^\d+\.\d{2}$/.test(s);
          })
          .sort((a, b) => a.x - b.x);

        let amounts = amountItems
          .map((i) => parseNum(i.str.trim()))
          .filter((v) => !isNaN(v));

        // Fallback for non-decimal formats if strict match found insufficient columns
        if (amounts.length < 7) {
          const fallbackItems = rowItems
            .filter((i) => {
              const s = i.str.trim();
              if (/PB|Level|Fixed|\/|\(|\)|[a-zA-Z]/.test(s)) return false;
              if (i.x < colBoundSloMax) return false;
              return /^\d{2,}(?:\.\d{2})?$/.test(s);
            })
            .sort((a, b) => a.x - b.x);
          if (fallbackItems.length >= 7) {
            amounts = fallbackItems.map((i) => parseNum(i.str.trim())).filter((v) => !isNaN(v));
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

        {
          const mapped = mapPositionalEarningAmounts(amounts, detectedCols);
          basicPay = mapped.basicPay;
          da = mapped.da;
          hra = mapped.hra;
          cla = mapped.cla;
          medicalAllowance = mapped.medicalAllowance;
          transportAllowance = mapped.transportAllowance;
          specialPay = mapped.specialPay;
          washingAllowance = mapped.washingAllowance;
          nonPrivatePracticeAllowance = mapped.nonPrivatePracticeAllowance;
          otherAllowance = mapped.otherAllowance;
          grossAmount = mapped.grossAmount;
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
          components: this.buildEarningComponents(amounts, detectedCols),
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
        components: this.buildEarningComponents(
          (numberMatches || []).map(parseNum),
          detectedCols
        ),
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

    for (const [, pageItems] of pageMap) {
      // 1. Locate Table Header Y position
      let tableHeaderY = 0;
      let hrpnHeaderItem: RawTextItem | undefined;
      let nameHeaderItem: RawTextItem | undefined;
      let desigHeaderItem: RawTextItem | undefined;
      const componentHeaderItems: Array<{ match: ComponentMatchResult; item: RawTextItem }> = [];

      const matcher = componentMasterService.getMatcher();

      for (const item of pageItems) {
        const s = item.str.trim();
        if (/^HRPN$/i.test(s)) {
          hrpnHeaderItem = item;
          tableHeaderY = item.y;
        } else if (
          /Employee\s+Name/i.test(s) ||
          /Name\s+of\s+(?:Govt\s+Servant|Government\s+Servant|Employee)/i.test(s) ||
          /^(?:Emp\.?\s*Name|Employee|Name)$/i.test(s) ||
          /કર્મચારીનું\s*નામ/i.test(s)
        ) {
          nameHeaderItem = item;
          if (!tableHeaderY) tableHeaderY = item.y;
        } else if (
          /Designation/i.test(s) ||
          /^Desig\.?$/i.test(s) ||
          /Designation\s+of\s+Post/i.test(s) ||
          /હોદ્દો/i.test(s)
        ) {
          desigHeaderItem = item;
        } else {
          const match = matcher.findComponent(s);
          if (match.component && match.matchMethod !== 'UNKNOWN') {
            componentHeaderItems.push({ match, item });
          }
        }
      }

      if (!tableHeaderY) {
        const anyHeaderItem = pageItems.find((i) =>
          /PAYBILL\s+INNER\s+SHEET|D\.D\.O|Major\s+Head|TAN\s+No/i.test(i.str)
        );
        tableHeaderY = anyHeaderItem ? anyHeaderItem.y - 25 : 600;
      }

      // Restrict component headers to the table header band (excludes footer "Total")
      const headerBandItems = componentHeaderItems.filter(
        ({ item }) => Math.abs(item.y - tableHeaderY) < 100
      );

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
      const itHit = this.findComponentHeaderX(headerBandItems, '9510');
      const ptHit = this.findComponentHeaderX(headerBandItems, '9570');
      const hbaHit = this.findComponentHeaderX(headerBandItems, '9591');
      const gpfHit = this.findComponentHeaderX(headerBandItems, '9670');
      const gpf4Hit = this.findComponentHeaderX(headerBandItems, '9531');
      const npsHit = this.findComponentHeaderX(headerBandItems, '9534');
      const gisFundHit = this.findComponentHeaderX(headerBandItems, '9581');
      const gisSaveHit = this.findComponentHeaderX(headerBandItems, '9582');
      const totDedHit = this.findComponentHeaderX(headerBandItems, 'TOTDED');
      const netPayHit = this.findComponentHeaderX(headerBandItems, 'NETPAY');
      // True when no deduction header was recognised (split/Gujarati headers,
      // scanned PDFs). In that case positional fallback below is used so
      // income-tax is never silently zeroed.
      const hasRealDeductionHeaders =
        itHit > 0 || ptHit > 0 || gpfHit > 0 || npsHit > 0 || totDedHit > 0 || netPayHit > 0;
      const itX = itHit || desigX + 90;
      const ptX = ptHit || itX + 55;
      const hbaX = hbaHit || ptX + 45;
      const gpfX = gpfHit || hbaX + 55;
      const gpf4X = gpf4Hit || gpfX + 60;
      const npsX = npsHit || gpf4X + 60;
      const gisFundX = gisFundHit || npsX + 55;
      const gisSaveX = gisSaveHit || gisFundX + 50;
      const totDedX = totDedHit || gisSaveX + 50;
      const netPayX = netPayHit || totDedX + 55;

      const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 25);
      const colBoundNameMax = (nameX + desigX) / 2;
      // Boundary between Designation text and first deduction number uses the
      // leftmost PRESENT header (not a guessed itX), so omitted columns never
      // push IT numbers into the designation band.
      const firstPresentDedX = [itHit, ptHit, hbaHit, gpfHit, gpf4Hit, npsHit, gisFundHit, gisSaveHit]
        .filter((x) => x > 0)
        .sort((a, b) => a - b)[0] || itX;
      const colBoundDesigMax = (desigX + firstPresentDedX) / 2;

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

        // Pattern fallback: X bands miss "Assistant Director" when the name
        // column runs wide. Search the row's own text for a known post —
        // same pattern list as the earning side.
        if (!designation || /^staff$/i.test(designation)) {
          const rowTextForDesig = rowItems
            .map((i) => i.str.trim())
            .filter(Boolean)
            .join(' ');
          const found = this.findDesignationInText(rowTextForDesig);
          if (found) {
            designation = found;
            if (employeeName && employeeName.includes(found)) {
              employeeName = employeeName.replace(found, ' ').replace(/\s+/g, ' ').trim();
            }
          }
        }

        // Fallback for employee name if not captured in the strict column band
        if (!employeeName) {
          const fallbackNameItems = rowItems
            .filter((i) => {
              if (i.x <= hrpnX + 10 || i.x >= colBoundDesigMax) return false;
              if (desigItems.some((d) => d.x === i.x && d.y === i.y)) return false;
              const s = i.str.trim();
              if (/^\d+(?:\.\d+)?$/.test(s)) return false;
              if (designation && designation.includes(s)) return false;
              return true;
            })
            .sort((a, b) => b.y - a.y || a.x - b.x);

          employeeName = fallbackNameItems
            .map((i) => i.str.trim())
            .filter(Boolean)
            .join(' ')
            .replace(/[0-9/()\\-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Check if designation accidentally bundled the employee name
        // (handles both "Name Designation" and "Designation Name" orders)
        if (!employeeName && designation) {
          const split = splitBundledNameAndDesignation(designation);
          if (split) {
            employeeName = split.name;
            designation = split.designation;
          }
        }

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

        // Header-driven mapping (original idea): each value comes from its
        // own header's X position. Headers absent from this sheet (e.g.
        // gazetted March-2026 has no HBA 9591 / Class-4 9531) stay 0 WITHOUT
        // claiming any number — that is what previously shifted IT into the
        // wrong column. Query present headers left-to-right so each number is
        // claimed once by its closest header.
        const presentFields = [
          { code: '9510', x: itHit, key: 'incomeTax' },
          { code: '9570', x: ptHit, key: 'profTax' },
          { code: '9591', x: hbaHit, key: 'hbaInterest' },
          { code: '9670', x: gpfHit, key: 'gpfRegular' },
          { code: '9531', x: gpf4Hit, key: 'gpfClass4' },
          { code: '9534', x: npsHit, key: 'npsRegular' },
          { code: '9581', x: gisFundHit, key: 'gisGovtFund' },
          { code: '9582', x: gisSaveHit, key: 'gisGovtSaving' },
        ]
          .filter((f) => f.x > 0)
          .sort((a, b) => a.x - b.x);
        const fieldByKey: Record<string, number> = {
          incomeTax: 0,
          profTax: 0,
          hbaInterest: 0,
          gpfRegular: 0,
          gpfClass4: 0,
          npsRegular: 0,
          gisGovtFund: 0,
          gisGovtSaving: 0,
        };
        // Claim one number per present header, left-to-right.
        for (const f of presentFields) {
          fieldByKey[f.key] = findValNearX(f.x);
        }
        let incomeTax = fieldByKey.incomeTax;
        let profTax = fieldByKey.profTax;
        let hbaInterest = fieldByKey.hbaInterest;
        let gpfRegular = fieldByKey.gpfRegular;
        let gpfClass4 = fieldByKey.gpfClass4;
        let npsRegular = fieldByKey.npsRegular;
        let gisGovtFund = fieldByKey.gisGovtFund;
        let gisGovtSaving = fieldByKey.gisGovtSaving;
        // Total / Net from their own headers when present; else last numbers.
        let totalDeductions = 0;
        let netPay = 0;
        const numericVals = numericItems.map((n) => parseNum(n.str));
        if (totDedHit > 0) {
          totalDeductions = findValNearX(totDedX);
        } else if (numericVals.length >= 2) {
          totalDeductions = numericVals[numericVals.length - 2] || 0;
        }
        if (netPayHit > 0) {
          netPay = findValNearX(netPayX);
        } else if (numericVals.length >= 1) {
          netPay = numericVals[numericVals.length - 1] || 0;
        }
        // Blank Total column: derive from present fields.
        if (totalDeductions === 0 && netPay !== 0 && presentFields.length > 0) {
          const sum = presentFields.reduce((s, f) => s + (fieldByKey[f.key] || 0), 0);
          if (sum > 0) totalDeductions = sum;
        }

        // Last-resort positional fallback only when NO header was recognised
        // at all (scanned/Gujarati sheets) — never when headers exist.
        const allZero =
          incomeTax === 0 &&
          profTax === 0 &&
          hbaInterest === 0 &&
          gpfRegular === 0 &&
          gpfClass4 === 0 &&
          npsRegular === 0 &&
          gisGovtFund === 0 &&
          gisGovtSaving === 0 &&
          totalDeductions === 0 &&
          netPay === 0;
        if (!hasRealDeductionHeaders && allZero && numericItems.length >= 2) {
          const vals = numericVals;
          const len = vals.length;
          if (len >= 10) {
            incomeTax = vals[0];
            profTax = vals[1];
            hbaInterest = vals[2];
            gpfRegular = vals[3];
            gpfClass4 = vals[4];
            npsRegular = vals[5];
            gisGovtFund = vals[6];
            gisGovtSaving = vals[7];
            totalDeductions = vals[len - 2];
            netPay = vals[len - 1];
          } else if (len === 9) {
            incomeTax = vals[0];
            profTax = vals[1];
            hbaInterest = vals[2];
            gpfRegular = vals[3];
            gpfClass4 = vals[4];
            npsRegular = vals[5];
            gisGovtFund = vals[6];
            gisGovtSaving = vals[7];
            totalDeductions =
              vals[0] + vals[1] + vals[2] + vals[3] + vals[4] + vals[5] + vals[6] + vals[7];
            netPay = vals[8];
          } else if (len >= 8) {
            incomeTax = vals[0] || 0;
            profTax = vals[1] || 0;
            hbaInterest = vals[2] || 0;
            gpfRegular = vals[3] || 0;
            gpfClass4 = vals[4] || 0;
            npsRegular = vals[5] || 0;
            gisGovtFund = vals[6] || 0;
            gisGovtSaving = vals[7] || 0;
            totalDeductions = vals[len - 2] || vals.slice(0, 8).reduce((s, v) => s + v, 0);
            netPay = vals[len - 1] || 0;
          }
        }

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
          components: this.buildDeductionComponents({
            incomeTax,
            profTax,
            hbaInterest,
            gpfRegular,
            gpfClass4,
            npsRegular,
            gisGovtFund,
            gisGovtSaving,
            totalDeductions:
              totalDeductions ||
              (incomeTax + profTax + hbaInterest + gpfRegular + gpfClass4 + npsRegular + gisGovtFund + gisGovtSaving),
            netPay,
          }),
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

    // Anchor-based blocks (same as earning side) so multi-line wrapped
    // names / pay-scales don't break income-tax extraction. A row runs from
    // its HRPN line until the next HRPN line (or Total / certify footer).
    const anchors: Array<{ lineIndex: number; hrpn: string }> = [];
    let inTable = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // NOTE: do NOT trigger on "Deduction Side" alone — that line appears
      // before the DDO header and would turn the DDO HRPN into a false row.
      // Table starts at the column header (Sr / HRPN / Employee Name / tax cols).
      if (/^Sr\b|^HRPN\b|Employee\s+Name|Income\s+Tax|Prof\s*Tax|Net\s*Pay/i.test(line)) {
        inTable = true;
        continue;
      }
      if (/^Total\b|Rupees\s*:|I\s+hereby\s+certify/i.test(line)) {
        break;
      }
      if (!inTable) continue;
      const m = line.match(/\b(\d{7,10})\b/);
      if (!m) continue;
      if (/^(2403|0299)/.test(m[1])) continue;
      // Skip header-area phone/DDO fragments: HRPN must be followed by a
      // name or by deduction amounts within the block (checked below).
      anchors.push({ lineIndex: i, hrpn: m[1] });
    }

    // Present deduction columns in header order. Sheets omit irrelevant
    // columns (e.g. gazetted March-2026 has 6: no HBA/Class-4), so amounts
    // must map to present headers — never a fixed 8-slot layout.
    const detectedHeader = componentMasterService.detectHeaderComponents(text, 'DEDUCTION');
    const presentCodes: string[] = detectedHeader
      .filter((c) => c.kind === 'COMPONENT')
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((c) => c.componentCode || '')
      .filter(Boolean);
    // Fallback only when header detection yields nothing at all: assume
    // classic 8. Minimal sheets (e.g. PT-only 2204 with a single 9570
    // column) legitimately have 1-3 present codes and must keep them.
    const effectiveCodes =
      presentCodes.length >= 1
        ? presentCodes
        : ['9510', '9570', '9591', '9670', '9531', '9534', '9581', '9582'];
    const codeToField: Record<string, string> = {
      '9510': 'incomeTax',
      '9570': 'profTax',
      '9591': 'hbaInterest',
      '9670': 'gpfRegular',
      '9531': 'gpfClass4',
      '9534': 'npsRegular',
      '9581': 'gisGovtFund',
      '9582': 'gisGovtSaving',
    };
    const minNumbers = Math.min(8, effectiveCodes.length + 1);

    for (let a = 0; a < anchors.length; a++) {
      const anchor = anchors[a];
      const startLine = anchor.lineIndex;
      const nextAnchorLine = a < anchors.length - 1 ? anchors[a + 1].lineIndex : lines.length;
      let endLine = nextAnchorLine;
      for (let j = startLine; j < nextAnchorLine; j++) {
        if (/^(Total\b|I hereby certify|Rupees\s*:|karmyogi)/i.test(lines[j])) {
          endLine = j;
          break;
        }
      }
      const blockText = lines.slice(startLine, endLine).join(' ');
      const hrpn = anchor.hrpn;
      const numbers = blockText.match(/\b\d[\d,]*\.\d{2}\b/g) || blockText.match(/\b\d[\d,]*(?:\.\d+)?\b/g);

      if (numbers && numbers.length >= minNumbers) {
        const amounts = numbers.map(parseNum);
        const len = amounts.length;

        // Clean name and designation (block may span wrapped lines).
        // Strip HRPN first (leaves a double space), then the leading Sr No,
        // so "1 20110757 Shri.X ..." never yields employeeName "1".
        const firstNumIdx = blockText.indexOf(numbers[0]);
        const textBeforeNums = (firstNumIdx >= 0 ? blockText.substring(0, firstNumIdx) : blockText)
          .replace(hrpn, '')
          .replace(/^\s*\d{1,4}\s+/, '')
          .trim();
        const parts = textBeforeNums.split(/\s{2,}|\t/);
        let employeeName = (parts[0] || 'Employee').trim();
        let designation = parts[1] || 'Staff';
        if (!parts[1] || /^staff$/i.test(designation)) {
          const found = this.findDesignationInText(textBeforeNums);
          if (found) {
            designation = found;
            employeeName = employeeName.replace(found, ' ').replace(/\s+/g, ' ').trim() || employeeName;
          }
        }

        const fields: Record<string, number> = {
          incomeTax: 0,
          profTax: 0,
          hbaInterest: 0,
          gpfRegular: 0,
          gpfClass4: 0,
          npsRegular: 0,
          gisGovtFund: 0,
          gisGovtSaving: 0,
        };
        // Full row: N fields + Total + Net. Blank-Total row: N fields + Net.
        const hasTotalCol = len >= effectiveCodes.length + 2;
        const fieldCount = hasTotalCol ? effectiveCodes.length : Math.min(effectiveCodes.length, len - 1);
        for (let fi = 0; fi < fieldCount; fi++) {
          const field = codeToField[effectiveCodes[fi]];
          if (field) fields[field] = amounts[fi] || 0;
        }
        const totalDeductions = hasTotalCol
          ? amounts[len - 2] || 0
          : Object.values(fields).reduce((s, v) => s + v, 0);

        rows.push({
          hrpn,
          employeeName,
          designation,
          incomeTax: fields.incomeTax,
          profTax: fields.profTax,
          hbaInterest: fields.hbaInterest,
          gpfRegular: fields.gpfRegular,
          gpfClass4: fields.gpfClass4,
          npsRegular: fields.npsRegular,
          gisGovtFund: fields.gisGovtFund,
          gisGovtSaving: fields.gisGovtSaving,
          totalDeductions,
          netPay: amounts[len - 1] || 0,
          components: this.buildDeductionComponents({
            incomeTax: fields.incomeTax,
            profTax: fields.profTax,
            hbaInterest: fields.hbaInterest,
            gpfRegular: fields.gpfRegular,
            gpfClass4: fields.gpfClass4,
            npsRegular: fields.npsRegular,
            gisGovtFund: fields.gisGovtFund,
            gisGovtSaving: fields.gisGovtSaving,
            totalDeductions,
            netPay: amounts[len - 1] || 0,
          }),
        });
      }
    }

    return rows;
  }

  /**
   * Merge coordinate rows (header-X) with text rows (header-order).
   * Coordinate rows keep names/designations; any deduction field that is 0
   * in coordinates but non-zero in text for the same HRPN is filled from
   * text. This keeps the original header-X idea intact while closing single-
   * cell misses (e.g. IT printed off its header X). Text-only HRPNs are
   * appended; coordinates remain the source of truth when both are non-zero.
   */
  private mergeDeductionRows(
    coordRows: PayBillDeductionRow[],
    textRows: PayBillDeductionRow[],
    warnings?: string[]
  ): PayBillDeductionRow[] {
    const byHrpn = new Map<string, PayBillDeductionRow>();
    for (const t of textRows) {
      byHrpn.set(String(t.hrpn).trim(), t);
    }
    const fields: Array<keyof Pick<PayBillDeductionRow, 'incomeTax' | 'profTax' | 'hbaInterest' | 'gpfRegular' | 'gpfClass4' | 'npsRegular' | 'gisGovtFund' | 'gisGovtSaving' | 'totalDeductions' | 'netPay'>> = [
      'incomeTax', 'profTax', 'hbaInterest', 'gpfRegular', 'gpfClass4',
      'npsRegular', 'gisGovtFund', 'gisGovtSaving', 'totalDeductions', 'netPay',
    ];
    let filled = 0;
    const merged = coordRows.map((c) => {
      const t = byHrpn.get(String(c.hrpn).trim());
      if (!t) return c;
      const next = { ...c };
      let touched = false;
      for (const f of fields) {
        if ((next[f] || 0) === 0 && (t[f] || 0) !== 0) {
          (next[f] as number) = t[f] as number;
          touched = true;
        }
      }
      // Post/designation uses the same rule: header-X first, text fills
      // placeholder "Staff" (or empty) so "Assistant Director" is not lost.
      if ((!next.designation || /^staff$/i.test(next.designation)) && t.designation && !/^staff$/i.test(t.designation)) {
        next.designation = t.designation;
        touched = true;
      }
      if ((!next.employeeName || /^employee/i.test(next.employeeName)) && t.employeeName && !/^employee/i.test(t.employeeName)) {
        next.employeeName = t.employeeName;
        touched = true;
      }
      if (touched) {
        filled++;
        next.components = this.buildDeductionComponents({
          incomeTax: next.incomeTax,
          profTax: next.profTax,
          hbaInterest: next.hbaInterest,
          gpfRegular: next.gpfRegular,
          gpfClass4: next.gpfClass4,
          npsRegular: next.npsRegular,
          gisGovtFund: next.gisGovtFund,
          gisGovtSaving: next.gisGovtSaving,
          totalDeductions:
            next.totalDeductions ||
            (next.incomeTax + next.profTax + next.hbaInterest + next.gpfRegular + next.gpfClass4 + next.npsRegular + next.gisGovtFund + next.gisGovtSaving),
          netPay: next.netPay,
        });
        if (next.totalDeductions === 0) {
          next.totalDeductions =
            next.incomeTax + next.profTax + next.hbaInterest + next.gpfRegular + next.gpfClass4 + next.npsRegular + next.gisGovtFund + next.gisGovtSaving;
        }
      }
      byHrpn.delete(String(c.hrpn).trim());
      return next;
    });
    // Text-only rows (missed by coordinates) are appended as-is.
    for (const remaining of byHrpn.values()) {
      merged.push(remaining);
    }
    if (filled > 0) {
      warnings?.push(
        `Income-tax cross-check filled ${filled} row(s) from bill text where the table cell was offset from its header.`
      );
    }
    return merged;
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

      if (numbers && numbers.length >= 3) {
        const amounts = numbers.map(parseNum);
        const len = amounts.length;
        const detectedHeader = componentMasterService.detectHeaderComponents(text, 'DEDUCTION');
        const presentCodes: string[] = detectedHeader
          .filter((c) => c.kind === 'COMPONENT')
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((c) => c.componentCode || '')
          .filter(Boolean);
        const effectiveCodes =
          presentCodes.length >= 1
            ? presentCodes
            : ['9510', '9570', '9591', '9670', '9531', '9534', '9581', '9582'];
        const codeToField: Record<string, string> = {
          '9510': 'incomeTax',
          '9570': 'profTax',
          '9591': 'hbaInterest',
          '9670': 'gpfRegular',
          '9531': 'gpfClass4',
          '9534': 'npsRegular',
          '9581': 'gisGovtFund',
          '9582': 'gisGovtSaving',
        };
        // Variable-column sheets: N fields + Total + Net.
        if (len >= effectiveCodes.length + 2 || len >= 8) {
          const fields: Record<string, number> = {
            incomeTax: 0,
            profTax: 0,
            hbaInterest: 0,
            gpfRegular: 0,
            gpfClass4: 0,
            npsRegular: 0,
            gisGovtFund: 0,
            gisGovtSaving: 0,
          };
          const mapCount = Math.min(effectiveCodes.length, len - 2);
          for (let fi = 0; fi < mapCount; fi++) {
            const field = codeToField[effectiveCodes[fi]];
            if (field) fields[field] = amounts[fi] || 0;
          }
          return {
            incomeTax: fields.incomeTax,
            profTax: fields.profTax,
            hbaInterest: fields.hbaInterest,
            gpfRegular: fields.gpfRegular,
            gpfClass4: fields.gpfClass4,
            npsRegular: fields.npsRegular,
            gisGovtFund: fields.gisGovtFund,
            gisGovtSaving: fields.gisGovtSaving,
            totalDeductions: amounts[len - 2],
            netPay: amounts[len - 1],
          };
        }
      }
    }

    return null;
  }

  /**
   * Find a known post/designation inside free row text.
   * Same pattern list as the earning-side extractor, so deduction rows also
   * resolve "Assistant Director" instead of falling back to "Staff".
   */
  private findDesignationInText(text: string): string {
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
    for (const p of desigPatterns) {
      const m = text.match(p);
      if (m) return m[1].trim();
    }
    return '';
  }

  /**
   * Build the dynamic earning components array for a row.
   *
   * Amounts are positional (0..5 = the six standard IFMS columns, last = gross),
   * matching the existing coordinate/text extractors. When the PDF header was
   * detected, the intermediate columns (between index 6 and len - 2) are mapped
   * to their detected components in PDF order; otherwise they are surfaced with
   * placeholder names so data is never dropped.
   */
  private buildEarningComponents(
    amounts: number[],
    detectedCols?: DetectedColumns
  ): PayBillEmployeeComponent[] {
    if (!amounts || amounts.length === 0) return [];

    const detected = detectedCols?.components || [];
    const regular = detected.filter((c) => c.kind === 'COMPONENT');
    const gross = detected.find((c) => c.kind === 'TOTAL' || c.kind === 'NET_PAY');

    const components: PayBillEmployeeComponent[] = [];
    const len = amounts.length;

    const standardCount = Math.min(6, regular.length, len);
    for (let i = 0; i < standardCount; i++) {
      const comp = regular[i];
      components.push({
        componentCode: comp.componentCode,
        componentName: comp.componentName,
        type: comp.type,
        amount: amounts[i],
        isTotalField: false,
      });
    }

    // Intermediates (between the 6 standard columns and the gross total)
    const intermediateComps = regular.slice(6);
    let idx = standardCount;
    for (const comp of intermediateComps) {
      if (idx >= len - 1) break;
      components.push({
        componentCode: comp.componentCode,
        componentName: comp.componentName,
        type: comp.type,
        amount: amounts[idx],
        isTotalField: false,
      });
      idx++;
    }
    // Amounts that were present but not represented by a detected component
    while (idx < len - 1) {
      components.push({
        componentCode: null,
        componentName: `Component ${idx + 1}`,
        amount: amounts[idx],
        isTotalField: false,
      });
      idx++;
    }

    components.push({
      componentCode: gross?.componentCode || 'GROSS',
      componentName: gross?.componentName || 'Gross Amount',
      type: 'TOTAL',
      amount: amounts[len - 1],
      isTotalField: true,
    });

    return components;
  }

  /**
   * Build the dynamic deduction components array for a row from the legacy
   * field values (fixed 8 deduction columns + totals).
   */
  private buildDeductionComponents(values: {
    incomeTax: number;
    profTax: number;
    hbaInterest: number;
    gpfRegular: number;
    gpfClass4: number;
    npsRegular: number;
    gisGovtFund: number;
    gisGovtSaving: number;
    totalDeductions: number;
    netPay: number;
  }): PayBillEmployeeComponent[] {
    return [
      { componentCode: '9510', componentName: 'Income Tax', type: 'DEDUCTION', amount: values.incomeTax },
      { componentCode: '9570', componentName: 'Professional Tax', type: 'DEDUCTION', amount: values.profTax },
      { componentCode: '9591', componentName: 'HBA Interest', type: 'DEDUCTION', amount: values.hbaInterest },
      { componentCode: '9670', componentName: 'GPF Regular', type: 'DEDUCTION', amount: values.gpfRegular },
      { componentCode: '9531', componentName: 'GPF Regular Class 4', type: 'DEDUCTION', amount: values.gpfClass4 },
      { componentCode: '9534', componentName: 'NPS Regular', type: 'DEDUCTION', amount: values.npsRegular },
      { componentCode: '9581', componentName: 'Govt Fund', type: 'DEDUCTION', amount: values.gisGovtFund },
      { componentCode: '9582', componentName: 'Govt Saving', type: 'DEDUCTION', amount: values.gisGovtSaving },
      { componentCode: 'TOTDED', componentName: 'Total Deductions', type: 'TOTAL', amount: values.totalDeductions, isTotalField: true },
      { componentCode: 'NETPAY', componentName: 'Net Pay', type: 'NET_PAY', amount: values.netPay, isTotalField: true },
    ];
  }

  /**
   * Find the X coordinate of a component column header by component code.
   * Returns 0 when the column was not present in the (header-band) items so the
   * caller can fall back to the standard column layout.
   */
  private findComponentHeaderX(
    headerBandItems: Array<{ match: ComponentMatchResult; item: RawTextItem }>,
    code: string
  ): number {
    const hits = headerBandItems.filter(({ match }) => {
      const comp = match.component;
      if (!comp) return false;
      return comp.componentCode === code || comp.pdfCodeAliases.includes(code);
    });
    if (hits.length === 0) return 0;
    hits.sort((a, b) => a.item.x - b.item.x);
    return hits[0].item.x;
  }
}

export const pdfParserService = new PdfParserService();

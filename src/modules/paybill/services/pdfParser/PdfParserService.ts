import { componentMasterService } from '../componentMaster.service';
import type {
  PayBillParsedResult,
  PayBillEmployeeRow,
  PayBillTotalRow,
  PayBillMetadata,
  PayBillSheetType,
  PayBillDeductionRow,
} from '../../types';
import type { RawTextItem, DetectedColumns } from './types';
import { extractTextAndItems } from './textExtraction';
import { detectAllowanceColumns } from './allowanceColumns';
import { extractMetadata } from './metadata';
import { extractEmployeeRowsFromItems, extractEmployeeRows } from './earningRows';
import {
  extractDeductionRowsFromItems,
  extractDeductionRows,
  mergeDeductionRows,
  extractDeductionTotals,
} from './deductionRows';
import { extractTotals } from './totals';

/**
 * Paybill PDF parser - orchestration layer. Row extraction lives in
 * ./earningRows and ./deductionRows; pure helpers in the sibling modules.
 * Public API is unchanged: parsePdf / parseExtractedText /
 * detectAllowanceColumns / extractMetadata / extractEmployeeRows / extractTotals.
 */
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

    const { rawText, pageCount, items } = await extractTextAndItems(arrayBuffer);
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
    const metadata = extractMetadata(rawText);

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
          coordRows = extractDeductionRowsFromItems(items, warnings);
        } catch (err) {
          console.warn('[PdfParserService] Coordinate deduction extraction fallback:', err);
        }
      }

      let textRows: PayBillDeductionRow[] = [];
      try {
        textRows = extractDeductionRows(rawText, warnings);
      } catch (err) {
        console.warn('[PdfParserService] Text deduction extraction failed:', err);
      }

      if (coordRows.length === 0) {
        deductionRows = textRows;
      } else if (textRows.length === 0) {
        deductionRows = coordRows;
      } else {
        deductionRows = mergeDeductionRows(coordRows, textRows, warnings);
      }

      if (deductionRows.length === 0) {
        warnings.push('No deduction records could be detected from PDF.');
      }

      const pdfDeductionTotals = extractDeductionTotals(rawText, deductionRows);

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
    const detectedCols = detectAllowanceColumns(rawText);

    // 4. Extract Employee Rows:
    let rows: PayBillEmployeeRow[] = [];
    if (items && items.length > 0) {
      try {
        rows = extractEmployeeRowsFromItems(items, detectedCols, warnings);
      } catch (err) {
        console.warn('[PdfParserService] Coordinate extraction fallback to text parsing:', err);
      }
    }

    // If coordinate extraction was not applicable or returned no rows, use structured text parser
    if (rows.length === 0) {
      rows = extractEmployeeRows(rawText, detectedCols, warnings);
    }

    if (rows.length === 0) {
      warnings.push('No employee records could be detected. Please verify PDF format or use OCR tool.');
    }

    // 5. Extract Totals
    const pdfTotals = extractTotals(rawText, detectedCols, rows);

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
   * Detect allowance columns present in the table header
   */
  detectAllowanceColumns(text: string): DetectedColumns {
    return detectAllowanceColumns(text);
  }

  /**
   * Extract header and bill metadata fields using dynamic regex & patterns
   */
  extractMetadata(text: string): PayBillMetadata {
    return extractMetadata(text);
  }

  /**
   * Extract individual employee rows from the table body (text fallback)
   */
  extractEmployeeRows(
    text: string,
    detectedCols?: DetectedColumns,
    _warnings?: string[]
  ): PayBillEmployeeRow[] {
    return extractEmployeeRows(text, detectedCols, _warnings);
  }

  /**
   * Extract bottom summary / Total row from text and compare
   */
  extractTotals(
    text: string,
    detectedCols?: DetectedColumns,
    _rows?: PayBillEmployeeRow[]
  ): PayBillTotalRow | null {
    return extractTotals(text, detectedCols, _rows);
  }
}

export const pdfParserService = new PdfParserService();

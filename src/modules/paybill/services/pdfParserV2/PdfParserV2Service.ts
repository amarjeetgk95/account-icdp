import { componentMasterService } from '../componentMaster.service';
import type {
  PayBillMetadata,
  PayBillParsedResult,
  PayBillEmployeeRow,
  PayBillDeductionRow,
  PayBillTotalRow,
  PayBillDeductionTotalRow,
  PayBillSheetType,
} from '../../types';
import type { V2TextItem } from './types';
import { extractTextAndItems } from './textExtraction';
import { extractMetadata } from './metadata';
import { detectSections } from './sections';
import { parseEarningSection } from './earningParser';
import { parseDeductionSection } from './deductionParser';

/**
 * V2 paybill parser - orchestration layer. Section/column detection lives in
 * ./sections and ./cells; row extraction in ./earningParser and
 * ./deductionParser; footer totals in ./totals. Public API is unchanged:
 * parsePdf / parseExtractedText / extractMetadata.
 *
 * V2 paybill parser — clean rewrite.
 *
 * Principles (vs the patched V1):
 * - No fixed column counts anywhere. Value columns come ONLY from the
 *   table header, in header order (Karmayogi always prints values in header
 *   order). Missing columns simply don't exist — nothing shifts.
 * - One engine for earning + deduction. A section is classified by its own
 *   header, so combined PDFs (several tables in one file) yield both sides.
 * - X coordinates are used only to separate identity text (Sr/HRPN/Name/
 *   Designation) from numbers (boundary = start of first value column).
 *   Values are NEVER claimed by nearest-X guessing.
 * - Selectable PDFs only (items path). Raw-text path synthesizes the same
 *   header-order assignment from token order.
 */
class PdfParserV2Service {
  async parsePdf(fileOrBuffer: File | ArrayBuffer): Promise<PayBillParsedResult> {
    const buf = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
    const { rawText, pageCount, items } = await extractTextAndItems(buf);
    return this.parseExtractedText(rawText, pageCount, items);
  }

  parseExtractedText(rawText: string, pageCount = 1, items: V2TextItem[] = []): PayBillParsedResult {
    const warnings: string[] = [];
    const metadata = extractMetadata(rawText);
    if (!metadata.month) warnings.push('Month could not be automatically detected from header.');
    if (!metadata.billNo) warnings.push('Bill number could not be detected from header.');

    const sections = detectSections(rawText, items);
    const earningRows: PayBillEmployeeRow[] = [];
    const deductionRows: PayBillDeductionRow[] = [];
    let pdfTotals: PayBillTotalRow | null = null;
    let pdfDeductionTotals: PayBillDeductionTotalRow | null = null;
    const detectedComponents = componentMasterService.detectHeaderComponents(
      rawText,
      sections.some((s) => s.type === 'DEDUCTION') ? 'DEDUCTION' : 'EARNING'
    );

    for (const section of sections) {
      if (section.type === 'EARNING') {
        const { rows, totals } = parseEarningSection(section, warnings);
        earningRows.push(...rows);
        if (totals && !pdfTotals) pdfTotals = totals;
      } else {
        const { rows, totals } = parseDeductionSection(section, warnings);
        deductionRows.push(...rows);
        if (totals && !pdfDeductionTotals) pdfDeductionTotals = totals;
      }
    }

    // Deduplicate employees by HRPN in case of page-boundary overlaps
    const seenEarning = new Set<string>();
    const finalEarningRows: PayBillEmployeeRow[] = [];
    for (const r of earningRows) {
      if (!seenEarning.has(r.hrpn)) {
        seenEarning.add(r.hrpn);
        finalEarningRows.push({ ...r, srNo: finalEarningRows.length + 1 });
      }
    }

    const seenDeduction = new Set<string>();
    const finalDeductionRows: PayBillDeductionRow[] = [];
    for (const r of deductionRows) {
      if (!seenDeduction.has(r.hrpn)) {
        seenDeduction.add(r.hrpn);
        finalDeductionRows.push({ ...r, srNo: finalDeductionRows.length + 1 });
      }
    }

    if (finalEarningRows.length === 0 && finalDeductionRows.length === 0) {
      warnings.push('No employee records could be detected. Please verify PDF format or use OCR tool.');
    }

    const hasEarning = finalEarningRows.length > 0;
    const hasDeduction = finalDeductionRows.length > 0;
    const sheetType: PayBillSheetType =
      hasEarning && hasDeduction ? 'COMBINED' : hasDeduction ? 'DEDUCTION' : 'EARNING';

    const withAmounts = hasDeduction
      ? finalDeductionRows.filter((r) => (r.totalDeductions || 0) > 0 || (r.netPay || 0) > 0).length
      : finalEarningRows.filter((r) => (r.grossAmount || 0) > 0).length;
    const total = hasDeduction ? finalDeductionRows.length : finalEarningRows.length;
    const confidence = total === 0 ? 0 : Math.round((withAmounts / total) * 100);
    if (total > 0 && withAmounts / total < 0.8) {
      warnings.push(
        `Column detection confidence is low (${confidence}% of rows have values). ` +
          'Ensure the table header with component codes is visible.'
      );
    }

    return {
      sheetType,
      metadata,
      rows: finalEarningRows,
      pdfTotals,
      deductionRows: hasDeduction ? finalDeductionRows : undefined,
      pdfDeductionTotals: pdfDeductionTotals ?? undefined,
      rawText,
      pageCount,
      parsingWarnings: warnings,
      detection: { confidence, issues: [...warnings] },
      detectedComponents,
    };
  }

  extractMetadata(text: string): PayBillMetadata {
    return extractMetadata(text);
  }
}

export const pdfParserV2Service = new PdfParserV2Service();

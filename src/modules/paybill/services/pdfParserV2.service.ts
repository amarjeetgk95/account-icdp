import { componentMasterService } from './componentMaster.service';
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
} from '../types';

/**
 * Bump when parser behaviour changes. Surfaced in the console and the batch
 * matrix header so a stale cached bundle is immediately obvious.
 */
export const PDF_PARSER_BUILD = 'v2.8';

/**
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

export interface V2TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

interface V2Column {
  /** Canonical component code ('0103', '9510', 'GROSS', 'TOTDED', 'NETPAY', ...). Null for identity cols. */
  code: string | null;
  /** Header text as printed. */
  label: string;
  /** 'IDENTITY' | 'COMPONENT' | 'TOTAL' | 'NET_PAY' */
  kind: string;
  x: number;
}

interface V2Section {
  type: 'EARNING' | 'DEDUCTION';
  headerLines: string[];
  headerItems: V2TextItem[];
  headerY: number;
  bodyItems: V2TextItem[];
  bodyLines: string[];
  columns: V2Column[];
  /** X boundary: everything left is identity text, right is numbers. */
  valueBoundaryX: number;
}

const AMOUNT_RE = /\b\d[\d,]*\.\d{2}\b/g;
const HRPN_RE = /\b(\d{7,10})\b/;
const SKIP_HRPN_PREFIX = /^(2403|0299)/;

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

const DESIGNATION_PATTERNS = [
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

function findDesignation(text: string): string {
  for (const p of DESIGNATION_PATTERNS) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return '';
}

function classifySection(headerText: string): 'EARNING' | 'DEDUCTION' {
  const t = headerText;
  if (
    /Deduct/i.test(t) ||
    /9510/.test(t) ||
    /9570/.test(t) ||
    /Net\s*Pay/i.test(t) ||
    /Total\s+Ded/i.test(t) ||
    /Income\s*Tax/i.test(t)
  ) {
    return 'DEDUCTION';
  }
  return 'EARNING';
}

function isHeaderLine(line: string): boolean {
  return /^Sr\b|^HRPN\b|Employee\s+Name|Income\s+Tax|Prof\s*Tax|Net\s*Pay|Basic\s*Pay|Gross\s*Amt/i.test(line);
}

function isFooterLine(line: string): boolean {
  return /^(Total\b|I hereby certify|Rupees\s*:|karmyogi)/i.test(line);
}

class PdfParserV2Service {
  async parsePdf(fileOrBuffer: File | ArrayBuffer): Promise<PayBillParsedResult> {
    const buf = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
    const { rawText, pageCount, items } = await this.extractTextAndItems(buf);
    return this.parseExtractedText(rawText, pageCount, items);
  }

  parseExtractedText(rawText: string, pageCount = 1, items: V2TextItem[] = []): PayBillParsedResult {
    const warnings: string[] = [];
    const metadata = this.extractMetadata(rawText);
    if (!metadata.month) warnings.push('Month could not be automatically detected from header.');
    if (!metadata.billNo) warnings.push('Bill number could not be detected from header.');

    const sections = this.detectSections(rawText, items);
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
        const { rows, totals } = this.parseEarningSection(section, warnings);
        earningRows.push(...rows);
        if (totals && !pdfTotals) pdfTotals = totals;
      } else {
        const { rows, totals } = this.parseDeductionSection(section, warnings);
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

  // ---- document structure ----

  private clusterItemsIntoLines(items: V2TextItem[]): string[] {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));
    const buckets: Array<{ y: number; items: V2TextItem[] }> = [];
    for (const item of sorted) {
      const b = buckets.find((x) => Math.abs(x.y - item.y) <= 4);
      if (b) b.items.push(item);
      else buckets.push({ y: item.y, items: [item] });
    }
    return buckets.map((b) => {
      b.items.sort((a, b2) => a.x - b2.x);
      return b.items.map((i) => i.str.trim()).filter(Boolean).join(' ');
    });
  }

  private async extractTextAndItems(
    arrayBuffer: ArrayBuffer
  ): Promise<{ rawText: string; pageCount: number; items: V2TextItem[] }> {
    const data = new Uint8Array(arrayBuffer);
    const { extractText, getDocumentProxy } = await import('unpdf');
    try {
      const pdfDoc = await getDocumentProxy(data);
      const items: V2TextItem[] = [];
      const pageTexts: string[] = [];
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const content = await page.getTextContent();
        const pageItems: V2TextItem[] = [];
        for (const raw of content.items as Array<Record<string, unknown>>) {
          const str = raw['str'] as string;
          if (typeof str !== 'string' || !str.trim()) continue;
          const t = (raw['transform'] as number[] | undefined) || [0, 0, 0, 0, 0, 0];
          pageItems.push({
            str,
            x: t[4] || 0,
            y: t[5] || 0,
            w: (raw['width'] as number) || 0,
            h: (raw['height'] as number) || 0,
            page: pageNum,
          });
        }
        items.push(...pageItems);
        pageTexts.push(this.clusterItemsIntoLines(pageItems).join('\n'));
      }
      return { rawText: pageTexts.join('\n\n'), pageCount: pdfDoc.numPages, items };
    } catch {
      const extracted = await extractText(data, { mergePages: false });
      const texts = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
      return { rawText: texts.join('\n\n'), pageCount: extracted.totalPages || 1, items: [] };
    }
  }

  /**
   * Split the document into table sections. Each section starts at a header
   * line (contains HRPN) and runs until the footer (Total/certify) or the
   * next header. Supports combined PDFs with several tables.
   */
  private detectSections(rawText: string, items: V2TextItem[]): V2Section[] {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // A new TABLE starts only at the identity header line (contains HRPN),
    // not at wrapped component lines. Karmayogi wraps long headers across
    // lines ("Basic Pay" / "(0101)/(0102)", "Special Additional" /
    // "Pay (0101)/(0102)", ...). Splitting on every component keyword
    // ("Basic Pay", "Gross Amt", ...) fragments one table's header into
    // pieces that individually lose HRPN context and component columns, so
    // per-section detection silently drops columns (e.g. Special Additional
    // Pay missed -> NPPA mis-mapped to 0 for every employee in the bill).
    const headerIdx: number[] = [];
    let inTable = false;
    for (let i = 0; i < lines.length; i++) {
      if (isHeaderLine(lines[i])) {
        // The DDO block also contains "HRPN" (D.D.O HRPN) — only treat as a
        // table header when it is the column header line, not metadata.
        if (/\bHRPN\b/i.test(lines[i])) {
          // Avoid flagging the metadata line "D.D.O HRPN : ..." (no columns).
          if (/D\.?D\.?O\s*HRPN/i.test(lines[i]) && !/Employee\s*Name/i.test(lines[i])) continue;
          headerIdx.push(i);
          inTable = true;
          continue;
        }
      }
      if (inTable && isFooterLine(lines[i])) inTable = false;
    }
    if (headerIdx.length === 0) {
      // Fallback: whole text is one implicit section; type from full text.
      // Build columns from all lines (header block extractor stops at the
      // first data row) so component detection still works without an
      // explicit HRPN header line.
      const type = classifySection(rawText);
      return [
        {
          type,
          headerLines: [],
          headerItems: [],
          headerY: 0,
          bodyItems: items,
          bodyLines: lines,
          columns: this.buildColumns(lines, type),
          valueBoundaryX: 0,
        },
      ];
    }

    const byPage = new Map<number, V2TextItem[]>();
    for (const it of items) {
      const list = byPage.get(it.page) || [];
      list.push(it);
      byPage.set(it.page, list);
    }

    const rawSections = headerIdx.map((hi, k) => {
      const end = k < headerIdx.length - 1 ? headerIdx[k + 1] : lines.length;
      // Header block may span wrapped lines until the first HRPN row.
      let headerEnd = hi + 1;
      while (headerEnd < end && !/^\d{1,4}\s+\d{7,10}\b/.test(lines[headerEnd]) && !/^\d{7,10}\b/.test(lines[headerEnd]) && !isFooterLine(lines[headerEnd])) {
        headerEnd++;
      }
      const headerLines = lines.slice(hi, headerEnd);
      const bodyLines = lines.slice(headerEnd, end);
      const headerText = headerLines.join(' ');
      const type = classifySection(headerText);
      const columns = this.buildColumns(headerLines, type);
      // Header items: items whose text appears in the header block (band match
      // on raw strings, tolerant of wrapping).
      const headerItems = items.filter((it) =>
        headerLines.some((l) => l.includes(it.str.trim()) && it.str.trim().length > 1)
      );
      const headerY = headerItems.length > 0 ? Math.max(...headerItems.map((i) => i.y)) : 0;
      return {
        type,
        headerLines,
        headerItems,
        headerY,
        bodyItems: items,
        bodyLines,
        columns,
        valueBoundaryX: this.firstValueX(columns),
      };
    });

    const mergedSections: V2Section[] = [];
    for (const sec of rawSections) {
      const prev = mergedSections[mergedSections.length - 1];
      if (prev && prev.type === sec.type) {
        prev.bodyLines.push(...sec.bodyLines);
        if (sec.columns.length > prev.columns.length) {
          prev.columns = sec.columns;
          prev.headerLines = sec.headerLines;
          prev.valueBoundaryX = sec.valueBoundaryX;
        }
      } else {
        mergedSections.push(sec);
      }
    }
    return mergedSections;
  }

  /**
   * Build the dynamic column list from header lines, in print order.
   * Identity columns first (Sr/HRPN/Name/Designation...), then value columns
   * from the component master in header order, then totals.
   */
  private buildColumns(headerLines: string[], type: 'EARNING' | 'DEDUCTION'): V2Column[] {
    // Strip identity-region words before detection so "Pay Scale" never
    // matches a value component like "Pay Difference". HRPN/Sr are kept:
    // the detector needs them to locate the header block.
    const headerText = headerLines
      .join('\n')
      .replace(/Pay\s*Scale|Designation|Employee\s*Name|\bPH\b|\bSLO\b/gi, ' ');
    const detected = componentMasterService.detectHeaderComponents(headerText, type);
    return this.detectedToColumns(detected, headerText, type);
  }

  /**
   * Reconstruct header CELLS from PDF item coordinates for one page.
   *
   * Karmayogi wraps long headers across two visual rows, e.g. row 1 ends
   * with "Special Additional | Non Private Practice | Gross Amt" while row 2
   * holds "Pay (0101)/(0102) | Allow (0128)". Plain-text clustering joins
   * each visual row into one line, so "Special Additional" and its
   * continuation "Pay (0101)/(0102)" are never adjacent and name-based
   * detection misses the column entirely (Special shares treasury codes
   * 0101/0102 with Basic Pay, so unlike NPPA it has no code fallback and
   * every later amount shifts left — NPPA fetched as 0 for the whole bill).
   *
   * Fragments of one cell share (almost) the same X, so grouping band items
   * by X restores cells: "Special Additional" (x=640.5) + "Pay (0101)/(0102)"
   * (x=642) -> "Special Additional Pay (0101)/(0102)".
   *
   * Returns cells left-to-right, or null when the page has no recognizable
   * table header (caller falls back to text detection).
   */
  private headerCellsForPage(
    pageItems: V2TextItem[]
  ): Array<{ text: string; x: number }> | null {
    // Anchor labels are whole-string header-only fragments. Deliberately
    // EXCLUDES bare "No": the wrapped "Sr/No" serial header and every data
    // row's PH value ("No") are both exactly "No", so it cannot tell the
    // header band apart from data rows (it would drag the band down into
    // amounts and pollute cells). Every other label below never appears as
    // a whole data/metadata item ("D.D.O HRPN : ..." is one longer string).
    const isAnchor = (s: string) =>
      /^(Sr|HRPN|Employee Name|Designation|Pay Scale|PH|SLO|Basic Pay|Special Additional|Non Private Practice|Gross Amt|Income Tax|Prof Tax|Total Ded|Net Pay)$/i.test(
        (s || '').trim()
      );
    const anchors = pageItems.filter((i) => i.str && isAnchor(i.str));
    if (anchors.length < 2) return null;
    const ys = anchors.map((i) => i.y);
    // Band adapts to the actual header rows on this page (typically 2 rows
    // ~3.5pt apart); data rows start ~10pt+ below and metadata ~25pt+ above.
    const top = Math.max(...ys) + 3;
    const bottom = Math.min(...ys) - 3;
    const band = pageItems.filter(
      (i) => i.str && i.str.trim() && i.y <= top && i.y > bottom
    );
    if (band.length === 0) return null;
    const sorted = [...band].sort((a, b) => a.x - b.x);
    const cols: Array<{ x: number; items: V2TextItem[] }> = [];
    for (const it of sorted) {
      const last = cols[cols.length - 1];
      // Intra-cell fragments share X within ~12pt (e.g. 640.5 vs 642);
      // neighbour columns are 30pt+ apart (PH/SLO at ~14pt merge, but both
      // are identity columns and never become value columns).
      if (last && Math.abs(it.x - last.x) <= 25) {
        last.items.push(it);
      } else {
        cols.push({ x: it.x, items: [it] });
      }
    }
    return cols.map((c) => ({
      x: c.x,
      text: [...c.items]
        .sort((a, b) => b.y - a.y)
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' '),
    }));
  }

  /** Identity cells never become value columns (mirrors the text-path strip). */
  private isIdentityCellText(text: string): boolean {
    return /^(Sr(\s+No)?|No|HRPN|Employee\s+Name|Designation|Pay\s+Scale|PH|SLO)$/i.test(
      (text || '').trim()
    );
  }

  /**
   * Match reconstructed header cells against the component master, in
   * left-to-right (X) order. Unknown coded cells are kept with their printed
   * code so positional mapping never shifts (mirrors the text detector).
   */
  private detectCells(
    cells: Array<{ text: string; x: number }>,
    sheetType: 'EARNING' | 'DEDUCTION'
  ): DetectedComponentInfo[] {
    const matcher = componentMasterService.getMatcher();
    const found: DetectedComponentInfo[] = [];
    for (const cell of cells) {
      if (!cell.text || this.isIdentityCellText(cell.text)) continue;
      const m = matcher.findComponent(cell.text);
      if (m.component && m.matchMethod !== 'UNKNOWN') {
        const comp = m.component;
        const isTotal = comp.kind !== 'COMPONENT';
        if (comp.kind === 'COMPONENT' && comp.type !== sheetType) continue;
        found.push({
          componentId: comp.id,
          componentCode: comp.componentCode,
          componentName: comp.componentName,
          shortName: comp.shortName,
          type: isTotal ? (comp.kind === 'NET_PAY' ? 'NET_PAY' : 'TOTAL') : comp.type,
          kind: comp.kind,
          detectedText: cell.text,
          detectedCode: m.detectedCode || comp.componentCode || undefined,
          matchMethod: m.matchMethod,
          confidence: m.confidence,
          order: 0,
          isTotalField: comp.isTotalField || isTotal,
        });
      } else {
        const codeMatch = cell.text.match(/\((\d{3,4})\)/);
        if (codeMatch) {
          const code = codeMatch[1];
          const label = cell.text
            .replace(/\(\s*\d{3,4}\s*\)/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
          found.push({
            componentCode: code,
            componentName: label || `Component ${code}`,
            type: sheetType,
            kind: 'COMPONENT',
            detectedText: cell.text,
            detectedCode: code,
            matchMethod: 'UNKNOWN',
            confidence: 0,
            order: 0,
            isTotalField: false,
          });
        }
      }
    }
    return found.map((f, i) => ({ ...f, order: i }));
  }

  /**
   * Page-level value columns from item coordinates. Used as an override
   * inside the coordinate row parsers when it finds MORE component columns
   * than the text-derived section columns — i.e. exactly when wrapping hid
   * a column from text detection. Otherwise the section columns are kept so
   * single-line-header bills behave byte-for-byte as before.
   */
  private pageValueColumns(
    pageItems: V2TextItem[],
    section: V2Section,
    type: 'EARNING' | 'DEDUCTION'
  ): V2Column[] {
    const base = this.valueColumns(section);
    try {
      const cells = this.headerCellsForPage(pageItems);
      if (!cells || cells.length === 0) return base;
      const detected = this.detectCells(cells, type);
      if (detected.length === 0) return base;
      const cols = this.detectedToColumns(
        detected,
        cells.map((c) => c.text).join(' '),
        type
      ).filter((c) => c.kind === 'COMPONENT');
      return cols.length > base.length ? cols : base;
    } catch {
      return base;
    }
  }

  private detectedToColumns(
    detected: DetectedComponentInfo[],
    headerText: string,
    type: 'EARNING' | 'DEDUCTION'
  ): V2Column[] {
    const cols: V2Column[] = [
      { code: null, label: 'Sr', kind: 'IDENTITY', x: -3 },
      { code: null, label: 'HRPN', kind: 'IDENTITY', x: -2 },
      { code: null, label: 'Name', kind: 'IDENTITY', x: -1 },
    ];
    // Designation is identity for both sides.
    cols.push({ code: null, label: 'Designation', kind: 'IDENTITY', x: 0 });
    const ordered = [...detected].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const d of ordered) {
      if (d.kind === 'COMPONENT') {
        cols.push({ code: d.componentCode || d.detectedCode || null, label: d.componentName, kind: 'COMPONENT', x: d.order || 0 });
      }
    }
    // Defensive: Karmayogi deduction sheets print BOTH GPF Reg (9670) and
    // GPF Advance (9670). If the component master in the DB predates the
    // GPF Advance row, the detector returns a single 9670 and every later
    // column shifts left by one. Inject the missing Advance column based on
    // raw header text so parsing stays correct with a stale master.
    if (type === 'DEDUCTION' && /GPF\s*Adv/i.test(headerText)) {
      const compCodes = cols.filter((c) => c.kind === 'COMPONENT').map((c) => c.code);
      if (compCodes.filter((c) => c === '9670').length < 2) {
        const regIdx = cols.findIndex((c) => c.kind === 'COMPONENT' && c.code === '9670');
        const synthetic: V2Column = {
          code: '9670',
          label: 'GPF Advance',
          kind: 'COMPONENT',
          x: regIdx >= 0 ? cols[regIdx].x + 0.1 : 45,
        };
        if (regIdx >= 0) cols.splice(regIdx + 1, 0, synthetic);
        else {
          const hbaIdx = cols.findIndex((c) => c.code === '9591');
          cols.splice(hbaIdx >= 0 ? hbaIdx + 1 : cols.length, 0, synthetic);
        }
      }
    }
    // Defensive: "Special Additional Pay" shares treasury codes 0101/0102
    // with Basic Pay, so it is matched by name only. If the component master
    // in the database predates, renamed or deactivated that row (or its
    // aliases), BOTH text and coordinate detection miss it even though the
    // header prints it — and every later amount shifts left (NPPA fetched as
    // 0 for the whole bill). "Special" appears in Karmayogi headers ONLY for
    // this allowance, so synthesize the column and slot it canonically
    // (after Trans/Med, before Washing/NPPA). Same staleness hazard covered
    // symmetrically for Washing (0132) and NPPA (0128) below.
    if (type === 'EARNING' && /Special/i.test(headerText)) {
      const hasSpecial = cols.some(
        (c) => c.kind === 'COMPONENT' && /special|spl/i.test(c.label)
      );
      if (!hasSpecial) {
        this.insertEarningColumn(
          cols,
          { code: '0101', label: 'Special Additional Pay', kind: 'COMPONENT', x: 0 },
          70
        );
      }
    }
    if (type === 'EARNING' && /Washing\s*Allow|\(0132\)/i.test(headerText)) {
      const hasWashing = cols.some(
        (c) => c.kind === 'COMPONENT' && c.code === '0132'
      );
      if (!hasWashing) {
        this.insertEarningColumn(
          cols,
          { code: '0132', label: 'Washing Allowance', kind: 'COMPONENT', x: 0 },
          80
        );
      }
    }
    if (type === 'EARNING' && /Non\s+Private\s+Practice|\(0128\)|NPP/i.test(headerText)) {
      const hasNpp = cols.some(
        (c) => c.kind === 'COMPONENT' && c.code === '0128'
      );
      if (!hasNpp) {
        this.insertEarningColumn(
          cols,
          { code: '0128', label: 'Non Private Practice Allowance', kind: 'COMPONENT', x: 0 },
          90
        );
      }
    }
    for (const d of ordered) {
      if (d.kind === 'TOTAL' || d.kind === 'NET_PAY') {
        cols.push({ code: d.componentCode || null, label: d.componentName, kind: d.kind, x: (d.order || 0) + 0.5 });
      }
    }
    return cols;
  }

  /**
   * Canonical earning-column rank used to position a defensively synthesized
   * column (see above): Basic 10, DA 20, HRA 30, CLA 40, Med 50, Trans 60,
   * Special 70, Washing 80, NPPA 90. Unknown/arrears columns keep a neutral
   * middle rank so they never force a synthesized column past its neighbours.
   */
  private earningColumnRank(c: V2Column): number {
    if (c.kind !== 'COMPONENT') return 999;
    if ((c.code === '0101' || c.code === '0102') && /special|spl/i.test(c.label)) return 70;
    switch (c.code) {
      case '0101':
      case '0102':
        return 10;
      case '0103':
        return 20;
      case '0110':
        return 30;
      case '0111':
        return 40;
      case '0107':
        return 50;
      case '0113':
        return 60;
      case '0132':
        return 80;
      case '0128':
        return 90;
      default:
        return 65;
    }
  }

  /** Splice a synthesized column before the first canonical successor. */
  private insertEarningColumn(cols: V2Column[], col: V2Column, rank: number): void {
    let at = cols.length;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].kind === 'COMPONENT' && this.earningColumnRank(cols[i]) > rank) {
        at = i;
        break;
      }
    }
    const prevX = at > 0 ? cols[at - 1].x : 0;
    const nextX = at < cols.length ? cols[at].x : prevX + 1;
    col.x = (prevX + nextX) / 2;
    cols.splice(at, 0, col);
  }

  private valueColumns(section: V2Section): V2Column[] {
    return section.columns.filter((c) => c.kind === 'COMPONENT');
  }

  private firstValueX(columns: V2Column[]): number {
    const v = columns.find((c) => c.kind === 'COMPONENT');
    return v ? v.x : 0;
  }

  // ---- rows ----

  private splitBodyBlocks(bodyLines: string[]): Array<{ hrpn: string; text: string }> {
    const anchors: Array<{ idx: number; hrpn: string }> = [];
    let started = false;
    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      if (!started) {
        if (isHeaderLine(line)) {
          started = true;
        }
        continue;
      }
      if (/^Total\b|I\s+hereby\s+certify/i.test(line)) break;
      if (isFooterLine(line) || isHeaderLine(line)) continue;
      const m = line.match(HRPN_RE);
      if (!m || SKIP_HRPN_PREFIX.test(m[1])) continue;
      anchors.push({ idx: i, hrpn: m[1] });
    }
    // If no in-body header repeat, accept anchors from the first line.
    if (anchors.length === 0) {
      for (let i = 0; i < bodyLines.length; i++) {
        if (/^Total\b|I\s+hereby\s+certify/i.test(bodyLines[i])) break;
        if (isFooterLine(bodyLines[i]) || isHeaderLine(bodyLines[i])) continue;
        const m = bodyLines[i].match(HRPN_RE);
        if (m && !SKIP_HRPN_PREFIX.test(m[1])) anchors.push({ idx: i, hrpn: m[1] });
      }
    }
    return anchors.map((a, k) => {
      const end = k < anchors.length - 1 ? anchors[k + 1].idx : bodyLines.length;
      let stop = end;
      for (let j = a.idx; j < end; j++) {
        if (j > a.idx && /^Total\b|I\s+hereby\s+certify/i.test(bodyLines[j])) {
          stop = j;
          break;
        }
      }
      return { hrpn: a.hrpn, text: bodyLines.slice(a.idx, stop).join(' ') };
    });
  }

  private splitIdentity(textBeforeNums: string, hrpn: string): { name: string; designation: string } {
    // Strip pay-scale / PH / SLO residue first so it never leaks into names.
    const deScaled = textBeforeNums
      .replace(/\bPB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)\/\d{3,5}/gi, ' ')
      .replace(/\b\d{4,5}-\d{4,5}\/\d{3,4}\b/g, ' ')
      .replace(/\b(?:No|Yes)\s+[PTN]\b/gi, ' ')
      .replace(/\bLevel-?\d+[^(]*(\([^)]*\))?/gi, ' ')
      .replace(/\bFixed\s+Pay\b/gi, ' ');
    const clean = deScaled.replace(hrpn, '').replace(/^\s*\d{1,4}\s+/, '').trim();
    const parts = clean.split(/\s{2,}|\t/);
    let name = (parts[0] || 'Employee').trim();
    let designation = (parts[1] || '').trim();
    if (!designation) {
      const found = findDesignation(clean);
      if (found) {
        // Split AT the post: person name is before it, station (Ambheti,
        // Sayan, Borbodhan...) is after it and belongs to the designation.
        const at = clean.indexOf(found);
        const before = (at >= 0 ? clean.slice(0, at) : name).trim();
        const after = (at >= 0 ? clean.slice(at + found.length) : '').trim();
        designation = after ? `${found} ${after}` : found;
        name = before || name.replace(found, ' ').trim();
      }
    }
    if (!designation) designation = 'Staff';
    // Person names never carry station words anymore (they went to the post).
    name = name.replace(/[0-9/()\\-]/g, ' ').replace(/\s+/g, ' ').trim() || 'Employee';
    return { name, designation };
  }

  private parseEarningRowsFromItems(
    section: V2Section
  ): { rows: PayBillEmployeeRow[]; totals: PayBillTotalRow | null } | null {
    if (!section.bodyItems || section.bodyItems.length === 0) return null;

    const byPage = new Map<number, V2TextItem[]>();
    for (const it of section.bodyItems) {
      if (!it.str || !it.str.trim()) continue;
      const list = byPage.get(it.page) || [];
      list.push(it);
      byPage.set(it.page, list);
    }

    const rows: PayBillEmployeeRow[] = [];
    let detectedTotals: PayBillTotalRow | null = null;
    let lastHrpnX = 35;
    let lastNameX = 120;
    let lastDesigX = 240;
    let lastPayScaleX: number | undefined;

    const sortedPages = [...byPage.keys()].sort((a, b) => a - b);
    for (const pageNum of sortedPages) {
      const pageItems = byPage.get(pageNum)!;

      // Filter to earning-page check if combined document
      const hasDeductionHeader = pageItems.some(
        (i) => /Income\s*Tax|Prof\s*Tax|\(9510\)|\(9570\)/i.test(i.str) && i.y > 200
      );
      if (
        hasDeductionHeader &&
        !pageItems.some((i) => /Basic\s*Pay|\(0101\)|\(0102\)/i.test(i.str) && i.y > 200)
      ) {
        continue;
      }

      // Column layout comes from item coordinates when they reveal more
      // wrapped columns than text detection (e.g. Special Additional Pay
      // hidden on the second header row); otherwise the section columns.
      // pageValueColumns already falls back to the section columns, so this
      // is a single call (no double work).
      const valueCols = this.pageValueColumns(pageItems, section, 'EARNING');

      const hrpnHeader = pageItems.find((i) => /^HRPN$/i.test(i.str.trim()));
      const nameHeader = pageItems.find((i) => /Employee\s*Name/i.test(i.str.trim()));
      const desigHeader = pageItems.find((i) => /Designation/i.test(i.str.trim()));
      const payScaleHeader = pageItems.find((i) => /Pay\s*Scale/i.test(i.str.trim()));
      const phHeader = pageItems.find((i) => /^PH$/i.test(i.str.trim()));
      const totalItem = pageItems.find(
        (i) => /^Total$/i.test(i.str.trim()) || /I\s+hereby\s+certify/i.test(i.str.trim())
      );

      if (hrpnHeader) lastHrpnX = hrpnHeader.x;
      if (nameHeader) lastNameX = nameHeader.x;
      if (desigHeader) lastDesigX = desigHeader.x;
      if (payScaleHeader) lastPayScaleX = payScaleHeader.x;

      const hrpnX = hrpnHeader?.x ?? lastHrpnX;
      const nameX = nameHeader?.x ?? lastNameX;
      const desigX = desigHeader?.x ?? lastDesigX;
      const payScaleX = payScaleHeader?.x ?? lastPayScaleX;
      const tableHeaderY = hrpnHeader ? hrpnHeader.y : 800;
      const totalY = totalItem ? totalItem.y : 40;

      const valueHeaders = pageItems
        .filter(
          (i) =>
            /Basic\s*Pay|\(0101\)|\(0102\)/i.test(i.str.trim()) &&
            i.y >= tableHeaderY - 20
        )
        .sort((a, b) => a.x - b.x);
      const firstValHeader = valueHeaders[0];

      const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 22);
      const colBoundNameMax = (nameX + desigX) / 2;
      const colBoundDesigMax = payScaleX
        ? (desigX + payScaleX) / 2
        : firstValHeader
          ? (desigX + firstValHeader.x) / 2
          : desigX + 80;
      const colBoundPayScaleMax =
        phHeader && payScaleX
          ? (payScaleX + phHeader.x) / 2
          : payScaleX
            ? payScaleX + 80
            : 0;
      const valueBoundaryX = firstValHeader
        ? firstValHeader.x - 30
        : payScaleX
          ? payScaleX + 100
          : desigX + 150;

      const hrpnItems = pageItems
        .filter(
          (i) =>
            /^\d{7,10}$/.test(i.str.trim()) &&
            !/2403|0299/.test(i.str.trim()) &&
            Math.abs(i.x - hrpnX) < 25 &&
            i.y < tableHeaderY - 5 &&
            i.y > totalY + 2
        )
        .sort((a, b) => b.y - a.y);

      for (let r = 0; r < hrpnItems.length; r++) {
        const cur = hrpnItems[r];
        const prev = r > 0 ? hrpnItems[r - 1] : null;
        const next = r < hrpnItems.length - 1 ? hrpnItems[r + 1] : null;

        const rowTopY = prev ? (prev.y + cur.y) / 2 : tableHeaderY - 5;
        const rowBottomY = next ? (cur.y + next.y) / 2 : totalY + 2;

        const rowItems = pageItems.filter(
          (i) => i.y <= rowTopY && i.y > rowBottomY && i.str.trim()
        );

        const nameItems = rowItems
          .filter((i) => i.x >= colBoundHrpnMax && i.x < colBoundNameMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        let employeeName = nameItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
          .replace(/[0-9/()\\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const desigItems = rowItems
          .filter((i) => i.x >= colBoundNameMax && i.x < colBoundDesigMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        let designation = desigItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/^(Designation|Desig)\s+/i, '')
          .replace(/\b\d+\.\d{2}\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!designation) designation = 'Staff';

        const payScaleItems = rowItems
          .filter(
            (i) =>
              (payScaleX && i.x >= colBoundDesigMax && i.x < colBoundPayScaleMax) ||
              /PB-?\d|Level|\/\d{3,5}/i.test(i.str)
          )
          .sort((a, b) => b.y - a.y || a.x - b.x);
        const payScale = payScaleItems
          .map((i) => i.str.trim())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        const phItem = rowItems.find(
          (i) =>
            i.x >= (payScaleX ? colBoundPayScaleMax : colBoundDesigMax) &&
            /^(Yes|No)$/i.test(i.str.trim())
        );
        const ph = phItem
          ? phItem.str.trim().toLowerCase() === 'yes'
            ? 'Yes'
            : 'No'
          : 'No';

        const sloItem = rowItems.find(
          (i) => i.x < valueBoundaryX && /^[PTN]$/i.test(i.str.trim())
        );
        const slo = sloItem ? sloItem.str.trim().toUpperCase() : 'P';

        const amountItems = rowItems
          .filter(
            (i) =>
              i.x >= valueBoundaryX && /^\d[\d,]*\.\d{2}$/.test(i.str.trim())
          )
          .sort((a, b) => a.x - b.x);
        const amounts = amountItems.map((i) => parseNum(i.str));

        const byCode = new Map<string, number>();
        const nValue = Math.max(0, amounts.length - 1);
        for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
          const code = valueCols[k]?.code || `C${k}`;
          byCode.set(code, amounts[k] ?? 0);
        }
        let other = 0;
        if (nValue > valueCols.length) {
          other = amounts
            .slice(valueCols.length, nValue)
            .reduce((s, v) => s + v, 0);
        }
        const gross = amounts[amounts.length - 1] ?? 0;
        const get = (code: string) => byCode.get(code) || 0;
        const basicIdx = valueCols.findIndex(
          (c) =>
            (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
        );
        const specialIdx = valueCols.findIndex(
          (c, idx) =>
            idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
        );
        const basicPay =
          basicIdx >= 0 && basicIdx < nValue
            ? amounts[basicIdx] ?? 0
            : get('0101') || get('0102');
        const specialPay =
          specialIdx >= 0 && specialIdx < nValue
            ? amounts[specialIdx] ?? 0
            : 0;

        const srNoItem = rowItems.find(
          (i) => i.x < hrpnX - 5 && /^\d{1,4}$/.test(i.str.trim())
        );
        const srNo = srNoItem
          ? parseInt(srNoItem.str.trim(), 10)
          : rows.length + 1;

        rows.push({
          srNo,
          hrpn: cur.str.trim(),
          employeeName: employeeName || `Employee ${cur.str.trim()}`,
          designation,
          payScale,
          ph,
          slo,
          basicPay,
          da: get('0103'),
          hra: get('0110'),
          cla: get('0111'),
          medicalAllowance: get('0107'),
          transportAllowance: get('0113'),
          specialPay,
          washingAllowance: get('0132'),
          nonPrivatePracticeAllowance: get('0128'),
          otherAllowance: other,
          grossAmount: gross,
          components: this.buildComponents(valueCols, amounts),
        });
      }

      if (totalItem && !detectedTotals) {
        const totalAmountItems = pageItems
          .filter(
            (i) =>
              Math.abs(i.y - totalItem.y) <= 8 &&
              i.x >= valueBoundaryX &&
              /^\d[\d,]*\.\d{2}$/.test(i.str.trim())
          )
          .sort((a, b) => a.x - b.x);
        if (totalAmountItems.length > 0) {
          const amounts = totalAmountItems.map((i) => parseNum(i.str));
          const byCode = new Map<string, number>();
          const nValue = Math.max(0, amounts.length - 1);
          for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
            byCode.set(valueCols[k]?.code || `C${k}`, amounts[k] ?? 0);
          }
          const get = (c: string) => byCode.get(c) || 0;
          const basicIdx = valueCols.findIndex(
            (c) =>
              (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
          );
          const specialIdx = valueCols.findIndex(
            (c, idx) =>
              idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
          );
          const basicPay =
            basicIdx >= 0 && basicIdx < nValue
              ? amounts[basicIdx] ?? 0
              : get('0101') || get('0102');
          const specialPay =
            specialIdx >= 0 && specialIdx < nValue
              ? amounts[specialIdx] ?? 0
              : 0;
          detectedTotals = {
            basicPay,
            da: get('0103'),
            hra: get('0110'),
            cla: get('0111'),
            medicalAllowance: get('0107'),
            transportAllowance: get('0113'),
            specialPay,
            washingAllowance: get('0132'),
            nonPrivatePracticeAllowance: get('0128'),
            otherAllowance: 0,
            grossAmount: amounts[amounts.length - 1] ?? 0,
          } as PayBillTotalRow;
        }
      }
    }

    if (rows.length === 0) return null;
    return {
      rows,
      totals:
        detectedTotals ??
        (this.totalsFor(section, 'EARNING') as PayBillTotalRow | null),
    };
  }

  private parseEarningSection(
    section: V2Section,
    warnings?: string[]
  ): { rows: PayBillEmployeeRow[]; totals: PayBillTotalRow | null } {
    void warnings;
    if (section.bodyItems && section.bodyItems.length > 0) {
      try {
        const coordRes = this.parseEarningRowsFromItems(section);
        if (coordRes && coordRes.rows.length > 0) {
          return coordRes;
        }
      } catch (err) {
        console.warn('[PdfParserV2] Coordinate earning extraction fallback to text:', err);
      }
    }

    const valueCols = this.valueColumns(section);
    const blocks = this.splitBodyBlocks(section.bodyLines);
    const rows: PayBillEmployeeRow[] = [];
    blocks.forEach((b, i) => {
      const numbers = b.text.match(AMOUNT_RE) || [];
      if (numbers.length === 0) return;
      const firstToken = numbers[0] as string;
      const amounts = numbers.map(parseNum);
      // Map amounts to value columns in order; last amount is the total field.
      const byCode = new Map<string, number>();
      const nValue = Math.max(0, amounts.length - 1);
      for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
        const code = valueCols[k]?.code || `C${k}`;
        byCode.set(code, amounts[k] ?? 0);
      }
      // Overflow amounts (unknown columns) summed as other.
      let other = 0;
      if (nValue > valueCols.length) {
        other = amounts.slice(valueCols.length, nValue).reduce((s, v) => s + v, 0);
      }
      const gross = amounts[amounts.length - 1] ?? 0;
      const firstNumIdx = b.text.indexOf(firstToken);
      const { name, designation } = this.splitIdentity(
        firstNumIdx >= 0 ? b.text.substring(0, firstNumIdx) : b.text,
        b.hrpn
      );
      const get = (code: string) => byCode.get(code) || 0;
      // Basic Pay and Special Additional Pay share codes 0101/0102 — resolve
      // by POSITION (first 0101-ish column is Basic), never by code dict
      // (which collapses both into one key and shifts everything).
      const basicIdx = valueCols.findIndex(
        (c) => (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
      );
      const specialIdx = valueCols.findIndex(
        (c, idx) =>
          idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
      );
      const basicPay =
        basicIdx >= 0 && basicIdx < nValue
          ? amounts[basicIdx] ?? 0
          : get('0101') || get('0102');
      const specialPay =
        specialIdx >= 0 && specialIdx < nValue
          ? amounts[specialIdx] ?? 0
          : 0;
      rows.push({
        srNo: i + 1,
        hrpn: b.hrpn,
        employeeName: name,
        designation,
        payScale: this.extractPayScale(b.text),
        ph: /\bYes\b/i.test(b.text) ? 'Yes' : 'No',
        slo: this.extractSlo(b.text),
        basicPay,
        da: get('0103'),
        hra: get('0110'),
        cla: get('0111'),
        medicalAllowance: get('0107'),
        transportAllowance: get('0113'),
        specialPay,
        washingAllowance: get('0132'),
        nonPrivatePracticeAllowance: get('0128'),
        otherAllowance: other,
        grossAmount: gross,
        components: this.buildComponents(valueCols, amounts),
      });
    });
    return { rows, totals: this.totalsFor(section, 'EARNING') as PayBillTotalRow | null };
  }

  private parseDeductionRowsFromItems(
    section: V2Section
  ): { rows: PayBillDeductionRow[]; totals: PayBillDeductionTotalRow | null } | null {
    if (!section.bodyItems || section.bodyItems.length === 0) return null;

    const byPage = new Map<number, V2TextItem[]>();
    for (const it of section.bodyItems) {
      if (!it.str || !it.str.trim()) continue;
      const list = byPage.get(it.page) || [];
      list.push(it);
      byPage.set(it.page, list);
    }

    const rows: PayBillDeductionRow[] = [];
    let detectedTotals: PayBillDeductionTotalRow | null = null;
    let lastHrpnX = 35;
    let lastNameX = 120;
    let lastDesigX = 240;

    const sortedPages = [...byPage.keys()].sort((a, b) => a - b);
    for (const pageNum of sortedPages) {
      const pageItems = byPage.get(pageNum)!;

      // Filter to deduction-page check if combined document
      const hasEarningHeader = pageItems.some(
        (i) => /Basic\s*Pay|\(0101\)|\(0102\)/i.test(i.str) && i.y > 200
      );
      if (
        hasEarningHeader &&
        !pageItems.some((i) => /Income\s*Tax|Prof\s*Tax|\(9510\)|\(9570\)/i.test(i.str) && i.y > 200)
      ) {
        continue;
      }

      // Same wrapped-header override as the earning path (pageValueColumns
      // falls back to the section columns when coordinates add nothing).
      const valueCols = this.pageValueColumns(pageItems, section, 'DEDUCTION');

      const hrpnHeader = pageItems.find((i) => /^HRPN$/i.test(i.str.trim()));
      const nameHeader = pageItems.find((i) => /Employee\s*Name/i.test(i.str.trim()));
      const desigHeader = pageItems.find((i) => /Designation/i.test(i.str.trim()));
      const totalItem = pageItems.find(
        (i) => /^Total$/i.test(i.str.trim()) || /I\s+hereby\s+certify/i.test(i.str.trim())
      );

      if (hrpnHeader) lastHrpnX = hrpnHeader.x;
      if (nameHeader) lastNameX = nameHeader.x;
      if (desigHeader) lastDesigX = desigHeader.x;

      const hrpnX = hrpnHeader?.x ?? lastHrpnX;
      const nameX = nameHeader?.x ?? lastNameX;
      const desigX = desigHeader?.x ?? lastDesigX;
      const tableHeaderY = hrpnHeader ? hrpnHeader.y : 800;
      const totalY = totalItem ? totalItem.y : 40;

      const valueHeaders = pageItems
        .filter(
          (i) =>
            /Income\s*Tax|Prof\s*Tax|\(9510\)|\(9570\)/i.test(i.str.trim()) &&
            i.y >= tableHeaderY - 20
        )
        .sort((a, b) => a.x - b.x);
      const firstValHeader = valueHeaders[0];

      const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 22);
      const colBoundNameMax = (nameX + desigX) / 2;
      const colBoundDesigMax = firstValHeader
        ? (desigX + firstValHeader.x) / 2
        : desigX + 80;
      const valueBoundaryX = firstValHeader ? firstValHeader.x - 30 : desigX + 120;

      const hrpnItems = pageItems
        .filter(
          (i) =>
            /^\d{7,10}$/.test(i.str.trim()) &&
            !/2403|0299/.test(i.str.trim()) &&
            Math.abs(i.x - hrpnX) < 25 &&
            i.y < tableHeaderY - 5 &&
            i.y > totalY + 2
        )
        .sort((a, b) => b.y - a.y);

      for (let r = 0; r < hrpnItems.length; r++) {
        const cur = hrpnItems[r];
        const prev = r > 0 ? hrpnItems[r - 1] : null;
        const next = r < hrpnItems.length - 1 ? hrpnItems[r + 1] : null;

        const rowTopY = prev ? (prev.y + cur.y) / 2 : tableHeaderY - 5;
        const rowBottomY = next ? (cur.y + next.y) / 2 : totalY + 2;

        const rowItems = pageItems.filter(
          (i) => i.y <= rowTopY && i.y > rowBottomY && i.str.trim()
        );

        const nameItems = rowItems
          .filter((i) => i.x >= colBoundHrpnMax && i.x < colBoundNameMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        let employeeName = nameItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
          .replace(/[0-9/()\\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const desigItems = rowItems
          .filter((i) => i.x >= colBoundNameMax && i.x < colBoundDesigMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        let designation = desigItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/^(Designation|Desig)\s+/i, '')
          .replace(/\b\d+\.\d{2}\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!designation) designation = 'Staff';

        const amountItems = rowItems
          .filter(
            (i) =>
              i.x >= valueBoundaryX && /^\d[\d,]*\.\d{2}$/.test(i.str.trim())
          )
          .sort((a, b) => a.x - b.x);
        const amounts = amountItems.map((i) => parseNum(i.str));

        const hasTotalCol = amounts.length >= valueCols.length + 2;
        const fieldCount = hasTotalCol
          ? valueCols.length
          : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
        const byCode = new Map<string, number>();
        for (let k = 0; k < fieldCount; k++) {
          const code = valueCols[k]?.code || `C${k}`;
          // GPF Regular + GPF Advance share treasury code 9670 — SUM duplicates
          // instead of overwriting so Total Deductions reconciles.
          byCode.set(code, (byCode.get(code) || 0) + (amounts[k] || 0));
        }
        const total = hasTotalCol ? amounts[amounts.length - 2] ?? 0 : 0;
        const net = amounts[amounts.length - 1] ?? 0;
        const derivedTotal = hasTotalCol
          ? total
          : [...byCode.values()].reduce((s, v) => s + v, 0);

        const get = (code: string) => byCode.get(code) || 0;

        const srNoItem = rowItems.find(
          (i) => i.x < hrpnX - 5 && /^\d{1,4}$/.test(i.str.trim())
        );
        const srNo = srNoItem
          ? parseInt(srNoItem.str.trim(), 10)
          : rows.length + 1;

        rows.push({
          srNo,
          hrpn: cur.str.trim(),
          employeeName: employeeName || `Employee ${cur.str.trim()}`,
          designation,
          incomeTax: get('9510'),
          profTax: get('9570'),
          hbaInterest: get('9591'),
          gpfRegular: get('9670'),
          gpfClass4: get('9531'),
          npsRegular: get('9534'),
          gisGovtFund: get('9581'),
          gisGovtSaving: get('9582'),
          totalDeductions: derivedTotal,
          netPay: net,
          components: this.buildDeductionComponents({
            incomeTax: get('9510'),
            profTax: get('9570'),
            hbaInterest: get('9591'),
            gpfRegular: get('9670'),
            gpfClass4: get('9531'),
            npsRegular: get('9534'),
            gisGovtFund: get('9581'),
            gisGovtSaving: get('9582'),
            totalDeductions: derivedTotal,
            netPay: net,
          }),
        });
      }

      if (totalItem && !detectedTotals) {
        const totalAmountItems = pageItems
          .filter(
            (i) =>
              Math.abs(i.y - totalItem.y) <= 8 &&
              i.x >= valueBoundaryX &&
              /^\d[\d,]*\.\d{2}$/.test(i.str.trim())
          )
          .sort((a, b) => a.x - b.x);
        if (totalAmountItems.length > 0) {
          const amounts = totalAmountItems.map((i) => parseNum(i.str));
          const hasTotalCol = amounts.length >= valueCols.length + 2;
          const fieldCount = hasTotalCol
            ? valueCols.length
            : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
          const byCode = new Map<string, number>();
          for (let k = 0; k < fieldCount; k++) {
            const bc = valueCols[k]?.code || `C${k}`;
            byCode.set(bc, (byCode.get(bc) || 0) + (amounts[k] || 0));
          }
          const get = (c: string) => byCode.get(c) || 0;
          detectedTotals = {
            incomeTax: get('9510'),
            profTax: get('9570'),
            hbaInterest: get('9591'),
            gpfRegular: get('9670'),
            gpfClass4: get('9531'),
            npsRegular: get('9534'),
            gisGovtFund: get('9581'),
            gisGovtSaving: get('9582'),
            totalDeductions: hasTotalCol
              ? amounts[amounts.length - 2] || 0
              : 0,
            netPay: amounts[amounts.length - 1] || 0,
          } as PayBillDeductionTotalRow;
        }
      }
    }

    if (rows.length === 0) return null;
    return {
      rows,
      totals:
        detectedTotals ??
        (this.totalsFor(section, 'DEDUCTION') as PayBillDeductionTotalRow | null),
    };
  }

  private parseDeductionSection(
    section: V2Section,
    warnings?: string[]
  ): { rows: PayBillDeductionRow[]; totals: PayBillDeductionTotalRow | null } {
    void warnings;
    if (section.bodyItems && section.bodyItems.length > 0) {
      try {
        const coordRes = this.parseDeductionRowsFromItems(section);
        if (coordRes && coordRes.rows.length > 0) {
          return coordRes;
        }
      } catch (err) {
        console.warn('[PdfParserV2] Coordinate deduction extraction fallback to text:', err);
      }
    }

    const valueCols = this.valueColumns(section);
    const blocks = this.splitBodyBlocks(section.bodyLines);
    const rows: PayBillDeductionRow[] = [];
    blocks.forEach((b, i) => {
      const numbers = b.text.match(AMOUNT_RE) || [];
      if (numbers.length === 0) return;
      const amounts = numbers.map(parseNum);
      const hasTotalCol = amounts.length >= valueCols.length + 2;
      const fieldCount = hasTotalCol
        ? valueCols.length
        : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
      const byCode = new Map<string, number>();
      for (let k = 0; k < fieldCount; k++) {
        const code = valueCols[k]?.code || `C${k}`;
        byCode.set(code, (byCode.get(code) || 0) + (amounts[k] || 0));
      }
      const total = hasTotalCol ? amounts[amounts.length - 2] ?? 0 : 0;
      const net = amounts[amounts.length - 1] ?? 0;
      const derivedTotal = hasTotalCol
        ? total
        : [...byCode.values()].reduce((s, v) => s + v, 0);
      const firstTok = numbers[0] as string;
      const firstNumIdx = b.text.indexOf(firstTok);
      const { name, designation } = this.splitIdentity(
        firstNumIdx >= 0 ? b.text.substring(0, firstNumIdx) : b.text,
        b.hrpn
      );
      const get = (code: string) => byCode.get(code) || 0;
      rows.push({
        srNo: i + 1,
        hrpn: b.hrpn,
        employeeName: name,
        designation,
        incomeTax: get('9510'),
        profTax: get('9570'),
        hbaInterest: get('9591'),
        gpfRegular: get('9670'),
        gpfClass4: get('9531'),
        npsRegular: get('9534'),
        gisGovtFund: get('9581'),
        gisGovtSaving: get('9582'),
        totalDeductions: derivedTotal,
        netPay: net,
        components: this.buildDeductionComponents({
          incomeTax: get('9510'),
          profTax: get('9570'),
          hbaInterest: get('9591'),
          gpfRegular: get('9670'),
          gpfClass4: get('9531'),
          npsRegular: get('9534'),
          gisGovtFund: get('9581'),
          gisGovtSaving: get('9582'),
          totalDeductions: derivedTotal,
          netPay: net,
        }),
      });
    });
    return { rows, totals: this.totalsFor(section, 'DEDUCTION') as PayBillDeductionTotalRow | null };
  }


  private totalsFor(section: V2Section, type: 'EARNING' | 'DEDUCTION'): unknown {
    const text = section.bodyLines.join('\n');
    const m = text.match(/Total\s+([0-9.,\s]+)/i);
    if (!m) return null;
    const numbers = m[1].match(AMOUNT_RE);
    if (!numbers) return null;
    const amounts = numbers.map(parseNum);
    const valueCols = this.valueColumns(section);
    if (type === 'EARNING') {
      const byCode = new Map<string, number>();
      const nValue = Math.max(0, amounts.length - 1);
      for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
        byCode.set(valueCols[k]?.code || `C${k}`, amounts[k] ?? 0);
      }
      const get = (c: string) => byCode.get(c) || 0;
      const basicIdx = valueCols.findIndex(
        (c) => (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
      );
      const specialIdx = valueCols.findIndex(
        (c, idx) =>
          idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
      );
      const basicPay =
        basicIdx >= 0 && basicIdx < nValue
          ? amounts[basicIdx] ?? 0
          : get('0101') || get('0102');
      const specialPay =
        specialIdx >= 0 && specialIdx < nValue
          ? amounts[specialIdx] ?? 0
          : 0;
      return {
        basicPay,
        da: get('0103'),
        hra: get('0110'),
        cla: get('0111'),
        medicalAllowance: get('0107'),
        transportAllowance: get('0113'),
        specialPay,
        washingAllowance: get('0132'),
        nonPrivatePracticeAllowance: get('0128'),
        otherAllowance: 0,
        grossAmount: amounts[amounts.length - 1] ?? 0,
      } as PayBillTotalRow;
    }
    const hasTotalCol = amounts.length >= valueCols.length + 2;
    const fieldCount = hasTotalCol ? valueCols.length : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
    const byCode = new Map<string, number>();
    for (let k = 0; k < fieldCount; k++) {
      const bc = valueCols[k]?.code || `C${k}`;
      byCode.set(bc, (byCode.get(bc) || 0) + (amounts[k] || 0));
    }
    const get = (c: string) => byCode.get(c) || 0;
    return {
      incomeTax: get('9510'),
      profTax: get('9570'),
      hbaInterest: get('9591'),
      gpfRegular: get('9670'),
      gpfClass4: get('9531'),
      npsRegular: get('9534'),
      gisGovtFund: get('9581'),
      gisGovtSaving: get('9582'),
      totalDeductions: hasTotalCol ? amounts[amounts.length - 2] || 0 : 0,
      netPay: amounts[amounts.length - 1] || 0,
    } as PayBillDeductionTotalRow;
  }

  private extractPayScale(text: string): string {
    const m =
      text.match(
        /\b(PB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)\/\d{3,5}|\d{4,5}-\d{4,5}\/\d{3,4}|Level-?\d+[^(]*(\([^)]*\))?|Fixed\s+Pay)\b/i
      ) || text.match(/\b(PB-?\d+\s*\(\s*\d{3,5}\s*-?)/i);
    return (m?.[1] || '').replace(/\s+/g, ' ').trim();
  }

  private extractSlo(text: string): string {
    const m = text.match(/\b(No|Yes)\s+([PTN])\b/i);
    return m ? m[2].toUpperCase() : 'P';
  }

  private buildComponents(valueCols: V2Column[], amounts: number[]): PayBillEmployeeComponent[] {
    const out: PayBillEmployeeComponent[] = [];
    const nValue = Math.max(0, amounts.length - 1);
    for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
      out.push({
        componentCode: valueCols[k].code,
        componentName: valueCols[k].label,
        amount: amounts[k],
        isTotalField: false,
      });
    }
    out.push({
      componentCode: 'GROSS',
      componentName: 'Gross Amount',
      type: 'TOTAL',
      amount: amounts[amounts.length - 1] || 0,
      isTotalField: true,
    });
    return out;
  }

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

  extractMetadata(text: string): PayBillMetadata {
    const clean = text.replace(/\r\n/g, '\n');
    let month = '';
    const monthMatch =
      clean.match(/Month\s+of\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
      clean.match(/Month\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
      clean.match(/([A-Za-z]+-\d{4})/);
    if (monthMatch) month = monthMatch[1].trim();
    const field = (patterns: RegExp[]): string => {
      for (const p of patterns) {
        const m = clean.match(p);
        if (m?.[1]) return m[1].trim();
      }
      return '';
    };
    return {
      month,
      ddoHrpn: field([/D\.?D\.?O\s*HRPN\s*:\s*([A-Za-z0-9]+)/i]),
      ddoName: field([/Name\s+of\s+D\.?D\.?O\s*:\s*([^:\n]+?)(?=\s+(?:Name of Ministry|Major Head|TAN|Bill No|Department|Address|\n|$))/i]),
      officeName: field([/Name\s+of\s+Office\s*:\s*([^:\n]+?)(?=\s+(?:Bill No|Major Head|TAN|Cardex|Department|\n|$))/i]),
      billNo: field([/Bill\s+No\.?\s*:\s*([A-Za-z0-9_-]+)/i]),
      majorHead: field([/Major\s+Head\s*:\s*([A-Za-z0-9_-]+)/i]),
      ddoCode: field([/D\.?D\.?O\s*Code\s*(?:No\.?)?\s*:\s*([A-Za-z0-9_-]+)/i]),
      department: field([/Department\s*:\s*([^:\n]+?)(?=\s+(?:TAN No|Cardex No|Address|Taluka|Mobile|\n|$))/i]),
      tanNo: field([/TAN\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i]),
      cardexNo: field([/Cardex\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i]),
      address: field([/Address\s*:\s*([^:\n]+?)(?=\s+(?:Cardex No|Mobile No|Taluka|Phone|\n|$))/i]),
      mobileNo: field([/Mobile\s*(?:No\.?)?\s*:\s*([0-9+\s-]{8,15})/i]),
      rawHeaderDump: clean.slice(0, 1000),
    };
  }
}

export const pdfParserV2Service = new PdfParserV2Service();

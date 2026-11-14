import { componentMasterService } from '../componentMaster.service';
import type { V2TextItem, V2Section, V2Column } from './types';
import { isHeaderLine, isFooterLine, classifySection } from './sectionClassifier';
import { detectedToColumns, firstValueX } from './cells';

/**
 * Split the document into table sections. Each section starts at a header
 * line (contains HRPN) and runs until the footer (Total/certify) or the
 * next header. Supports combined PDFs with several tables.
 */
export function detectSections(rawText: string, items: V2TextItem[]): V2Section[] {
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
        columns: buildColumns(lines, type),
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
    const columns = buildColumns(headerLines, type);
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
      valueBoundaryX: firstValueX(columns),
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
export function buildColumns(headerLines: string[], type: 'EARNING' | 'DEDUCTION'): V2Column[] {
  // Strip identity-region words before detection so "Pay Scale" never
  // matches a value component like "Pay Difference". HRPN/Sr are kept:
  // the detector needs them to locate the header block.
  const headerText = headerLines
    .join('\n')
    .replace(/Pay\s*Scale|Designation|Employee\s*Name|\bPH\b|\bSLO\b/gi, ' ');
  const detected = componentMasterService.detectHeaderComponents(headerText, type);
  return detectedToColumns(detected, headerText, type);
}

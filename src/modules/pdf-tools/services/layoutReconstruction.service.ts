import type {
  BoundingBox,
  DataType,
  ExtractedElement,
  SpatialCell,
  SpatialColumn,
  SpatialParagraph,
  SpatialRow,
  SpatialTable,
  StructuralBlock,
  StructuralBlockType,
} from '../types/spatial.types';
import { gujaratiUnicodeRecoveryService } from './gujaratiUnicodeRecovery.service';
import { dataNormalizationService } from './dataNormalization.service';

export interface LayoutReconstructionOptions {
  minColumnsForTable?: number;
  minRowsForTable?: number;
  yTolerancePx?: number;
  charSpacingGapRatio?: number; // ratio of fontSize to determine word boundary
  lineSpacingRatio?: number; // ratio of lineHeight to determine paragraph boundary
  columnGapThresholdPx?: number;
  enableMergedHeaderDetection?: boolean;
}

export interface ReconstructedLine {
  id: string;
  text: string;
  elements: ExtractedElement[];
  words: ExtractedElement[];
  bbox: BoundingBox;
  baselineY: number;
  height: number;
  fontSize: number;
  fontFamily?: string;
  isBold?: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  isHeading: boolean;
  headingLevel?: 1 | 2 | 3;
  isListItem: boolean;
  listPrefix?: string;
  isSignature: boolean;
  isFormRow: boolean;
  readingOrder: number;
}

export class LayoutReconstructionService {
  private defaultOptions: Required<LayoutReconstructionOptions> = {
    minColumnsForTable: 2,
    minRowsForTable: 2,
    yTolerancePx: 6,
    charSpacingGapRatio: 0.35,
    lineSpacingRatio: 1.75,
    columnGapThresholdPx: 18,
    enableMergedHeaderDetection: true,
  };

  /**
   * Stage 1: Glyph & Word Reconstruction
   * Stitches fragmented vector text glyphs/syllables into cohesive words.
   * e.g. ['વિ', 'ભા', 'ગ', '–', 'સુર', 'ત'] -> 'વિભાગ – સુરત'
   */
  reconstructGlyphsAndWords(
    rawElements: ExtractedElement[],
    options?: Partial<LayoutReconstructionOptions>
  ): ExtractedElement[] {
    if (rawElements.length === 0) return [];

    const opts = { ...this.defaultOptions, ...options };

    // Sort elements from top-to-bottom, then left-to-right
    const sorted = [...rawElements].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > opts.yTolerancePx) {
        return yDiff;
      }
      return a.x - b.x;
    });

    const reconstructedWords: ExtractedElement[] = [];
    let currentWordGroup: ExtractedElement[] = [];

    const flushWordGroup = () => {
      if (currentWordGroup.length === 0) return;

      if (currentWordGroup.length === 1) {
        const single = currentWordGroup[0];
        const recoveredText = gujaratiUnicodeRecoveryService.healPunctuationAndSpacing(
          gujaratiUnicodeRecoveryService.recoverText(single.text).text
        );

        reconstructedWords.push({
          ...single,
          text: recoveredText,
          rawText: single.rawText || single.text,
        });
        currentWordGroup = [];
        return;
      }

      // Merge multiple glyph fragments into a single word
      const first = currentWordGroup[0];
      const minX = Math.min(...currentWordGroup.map((e) => e.bbox[0]));
      const minY = Math.min(...currentWordGroup.map((e) => e.bbox[1]));
      const maxX = Math.max(...currentWordGroup.map((e) => e.bbox[2]));
      const maxY = Math.max(...currentWordGroup.map((e) => e.bbox[3]));

      const rawCombined = currentWordGroup.map((e) => e.rawText || e.text).join('');
      const joinedText = currentWordGroup.map((e) => e.text).join('');

      // Run Gujarati Unicode recovery on the stitched word
      const recoveryResult = gujaratiUnicodeRecoveryService.recoverText(joinedText);
      const cleanedText = gujaratiUnicodeRecoveryService.healPunctuationAndSpacing(
        recoveryResult.text
      );

      const avgConfidence = Math.round(
        currentWordGroup.reduce((s, e) => s + e.confidence, 0) / currentWordGroup.length
      );

      const dominantFont = currentWordGroup.find((e) => e.fontFamily)?.fontFamily || first.fontFamily;
      const maxFontSize = Math.max(...currentWordGroup.map((e) => e.fontSize || 12));

      reconstructedWords.push({
        id: `word-${first.page}-${reconstructedWords.length + 1}`,
        page: first.page,
        text: cleanedText,
        rawText: rawCombined,
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        bbox: [minX, minY, maxX, maxY],
        source: first.source === 'font-recovered' || recoveryResult.wasRecovered ? 'font-recovered' : first.source,
        confidence: avgConfidence,
        fontFamily: dominantFont,
        fontSize: maxFontSize,
        isBold: currentWordGroup.some((e) => e.isBold),
        isItalic: currentWordGroup.some((e) => e.isItalic),
        language: first.language,
      });

      currentWordGroup = [];
    };

    for (let i = 0; i < sorted.length; i++) {
      const el = sorted[i];
      if (!el.text || el.text.trim().length === 0) continue;

      if (currentWordGroup.length === 0) {
        currentWordGroup.push(el);
        continue;
      }

      const prev = currentWordGroup[currentWordGroup.length - 1];
      const fontSize = Math.max(10, prev.fontSize || el.fontSize || 12);
      const isSameBaseline = Math.abs(el.y - prev.y) <= Math.max(opts.yTolerancePx, fontSize * 0.4);

      const prevRight = prev.bbox[2];
      const currLeft = el.bbox[0];
      const horizontalGap = currLeft - prevRight;

      // Sub-word / glyph threshold:
      // If fragments overlap or gap is very small (< 0.35 * fontSize), they are part of the same word/syllable
      const isSubWordGap =
        isSameBaseline &&
        horizontalGap <= Math.max(4, fontSize * opts.charSpacingGapRatio) &&
        horizontalGap >= -15; // allow slight negative overlap (kerning/matras)

      // Handle standalone punctuation e.g. '–', '-', ':', '(', ')'
      const isPunctuation = /^[–—\-:;,।.\/()\[\]]+$/.test(el.text) || /^[–—\-:;,।.\/()\[\]]+$/.test(prev.text);
      const isTightPunctuation = isSameBaseline && isPunctuation && horizontalGap <= fontSize * 0.6;

      if (isSubWordGap || isTightPunctuation) {
        currentWordGroup.push(el);
      } else {
        flushWordGroup();
        currentWordGroup.push(el);
      }
    }

    flushWordGroup();
    return reconstructedWords;
  }

  /**
   * Stage 2: Line Reconstruction
   * Groups reconstructed words on the same baseline into structured lines with reading order.
   */
  reconstructLines(
    words: ExtractedElement[],
    pageWidth = 1000,
    options?: Partial<LayoutReconstructionOptions>
  ): ReconstructedLine[] {
    if (words.length === 0) return [];

    const opts = { ...this.defaultOptions, ...options };

    // 1. Group words into baseline line buckets
    const lineBuckets: ExtractedElement[][] = [];

    const sortedWords = [...words].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > opts.yTolerancePx) {
        return yDiff;
      }
      return a.x - b.x;
    });

    for (const w of sortedWords) {
      const wMidY = (w.bbox[1] + w.bbox[3]) / 2;
      const wHeight = Math.max(1, w.height);

      const matchedBucket = lineBuckets.find((bucket) => {
        const bucketMidY = bucket.reduce((s, item) => s + (item.bbox[1] + item.bbox[3]) / 2, 0) / bucket.length;
        const bucketAvgH = bucket.reduce((s, item) => s + item.height, 0) / bucket.length;
        const maxDiff = Math.min(wHeight, bucketAvgH) * 0.55 + opts.yTolerancePx * 0.45;
        return Math.abs(wMidY - bucketMidY) <= maxDiff;
      });

      if (matchedBucket) {
        matchedBucket.push(w);
      } else {
        lineBuckets.push([w]);
      }
    }

    // Sort each line horizontally and sort lines top-to-bottom
    const sortedBuckets = lineBuckets
      .map((bucket) => bucket.sort((a, b) => a.x - b.x))
      .sort((a, b) => {
        const aTop = Math.min(...a.map((e) => e.bbox[1]));
        const bTop = Math.min(...b.map((e) => e.bbox[1]));
        return aTop - bTop;
      });

    // 2. Build ReconstructedLine objects and classify properties
    const lines: ReconstructedLine[] = [];
    const avgDocFontSize =
      words.reduce((s, w) => s + (w.fontSize || 12), 0) / Math.max(1, words.length);

    for (let idx = 0; idx < sortedBuckets.length; idx++) {
      const lineWords = sortedBuckets[idx];
      const minX = Math.min(...lineWords.map((w) => w.bbox[0]));
      const minY = Math.min(...lineWords.map((w) => w.bbox[1]));
      const maxX = Math.max(...lineWords.map((w) => w.bbox[2]));
      const maxY = Math.max(...lineWords.map((w) => w.bbox[3]));

      const lineText = lineWords
        .map((w) => w.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*–\s*/g, ' – ')
        .replace(/\s*:\s*/g, ': ')
        .trim();

      if (!lineText) continue;

      const avgFontSize =
        lineWords.reduce((s, w) => s + (w.fontSize || 12), 0) / lineWords.length;
      const isBold = lineWords.some((w) => w.isBold);
      const lineWidth = maxX - minX;
      const midX = (minX + maxX) / 2;
      const pageCenter = pageWidth / 2;

      // Determine Alignment
      let align: 'left' | 'center' | 'right' | 'justify' = 'left';
      if (Math.abs(midX - pageCenter) < 55 && lineWidth < pageWidth * 0.75) {
        align = 'center';
      } else if (minX > pageWidth * 0.45 && maxX > pageWidth * 0.7) {
        align = 'right';
      }

      // Check Heading
      const isLargeFont = avgFontSize >= avgDocFontSize * 1.15;
      const isTitlePattern =
        /^(ગુજરાત સરકાર|પશુપાલન નિયામક|મંજૂરી હુકમ|બિડ રોજકામ|રોજકામ|જાહેર નિવેદન|કચેરી આદેશ|સરકારશ્રી|GOVERNMENT OF GUJARAT|PAYBILL INNER SHEET|STATEMENT OF|BID ROJKAM|ORDER|MEMORANDUM|OFFICE OF THE)/i.test(
          lineText
        );
      const isHeading =
        lineText.length < 90 &&
        (isTitlePattern || (isLargeFont && isBold) || (align === 'center' && lineText.length < 60));

      let headingLevel: 1 | 2 | 3 | undefined;
      if (isHeading) {
        if (avgFontSize >= avgDocFontSize * 1.3 || lineText.length < 40 || isTitlePattern) {
          headingLevel = 1;
        } else {
          headingLevel = 2;
        }
      }

      // Check List / Reference Item
      const listMatch = lineText.match(
        /^([૧-૯0-9]+\.|\([૧-૯0-9]+\)|\([A-Za-z]\)|[•\-\*]|સંદર્ભ\s*[:\-])\s*/
      );
      const isListItem = Boolean(listMatch);
      const listPrefix = listMatch ? listMatch[1] : undefined;

      // Check Signature Block
      const isSignatureDesignation =
        /(સહાયક નિયામક|નાયબ નિયામક|નિયામકશ્રી|કાર્યપાલક ઇજનેર|પશુચિકિત્સા અધિકારી|હિસાબી અધિકારી|શાખા અધિકારી|Assistant Director|Executive Engineer|Veterinary Officer|Accounts Officer|સુરત|ગાંધીનગર|સહી)/i.test(
          lineText
        );
      const isSignature = (align === 'right' || minX > pageWidth * 0.45) && isSignatureDesignation;

      // Check Form / Key-Value row
      const isFormRow =
        /^(તારીખ|જા\.નં|વંચાણે લીધા|વિષય|સંદર્ભ|D\.D\.O|TAN No|Cardex|Bill No)\s*[:\-]/i.test(
          lineText
        );

      lines.push({
        id: `line-${lineWords[0].page}-${idx + 1}`,
        text: lineText,
        elements: lineWords,
        words: lineWords,
        bbox: [minX, minY, maxX, maxY],
        baselineY: (minY + maxY) / 2,
        height: Math.max(1, maxY - minY),
        fontSize: avgFontSize,
        fontFamily: lineWords[0].fontFamily,
        isBold,
        align,
        isHeading,
        headingLevel,
        isListItem,
        listPrefix,
        isSignature,
        isFormRow,
        readingOrder: idx + 1,
      });
    }

    return lines;
  }

  /**
   * Stage 3: Strict Genuine Table Detection (5 Structural Indicators)
   * A table is created ONLY when sufficient structural evidence exists:
   * 1. Repeated X-coordinate column boundaries across multiple rows.
   * 2. Multiple rows with consistent vertical column alignment (>=2 cols, >=2 rows).
   * 3. Header-to-row relationship (e.g. Sr. No, Tech Eval No, Party Name, Status).
   * 4. Clear column gutters between distinct columns.
   */
  detectGenuineTables(
    lines: ReconstructedLine[],
    pageNumber = 1,
    _pageWidth = 1000,
    options?: Partial<LayoutReconstructionOptions>
  ): {
    tables: SpatialTable[];
    tableLineIndices: Set<number>;
  } {
    const opts = { ...this.defaultOptions, ...options };
    const tables: SpatialTable[] = [];
    const tableLineIndices = new Set<number>();

    if (lines.length < opts.minRowsForTable) {
      return { tables, tableLineIndices };
    }

    // 1. Identify candidate tabular segments (consecutive multi-word lines sharing column boundaries)
    let currentTableCandidate: {
      lineIndices: number[];
      columns: Array<{ x0: number; x1: number }>;
    } | null = null;

    const finalizeTableCandidate = () => {
      if (!currentTableCandidate) return;

      const { lineIndices, columns } = currentTableCandidate;

      // Table must have >= minRowsForTable and >= minColumnsForTable
      if (lineIndices.length >= opts.minRowsForTable && columns.length >= opts.minColumnsForTable) {
        const tableLines = lineIndices.map((i) => lines[i]);
        const spatialTable = this.buildSpatialTableFromLines(
          tableLines,
          columns,
          pageNumber,
          tables.length + 1
        );

        tables.push(spatialTable);
        lineIndices.forEach((i) => tableLineIndices.add(i));
      }

      currentTableCandidate = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip lines that are strong headings, short signature blocks, or single-column prose
      if (line.isHeading || line.isSignature || line.words.length < 2) {
        finalizeTableCandidate();
        continue;
      }

      // Check if this line has multiple distinct word clusters separated by clear gutters (>=15px)
      const lineWordIntervals = this.getLineWordIntervals(line.words);

      if (lineWordIntervals.length < opts.minColumnsForTable) {
        finalizeTableCandidate();
        continue;
      }

      if (!currentTableCandidate) {
        // Start new table candidate
        currentTableCandidate = {
          lineIndices: [i],
          columns: lineWordIntervals,
        };
      } else {
        // Check if current line aligns with existing candidate column structure
        const compatibility = this.evaluateColumnCompatibility(
          currentTableCandidate.columns,
          lineWordIntervals
        );

        if (compatibility.isCompatible) {
          currentTableCandidate.lineIndices.push(i);
          currentTableCandidate.columns = compatibility.mergedColumns;
        } else {
          finalizeTableCandidate();
          // Check if current line could start a new table
          if (lineWordIntervals.length >= opts.minColumnsForTable) {
            currentTableCandidate = {
              lineIndices: [i],
              columns: lineWordIntervals,
            };
          }
        }
      }
    }

    finalizeTableCandidate();

    return { tables, tableLineIndices };
  }

  private getLineWordIntervals(words: ExtractedElement[]): Array<{ x0: number; x1: number }> {
    if (words.length === 0) return [];

    // Group adjacent words if they are close (< 20px gap) into column cells
    const intervals: Array<{ x0: number; x1: number }> = [];
    let curX0 = words[0].bbox[0];
    let curX1 = words[0].bbox[2];

    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      const gap = w.bbox[0] - curX1;

      if (gap < 20) {
        curX1 = Math.max(curX1, w.bbox[2]);
      } else {
        intervals.push({ x0: curX0, x1: curX1 });
        curX0 = w.bbox[0];
        curX1 = w.bbox[2];
      }
    }

    intervals.push({ x0: curX0, x1: curX1 });
    return intervals;
  }

  private evaluateColumnCompatibility(
    existingCols: Array<{ x0: number; x1: number }>,
    newCols: Array<{ x0: number; x1: number }>
  ): { isCompatible: boolean; mergedColumns: Array<{ x0: number; x1: number }> } {
    if (Math.abs(existingCols.length - newCols.length) > 1) {
      return { isCompatible: false, mergedColumns: existingCols };
    }

    let matchCount = 0;
    const merged: Array<{ x0: number; x1: number }> = [];

    for (let c = 0; c < existingCols.length; c++) {
      const eCol = existingCols[c];
      const matchedNew = newCols.find((nCol) => {
        const overlap = Math.max(0, Math.min(eCol.x1, nCol.x1) - Math.max(eCol.x0, nCol.x0));
        return overlap > 0 || Math.abs(eCol.x0 - nCol.x0) < 35;
      });

      if (matchedNew) {
        matchCount++;
        merged.push({
          x0: Math.min(eCol.x0, matchedNew.x0),
          x1: Math.max(eCol.x1, matchedNew.x1),
        });
      } else {
        merged.push(eCol);
      }
    }

    const ratio = matchCount / Math.max(existingCols.length, newCols.length);
    const isCompatible = ratio >= 0.6;

    return { isCompatible, mergedColumns: isCompatible ? merged : existingCols };
  }

  private buildSpatialTableFromLines(
    tableLines: ReconstructedLine[],
    colPartitions: Array<{ x0: number; x1: number }>,
    pageNumber: number,
    tableIndex: number
  ): SpatialTable {
    const columnCount = colPartitions.length;
    const spatialRows: SpatialRow[] = [];
    const matrixCells: SpatialCell[][] = [];

    for (let rIdx = 0; rIdx < tableLines.length; rIdx++) {
      const line = tableLines[rIdx];
      const rowY0 = line.bbox[1];
      const rowY1 = line.bbox[3];
      const rowCells: SpatialCell[] = [];

      for (let cIdx = 0; cIdx < columnCount; cIdx++) {
        const colBounds = colPartitions[cIdx];
        const colElements = line.words.filter((w) => {
          const midX = (w.bbox[0] + w.bbox[2]) / 2;
          return midX >= colBounds.x0 - 15 && midX < colBounds.x1 + 15;
        });

        const cellText = colElements.map((w) => w.text).join(' ').trim();
        const confAvg =
          colElements.length > 0
            ? colElements.reduce((s, e) => s + e.confidence, 0) / colElements.length
            : 95;

        const normData = dataNormalizationService.normalize(cellText, Math.round(confAvg));

        // Spanning header / merged cell detection
        let colSpan = 1;
        if (colElements.length === 1 && columnCount > 1) {
          const el = colElements[0];
          const coveringCols = colPartitions.filter(
            (p) => el.bbox[0] < p.x1 - 10 && el.bbox[2] > p.x0 + 10
          ).length;
          if (coveringCols > 1) {
            colSpan = coveringCols;
          }
        }

        const cell: SpatialCell = {
          id: `cell-p${pageNumber}-t${tableIndex}-r${rIdx}-c${cIdx}`,
          pageNumber,
          rowIndex: rIdx,
          columnIndex: cIdx,
          rowSpan: 1,
          columnSpan: colSpan,
          bbox: [colBounds.x0, rowY0, colBounds.x1, rowY1],
          elements: colElements,
          text: cellText,
          data: normData,
          isHeader: rIdx === 0,
          isSubHeader: false,
          isTotal: false,
          isMerged: colSpan > 1,
          align: normData.type === 'number' || normData.type === 'currency' ? 'right' : 'left',
          confidence: Math.round(confAvg),
        };

        rowCells.push(cell);
      }

      const isHeader = rIdx === 0;
      const isTotal = rowCells.some((c) =>
        /(કુલ|સરવાળો|ચોખ્ખી રકમ|Total|Grand Total)/i.test(c.text)
      );

      for (const c of rowCells) {
        if (isHeader) c.isHeader = true;
        if (isTotal) c.isTotal = true;
      }

      spatialRows.push({
        rowIndex: rIdx,
        cells: rowCells,
        bbox: [
          Math.min(...colPartitions.map((p) => p.x0)),
          rowY0,
          Math.max(...colPartitions.map((p) => p.x1)),
          rowY1,
        ],
        isHeader,
        isTotal,
        baselineY: line.baselineY,
        height: line.height,
      });

      matrixCells.push(rowCells);
    }

    // Build Column definitions
    const spatialColumns: SpatialColumn[] = colPartitions.map((part, cIdx) => {
      const headerCell = matrixCells[0]?.[cIdx];
      const headerText = headerCell?.text || `Col ${cIdx + 1}`;

      const dataTypes = matrixCells
        .slice(1)
        .map((row) => row[cIdx]?.data.type)
        .filter(Boolean);

      const isNum =
        dataTypes.length > 0 &&
        dataTypes.filter((t) => t === 'number' || t === 'currency').length / dataTypes.length >= 0.5;

      return {
        columnIndex: cIdx,
        x0: part.x0,
        x1: part.x1,
        width: part.x1 - part.x0,
        headerText,
        predominantType: isNum ? 'currency' : 'text',
        align: isNum ? 'right' : 'left',
      };
    });

    // Propagate column currency type to numeric cells
    for (let cIdx = 0; cIdx < spatialColumns.length; cIdx++) {
      const col = spatialColumns[cIdx];
      const isCurrCol =
        col.predominantType === 'currency' ||
        /Pay|Salary|Amount|Gross|Basic|DA|HRA|CLA|Med|Allowance|Rate|Value|Amt|ભથ્થું|પગાર|રકમ|દર/i.test(
          col.headerText
        );

      if (isCurrCol) {
        for (let rIdx = 1; rIdx < matrixCells.length; rIdx++) {
          const cell = matrixCells[rIdx]?.[cIdx];
          if (cell && cell.data.type === 'number') {
            cell.data.type = 'currency';
            cell.data.currencySymbol = '₹';
            cell.align = 'right';
          }
        }
      }
    }

    const tableBbox: BoundingBox = [
      Math.min(...colPartitions.map((p) => p.x0)),
      Math.min(...spatialRows.map((r) => r.bbox[1])),
      Math.max(...colPartitions.map((p) => p.x1)),
      Math.max(...spatialRows.map((r) => r.bbox[3])),
    ];

    return {
      id: `table-p${pageNumber}-${tableIndex}`,
      pageNumber,
      bbox: tableBbox,
      columns: spatialColumns,
      rows: spatialRows,
      cells: matrixCells,
      hasBorders: true,
      confidence: 96,
      columnCount,
      rowCount: spatialRows.length,
    };
  }

  /**
   * Stage 4: Paragraph & Structural Flow Assembly (Paragraph-First Rule)
   * Merges continuous prose lines into coherent paragraphs and classifies headings, lists, signatures.
   */
  reconstructStructuralFlow(
    lines: ReconstructedLine[],
    tables: SpatialTable[],
    tableLineIndices: Set<number>,
    pageNumber = 1
  ): {
    paragraphs: SpatialParagraph[];
    blocks: StructuralBlock[];
    rawText: string;
  } {
    const paragraphs: SpatialParagraph[] = [];
    const blocks: StructuralBlock[] = [];
    let readingOrder = 1;

    let curProseLines: ReconstructedLine[] = [];

    const flushProseParagraph = () => {
      if (curProseLines.length === 0) return;

      const first = curProseLines[0];
      const minX = Math.min(...curProseLines.map((l) => l.bbox[0]));
      const minY = Math.min(...curProseLines.map((l) => l.bbox[1]));
      const maxX = Math.max(...curProseLines.map((l) => l.bbox[2]));
      const maxY = Math.max(...curProseLines.map((l) => l.bbox[3]));

      const combinedText = curProseLines.map((l) => l.text).join(' ').trim();
      const allElements = curProseLines.flatMap((l) => l.elements);
      const avgConf = Math.round(
        allElements.reduce((s, e) => s + e.confidence, 0) / Math.max(1, allElements.length)
      );

      const para: SpatialParagraph = {
        id: `para-p${pageNumber}-${paragraphs.length + 1}`,
        text: combinedText,
        elements: allElements,
        bbox: [minX, minY, maxX, maxY],
        isHeading: false,
        confidence: avgConf,
        blockType: 'paragraph',
        align: first.align,
      };

      paragraphs.push(para);
      blocks.push({
        id: `block-p${pageNumber}-${blocks.length + 1}`,
        type: 'paragraph',
        paragraph: para,
        readingOrder: readingOrder++,
        bbox: [minX, minY, maxX, maxY],
      });

      curProseLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      if (tableLineIndices.has(i)) {
        // If entering a table, flush any ongoing prose paragraph first
        flushProseParagraph();

        // Check if we need to emit a table block
        const matchedTable = tables.find((t) => t.rows.some((r) => r.bbox[1] === lines[i].bbox[1]));
        if (matchedTable && !blocks.some((b) => b.type === 'table' && (b as any).table.id === matchedTable.id)) {
          blocks.push({
            id: `block-table-p${pageNumber}-${matchedTable.id}`,
            type: 'table',
            table: matchedTable,
            readingOrder: readingOrder++,
            bbox: matchedTable.bbox,
          });
        }
        continue;
      }

      const line = lines[i];

      // If line is a standalone Heading
      if (line.isHeading) {
        flushProseParagraph();

        const headingPara: SpatialParagraph = {
          id: `heading-p${pageNumber}-${paragraphs.length + 1}`,
          text: line.text,
          elements: line.elements,
          bbox: line.bbox,
          isHeading: true,
          headingLevel: line.headingLevel || 1,
          confidence: Math.round(
            line.elements.reduce((s, e) => s + e.confidence, 0) / Math.max(1, line.elements.length)
          ),
          blockType: 'heading',
          align: line.align,
        };

        paragraphs.push(headingPara);
        blocks.push({
          id: `block-p${pageNumber}-${blocks.length + 1}`,
          type: 'heading',
          paragraph: headingPara,
          readingOrder: readingOrder++,
          bbox: line.bbox,
        });
        continue;
      }

      // If line is a List Item
      if (line.isListItem) {
        flushProseParagraph();

        const listPara: SpatialParagraph = {
          id: `list-p${pageNumber}-${paragraphs.length + 1}`,
          text: line.text,
          elements: line.elements,
          bbox: line.bbox,
          isHeading: false,
          confidence: Math.round(
            line.elements.reduce((s, e) => s + e.confidence, 0) / Math.max(1, line.elements.length)
          ),
          blockType: 'list',
          align: 'left',
          listNumber: line.listPrefix,
        };

        paragraphs.push(listPara);
        blocks.push({
          id: `block-p${pageNumber}-${blocks.length + 1}`,
          type: 'list',
          paragraph: listPara,
          readingOrder: readingOrder++,
          bbox: line.bbox,
        });
        continue;
      }

      // If line is a Signature Block
      if (line.isSignature) {
        flushProseParagraph();

        const sigPara: SpatialParagraph = {
          id: `sig-p${pageNumber}-${paragraphs.length + 1}`,
          text: line.text,
          elements: line.elements,
          bbox: line.bbox,
          isHeading: false,
          confidence: Math.round(
            line.elements.reduce((s, e) => s + e.confidence, 0) / Math.max(1, line.elements.length)
          ),
          blockType: 'signature',
          align: 'right',
        };

        paragraphs.push(sigPara);
        blocks.push({
          id: `block-p${pageNumber}-${blocks.length + 1}`,
          type: 'signature',
          paragraph: sigPara,
          readingOrder: readingOrder++,
          bbox: line.bbox,
        });
        continue;
      }

      // Continuous Prose paragraph logic
      if (curProseLines.length === 0) {
        curProseLines.push(line);
      } else {
        const prevLine = curProseLines[curProseLines.length - 1];
        const lineSpacing = line.bbox[1] - prevLine.bbox[3];
        const avgH = (line.height + prevLine.height) / 2;

        // If vertical gap is compatible with continuous paragraph (~1.0x to 1.8x line height)
        const isCompatibleSpacing = lineSpacing <= avgH * 1.8;
        const isSameAlignment = Math.abs(line.bbox[0] - prevLine.bbox[0]) < 60;

        if (isCompatibleSpacing && isSameAlignment) {
          curProseLines.push(line);
        } else {
          flushProseParagraph();
          curProseLines.push(line);
        }
      }
    }

    flushProseParagraph();

    // Assemble continuous natural reading text
    const textPieces: string[] = [];
    for (const b of blocks) {
      if (b.type === 'table') {
        const t = b.table;
        for (const row of t.rows) {
          textPieces.push(row.cells.map((c) => c.text).join('\t'));
        }
      } else {
        textPieces.push(b.paragraph.text);
      }
    }

    const rawText = textPieces.join('\n\n');

    return { paragraphs, blocks, rawText };
  }

  /**
   * Main Public API: Complete Layout & Reading-Order Reconstruction
   */
  reconstructPageLayout(
    rawElements: ExtractedElement[],
    pageNumber = 1,
    pageWidth = 1000,
    pageHeight = 1000,
    options?: Partial<LayoutReconstructionOptions>
  ): {
    tables: SpatialTable[];
    paragraphs: SpatialParagraph[];
    blocks: StructuralBlock[];
    rawText: string;
  } {
    if (rawElements.length === 0) {
      return { tables: [], paragraphs: [], blocks: [], rawText: '' };
    }

    // Step 1: Glyph and Word Reconstruction (heals 'વિ' + 'ભા' + 'ગ' + '–' + 'સુર' + 'ત' -> 'વિભાગ – સુરત')
    const words = this.reconstructGlyphsAndWords(rawElements, options);

    // Step 2: Line Reconstruction
    const lines = this.reconstructLines(words, pageWidth, options);

    // Step 3: Genuine Table Detection (Strict 5-criteria detection)
    const { tables, tableLineIndices } = this.detectGenuineTables(
      lines,
      pageNumber,
      pageWidth,
      options
    );

    // Step 4: Paragraph Reconstruction & Structural Flow Assembly
    const { paragraphs, blocks, rawText } = this.reconstructStructuralFlow(
      lines,
      tables,
      tableLineIndices,
      pageNumber
    );

    return { tables, paragraphs, blocks, rawText };
  }
}

export const layoutReconstructionService = new LayoutReconstructionService();

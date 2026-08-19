import type {
  BoundingBox,
  ExtractedElement,
  SpatialCell,
  SpatialColumn,
  SpatialParagraph,
  SpatialRow,
  SpatialTable,
} from '../types/spatial.types';
import { dataNormalizationService } from './dataNormalization.service';

export interface SpatialGridOptions {
  minColumns?: number;
  yTolerancePx?: number;
  columnGapThresholdPx?: number;
  enableMergedHeaderDetection?: boolean;
}

export class SpatialGridService {
  private defaultOptions: Required<SpatialGridOptions> = {
    minColumns: 2,
    yTolerancePx: 8,
    columnGapThresholdPx: 20,
    enableMergedHeaderDetection: true,
  };

  /**
   * Group raw extracted elements into structured visual lines using vertical Y-axis overlap
   */
  clusterIntoLines(elements: ExtractedElement[], yTolerance = 8): ExtractedElement[][] {
    if (elements.length === 0) return [];

    // Sort elements from top to bottom, then left to right
    const sorted = [...elements].sort((a, b) => {
      if (Math.abs(a.y - b.y) > yTolerance) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    const lines: ExtractedElement[][] = [];

    for (const el of sorted) {
      const elMidY = (el.bbox[1] + el.bbox[3]) / 2;
      const elHeight = Math.max(1, el.height);

      // Find an existing line bucket with significant vertical overlap
      const bucket = lines.find((line) => {
        const lineMidY = line.reduce((s, item) => s + (item.bbox[1] + item.bbox[3]) / 2, 0) / line.length;
        const lineAvgH = line.reduce((s, item) => s + item.height, 0) / line.length;

        const maxDiff = Math.min(elHeight, lineAvgH) * 0.6 + yTolerance * 0.4;
        return Math.abs(elMidY - lineMidY) <= maxDiff;
      });

      if (bucket) {
        bucket.push(el);
      } else {
        lines.push([el]);
      }
    }

    // Sort each line left-to-right (x ascending) and sort lines top-to-bottom (y ascending)
    return lines
      .map((line) => line.sort((a, b) => a.x - b.x))
      .sort((a, b) => {
        const aTop = Math.min(...a.map((e) => e.bbox[1]));
        const bTop = Math.min(...b.map((e) => e.bbox[1]));
        return aTop - bTop;
      });
  }

  /**
   * Explode elements that contain multi-word text with large internal whitespace into sub-tokens
   */
  explodeMultiTokenElements(elements: ExtractedElement[]): ExtractedElement[] {
    const result: ExtractedElement[] = [];

    for (const el of elements) {
      const raw = el.rawText || el.text || '';
      // Check if element has multiple tokens separated by 2+ spaces or tabs
      if (/\s{2,}|\t/.test(raw)) {
        const segments = raw.split(/\s{2,}|\t/).filter((s) => s.trim().length > 0);
        if (segments.length > 1) {
          const totalChars = Math.max(1, raw.length);
          let charOffset = 0;
          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i].trim();
            const segIndex = raw.indexOf(seg, charOffset);
            const startFrac = Math.max(0, segIndex >= 0 ? segIndex / totalChars : i / segments.length);
            const endFrac = Math.min(1, startFrac + seg.length / totalChars);

            const segX0 = el.bbox[0] + el.width * startFrac;
            const segX1 = Math.max(segX0 + 10, el.bbox[0] + el.width * endFrac);

            result.push({
              id: `${el.id}-tok${i + 1}`,
              page: el.page,
              text: seg,
              rawText: seg,
              x: segX0,
              y: el.y,
              width: Math.max(1, segX1 - segX0),
              height: el.height,
              bbox: [segX0, el.bbox[1], segX1, el.bbox[3]],
              source: el.source,
              confidence: el.confidence,
              language: el.language,
            });

            charOffset = segIndex >= 0 ? segIndex + seg.length : charOffset + seg.length;
          }
          continue;
        }
      }
      result.push(el);
    }

    return result;
  }

  /**
   * Advanced Column Inference combining X-projection occupancy, repeated left/right edge alignments,
   * numeric right-alignments, and whitespace gutters.
   */
  inferColumnPartitions(
    lines: ExtractedElement[][],
    elements: ExtractedElement[],
    gapThresholdPx = 15
  ): Array<{ x0: number; x1: number }> {
    if (elements.length === 0) return [];

    const minX = Math.min(...elements.map((e) => e.bbox[0]));
    const maxX = Math.max(...elements.map((e) => e.bbox[2]));
    const totalWidth = Math.ceil(maxX - minX);

    if (totalWidth <= 20) return [{ x0: minX, x1: maxX }];

    // 1. Collect candidate left edges and right edges across all multi-token lines
    const leftEdges: number[] = [];
    const rightEdges: number[] = [];

    for (const line of lines) {
      if (line.length >= 2) {
        for (const el of line) {
          leftEdges.push(el.bbox[0]);
          const isNum = /^[\d.,₹$€/+-]+$/.test(el.text.trim());
          if (isNum) {
            rightEdges.push(el.bbox[2]);
          }
        }
      }
    }

    // 2. Build continuous 1D X-projection occupancy array
    const occupancy = new Uint16Array(totalWidth + 1);
    for (const el of elements) {
      const start = Math.max(0, Math.floor(el.bbox[0] - minX));
      const end = Math.min(totalWidth, Math.ceil(el.bbox[2] - minX));
      for (let x = start; x <= end; x++) {
        occupancy[x]++;
      }
    }

    // 3. Detect gutters (valleys in occupancy)
    const splitPoints: number[] = [minX];
    let inGutter = false;
    let gutterStart = 0;

    for (let x = 0; x <= totalWidth; x++) {
      if (occupancy[x] === 0) {
        if (!inGutter) {
          inGutter = true;
          gutterStart = x;
        }
      } else {
        if (inGutter) {
          inGutter = false;
          const gutterWidth = x - gutterStart;
          if (gutterWidth >= gapThresholdPx) {
            const splitX = minX + Math.round((gutterStart + x) / 2);
            splitPoints.push(splitX);
          }
        }
      }
    }

    splitPoints.push(maxX);
    let uniqueSplits = Array.from(new Set(splitPoints)).sort((a, b) => a - b);

    // 4. If histogram yielded only 1 column, evaluate repeated left-edge clusters
    if (uniqueSplits.length <= 2 && leftEdges.length >= 4) {
      const edgeBins: { [bin: number]: number } = {};
      for (const edge of leftEdges) {
        const bin = Math.round(edge / 25) * 25;
        edgeBins[bin] = (edgeBins[bin] || 0) + 1;
      }

      const frequentBins = Object.keys(edgeBins)
        .map(Number)
        .filter((bin) => edgeBins[bin] >= 2)
        .sort((a, b) => a - b);

      if (frequentBins.length >= 2) {
        const edgeSplits = [minX];
        for (let i = 0; i < frequentBins.length - 1; i++) {
          edgeSplits.push(Math.round((frequentBins[i] + frequentBins[i + 1]) / 2));
        }
        edgeSplits.push(maxX);
        uniqueSplits = Array.from(new Set(edgeSplits)).sort((a, b) => a - b);
      }
    }

    // Build column boundaries
    const columns: Array<{ x0: number; x1: number }> = [];
    for (let i = 0; i < uniqueSplits.length - 1; i++) {
      columns.push({
        x0: uniqueSplits[i],
        x1: uniqueSplits[i + 1],
      });
    }

    return columns.length > 0 ? columns : [{ x0: minX, x1: maxX }];
  }

  /**
   * Spatial Grid Inference Engine:
   * Bypasses strict border-based table detection and infers 2D rows, columns, and cells
   * directly from spatial coordinates, whitespace gutters, token alignments, and numeric patterns.
   */
  inferSpatialGridFromCoordinates(
    elements: ExtractedElement[],
    pageNumber = 1,
    pageWidth = 1000,
    pageHeight = 1000
  ): SpatialTable {
    if (elements.length === 0) {
      return this.createEmptyTable(pageNumber, pageWidth, pageHeight);
    }

    // 1. Explode multi-token lines
    const tokenizedElements = this.explodeMultiTokenElements(elements);

    // 2. Cluster into visual lines based on vertical overlap
    const lines = this.clusterIntoLines(tokenizedElements, 10);
    if (lines.length === 0) {
      return this.createEmptyTable(pageNumber, pageWidth, pageHeight);
    }

    // 3. Multi-strategy column boundary detection (borderless / invisible table support)
    const colPartitions = this.inferColumnPartitions(lines, tokenizedElements);

    const columnCount = Math.max(1, colPartitions.length);
    const spatialRows: SpatialRow[] = [];
    const matrixCells: SpatialCell[][] = [];

    for (let rIdx = 0; rIdx < lines.length; rIdx++) {
      const lineElements = lines[rIdx];
      const rowY0 = Math.min(...lineElements.map((e) => e.bbox[1]));
      const rowY1 = Math.max(...lineElements.map((e) => e.bbox[3]));
      const rowCells: SpatialCell[] = [];

      for (let cIdx = 0; cIdx < columnCount; cIdx++) {
        const colBounds = colPartitions[cIdx];

        // Find elements belonging to this column lane
        const colElements = lineElements.filter((el) => {
          const elMidX = (el.bbox[0] + el.bbox[2]) / 2;
          const inBounds = elMidX >= colBounds.x0 && elMidX < colBounds.x1;
          const overlap = Math.max(0, Math.min(el.bbox[2], colBounds.x1) - Math.max(el.bbox[0], colBounds.x0));
          return inBounds || overlap > el.width * 0.4;
        });

        colElements.sort((a, b) => a.x - b.x);
        const cellText = colElements.map((e) => e.text).join(' ').trim();
        const confAvg =
          colElements.length > 0
            ? colElements.reduce((s, e) => s + e.confidence, 0) / colElements.length
            : 90;

        const normData = dataNormalizationService.normalize(cellText, Math.round(confAvg));
        const cellBox: BoundingBox = [colBounds.x0, rowY0, colBounds.x1, rowY1];

        // Spanning header / merged cell detection
        let colSpan = 1;
        if (colElements.length === 1) {
          const el = colElements[0];
          const coveringCols = colPartitions.filter(
            (p) => el.bbox[0] < p.x1 - 10 && el.bbox[2] > p.x0 + 10
          ).length;
          if (coveringCols > 1) {
            colSpan = coveringCols;
          }
        }

        const spatialCell: SpatialCell = {
          id: `cell-inferred-p${pageNumber}-r${rIdx}-c${cIdx}`,
          pageNumber,
          rowIndex: rIdx,
          columnIndex: cIdx,
          rowSpan: 1,
          columnSpan: colSpan,
          bbox: cellBox,
          elements: colElements,
          text: cellText,
          data: normData,
          isHeader: false,
          isSubHeader: false,
          isTotal: false,
          isMerged: colSpan > 1,
          align: normData.type === 'number' || normData.type === 'currency' ? 'right' : 'left',
        };

        rowCells.push(spatialCell);
      }

      const rowText = rowCells.map((c) => c.text).join(' ');
      const isHeader = rIdx === 0 && this.isHeaderRow(rowCells);
      const isTotal = this.isTotalRow(rowText);

      for (const cell of rowCells) {
        if (isHeader) cell.isHeader = true;
        if (isTotal) cell.isTotal = true;
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
        baselineY: (rowY0 + rowY1) / 2,
        height: Math.max(1, rowY1 - rowY0),
      });

      matrixCells.push(rowCells);
    }

    // Build column definitions
    const spatialColumns: SpatialColumn[] = colPartitions.map((part, cIdx) => {
      const headerCell = matrixCells[0]?.[cIdx];
      const headerText = headerCell?.text || `Col ${cIdx + 1}`;

      const dataCellTypes = matrixCells
        .slice(1)
        .map((row) => row[cIdx]?.data.type)
        .filter((t) => t && t !== 'empty');

      const numCount = dataCellTypes.filter((t) => t === 'number' || t === 'currency').length;
      const isNumericCol = dataCellTypes.length > 0 && numCount / dataCellTypes.length >= 0.5;

      return {
        columnIndex: cIdx,
        x0: part.x0,
        x1: part.x1,
        width: part.x1 - part.x0,
        headerText,
        predominantType: isNumericCol ? 'currency' : 'text',
        align: isNumericCol ? 'right' : 'left',
      };
    });

    const tableBbox: BoundingBox = [
      Math.min(...colPartitions.map((p) => p.x0)),
      Math.min(...spatialRows.map((r) => r.bbox[1])),
      Math.max(...colPartitions.map((p) => p.x1)),
      Math.max(...spatialRows.map((r) => r.bbox[3])),
    ];

    const avgConfidence = Math.round(
      tokenizedElements.reduce((s, e) => s + e.confidence, 0) / Math.max(1, tokenizedElements.length)
    );

    return {
      id: `table-inferred-p${pageNumber}-${Date.now()}`,
      pageNumber,
      bbox: tableBbox,
      columns: spatialColumns,
      rows: spatialRows,
      cells: matrixCells,
      hasBorders: false, // Borderless / invisible table
      confidence: avgConfidence,
      columnCount,
      rowCount: spatialRows.length,
    };
  }

  /**
   * Creates an empty editable starter table for manual creation
   */
  createEmptyTable(
    pageNumber = 1,
    pageWidth = 800,
    _pageHeight = 600,
    rowCount = 5,
    colCount = 4
  ): SpatialTable {
    const colWidth = Math.floor((pageWidth - 80) / colCount);
    const rowHeight = 32;
    const startX = 40;
    const startY = 80;

    const columns: SpatialColumn[] = Array.from({ length: colCount }, (_, cIdx) => ({
      columnIndex: cIdx,
      x0: startX + cIdx * colWidth,
      x1: startX + (cIdx + 1) * colWidth,
      width: colWidth,
      headerText: `Column ${cIdx + 1}`,
      predominantType: 'text',
      align: 'left',
    }));

    const rows: SpatialRow[] = [];
    const matrixCells: SpatialCell[][] = [];

    for (let r = 0; r < rowCount; r++) {
      const rowY0 = startY + r * rowHeight;
      const rowY1 = rowY0 + rowHeight;
      const rowCells: SpatialCell[] = [];

      for (let c = 0; c < colCount; c++) {
        const colBounds = columns[c];
        const isHeader = r === 0;
        const defaultText = isHeader ? `Header ${c + 1}` : '';
        const norm = dataNormalizationService.normalize(defaultText);

        const cell: SpatialCell = {
          id: `cell-manual-p${pageNumber}-r${r}-c${c}`,
          pageNumber,
          rowIndex: r,
          columnIndex: c,
          rowSpan: 1,
          columnSpan: 1,
          bbox: [colBounds.x0, rowY0, colBounds.x1, rowY1],
          elements: [],
          text: defaultText,
          data: norm,
          isHeader,
          isSubHeader: false,
          isTotal: false,
          isMerged: false,
          align: 'left',
        };
        rowCells.push(cell);
      }

      rows.push({
        rowIndex: r,
        cells: rowCells,
        bbox: [startX, rowY0, startX + colCount * colWidth, rowY1],
        isHeader: r === 0,
        isTotal: false,
        baselineY: (rowY0 + rowY1) / 2,
        height: rowHeight,
      });

      matrixCells.push(rowCells);
    }

    return {
      id: `table-manual-p${pageNumber}-${Date.now()}`,
      pageNumber,
      bbox: [startX, startY, startX + colCount * colWidth, startY + rowCount * rowHeight],
      columns,
      rows,
      cells: matrixCells,
      hasBorders: true,
      confidence: 100,
      columnCount: colCount,
      rowCount,
    };
  }

  /**
   * Detect column boundary partitions via X-projection density histogram across table rows
   */
  detectColumnPartitions(lines: ExtractedElement[][], gapThresholdPx = 20): Array<{ x0: number; x1: number }> {
    // Use multi-token rows to detect column splits so spanning headers don't bridge the gutters
    const multiTokenLines = lines.filter((l) => l.length >= 2);
    const candidateLines = multiTokenLines.length > 0 ? multiTokenLines : lines;
    const allElements = candidateLines.flat();
    if (allElements.length === 0) return [];

    const minX = Math.min(...allElements.map((e) => e.bbox[0]));
    const maxX = Math.max(...allElements.map((e) => e.bbox[2]));
    const totalWidth = Math.ceil(maxX - minX);

    if (totalWidth <= 0) return [{ x0: minX, x1: maxX }];

    // Continuous 1D X-projection occupancy array
    const occupancy = new Uint16Array(totalWidth + 1);

    for (const el of allElements) {
      const start = Math.max(0, Math.floor(el.bbox[0] - minX));
      const end = Math.min(totalWidth, Math.ceil(el.bbox[2] - minX));
      for (let x = start; x <= end; x++) {
        occupancy[x]++;
      }
    }

    // Find valleys and gutters with zero or very low occupancy
    const splitPoints: number[] = [minX];
    let inGutter = false;
    let gutterStart = 0;

    for (let x = 0; x <= totalWidth; x++) {
      if (occupancy[x] === 0) {
        if (!inGutter) {
          inGutter = true;
          gutterStart = x;
        }
      } else {
        if (inGutter) {
          inGutter = false;
          const gutterWidth = x - gutterStart;
          if (gutterWidth >= gapThresholdPx) {
            const splitX = minX + Math.round((gutterStart + x) / 2);
            splitPoints.push(splitX);
          }
        }
      }
    }

    splitPoints.push(maxX);
    const uniqueSplits = Array.from(new Set(splitPoints)).sort((a, b) => a - b);

    // Build columns from adjacent split points
    const columns: Array<{ x0: number; x1: number }> = [];
    for (let i = 0; i < uniqueSplits.length - 1; i++) {
      columns.push({
        x0: uniqueSplits[i],
        x1: uniqueSplits[i + 1],
      });
    }

    return columns;
  }

  /**
   * Check if a line is a header row
   */
  isHeaderRow(cells: SpatialCell[]): boolean {
    if (cells.length === 0) return false;
    const nonEmpty = cells.filter((c) => c.text.length > 0);
    if (nonEmpty.length === 0) return false;

    const nonNumericCount = nonEmpty.filter((c) => c.data.type === 'text').length;
    return nonNumericCount / nonEmpty.length >= 0.7;
  }

  /**
   * Check if a text line indicates a total or summary row in English or Gujarati
   */
  isTotalRow(rowText: string): boolean {
    const englishTotal = /\b(Total|Grand Total|Sub Total|Net Pay|Net Amount|Gross Total|Consolidated Total)\b/i.test(
      rowText
    );
    const gujaratiTotal = /(કુલ|સરવાળો|ચોખ્ખી રકમ|કુલ રકમ|મંજૂર થયેલ રકમ)/.test(rowText);
    return englishTotal || gujaratiTotal;
  }

  /**
   * Reconstruct document into structured 2D Spatial Tables and Paragraphs
   */
  reconstructSpatialDocument(
    elements: ExtractedElement[],
    pageNumber = 1,
    _pageWidth = 1000,
    _pageHeight = 1000,
    customOptions?: SpatialGridOptions
  ): { tables: SpatialTable[]; paragraphs: SpatialParagraph[] } {
    const opts = { ...this.defaultOptions, ...customOptions };
    const explodedElements = this.explodeMultiTokenElements(elements);
    const lines = this.clusterIntoLines(explodedElements, opts.yTolerancePx || 10);

    if (lines.length === 0) {
      return { tables: [], paragraphs: [] };
    }

    // Partition lines into Paragraph blocks vs Tabular table candidates
    const tableCandidateLines: ExtractedElement[][] = [];
    const paragraphLines: ExtractedElement[][] = [];

    for (const line of lines) {
      const lineText = line.map((e) => e.text).join(' ').trim();
      const isDocTitle = /^(PAYBILL INNER SHEET|GOVERNMENT OF GUJARAT|D\.D\.O|Major Head|TAN No|Cardex|વિષય:|મંજૂરી હુકમ|સરકાર)/i.test(
        lineText
      );

      const isSpanningHeader =
        line.length === 1 &&
        line[0].width > 120 &&
        /ALLOWANCE|DEDUCTION|PARTICULAR|EARNING|STATEMENT|વિગત|ભથ્થાં|કપાત/i.test(lineText);

      if (!isDocTitle && (line.length >= 2 || isSpanningHeader)) {
        tableCandidateLines.push(line);
      } else {
        paragraphLines.push(line);
      }
    }

    // Determine candidate lines for structured table grid and narrative paragraphs
    const isExplicitTable = tableCandidateLines.length >= 2;
    const effectiveTableLines = isExplicitTable ? tableCandidateLines : lines;
    const effectiveParagraphLines = isExplicitTable ? paragraphLines : [];

    // Build paragraph representations for Word/text export
    const paragraphs: SpatialParagraph[] = effectiveParagraphLines.map((l, idx) => {
      const text = l.map((e) => e.text).join(' ');
      const x0 = Math.min(...l.map((e) => e.bbox[0]));
      const y0 = Math.min(...l.map((e) => e.bbox[1]));
      const x1 = Math.max(...l.map((e) => e.bbox[2]));
      const y1 = Math.max(...l.map((e) => e.bbox[3]));
      const confAvg = l.reduce((s, e) => s + e.confidence, 0) / l.length;

      const isHeading =
        text.length < 60 &&
        (text === text.toUpperCase() || /^[0-9]+\.|કચેરી|હુકમ|Department/i.test(text));

      return {
        id: `para-p${pageNumber}-${idx + 1}`,
        text,
        elements: l,
        bbox: [x0, y0, x1, y1],
        isHeading,
        headingLevel: isHeading ? (text.length < 35 ? 1 : 2) : undefined,
        confidence: Math.round(confAvg),
      };
    });

    // Multi-strategy column boundary detection (borderless / multi-column support)
    let colPartitions = this.inferColumnPartitions(
      effectiveTableLines,
      explodedElements,
      opts.columnGapThresholdPx || 15
    );

    if (colPartitions.length === 0) {
      colPartitions = this.detectColumnPartitions(
        effectiveTableLines,
        opts.columnGapThresholdPx || 20
      );
    }

    if (colPartitions.length === 0) {
      const allEls = effectiveTableLines.flat();
      const minX = allEls.length > 0 ? Math.min(...allEls.map((e) => e.bbox[0])) : 50;
      const maxX = allEls.length > 0 ? Math.max(...allEls.map((e) => e.bbox[2])) : 950;
      colPartitions = [{ x0: minX, x1: maxX }];
    }

    const columnCount = Math.max(1, colPartitions.length);
    const spatialRows: SpatialRow[] = [];
    const matrixCells: SpatialCell[][] = [];

    for (let rIdx = 0; rIdx < effectiveTableLines.length; rIdx++) {
      const lineElements = effectiveTableLines[rIdx];
      const rowY0 = Math.min(...lineElements.map((e) => e.bbox[1]));
      const rowY1 = Math.max(...lineElements.map((e) => e.bbox[3]));
      const rowCells: SpatialCell[] = [];

      for (let cIdx = 0; cIdx < columnCount; cIdx++) {
        const colBounds = colPartitions[cIdx];
        // Collect all elements belonging to this column lane
        const colElements = lineElements.filter((el) => {
          const startsInThisCol = el.bbox[0] >= colBounds.x0 - 20 && el.bbox[0] < colBounds.x1;
          if (lineElements.length < columnCount && startsInThisCol) {
            return true;
          }
          const elMidX = (el.bbox[0] + el.bbox[2]) / 2;
          return elMidX >= colBounds.x0 && elMidX < colBounds.x1;
        });

        const cellText = colElements.map((e) => e.text).join(' ').trim();
        const confAvg =
          colElements.length > 0
            ? colElements.reduce((s, e) => s + e.confidence, 0) / colElements.length
            : 90;

        const normData = dataNormalizationService.normalize(cellText, Math.round(confAvg));
        const cellBox: BoundingBox = [
          colBounds.x0,
          rowY0,
          colBounds.x1,
          rowY1,
        ];

        // Check if an element physically spans multiple columns (merged header)
        let colSpan = 1;
        if (opts.enableMergedHeaderDetection && colElements.length === 1) {
          const el = colElements[0];
          const coveringCols = colPartitions.filter(
            (p) => el.bbox[0] < p.x1 - 10 && el.bbox[2] > p.x0 + 10
          ).length;
          if (coveringCols > 1) {
            colSpan = coveringCols;
          }
        }

        const spatialCell: SpatialCell = {
          id: `cell-p${pageNumber}-r${rIdx}-c${cIdx}`,
          pageNumber,
          rowIndex: rIdx,
          columnIndex: cIdx,
          rowSpan: 1,
          columnSpan: colSpan,
          bbox: cellBox,
          elements: colElements,
          text: cellText,
          data: normData,
          isHeader: false,
          isSubHeader: false,
          isTotal: false,
          isMerged: colSpan > 1,
          align: normData.type === 'number' || normData.type === 'currency' ? 'right' : 'left',
        };

        rowCells.push(spatialCell);
      }

      const rowText = rowCells.map((c) => c.text).join(' ');
      const isHeader = rIdx === 0 && this.isHeaderRow(rowCells);
      const isTotal = this.isTotalRow(rowText);

      // Propagate header/total flags to individual cells
      for (const cell of rowCells) {
        if (isHeader) cell.isHeader = true;
        if (isTotal) cell.isTotal = true;
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
        baselineY: (rowY0 + rowY1) / 2,
        height: Math.max(1, rowY1 - rowY0),
      });

      matrixCells.push(rowCells);
    }

    // Build column definitions
    const spatialColumns: SpatialColumn[] = colPartitions.map((part, cIdx) => {
      const headerCell = matrixCells[0]?.[cIdx];
      const headerText = headerCell?.text || `Column ${cIdx + 1}`;

      // Determine predominant type in this column across data rows
      const dataCellTypes = matrixCells
        .slice(1)
        .map((row) => row[cIdx]?.data.type)
        .filter((t) => t && t !== 'empty');

      const numCount = dataCellTypes.filter((t) => t === 'number' || t === 'currency').length;
      const isNumericCol = dataCellTypes.length > 0 && numCount / dataCellTypes.length >= 0.5;

      return {
        columnIndex: cIdx,
        x0: part.x0,
        x1: part.x1,
        width: part.x1 - part.x0,
        headerText,
        predominantType: isNumericCol ? 'currency' : 'text',
        align: isNumericCol ? 'right' : 'left',
      };
    });

    // Propagate column currency type to numeric cells
    for (let cIdx = 0; cIdx < spatialColumns.length; cIdx++) {
      const col = spatialColumns[cIdx];
      const isCurrCol =
        col.predominantType === 'currency' &&
        /Pay|Salary|Amount|Gross|Basic|DA|HRA|CLA|Med|Allowance|Rate|Value|Amt|ભથ્થું|પગાર|રકમ/i.test(
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

    const avgConfidence =
      elements.length > 0
        ? Math.round(elements.reduce((s, e) => s + e.confidence, 0) / elements.length)
        : 90;

    const spatialTable: SpatialTable = {
      id: `table-p${pageNumber}-1`,
      pageNumber,
      bbox: tableBbox,
      columns: spatialColumns,
      rows: spatialRows,
      cells: matrixCells,
      hasBorders: true,
      confidence: avgConfidence,
      columnCount,
      rowCount: spatialRows.length,
    };

    return { tables: [spatialTable], paragraphs };
  }
}

export const spatialGridService = new SpatialGridService();

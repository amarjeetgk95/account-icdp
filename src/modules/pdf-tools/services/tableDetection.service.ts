import type {
  ExtractedPage,
  ExtractedTable,
  ExtractedRow,
  ExtractedCell,
  ExtractedWord,
  ExtractedLine,
  TableDetectionOptions,
} from '../types';
import { spatialGridService } from './spatialGrid.service';
import { dataNormalizationService } from './dataNormalization.service';
import type { ExtractedElement } from '../types/spatial.types';

export class TableDetectionService {
  /**
   * Parse numeric value from string (delegates to DataNormalizationService)
   */
  parseNumber(text: string): { isNumeric: boolean; value?: number } {
    const norm = dataNormalizationService.normalize(text);
    if (norm.type === 'number' || norm.type === 'currency') {
      return { isNumeric: true, value: typeof norm.normalizedValue === 'number' ? norm.normalizedValue : undefined };
    }
    return { isNumeric: false };
  }

  /**
   * Detect if a line looks like a header row
   */
  isHeaderLine(cells: ExtractedCell[]): boolean {
    if (cells.length === 0) return false;
    const nonNumericCount = cells.filter((c) => c.data.type === 'text' && c.text.length > 0).length;
    const ratio = nonNumericCount / cells.length;
    return ratio >= 0.7;
  }

  /**
   * Detect if a line looks like a total / summary row (English + Gujarati keywords)
   */
  isTotalLine(text: string): boolean {
    return spatialGridService.isTotalRow(text);
  }

  /**
   * Group words into lines using Y-coordinate clustering
   */
  clusterWordsIntoLines(words: ExtractedWord[], thresholdPx: number): ExtractedLine[] {
    const elList: ExtractedElement[] = words.map((w, idx) => ({
      id: w.id || `word-${idx}`,
      page: w.page || 1,
      text: w.text,
      rawText: w.rawText || w.text,
      x: w.bbox ? w.bbox[0] : 0,
      y: w.bbox ? w.bbox[1] : 0,
      width: w.width || (w.bbox ? w.bbox[2] - w.bbox[0] : 20),
      height: w.height || (w.bbox ? w.bbox[3] - w.bbox[1] : 14),
      bbox: w.bbox || [0, 0, 20, 14],
      source: w.source || 'pdf-text',
      confidence: w.confidence || 90,
    }));

    const lines = spatialGridService.clusterIntoLines(elList, thresholdPx);

    return lines.map((line) => {
      const text = line.map((e) => e.text).join(' ');
      const x0 = Math.min(...line.map((e) => e.bbox[0]));
      const y0 = Math.min(...line.map((e) => e.bbox[1]));
      const x1 = Math.max(...line.map((e) => e.bbox[2]));
      const y1 = Math.max(...line.map((e) => e.bbox[3]));
      const confAvg = line.reduce((s, e) => s + e.confidence, 0) / line.length;

      return {
        text,
        confidence: Math.round(confAvg),
        bbox: { x0, y0, x1, y1 },
        words: line,
      };
    });
  }

  /**
   * Main table extraction algorithm for an ExtractedPage using spatial grid reconstruction
   */
  detectTablesInPage(
    page: ExtractedPage,
    customOptions?: TableDetectionOptions
  ): ExtractedTable[] {
    const elements: ExtractedElement[] = page.elements || [];

    if (elements.length === 0) {
      return this.detectTablesFromRawText(page.rawText, page.pageNumber);
    }

    const { tables } = spatialGridService.reconstructSpatialDocument(
      elements,
      page.pageNumber,
      page.width,
      page.height,
      {
        minColumns: customOptions?.minColumns,
        yTolerancePx: customOptions?.lineThresholdPx,
        columnGapThresholdPx: customOptions?.columnGapThresholdPx,
        enableMergedHeaderDetection: customOptions?.detectMergedHeaders,
      }
    );

    return tables;
  }

  /**
   * Fallback text-based parser when bounding boxes are not available
   */
  detectTablesFromRawText(rawText: string, pageNumber: number): ExtractedTable[] {
    const rawLines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return [];

    const rows: ExtractedRow[] = [];
    let maxCols = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      let parts: string[] = [];

      if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes('|')) {
        parts = line.split('|').map((p) => p.trim()).filter(Boolean);
      } else {
        parts = line.split(/\s{2,}/).map((p) => p.trim());
      }

      if (parts.length >= 2) {
        maxCols = Math.max(maxCols, parts.length);
        const cells: ExtractedCell[] = parts.map((p, colIdx) => {
          const norm = dataNormalizationService.normalize(p);
          return {
            id: `cell-raw-r${i}-c${colIdx}`,
            pageNumber,
            rowIndex: i,
            columnIndex: colIdx,
            rowSpan: 1,
            columnSpan: 1,
            bbox: [colIdx * 100, i * 25, (colIdx + 1) * 100, (i + 1) * 25],
            elements: [],
            text: p,
            data: norm,
            isHeader: i === 0,
            isSubHeader: false,
            isTotal: this.isTotalLine(line),
            isMerged: false,
            align: norm.type === 'number' || norm.type === 'currency' ? 'right' : 'left',
          };
        });

        const isHeader = i === 0 && this.isHeaderLine(cells);
        const isTotal = this.isTotalLine(line);

        rows.push({
          rowIndex: i,
          cells,
          bbox: [0, i * 25, maxCols * 100, (i + 1) * 25],
          isHeader,
          isTotal,
          baselineY: i * 25 + 12,
          height: 25,
        });
      }
    }

    if (rows.length < 2 || maxCols < 2) return [];

    // Normalize column counts across all rows
    for (const r of rows) {
      while (r.cells.length < maxCols) {
        const colIdx = r.cells.length;
        r.cells.push({
          id: `cell-raw-r${r.rowIndex}-c${colIdx}`,
          pageNumber,
          rowIndex: r.rowIndex,
          columnIndex: colIdx,
          rowSpan: 1,
          columnSpan: 1,
          bbox: [colIdx * 100, r.rowIndex * 25, (colIdx + 1) * 100, (r.rowIndex + 1) * 25],
          elements: [],
          text: '',
          data: { rawText: '', normalizedValue: null, type: 'empty', confidence: 90 },
          isHeader: false,
          isSubHeader: false,
          isTotal: false,
          isMerged: false,
          align: 'left',
        });
      }
    }

    const columns = Array.from({ length: maxCols }, (_, idx) => ({
      columnIndex: idx,
      x0: idx * 100,
      x1: (idx + 1) * 100,
      width: 100,
      headerText: rows[0]?.cells[idx]?.text || `Column ${idx + 1}`,
      predominantType: 'text' as const,
      align: 'left' as const,
    }));

    return [
      {
        id: `table-p${pageNumber}-raw`,
        pageNumber,
        bbox: [0, 0, maxCols * 100, rows.length * 25],
        columns,
        rows,
        cells: rows.map((r) => r.cells),
        hasBorders: true,
        confidence: 85,
        columnCount: maxCols,
        rowCount: rows.length,
      },
    ];
  }
}

export const tableDetectionService = new TableDetectionService();

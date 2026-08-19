import type ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ExcelExportOptions, SpatialDocument, SpatialTable } from '../types';

const THEME = {
  headerFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Deep Indigo / Blue 900
  } as ExcelJS.Fill,
  headerFont: {
    name: 'Segoe UI',
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 11,
  } as ExcelJS.Font,
  totalFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD1FAE5' }, // Emerald 100
  } as ExcelJS.Fill,
  totalFont: {
    name: 'Segoe UI',
    bold: true,
    size: 11,
    color: { argb: 'FF065F46' }, // Emerald 900
  } as ExcelJS.Font,
  cellBorder: {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  } as Partial<ExcelJS.Borders>,
  alignCenter: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  alignRight: { horizontal: 'right', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  alignLeft: { horizontal: 'left', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
};

export class ExcelSpatialExportService {
  private defaultOptions: ExcelExportOptions = {
    sheetPerTable: false,
    sheetPerPage: false,
    includeSummarySheet: true,
    accentColorHex: '1E3A8A',
    autoFitColumns: true,
    formatNumbers: true,
    preserveMergedCells: true,
  };

  /**
   * Export a SpatialDocument to an editable Excel (.xlsx) workbook
   */
  async exportToExcel(
    doc: SpatialDocument,
    customOptions?: ExcelExportOptions,
    customFileName?: string
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...customOptions };
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ICDP Surat Tax System - Spatial OCR Pipeline';
    workbook.created = new Date();

    const titleText = opts.workbookTitle || doc.fileName.replace(/\.[^/.]+$/, '');

    // 1. Summary Metadata Sheet
    if (opts.includeSummarySheet) {
      const summarySheet = workbook.addWorksheet('Document Overview');
      summarySheet.addRow(['ICDP SURAT TAX SYSTEM — SPATIAL DOCUMENT EXTRACTION']);
      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };
      titleCell.alignment = THEME.alignCenter;
      summarySheet.getRow(1).height = 28;

      summarySheet.addRow(['File Name:', doc.fileName]);
      summarySheet.addRow(['Total Pages:', doc.pageCount]);
      summarySheet.addRow(['OCR / Parsing Engine:', doc.engineUsed]);
      summarySheet.addRow(['Native Vector Text Layer:', doc.isNativeText ? 'Yes (100% Vector)' : 'No (Scanned OCR)']);
      summarySheet.addRow(['Overall Confidence:', `${doc.overallConfidence}%`]);
      summarySheet.addRow(['Extraction Time:', `${(doc.extractionDurationMs / 1000).toFixed(2)} seconds`]);
      summarySheet.addRow(['Detected Tables Count:', doc.consolidatedTables.length]);

      summarySheet.getRow(2).height = 8; // Spacer

      for (let r = 3; r <= 9; r++) {
        const row = summarySheet.getRow(r);
        row.getCell(1).font = { name: 'Segoe UI', bold: true, color: { argb: 'FF475569' } };
        row.getCell(2).font = { name: 'Segoe UI', color: { argb: 'FF1E293B' } };
      }

      summarySheet.getColumn(1).width = 28;
      summarySheet.getColumn(2).width = 45;
    }

    // 2. Data Sheets
    if (opts.sheetPerPage) {
      for (const page of doc.pages) {
        const sheetName = `Page ${page.pageNumber}`;
        const sheet = workbook.addWorksheet(sheetName, {
          pageSetup: { orientation: 'landscape', paperSize: 9 },
        });
        this.writeTablesToSheet(sheet, page.tables, `${titleText} — Page ${page.pageNumber}`, opts);
      }
    } else {
      const sheet = workbook.addWorksheet('Extracted Data', {
        pageSetup: { orientation: 'landscape', paperSize: 9 },
      });
      this.writeTablesToSheet(sheet, doc.consolidatedTables, titleText, opts);
    }

    // 3. Write buffer & Trigger Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const downloadName =
      customFileName || `${doc.fileName.replace(/\.[^/.]+$/, '')}_Spatial_Extracted.xlsx`;

    saveAs(blob, downloadName);
    return blob;
  }

  /**
   * Writes spatial tables into a worksheet, handling merges, typing, numbers, dates
   */
  private writeTablesToSheet(
    sheet: ExcelJS.Worksheet,
    tables: SpatialTable[],
    title: string,
    opts: ExcelExportOptions
  ): void {
    let startRow = 1;

    // Title banner
    const maxCols = Math.max(2, ...tables.map((t) => t.columnCount));
    sheet.mergeCells(startRow, 1, startRow, maxCols);
    const titleCell = sheet.getCell(startRow, 1);
    titleCell.value = title.toUpperCase();
    titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = THEME.alignCenter;
    sheet.getRow(startRow).height = 26;
    startRow += 2;

    if (tables.length === 0) {
      sheet.addRow(['No structured tables detected in document.']);
      return;
    }

    for (let tIdx = 0; tIdx < tables.length; tIdx++) {
      const table = tables[tIdx];
      if (tIdx > 0) startRow += 2; // Spacer between tables

      const mergesToApply: Array<{ sRow: number; sCol: number; eRow: number; eCol: number }> = [];

      for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
        const row = table.rows[rIdx];
        const currentSheetRow = startRow + rIdx;
        const excelRow = sheet.getRow(currentSheetRow);
        excelRow.height = row.isHeader ? 26 : row.isTotal ? 22 : 20;

        for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
          const cell = row.cells[cIdx];
          const colNum = cIdx + 1;
          const excelCell = excelRow.getCell(colNum);

          excelCell.border = THEME.cellBorder;

          // Apply values with exact data typing
          if (cell.data.type === 'formula' || (typeof cell.text === 'string' && cell.text.startsWith('='))) {
            const formulaStr = cell.text.startsWith('=') ? cell.text.slice(1) : cell.text;
            excelCell.value = { formula: formulaStr };
            excelCell.alignment = THEME.alignRight;
          } else if (cell.data.type === 'currency' && typeof cell.data.normalizedValue === 'number') {
            excelCell.value = cell.data.normalizedValue;
            excelCell.numFmt = '₹ #,##0.00';
            excelCell.alignment = THEME.alignRight;
          } else if (cell.data.type === 'number' && typeof cell.data.normalizedValue === 'number') {
            excelCell.value = cell.data.normalizedValue;
            excelCell.numFmt = '#,##0.00';
            excelCell.alignment = THEME.alignRight;
          } else if (cell.data.type === 'percentage' && typeof cell.data.normalizedValue === 'number') {
            excelCell.value = cell.data.normalizedValue;
            excelCell.numFmt = '0.00%';
            excelCell.alignment = THEME.alignRight;
          } else if (cell.data.type === 'date' && cell.data.normalizedValue instanceof Date) {
            excelCell.value = cell.data.normalizedValue;
            excelCell.numFmt = 'YYYY-MM-DD';
            excelCell.alignment = THEME.alignCenter;
          } else {
            excelCell.value = cell.text || '';
            excelCell.alignment = cell.align === 'right' ? THEME.alignRight : THEME.alignLeft;
          }

          // Apply Header / Total styling
          if (row.isHeader || cell.isHeader) {
            excelCell.fill = THEME.headerFill;
            excelCell.font = THEME.headerFont;
            excelCell.alignment = THEME.alignCenter;
          } else if (row.isTotal || cell.isTotal) {
            excelCell.fill = THEME.totalFill;
            excelCell.font = THEME.totalFont;
          } else if (rIdx % 2 === 1) {
            excelCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
            excelCell.font = { name: 'Segoe UI', size: 10 };
          } else {
            excelCell.font = { name: 'Segoe UI', size: 10 };
          }

          // Record cell merges (rowSpan / colSpan)
          if (opts.preserveMergedCells && (cell.columnSpan > 1 || cell.rowSpan > 1)) {
            mergesToApply.push({
              sRow: currentSheetRow,
              sCol: colNum,
              eRow: currentSheetRow + cell.rowSpan - 1,
              eCol: colNum + cell.columnSpan - 1,
            });
          }
        }
      }

      // Apply detected cell merges
      for (const m of mergesToApply) {
        try {
          sheet.mergeCells(m.sRow, m.sCol, m.eRow, m.eCol);
        } catch (err) {
          console.warn('[ExcelExport] Merge conflict avoided:', err);
        }
      }

      startRow += table.rows.length;
    }

    // Auto-fit column widths
    if (opts.autoFitColumns) {
      sheet.columns.forEach((column) => {
        let maxLen = 12;
        column.eachCell!({ includeEmpty: false }, (cell) => {
          const str = cell.value ? cell.value.toString() : '';
          maxLen = Math.max(maxLen, str.length);
        });
        column.width = Math.min(50, maxLen + 4);
      });
    }
  }
}

export const excelSpatialExportService = new ExcelSpatialExportService();

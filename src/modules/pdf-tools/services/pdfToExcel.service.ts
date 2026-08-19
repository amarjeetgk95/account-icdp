import { saveAs } from 'file-saver';
import { excelSpatialExportService } from './excelSpatialExport.service';
import type { ExcelExportOptions, SpatialDocument } from '../types';

export class PdfToExcelService {
  /**
   * Export document to Microsoft Excel (.xlsx) workbook using the spatial layout pipeline
   */
  async exportToExcel(
    doc: SpatialDocument,
    customOptions?: ExcelExportOptions,
    customFileName?: string
  ): Promise<Blob> {
    return excelSpatialExportService.exportToExcel(doc, customOptions, customFileName);
  }

  /**
   * Export document to Microsoft Excel (.xlsx) and immediately trigger browser file download
   */
  async exportAndDownload(
    doc: SpatialDocument,
    customOptions?: ExcelExportOptions,
    customFileName?: string
  ): Promise<void> {
    const blob = await this.exportToExcel(doc, customOptions, customFileName);
    const fileName =
      customFileName ||
      `${doc.fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_\-\u0A80-\u0AFF]/g, '_')}_extracted.xlsx`;
    saveAs(blob, fileName);
  }

  /**
   * Generate Tab-Separated Values (TSV) from the editable document for 1-click clipboard paste
   */
  generateTsv(doc: SpatialDocument): string {
    const tables = doc.consolidatedTables;
    if (tables.length === 0) {
      return doc.allText || '';
    }

    const tsvParts: string[] = [];

    for (let tIdx = 0; tIdx < tables.length; tIdx++) {
      const table = tables[tIdx];
      if (tables.length > 1) {
        tsvParts.push(`--- Table ${tIdx + 1} (Page ${table.pageNumber}) ---`);
      }

      for (const row of table.rows) {
        const rowLine = row.cells.map((cell) => (cell.text || '').replace(/\t/g, ' ')).join('\t');
        tsvParts.push(rowLine);
      }
      tsvParts.push('');
    }

    return tsvParts.join('\n');
  }
}

export const pdfToExcelService = new PdfToExcelService();

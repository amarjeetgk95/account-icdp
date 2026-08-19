import { describe, it, expect, vi } from 'vitest';
import { pdfToExcelService } from './pdfToExcel.service';
import { SAMPLE_ENGLISH_PAYBILL_DOC, SAMPLE_GUJARATI_ORDER_DOC } from '../utils/sampleDocuments';

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('PdfToExcelService', () => {
  it('generates a valid Excel (.xlsx) workbook blob for English document', async () => {
    const blob = await pdfToExcelService.exportToExcel(SAMPLE_ENGLISH_PAYBILL_DOC);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }, 20000);

  it('generates a valid Excel (.xlsx) workbook blob for Gujarati document', async () => {
    const blob = await pdfToExcelService.exportToExcel(SAMPLE_GUJARATI_ORDER_DOC, {
      workbookTitle: 'પશુપાલન વિભાગ પગાર પત્રક',
      sheetPerPage: true,
    });
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
  }, 20000);
});

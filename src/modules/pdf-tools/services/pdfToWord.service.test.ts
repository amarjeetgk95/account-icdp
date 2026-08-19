import { describe, it, expect, vi } from 'vitest';
import { pdfToWordService } from './pdfToWord.service';
import { SAMPLE_ENGLISH_PAYBILL_DOC, SAMPLE_GUJARATI_ORDER_DOC } from '../utils/sampleDocuments';

// Mock file-saver so test environment does not attempt real browser file downloads
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('PdfToWordService', () => {
  it('generates a valid Word (.docx) blob from extracted English paybill', async () => {
    const blob = await pdfToWordService.exportToWord(SAMPLE_ENGLISH_PAYBILL_DOC);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(500);
  });

  it('generates a valid Word (.docx) blob from extracted Gujarati document', async () => {
    const blob = await pdfToWordService.exportToWord(SAMPLE_GUJARATI_ORDER_DOC, {
      documentTitle: 'ગુજરાત સરકાર - પગાર મંજૂરી હુકમ',
    });
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(500);
  });
});

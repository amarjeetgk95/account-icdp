import { describe, it, expect } from 'vitest';
import { pdfManipulationService } from './pdfManipulation.service';
import { PDFDocument } from 'pdf-lib';

describe('PdfManipulationService', () => {
  it('parses page range strings correctly into 0-indexed numbers', () => {
    const indices1 = pdfManipulationService.parsePageRangeString('1-3, 5, 8-10', 10);
    expect(indices1).toEqual([0, 1, 2, 4, 7, 8, 9]);

    const indices2 = pdfManipulationService.parsePageRangeString('2, 4, 6', 10);
    expect(indices2).toEqual([1, 3, 5]);

    const indices3 = pdfManipulationService.parsePageRangeString('5-2', 10);
    expect(indices3).toEqual([1, 2, 3, 4]);

    const indices4 = pdfManipulationService.parsePageRangeString('1, 99', 5);
    expect(indices4).toEqual([0]);
  });

  it('merges multiple PDF files using pdf-lib', async () => {
    const doc1 = await PDFDocument.create();
    doc1.addPage([400, 600]);
    const pdfBytes1 = await doc1.save();

    const doc2 = await PDFDocument.create();
    doc2.addPage([400, 600]);
    doc2.addPage([400, 600]);
    const pdfBytes2 = await doc2.save();

    const result = await pdfManipulationService.mergePdfs([pdfBytes1, pdfBytes2]);
    expect(result.pageCount).toBe(3);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('splits and extracts selected pages from a PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    doc.addPage([400, 600]);
    doc.addPage([400, 600]);
    doc.addPage([400, 600]);
    const pdfBytes = await doc.save();

    const result = await pdfManipulationService.splitPdf(pdfBytes, [0, 2]); // pages 1 and 3
    expect(result.pageCount).toBe(2);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('organizes, rotates, and deletes pages in a PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    doc.addPage([400, 600]);
    doc.addPage([400, 600]);
    const pdfBytes = await doc.save();

    const result = await pdfManipulationService.organizePdf(pdfBytes, [
      { pageIndex: 2, rotation: 90 },
      { pageIndex: 0, rotation: 0 },
    ]);

    expect(result.pageCount).toBe(2);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('applies text watermark to PDF pages', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    const pdfBytes = await doc.save();

    const result = await pdfManipulationService.watermarkPdf(pdfBytes, {
      text: 'CONFIDENTIAL',
      fontSize: 36,
      opacity: 0.3,
      position: 'diagonal',
    });

    expect(result.pageCount).toBe(1);
    expect(result.data.length).toBeGreaterThan(0);
  });
});

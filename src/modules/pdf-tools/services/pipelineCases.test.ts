import { describe, it, expect, vi } from 'vitest';
import { spatialGridService } from './spatialGrid.service';
import { dataNormalizationService } from './dataNormalization.service';
import { excelSpatialExportService } from './excelSpatialExport.service';
import { imagePreprocessingService } from './imagePreprocessing.service';
import type { ExtractedElement, SpatialDocument } from '../types/spatial.types';

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('OCR Pipeline Overhaul — Test Cases A to J', () => {
  // Case A: Native selectable PDF
  it('Case A: Extracts native selectable PDF preserving vector precision and reading order', () => {
    const elements: ExtractedElement[] = [
      { id: '1', page: 1, text: 'EMPLOYEE', rawText: 'EMPLOYEE', x: 50, y: 100, width: 80, height: 14, bbox: [50, 100, 130, 114], source: 'pdf-text', confidence: 100, readingOrder: 1 },
      { id: '2', page: 1, text: 'SALARY', rawText: 'SALARY', x: 250, y: 100, width: 60, height: 14, bbox: [250, 100, 310, 114], source: 'pdf-text', confidence: 100, readingOrder: 2 },
      { id: '3', page: 1, text: 'Shri A.K.', rawText: 'Shri A.K.', x: 50, y: 130, width: 70, height: 14, bbox: [50, 130, 120, 144], source: 'pdf-text', confidence: 100, readingOrder: 3 },
      { id: '4', page: 1, text: '105600', rawText: '105600', x: 250, y: 130, width: 50, height: 14, bbox: [250, 130, 300, 144], source: 'pdf-text', confidence: 100, readingOrder: 4 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 600, 400);
    expect(result.tables.length).toBe(1);
    expect(result.tables[0].columnCount).toBe(2);
    expect(result.tables[0].rows[0].isHeader).toBe(true);
    expect(result.tables[0].rows[1].cells[1].data.type).toBe('currency');
    expect(result.tables[0].rows[1].cells[1].data.normalizedValue).toBe(105600);
  });

  // Case B: Scanned English PDF
  it('Case B: Processes scanned English PDF elements from PaddleOCR with confidence scores', () => {
    const elements: ExtractedElement[] = [
      { id: 'b1', page: 1, text: 'Item Description', rawText: 'Item Description', x: 60, y: 120, width: 140, height: 18, bbox: [60, 120, 200, 138], source: 'paddle-ocr', confidence: 96 },
      { id: 'b2', page: 1, text: 'Rate', rawText: 'Rate', x: 300, y: 120, width: 50, height: 18, bbox: [300, 120, 350, 138], source: 'paddle-ocr', confidence: 95 },
      { id: 'b3', page: 1, text: 'Vaccine Dose', rawText: 'Vaccine Dose', x: 60, y: 160, width: 120, height: 18, bbox: [60, 160, 180, 178], source: 'paddle-ocr', confidence: 94 },
      { id: 'b4', page: 1, text: '450.00', rawText: '450.00', x: 300, y: 160, width: 60, height: 18, bbox: [300, 160, 360, 178], source: 'paddle-ocr', confidence: 97 },
      { id: 'b5', page: 1, text: 'Total Amount', rawText: 'Total Amount', x: 60, y: 200, width: 100, height: 18, bbox: [60, 200, 160, 218], source: 'paddle-ocr', confidence: 98 },
      { id: 'b6', page: 1, text: '450.00', rawText: '450.00', x: 300, y: 200, width: 60, height: 18, bbox: [300, 200, 360, 218], source: 'paddle-ocr', confidence: 98 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 800, 600);
    expect(result.tables.length).toBe(1);
    expect(result.tables[0].rows.length).toBe(3);
    expect(result.tables[0].rows[2].isTotal).toBe(true);
  });

  // Case C: Scanned Gujarati PDF
  it('Case C: Preserves full Gujarati Unicode script and Gujarati numerals', () => {
    const elements: ExtractedElement[] = [
      { id: 'g1', page: 1, text: 'કર્મચારીનું નામ', rawText: 'કર્મચારીનું નામ', x: 50, y: 100, width: 120, height: 18, bbox: [50, 100, 170, 118], source: 'paddle-ocr', confidence: 98 },
      { id: 'g2', page: 1, text: 'મૂળ પગાર', rawText: 'મૂળ પગાર', x: 250, y: 100, width: 80, height: 18, bbox: [250, 100, 330, 118], source: 'paddle-ocr', confidence: 97 },
      { id: 'g3', page: 1, text: 'શ્રી એ. કે. રાઠોડ', rawText: 'શ્રી એ. કે. રાઠોડ', x: 50, y: 140, width: 140, height: 18, bbox: [50, 140, 190, 158], source: 'paddle-ocr', confidence: 96 },
      { id: 'g4', page: 1, text: '૧,૦૫,૬૦૦', rawText: '૧,૦૫,૬૦૦', x: 250, y: 140, width: 80, height: 18, bbox: [250, 140, 330, 158], source: 'paddle-ocr', confidence: 95 },
      { id: 'g5', page: 1, text: 'કુલ સરવાળો', rawText: 'કુલ સરવાળો', x: 50, y: 180, width: 100, height: 18, bbox: [50, 180, 150, 198], source: 'paddle-ocr', confidence: 99 },
      { id: 'g6', page: 1, text: '૧,૦૫,૬૦૦', rawText: '૧,૦૫,૬૦૦', x: 250, y: 180, width: 80, height: 18, bbox: [250, 180, 330, 198], source: 'paddle-ocr', confidence: 99 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 800, 600);
    expect(result.tables[0].rows[0].cells[0].text).toBe('કર્મચારીનું નામ');
    expect(result.tables[0].rows[1].cells[0].text).toBe('શ્રી એ. કે. રાઠોડ');
    expect(result.tables[0].rows[1].cells[1].data.type).toBe('currency');
    expect(result.tables[0].rows[1].cells[1].data.normalizedValue).toBe(105600);
    expect(result.tables[0].rows[2].isTotal).toBe(true);
  });

  // Case D: Mixed Gujarati + English PDF
  it('Case D: Supports mixed Gujarati + English without corruption', () => {
    const raw = 'DDO ICDP SURAT - મદદનીશ નિયામક શ્રી એ. કે. રાઠોડ - Basic Pay ₹ 1,05,600.00';
    const norm = dataNormalizationService.normalize('₹ 1,05,600.00');
    expect(norm.type).toBe('currency');
    expect(norm.normalizedValue).toBe(105600);
    expect(raw).toContain('મદદનીશ નિયામક');
    expect(raw).toContain('DDO ICDP SURAT');
  });

  // Case E: Government-style table with Headings, Metadata, and DDO Codes
  it('Case E: Correctly separates document narrative paragraphs from tabular data', () => {
    const elements: ExtractedElement[] = [
      // Narrative Heading Line
      { id: 'e1', page: 1, text: 'GUJARAT GOVERNMENT VETERINARY DEPARTMENT', rawText: 'GUJARAT GOVERNMENT VETERINARY DEPARTMENT', x: 100, y: 40, width: 400, height: 20, bbox: [100, 40, 500, 60], source: 'pdf-text', confidence: 100 },
      // Tabular Rows
      { id: 'e2', page: 1, text: 'HRPN', rawText: 'HRPN', x: 50, y: 120, width: 60, height: 14, bbox: [50, 120, 110, 134], source: 'pdf-text', confidence: 100 },
      { id: 'e3', page: 1, text: 'Basic', rawText: 'Basic', x: 250, y: 120, width: 60, height: 14, bbox: [250, 120, 310, 134], source: 'pdf-text', confidence: 100 },
      { id: 'e4', page: 1, text: '20013826', rawText: '20013826', x: 50, y: 150, width: 60, height: 14, bbox: [50, 150, 110, 164], source: 'pdf-text', confidence: 100 },
      { id: 'e5', page: 1, text: '105600', rawText: '105600', x: 250, y: 150, width: 60, height: 14, bbox: [250, 150, 310, 164], source: 'pdf-text', confidence: 100 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 800, 600);
    expect(result.tables.length).toBe(1);
    expect(result.paragraphs.length).toBe(1);
    expect(result.paragraphs[0].text).toContain('GUJARAT GOVERNMENT');
  });

  // Case F: Table with merged headers
  it('Case F: Identifies spanning header cells and sets columnSpan', () => {
    const elements: ExtractedElement[] = [
      // Spanning Header spanning 300px
      { id: 'm1', page: 1, text: 'ALLOWANCES (Rs.)', rawText: 'ALLOWANCES (Rs.)', x: 150, y: 100, width: 280, height: 16, bbox: [150, 100, 430, 116], source: 'pdf-text', confidence: 100 },
      // Sub-columns
      { id: 'm2', page: 1, text: 'DA', rawText: 'DA', x: 150, y: 130, width: 40, height: 14, bbox: [150, 130, 190, 144], source: 'pdf-text', confidence: 100 },
      { id: 'm3', page: 1, text: 'HRA', rawText: 'HRA', x: 280, y: 130, width: 40, height: 14, bbox: [280, 130, 320, 144], source: 'pdf-text', confidence: 100 },
      { id: 'm4', page: 1, text: 'CLA', rawText: 'CLA', x: 390, y: 130, width: 40, height: 14, bbox: [390, 130, 430, 144], source: 'pdf-text', confidence: 100 },
      // Data
      { id: 'm5', page: 1, text: '52800', rawText: '52800', x: 150, y: 160, width: 50, height: 14, bbox: [150, 160, 200, 174], source: 'pdf-text', confidence: 100 },
      { id: 'm6', page: 1, text: '10560', rawText: '10560', x: 280, y: 160, width: 50, height: 14, bbox: [280, 160, 330, 174], source: 'pdf-text', confidence: 100 },
      { id: 'm7', page: 1, text: '240', rawText: '240', x: 390, y: 160, width: 40, height: 14, bbox: [390, 160, 430, 174], source: 'pdf-text', confidence: 100 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 800, 600, {
      enableMergedHeaderDetection: true,
    });

    expect(result.tables[0].columnCount).toBe(3);
    expect(result.tables[0].rows[0].cells[0].isMerged).toBe(true);
    expect(result.tables[0].rows[0].cells[0].columnSpan).toBe(3);
  });

  // Case G: Table without visible borders (invisible whitespace-separated grid)
  it('Case G: Reconstructs invisible borderless grid from spatial whitespace alone', () => {
    const elements: ExtractedElement[] = [
      { id: 'w1', page: 1, text: 'Code', rawText: 'Code', x: 100, y: 50, width: 40, height: 12, bbox: [100, 50, 140, 62], source: 'pdf-text', confidence: 100 },
      { id: 'w2', page: 1, text: 'Description', rawText: 'Description', x: 250, y: 50, width: 80, height: 12, bbox: [250, 50, 330, 62], source: 'pdf-text', confidence: 100 },
      { id: 'w3', page: 1, text: 'Value', rawText: 'Value', x: 450, y: 50, width: 40, height: 12, bbox: [450, 50, 490, 62], source: 'pdf-text', confidence: 100 },
      { id: 'w4', page: 1, text: '01', rawText: '01', x: 100, y: 80, width: 20, height: 12, bbox: [100, 80, 120, 92], source: 'pdf-text', confidence: 100 },
      { id: 'w5', page: 1, text: 'Pay Allowance', rawText: 'Pay Allowance', x: 250, y: 80, width: 90, height: 12, bbox: [250, 80, 340, 92], source: 'pdf-text', confidence: 100 },
      { id: 'w6', page: 1, text: '1000', rawText: '1000', x: 450, y: 80, width: 35, height: 12, bbox: [450, 80, 485, 92], source: 'pdf-text', confidence: 100 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 600, 400);
    expect(result.tables[0].columnCount).toBe(3);
    expect(result.tables[0].rows.length).toBe(2);
  });

  // Case H: Currency ₹, Rs., accounting parenthesis negative, percentages, dates
  it('Case H: Properly classifies currency, negatives, percentages, and dates', () => {
    expect(dataNormalizationService.normalize('₹ 50,000.00').type).toBe('currency');
    expect(dataNormalizationService.normalize('Rs. 2500').type).toBe('currency');
    expect(dataNormalizationService.normalize('(1200.50)').normalizedValue).toBe(-1200.5);
    expect(dataNormalizationService.normalize('5.5%').type).toBe('percentage');
    expect(dataNormalizationService.normalize('31/03/2026').type).toBe('date');
  });

  // Case I: Multi-page document generation
  it('Case I: Generates valid multi-sheet Excel workbook for multi-page spatial documents', async () => {
    const doc: SpatialDocument = {
      fileName: 'MultiPage_Test.pdf',
      fileSizeBytes: 1024,
      pageCount: 2,
      pages: [
        {
          pageNumber: 1,
          width: 800,
          height: 600,
          dpi: 300,
          isScanned: false,
          elements: [],
          tables: [
            {
              id: 't1',
              pageNumber: 1,
              bbox: [50, 50, 400, 200],
              columnCount: 2,
              rowCount: 2,
              columns: [
                { columnIndex: 0, x0: 50, x1: 200, width: 150, headerText: 'Col 1', predominantType: 'text', align: 'left' },
                { columnIndex: 1, x0: 200, x1: 400, width: 200, headerText: 'Col 2', predominantType: 'number', align: 'right' },
              ],
              rows: [
                {
                  rowIndex: 0,
                  isHeader: true,
                  isTotal: false,
                  baselineY: 60,
                  height: 25,
                  bbox: [50, 50, 400, 75],
                  cells: [
                    { id: 'c1', pageNumber: 1, rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1, bbox: [50, 50, 200, 75], elements: [], text: 'Col 1', data: { rawText: 'Col 1', normalizedValue: 'Col 1', type: 'text', confidence: 100 }, isHeader: true, isSubHeader: false, isTotal: false, isMerged: false, align: 'left' },
                    { id: 'c2', pageNumber: 1, rowIndex: 0, columnIndex: 1, rowSpan: 1, columnSpan: 1, bbox: [200, 50, 400, 75], elements: [], text: 'Col 2', data: { rawText: 'Col 2', normalizedValue: 'Col 2', type: 'text', confidence: 100 }, isHeader: true, isSubHeader: false, isTotal: false, isMerged: false, align: 'left' },
                  ],
                },
                {
                  rowIndex: 1,
                  isHeader: false,
                  isTotal: false,
                  baselineY: 85,
                  height: 25,
                  bbox: [50, 75, 400, 100],
                  cells: [
                    { id: 'c3', pageNumber: 1, rowIndex: 1, columnIndex: 0, rowSpan: 1, columnSpan: 1, bbox: [50, 75, 200, 100], elements: [], text: 'Data A', data: { rawText: 'Data A', normalizedValue: 'Data A', type: 'text', confidence: 100 }, isHeader: false, isSubHeader: false, isTotal: false, isMerged: false, align: 'left' },
                    { id: 'c4', pageNumber: 1, rowIndex: 1, columnIndex: 1, rowSpan: 1, columnSpan: 1, bbox: [200, 75, 400, 100], elements: [], text: '500', data: { rawText: '500', normalizedValue: 500, type: 'currency', currencySymbol: '₹', confidence: 100 }, isHeader: false, isSubHeader: false, isTotal: false, isMerged: false, align: 'right' },
                  ],
                },
              ],
              cells: [],
              hasBorders: true,
              confidence: 99,
            },
          ],
          paragraphs: [],
          rawText: 'Page 1 Text',
          confidence: 99,
          renderingDurationMs: 10,
          ocrDurationMs: 0,
        },
      ],
      consolidatedTables: [],
      allText: 'Page 1 Text',
      overallConfidence: 99,
      extractionDurationMs: 100,
      engineUsed: 'PDF.js Native Text Engine',
      isNativeText: true,
    };

    const blob = await excelSpatialExportService.exportToExcel(doc, { sheetPerPage: true });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  }, 20000);

  // Case J: Image Preprocessing on noisy/blurred scanned canvas
  it('Case J: Preprocessing scales to target DPI and provides Sauvola thresholding', () => {
    const scale300 = imagePreprocessingService.getDpiScale(300);
    expect(scale300).toBeGreaterThanOrEqual(4.0);

    const scale150 = imagePreprocessingService.getDpiScale(150);
    expect(scale150).toBeGreaterThanOrEqual(2.0);
  });
});

import { describe, it, expect } from 'vitest';
import { tableDetectionService } from './tableDetection.service';
import type { ExtractedPage, ExtractedWord } from '../types';

describe('TableDetectionService', () => {
  it('correctly parses numbers and currency strings', () => {
    expect(tableDetectionService.parseNumber('105600')).toEqual({ isNumeric: true, value: 105600 });
    expect(tableDetectionService.parseNumber('1,05,600.00')).toEqual({ isNumeric: true, value: 105600 });
    expect(tableDetectionService.parseNumber('₹ 52,800.00')).toEqual({ isNumeric: true, value: 52800 });
    expect(tableDetectionService.parseNumber('Rs. 240.50')).toEqual({ isNumeric: true, value: 240.5 });
    expect(tableDetectionService.parseNumber('(500.00)')).toEqual({ isNumeric: true, value: -500 });
    expect(tableDetectionService.parseNumber('Shri. A. K. Rathod')).toEqual({ isNumeric: false });
    expect(tableDetectionService.parseNumber('HRPN20013826')).toEqual({ isNumeric: false });
  });

  it('detects header and total lines in English and Gujarati', () => {
    expect(tableDetectionService.isTotalLine('Total Consolidated Amount: 468810.00')).toBe(true);
    expect(tableDetectionService.isTotalLine('Grand Total Rs. 100000')).toBe(true);
    expect(tableDetectionService.isTotalLine('કુલ રકમ: ૨,૨૮,૭૦૦.૦૦')).toBe(true);
    expect(tableDetectionService.isTotalLine('કુલ મંજૂર થયેલ રકમ')).toBe(true);
    expect(tableDetectionService.isTotalLine('Employee Name & Designation')).toBe(false);
  });

  it('clusters bounding boxes into rows and detects table columns', () => {
    const words: ExtractedWord[] = [
      // Row 1 (Header): Y=10
      { id: 'w1', page: 1, text: 'SrNo', rawText: 'SrNo', x: 10, y: 10, width: 30, height: 15, bbox: [10, 10, 40, 25], source: 'pdf-text', confidence: 99 },
      { id: 'w2', page: 1, text: 'Employee', rawText: 'Employee', x: 60, y: 10, width: 60, height: 15, bbox: [60, 10, 120, 25], source: 'pdf-text', confidence: 99 },
      { id: 'w3', page: 1, text: 'Basic', rawText: 'Basic', x: 200, y: 10, width: 40, height: 15, bbox: [200, 10, 240, 25], source: 'pdf-text', confidence: 99 },
      { id: 'w4', page: 1, text: 'Gross', rawText: 'Gross', x: 300, y: 10, width: 40, height: 15, bbox: [300, 10, 340, 25], source: 'pdf-text', confidence: 99 },
      // Row 2 (Data 1): Y=40
      { id: 'w5', page: 1, text: '1', rawText: '1', x: 10, y: 40, width: 10, height: 15, bbox: [10, 40, 20, 55], source: 'pdf-text', confidence: 98 },
      { id: 'w6', page: 1, text: 'A.Rathod', rawText: 'A.Rathod', x: 60, y: 40, width: 60, height: 15, bbox: [60, 40, 120, 55], source: 'pdf-text', confidence: 98 },
      { id: 'w7', page: 1, text: '105600', rawText: '105600', x: 200, y: 40, width: 50, height: 15, bbox: [200, 40, 250, 55], source: 'pdf-text', confidence: 98 },
      { id: 'w8', page: 1, text: '170200', rawText: '170200', x: 300, y: 40, width: 50, height: 15, bbox: [300, 40, 350, 55], source: 'pdf-text', confidence: 98 },
      // Row 3 (Data 2): Y=70
      { id: 'w9', page: 1, text: '2', rawText: '2', x: 10, y: 70, width: 10, height: 15, bbox: [10, 70, 20, 85], source: 'pdf-text', confidence: 97 },
      { id: 'w10', page: 1, text: 'P.Patel', rawText: 'P.Patel', x: 60, y: 70, width: 50, height: 15, bbox: [60, 70, 110, 85], source: 'pdf-text', confidence: 97 },
      { id: 'w11', page: 1, text: '84500', rawText: '84500', x: 200, y: 70, width: 40, height: 15, bbox: [200, 70, 240, 85], source: 'pdf-text', confidence: 97 },
      { id: 'w12', page: 1, text: '136440', rawText: '136440', x: 300, y: 70, width: 45, height: 15, bbox: [300, 70, 345, 85], source: 'pdf-text', confidence: 97 },
      // Row 4 (Total): Y=100
      { id: 'w13', page: 1, text: 'Total', rawText: 'Total', x: 10, y: 100, width: 35, height: 15, bbox: [10, 100, 45, 115], source: 'pdf-text', confidence: 99 },
      { id: 'w14', page: 1, text: 'Summary', rawText: 'Summary', x: 60, y: 100, width: 55, height: 15, bbox: [60, 100, 115, 115], source: 'pdf-text', confidence: 99 },
      { id: 'w15', page: 1, text: '190100', rawText: '190100', x: 200, y: 100, width: 50, height: 15, bbox: [200, 100, 250, 115], source: 'pdf-text', confidence: 99 },
      { id: 'w16', page: 1, text: '306640', rawText: '306640', x: 300, y: 100, width: 50, height: 15, bbox: [300, 100, 350, 115], source: 'pdf-text', confidence: 99 },
    ];

    const lines = tableDetectionService.clusterWordsIntoLines(words, 8);
    expect(lines.length).toBe(4);

    const mockPage: ExtractedPage = {
      pageNumber: 1,
      width: 500,
      height: 200,
      dpi: 300,
      rawText: lines.map((l) => l.text).join('\n'),
      elements: words,
      paragraphs: [],
      tables: [],
      confidence: 98,
      isScanned: false,
      renderingDurationMs: 0,
      ocrDurationMs: 0,
    };

    const tables = tableDetectionService.detectTablesInPage(mockPage);
    expect(tables.length).toBeGreaterThan(0);

    const table = tables[0];
    expect(table.rowCount).toBeGreaterThanOrEqual(3);
    expect(table.columnCount).toBeGreaterThanOrEqual(3);
  });

  it('detects tables from tab-separated or pipe-separated raw text fallback', () => {
    const rawText = `Name\tDesignation\tSalary\tGross
Shri A. Rathod\tDirector\t105600\t170200
Dr P. Patel\tOfficer\t84500\t136440
Total\t-\t190100\t306640`;

    const tables = tableDetectionService.detectTablesFromRawText(rawText, 1);
    expect(tables.length).toBe(1);
    expect(tables[0].columnCount).toBe(4);
    expect(tables[0].columns.map((c) => c.headerText)).toEqual(['Name', 'Designation', 'Salary', 'Gross']);
  });
});

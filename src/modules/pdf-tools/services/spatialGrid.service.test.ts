import { describe, it, expect } from 'vitest';
import { spatialGridService } from './spatialGrid.service';
import type { ExtractedElement } from '../types/spatial.types';

describe('SpatialGridService', () => {
  it('clusters elements with similar Y coordinates into discrete visual lines', () => {
    const elements: ExtractedElement[] = [
      { id: '1', page: 1, text: 'Name', rawText: 'Name', x: 50, y: 100, width: 40, height: 14, bbox: [50, 100, 90, 114], source: 'pdf-text', confidence: 100 },
      { id: '2', page: 1, text: 'Amount', rawText: 'Amount', x: 200, y: 102, width: 50, height: 14, bbox: [200, 102, 250, 116], source: 'pdf-text', confidence: 100 },
      { id: '3', page: 1, text: 'Date', rawText: 'Date', x: 400, y: 101, width: 30, height: 14, bbox: [400, 101, 430, 115], source: 'pdf-text', confidence: 100 },
      { id: '4', page: 1, text: 'Shri A.K.', rawText: 'Shri A.K.', x: 50, y: 140, width: 60, height: 14, bbox: [50, 140, 110, 154], source: 'pdf-text', confidence: 100 },
      { id: '5', page: 1, text: '₹ 10,000', rawText: '₹ 10,000', x: 200, y: 139, width: 55, height: 14, bbox: [200, 139, 255, 153], source: 'pdf-text', confidence: 100 },
    ];

    const lines = spatialGridService.clusterIntoLines(elements, 8);
    expect(lines.length).toBe(2);
    expect(lines[0].map((e) => e.text)).toEqual(['Name', 'Amount', 'Date']);
    expect(lines[1].map((e) => e.text)).toEqual(['Shri A.K.', '₹ 10,000']);
  });

  it('detects column boundaries via X-projection density histogram', () => {
    const lines: ExtractedElement[][] = [
      [
        { id: '1', page: 1, text: 'ColA', rawText: 'ColA', x: 50, y: 100, width: 50, height: 14, bbox: [50, 100, 100, 114], source: 'pdf-text', confidence: 100 },
        { id: '2', page: 1, text: 'ColB', rawText: 'ColB', x: 200, y: 100, width: 50, height: 14, bbox: [200, 100, 250, 114], source: 'pdf-text', confidence: 100 },
        { id: '3', page: 1, text: 'ColC', rawText: 'ColC', x: 400, y: 100, width: 50, height: 14, bbox: [400, 100, 450, 114], source: 'pdf-text', confidence: 100 },
      ],
      [
        { id: '4', page: 1, text: 'Val1', rawText: 'Val1', x: 50, y: 140, width: 40, height: 14, bbox: [50, 140, 90, 154], source: 'pdf-text', confidence: 100 },
        { id: '5', page: 1, text: 'Val2', rawText: 'Val2', x: 200, y: 140, width: 40, height: 14, bbox: [200, 140, 240, 154], source: 'pdf-text', confidence: 100 },
        { id: '6', page: 1, text: 'Val3', rawText: 'Val3', x: 400, y: 140, width: 40, height: 14, bbox: [400, 140, 440, 154], source: 'pdf-text', confidence: 100 },
      ],
    ];

    const columns = spatialGridService.detectColumnPartitions(lines, 20);
    expect(columns.length).toBe(3);
  });

  it('detects total rows in Gujarati and English', () => {
    expect(spatialGridService.isTotalRow('Total Amount')).toBe(true);
    expect(spatialGridService.isTotalRow('Grand Total')).toBe(true);
    expect(spatialGridService.isTotalRow('કુલ રકમ (₹)')).toBe(true);
    expect(spatialGridService.isTotalRow('કુલ સરવાળો')).toBe(true);
    expect(spatialGridService.isTotalRow('ચોખ્ખી રકમ')).toBe(true);
    expect(spatialGridService.isTotalRow('Employee Name')).toBe(false);
  });

  it('reconstructs complete 2D spatial table from raw elements', () => {
    const elements: ExtractedElement[] = [
      // Row 0 (Headers)
      { id: 'h1', page: 1, text: 'Emp Name', rawText: 'Emp Name', x: 50, y: 100, width: 80, height: 16, bbox: [50, 100, 130, 116], source: 'pdf-text', confidence: 100 },
      { id: 'h2', page: 1, text: 'Basic Pay', rawText: 'Basic Pay', x: 250, y: 100, width: 70, height: 16, bbox: [250, 100, 320, 116], source: 'pdf-text', confidence: 100 },
      { id: 'h3', page: 1, text: 'Gross Amt', rawText: 'Gross Amt', x: 450, y: 100, width: 70, height: 16, bbox: [450, 100, 520, 116], source: 'pdf-text', confidence: 100 },

      // Row 1 (Data)
      { id: 'd1', page: 1, text: 'Shri Patel', rawText: 'Shri Patel', x: 50, y: 130, width: 70, height: 16, bbox: [50, 130, 120, 146], source: 'pdf-text', confidence: 100 },
      { id: 'd2', page: 1, text: '50000', rawText: '50000', x: 250, y: 130, width: 50, height: 16, bbox: [250, 130, 300, 146], source: 'pdf-text', confidence: 100 },
      { id: 'd3', page: 1, text: '75000', rawText: '75000', x: 450, y: 130, width: 50, height: 16, bbox: [450, 130, 500, 146], source: 'pdf-text', confidence: 100 },

      // Row 2 (Total)
      { id: 't1', page: 1, text: 'Total', rawText: 'Total', x: 50, y: 160, width: 40, height: 16, bbox: [50, 160, 90, 176], source: 'pdf-text', confidence: 100 },
      { id: 't2', page: 1, text: '50000', rawText: '50000', x: 250, y: 160, width: 50, height: 16, bbox: [250, 160, 300, 176], source: 'pdf-text', confidence: 100 },
      { id: 't3', page: 1, text: '75000', rawText: '75000', x: 450, y: 160, width: 50, height: 16, bbox: [450, 160, 500, 176], source: 'pdf-text', confidence: 100 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 800, 600);
    expect(result.tables.length).toBe(1);
    const table = result.tables[0];
    expect(table.columnCount).toBe(3);
    expect(table.rowCount).toBe(3);
    expect(table.rows[0].isHeader).toBe(true);
    expect(table.rows[2].isTotal).toBe(true);
    expect(table.rows[1].cells[1].data.type).toBe('currency');
    expect(table.rows[1].cells[1].data.normalizedValue).toBe(50000);
  });

  it('reconstructs a table even for sparse or single-column documents', () => {
    const elements: ExtractedElement[] = [
      { id: '1', page: 1, text: 'Item 1', rawText: 'Item 1', x: 50, y: 100, width: 60, height: 16, bbox: [50, 100, 110, 116], source: 'pdf-text', confidence: 100 },
      { id: '2', page: 1, text: 'Item 2', rawText: 'Item 2', x: 50, y: 140, width: 60, height: 16, bbox: [50, 140, 110, 156], source: 'pdf-text', confidence: 100 },
    ];

    const result = spatialGridService.reconstructSpatialDocument(elements, 1, 800, 600);
    expect(result.tables.length).toBe(1);
    expect(result.tables[0].rowCount).toBe(2);
    expect(result.tables[0].columnCount).toBeGreaterThanOrEqual(1);
  });

  it('infers borderless spatial grid directly from element coordinates and whitespace', () => {
    const elements: ExtractedElement[] = [
      { id: '1', page: 1, text: 'Budget Head', rawText: 'Budget Head', x: 40, y: 50, width: 80, height: 14, bbox: [40, 50, 120, 64], source: 'ocr', confidence: 95 },
      { id: '2', page: 1, text: 'Description', rawText: 'Description', x: 200, y: 50, width: 90, height: 14, bbox: [200, 50, 290, 64], source: 'ocr', confidence: 95 },
      { id: '3', page: 1, text: 'Expenditure', rawText: 'Expenditure', x: 400, y: 50, width: 80, height: 14, bbox: [400, 50, 480, 64], source: 'ocr', confidence: 95 },

      { id: '4', page: 1, text: '0102', rawText: '0102', x: 40, y: 80, width: 40, height: 14, bbox: [40, 80, 80, 94], source: 'ocr', confidence: 95 },
      { id: '5', page: 1, text: 'Fodder Expense', rawText: 'Fodder Expense', x: 200, y: 80, width: 100, height: 14, bbox: [200, 80, 300, 94], source: 'ocr', confidence: 95 },
      { id: '6', page: 1, text: '₹ 12,500.00', rawText: '₹ 12,500.00', x: 400, y: 80, width: 70, height: 14, bbox: [400, 80, 470, 94], source: 'ocr', confidence: 95 },
    ];

    const inferredTable = spatialGridService.inferSpatialGridFromCoordinates(elements, 1, 600, 400);
    expect(inferredTable).toBeDefined();
    expect(inferredTable.rowCount).toBe(2);
    expect(inferredTable.columnCount).toBe(3);
    expect(inferredTable.hasBorders).toBe(false); // Borderless inference
    expect(inferredTable.rows[1].cells[2].data.type).toBe('currency');
    expect(inferredTable.rows[1].cells[2].data.normalizedValue).toBe(12500);
  });

  it('creates an empty editable starter table for manual creation', () => {
    const manualTable = spatialGridService.createEmptyTable(1, 800, 600, 4, 3);
    expect(manualTable.rowCount).toBe(4);
    expect(manualTable.columnCount).toBe(3);
    expect(manualTable.columns.length).toBe(3);
    expect(manualTable.rows[0].cells[0].isHeader).toBe(true);
  });
});

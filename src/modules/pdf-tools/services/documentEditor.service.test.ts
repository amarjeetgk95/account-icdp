import { describe, it, expect } from 'vitest';
import { documentEditorService } from './documentEditor.service';
import { SAMPLE_ENGLISH_PAYBILL_DOC } from '../utils/sampleDocuments';

describe('DocumentEditorService', () => {
  it('updates cell text, preserves originalText, recalculates normalized value, and marks as manual', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const targetCellId = doc.pages[0].tables[0].rows[1].cells[4].id; // Basic Pay cell

    const updated = documentEditorService.updateCell(doc, targetCellId, '120000');
    const found = documentEditorService.findCell(updated, targetCellId);

    expect(found).not.toBeNull();
    expect(found?.cell.text).toBe('120000');
    expect(found?.cell.originalText).toBe('105600');
    expect(found?.cell.data.normalizedValue).toBe(120000);
    expect(found?.cell.data.type).toBe('currency');
    expect(found?.cell.isModified).toBe(true);
    expect(found?.cell.source).toBe('manual');
    expect(found?.cell.confidence).toBe(100);
  });

  it('changes cell data type to date, percentage, or currency', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const targetCellId = doc.pages[0].tables[0].rows[1].cells[2].id; // Employee Name cell

    const updated = documentEditorService.changeCellType(doc, targetCellId, 'currency');
    const found = documentEditorService.findCell(updated, targetCellId);

    expect(found?.cell.data.type).toBe('currency');
    expect(found?.cell.isModified).toBe(true);
  });

  it('locks and unlocks cells and protects locked cells in lockAllVerified', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const cellId = doc.pages[0].tables[0].rows[1].cells[4].id;

    const lockedDoc = documentEditorService.toggleCellLock(doc, cellId, true);
    const foundLocked = documentEditorService.findCell(lockedDoc, cellId);
    expect(foundLocked?.cell.locked).toBe(true);

    const verifiedDoc = documentEditorService.lockAllVerified(doc, 95);
    const foundVerified = documentEditorService.findCell(verifiedDoc, cellId);
    expect(foundVerified?.cell.locked).toBe(true);
  });

  it('adds and deletes rows correctly', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const tableId = doc.pages[0].tables[0].id;
    const initialRowCount = doc.pages[0].tables[0].rowCount;

    const withRow = documentEditorService.addRow(doc, tableId, 1, 'below');
    expect(withRow.pages[0].tables[0].rowCount).toBe(initialRowCount + 1);
    expect(withRow.pages[0].tables[0].rows.length).toBe(initialRowCount + 1);
    expect(withRow.pages[0].tables[0].rows[2].cells.length).toBe(10);

    const afterDelete = documentEditorService.deleteRow(withRow, tableId, 2);
    expect(afterDelete.pages[0].tables[0].rowCount).toBe(initialRowCount);
  });

  it('moves rows up and down in table', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const tableId = doc.pages[0].tables[0].id;
    const row1Text = doc.pages[0].tables[0].rows[1].cells[2].text;

    const moved = documentEditorService.moveRow(doc, tableId, 1, 2);
    expect(moved.pages[0].tables[0].rows[2].cells[2].text).toBe(row1Text);
  });

  it('adds and deletes columns correctly', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const tableId = doc.pages[0].tables[0].id;
    const initialColCount = doc.pages[0].tables[0].columnCount;

    const withCol = documentEditorService.addColumn(doc, tableId, 1, 'right', 'Bonus');
    expect(withCol.pages[0].tables[0].columnCount).toBe(initialColCount + 1);
    expect(withCol.pages[0].tables[0].columns[2].headerText).toBe('Bonus');
    expect(withCol.pages[0].tables[0].rows[0].cells[2].text).toBe('Bonus');

    const afterDelete = documentEditorService.deleteColumn(withCol, tableId, 2);
    expect(afterDelete.pages[0].tables[0].columnCount).toBe(initialColCount);
  });

  it('merges adjacent cells and splits them back', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const tableId = doc.pages[0].tables[0].id;

    // Merge Row 1, Col 1 to Col 2
    const merged = documentEditorService.mergeCells(doc, tableId, 1, 1, 1, 2);
    const targetCell = merged.pages[0].tables[0].rows[1].cells[1];
    expect(targetCell.columnSpan).toBe(2);
    expect(targetCell.isMerged).toBe(true);

    const split = documentEditorService.splitCell(merged, targetCell.id);
    const splitCell = split.pages[0].tables[0].rows[1].cells[1];
    expect(splitCell.columnSpan).toBe(1);
    expect(splitCell.isMerged).toBe(false);
  });

  it('performs document-wide search and replace respecting locked cells', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const cellId = doc.pages[0].tables[0].rows[1].cells[2].id;

    // Search and replace "Shri. A. K. Rathod" -> "Shri A. K. Rathod (Modified)"
    const { document: replacedDoc, result } = documentEditorService.searchAndReplace(doc, {
      searchQuery: 'Shri. A. K. Rathod',
      replaceQuery: 'Shri A. K. Rathod (Modified)',
      scope: 'all_pages',
    });

    expect(result.replacementsMade).toBe(1);
    const found = documentEditorService.findCell(replacedDoc, cellId);
    expect(found?.cell.text).toBe('Shri A. K. Rathod (Modified)');
    expect(found?.cell.isModified).toBe(true);
  });

  it('re-OCRs a cropped region without overwriting locked cells', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const targetCell = doc.pages[0].tables[0].rows[1].cells[4];
    const cropBbox = targetCell.bbox;

    // First lock the cell
    const lockedDoc = documentEditorService.toggleCellLock(doc, targetCell.id, true);

    // Try to re-OCR the region
    const newEls = [
      {
        id: 'new-el-1',
        page: 1,
        text: '999999',
        rawText: '999999',
        x: cropBbox[0],
        y: cropBbox[1],
        width: 40,
        height: 15,
        bbox: cropBbox,
        source: 'paddle-ocr' as const,
        confidence: 99,
      },
    ];

    const reOcrDoc = documentEditorService.reOcrRegion(lockedDoc, 1, cropBbox, newEls);
    const found = documentEditorService.findCell(reOcrDoc, targetCell.id);

    // Locked cell must remain untouched!
    expect(found?.cell.text).toBe('105600');
  });

  it('updates, adds, and deletes paragraphs for Word document editing', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    
    // Add a new paragraph
    const withPara = documentEditorService.addParagraph(doc, 1, undefined, 'Test paragraph line', false);
    const addedPara = withPara.pages[0].paragraphs.find((p) => p.text === 'Test paragraph line');
    expect(addedPara).toBeDefined();

    // Update paragraph text and set heading
    const updatedParaDoc = documentEditorService.updateParagraph(
      withPara,
      1,
      addedPara!.id,
      'Updated Heading Line',
      true
    );
    const foundUpdated = updatedParaDoc.pages[0].paragraphs.find((p) => p.id === addedPara!.id);
    expect(foundUpdated?.text).toBe('Updated Heading Line');
    expect(foundUpdated?.isHeading).toBe(true);

    // Delete paragraph
    const deletedDoc = documentEditorService.deleteParagraph(updatedParaDoc, 1, addedPara!.id);
    const foundDeleted = deletedDoc.pages[0].paragraphs.find((p) => p.id === addedPara!.id);
    expect(foundDeleted).toBeUndefined();
  });

  it('updates full page text and regenerates paragraphs', () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const newText = 'GOVERNMENT OF GUJARAT\nFINANCE DEPARTMENT\nPay Bill for Month of March 2026';
    
    const updated = documentEditorService.updatePageFullText(doc, 1, newText);
    expect(updated.pages[0].rawText).toBe(newText);
    expect(updated.pages[0].paragraphs.length).toBe(3);
    expect(updated.pages[0].paragraphs[0].text).toBe('GOVERNMENT OF GUJARAT');
  });
});


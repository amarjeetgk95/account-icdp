import { describe, it, expect, beforeEach } from 'vitest';
import { historyService } from './history.service';
import { documentEditorService } from './documentEditor.service';
import { SAMPLE_ENGLISH_PAYBILL_DOC } from '../utils/sampleDocuments';

describe('HistoryService', () => {
  beforeEach(() => {
    historyService.clear();
  });

  it('manages undo and redo stacks correctly', () => {
    const doc0 = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const cellId = doc0.pages[0].tables[0].rows[1].cells[4].id;

    // Mutation 1
    const doc1 = documentEditorService.updateCell(doc0, cellId, '110000');
    historyService.push('EDIT_CELL', 'Change to 110000', doc0);

    expect(historyService.canUndo()).toBe(true);
    expect(historyService.canRedo()).toBe(false);

    // Undo
    const undoRes = historyService.undo(doc1);
    expect(undoRes).not.toBeNull();
    const cellAfterUndo = documentEditorService.findCell(undoRes!.document, cellId);
    expect(cellAfterUndo?.cell.text).toBe('105600');
    expect(historyService.canRedo()).toBe(true);

    // Redo
    const redoRes = historyService.redo(undoRes!.document);
    expect(redoRes).not.toBeNull();
    const cellAfterRedo = documentEditorService.findCell(redoRes!.document, cellId);
    expect(cellAfterRedo?.cell.text).toBe('110000');
  });
});

import { describe, it, expect } from 'vitest';
import { projectPersistenceService } from './projectPersistence.service';
import { SAMPLE_ENGLISH_PAYBILL_DOC } from '../utils/sampleDocuments';
import { documentEditorService } from './documentEditor.service';

describe('ProjectPersistenceService', () => {
  it('exports and restores document state accurately from JSON', async () => {
    const doc = documentEditorService.cloneDocument(SAMPLE_ENGLISH_PAYBILL_DOC);
    const cellId = doc.pages[0].tables[0].rows[1].cells[4].id;

    // Modify and lock a cell
    const modifiedDoc = documentEditorService.updateCell(doc, cellId, '125000');
    const lockedDoc = documentEditorService.toggleCellLock(modifiedDoc, cellId, true);

    const blob = projectPersistenceService.exportProject(lockedDoc);
    expect(blob.size).toBeGreaterThan(100);

    const jsonText = projectPersistenceService.serializeProject(lockedDoc);
    const restoredDoc = await projectPersistenceService.importProject(jsonText);

    expect(restoredDoc.pageCount).toBe(1);
    expect(restoredDoc.pages.length).toBe(1);
    expect(restoredDoc.consolidatedTables.length).toBe(1);

    const found = documentEditorService.findCell(restoredDoc, cellId);
    expect(found?.cell.text).toBe('125000');
    expect(found?.cell.locked).toBe(true);
    expect(found?.cell.isModified).toBe(true);
  });
});

import type {
  HistoryActionType,
  HistoryEntry,
  SpatialDocument,
} from '../types/spatial.types';
import { documentEditorService } from './documentEditor.service';

export class HistoryService {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private maxHistorySize = 40;

  /**
   * Push a new state snapshot to the history stack
   */
  push(action: HistoryActionType, description: string, currentDoc: SpatialDocument): void {
    const snapshot = documentEditorService.cloneDocument(currentDoc);
    this.past.push({
      action,
      description,
      timestamp: Date.now(),
      snapshot,
    });

    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }

    // Clear future redo stack on new modification
    this.future = [];
  }

  /**
   * Undo the last action and return the previous document state
   */
  undo(currentDoc: SpatialDocument): { document: SpatialDocument; entry: HistoryEntry } | null {
    if (this.past.length === 0) return null;

    const previousEntry = this.past.pop()!;
    const currentSnapshot = documentEditorService.cloneDocument(currentDoc);

    this.future.push({
      action: previousEntry.action,
      description: previousEntry.description,
      timestamp: Date.now(),
      snapshot: currentSnapshot,
    });

    return {
      document: previousEntry.snapshot,
      entry: previousEntry,
    };
  }

  /**
   * Redo the last undone action and return the restored document state
   */
  redo(currentDoc: SpatialDocument): { document: SpatialDocument; entry: HistoryEntry } | null {
    if (this.future.length === 0) return null;

    const nextEntry = this.future.pop()!;
    const currentSnapshot = documentEditorService.cloneDocument(currentDoc);

    this.past.push({
      action: nextEntry.action,
      description: nextEntry.description,
      timestamp: Date.now(),
      snapshot: currentSnapshot,
    });

    return {
      document: nextEntry.snapshot,
      entry: nextEntry,
    };
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getUndoDescription(): string | null {
    return this.past.length > 0 ? this.past[this.past.length - 1].description : null;
  }

  getRedoDescription(): string | null {
    return this.future.length > 0 ? this.future[this.future.length - 1].description : null;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

export const historyService = new HistoryService();

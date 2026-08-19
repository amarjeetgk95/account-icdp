import type {
  DataType,
  BoundingBox,
  ExtractedElement,
  SearchReplaceOptions,
  SearchReplaceResult,
  SpatialCell,
  SpatialColumn,
  SpatialDocument,
  SpatialPage,
  SpatialParagraph,
  SpatialRow,
  SpatialTable,
} from '../types/spatial.types';
import { dataNormalizationService } from './dataNormalization.service';
import { spatialGridService } from './spatialGrid.service';

export class DocumentEditorService {
  /**
   * Deep clone a SpatialDocument to ensure immutability for history/snapshots
   */
  cloneDocument(doc: SpatialDocument): SpatialDocument {
    return {
      ...doc,
      pages: doc.pages.map((p) => this.clonePage(p)),
      consolidatedTables: doc.consolidatedTables.map((t) => this.cloneTable(t)),
    };
  }

  clonePage(page: SpatialPage): SpatialPage {
    return {
      ...page,
      elements: page.elements.map((e) => ({ ...e, bbox: [...e.bbox] as BoundingBox })),
      tables: page.tables.map((t) => this.cloneTable(t)),
      paragraphs: page.paragraphs.map((p) => ({
        ...p,
        bbox: [...p.bbox] as BoundingBox,
        elements: p.elements.map((e) => ({ ...e })),
      })),
    };
  }

  cloneTable(table: SpatialTable): SpatialTable {
    const clonedRows = table.rows.map((row) => ({
      ...row,
      bbox: [...row.bbox] as BoundingBox,
      cells: row.cells.map((cell) => ({
        ...cell,
        bbox: [...cell.bbox] as BoundingBox,
        data: { ...cell.data },
        elements: cell.elements.map((e) => ({ ...e })),
      })),
    }));

    return {
      ...table,
      bbox: [...table.bbox] as BoundingBox,
      columns: table.columns.map((col) => ({ ...col })),
      rows: clonedRows,
      cells: clonedRows.map((r) => r.cells),
    };
  }

  /**
   * Find a cell across all pages and tables by its unique ID
   */
  findCell(
    doc: SpatialDocument,
    cellId: string
  ): { cell: SpatialCell; row: SpatialRow; table: SpatialTable; page: SpatialPage } | null {
    for (const page of doc.pages) {
      for (const table of page.tables) {
        for (const row of table.rows) {
          for (const cell of row.cells) {
            if (cell.id === cellId) {
              return { cell, row, table, page };
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Update cell text and recalculate its normalized value and data type.
   * Preserves originalText for auditing and marks as manual edit.
   */
  updateCell(
    doc: SpatialDocument,
    cellId: string,
    newText: string,
    forcedType?: DataType
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const found = this.findCell(nextDoc, cellId);
    if (!found) return nextDoc;

    const { cell } = found;

    if (cell.originalText === undefined) {
      cell.originalText = cell.text;
    }

    cell.text = newText;
    cell.isModified = true;
    cell.source = 'manual';
    cell.confidence = 100;

    const previousType = cell.data?.type;
    // Normalize value
    const normalized = dataNormalizationService.normalize(newText, 100);
    if (forcedType && forcedType !== 'empty') {
      normalized.type = forcedType;
      if (forcedType === 'currency' && typeof normalized.normalizedValue === 'number') {
        normalized.currencySymbol = '₹';
      }
    } else if (
      previousType === 'currency' &&
      (normalized.type === 'number' || normalized.type === 'currency')
    ) {
      normalized.type = 'currency';
      normalized.currencySymbol = '₹';
    }

    cell.data = normalized;
    cell.align =
      normalized.type === 'number' || normalized.type === 'currency' ? 'right' : 'left';

    // Synchronize cell elements
    for (const el of cell.elements) {
      el.text = newText;
      el.currentValue = newText;
      el.source = 'manual';
      el.confidence = 100;
    }

    // Update consolidatedTables reference
    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Explicitly change the data type of a cell (e.g. text -> currency)
   */
  changeCellType(doc: SpatialDocument, cellId: string, newType: DataType): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const found = this.findCell(nextDoc, cellId);
    if (!found) return nextDoc;

    const { cell } = found;
    cell.data.type = newType;
    if (newType === 'currency') {
      cell.data.currencySymbol = '₹';
      cell.align = 'right';
      if (typeof cell.data.normalizedValue !== 'number') {
        const parsed = parseFloat(cell.text.replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) cell.data.normalizedValue = parsed;
      }
    } else if (newType === 'number') {
      cell.align = 'right';
      if (typeof cell.data.normalizedValue !== 'number') {
        const parsed = parseFloat(cell.text.replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) cell.data.normalizedValue = parsed;
      }
    } else if (newType === 'text') {
      cell.align = 'left';
      cell.data.normalizedValue = cell.text;
    }

    cell.isModified = true;
    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Lock or unlock a cell to protect manual corrections from OCR overwrite
   */
  toggleCellLock(doc: SpatialDocument, cellId: string, forceLocked?: boolean): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const found = this.findCell(nextDoc, cellId);
    if (!found) return nextDoc;

    const { cell } = found;
    cell.locked = forceLocked !== undefined ? forceLocked : !cell.locked;

    for (const el of cell.elements) {
      el.locked = cell.locked;
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Lock all cells in the document that meet confidence threshold or have been modified
   */
  lockAllVerified(doc: SpatialDocument, minConfidence = 90): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      for (const table of page.tables) {
        for (const row of table.rows) {
          for (const cell of row.cells) {
            const conf = cell.confidence ?? cell.data?.confidence ?? 100;
            if (conf >= minConfidence || cell.isModified) {
              cell.locked = true;
              for (const el of cell.elements) {
                el.locked = true;
              }
            }
          }
        }
      }
    }
    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Add a new empty row above or below targetRowIndex in a table
   */
  addRow(
    doc: SpatialDocument,
    tableId: string,
    targetRowIndex: number,
    position: 'above' | 'below' = 'below'
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      const table = page.tables.find((t) => t.id === tableId);
      if (!table) continue;

      const insertIndex = position === 'above' ? targetRowIndex : targetRowIndex + 1;
      const refRow = table.rows[targetRowIndex] || table.rows[0];
      const newY0 = refRow ? refRow.bbox[3] + 2 : 100;
      const newY1 = newY0 + (refRow ? refRow.height : 24);

      const newCells: SpatialCell[] = table.columns.map((col, cIdx) => ({
        id: `cell-custom-p${page.pageNumber}-r${Date.now().toString(36)}-c${cIdx}`,
        pageNumber: page.pageNumber,
        rowIndex: insertIndex,
        columnIndex: cIdx,
        rowSpan: 1,
        columnSpan: 1,
        bbox: [col.x0, newY0, col.x1, newY1],
        elements: [],
        text: '',
        data: { rawText: '', normalizedValue: null, type: 'empty', confidence: 100 },
        isHeader: false,
        isSubHeader: false,
        isTotal: false,
        isMerged: false,
        align: 'left',
        source: 'manual',
      }));

      const newRow: SpatialRow = {
        rowIndex: insertIndex,
        cells: newCells,
        bbox: [
          Math.min(...table.columns.map((c) => c.x0)),
          newY0,
          Math.max(...table.columns.map((c) => c.x1)),
          newY1,
        ],
        isHeader: false,
        isTotal: false,
        baselineY: (newY0 + newY1) / 2,
        height: newY1 - newY0,
      };

      table.rows.splice(insertIndex, 0, newRow);

      // Reindex rows
      for (let r = 0; r < table.rows.length; r++) {
        table.rows[r].rowIndex = r;
        for (const c of table.rows[r].cells) {
          c.rowIndex = r;
        }
      }

      table.rowCount = table.rows.length;
      table.cells = table.rows.map((r) => r.cells);
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Delete a row from a table
   */
  deleteRow(doc: SpatialDocument, tableId: string, rowIndex: number): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      const table = page.tables.find((t) => t.id === tableId);
      if (!table || table.rows.length <= 1) continue;

      table.rows.splice(rowIndex, 1);

      // Reindex rows
      for (let r = 0; r < table.rows.length; r++) {
        table.rows[r].rowIndex = r;
        for (const c of table.rows[r].cells) {
          c.rowIndex = r;
        }
      }

      table.rowCount = table.rows.length;
      table.cells = table.rows.map((r) => r.cells);
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Move row up or down in a table
   */
  moveRow(
    doc: SpatialDocument,
    tableId: string,
    fromIndex: number,
    toIndex: number
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      const table = page.tables.find((t) => t.id === tableId);
      if (!table) continue;
      if (toIndex < 0 || toIndex >= table.rows.length) continue;

      const [moved] = table.rows.splice(fromIndex, 1);
      table.rows.splice(toIndex, 0, moved);

      // Reindex rows
      for (let r = 0; r < table.rows.length; r++) {
        table.rows[r].rowIndex = r;
        for (const c of table.rows[r].cells) {
          c.rowIndex = r;
        }
      }

      table.cells = table.rows.map((r) => r.cells);
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Add a new column to a table
   */
  addColumn(
    doc: SpatialDocument,
    tableId: string,
    targetColIndex: number,
    position: 'left' | 'right' = 'right',
    headerText = 'New Column'
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      const table = page.tables.find((t) => t.id === tableId);
      if (!table) continue;

      const insertIndex = position === 'left' ? targetColIndex : targetColIndex + 1;
      const prevCol = table.columns[targetColIndex] || table.columns[0];
      const colWidth = prevCol ? prevCol.width : 100;
      const newX0 = prevCol ? prevCol.x1 : 50;
      const newX1 = newX0 + colWidth;

      const newCol: SpatialColumn = {
        columnIndex: insertIndex,
        x0: newX0,
        x1: newX1,
        width: colWidth,
        headerText,
        predominantType: 'text',
        align: 'left',
      };

      table.columns.splice(insertIndex, 0, newCol);

      // Add a cell to each row at insertIndex
      for (let r = 0; r < table.rows.length; r++) {
        const row = table.rows[r];
        const isHeader = r === 0;
        const text = isHeader ? headerText : '';

        const cell: SpatialCell = {
          id: `cell-custom-p${page.pageNumber}-r${r}-c${Date.now().toString(36)}`,
          pageNumber: page.pageNumber,
          rowIndex: r,
          columnIndex: insertIndex,
          rowSpan: 1,
          columnSpan: 1,
          bbox: [newX0, row.bbox[1], newX1, row.bbox[3]],
          elements: [],
          text,
          data: {
            rawText: text,
            normalizedValue: text || null,
            type: isHeader ? 'text' : 'empty',
            confidence: 100,
          },
          isHeader,
          isSubHeader: false,
          isTotal: false,
          isMerged: false,
          align: 'left',
          source: 'manual',
        };

        row.cells.splice(insertIndex, 0, cell);
      }

      // Reindex columns
      for (let c = 0; c < table.columns.length; c++) {
        table.columns[c].columnIndex = c;
      }
      for (const row of table.rows) {
        for (let c = 0; c < row.cells.length; c++) {
          row.cells[c].columnIndex = c;
        }
      }

      table.columnCount = table.columns.length;
      table.cells = table.rows.map((r) => r.cells);
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Delete a column from a table
   */
  deleteColumn(doc: SpatialDocument, tableId: string, colIndex: number): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      const table = page.tables.find((t) => t.id === tableId);
      if (!table || table.columns.length <= 1) continue;

      table.columns.splice(colIndex, 1);

      for (const row of table.rows) {
        row.cells.splice(colIndex, 1);
      }

      // Reindex columns
      for (let c = 0; c < table.columns.length; c++) {
        table.columns[c].columnIndex = c;
      }
      for (const row of table.rows) {
        for (let c = 0; c < row.cells.length; c++) {
          row.cells[c].columnIndex = c;
        }
      }

      table.columnCount = table.columns.length;
      table.cells = table.rows.map((r) => r.cells);
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Move column left or right
   */
  moveColumn(
    doc: SpatialDocument,
    tableId: string,
    fromIndex: number,
    toIndex: number
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      const table = page.tables.find((t) => t.id === tableId);
      if (!table) continue;
      if (toIndex < 0 || toIndex >= table.columns.length) continue;

      const [movedCol] = table.columns.splice(fromIndex, 1);
      table.columns.splice(toIndex, 0, movedCol);

      for (const row of table.rows) {
        const [movedCell] = row.cells.splice(fromIndex, 1);
        row.cells.splice(toIndex, 0, movedCell);
      }

      // Reindex
      for (let c = 0; c < table.columns.length; c++) {
        table.columns[c].columnIndex = c;
      }
      for (const row of table.rows) {
        for (let c = 0; c < row.cells.length; c++) {
          row.cells[c].columnIndex = c;
        }
      }

      table.cells = table.rows.map((r) => r.cells);
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Merge adjacent selected cells into a single merged cell
   */
  mergeCells(
    doc: SpatialDocument,
    tableId: string,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    for (const page of nextDoc.pages) {
      const table = page.tables.find((t) => t.id === tableId);
      if (!table) continue;

      const minR = Math.min(startRow, endRow);
      const maxR = Math.max(startRow, endRow);
      const minC = Math.min(startCol, endCol);
      const maxC = Math.max(startCol, endCol);

      const targetCell = table.rows[minR]?.cells[minC];
      if (!targetCell) continue;

      const rowSpan = maxR - minR + 1;
      const colSpan = maxC - minC + 1;

      // Concatenate non-empty text across merged area
      const textParts: string[] = [];
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cell = table.rows[r]?.cells[c];
          if (cell && cell.text.trim()) {
            textParts.push(cell.text.trim());
          }
        }
      }

      targetCell.rowSpan = rowSpan;
      targetCell.columnSpan = colSpan;
      targetCell.isMerged = true;
      targetCell.text = textParts.join(' ');
      targetCell.data = dataNormalizationService.normalize(targetCell.text, 100);

      // Mark covered cells
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (r === minR && c === minC) continue;
          const coveredCell = table.rows[r]?.cells[c];
          if (coveredCell) {
            coveredCell.isMerged = true;
            coveredCell.text = '';
            coveredCell.data = { rawText: '', normalizedValue: null, type: 'empty', confidence: 100 };
          }
        }
      }
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Split a previously merged cell back to 1x1
   */
  splitCell(doc: SpatialDocument, cellId: string): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const found = this.findCell(nextDoc, cellId);
    if (!found) return nextDoc;

    const { cell, table } = found;
    const origRowSpan = cell.rowSpan;
    const origColSpan = cell.columnSpan;

    cell.rowSpan = 1;
    cell.columnSpan = 1;
    cell.isMerged = false;

    // Reset covered cells
    for (let r = cell.rowIndex; r < cell.rowIndex + origRowSpan; r++) {
      for (let c = cell.columnIndex; c < cell.columnIndex + origColSpan; c++) {
        const covered = table.rows[r]?.cells[c];
        if (covered && covered.id !== cell.id) {
          covered.isMerged = false;
          covered.rowSpan = 1;
          covered.columnSpan = 1;
        }
      }
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Document-wide or scoped Search and Replace
   */
  searchAndReplace(doc: SpatialDocument, options: SearchReplaceOptions): {
    document: SpatialDocument;
    result: SearchReplaceResult;
  } {
    const nextDoc = this.cloneDocument(doc);
    const { searchQuery, replaceQuery, matchCase, exactMatch, scope, targetPageNumber, targetTableId } = options;

    if (!searchQuery) {
      return {
        document: nextDoc,
        result: { matchesFound: 0, replacementsMade: 0, modifiedCellIds: [] },
      };
    }

    let matchesFound = 0;
    let replacementsMade = 0;
    const modifiedCellIds: string[] = [];

    const flags = matchCase ? 'g' : 'gi';
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = exactMatch ? new RegExp(`^${escaped}$`, flags) : new RegExp(escaped, flags);

    for (const page of nextDoc.pages) {
      if (scope === 'current_page' && targetPageNumber !== undefined && page.pageNumber !== targetPageNumber) {
        continue;
      }

      for (const table of page.tables) {
        if (scope === 'current_table' && targetTableId !== undefined && table.id !== targetTableId) {
          continue;
        }

        for (const row of table.rows) {
          for (const cell of row.cells) {
            if (cell.locked) continue; // Respect locked cells

            if (regex.test(cell.text)) {
              matchesFound++;
              const newText = cell.text.replace(regex, replaceQuery);
              if (newText !== cell.text) {
                if (cell.originalText === undefined) {
                  cell.originalText = cell.text;
                }
                cell.text = newText;
                cell.data = dataNormalizationService.normalize(newText, cell.confidence);
                cell.isModified = true;
                cell.source = 'manual';
                modifiedCellIds.push(cell.id);
                replacementsMade++;
              }
            }
          }
        }
      }
    }

    this.refreshConsolidatedTables(nextDoc);
    return {
      document: nextDoc,
      result: { matchesFound, replacementsMade, modifiedCellIds },
    };
  }

  /**
   * Re-OCR a specific cropped bounding box region on a page.
   * Replaces elements in that box and updates intersecting cells without modifying locked cells.
   */
  reOcrRegion(
    doc: SpatialDocument,
    pageNumber: number,
    cropBbox: BoundingBox,
    newElements: ExtractedElement[]
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const page = nextDoc.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return nextDoc;

    const [cx0, cy0, cx1, cy1] = cropBbox;

    // Filter out previous non-locked elements in this box
    page.elements = page.elements.filter((el) => {
      if (el.locked) return true;
      const isInside =
        el.bbox[0] >= cx0 - 5 &&
        el.bbox[2] <= cx1 + 5 &&
        el.bbox[1] >= cy0 - 5 &&
        el.bbox[3] <= cy1 + 5;
      return !isInside;
    });

    // Add new elements
    page.elements.push(...newElements);

    // Update intersecting cells in tables
    for (const table of page.tables) {
      for (const row of table.rows) {
        for (const cell of row.cells) {
          if (cell.locked) continue;

          // Check if cell intersects with crop bbox
          const cellIntersects =
            cell.bbox[0] < cx1 && cell.bbox[2] > cx0 && cell.bbox[1] < cy1 && cell.bbox[3] > cy0;

          if (cellIntersects) {
            // Find elements belonging to this cell
            const cellEls = page.elements.filter(
              (e) =>
                e.bbox[0] >= cell.bbox[0] - 5 &&
                e.bbox[2] <= cell.bbox[2] + 5 &&
                e.bbox[1] >= cell.bbox[1] - 5 &&
                e.bbox[3] <= cell.bbox[3] + 5
            );

            if (cellEls.length > 0) {
              const combinedText = cellEls.map((e) => e.text).join(' ');
              cell.elements = cellEls;
              cell.text = combinedText;
              cell.data = dataNormalizationService.normalize(combinedText, cell.confidence);
              cell.isModified = true;
            }
          }
        }
      }
    }

    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Automatically infer spatial grid from document coordinates and whitespace gutters
   */
  inferSpatialGrid(doc: SpatialDocument, pageNumber?: number): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);

    for (const page of nextDoc.pages) {
      if (pageNumber !== undefined && page.pageNumber !== pageNumber) continue;
      if (page.elements.length > 0) {
        const inferredTable = spatialGridService.inferSpatialGridFromCoordinates(
          page.elements,
          page.pageNumber,
          page.width,
          page.height
        );
        page.tables = [inferredTable];
      }
    }
    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Create an initial blank editable table for manual table composition
   */
  createManualTable(
    doc: SpatialDocument,
    pageNumber?: number,
    rows = 5,
    cols = 4
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);

    for (const page of nextDoc.pages) {
      if (pageNumber !== undefined && page.pageNumber !== pageNumber) continue;
      const manualTable = spatialGridService.createEmptyTable(
        page.pageNumber,
        page.width,
        page.height,
        rows,
        cols
      );
      page.tables = [manualTable];
    }
    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Automatically generate a spreadsheet grid from document elements/lines if no table exists
   */
  generateGridFromDocument(doc: SpatialDocument, pageNumber?: number): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);

    for (const page of nextDoc.pages) {
      if (pageNumber !== undefined && page.pageNumber !== pageNumber) continue;
      if (page.tables.length === 0 && page.elements.length > 0) {
        const inferredTable = spatialGridService.inferSpatialGridFromCoordinates(
          page.elements,
          page.pageNumber,
          page.width,
          page.height
        );
        page.tables = [inferredTable];
      }
    }
    this.refreshConsolidatedTables(nextDoc);
    return nextDoc;
  }

  /**
   * Update paragraph text and heading state
   */
  updateParagraph(
    doc: SpatialDocument,
    pageNumber: number,
    paragraphId: string,
    newText: string,
    isHeading?: boolean
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const page = nextDoc.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return nextDoc;

    const para = page.paragraphs.find((p) => p.id === paragraphId);
    if (para) {
      para.text = newText;
      if (isHeading !== undefined) {
        para.isHeading = isHeading;
      }
    }

    this.refreshAllText(nextDoc);
    return nextDoc;
  }

  /**
   * Add a new paragraph to a page
   */
  addParagraph(
    doc: SpatialDocument,
    pageNumber: number,
    targetIndex?: number,
    text = '',
    isHeading = false
  ): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const page = nextDoc.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return nextDoc;

    const newPara: SpatialParagraph = {
      id: `p-${pageNumber}-${Date.now().toString(36)}`,
      text,
      isHeading,
      confidence: 100,
      bbox: [40, 100, 500, 120],
      elements: [],
    };

    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= page.paragraphs.length) {
      page.paragraphs.splice(targetIndex, 0, newPara);
    } else {
      page.paragraphs.push(newPara);
    }

    this.refreshAllText(nextDoc);
    return nextDoc;
  }

  /**
   * Delete a paragraph from a page
   */
  deleteParagraph(doc: SpatialDocument, pageNumber: number, paragraphId: string): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const page = nextDoc.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return nextDoc;

    page.paragraphs = page.paragraphs.filter((p) => p.id !== paragraphId);
    this.refreshAllText(nextDoc);
    return nextDoc;
  }

  /**
   * Update full text of a page and regenerate paragraphs accordingly
   */
  updatePageFullText(doc: SpatialDocument, pageNumber: number, newFullText: string): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    const page = nextDoc.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return nextDoc;

    page.rawText = newFullText;
    const lines = newFullText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    page.paragraphs = lines.map((line, idx) => ({
      id: `p-${pageNumber}-${idx}-${Date.now().toString(36)}`,
      text: line,
      isHeading: line.length < 60 && (line.startsWith('#') || /^[A-Z0-9\s.:\-–—/]+$/.test(line)),
      confidence: 100,
      bbox: [40, 40 + idx * 24, 500, 60 + idx * 24],
      elements: [],
    }));

    this.refreshAllText(nextDoc);
    return nextDoc;
  }

  /**
   * Update document title / filename
   */
  updateDocumentTitle(doc: SpatialDocument, newTitle: string): SpatialDocument {
    const nextDoc = this.cloneDocument(doc);
    nextDoc.fileName = newTitle;
    return nextDoc;
  }

  /**
   * Paste TSV data into table starting from a given row and column
   */
  pasteTsv(
    doc: SpatialDocument,
    tableId: string,
    startRowIndex = 0,
    startColIndex = 0,
    tsvText: string
  ): SpatialDocument {
    let currentDoc = this.cloneDocument(doc);
    if (!tsvText || !tsvText.trim()) return currentDoc;

    const tsvRows = tsvText
      .trim()
      .split(/\r?\n/)
      .map((r) => r.split('\t'));

    if (tsvRows.length === 0) return currentDoc;

    const reqRows = startRowIndex + tsvRows.length;
    const maxColsInTsv = Math.max(...tsvRows.map((r) => r.length));
    const reqCols = startColIndex + maxColsInTsv;

    // Find table
    let table = currentDoc.consolidatedTables.find((t) => t.id === tableId);
    if (!table) {
      currentDoc = this.createManualTable(currentDoc, 1, Math.max(5, reqRows), Math.max(4, reqCols));
      table = currentDoc.consolidatedTables[0];
    }

    // Expand rows if needed
    while (table.rowCount < reqRows) {
      currentDoc = this.addRow(currentDoc, table.id, table.rowCount - 1, 'below');
      table = currentDoc.consolidatedTables.find((t) => t.id === tableId)!;
    }

    // Expand columns if needed
    while (table.columnCount < reqCols) {
      currentDoc = this.addColumn(currentDoc, table.id, table.columnCount - 1, 'right');
      table = currentDoc.consolidatedTables.find((t) => t.id === tableId)!;
    }

    // Update cells
    for (let r = 0; r < tsvRows.length; r++) {
      const rowData = tsvRows[r];
      const targetR = startRowIndex + r;
      for (let c = 0; c < rowData.length; c++) {
        const targetC = startColIndex + c;
        const textVal = rowData[c];
        const cell = table.rows[targetR]?.cells[targetC];
        if (cell && !cell.locked) {
          currentDoc = this.updateCell(currentDoc, cell.id, textVal);
          table = currentDoc.consolidatedTables.find((t) => t.id === tableId)!;
        }
      }
    }

    return currentDoc;
  }


  private refreshAllText(doc: SpatialDocument): void {
    doc.allText = doc.pages
      .map((p) => p.paragraphs.map((para) => para.text).join('\n\n'))
      .join('\n\n--- Page Break ---\n\n');
  }

  private refreshConsolidatedTables(doc: SpatialDocument): void {
    doc.consolidatedTables = doc.pages.flatMap((p) => p.tables);
  }
}

export const documentEditorService = new DocumentEditorService();


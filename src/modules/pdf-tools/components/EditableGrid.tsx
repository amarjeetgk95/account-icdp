import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Split,
  History,
  HelpCircle,
  Sparkles,
  TableProperties,
  Eye,
} from 'lucide-react';
import type {
  DataType,
  SpatialCell,
  SpatialDocument,
} from '../types/spatial.types';

interface EditableGridProps {
  document: SpatialDocument;
  selectedTableId?: string;
  selectedCellId?: string | null;
  onSelectCell?: (cellId: string | null) => void;
  onHoverCell?: (cellId: string | null) => void;
  onUpdateCell: (cellId: string, newText: string, forcedType?: DataType) => void;
  onChangeCellType: (cellId: string, newType: DataType) => void;
  onToggleLock: (cellId: string) => void;
  onAddRow: (tableId: string, rowIndex: number, position: 'above' | 'below') => void;
  onDeleteRow: (tableId: string, rowIndex: number) => void;
  onMoveRow: (tableId: string, fromIndex: number, toIndex: number) => void;
  onAddColumn: (tableId: string, colIndex: number, position: 'left' | 'right') => void;
  onDeleteColumn: (tableId: string, colIndex: number) => void;
  onMoveColumn: (tableId: string, fromIndex: number, toIndex: number) => void;
  onMergeCells?: (tableId: string, sRow: number, sCol: number, eRow: number, eCol: number) => void;
  onSplitCell: (cellId: string) => void;
  onGenerateSpatialGrid?: () => void;
  onCreateTableManually?: () => void;
  onViewRawExtraction?: () => void;
  onForceOcr?: () => void;
  onGenerateGrid?: () => void;
}

export const EditableGrid: React.FC<EditableGridProps> = ({
  document: doc,
  selectedTableId,
  selectedCellId,
  onSelectCell,
  onHoverCell,
  onUpdateCell,
  onChangeCellType,
  onToggleLock,
  onAddRow,
  onDeleteRow,
  onMoveRow,
  onAddColumn,
  onDeleteColumn,
  onMoveColumn,
  onSplitCell,
  onGenerateSpatialGrid,
  onCreateTableManually,
  onViewRawExtraction,
  onGenerateGrid,
}) => {
  // Find current active table
  const allTables = doc.consolidatedTables;
  const activeTable =
    allTables.find((t) => t.id === selectedTableId) || allTables[0] || null;

  // Editing state
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing begins
  useEffect(() => {
    if (editingCellId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCellId]);

  // Find currently selected cell object
  let currentSelectedCell: SpatialCell | null = null;
  if (selectedCellId && activeTable) {
    for (const row of activeTable.rows) {
      for (const cell of row.cells) {
        if (cell.id === selectedCellId) {
          currentSelectedCell = cell;
          break;
        }
      }
    }
  }

  // Double click or keyboard to trigger edit
  const startEditing = (cell: SpatialCell) => {
    setEditingCellId(cell.id);
    setEditValue(cell.text || '');
    onSelectCell?.(cell.id);
  };

  const commitEdit = (cellId: string, nextCellNav?: 'next' | 'prev' | 'down') => {
    if (editingCellId === cellId) {
      onUpdateCell(cellId, editValue);
      setEditingCellId(null);

      if (nextCellNav && activeTable) {
        navigateCell(cellId, nextCellNav);
      }
    }
  };

  const cancelEdit = () => {
    setEditingCellId(null);
  };

  const navigateCell = (currentId: string, direction: 'next' | 'prev' | 'down' | 'up') => {
    if (!activeTable) return;
    const flatCells = activeTable.rows.flatMap((r) => r.cells);
    const idx = flatCells.findIndex((c) => c.id === currentId);
    if (idx === -1) return;

    let targetIdx = idx;
    if (direction === 'next') targetIdx = Math.min(flatCells.length - 1, idx + 1);
    else if (direction === 'prev') targetIdx = Math.max(0, idx - 1);
    else if (direction === 'down') {
      const cell = flatCells[idx];
      const nextRow = activeTable.rows[cell.rowIndex + 1];
      if (nextRow && nextRow.cells[cell.columnIndex]) {
        targetIdx = flatCells.findIndex((c) => c.id === nextRow.cells[cell.columnIndex].id);
      }
    } else if (direction === 'up') {
      const cell = flatCells[idx];
      const prevRow = activeTable.rows[cell.rowIndex - 1];
      if (prevRow && prevRow.cells[cell.columnIndex]) {
        targetIdx = flatCells.findIndex((c) => c.id === prevRow.cells[cell.columnIndex].id);
      }
    }

    if (targetIdx >= 0 && flatCells[targetIdx]) {
      onSelectCell?.(flatCells[targetIdx].id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, cell: SpatialCell) => {
    if (editingCellId === cell.id) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit(cell.id, 'down');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit(cell.id, e.shiftKey ? 'prev' : 'next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    } else {
      if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault();
        startEditing(cell);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        navigateCell(cell.id, e.shiftKey ? 'prev' : 'next');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateCell(cell.id, 'next');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateCell(cell.id, 'prev');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateCell(cell.id, 'down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateCell(cell.id, 'up');
      } else if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        onToggleLock(cell.id);
      }
    }
  };

  if (!activeTable) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-600 space-y-5 max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
          <TableProperties className="w-7 h-7" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-base font-bold text-slate-800">
            No Structured Table Detected Automatically
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Text was extracted successfully, but the system could not reliably determine the table structure.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {(onGenerateSpatialGrid || onGenerateGrid) && (
            <button
              onClick={onGenerateSpatialGrid || onGenerateGrid}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Infer 2D rows, columns and cells from PDF coordinates and whitespace gutters directly"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Spatial Grid</span>
            </button>
          )}
          {onCreateTableManually && (
            <button
              onClick={onCreateTableManually}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Create a starter editable 2D table grid"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Create Table Manually</span>
            </button>
          )}
          {onViewRawExtraction && (
            <button
              onClick={onViewRawExtraction}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="View raw extracted text and coordinate bounding boxes"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>View Raw Extraction</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Contextual Cell & Table Action Bar */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Selected Cell Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {currentSelectedCell ? (
            <>
              <span className="font-mono font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[11px]">
                R{currentSelectedCell.rowIndex + 1}:C{currentSelectedCell.columnIndex + 1}
              </span>

              {/* Data Type Selector */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <span className="text-[11px] text-slate-400 pl-1">Type:</span>
                <select
                  value={currentSelectedCell.data.type}
                  onChange={(e) =>
                    onChangeCellType(currentSelectedCell!.id, e.target.value as DataType)
                  }
                  className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none pr-1 py-0.5 cursor-pointer"
                >
                  <option value="text">Text (Guj/Eng)</option>
                  <option value="currency">Currency (₹)</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="identifier">Budget / Code</option>
                  <option value="formula">Formula (=)</option>
                </select>
              </div>

              {/* Lock / Unlock Cell */}
              <button
                onClick={() => onToggleLock(currentSelectedCell!.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  currentSelectedCell.locked
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
                title={
                  currentSelectedCell.locked
                    ? 'Cell is Locked (Protected from OCR Refresh)'
                    : 'Lock cell to protect from reprocessing'
                }
              >
                {currentSelectedCell.locked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lock Cell</span>
                  </>
                )}
              </button>

              {/* Split Merged Cell */}
              {currentSelectedCell.isMerged && (
                <button
                  onClick={() => onSplitCell(currentSelectedCell!.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                  title="Split merged cell"
                >
                  <Split className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Split Cell</span>
                </button>
              )}

              {/* Row Operations */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() =>
                    onAddRow(activeTable.id, currentSelectedCell!.rowIndex, 'above')
                  }
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                  title="Insert Row Above"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Row Above
                </button>
                <button
                  onClick={() =>
                    onAddRow(activeTable.id, currentSelectedCell!.rowIndex, 'below')
                  }
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                  title="Insert Row Below"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Row Below
                </button>
                <button
                  onClick={() =>
                    onMoveRow(
                      activeTable.id,
                      currentSelectedCell!.rowIndex,
                      Math.max(0, currentSelectedCell!.rowIndex - 1)
                    )
                  }
                  disabled={currentSelectedCell.rowIndex === 0}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="Move Row Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onMoveRow(
                      activeTable.id,
                      currentSelectedCell!.rowIndex,
                      Math.min(activeTable.rowCount - 1, currentSelectedCell!.rowIndex + 1)
                    )
                  }
                  disabled={currentSelectedCell.rowIndex === activeTable.rowCount - 1}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="Move Row Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onDeleteRow(activeTable.id, currentSelectedCell!.rowIndex)
                  }
                  className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                  title="Delete Row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column Operations */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() =>
                    onAddColumn(activeTable.id, currentSelectedCell!.columnIndex, 'left')
                  }
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                  title="Insert Column Left"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" /> Col Left
                </button>
                <button
                  onClick={() =>
                    onAddColumn(activeTable.id, currentSelectedCell!.columnIndex, 'right')
                  }
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                  title="Insert Column Right"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" /> Col Right
                </button>
                <button
                  onClick={() =>
                    onMoveColumn(
                      activeTable.id,
                      currentSelectedCell!.columnIndex,
                      Math.max(0, currentSelectedCell!.columnIndex - 1)
                    )
                  }
                  disabled={currentSelectedCell.columnIndex === 0}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="Move Column Left"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onMoveColumn(
                      activeTable.id,
                      currentSelectedCell!.columnIndex,
                      Math.min(
                        activeTable.columnCount - 1,
                        currentSelectedCell!.columnIndex + 1
                      )
                    )
                  }
                  disabled={
                    currentSelectedCell.columnIndex === activeTable.columnCount - 1
                  }
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="Move Column Right"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onDeleteColumn(activeTable.id, currentSelectedCell!.columnIndex)
                  }
                  className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                  title="Delete Column"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <span className="text-slate-500 italic flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              Click any cell to edit, lock, or modify table structure (Double click to edit text).
            </span>
          )}
        </div>

        {/* Right: Table Info */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span>{activeTable.rowCount} Rows</span>
          <span>•</span>
          <span>{activeTable.columnCount} Cols</span>
        </div>
      </div>

      {/* Main Table Spreadsheet Container */}
      <div className="flex-1 overflow-auto p-4 select-none">
        <div className="border border-slate-300 rounded-lg overflow-hidden shadow-xs inline-block min-w-full">
          <table className="w-full text-xs border-collapse font-sans bg-white">
            <thead>
              {/* Column headers bar */}
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 font-mono text-[11px]">
                <th className="w-10 px-2 py-1.5 bg-slate-200/80 border-r border-slate-300 text-center font-bold">
                  #
                </th>
                {activeTable.columns.map((col, cIdx) => (
                  <th
                    key={cIdx}
                    className="px-3 py-1.5 border-r border-slate-300 text-left font-semibold"
                  >
                    <div className="flex items-center justify-between">
                      <span>{String.fromCharCode(65 + (cIdx % 26))}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {col.predominantType}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTable.rows.map((row, rIdx) => (
                <tr
                  key={`row-${rIdx}`}
                  className={`border-b border-slate-200 transition-colors ${
                    row.isHeader
                      ? 'bg-blue-900 text-white font-semibold'
                      : row.isTotal
                      ? 'bg-emerald-50 text-emerald-950 font-bold border-t-2 border-emerald-400'
                      : rIdx % 2 === 1
                      ? 'bg-slate-50/60 hover:bg-indigo-50/40'
                      : 'bg-white hover:bg-indigo-50/40'
                  }`}
                >
                  {/* Row Number Header */}
                  <td className="px-2 py-2 bg-slate-100 border-r border-slate-300 text-center font-mono text-[11px] text-slate-500 font-medium">
                    {rIdx + 1}
                  </td>

                  {/* Table Cells */}
                  {row.cells.map((cell, cIdx) => {
                    const isSelected = selectedCellId === cell.id;
                    const isEditing = editingCellId === cell.id;
                    const cellConf = cell.confidence ?? cell.data?.confidence ?? 100;
                    const isLowConfidence = cellConf < 80;

                    return (
                      <td
                        key={cell.id || `c-${rIdx}-${cIdx}`}
                        colSpan={cell.columnSpan || 1}
                        rowSpan={cell.rowSpan || 1}
                        tabIndex={0}
                        onClick={() => onSelectCell?.(cell.id)}
                        onDoubleClick={() => startEditing(cell)}
                        onKeyDown={(e) => handleKeyDown(e, cell)}
                        onMouseEnter={() => onHoverCell?.(cell.id)}
                        onMouseLeave={() => onHoverCell?.(null)}
                        className={`relative px-3 py-2 border-r border-slate-200 last:border-r-0 focus:outline-none transition-all ${
                          cell.align === 'right' ? 'text-right' : 'text-left'
                        } ${
                          isSelected
                            ? 'ring-2 ring-indigo-600 bg-indigo-50/90 z-10'
                            : ''
                        } ${
                          isLowConfidence && !row.isHeader
                            ? 'bg-amber-50/50'
                            : ''
                        }`}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(cell.id)}
                            className="w-full bg-white text-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          />
                        ) : (
                          <div className="flex items-center justify-between gap-1.5 min-h-[20px]">
                            {/* Formatted Cell Content */}
                            <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                              {cell.data.type === 'currency' &&
                              typeof cell.data.normalizedValue === 'number' ? (
                                <span className="font-mono font-medium">
                                  ₹{' '}
                                  {cell.data.normalizedValue.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              ) : cell.data.type === 'number' &&
                                typeof cell.data.normalizedValue === 'number' ? (
                                <span className="font-mono">
                                  {cell.data.normalizedValue.toLocaleString('en-IN')}
                                </span>
                              ) : cell.data.type === 'percentage' &&
                                typeof cell.data.normalizedValue === 'number' ? (
                                <span className="font-mono">
                                  {(cell.data.normalizedValue * 100).toFixed(1)}%
                                </span>
                              ) : (
                                <span>{cell.text || '—'}</span>
                              )}
                            </div>

                            {/* Cell Badges & Indicators */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Lock indicator */}
                              {cell.locked && (
                                <span title="Locked value">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                </span>
                              )}

                              {/* Manual edit audit indicator */}
                              {cell.isModified && (
                                <span
                                  className="inline-flex items-center text-[10px] text-blue-600 font-mono"
                                  title={`Original: "${cell.originalText}" → Current: "${cell.text}"`}
                                >
                                  <History className="w-3 h-3 text-blue-500" />
                                </span>
                              )}

                              {/* Low confidence warning pill */}
                              {isLowConfidence && !row.isHeader && (
                                <span
                                  className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-amber-200 text-amber-900"
                                  title={`Low OCR confidence: ${cellConf}%`}
                                >
                                  {cellConf}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

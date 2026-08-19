import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Lock,
  Unlock,
  Filter,
  Edit3,
} from 'lucide-react';
import type { SpatialCell, SpatialDocument } from '../types/spatial.types';

interface ConfidencePanelProps {
  document: SpatialDocument;
  isOpen: boolean;
  onClose: () => void;
  onSelectCell: (cellId: string, pageNumber: number) => void;
  onUpdateCell: (cellId: string, newText: string) => void;
  onToggleLock: (cellId: string) => void;
  selectedCellId?: string | null;
}

export const ConfidencePanel: React.FC<ConfidencePanelProps> = ({
  document: doc,
  isOpen,
  onClose,
  onSelectCell,
  onUpdateCell,
  onToggleLock,
  selectedCellId,
}) => {
  const [threshold, setThreshold] = useState<number>(80);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  if (!isOpen) return null;

  // Flatten all data cells across all pages and tables
  const lowConfidenceItems: Array<{
    cell: SpatialCell;
    pageNumber: number;
    tableIndex: number;
  }> = [];

  for (const page of doc.pages) {
    page.tables.forEach((table, tIdx) => {
      for (const row of table.rows) {
        if (row.isHeader) continue; // Skip header rows
        for (const cell of row.cells) {
          const conf = cell.confidence ?? cell.data?.confidence ?? 100;
          if (cell.text.trim().length > 0 && conf < threshold) {
            lowConfidenceItems.push({
              cell,
              pageNumber: page.pageNumber,
              tableIndex: tIdx + 1,
            });
          }
        }
      }
    });
  }

  // Sort lowest confidence first
  lowConfidenceItems.sort((a, b) => {
    const confA = a.cell.confidence ?? a.cell.data?.confidence ?? 100;
    const confB = b.cell.confidence ?? b.cell.data?.confidence ?? 100;
    return confA - confB;
  });

  const startEdit = (cell: SpatialCell) => {
    setEditingCellId(cell.id);
    setEditText(cell.text);
  };

  const saveEdit = (cellId: string) => {
    onUpdateCell(cellId, editText);
    setEditingCellId(null);
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-xs">Low Confidence Review</h4>
            <p className="text-[10px] text-slate-500">
              {lowConfidenceItems.length} item(s) below {threshold}% confidence
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Threshold Filter Selector */}
      <div className="p-2.5 border-b border-slate-200 flex items-center justify-between gap-1 text-xs bg-white">
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <Filter className="w-3 h-3 text-indigo-600" /> Threshold:
        </span>
        <div className="flex items-center gap-1">
          {[70, 80, 90].map((t) => (
            <button
              key={t}
              onClick={() => setThreshold(t)}
              className={`px-2 py-0.5 rounded font-mono font-medium text-xs transition-colors ${
                threshold === t
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              &lt; {t}%
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto p-2.5 space-y-2 divide-y divide-slate-100">
        {lowConfidenceItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="text-xs font-semibold text-slate-700">All Clear!</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No cells found with confidence below {threshold}%.
            </p>
          </div>
        ) : (
          lowConfidenceItems.map(({ cell, pageNumber, tableIndex }) => {
            const isSelected = selectedCellId === cell.id;
            const isEditing = editingCellId === cell.id;
            const cellConf = cell.confidence ?? cell.data?.confidence ?? 100;

            return (
              <div
                key={cell.id}
                onClick={() => onSelectCell(cell.id, pageNumber)}
                className={`pt-2 first:pt-0 cursor-pointer rounded-lg p-2 transition-all ${
                  isSelected
                    ? 'bg-indigo-50 border border-indigo-200 shadow-xs'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                {/* Location & Confidence Header */}
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono text-slate-600">
                    <span className="font-semibold">P{pageNumber}</span>
                    <span>•</span>
                    <span>T{tableIndex}</span>
                    <span>•</span>
                    <span className="bg-slate-100 px-1 rounded font-bold">
                      R{cell.rowIndex + 1}:C{cell.columnIndex + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        cellConf < 60
                          ? 'bg-red-100 text-red-800'
                          : cellConf < 75
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {cellConf}%
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(cell.id);
                      }}
                      className="p-0.5 text-slate-400 hover:text-amber-600 rounded"
                      title={cell.locked ? 'Unlock Cell' : 'Lock Cell'}
                    >
                      {cell.locked ? (
                        <Lock className="w-3 h-3 text-amber-600" />
                      ) : (
                        <Unlock className="w-3 h-3 text-slate-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Extracted Text vs Edit Mode */}
                {isEditing ? (
                  <div
                    className="flex items-center gap-1 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(cell.id);
                        if (e.key === 'Escape') setEditingCellId(null);
                      }}
                      className="flex-1 bg-white border border-indigo-500 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(cell.id)}
                      className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <div className="font-sans text-xs text-slate-800 font-medium truncate">
                      {cell.text || <span className="text-slate-400 italic">empty</span>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(cell);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-indigo-600 rounded"
                      title="Quick edit"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

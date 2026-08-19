import React, { useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Download,
  Upload,
  Undo2,
  Redo2,
  Search,
  Crop,
  Lock,
  Layers,
  AlertTriangle,
  Columns,
  Maximize,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import type {
  SpatialDocument,
  VisualDebugOptions,
} from '../types/spatial.types';

interface ExtractionToolbarProps {
  document: SpatialDocument;
  onExportExcel: () => void;
  onExportWord: () => void;
  onCopyTsv: () => void;
  copiedTsv: boolean;
  isExporting: boolean;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onForceOcr?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoDesc: string | null;
  redoDesc: string | null;
  onOpenSearchReplace: () => void;
  onToggleCropMode: () => void;
  isCropMode: boolean;
  onLockAllVerified: () => void;
  onToggleConfidencePanel: () => void;
  isConfidencePanelOpen: boolean;
  lowConfidenceCount: number;
  viewMode: 'split' | 'grid_only' | 'pdf_only';
  onChangeViewMode: (mode: 'split' | 'grid_only' | 'pdf_only') => void;
  debugOptions: VisualDebugOptions;
  onChangeDebugOptions: (updater: (prev: VisualDebugOptions) => VisualDebugOptions) => void;
}

export const ExtractionToolbar: React.FC<ExtractionToolbarProps> = ({
  onExportExcel,
  onExportWord,
  onCopyTsv,
  copiedTsv,
  isExporting,
  onSaveProject,
  onLoadProject,
  onForceOcr,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoDesc,
  redoDesc,
  onOpenSearchReplace,
  onToggleCropMode,
  isCropMode,
  onLockAllVerified,
  onToggleConfidencePanel,
  isConfidencePanelOpen,
  lowConfidenceCount,
  viewMode,
  onChangeViewMode,
  debugOptions,
  onChangeDebugOptions,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadProject(file);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
      {/* Group 1: Undo / Redo & Search & Tools */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-700 hover:text-slate-900 rounded hover:bg-white disabled:opacity-30 transition-colors"
            title={undoDesc ? `Undo: ${undoDesc}` : 'Undo (Ctrl+Z)'}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-700 hover:text-slate-900 rounded hover:bg-white disabled:opacity-30 transition-colors"
            title={redoDesc ? `Redo: ${redoDesc}` : 'Redo (Ctrl+Y)'}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search & Replace */}
        <button
          onClick={onOpenSearchReplace}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors border border-slate-200"
          title="Search and Replace text across document"
        >
          <Search className="w-3.5 h-3.5 text-slate-600" />
          <span>Find &amp; Replace</span>
        </button>

        {/* Selective Re-OCR Button */}
        <button
          onClick={onToggleCropMode}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
            isCropMode
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
          title="Draw a rectangle on the PDF to re-run OCR"
        >
          <Crop className="w-3.5 h-3.5" />
          <span>{isCropMode ? 'Drawing Crop...' : 'Re-OCR Region'}</span>
        </button>

        {/* Lock All Verified */}
        <button
          onClick={onLockAllVerified}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors border border-slate-200"
          title="Lock all high-confidence and manually edited cells to prevent reprocessing"
        >
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span>Lock Verified</span>
        </button>

        {/* Low Confidence Review Drawer Button */}
        <button
          onClick={onToggleConfidencePanel}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
            isConfidencePanelOpen
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : lowConfidenceCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title="Review cells with low OCR confidence"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Confidence Review</span>
          {lowConfidenceCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {lowConfidenceCount}
            </span>
          )}
        </button>
      </div>

      {/* Group 2: View Controls & Overlays */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={() => onChangeViewMode('split')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'split' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Split Side-by-Side (PDF + Editable Grid)"
          >
            <Columns className="w-3 h-3 text-indigo-600" />
            <span>Split</span>
          </button>
          <button
            onClick={() => onChangeViewMode('grid_only')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'grid_only' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Editable Grid Fullscreen"
          >
            <LayoutGrid className="w-3 h-3 text-emerald-600" />
            <span>Grid</span>
          </button>
          <button
            onClick={() => onChangeViewMode('pdf_only')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'pdf_only' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="PDF Preview Fullscreen"
          >
            <Maximize className="w-3 h-3 text-blue-600" />
            <span>PDF</span>
          </button>
        </div>

        {/* Debug Overlays Dropdown Toggles */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px]">
          <span className="px-1 text-slate-500 font-medium flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-500" /> Overlays:
          </span>
          <button
            onClick={() =>
              onChangeDebugOptions((prev) => ({
                ...prev,
                showBoundingBoxes: !prev.showBoundingBoxes,
              }))
            }
            className={`px-1.5 py-0.5 rounded transition-colors ${
              debugOptions.showBoundingBoxes ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:bg-white'
            }`}
            title="Toggle Word Bounding Boxes"
          >
            Boxes
          </button>
          <button
            onClick={() =>
              onChangeDebugOptions((prev) => ({
                ...prev,
                showColumnLanes: !prev.showColumnLanes,
              }))
            }
            className={`px-1.5 py-0.5 rounded transition-colors ${
              debugOptions.showColumnLanes ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-white'
            }`}
            title="Toggle Column Lanes"
          >
            Cols
          </button>
          <button
            onClick={() =>
              onChangeDebugOptions((prev) => ({
                ...prev,
                showRowBands: !prev.showRowBands,
              }))
            }
            className={`px-1.5 py-0.5 rounded transition-colors ${
              debugOptions.showRowBands ? 'bg-yellow-600 text-white font-bold' : 'text-slate-600 hover:bg-white'
            }`}
            title="Toggle Row Bands"
          >
            Rows
          </button>
        </div>

        {/* Project JSON Save / Load */}
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            title="Load Saved Extraction Project (.json)"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <button
            onClick={onSaveProject}
            className="p-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            title="Save Project with all edits &amp; coordinates (.json)"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>

        {/* Force OCR Action */}
        {onForceOcr && (
          <button
            onClick={onForceOcr}
            className="flex items-center gap-1 px-2.5 py-1.5 font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors text-xs"
            title="Re-extract entire document using High-Resolution OCR Engine (PP-OCR)"
          >
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span>Force OCR</span>
          </button>
        )}

        {/* Copy TSV */}
        <button
          onClick={onCopyTsv}
          className="flex items-center gap-1 px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          title="Copy current table as TSV (ready to paste in Excel)"
        >
          {copiedTsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedTsv ? 'Copied' : 'Copy TSV'}</span>
        </button>

        {/* Excel Export Button */}
        <button
          onClick={onExportExcel}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          title="Export edited table as Microsoft Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Download Excel (.xlsx)</span>
        </button>

        {/* Word Export Button */}
        <button
          onClick={onExportWord}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          title="Export structured document as Word (.docx)"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Word</span>
        </button>
      </div>
    </div>
  );
};

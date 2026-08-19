import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Heading,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
} from 'lucide-react';
import type {
  DataType,
  SpatialDocument,
} from '../types/spatial.types';
import { documentEditorService } from '../services/documentEditor.service';
import { historyService } from '../services/history.service';
import { pdfToExcelService } from '../services/pdfToExcel.service';
import { pdfToWordService } from '../services/pdfToWord.service';
import { EditableGrid } from './EditableGrid';
import { toast } from '@/shared/components/Toast';

interface DocumentPreviewWorkbenchProps {
  document: SpatialDocument;
  initialSection?: 'word' | 'excel';
  onDocumentChange?: (doc: SpatialDocument) => void;
  onReExtract?: () => void;
  onForceOcr?: () => void;
  onExportExcel?: () => void;
  onExportWord?: () => void;
}

export const DocumentPreviewWorkbench: React.FC<DocumentPreviewWorkbenchProps> = ({
  document: initialDoc,
  initialSection = 'word',
  onDocumentChange,
}) => {
  // Master Editable Document State
  const [doc, setDoc] = useState<SpatialDocument>(() =>
    documentEditorService.cloneDocument(initialDoc)
  );

  // Active Section: 'word' or 'excel'
  const [activeSection, setActiveSection] = useState<'word' | 'excel'>(initialSection);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [docTitle, setDocTitle] = useState(doc.fileName);
  const [wordEditorMode, setWordEditorMode] = useState<'blocks' | 'fulltext'>('blocks');

  // Synchronize when initial document changes
  useEffect(() => {
    const cloned = documentEditorService.cloneDocument(initialDoc);
    setDoc(cloned);
    setDocTitle(cloned.fileName);
    historyService.clear();
  }, [initialDoc]);

  const currentPage = doc.pages[currentPageIndex] || doc.pages[0];
  const totalPages = doc.pageCount;

  // Document change wrapper with history
  const updateDocument = (nextDoc: SpatialDocument, description: string) => {
    historyService.push('EDIT_CELL', description, doc);
    setDoc(nextDoc);
    onDocumentChange?.(nextDoc);
  };

  // Undo / Redo Handlers
  const handleUndo = () => {
    const res = historyService.undo(doc);
    if (res) {
      setDoc(res.document);
      onDocumentChange?.(res.document);
      toast.success(`Undo: ${res.entry.description}`);
    }
  };

  const handleRedo = () => {
    const res = historyService.redo(doc);
    if (res) {
      setDoc(res.document);
      onDocumentChange?.(res.document);
      toast.success(`Redo: ${res.entry.description}`);
    }
  };

  // Title edit
  const handleSaveTitle = () => {
    const cleanTitle = docTitle.trim() || 'Document.pdf';
    const nextDoc = documentEditorService.updateDocumentTitle(doc, cleanTitle);
    updateDocument(nextDoc, 'Rename Document');
    setIsEditingTitle(false);
  };

  // --- WORD SECTION HANDLERS ---
  const handleUpdateParagraph = (paraId: string, newText: string, isHeading?: boolean) => {
    const nextDoc = documentEditorService.updateParagraph(
      doc,
      currentPage.pageNumber,
      paraId,
      newText,
      isHeading
    );
    updateDocument(nextDoc, 'Edit Paragraph');
  };

  const handleAddParagraph = (targetIndex?: number, isHeading = false) => {
    const nextDoc = documentEditorService.addParagraph(
      doc,
      currentPage.pageNumber,
      targetIndex,
      '',
      isHeading
    );
    updateDocument(nextDoc, isHeading ? 'Add Heading' : 'Add Paragraph');
  };

  const handleDeleteParagraph = (paraId: string) => {
    const nextDoc = documentEditorService.deleteParagraph(
      doc,
      currentPage.pageNumber,
      paraId
    );
    updateDocument(nextDoc, 'Delete Paragraph');
  };

  const handleFullTextChange = (text: string) => {
    const nextDoc = documentEditorService.updatePageFullText(
      doc,
      currentPage.pageNumber,
      text
    );
    updateDocument(nextDoc, 'Update Page Text');
  };

  // --- EXCEL SECTION HANDLERS ---
  const handleUpdateCell = (cellId: string, newText: string, forcedType?: DataType) => {
    const nextDoc = documentEditorService.updateCell(doc, cellId, newText, forcedType);
    updateDocument(nextDoc, 'Edit cell');
  };

  const handleChangeCellType = (cellId: string, newType: DataType) => {
    const nextDoc = documentEditorService.changeCellType(doc, cellId, newType);
    updateDocument(nextDoc, `Set cell type to ${newType}`);
  };

  const handleToggleLock = (cellId: string) => {
    const nextDoc = documentEditorService.toggleCellLock(doc, cellId);
    updateDocument(nextDoc, 'Toggle cell lock');
  };

  const handleAddRow = (tableId: string, rowIndex: number, position: 'above' | 'below') => {
    const nextDoc = documentEditorService.addRow(doc, tableId, rowIndex, position);
    updateDocument(nextDoc, `Add row ${position}`);
  };

  const handleDeleteRow = (tableId: string, rowIndex: number) => {
    const nextDoc = documentEditorService.deleteRow(doc, tableId, rowIndex);
    updateDocument(nextDoc, 'Delete row');
  };

  const handleAddColumn = (tableId: string, colIndex: number, position: 'left' | 'right') => {
    const nextDoc = documentEditorService.addColumn(doc, tableId, colIndex, position);
    updateDocument(nextDoc, `Add column ${position}`);
  };

  const handleDeleteColumn = (tableId: string, colIndex: number) => {
    const nextDoc = documentEditorService.deleteColumn(doc, tableId, colIndex);
    updateDocument(nextDoc, 'Delete column');
  };

  // --- EXPORT HANDLERS ---
  const handleExportWord = async () => {
    try {
      setIsExporting(true);
      await pdfToWordService.exportAndDownload(doc);
      toast.success('Word document (.docx) downloaded successfully!');
    } catch (err: any) {
      console.error('[Workbench] Word export error:', err);
      toast.error(`Word export failed: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await pdfToExcelService.exportAndDownload(doc);
      toast.success('Excel workbook (.xlsx) downloaded successfully!');
    } catch (err: any) {
      console.error('[Workbench] Excel export error:', err);
      toast.error(`Excel export failed: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    const textToCopy =
      activeSection === 'word'
        ? doc.allText || currentPage.paragraphs.map((p) => p.text).join('\n\n')
        : pdfToExcelService.generateTsv(doc);

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success(
      activeSection === 'word'
        ? 'Document text copied to clipboard!'
        : 'Excel table data copied (TSV)! Ready to paste into Excel.'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculations for stats
  const pageWords = (currentPage.paragraphs || [])
    .map((p) => p.text)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] min-h-[640px] bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg animate-in fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        {/* Left: Document Name & Page Switcher */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              activeSection === 'word' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}
          >
            {activeSection === 'word' ? <FileText size={18} /> : <FileSpreadsheet size={18} />}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    autoFocus
                    className="text-xs font-bold px-2 py-0.5 border border-indigo-400 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="text-[11px] px-2 py-0.5 bg-indigo-600 text-white rounded font-medium"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                    {doc.fileName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-opacity"
                    title="Rename document"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Subtitle & Page Switcher */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              {totalPages > 1 ? (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  <button
                    type="button"
                    disabled={currentPageIndex === 0}
                    onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                    className="hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Page {currentPageIndex + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPageIndex === totalPages - 1}
                    onClick={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                    className="hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              ) : (
                <span>1 Page Document</span>
              )}
              <span>&bull;</span>
              <span>Engine: <strong className="text-slate-700 dark:text-slate-300">{doc.engineUsed}</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Two Main Section Switchers (Word vs Excel) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveSection('word')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'word'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText size={15} />
            <span>1. Editable Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('excel')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'excel'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>2. Editable Excel (.xlsx)</span>
          </button>
        </div>

        {/* Right: Actions (Undo/Redo, Copy, Download) */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!historyService.canUndo()}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Undo edit (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!historyService.canRedo()}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Redo edit (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : activeSection === 'word' ? 'Copy Text' : 'Copy for Excel'}</span>
          </button>

          {/* Primary Download Button */}
          {activeSection === 'word' ? (
            <button
              type="button"
              onClick={handleExportWord}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Download Word (.docx)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Download Excel (.xlsx)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-hidden p-3 bg-slate-100 dark:bg-slate-950 flex flex-col">
        {/* ========================================================================= */}
        {/* SECTION 1: EDITABLE WORD DOCUMENT */}
        {/* ========================================================================= */}
        {activeSection === 'word' && (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
            {/* Word Editor Sub-Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Document Editor
                </span>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setWordEditorMode('blocks')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      wordEditorMode === 'blocks'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Paragraph Blocks
                  </button>
                  <button
                    type="button"
                    onClick={() => setWordEditorMode('fulltext')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      wordEditorMode === 'fulltext'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Full Text Editor
                  </button>
                </div>
              </div>

              {/* Stats and Add Paragraph */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 font-mono">
                  {pageWords} words on page &bull; {currentPage.paragraphs.length} paragraphs
                </span>
                {wordEditorMode === 'blocks' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddParagraph(undefined, false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Paragraph</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddParagraph(undefined, true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Heading size={12} />
                      <span>Add Heading</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Word Editor Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 flex justify-center">
              <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 p-6 sm:p-10 space-y-6 min-h-[500px]">
                {/* Document Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4 text-center space-y-1">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    {doc.fileName.replace(/\.pdf$/i, '')}
                  </h1>
                  <p className="text-xs text-slate-400">
                    Page {currentPage.pageNumber} of {totalPages} &bull; Editable Word Content
                  </p>
                </div>

                {/* Mode A: Block Paragraphs Editor */}
                {wordEditorMode === 'blocks' && (
                  <div className="space-y-4">
                    {currentPage.paragraphs.length === 0 && (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No paragraphs extracted on this page.{' '}
                        <button
                          type="button"
                          onClick={() => handleAddParagraph(0, false)}
                          className="text-blue-600 underline font-semibold ml-1"
                        >
                          Click here to add text.
                        </button>
                      </div>
                    )}

                    {currentPage.paragraphs.map((p, idx) => (
                      <div
                        key={p.id}
                        className="group relative border border-transparent hover:border-slate-200 dark:hover:border-slate-700 p-2.5 rounded-xl transition-all hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        {/* Hover Action Strip */}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-xs transition-opacity z-10">
                          <button
                            type="button"
                            onClick={() => handleUpdateParagraph(p.id, p.text, !p.isHeading)}
                            className={`p-1 rounded text-xs transition-colors ${
                              p.isHeading
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                            title={p.isHeading ? 'Convert to regular paragraph' : 'Convert to Heading'}
                          >
                            <Heading size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddParagraph(idx + 1, false)}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Insert paragraph below"
                          >
                            <Plus size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteParagraph(p.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete paragraph"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Editable Paragraph Input */}
                        {p.isHeading ? (
                          <input
                            type="text"
                            value={p.text}
                            onChange={(e) => handleUpdateParagraph(p.id, e.target.value, true)}
                            placeholder="Heading text..."
                            className="w-full font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-indigo-300 dark:border-indigo-700 focus:border-indigo-600 focus:outline-none py-1"
                          />
                        ) : (
                          <textarea
                            value={p.text}
                            onChange={(e) => handleUpdateParagraph(p.id, e.target.value, false)}
                            placeholder="Paragraph text..."
                            rows={Math.max(1, Math.ceil(p.text.length / 80))}
                            className="w-full text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded-lg p-1 resize-none focus:bg-white dark:focus:bg-slate-800 transition-colors"
                          />
                        )}
                      </div>
                    ))}

                    {/* Quick Add Paragraph at Bottom */}
                    <div className="pt-2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleAddParagraph(undefined, false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-400 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add New Paragraph Below</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode B: Full Continuous Text Editor */}
                {wordEditorMode === 'fulltext' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400 italic">
                      Directly edit the document's continuous text below. Line breaks and paragraphs are preserved for Word (.docx) export.
                    </p>
                    <textarea
                      value={currentPage.rawText || currentPage.paragraphs.map((p) => p.text).join('\n\n')}
                      onChange={(e) => handleFullTextChange(e.target.value)}
                      rows={18}
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>
                )}

                {/* Embedded Tables Display if present */}
                {currentPage.tables.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileSpreadsheet size={14} className="text-emerald-600" />
                        <span>Embedded Table ({currentPage.tables[0].rowCount} rows &times; {currentPage.tables[0].columnCount} cols)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveSection('excel')}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Open in Editable Excel Grid &rarr;
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                      <table className="w-full text-xs text-left">
                        <tbody>
                          {currentPage.tables[0].rows.slice(0, 6).map((r, rIdx) => (
                            <tr
                              key={rIdx}
                              className={
                                r.isHeader
                                  ? 'bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-300'
                                  : 'border-b border-slate-100 dark:border-slate-800'
                              }
                            >
                              {r.cells.map((c, cIdx) => (
                                <td key={cIdx} className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                                  {c.text || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: EDITABLE EXCEL SPREADSHEET */}
        {/* ========================================================================= */}
        {activeSection === 'excel' && (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
            {/* Editable Spreadsheet Grid Component */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <EditableGrid
                document={doc}
                selectedCellId={selectedCellId}
                onSelectCell={setSelectedCellId}
                onUpdateCell={handleUpdateCell}
                onChangeCellType={handleChangeCellType}
                onToggleLock={handleToggleLock}
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
                onMoveRow={() => {}}
                onAddColumn={handleAddColumn}
                onDeleteColumn={handleDeleteColumn}
                onMoveColumn={() => {}}
                onSplitCell={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreviewWorkbench;

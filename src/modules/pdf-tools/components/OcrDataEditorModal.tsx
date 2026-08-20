import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  FileText,
  Eye,
  AlertTriangle,
  Code2,
  Check,
  Undo2,
  Redo2,
  Download,
  Search,
  Sparkles,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Heading,
  Layers,
  CheckCircle2,
  Lock,
  Unlock,
  Filter,
} from 'lucide-react';
import type {
  DataType,
  SpatialDocument,
} from '../types/spatial.types';
import { documentEditorService } from '../services/documentEditor.service';
import { historyService } from '../services/history.service';
import { pdfToExcelService } from '../services/pdfToExcel.service';
import { pdfToWordService } from '../services/pdfToWord.service';
import { projectPersistenceService } from '../services/projectPersistence.service';
import { EditableGrid } from './EditableGrid';
import { PdfViewer } from './PdfViewer';
import { SearchReplaceModal } from './SearchReplaceModal';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

export interface OcrDataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: SpatialDocument | null;
  onSave?: (updatedDoc: SpatialDocument) => void;
  initialTab?: 'visual' | 'word' | 'excel' | 'lowConfidence' | 'raw';
}

export const OcrDataEditorModal: React.FC<OcrDataEditorModalProps> = ({
  isOpen,
  onClose,
  document: initialDoc,
  onSave,
  initialTab = 'visual',
}) => {
  // Master Editable Document State
  const [doc, setDoc] = useState<SpatialDocument | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'word' | 'excel' | 'lowConfidence' | 'raw'>(initialTab);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [wordEditorMode, setWordEditorMode] = useState<'blocks' | 'fulltext'>('blocks');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<'text' | 'tsv' | 'json' | null>(null);

  // Search & Replace modal state
  const [showSearchReplace, setShowSearchReplace] = useState(false);

  // Low confidence filter state
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(80);
  const [editingConfidenceCellId, setEditingConfidenceCellId] = useState<string | null>(null);
  const [editingConfidenceText, setEditingConfidenceText] = useState<string>('');

  // Raw view search
  const [rawViewMode, setRawViewMode] = useState<'text' | 'json'>('text');

  // Sync state when initialDoc changes
  useEffect(() => {
    if (initialDoc) {
      const cloned = documentEditorService.cloneDocument(initialDoc);
      setDoc(cloned);
      setDocTitle(cloned.fileName);
      setCurrentPageIndex(0);
      historyService.clear();
    } else {
      setDoc(null);
    }
  }, [initialDoc, isOpen]);

  // Keyboard Shortcuts (Undo, Redo, Search & Replace, Save, ESC)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearchReplace(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape' && !showSearchReplace) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, doc, showSearchReplace]);

  // Auto-heal page if it has text but 0 paragraphs in Word view
  useEffect(() => {
    if (!doc) return;
    const currPage = doc.pages[currentPageIndex] || doc.pages[0];
    if (
      currPage &&
      currPage.paragraphs.length === 0 &&
      (currPage.rawText || currPage.elements.length > 0)
    ) {
      const textToUse = currPage.rawText || currPage.elements.map((e) => e.text).join(' ');
      if (textToUse.trim()) {
        const next = documentEditorService.updatePageFullText(doc, currPage.pageNumber, textToUse);
        setDoc(next);
      }
    }
  }, [currentPageIndex, activeTab, doc]);

  // Document update wrapper with undo/redo history
  const updateDocument = (nextDoc: SpatialDocument, description: string) => {
    if (!doc) return;
    historyService.push('EDIT_CELL', description, doc);
    setDoc(nextDoc);
  };

  const handleUndo = () => {
    if (!doc) return;
    const res = historyService.undo(doc);
    if (res) {
      setDoc(res.document);
      toast.success(`Undo: ${res.entry.description}`);
    }
  };

  const handleRedo = () => {
    if (!doc) return;
    const res = historyService.redo(doc);
    if (res) {
      setDoc(res.document);
      toast.success(`Redo: ${res.entry.description}`);
    }
  };

  const handleSaveTitle = () => {
    if (!doc) return;
    const cleanTitle = docTitle.trim() || 'Document.pdf';
    const nextDoc = documentEditorService.updateDocumentTitle(doc, cleanTitle);
    updateDocument(nextDoc, 'Rename Document');
    setIsEditingTitle(false);
  };

  const handleSave = () => {
    if (onSave && doc) {
      onSave(doc);
      toast.success('OCR edits applied and saved successfully!');
    }
    onClose();
  };

  if (!isOpen || !doc) return null;

  const currentPage = doc.pages[currentPageIndex] || doc.pages[0];
  const totalPages = doc.pageCount;

  // --- WORD TAB HANDLERS ---
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

  const handleFormatCleanText = () => {
    const currentText =
      currentPage.rawText || currentPage.paragraphs.map((p) => p.text).join('\n\n');
    const cleaned = currentText
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length > 0)
      .join('\n\n');

    const nextDoc = documentEditorService.updatePageFullText(
      doc,
      currentPage.pageNumber,
      cleaned
    );
    updateDocument(nextDoc, 'Format Clean Text');
    toast.success('Cleaned up text formatting & normalized whitespace.');
  };

  // --- EXCEL TAB HANDLERS ---
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

  const handlePasteTsv = (tableId: string, startR: number, startC: number, tsvText: string) => {
    const nextDoc = documentEditorService.pasteTsv(doc, tableId, startR, startC, tsvText);
    updateDocument(nextDoc, 'Paste TSV data');
    toast.success('Pasted spreadsheet data into grid successfully!');
  };

  const handleGenerateSpatialGrid = () => {
    const nextDoc = documentEditorService.inferSpatialGrid(doc, currentPage.pageNumber);
    updateDocument(nextDoc, 'Infer Table Grid');
    toast.success('Inferred spreadsheet table from spatial text coordinates.');
  };

  const handleCreateTableManually = () => {
    const nextDoc = documentEditorService.createManualTable(doc, currentPage.pageNumber, 6, 5);
    updateDocument(nextDoc, 'Create Starter Table');
    toast.success('Created starter spreadsheet table.');
  };

  // --- SEARCH AND REPLACE ---
  const handleExecuteSearchReplace = (options: any) => {
    const { document: nextDoc, result } = documentEditorService.searchAndReplace(doc, options);
    updateDocument(nextDoc, `Search and replace '${options.searchQuery}'`);
    toast.success(`Replaced ${result.replacementsMade} occurrence(s).`);
    return result;
  };

  // --- EXPORT & DOWNLOAD HANDLERS ---
  const handleExportWord = async () => {
    try {
      setIsExporting(true);
      await pdfToWordService.exportAndDownload(doc);
      toast.success('Word document (.docx) downloaded successfully!');
    } catch (err: any) {
      console.error('[OcrDataEditorModal] Word export error:', err);
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
      console.error('[OcrDataEditorModal] Excel export error:', err);
      toast.error(`Excel export failed: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTxt = () => {
    const rawText = doc.allText || doc.pages.map((p) => p.rawText).join('\n\n');
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const cleanName = (doc.fileName || 'extracted_ocr_text').replace(/\.[^/.]+$/, '');
    saveAs(blob, `${cleanName}_text.txt`);
    toast.success('Extracted text (.txt) downloaded.');
  };

  const handleDownloadMarkdown = () => {
    let md = `# ${doc.fileName}\n\n`;
    md += `*Engine: ${doc.engineUsed} | Overall Confidence: ${doc.overallConfidence}%*\n\n`;
    doc.pages.forEach((p) => {
      md += `## Page ${p.pageNumber}\n\n`;
      p.paragraphs.forEach((para) => {
        if (para.isHeading) {
          md += `### ${para.text}\n\n`;
        } else {
          md += `${para.text}\n\n`;
        }
      });
      p.tables.forEach((t, tIdx) => {
        md += `\n**Table ${tIdx + 1} (${t.rowCount} rows x ${t.columnCount} cols)**\n\n`;
        t.rows.forEach((r, rIdx) => {
          const rowStr = r.cells.map((c) => (c.text || '').replace(/\|/g, '-')).join(' | ');
          md += `| ${rowStr} |\n`;
          if (rIdx === 0) {
            md += `| ${r.cells.map(() => '---').join(' | ')} |\n`;
          }
        });
        md += '\n';
      });
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const cleanName = (doc.fileName || 'ocr_document').replace(/\.[^/.]+$/, '');
    saveAs(blob, `${cleanName}_formatted.md`);
    toast.success('Markdown (.md) downloaded.');
  };

  const handleDownloadJson = () => {
    projectPersistenceService.exportProject(doc);
    toast.success('Spatial OCR Project JSON exported.');
  };

  const handleCopyClipboard = (type: 'text' | 'tsv' | 'json') => {
    let textToCopy = '';
    if (type === 'text') {
      textToCopy = doc.allText || doc.pages.map((p) => p.rawText).join('\n\n');
    } else if (type === 'tsv') {
      textToCopy = pdfToExcelService.generateTsv(doc);
    } else if (type === 'json') {
      textToCopy = JSON.stringify(doc, null, 2);
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedFormat(type);
    toast.success(
      type === 'text'
        ? 'Document text copied to clipboard!'
        : type === 'tsv'
        ? 'Excel TSV copied! Ready to paste directly into Excel.'
        : 'Spatial JSON copied to clipboard!'
    );
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // --- STATS & LOW CONFIDENCE CALCULATIONS ---
  const totalElements = doc.pages.reduce((acc, p) => acc + (p.elements?.length || 0), 0);
  const totalWords = (doc.allText || doc.pages.map((p) => p.rawText).join(' '))
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const totalChars = (doc.allText || doc.pages.map((p) => p.rawText).join('')).length;
  const totalTables = doc.consolidatedTables.length || doc.pages.reduce((acc, p) => acc + p.tables.length, 0);

  // Compute Low Confidence List
  const lowConfidenceItems: Array<{
    id: string;
    text: string;
    confidence: number;
    source?: string;
    pageNumber: number;
    type: 'cell' | 'word';
    cellId?: string;
    elementId?: string;
    locked?: boolean;
  }> = [];

  for (const page of doc.pages) {
    // 1. Check Table Cells
    for (const table of page.tables) {
      for (const row of table.rows) {
        if (row.isHeader) continue;
        for (const cell of row.cells) {
          const conf = cell.confidence ?? cell.data?.confidence ?? 100;
          if (cell.text.trim().length > 0 && conf < confidenceThreshold) {
            lowConfidenceItems.push({
              id: cell.id,
              text: cell.text,
              confidence: conf,
              source: cell.source,
              pageNumber: page.pageNumber,
              type: 'cell',
              cellId: cell.id,
              locked: cell.locked,
            });
          }
        }
      }
    }

    // 2. Check Raw Elements (if no tables)
    if (page.tables.length === 0) {
      for (const el of page.elements) {
        if (el.text.trim().length > 0 && el.confidence < confidenceThreshold) {
          lowConfidenceItems.push({
            id: el.id,
            text: el.text,
            confidence: el.confidence,
            source: el.source,
            pageNumber: page.pageNumber,
            type: 'word',
            elementId: el.id,
          });
        }
      }
    }
  }

  lowConfidenceItems.sort((a, b) => a.confidence - b.confidence);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 rounded-none w-screen h-screen max-w-none max-h-none'
            : 'rounded-2xl max-w-7xl w-full h-[94vh] max-h-[920px] my-auto'
        }`}
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Document Info & Rename */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Layers size={20} />
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
                      className="text-[11px] px-2 py-0.5 bg-indigo-600 text-white rounded font-medium cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                      {doc.fileName}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-opacity cursor-pointer"
                      title="Rename Document"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                )}

                {/* Engine Badge */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {doc.engineUsed}
                </span>

                {/* Overall Confidence Badge */}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    doc.overallConfidence >= 90
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : doc.overallConfidence >= 75
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                  title="Overall OCR Recognition Confidence"
                >
                  {doc.overallConfidence}% Confidence
                </span>
              </div>

              {/* Document Meta Row */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md shadow-2xs">
                    <button
                      type="button"
                      disabled={currentPageIndex === 0}
                      onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                      className="hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Previous Page"
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
                      title="Next Page"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                ) : (
                  <span>1 Page Document</span>
                )}
                {/* Section Provenance Indicator */}
                {doc.sections && doc.sections.length > 1 && (
                  <>
                    <span>&bull;</span>
                    <div
                      className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded text-[10px] font-semibold text-indigo-700 dark:text-indigo-300"
                      title={`Logical Document Section: ${currentPage.sectionTitle || 'Current Section'}`}
                    >
                      <Layers size={10} />
                      <span className="truncate max-w-[140px] sm:max-w-[220px]">
                        {currentPage.sectionTitle || `Section ${(doc.sections.findIndex((s) => s.id === currentPage.sectionId) ?? 0) + 1}/${doc.sections.length}`}
                      </span>
                    </div>
                  </>
                )}
                <span>&bull;</span>
                <span>{totalWords} Words</span>
                <span>&bull;</span>
                <span>{totalChars} Characters</span>
                {totalTables > 0 && (
                  <>
                    <span>&bull;</span>
                    <span>{totalTables} Table(s)</span>
                  </>
                )}
                <span>&bull;</span>
                <span>{totalElements} Bounding Boxes</span>
              </div>
            </div>
          </div>

          {/* Right: Window Controls (Fullscreen, Save, Close) */}
          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!historyService.canUndo()}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!historyService.canRedo()}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={14} />
              </button>
            </div>

            {/* Search & Replace Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowSearchReplace(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Find and Replace Text (Ctrl+F)"
            >
              <Search size={13} />
              <span className="hidden sm:inline">Find / Replace</span>
            </button>

            {/* Apply & Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Save changes and close (Ctrl+S)"
            >
              <CheckCircle2 size={14} />
              <span>Apply &amp; Save Edits</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB NAVIGATION & TOOLBAR STRIP */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Main 5 Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Tab 1: Visual Split View */}
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye size={14} />
              <span>1. Visual &amp; OCR Split</span>
            </button>

            {/* Tab 2: Word / Paragraphs View */}
            <button
              type="button"
              onClick={() => setActiveTab('word')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'word'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>2. Word Document</span>
            </button>

            {/* Tab 3: Excel / Table Grid View */}
            <button
              type="button"
              onClick={() => setActiveTab('excel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'excel'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>3. Excel Table Grid</span>
            </button>

            {/* Tab 4: Low Confidence Review */}
            <button
              type="button"
              onClick={() => setActiveTab('lowConfidence')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'lowConfidence'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle size={14} />
              <span>4. Low-Conf Review</span>
              {lowConfidenceItems.length > 0 && (
                <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.2 rounded-full">
                  {lowConfidenceItems.length}
                </span>
              )}
            </button>

            {/* Tab 5: Raw Text & JSON View */}
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code2 size={14} />
              <span>5. Raw Text &amp; JSON</span>
            </button>
          </div>

          {/* Export & Copy Dropdowns / Buttons */}
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleCopyClipboard('text')}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                title="Copy full text stream"
              >
                {copiedFormat === 'text' ? '✓ Text Copied' : 'Copy Text'}
              </button>
              <button
                type="button"
                onClick={() => handleCopyClipboard('tsv')}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                title="Copy TSV for Excel paste"
              >
                {copiedFormat === 'tsv' ? '✓ TSV Copied' : 'Copy TSV'}
              </button>
              <button
                type="button"
                onClick={() => handleCopyClipboard('json')}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                title="Copy Spatial JSON"
              >
                {copiedFormat === 'json' ? '✓ JSON Copied' : 'Copy JSON'}
              </button>
            </div>

            {/* Quick Export Downloads */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportWord}
                disabled={isExporting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Download Word Document (.docx)"
              >
                <Download size={12} />
                <span>Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Download Excel Spreadsheet (.xlsx)"
              >
                <Download size={12} />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY PER ACTIVE TAB */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-hidden p-3 bg-slate-100 dark:bg-slate-950 flex flex-col">
          {/* ----------------------------------------------------------------------- */}
          {/* TAB 1: VISUAL & OCR SPLIT VIEW */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'visual' && (
            <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden animate-in fade-in">
              {/* Left Column: PDF / Image Viewer Canvas */}
              <div className="w-full lg:w-1/2 h-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm flex flex-col">
                <PdfViewer
                  page={currentPage}
                  currentPageIndex={currentPageIndex}
                  totalPages={totalPages}
                  onPageChange={setCurrentPageIndex}
                  onSelectCell={setSelectedCellId}
                  selectedCellId={selectedCellId}
                />
              </div>

              {/* Right Column: Interactive Elements & Quick Inspector */}
              <div className="w-full lg:w-1/2 h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>Recognized Spatial Elements on Page {currentPage.pageNumber} ({currentPage.elements.length} items)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFormatCleanText}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      <Sparkles size={11} className="text-amber-500" />
                      <span>Clean Whitespace</span>
                    </button>
                  </div>
                </div>

                {/* Elements List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 app-scroll">
                  {currentPage.elements.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs">
                      No coordinate elements found on this page.
                    </div>
                  ) : (
                    currentPage.elements.map((el, idx) => {
                      const isSelected = selectedCellId === el.id;
                      return (
                        <div
                          key={el.id || idx}
                          onClick={() => setSelectedCellId(el.id)}
                          className={`p-2.5 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400 font-semibold">
                                #{idx + 1}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  el.confidence >= 90
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : el.confidence >= 75
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {el.confidence}%
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                [{Math.round(el.x)}, {Math.round(el.y)}, {Math.round(el.x + el.width)}, {Math.round(el.y + el.height)}]
                              </span>
                              <span className="text-[10px] uppercase font-semibold text-slate-400">
                                {el.source}
                              </span>
                            </div>

                            {/* Editable Text Area for this element */}
                            <input
                              type="text"
                              value={el.text}
                              onChange={(e) => {
                                const newText = e.target.value;
                                const nextDoc = documentEditorService.cloneDocument(doc);
                                const targetPage = nextDoc.pages.find((p) => p.pageNumber === currentPage.pageNumber);
                                if (targetPage) {
                                  const targetEl = targetPage.elements.find((item) => item.id === el.id);
                                  if (targetEl) {
                                    targetEl.text = newText;
                                    targetEl.source = 'manual';
                                  }
                                }
                                updateDocument(nextDoc, 'Edit OCR token text');
                              }}
                              className="w-full font-medium text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 2: WORD DOCUMENT (STRUCTURED PARAGRAPHS & CONTINUOUS TEXT) */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'word' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
              {/* Word Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Word Mode:
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setWordEditorMode('blocks')}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
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
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        wordEditorMode === 'fulltext'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Continuous Stream
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFormatCleanText}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Clean Formatting</span>
                  </button>

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

              {/* Word Canvas */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 flex justify-center app-scroll">
                <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 min-h-[500px]">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3 text-center space-y-1">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      {doc.fileName.replace(/\.pdf$/i, '')}
                    </h1>
                    <p className="text-[11px] text-slate-400">
                      Page {currentPage.pageNumber} of {totalPages} &bull; {(currentPage.paragraphs || []).length} paragraphs
                    </p>
                  </div>

                  {wordEditorMode === 'blocks' && (
                    <div className="space-y-3.5">
                      {currentPage.paragraphs.length === 0 && (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          No paragraphs on this page.{' '}
                          <button
                            type="button"
                            onClick={() => handleAddParagraph(0, false)}
                            className="text-blue-600 underline font-semibold ml-1 cursor-pointer"
                          >
                            Click to add paragraph.
                          </button>
                        </div>
                      )}

                      {currentPage.paragraphs.map((p, idx) => (
                        <div
                          key={p.id}
                          className="group relative border border-transparent hover:border-slate-200 dark:hover:border-slate-700 p-2 rounded-xl transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-xs transition-opacity z-10">
                            <button
                              type="button"
                              onClick={() => handleUpdateParagraph(p.id, p.text, !p.isHeading)}
                              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
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
                              className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              title="Insert paragraph below"
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteParagraph(p.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Delete paragraph"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {p.blockType && p.blockType !== 'paragraph' && (
                            <div className="mb-1">
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {p.blockType}
                              </span>
                            </div>
                          )}

                          {p.isHeading || p.blockType === 'heading' ? (
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
                              rows={Math.max(1, Math.ceil(p.text.length / 85))}
                              className="w-full text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded-lg p-1.5 resize-none focus:bg-white dark:focus:bg-slate-800 transition-colors"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {wordEditorMode === 'fulltext' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400 italic">
                        Continuous text stream. Edits are synchronized with the Word (.docx) export.
                      </p>
                      <textarea
                        value={currentPage.rawText || currentPage.paragraphs.map((p) => p.text).join('\n\n')}
                        onChange={(e) => handleFullTextChange(e.target.value)}
                        rows={20}
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 3: EXCEL TABLE GRID */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'excel' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
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
                onPasteTsv={handlePasteTsv}
                onGenerateSpatialGrid={handleGenerateSpatialGrid}
                onCreateTableManually={handleCreateTableManually}
              />
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 4: LOW CONFIDENCE REVIEW */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'lowConfidence' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
              {/* Filter Strip */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-500" />
                    <span>Low Confidence OCR Flagged Items ({lowConfidenceItems.length} found)</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Filter size={12} className="text-indigo-600" /> Threshold:
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {[60, 70, 80, 90].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setConfidenceThreshold(th)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                          confidenceThreshold === th
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        &lt; {th}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Low Confidence Table */}
              <div className="flex-1 overflow-y-auto p-4 app-scroll">
                {lowConfidenceItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                    <CheckCircle2 size={36} className="text-emerald-500" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      All Recognition Confidences Look Great!
                    </p>
                    <p className="text-xs text-slate-500">
                      No text or table cells scored below {confidenceThreshold}% recognition confidence.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lowConfidenceItems.map((item, idx) => {
                      const isEditing = editingConfidenceCellId === item.id;
                      return (
                        <div
                          key={item.id || idx}
                          className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-mono text-slate-400 text-[11px]">#{idx + 1}</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              Page {item.pageNumber}
                            </span>
                            <span
                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.confidence < 60
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                  : item.confidence < 75
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                              }`}
                            >
                              {item.confidence}% Conf
                            </span>

                            {isEditing ? (
                              <input
                                type="text"
                                value={editingConfidenceText}
                                onChange={(e) => setEditingConfidenceText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (item.cellId) {
                                      handleUpdateCell(item.cellId, editingConfidenceText);
                                    }
                                    setEditingConfidenceCellId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingConfidenceCellId(null);
                                  }
                                }}
                                autoFocus
                                className="flex-1 font-medium bg-white dark:bg-slate-900 border border-indigo-500 rounded px-2.5 py-1 text-xs focus:outline-none"
                              />
                            ) : (
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {item.text || <em className="text-slate-400">empty</em>}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.cellId) {
                                    handleUpdateCell(item.cellId, editingConfidenceText);
                                  }
                                  setEditingConfidenceCellId(null);
                                }}
                                className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 cursor-pointer"
                              >
                                Save
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingConfidenceCellId(item.id);
                                  setEditingConfidenceText(item.text);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium text-xs hover:bg-slate-50 cursor-pointer"
                              >
                                <Edit3 size={12} />
                                <span>Correct</span>
                              </button>
                            )}

                            {item.cellId && (
                              <button
                                type="button"
                                onClick={() => handleToggleLock(item.cellId!)}
                                className="p-1 text-slate-400 hover:text-amber-600 rounded cursor-pointer"
                                title={item.locked ? 'Unlock Cell' : 'Lock Cell'}
                              >
                                {item.locked ? <Lock size={14} className="text-amber-500" /> : <Unlock size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 5: RAW TEXT & JSON VIEW */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'raw' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setRawViewMode('text')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        rawViewMode === 'text'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Plain OCR Text Stream
                    </button>
                    <button
                      type="button"
                      onClick={() => setRawViewMode('json')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        rawViewMode === 'json'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Spatial Layout JSON
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    <Download size={12} />
                    <span>.txt</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    <Download size={12} />
                    <span>.md</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    <Download size={12} />
                    <span>.json</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-200 app-scroll leading-relaxed">
                {rawViewMode === 'text' ? (
                  <pre className="whitespace-pre-wrap selection:bg-purple-800">
                    {doc.allText || doc.pages.map((p) => `--- PAGE ${p.pageNumber} ---\n${p.rawText}`).join('\n\n')}
                  </pre>
                ) : (
                  <pre className="whitespace-pre-wrap selection:bg-purple-800 text-[11px]">
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Engine: <strong className="text-slate-700 dark:text-slate-300">{doc.engineUsed}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Confidence: <strong className="text-slate-700 dark:text-slate-300">{doc.overallConfidence}%</strong>
            </span>
            <span>&bull;</span>
            <span>Client-side WebAssembly &amp; TypeScript Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs cursor-pointer"
            >
              <Check size={14} />
              <span>Apply &amp; Save Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Replace Modal */}
      {showSearchReplace && (
        <SearchReplaceModal
          isOpen={showSearchReplace}
          onClose={() => setShowSearchReplace(false)}
          onSearchReplace={handleExecuteSearchReplace}
          currentPageNumber={currentPage.pageNumber}
          currentTableId={doc.consolidatedTables[0]?.id}
        />
      )}
    </div>
  );
};

export default OcrDataEditorModal;

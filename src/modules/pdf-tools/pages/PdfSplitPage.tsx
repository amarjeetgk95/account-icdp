import React, { useState, useRef, useEffect } from 'react';
import {
  Split,
  UploadCloud,
  FileText,
  Download,
  RotateCcw,
  CheckSquare,
  Square,
  Package,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { pdfManipulationService } from '../services/pdfManipulation.service';
import { getDocumentProxy } from 'unpdf';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

interface PageThumbnail {
  pageNumber: number;
  dataUrl: string;
}

export const PdfSplitPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState<string>('');
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Render thumbnails when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      setThumbnails([]);
      setTotalPages(0);
      setSelectedIndices(new Set());
      setRangeInput('');
      return;
    }

    let isMounted = true;

    async function loadPdfThumbnails() {
      setIsLoadingThumbnails(true);
      try {
        const buffer = await selectedFile!.arrayBuffer();
        const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
        const numPages = pdfDoc.numPages;

        if (!isMounted) return;
        setTotalPages(numPages);

        // Pre-select page 1
        setSelectedIndices(new Set([0]));
        setRangeInput('1');

        const renderedThumbs: PageThumbnail[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.35 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');

          if (ctx && typeof (page as any).render === 'function') {
            await (page as any).render({ canvasContext: ctx, viewport } as any).promise;
          }

          renderedThumbs.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          });
        }

        if (isMounted) {
          setThumbnails(renderedThumbs);
        }
      } catch (err: any) {
        console.error('[PdfSplitPage] Error loading PDF thumbnails:', err);
        toast.error(`Could not preview PDF: ${err?.message || err}`);
      } finally {
        if (isMounted) setIsLoadingThumbnails(false);
      }
    }

    loadPdfThumbnails();

    return () => {
      isMounted = false;
    };
  }, [selectedFile]);

  // Sync range input with selectedIndices
  const handleTogglePage = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
    syncRangeFromIndices(next);
  };

  const syncRangeFromIndices = (indices: Set<number>) => {
    const sorted = Array.from(indices).sort((a, b) => a - b).map((i) => i + 1);
    if (sorted.length === 0) {
      setRangeInput('');
      return;
    }
    // Format into comma-separated list
    setRangeInput(sorted.join(', '));
  };

  const handleRangeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRangeInput(val);
    if (totalPages > 0) {
      const parsed = pdfManipulationService.parsePageRangeString(val, totalPages);
      setSelectedIndices(new Set(parsed));
    }
  };

  const handleSelectAll = () => {
    const all = new Set<number>();
    for (let i = 0; i < totalPages; i++) all.add(i);
    setSelectedIndices(all);
    syncRangeFromIndices(all);
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
    setRangeInput('');
  };

  const handleSelectOdd = () => {
    const odd = new Set<number>();
    for (let i = 0; i < totalPages; i += 2) odd.add(i);
    setSelectedIndices(odd);
    syncRangeFromIndices(odd);
  };

  const handleSelectEven = () => {
    const even = new Set<number>();
    for (let i = 1; i < totalPages; i += 2) even.add(i);
    setSelectedIndices(even);
    syncRangeFromIndices(even);
  };

  // Export selected pages as a single combined PDF
  const handleExtractSelectedPdf = async () => {
    if (!selectedFile || selectedIndices.size === 0) {
      toast.error('Please select at least one page to extract');
      return;
    }

    setIsProcessing(true);
    try {
      const indices = Array.from(selectedIndices).sort((a, b) => a - b);
      const result = await pdfManipulationService.splitPdf(selectedFile, indices);

      const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
      const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
      const outputName = `${cleanName}_extracted_${indices.length}_pages.pdf`;
      saveAs(blob, outputName);

      toast.success(`Extracted ${result.pageCount} page(s) successfully!`);
    } catch (err: any) {
      console.error('[PdfSplitPage] Extract error:', err);
      toast.error(`Extract failed: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Burst all pages into separate individual PDFs in a ZIP archive
  const handleBurstAllPagesZip = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
      const zipBlob = await pdfManipulationService.splitAllPagesToZip(
        selectedFile,
        cleanName
      );

      saveAs(zipBlob, `${cleanName}_all_pages.zip`);
      toast.success(`Exported all ${totalPages} pages into a ZIP archive!`);
    } catch (err: any) {
      console.error('[PdfSplitPage] Burst error:', err);
      toast.error(`Burst failed: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in pb-12">
      <PdfToolsNavHeader
        title="Split &amp; Extract PDF Pages"
        subtitle="Extract specific page ranges or burst document into individual pages"
        badge="Pure Vector Engine"
        actions={
          selectedFile ? (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Choose Another File</span>
            </button>
          ) : undefined
        }
      />

      {!selectedFile && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              setSelectedFile(e.dataTransfer.files[0]);
            }
          }}
          className="relative border-2 border-dashed border-cyan-300 dark:border-cyan-800/60 hover:border-cyan-500 rounded-2xl p-10 bg-cyan-50/20 dark:bg-cyan-950/10 hover:bg-cyan-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
            <Split size={28} />
          </div>

          <div>
            <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Select a PDF file to split, or drag &amp; drop here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Supports any multi-page government PDF, circular, or gazette
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 shadow-xs transition-colors"
          >
            <UploadCloud size={14} />
            Choose PDF File
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                    {selectedFile.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {totalPages} total pages &bull; {selectedIndices.size} page(s) selected
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExtractSelectedPdf}
                  disabled={isProcessing || selectedIndices.size === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Download size={14} />
                  <span>Extract Selected ({selectedIndices.size})</span>
                </button>

                <button
                  type="button"
                  onClick={handleBurstAllPagesZip}
                  disabled={isProcessing || totalPages === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Package size={14} />
                  <span>Burst All to ZIP</span>
                </button>
              </div>
            </div>

            {/* Quick selection & range input row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px] font-medium mr-1">Select:</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-medium"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-medium"
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={handleSelectOdd}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-medium"
                >
                  Odd Pages
                </button>
                <button
                  type="button"
                  onClick={handleSelectEven}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-medium"
                >
                  Even Pages
                </button>
              </div>

              {/* Range input */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] text-slate-500 font-medium shrink-0">
                  Page Range:
                </span>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={handleRangeInputChange}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-full sm:w-48"
                />
              </div>
            </div>
          </div>

          {/* Visual Page Thumbnails Grid */}
          {isLoadingThumbnails ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Generating page thumbnails...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {thumbnails.map((thumb, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div
                    key={thumb.pageNumber}
                    onClick={() => handleTogglePage(idx)}
                    className={`relative rounded-xl border-2 p-2 transition-all cursor-pointer bg-white dark:bg-slate-900 flex flex-col items-center justify-between space-y-2 select-none group shadow-xs ${
                      isSelected
                        ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox badge */}
                    <div className="w-full flex items-center justify-between text-xs font-mono">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Page {thumb.pageNumber}
                      </span>
                      <div className="text-cyan-600">
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300 dark:text-slate-600" />}
                      </div>
                    </div>

                    {/* Thumbnail Preview */}
                    <div className="w-full h-36 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <img
                        src={thumb.dataUrl}
                        alt={`Page ${thumb.pageNumber}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfSplitPage;

import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  UploadCloud,
  FileText,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { pdfManipulationService } from '../services/pdfManipulation.service';
import { getDocumentProxy } from 'unpdf';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

interface PageCardState {
  originalIndex: number;
  originalPageNumber: number;
  rotation: number; // 0, 90, 180, 270
  dataUrl: string;
}

export const PdfOrganizePage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageCardState[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPages([]);
      return;
    }

    let isMounted = true;

    async function loadPdfThumbnails() {
      setIsLoadingThumbnails(true);
      try {
        const buffer = await selectedFile!.arrayBuffer();
        const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
        const numPages = pdfDoc.numPages;

        const renderedPages: PageCardState[] = [];

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

          renderedPages.push({
            originalIndex: i - 1,
            originalPageNumber: i,
            rotation: 0,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          });
        }

        if (isMounted) {
          setPages(renderedPages);
        }
      } catch (err: any) {
        console.error('[PdfOrganizePage] Error loading PDF:', err);
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

  const handleRotatePage = (index: number, angleChange: number) => {
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx === index) {
          const nextRot = (p.rotation + angleChange + 360) % 360;
          return { ...p, rotation: nextRot };
        }
        return p;
      })
    );
  };

  const handleRotateAll = (angleChange: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + angleChange + 360) % 360,
      }))
    );
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      toast.error('The document must contain at least one page');
      return;
    }
    setPages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    const next = [...pages];
    const item = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = item;
    setPages(next);
  };

  const handleReset = () => {
    if (selectedFile) {
      const reset = pages
        .slice()
        .sort((a, b) => a.originalIndex - b.originalIndex)
        .map((p) => ({ ...p, rotation: 0 }));
      setPages(reset);
      toast.success('Reset all page order and rotations.');
    }
  };

  const handleSaveOrganizedPdf = async () => {
    if (!selectedFile || pages.length === 0) return;

    setIsSaving(true);
    try {
      const config = pages.map((p) => ({
        pageIndex: p.originalIndex,
        rotation: p.rotation,
      }));

      const result = await pdfManipulationService.organizePdf(selectedFile, config);
      const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
      const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
      saveAs(blob, `${cleanName}_organized.pdf`);

      toast.success(`Saved organized PDF (${result.pageCount} pages)!`);
    } catch (err: any) {
      console.error('[PdfOrganizePage] Save error:', err);
      toast.error(`Save failed: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in pb-12">
      <PdfToolsNavHeader
        title="Rotate &amp; Organize PDF Pages"
        subtitle="Visual page manager to rotate, delete, and reorder document pages"
        badge="Pure Vector Engine"
        actions={
          selectedFile ? (
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} />
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
          className="relative border-2 border-dashed border-amber-300 dark:border-amber-800/60 hover:border-amber-500 rounded-2xl p-10 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <RotateCw size={28} />
          </div>

          <div>
            <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Select a PDF to organize and rotate, or drag &amp; drop here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fix upside-down scanned government pages, delete blank sheets, and reorder
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-xs transition-colors"
          >
            <UploadCloud size={14} />
            Choose PDF File
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="truncate">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                  {selectedFile.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {pages.length} active page(s)
                </p>
              </div>
            </div>

            {/* Global Operations & Save */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleRotateAll(90)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-medium transition-colors"
              >
                <RotateCw size={13} />
                <span>Rotate All 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-medium transition-colors"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleSaveOrganizedPdf}
                disabled={isSaving || pages.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>{isSaving ? 'Saving...' : 'Download Organized PDF'}</span>
              </button>
            </div>
          </div>

          {/* Grid of Pages */}
          {isLoadingThumbnails ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Rendering page previews...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pages.map((p, idx) => (
                <div
                  key={`${p.originalIndex}-${idx}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      Page {idx + 1}{' '}
                      <span className="text-slate-400 font-normal">
                        (orig #{p.originalPageNumber})
                      </span>
                    </span>

                    {p.rotation !== 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        {p.rotation}°
                      </span>
                    )}
                  </div>

                  {/* Thumbnail with CSS Rotation */}
                  <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center p-2 border border-slate-100 dark:border-slate-800">
                    <img
                      src={p.dataUrl}
                      alt={`Page ${idx + 1}`}
                      style={{
                        transform: `rotate(${p.rotation}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Action Bar per page */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMovePage(idx, 'left')}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                        title="Move Left"
                      >
                        <ArrowLeft size={14} />
                      </button>

                      <button
                        type="button"
                        disabled={idx === pages.length - 1}
                        onClick={() => handleMovePage(idx, 'right')}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                        title="Move Right"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRotatePage(idx, -90)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Rotate 90° Counter-Clockwise"
                      >
                        <RotateCcw size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRotatePage(idx, 90)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePage(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
                        title="Delete this page"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfOrganizePage;

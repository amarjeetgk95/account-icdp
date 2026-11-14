import { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { grDocumentStorage } from '../services/grDocumentStorage.service';
import { downloadGRDocument } from '../utils/download';
import { GRModal } from './GRModal';
import type { GRRecord } from '../types';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gr: GRRecord | null;
}

export function PDFViewerModal({ isOpen, onClose, gr }: PDFViewerModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset viewer state whenever a different document is opened (or the modal closes).
  const openKey = isOpen && gr ? `${gr.id}:${gr.storage_path}` : null;
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setPdfUrl(null);
    setIsLoading(Boolean(openKey));
    setError(null);
    setZoom(100);
    setIsFullscreen(false);
  }

  useEffect(() => {
    if (!openKey || !gr) return;

    let isMounted = true;

    grDocumentStorage
      .getDocumentUrl(gr.storage_path, 3600)
      .then((url) => {
        if (isMounted) {
          setPdfUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.warn('[PDFViewer] Unable to resolve document URL:', err);
          setError('Unable to open this PDF. The document may be unavailable in storage.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [openKey, gr]);

  if (!isOpen || !gr) return null;

  const handleDownload = async () => {
    try {
      await downloadGRDocument(gr);
    } catch (err) {
      console.warn('[PDFViewer] Download failed:', err);
      setError('Could not download this document. Please try again.');
    }
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <GRModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      maxHeightClass="h-[90vh]"
      isFullscreen={isFullscreen}
      ariaLabelledBy="pdf-viewer-title"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {gr.gr_number}
            </span>
            <h2 id="pdf-viewer-title" className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md md:max-w-xl">
              {gr.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(200, z + 15))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded transition-colors"
              title="Reset zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!pdfUrl}
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            title="Print document"
            aria-label="Print document"
          >
            <Printer size={16} />
          </button>

          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isLoading}
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            title="Download PDF"
            aria-label="Download PDF"
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="hidden sm:inline-flex p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Close viewer"
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-2 sm:p-4 overflow-auto flex items-center justify-center relative">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p className="text-xs font-semibold">Loading PDF document...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md text-center shadow-lg space-y-3">
            <AlertCircle size={36} className="text-red-500 mx-auto" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Unable to Preview PDF</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void handleDownload()} className="mt-2">
              <Download size={14} className="mr-1.5" /> Try Download Instead
            </Button>
          </div>
        )}

        {pdfUrl && !isLoading && !error && (
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-100 origin-top"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title={`Preview of ${gr.title}`}
              className="w-full h-full rounded-xl bg-white shadow-md border border-slate-300 dark:border-slate-800"
            />
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">
          File: <strong>{gr.file_name}</strong> ({(gr.file_size / (1024 * 1024)).toFixed(2)} MB)
        </span>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 font-semibold text-xs"
          >
            <span>Open in new tab</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </GRModal>
  );
}

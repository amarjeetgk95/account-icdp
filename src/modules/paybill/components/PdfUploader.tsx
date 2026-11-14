import { useRef } from 'react';
import { Upload, FileText, X, Sparkles, FileCode, CheckCircle2 } from 'lucide-react';
import { PbButton } from './ui';

interface PdfUploaderProps {
  fileName: string;
  fileSize: number;
  isProcessing: boolean;
  compact?: boolean;
  onFileSelected: (file: File) => void;
  onBatchFilesSelected?: (files: File[]) => void;
  onLoadSample: () => void;
  onLoadSampleDeduction?: () => void;
  onOpenOcrFallback: () => void;
  onClear: () => void;
}

export function PdfUploader({
  fileName,
  fileSize,
  isProcessing,
  compact = false,
  onFileSelected,
  onBatchFilesSelected,
  onLoadSample,
  onLoadSampleDeduction,
  onOpenOcrFallback,
  onClear,
}: PdfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 1 && onBatchFilesSelected) {
      onBatchFilesSelected(Array.from(e.dataTransfer.files));
    } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 1 && onBatchFilesSelected) {
      onBatchFilesSelected(Array.from(e.target.files));
    } else if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-2">
      {fileName ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-red-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate">
                  {fileName}
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Selected
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatBytes(fileSize)} &bull; Pay Bill Inner Sheet PDF (Karmyogi)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PbButton variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              Replace PDF
            </PbButton>
            <PbButton variant="ghost" icon={X} onClick={onClear} disabled={isProcessing} title="Remove File" />
          </div>
        </div>
      ) : compact ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl px-4 py-2.5 cursor-pointer transition-all bg-gradient-to-r from-blue-50/50 via-slate-50/40 to-indigo-50/50 dark:from-slate-800/40 dark:to-slate-900/40 hover:from-blue-50 dark:hover:from-blue-950/30 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Drop more PDFs here, or{' '}
                <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-500/30">
                  browse files
                </span>{' '}
                to add to batch queue
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accepts both Earning &amp; Deduction sheets (IFMS / Karmayogi)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-md transition shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Sample Earning
            </button>
            {onLoadSampleDeduction && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSampleDeduction();
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-md transition shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                Sample Ded.
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenOcrFallback();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition shadow-2xs"
            >
              <FileCode className="w-3 h-3" />
              OCR Fallback
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-5 text-center cursor-pointer transition-all bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-800/40 dark:to-slate-900/40 hover:from-blue-50/50 dark:hover:from-blue-950/30 group overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-blue-100/50 dark:bg-blue-900/10 blur-2xl pointer-events-none group-hover:bg-blue-200/50 transition-colors" />
          <div className="relative max-w-md mx-auto space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                Drag and drop your Pay Bill Inner Sheet PDF here, or{' '}
                <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-500/30">
                  browse files
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Accepts both <strong>Earning Side</strong> &amp; <strong>Deduction Side</strong> PDFs (IFMS / Karmyogi Gujarat format)
              </p>
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSample();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg shadow-2xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Sample Earning PDF
              </button>

              {onLoadSampleDeduction && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSampleDeduction();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-lg shadow-2xs transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Sample Deduction PDF (April-2026)
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOcrFallback();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
              >
                <FileCode className="w-3.5 h-3.5" />
                OCR / Text Paste Fallback
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
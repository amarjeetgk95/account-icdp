import { useRef } from 'react';
import { Upload, FileText, X, Sparkles, FileCode, CheckCircle2 } from 'lucide-react';

interface PdfUploaderProps {
  fileName: string;
  fileSize: number;
  isProcessing: boolean;
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  onOpenOcrFallback: () => void;
  onClear: () => void;
}

export function PdfUploader({
  fileName,
  fileSize,
  isProcessing,
  onFileSelected,
  onLoadSample,
  onOpenOcrFallback,
  onClear,
}: PdfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-3">
      {fileName ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {fileName}
                </span>
                <span className="inline-flex items-center gap-1 text-[0.7rem] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Selected
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatBytes(fileSize)} &bull; Pay Bill Earning Side PDF
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Replace PDF
            </button>
            <button
              onClick={onClear}
              disabled={isProcessing}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
              title="Remove File"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 text-center cursor-pointer transition-all bg-white dark:bg-slate-900/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 group"
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Drag and drop your Pay Bill Inner Sheet PDF here, or{' '}
                <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-500/30">
                  browse files
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Accepts "PAYBILL INNER SHEET – Earning Side" PDFs (IFMS / Karmyogi Gujarat format)
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSample();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Load Sample Pay Bill PDF (July-2026)
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOcrFallback();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
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
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileSelected(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}

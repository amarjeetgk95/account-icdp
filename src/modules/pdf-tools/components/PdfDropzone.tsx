import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';

interface PdfDropzoneProps {
  onFileSelected: (file: File) => void;
  onLoadSample: (type: 'english_bill' | 'gujarati_order') => void;
  selectedFile: File | null;
  onClearFile: () => void;
  isProcessing: boolean;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFileSelected,
  onLoadSample,
  selectedFile,
  onClearFile,
  isProcessing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const isValidFile = (file: File) => {
    return (
      file.type === 'application/pdf' ||
      file.type === 'application/json' ||
      file.type.startsWith('image/') ||
      /\.(pdf|png|jpe?g|webp|bmp|tiff?|json)$/i.test(file.name)
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Dropzone area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all text-center cursor-pointer flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[0.99]'
            : selectedFile
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/50'
        } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        {selectedFile ? (
          <div className="flex items-center justify-between w-full max-w-md bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-xl shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3 truncate">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="text-left truncate">
                <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[0.7rem] text-slate-500">
                  {formatFileSize(selectedFile.size)} • Ready for OCR &amp; extraction
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearFile();
              }}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Choose a PDF or scanned image, or drag &amp; drop here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Supports PDF, Scanned Documents, JPG, PNG &bull; English &amp; Gujarati OCR
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Demo Sample Loaders */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-slate-500 font-medium text-[0.72rem]">Or try sample documents:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLoadSample('english_bill')}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium text-[0.72rem] transition-colors"
          >
            <Sparkles size={12} />
            Sample Pay Bill (English)
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('gujarati_order')}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-medium text-[0.72rem] transition-colors"
          >
            <Sparkles size={12} />
            નમૂનો સરકારી હુકમ (Gujarati)
          </button>
        </div>
      </div>
    </div>
  );
};

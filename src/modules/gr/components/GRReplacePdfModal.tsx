import { useState, useRef, useCallback } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { grDocumentStorage } from '../services/grDocumentStorage.service';
import { GRModal } from './GRModal';
import { MAX_PDF_SIZE_MB } from '../constants';
import type { GRRecord } from '../types';

interface GRReplacePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: (newFile: File, onProgress?: (percent: number) => void) => Promise<void>;
  gr: GRRecord | null;
  isReplacing: boolean;
}

export function GRReplacePdfModal({
  isOpen,
  onClose,
  onReplace,
  gr,
  isReplacing,
}: GRReplacePdfModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const grId = gr?.id ?? null;

  // Reset the picker whenever the modal opens for a (new) document.
  const openKey = isOpen ? (grId ?? 'new') : null;
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (openKey) {
      setSelectedFile(null);
      setValidationError(null);
      setIsDragging(false);
      setUploadProgress(null);
    }
  }

  const handleFileChange = useCallback(async (file: File | null) => {
    setValidationError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = await grDocumentStorage.validatePdfFile(file, file.name);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isReplacing) {
      if (!selectedFile) setValidationError('Please select a new PDF file to upload.');
      return;
    }

    try {
      setValidationError(null);
      setUploadProgress(5);
      await onReplace(selectedFile, (percent) => setUploadProgress(percent));
      onClose();
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : 'Could not replace the PDF document.'
      );
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <GRModal
      isOpen={isOpen && !!gr}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      closeOnBackdrop={!isReplacing}
      ariaLabelledBy="gr-replace-pdf-title"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <RefreshCw size={18} />
          </div>
          <div>
            <h3 id="gr-replace-pdf-title" className="text-xs font-bold text-slate-900 dark:text-white">
              Replace PDF Document
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Resolution: <strong className="text-slate-700 dark:text-slate-300">{gr?.gr_number}</strong>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isReplacing}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-1">
          <div className="text-slate-500 font-medium">Current Document:</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-0">
            <FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{gr?.file_name}</span>
            <span className="text-slate-400 shrink-0">
              ({((gr?.file_size || 0) / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
              : selectedFile
              ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf,.pdf"
            onChange={(e) => void handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 size={32} className="text-emerald-500" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedFile.name}
              </div>
              <div className="text-xs text-slate-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to replace
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="text-xs text-rose-600 hover:underline mt-1"
              >
                Choose different file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud size={32} className="text-slate-400" />
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Click to select or drag & drop new PDF here
              </div>
              <div className="text-xs text-slate-400">
                PDF format only, up to {MAX_PDF_SIZE_MB}MB
              </div>
            </div>
          )}
        </div>

        {uploadProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Uploading new document...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {validationError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={15} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <p className="text-xs text-slate-400 italic">
          The previous PDF is removed only after the new document is uploaded and the record is updated.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isReplacing}
            className="text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!selectedFile || isReplacing}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isReplacing ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" /> Uploading & Replacing...
              </>
            ) : (
              <>
                <RefreshCw size={14} className="mr-1.5" /> Upload & Replace PDF
              </>
            )}
          </Button>
        </div>
      </form>
    </GRModal>
  );
}

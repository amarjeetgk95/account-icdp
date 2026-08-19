import React, { useState, useRef } from 'react';
import {
  Merge,
  UploadCloud,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { pdfManipulationService } from '../services/pdfManipulation.service';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

interface UploadedPdfItem {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
}

export const PdfMergePage: React.FC<{ showHeader?: boolean }> = ({ showHeader = true }) => {
  const [filesList, setFilesList] = useState<UploadedPdfItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedSuccess, setMergedSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newItems: UploadedPdfItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          name: f.name,
          sizeBytes: f.size,
        });
      }
    }

    if (newItems.length > 0) {
      setFilesList((prev) => [...prev, ...newItems]);
      setMergedSuccess(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filesList.length) return;

    const updated = [...filesList];
    const item = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = item;
    setFilesList(updated);
    setMergedSuccess(false);
  };

  const handleRemove = (id: string) => {
    setFilesList((prev) => prev.filter((f) => f.id !== id));
    setMergedSuccess(false);
  };

  const handleClearAll = () => {
    setFilesList([]);
    setMergedSuccess(false);
  };

  const handleMergeAndDownload = async () => {
    if (filesList.length < 2) {
      toast.warning('Please select at least 2 PDF files to merge.');
      return;
    }

    try {
      setIsMerging(true);
      const fileObjects = filesList.map((item) => item.file);
      const result = await pdfManipulationService.mergePdfs(fileObjects);

      const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
      saveAs(blob, `Merged_Document_${new Date().toISOString().slice(0, 10)}.pdf`);

      setMergedSuccess(true);
      toast.success(`Merged ${filesList.length} files (${result.pageCount} pages) successfully!`);
    } catch (err: any) {
      console.error('[PdfMergePage] Error:', err);
      toast.error('Failed to merge PDFs: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsMerging(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalBytes = filesList.reduce((acc, f) => acc + f.sizeBytes, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in pb-12">
      {showHeader && (
        <PdfToolsNavHeader
          title="Merge PDF Files"
          subtitle="Combine multiple government documents, circulars &amp; invoices into a single PDF"
          badge="Pure Vector Engine"
          actions={
            filesList.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Clear All</span>
              </button>
            ) : undefined
          }
        />
      )}

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFilesSelected(e.dataTransfer.files);
        }}
        className="relative border-2 border-dashed border-indigo-300 dark:border-indigo-800/60 hover:border-indigo-500 rounded-2xl p-8 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
          <UploadCloud size={28} />
        </div>

        <div>
          <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
            Select multiple PDF files, or drag &amp; drop here
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hold Ctrl or Shift to select multiple PDFs at once &bull; No upload limits
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs transition-colors"
        >
          <Plus size={14} />
          Choose PDF Files
        </button>
      </div>

      {/* Files List & Reorder Workbench */}
      {filesList.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>PDF Documents to Merge</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {filesList.length} files ({formatFileSize(totalBytes)})
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Arrange files in the exact order you want them to appear in the merged document
              </p>
            </div>

            <button
              type="button"
              onClick={handleMergeAndDownload}
              disabled={isMerging || filesList.length < 2}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Merge size={16} />
              <span>{isMerging ? 'Merging PDFs...' : 'Merge & Download PDF'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {filesList.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>

                  <div className="truncate text-left">
                    <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {formatFileSize(item.sizeBytes)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp size={15} />
                  </button>

                  <button
                    type="button"
                    disabled={index === filesList.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
                    title="Remove file"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filesList.length < 2 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle size={15} className="shrink-0" />
              <span>Please add at least one more PDF to perform a merge.</span>
            </div>
          )}

          {mergedSuccess && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-semibold">Merged PDF file downloaded successfully!</span>
              </div>
              <button
                type="button"
                onClick={handleMergeAndDownload}
                className="font-bold underline hover:no-underline text-emerald-700 dark:text-emerald-300"
              >
                Download Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfMergePage;

import React, { useState, useRef } from 'react';
import {
  Minimize2,
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { pdfManipulationService } from '../services/pdfManipulation.service';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

type QualityPreset = 'extreme' | 'recommended' | 'light';

export const PdfCompressPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('recommended');
  const [isCompressing, setIsCompressing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultStats, setResultStats] = useState<{
    originalSizeBytes: number;
    newSizeBytes: number;
    savingsPercent: number;
    data: Uint8Array;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCompress = async () => {
    if (!selectedFile) return;

    setIsCompressing(true);
    setProgressPercent(10);
    setResultStats(null);

    try {
      const res = await pdfManipulationService.compressPdf(
        selectedFile,
        qualityPreset,
        (current, total) => {
          setProgressPercent(Math.round((current / total) * 90));
        }
      );

      setProgressPercent(100);
      setResultStats({
        originalSizeBytes: res.originalSizeBytes,
        newSizeBytes: res.newSizeBytes,
        savingsPercent: res.savingsPercent,
        data: res.compressedData,
      });

      toast.success(
        `PDF compressed from ${formatFileSize(res.originalSizeBytes)} to ${formatFileSize(
          res.newSizeBytes
        )} (${res.savingsPercent}% saved)!`
      );
    } catch (err: any) {
      console.error('[PdfCompressPage] Error:', err);
      toast.error(`Compression failed: ${err?.message || err}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!resultStats || !selectedFile) return;
    const blob = new Blob([resultStats.data as BlobPart], { type: 'application/pdf' });
    const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
    saveAs(blob, `${cleanName}_compressed.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in pb-12">
      <PdfToolsNavHeader
        title="Compress &amp; Optimize PDF"
        subtitle="Reduce document file size for strict government portal limits (IFMS, e-Guj, GST, Municipal portals)"
        badge="Portal Ready"
        actions={
          selectedFile ? (
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setResultStats(null);
              }}
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
              setResultStats(null);
            }
          }}
          className="relative border-2 border-dashed border-rose-300 dark:border-rose-800/60 hover:border-rose-500 rounded-2xl p-10 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setSelectedFile(e.target.files[0]);
                setResultStats(null);
              }
            }}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
            <Minimize2 size={28} />
          </div>

          <div>
            <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Select a PDF file to compress, or drag &amp; drop here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Optimizes scanned images and removes unneeded metadata streams
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-xs transition-colors"
          >
            <UploadCloud size={14} />
            Choose PDF File
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          {/* File summary */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3 truncate">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="truncate">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Original Size: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          </div>

          {/* Compression Level Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Optimization Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setQualityPreset('extreme')}
                className={`p-4 rounded-xl text-left border-2 transition-all ${
                  qualityPreset === 'extreme'
                    ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-rose-700 dark:text-rose-400">
                    Extreme Compression
                  </span>
                  <Zap size={14} className="text-rose-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Maximum size reduction. Ideal for strict portal upload caps (&lt;200 KB or &lt;500 KB).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setQualityPreset('recommended')}
                className={`p-4 rounded-xl text-left border-2 transition-all ${
                  qualityPreset === 'recommended'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                    Recommended (Balanced)
                  </span>
                  <Sparkles size={14} className="text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Optimal quality with great compression. Great for official letters and reports.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setQualityPreset('light')}
                className={`p-4 rounded-xl text-left border-2 transition-all ${
                  qualityPreset === 'light'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-blue-700 dark:text-blue-400">
                    Light Optimization
                  </span>
                  <ShieldAlert size={14} className="text-blue-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Highest visual clarity with light stream cleanup.
                </p>
              </button>
            </div>
          </div>

          {/* Compress Action Button */}
          {!resultStats && (
            <button
              type="button"
              onClick={handleCompress}
              disabled={isCompressing}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Minimize2 size={16} />
              <span>{isCompressing ? `Optimizing (${progressPercent}%)...` : 'Compress PDF File'}</span>
            </button>
          )}

          {/* Results Comparison Card */}
          {resultStats && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span className="font-bold text-xs text-emerald-900 dark:text-emerald-300">
                    Compression Complete!
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                  -{resultStats.savingsPercent}% Smaller
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center py-2 border-y border-emerald-200/60 dark:border-emerald-800/40">
                <div>
                  <p className="text-[11px] text-slate-500">Original Size</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {formatFileSize(resultStats.originalSizeBytes)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Optimized Size</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatFileSize(resultStats.newSizeBytes)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download size={15} />
                <span>Download Compressed PDF</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfCompressPage;

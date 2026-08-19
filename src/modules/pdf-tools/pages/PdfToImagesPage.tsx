import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  FileText,
  Download,
  RotateCcw,
  Package,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { pdfManipulationService } from '../services/pdfManipulation.service';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

interface RenderedImageResult {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export const PdfToImagesPage: React.FC<{ showHeader?: boolean }> = ({ showHeader = true }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dpi, setDpi] = useState<number>(200);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [renderedImages, setRenderedImages] = useState<RenderedImageResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConvert = async (fileToUse?: File) => {
    const file = fileToUse || selectedFile;
    if (!file) return;

    setIsRendering(true);
    setRenderedImages([]);
    setProgress({ current: 0, total: 0 });

    try {
      const results = await pdfManipulationService.pdfToImages(file, dpi, (curr, tot) => {
        setProgress({ current: curr, total: tot });
      });

      setRenderedImages(results);
      toast.success(`Converted ${results.length} pages to images!`);
    } catch (err: any) {
      console.error('[PdfToImagesPage] Error:', err);
      toast.error(`Convert failed: ${err?.message || err}`);
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownloadSingle = (img: RenderedImageResult) => {
    saveAs(img.blob, `page_${img.pageNumber}.png`);
  };

  const handleDownloadAllZip = async () => {
    if (renderedImages.length === 0 || !selectedFile) return;

    try {
      const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
      const zipBlob = await pdfManipulationService.packageImagesToZip(renderedImages, cleanName);

      saveAs(zipBlob, `${cleanName}_images_bundle.zip`);
      toast.success('ZIP package downloaded successfully!');
    } catch (err: any) {
      toast.error(`Packaging failed: ${err?.message || err}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in pb-12">
      {showHeader && (
        <PdfToolsNavHeader
          title="PDF to High-Res Images"
          subtitle="Extract crystal clear PNG &amp; JPEG images from every page of your PDF"
          badge="300 DPI Ready"
          actions={
            selectedFile ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setRenderedImages([]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Choose Another File</span>
              </button>
            ) : undefined
          }
        />
      )}

      {!selectedFile && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              const file = e.dataTransfer.files[0];
              setSelectedFile(file);
              handleConvert(file);
            }
          }}
          className="relative border-2 border-dashed border-sky-300 dark:border-sky-800/60 hover:border-sky-500 rounded-2xl p-10 bg-sky-50/20 dark:bg-sky-950/10 hover:bg-sky-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const file = e.target.files[0];
                setSelectedFile(file);
                handleConvert(file);
              }
            }}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
            <ImageIcon size={28} />
          </div>

          <div>
            <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Select a PDF file to convert to images, or drag &amp; drop here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Renders vector text and shapes to crisp lossless PNG images
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 shadow-xs transition-colors"
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
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="truncate">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                  {selectedFile.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {renderedImages.length > 0 ? `${renderedImages.length} page(s) rendered` : 'Ready to convert'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Quality (DPI):</span>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(parseInt(e.target.value, 10))}
                  disabled={isRendering}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                >
                  <option value="150">150 DPI (Standard)</option>
                  <option value="200">200 DPI (High Clarity)</option>
                  <option value="300">300 DPI (Ultra Sharp HD)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleConvert()}
                disabled={isRendering}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>Re-Render</span>
              </button>

              {renderedImages.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Package size={14} />
                  <span>Download All (ZIP)</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress state */}
          {isRendering && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rendering page {progress.current} of {progress.total}...
              </p>
            </div>
          )}

          {/* Rendered images grid */}
          {!isRendering && renderedImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {renderedImages.map((img) => (
                <div
                  key={img.pageNumber}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      Page {img.pageNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {img.width}×{img.height}px
                    </span>
                  </div>

                  <div className="w-full h-52 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center p-1 border border-slate-100 dark:border-slate-800">
                    <img
                      src={img.dataUrl}
                      alt={`Page ${img.pageNumber}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(img)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-xs font-semibold transition-colors"
                  >
                    <Download size={13} />
                    <span>Download PNG</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfToImagesPage;

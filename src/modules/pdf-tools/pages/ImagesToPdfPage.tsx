import React, { useState, useRef } from 'react';
import {
  Images,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Download,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { pdfManipulationService } from '../services/pdfManipulation.service';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

interface UploadedImageItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
}

export const ImagesToPdfPage: React.FC = () => {
  const [imagesList, setImagesList] = useState<UploadedImageItem[]>([]);
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImagesSelected = (files: FileList | null) => {
    if (!files) return;
    const newItems: UploadedImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(f.name)) {
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          name: f.name,
          previewUrl: URL.createObjectURL(f),
        });
      }
    }

    if (newItems.length > 0) {
      setImagesList((prev) => [...prev, ...newItems]);
    }
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= imagesList.length) return;

    const next = [...imagesList];
    const item = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = item;
    setImagesList(next);
  };

  const handleRemove = (id: string) => {
    setImagesList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConvertAndDownload = async () => {
    if (imagesList.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setIsConverting(true);
    try {
      const items = imagesList.map((item) => ({
        file: item.file,
        orientation,
        fit: true,
      }));

      const result = await pdfManipulationService.imagesToPdf(items);
      const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
      saveAs(blob, `scanned_documents_${imagesList.length}_pages.pdf`);

      toast.success(`Converted ${imagesList.length} image(s) to a multi-page PDF successfully!`);
    } catch (err: any) {
      console.error('[ImagesToPdfPage] Error:', err);
      toast.error(`Convert failed: ${err?.message || err}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in pb-12">
      <PdfToolsNavHeader
        title="Images to PDF Converter"
        subtitle="Combine scanned bills, vouchers, receipt photos, and IDs into an A4 PDF"
        badge="Pure Vector Engine"
        actions={
          imagesList.length > 0 ? (
            <button
              type="button"
              onClick={() => setImagesList([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Clear All</span>
            </button>
          ) : undefined
        }
      />

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleImagesSelected(e.dataTransfer.files);
        }}
        className="relative border-2 border-dashed border-teal-300 dark:border-teal-800/60 hover:border-teal-500 rounded-2xl p-8 bg-teal-50/20 dark:bg-teal-950/10 hover:bg-teal-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          multiple
          onChange={(e) => handleImagesSelected(e.target.files)}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
          <Images size={28} />
        </div>

        <div>
          <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
            Select multiple scanned images, or drag &amp; drop here
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supports PNG, JPG, JPEG, WebP &bull; High resolution A4 formatting
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs transition-colors"
        >
          <Plus size={14} />
          Choose Images
        </button>
      </div>

      {imagesList.length > 0 && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Page Orientation:
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                {(['auto', 'portrait', 'landscape'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOrientation(mode)}
                    className={`px-3 py-1 rounded-md capitalize font-semibold transition-colors ${
                      orientation === mode
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConvertAndDownload}
              disabled={isConverting || imagesList.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download size={16} />
              <span>{isConverting ? 'Generating PDF...' : 'Convert & Download PDF'}</span>
            </button>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imagesList.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                    Page {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="w-full h-44 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center p-1 border border-slate-100 dark:border-slate-800">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <p className="truncate text-slate-500 text-[11px] max-w-[120px]">{item.name}</p>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'left')}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                      title="Move Left"
                    >
                      <ArrowLeft size={14} />
                    </button>

                    <button
                      type="button"
                      disabled={idx === imagesList.length - 1}
                      onClick={() => handleMove(idx, 'right')}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                      title="Move Right"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesToPdfPage;

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  RotateCw,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Download,
  CheckSquare,
  Square,
  Minimize2,
  Stamp,
  Image as ImageIcon,
  Languages,
  Plus,
  Layers,
  Sparkles,
  Copy,
  Eye,
  X,
} from 'lucide-react';
import { getDocumentProxy } from 'unpdf';
import { pdfManipulationService } from '../services/pdfManipulation.service';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

export interface StudioPageItem {
  id: string;
  sourceFile: File;
  sourceType: 'pdf' | 'image';
  pageNumberInSource: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl: string;
  selected: boolean;
}

export const UnifiedPdfStudio: React.FC = () => {
  const [pages, setPages] = useState<StudioPageItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionProgress, setActionProgress] = useState<string>('');
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Quick Action Dialog States
  const [showCompressModal, setShowCompressModal] = useState(false);
  const [compressPreset, setCompressPreset] = useState<'recommended' | 'extreme' | 'light'>('recommended');
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkColor, setWatermarkColor] = useState('#64748b');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [showTextViewerModal, setShowTextViewerModal] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingest new uploaded files (PDFs and/or images) and append to canvas
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsLoadingFiles(true);
    setActionProgress('Loading document pages...');

    try {
      const newPageItems: StudioPageItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file.name);

        if (isPdf) {
          setActionProgress(`Parsing ${file.name}...`);
          const buffer = await file.arrayBuffer();
          const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
          const numPages = pdfDoc.numPages;

          for (let pNum = 1; pNum <= numPages; pNum++) {
            const page = await pdfDoc.getPage(pNum);
            const viewport = page.getViewport({ scale: 0.35 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            let thumbUrl = '';
            if (ctx && typeof (page as any).render === 'function') {
              await (page as any).render({ canvasContext: ctx, viewport } as any).promise;
              thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
            }

            newPageItems.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              sourceFile: file,
              sourceType: 'pdf',
              pageNumberInSource: pNum,
              rotation: 0,
              thumbnailUrl: thumbUrl,
              selected: false,
            });
          }
        } else if (isImg) {
          const previewUrl = URL.createObjectURL(file);
          newPageItems.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sourceFile: file,
            sourceType: 'image',
            pageNumberInSource: 1,
            rotation: 0,
            thumbnailUrl: previewUrl,
            selected: false,
          });
        }
      }

      if (newPageItems.length > 0) {
        setPages((prev) => [...prev, ...newPageItems]);
        toast.success(`Added ${newPageItems.length} page(s) to the studio!`);
      }
    } catch (err: any) {
      console.error('[UnifiedPdfStudio] Ingestion error:', err);
      toast.error('Failed to parse uploaded files: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsLoadingFiles(false);
      setActionProgress('');
    }
  };

  // Selection handlers
  const handleToggleSelectPage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  const handleSelectOdd = () => {
    setPages((prev) =>
      prev.map((p, idx) => ({ ...p, selected: idx % 2 === 0 }))
    );
  };

  const handleSelectEven = () => {
    setPages((prev) =>
      prev.map((p, idx) => ({ ...p, selected: idx % 2 === 1 }))
    );
  };

  const selectedPagesCount = pages.filter((p) => p.selected).length;

  // Single page manipulation
  const handleRotatePage = (id: string, degreesDelta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          rotation: (p.rotation + degreesDelta + 360) % 360,
        };
      })
    );
  };

  const handleRotateAll = (degreesDelta: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + degreesDelta + 360) % 360,
      }))
    );
  };

  const handleRotateSelected = (degreesDelta: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.selected
          ? { ...p, rotation: (p.rotation + degreesDelta + 360) % 360 }
          : p
      )
    );
  };

  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    setPages((prev) => {
      const next = [...prev];
      const item = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = item;
      return next;
    });
  };

  const handleDeletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeleteSelected = () => {
    if (selectedPagesCount === 0) return;
    setPages((prev) => prev.filter((p) => !p.selected));
    toast.success(`Removed ${selectedPagesCount} page(s)`);
  };

  const handleDuplicatePage = (index: number) => {
    setPages((prev) => {
      const item = prev[index];
      const duplicate: StudioPageItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      const next = [...prev];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
  };

  // Primary Action 1: Export Complete Unified PDF
  const handleExportFullPdf = async () => {
    if (pages.length === 0) return;

    setIsProcessingAction(true);
    setActionProgress('Composing high-resolution PDF...');

    try {
      const result = await pdfManipulationService.composeDocument(pages);
      const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
      const filename = `Document_Master_${new Date().toISOString().slice(0, 10)}.pdf`;
      saveAs(blob, filename);

      toast.success(`Successfully saved PDF (${result.pageCount} pages)!`);
    } catch (err: any) {
      console.error('[UnifiedPdfStudio] Export error:', err);
      toast.error('Failed to export PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingAction(false);
      setActionProgress('');
    }
  };

  // Primary Action 2: Extract / Split Selected Pages
  const handleExtractSelectedPages = async (mode: 'single-pdf' | 'zip') => {
    const targetPages = pages.filter((p) => p.selected);
    if (targetPages.length === 0) {
      toast.warning('Please select at least one page with the checkboxes to extract.');
      return;
    }

    setIsProcessingAction(true);
    setActionProgress(`Extracting ${targetPages.length} selected pages...`);

    try {
      if (mode === 'single-pdf') {
        const result = await pdfManipulationService.composeDocument(targetPages);
        const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
        saveAs(blob, `Extracted_${targetPages.length}_Pages.pdf`);
        toast.success(`Extracted ${targetPages.length} pages as a new PDF!`);
      } else {
        // ZIP bundle of individual pages
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (let i = 0; i < targetPages.length; i++) {
          const single = await pdfManipulationService.composeDocument([targetPages[i]]);
          zip.file(`page_${String(i + 1).padStart(3, '0')}.pdf`, single.data);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `Extracted_Pages_Bundle.zip`);
        toast.success(`Exported ${targetPages.length} pages to ZIP archive!`);
      }
    } catch (err: any) {
      console.error('[UnifiedPdfStudio] Extract error:', err);
      toast.error('Failed to extract pages: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingAction(false);
      setActionProgress('');
    }
  };

  // Primary Action 3: Compress and Download
  const handleCompressAndDownload = async () => {
    if (pages.length === 0) return;

    setIsProcessingAction(true);
    setActionProgress('Compressing and optimizing document...');
    setShowCompressModal(false);

    try {
      // First compose vector document
      const composed = await pdfManipulationService.composeDocument(pages);
      const composedBlob = new Blob([composed.data as BlobPart], { type: 'application/pdf' });
      const tempFile = new File([composedBlob], 'temp_doc.pdf', { type: 'application/pdf' });

      // Compress
      const compResult = await pdfManipulationService.compressPdf(tempFile, compressPreset);
      const outputBlob = new Blob([compResult.compressedData as BlobPart], { type: 'application/pdf' });
      saveAs(outputBlob, `Document_Compressed_${compressPreset}.pdf`);

      toast.success(
        `Compressed from ${(compResult.originalSizeBytes / 1024).toFixed(0)} KB to ${(
          compResult.newSizeBytes / 1024
        ).toFixed(0)} KB (${compResult.savingsPercent}% saved)!`
      );
    } catch (err: any) {
      console.error('[UnifiedPdfStudio] Compress error:', err);
      toast.error('Compression failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingAction(false);
      setActionProgress('');
    }
  };

  // Primary Action 4: Watermark and Download
  const handleWatermarkAndDownload = async () => {
    if (pages.length === 0 || !watermarkText.trim()) return;

    setIsProcessingAction(true);
    setActionProgress('Applying security watermark...');
    setShowWatermarkModal(false);

    try {
      const result = await pdfManipulationService.composeDocument(pages, {
        watermark: {
          text: watermarkText.trim(),
          colorHex: watermarkColor,
          opacity: watermarkOpacity,
          fontSize: 42,
          rotationAngle: 45,
          position: 'diagonal',
        },
      });

      const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
      saveAs(blob, `Document_Watermarked.pdf`);
      toast.success(`Watermarked and downloaded ${result.pageCount} pages!`);
    } catch (err: any) {
      console.error('[UnifiedPdfStudio] Watermark error:', err);
      toast.error('Watermark failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingAction(false);
      setActionProgress('');
    }
  };

  // Primary Action 5: Export as PNG Images
  const handleExportAsImages = async () => {
    if (pages.length === 0) return;

    setIsProcessingAction(true);
    setActionProgress('Rendering pages to high-resolution PNGs...');

    try {
      const targetList = selectedPagesCount > 0 ? pages.filter((p) => p.selected) : pages;
      const composed = await pdfManipulationService.composeDocument(targetList);
      const tempFile = new File([composed.data as BlobPart], 'temp.pdf', { type: 'application/pdf' });

      const imageResults = await pdfManipulationService.pdfToImages(tempFile, 200);
      const zipBlob = await pdfManipulationService.packageImagesToZip(imageResults, 'document_images');
      saveAs(zipBlob, `document_pages_images.zip`);

      toast.success(`Exported ${imageResults.length} page(s) as high-res images bundle!`);
    } catch (err: any) {
      console.error('[UnifiedPdfStudio] Images export error:', err);
      toast.error('Failed to export images: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingAction(false);
      setActionProgress('');
    }
  };

  // Primary Action 6: Extract Text View
  const handleOpenTextViewer = async () => {
    if (pages.length === 0) return;

    setIsProcessingAction(true);
    setActionProgress('Extracting searchable text...');

    try {
      const pdfFiles = Array.from(new Set(pages.filter((p) => p.sourceType === 'pdf').map((p) => p.sourceFile)));
      let combinedText = '';

      for (const f of pdfFiles) {
        combinedText += `\n=========================================\nFILE: ${f.name}\n=========================================\n\n`;
        const buffer = await f.arrayBuffer();
        const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
        for (let pNum = 1; pNum <= pdfDoc.numPages; pNum++) {
          const page = await pdfDoc.getPage(pNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
          combinedText += `--- Page ${pNum} ---\n${pageText}\n\n`;
        }
      }

      setExtractedRawText(combinedText.trim() || 'No embedded text found in document pages (may be scanned images).');
      setShowTextViewerModal(true);
    } catch (err: any) {
      console.error('[UnifiedPdfStudio] Text extract error:', err);
      toast.error('Failed to extract text: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessingAction(false);
      setActionProgress('');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/tiff"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Main Studio Toolbar Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  All-in-One PDF Canvas Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                </span>
                {selectedPagesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {selectedPagesCount} Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Merge PDFs, append images, reorder, rotate, split, compress &amp; watermark all on one unified canvas.
              </p>
            </div>
          </div>

          {/* Top Quick Add / Clear actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Add PDF / Images</span>
            </button>

            {pages.length > 0 && (
              <button
                type="button"
                onClick={() => setPages([])}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-slate-600 dark:text-slate-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Operations & Action Launchers (Active when pages exist) */}
        {pages.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
            {/* Selection & Batch Tools */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Select:</span>
              <button
                type="button"
                onClick={() => handleSelectAll(selectedPagesCount !== pages.length)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
              >
                {selectedPagesCount === pages.length ? 'Deselect All' : 'All'}
              </button>
              <button
                type="button"
                onClick={handleSelectOdd}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
              >
                Odd
              </button>
              <button
                type="button"
                onClick={handleSelectEven}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
              >
                Even
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Rotate:</span>
              <button
                type="button"
                onClick={() => (selectedPagesCount > 0 ? handleRotateSelected(90) : handleRotateAll(90))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <RotateCw size={12} />
                <span>{selectedPagesCount > 0 ? `Rotate ${selectedPagesCount} Selected (90°)` : 'Rotate All (90°)'}</span>
              </button>

              {selectedPagesCount > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px] font-semibold cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Delete {selectedPagesCount} Selected</span>
                </button>
              )}
            </div>

            {/* Export & Processing Suite */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Split / Extract Selected */}
              {selectedPagesCount > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleExtractSelectedPages('single-pdf')}
                    disabled={isProcessingAction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Extract {selectedPagesCount} (Split PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtractSelectedPages('zip')}
                    disabled={isProcessingAction}
                    className="px-2 py-1.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-200 text-xs font-semibold cursor-pointer"
                    title="Extract as ZIP of single pages"
                  >
                    ZIP
                  </button>
                </div>
              )}

              {/* Compress Launcher */}
              <button
                type="button"
                onClick={() => setShowCompressModal(true)}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <Minimize2 size={13} className="text-rose-500" />
                <span>Compress</span>
              </button>

              {/* Watermark Launcher */}
              <button
                type="button"
                onClick={() => setShowWatermarkModal(true)}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <Stamp size={13} className="text-amber-500" />
                <span>Watermark</span>
              </button>

              {/* Export Images */}
              <button
                type="button"
                onClick={handleExportAsImages}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <ImageIcon size={13} className="text-sky-500" />
                <span>Images</span>
              </button>

              {/* Extract Text */}
              <button
                type="button"
                onClick={handleOpenTextViewer}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <Languages size={13} className="text-purple-500" />
                <span>Text</span>
              </button>

              {/* Primary Action: Export All */}
              <button
                type="button"
                onClick={handleExportFullPdf}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} className="text-emerald-400 dark:text-emerald-600" />
                <span>Save All as PDF ({pages.length} p.)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Banner */}
      {(isLoadingFiles || isProcessingAction) && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 animate-pulse">
          <Sparkles size={14} className="animate-spin" />
          <span>{actionProgress || 'Processing document...'}</span>
        </div>
      )}

      {/* Main Empty State / Dropzone */}
      {pages.length === 0 && !isLoadingFiles && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 rounded-3xl p-12 bg-white dark:bg-slate-900 text-center cursor-pointer flex flex-col items-center justify-center space-y-4 transition-all shadow-xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <UploadCloud size={32} />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Drag &amp; drop any PDF files and Images here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Upload multiple PDFs to merge them, drop receipt photos to turn images into PDF, or reorder, rotate &amp; split pages all on one interactive canvas.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              🔀 Merge Multiple PDFs
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              🖼️ Images to PDF
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              ✂️ Split &amp; Extract
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              🔄 Rotate &amp; Organize
            </span>
          </div>
        </div>
      )}

      {/* Visual Page Cards Grid */}
      {pages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pages.map((item, index) => {
            const rotClass =
              item.rotation === 90
                ? 'rotate-90'
                : item.rotation === 180
                ? 'rotate-180'
                : item.rotation === 270
                ? 'rotate-270'
                : 'rotate-0';

            return (
              <div
                key={item.id}
                className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-xs flex flex-col ${
                  item.selected
                    ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                {/* Card Top Header */}
                <div className="p-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectPage(item.id)}
                    className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {item.selected ? (
                      <CheckSquare size={16} className="text-indigo-600 fill-indigo-50" />
                    ) : (
                      <Square size={16} className="text-slate-400 hover:text-slate-600" />
                    )}
                    <span>Page {index + 1}</span>
                  </button>

                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 truncate max-w-[80px]">
                    {item.sourceType === 'image' ? 'Image' : `p.${item.pageNumberInSource}`}
                  </span>
                </div>

                {/* Thumbnail Preview Box */}
                <div
                  onClick={() => setPreviewModalUrl(item.thumbnailUrl)}
                  className="relative p-3 flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950/40 min-h-[160px] cursor-zoom-in overflow-hidden"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={`Page ${index + 1}`}
                      className={`max-h-[140px] max-w-full object-contain rounded-md shadow-xs transition-transform duration-200 ${rotClass}`}
                    />
                  ) : (
                    <FileText size={32} className="text-slate-300" />
                  )}

                  {/* Zoom Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1">
                      <Eye size={12} /> Inspect
                    </span>
                  </div>
                </div>

                {/* Source File Name Footer */}
                <div className="px-2.5 py-1 text-[10px] text-slate-400 dark:text-slate-500 truncate border-t border-slate-100 dark:border-slate-800/80">
                  {item.sourceFile.name}
                </div>

                {/* Card Bottom Quick Actions Bar */}
                <div className="p-1.5 bg-slate-50/80 dark:bg-slate-800/60 rounded-b-2xl flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 text-slate-500">
                  {/* Left / Right Move */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMovePage(index, 'left')}
                      className="p-1 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move Left"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={index === pages.length - 1}
                      onClick={() => handleMovePage(index, 'right')}
                      className="p-1 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move Right"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Rotate */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleRotatePage(item.id, -90)}
                      className="p-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      title="Rotate 90° CCW"
                    >
                      <RotateCcw size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotatePage(item.id, 90)}
                      className="p-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      title="Rotate 90° CW"
                    >
                      <RotateCw size={13} />
                    </button>
                  </div>

                  {/* Duplicate / Delete */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleDuplicatePage(index)}
                      className="p-1 hover:text-indigo-600 cursor-pointer text-[11px]"
                      title="Duplicate page"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePage(item.id)}
                      className="p-1 hover:text-rose-600 cursor-pointer text-slate-400"
                      title="Delete page"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Add More Card at end of grid */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors bg-white/40 dark:bg-slate-900/40"
          >
            <Plus size={24} />
            <span className="text-xs font-bold">Add More Files</span>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Compress Settings Modal */}
      {showCompressModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600">
                  <Minimize2 size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Compress PDF Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompressModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Reduce the file size of the entire {pages.length}-page document for portal upload limits.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Compression Level:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['recommended', 'extreme', 'light'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCompressPreset(preset)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border capitalize cursor-pointer transition-all ${
                      compressPreset === preset
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCompressModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompressAndDownload}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700 cursor-pointer"
              >
                Compress &amp; Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watermark Settings Modal */}
      {showWatermarkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600">
                  <Stamp size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Apply Security Watermark
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWatermarkModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Watermark Text:
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. CONFIDENTIAL or સત્તાવાર નકલ"
                  className="mt-1 w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {['CONFIDENTIAL', 'ICDP SURAT', 'સત્તાવાર નકલ', 'VERIFIED'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWatermarkText(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Opacity:</span>
                  <span>{Math.round(watermarkOpacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-amber-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Stamp Color:
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {[
                    { hex: '#64748b', name: 'Slate' },
                    { hex: '#dc2626', name: 'Red' },
                    { hex: '#2563eb', name: 'Blue' },
                    { hex: '#059669', name: 'Green' },
                    { hex: '#d97706', name: 'Amber' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setWatermarkColor(c.hex)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        watermarkColor === c.hex
                          ? 'border-slate-900 dark:border-white ring-2 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                      style={{ color: c.hex }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowWatermarkModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWatermarkAndDownload}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700 cursor-pointer"
              >
                Stamp &amp; Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Extracted Text Viewer Modal */}
      {showTextViewerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600">
                  <Languages size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Extracted Searchable Text
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTextViewerModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              readOnly
              value={extractedRawText}
              rows={16}
              className="flex-1 w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 resize-none outline-hidden"
            />

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(extractedRawText);
                  toast.success('Text copied to clipboard!');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Copy size={13} />
                <span>Copy Full Text</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTextViewerModal(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Single Page Preview Modal */}
      {previewModalUrl && (
        <div
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <img
              src={previewModalUrl}
              alt="Page Preview"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-white text-slate-800 shadow-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedPdfStudio;

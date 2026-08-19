import React, { useState, useRef, useEffect } from 'react';
import {
  Stamp,
  UploadCloud,
  Download,
  RotateCcw,
  Sliders,
  Eye,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { pdfManipulationService, WatermarkOptions } from '../services/pdfManipulation.service';
import { getDocumentProxy } from 'unpdf';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

const PRESET_STAMPS = [
  'CONFIDENTIAL',
  'APPROVED',
  'DRAFT',
  'ICDP SURAT',
  'સત્તાવાર નકલ',
  'VERIFIED',
  'PAID & CANCELLED',
];

const PRESET_COLORS = [
  { label: 'Slate Gray', hex: '#64748b' },
  { label: 'Crimson Red', hex: '#dc2626' },
  { label: 'Navy Blue', hex: '#2563eb' },
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Amber Orange', hex: '#d97706' },
];

export const PdfWatermarkPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(42);
  const [opacity, setOpacity] = useState(0.25);
  const [rotationAngle, setRotationAngle] = useState(45);
  const [colorHex, setColorHex] = useState('#64748b');
  const [position, setPosition] = useState<'diagonal' | 'center' | 'header' | 'footer'>('diagonal');
  const [isApplying, setIsApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Render first page preview when file changes
  useEffect(() => {
    if (!selectedFile) {
      setPagePreviewUrl(null);
      return;
    }

    let isMounted = true;
    async function loadFirstPage() {
      try {
        const buffer = await selectedFile!.arrayBuffer();
        const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');

        if (ctx && typeof (page as any).render === 'function') {
          await (page as any).render({ canvasContext: ctx, viewport } as any).promise;
        }

        if (isMounted) {
          setPagePreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch (err: any) {
        console.error('[PdfWatermarkPage] Preview error:', err);
      }
    }

    loadFirstPage();
    return () => {
      isMounted = false;
    };
  }, [selectedFile]);

  const handleApplyWatermark = async () => {
    if (!selectedFile || !watermarkText.trim()) {
      toast.error('Please enter watermark text');
      return;
    }

    setIsApplying(true);
    try {
      const options: WatermarkOptions = {
        text: watermarkText.trim(),
        fontSize,
        opacity,
        rotationAngle: position === 'diagonal' ? rotationAngle : 0,
        colorHex,
        position,
      };

      const result = await pdfManipulationService.watermarkPdf(selectedFile, options);
      const blob = new Blob([result.data as BlobPart], { type: 'application/pdf' });
      const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
      saveAs(blob, `${cleanName}_watermarked.pdf`);

      toast.success(`Watermarked ${result.pageCount} page(s) successfully!`);
    } catch (err: any) {
      console.error('[PdfWatermarkPage] Error:', err);
      toast.error(`Watermark failed: ${err?.message || err}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in pb-12">
      <PdfToolsNavHeader
        title="Watermark &amp; Stamp PDF"
        subtitle="Add security stamps, confidential marks, or Gujarati official designations"
        badge="Pure Vector Engine"
        actions={
          selectedFile ? (
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
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
            }
          }}
          className="relative border-2 border-dashed border-orange-300 dark:border-orange-800/60 hover:border-orange-500 rounded-2xl p-10 bg-orange-50/20 dark:bg-orange-950/10 hover:bg-orange-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
            <Stamp size={28} />
          </div>

          <div>
            <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Select a PDF to watermark, or drag &amp; drop here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adds crisp vector watermark text across all pages in the PDF document
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 shadow-xs transition-colors"
          >
            <UploadCloud size={14} />
            Choose PDF File
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Settings Panel */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                <Sliders size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Watermark &amp; Stamp Configuration
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure text, size, opacity, angle, and position
                </p>
              </div>
            </div>

            {/* Quick Stamp Preset Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Quick Government Stamps:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_STAMPS.map((stamp) => (
                  <button
                    key={stamp}
                    type="button"
                    onClick={() => setWatermarkText(stamp)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      watermarkText === stamp
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {stamp}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Custom Watermark Text:
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL / સત્તાવાર નકલ"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Position &amp; Orientation:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['diagonal', 'center', 'header', 'footer'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosition(pos)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                      position === pos
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size & Opacity Sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Font Size:</span>
                  <span className="font-mono text-slate-500">{fontSize}pt</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="72"
                  step="2"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Opacity:</span>
                  <span className="font-mono text-slate-500">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-orange-600"
                />
              </div>
            </div>

            {position === 'diagonal' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Diagonal Angle:</span>
                  <span className="font-mono text-slate-500">{rotationAngle}°</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="75"
                  step="5"
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-600"
                />
              </div>
            )}

            {/* Color Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Watermark Color:
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColorHex(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      colorHex === c.hex
                        ? 'border-white ring-2 ring-orange-500 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Action Download Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleApplyWatermark}
                disabled={isApplying || !watermarkText.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download size={15} />
                <span>{isApplying ? 'Applying Watermark...' : 'Apply Watermark & Download'}</span>
              </button>
            </div>
          </div>

          {/* Right Live Visual Simulation View */}
          <div className="lg:col-span-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center space-y-3">
            <div className="w-full flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold flex items-center gap-1">
                <Eye size={14} className="text-orange-500" />
                Live Preview (Page 1 Simulation)
              </span>
              <span className="font-mono text-[11px]">{selectedFile.name}</span>
            </div>

            <div className="relative inline-block bg-white rounded-xl shadow-md border border-slate-300 dark:border-slate-700 overflow-hidden max-h-[480px]">
              {pagePreviewUrl ? (
                <img
                  src={pagePreviewUrl}
                  alt="PDF Preview"
                  className="max-h-[450px] w-auto object-contain block"
                />
              ) : (
                <div className="w-64 h-80 flex items-center justify-center text-slate-400 text-xs">
                  Rendering Preview...
                </div>
              )}

              {/* Watermark Overlay Visual Simulation */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                {position === 'diagonal' && (
                  <span
                    style={{
                      transform: `rotate(-${rotationAngle}deg)`,
                      fontSize: `${fontSize * 0.55}px`,
                      opacity,
                      color: colorHex,
                    }}
                    className="font-bold font-sans uppercase tracking-widest whitespace-nowrap"
                  >
                    {watermarkText}
                  </span>
                )}

                {position === 'center' && (
                  <span
                    style={{
                      fontSize: `${fontSize * 0.55}px`,
                      opacity,
                      color: colorHex,
                    }}
                    className="font-bold font-sans uppercase tracking-widest whitespace-nowrap"
                  >
                    {watermarkText}
                  </span>
                )}

                {position === 'header' && (
                  <div className="absolute top-4 left-0 right-0 text-center">
                    <span
                      style={{
                        fontSize: '12px',
                        opacity,
                        color: colorHex,
                      }}
                      className="font-bold font-sans uppercase tracking-wider"
                    >
                      {watermarkText}
                    </span>
                  </div>
                )}

                {position === 'footer' && (
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span
                      style={{
                        fontSize: '12px',
                        opacity,
                        color: colorHex,
                      }}
                      className="font-bold font-sans uppercase tracking-wider"
                    >
                      {watermarkText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfWatermarkPage;

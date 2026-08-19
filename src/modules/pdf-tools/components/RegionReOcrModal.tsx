import React, { useState, useEffect, useRef } from 'react';
import { Crop, RefreshCw, X, Check, Eye } from 'lucide-react';
import type {
  BoundingBox,
  ExtractedElement,
  OcrLanguage,
} from '../types';
import { ocrRegistryService } from '../services/ocr/ocrRegistry.service';
import { imagePreprocessingService } from '../services/imagePreprocessing.service';
import { toast } from '@/shared/components/Toast';

interface RegionReOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  cropBbox: BoundingBox | null;
  croppedCanvas: HTMLCanvasElement | null;
  onApplyReOcr: (pageNumber: number, cropBbox: BoundingBox, elements: ExtractedElement[]) => void;
}

export const RegionReOcrModal: React.FC<RegionReOcrModalProps> = ({
  isOpen,
  onClose,
  pageNumber,
  cropBbox,
  croppedCanvas,
  onApplyReOcr,
}) => {
  const [language, setLanguage] = useState<OcrLanguage>('eng+guj');
  const [contrastBoost, setContrastBoost] = useState(true);
  const [binarization, setBinarization] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedResult, setExtractedResult] = useState<{
    elements: ExtractedElement[];
    rawText: string;
    confidence: number;
  } | null>(null);

  const canvasPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && croppedCanvas && canvasPreviewRef.current) {
      canvasPreviewRef.current.innerHTML = '';
      const preview = document.createElement('canvas');
      preview.width = croppedCanvas.width;
      preview.height = croppedCanvas.height;
      const ctx = preview.getContext('2d');
      if (ctx) {
        ctx.drawImage(croppedCanvas, 0, 0);
      }
      preview.className = 'max-w-full max-h-[160px] h-auto rounded border border-slate-300 shadow-xs mx-auto block';
      canvasPreviewRef.current.appendChild(preview);
    }
  }, [isOpen, croppedCanvas]);

  if (!isOpen || !cropBbox || !croppedCanvas) return null;

  const handleRunOcr = async () => {
    setIsProcessing(true);
    setExtractedResult(null);

    try {
      // Clone cropped canvas to apply local filters
      const processCanvas = document.createElement('canvas');
      processCanvas.width = croppedCanvas.width;
      processCanvas.height = croppedCanvas.height;
      const ctx = processCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(croppedCanvas, 0, 0);
      }

      imagePreprocessingService.preprocessCanvas(processCanvas, {
        enableContrastEnhancement: contrastBoost,
        enableAdaptiveThresholding: binarization,
      });

      const activeEngine = await ocrRegistryService.getActiveEngine();
      const ocrResult = await activeEngine.processPage(processCanvas, pageNumber, {
        language,
        dpi: 300,
      });

      // Adjust bounding boxes to document canvas coordinate space
      const offsetElements: ExtractedElement[] = ocrResult.elements.map((el, idx) => ({
        ...el,
        id: `reocr-p${pageNumber}-${Date.now().toString(36)}-${idx}`,
        page: pageNumber,
        x: cropBbox[0] + el.x,
        y: cropBbox[1] + el.y,
        bbox: [
          cropBbox[0] + el.bbox[0],
          cropBbox[1] + el.bbox[1],
          cropBbox[0] + el.bbox[2],
          cropBbox[1] + el.bbox[3],
        ],
        source: 'paddle-ocr',
      }));

      setExtractedResult({
        elements: offsetElements,
        rawText: ocrResult.rawText,
        confidence: ocrResult.confidence,
      });

      toast.success(`Recognized ${offsetElements.length} tokens at ${ocrResult.confidence}% confidence.`);
    } catch (err: any) {
      toast.error('Re-OCR failed: ' + (err?.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!extractedResult) return;
    onApplyReOcr(pageNumber, cropBbox, extractedResult.elements);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Selective Region Re-OCR</h3>
              <p className="text-xs text-slate-500">
                Page {pageNumber} • Bounds: [{cropBbox[0]}, {cropBbox[1]}] to [{cropBbox[2]}, {cropBbox[3]}]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Canvas Crop Preview */}
          <div className="space-y-1.5">
            <span className="font-medium text-slate-700 block flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-500" /> Selected Image Region Preview:
            </span>
            <div
              ref={canvasPreviewRef}
              className="bg-slate-100 p-3 rounded-lg flex items-center justify-center min-h-[80px]"
            />
          </div>

          {/* OCR Options */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="font-medium text-slate-700 block">Language Model:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as OcrLanguage)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="eng+guj">English + Gujarati (Default)</option>
                <option value="guj">Gujarati Only (ગુજરાતી)</option>
                <option value="eng">English Only</option>
                <option value="hin">Hindi (हिन्दी)</option>
              </select>
            </div>

            <div className="space-y-2 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={contrastBoost}
                  onChange={(e) => setContrastBoost(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Contrast Enhancement</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={binarization}
                  onChange={(e) => setBinarization(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Adaptive Binarization</span>
              </label>
            </div>
          </div>

          {/* Extracted Text Preview */}
          {extractedResult && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-900 text-xs">Recognition Result:</span>
                <span className="font-mono text-[11px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                  {extractedResult.confidence}% Conf
                </span>
              </div>
              <p className="font-mono text-xs text-slate-800 bg-white p-2 rounded border border-emerald-100 whitespace-pre-wrap">
                {extractedResult.rawText || '—'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={handleRunOcr}
            disabled={isProcessing}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Recognizing...' : 'Run OCR on Region'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!extractedResult}
              className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

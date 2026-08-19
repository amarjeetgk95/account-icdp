import React, { useState } from 'react';
import { X, Sparkles, RotateCcw } from 'lucide-react';
import { PdfDropzone } from './PdfDropzone';
import { OcrSettingsPanel } from './OcrSettingsPanel';
import { ExtractionProgressCard } from './ExtractionProgressCard';
import { DocumentPreviewWorkbench } from './DocumentPreviewWorkbench';
import { hybridPdfExtractorService } from '../services/hybridPdfExtractor.service';
import {
  SAMPLE_ENGLISH_PAYBILL_DOC,
  SAMPLE_GUJARATI_ORDER_DOC,
} from '../utils/sampleDocuments';
import type { ExtractedDocument, ExtractionOptions, OcrProgressState } from '../types';
import { toast } from '@/shared/components/Toast';

interface PdfExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractedText?: (text: string) => void;
  initialLanguage?: 'eng' | 'guj' | 'eng+guj';
}

export const PdfExtractorModal: React.FC<PdfExtractorModalProps> = ({
  isOpen,
  onClose,
  onExtractedText,
  initialLanguage = 'eng',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState<OcrProgressState>({
    stage: 'idle',
    currentPage: 0,
    totalPages: 0,
    progressPercent: 0,
    currentMessage: '',
  });

  const [options, setOptions] = useState<ExtractionOptions>({
    mode: 'hybrid',
    language: initialLanguage,
    renderScale: 2.0,
    contrastEnhancement: true,
    binarization: false,
    tableOptions: {
      minColumns: 2,
      lineThresholdPx: 8,
      columnGapThresholdPx: 25,
      enableNumericParsing: true,
      detectCurrencySymbols: true,
      detectHeaderRows: true,
      detectTotalRows: true,
    },
  });

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setExtractedDoc(null);

    try {
      const doc = await hybridPdfExtractorService.extractDocument(
        file,
        file.name,
        options,
        (progress) => setProgressState(progress)
      );

      setExtractedDoc(doc);
      if (onExtractedText && doc.allText) {
        onExtractedText(doc.allText);
      }
      toast.success(`OCR extraction completed: ${doc.pageCount} page(s)`);
    } catch (err: any) {
      console.error(err);
      setProgressState({
        stage: 'error',
        currentPage: 1,
        totalPages: 1,
        progressPercent: 0,
        currentMessage: 'Extraction failed',
        error: err?.message || 'Error processing document',
      });
      toast.error('Extraction error: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = (sampleType: 'english_bill' | 'gujarati_order') => {
    setIsProcessing(true);
    setProgressState({
      stage: 'ocr',
      currentPage: 1,
      totalPages: 1,
      progressPercent: 70,
      currentMessage: 'Loading sample document...',
    });

    setTimeout(() => {
      const doc =
        sampleType === 'english_bill'
          ? SAMPLE_ENGLISH_PAYBILL_DOC
          : SAMPLE_GUJARATI_ORDER_DOC;
      setExtractedDoc(doc);
      setOptions((prev) => ({
        ...prev,
        language: sampleType === 'english_bill' ? 'eng' : 'guj',
      }));
      setProgressState({
        stage: 'completed',
        currentPage: 1,
        totalPages: 1,
        progressPercent: 100,
        currentMessage: 'Sample ready',
      });
      setIsProcessing(false);
    }, 300);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedDoc(null);
    setIsProcessing(false);
    setProgressState({
      stage: 'idle',
      currentPage: 0,
      totalPages: 0,
      progressPercent: 0,
      currentMessage: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                PDF to Word &amp; Excel OCR Extractor
                <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  English + ગુજરાતી
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Extract tables &amp; text from scanned PDFs or images &bull; Export to .docx &amp; .xlsx
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {extractedDoc && (
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition"
                title="Reset / New Document"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 app-scroll">
          {!extractedDoc && (
            <>
              <PdfDropzone
                onFileSelected={handleProcessFile}
                onLoadSample={handleLoadSample}
                selectedFile={selectedFile}
                onClearFile={handleReset}
                isProcessing={isProcessing}
              />
              <OcrSettingsPanel
                options={options}
                onChangeOptions={setOptions}
                disabled={isProcessing}
              />
            </>
          )}

          {isProcessing && <ExtractionProgressCard progress={progressState} />}

          {extractedDoc && (
            <DocumentPreviewWorkbench
              document={extractedDoc}
              onReExtract={() => selectedFile && handleProcessFile(selectedFile)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Client-side WebAssembly OCR &bull; Zero data sent to third-party servers</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

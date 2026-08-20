import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Languages,
  Layers,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { PdfDropzone } from '../components/PdfDropzone';
import { ExtractionProgressCard } from '../components/ExtractionProgressCard';
import { DocumentPreviewWorkbench } from '../components/DocumentPreviewWorkbench';
import { OcrDataEditorModal } from '../components/OcrDataEditorModal';
import { hybridPdfExtractorService } from '../services/hybridPdfExtractor.service';
import {
  SAMPLE_ENGLISH_PAYBILL_DOC,
  SAMPLE_GUJARATI_ORDER_DOC,
} from '../utils/sampleDocuments';
import type {
  ExtractedDocument,
  ExtractionOptions,
  OcrProgressState,
} from '../types';
import { toast } from '@/shared/components/Toast';

export function PdfToolsPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();

  const activeTab: 'word' | 'excel' = tab === 'excel' ? 'excel' : 'word';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<'eng+guj' | 'eng' | 'guj'>('eng+guj');
  const [progressState, setProgressState] = useState<OcrProgressState>({
    stage: 'idle',
    currentPage: 0,
    totalPages: 0,
    progressPercent: 0,
    currentMessage: '',
  });

  // Process uploaded file
  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setExtractedDoc(null);

    const extractionOptions: ExtractionOptions = {
      mode: 'hybrid',
      language: ocrLanguage,
      renderScale: 3.125,
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
    };

    try {
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        const { projectPersistenceService } = await import('../services/projectPersistence.service');
        const restored = await projectPersistenceService.importProject(file);
        setExtractedDoc(restored);
        toast.success(`Document loaded: ${restored.fileName}`);
        return;
      }

      const doc = await hybridPdfExtractorService.extractDocument(
        file,
        file.name,
        extractionOptions,
        (progress) => {
          setProgressState(progress);
        }
      );

      setExtractedDoc(doc);
      toast.success(`Extracted ${doc.pageCount} page(s) successfully!`);
    } catch (err: any) {
      console.error('[PdfToolsPage] Extraction error:', err);
      setProgressState({
        stage: 'error',
        currentPage: 1,
        totalPages: 1,
        progressPercent: 0,
        currentMessage: 'Extraction failed',
        error: err?.message || 'Failed to extract document',
      });
      toast.error('Extraction error: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Load sample documents
  const handleLoadSample = (sampleType: 'english_bill' | 'gujarati_order') => {
    setIsProcessing(true);
    setProgressState({
      stage: 'ocr',
      currentPage: 1,
      totalPages: 1,
      progressPercent: 60,
      currentMessage: 'Loading pre-configured sample document...',
    });

    setTimeout(() => {
      if (sampleType === 'english_bill') {
        setExtractedDoc(SAMPLE_ENGLISH_PAYBILL_DOC);
        setOcrLanguage('eng');
      } else {
        setExtractedDoc(SAMPLE_GUJARATI_ORDER_DOC);
        setOcrLanguage('guj');
      }

      setProgressState({
        stage: 'completed',
        currentPage: 1,
        totalPages: 1,
        progressPercent: 100,
        currentMessage: 'Sample loaded successfully!',
      });
      setIsProcessing(false);
      toast.success('Sample document loaded.');
    }, 350);
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
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in pb-12">
      {/* Top Navigation Header */}
      <PdfToolsNavHeader
        title="OCR Document Studio"
        subtitle="Extract and edit documents into Word (.docx) and Excel (.xlsx) &bull; English + ગુજરાતી"
        badge="PaddleOCR + PDF.js"
        showBack={false}
        actions={
          <div className="flex items-center gap-2">
            {extractedDoc && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>New Document</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/pdf-tools/editor')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Layers size={14} className="text-indigo-400 dark:text-indigo-600" />
              <span>PDF Editor &amp; Utilities &rarr;</span>
            </button>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Upload Section when no document loaded */}
        {!extractedDoc && (
          <div className="space-y-4 animate-in fade-in max-w-4xl mx-auto">
            {/* Language Selector */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <Languages size={16} className="text-indigo-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  OCR Language Mode:
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOcrLanguage('eng+guj')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    ocrLanguage === 'eng+guj'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  English + ગુજરાતી (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setOcrLanguage('eng')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    ocrLanguage === 'eng'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  English Only
                </button>
                <button
                  type="button"
                  onClick={() => setOcrLanguage('guj')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    ocrLanguage === 'guj'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  ગુજરાતી Only
                </button>
              </div>
            </div>

            {/* Dropzone */}
            <PdfDropzone
              onFileSelected={handleProcessFile}
              onLoadSample={handleLoadSample}
              selectedFile={selectedFile}
              onClearFile={handleReset}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Live Progress Card */}
        {isProcessing && <ExtractionProgressCard progress={progressState} />}

        {/* Two Section Workbench (Editable Word & Editable Excel) */}
        {extractedDoc && (
          <DocumentPreviewWorkbench
            document={extractedDoc}
            initialSection={activeTab}
            onDocumentChange={setExtractedDoc}
          />
        )}
      </div>

      {/* Standalone OCR Data Editor Popup Modal */}
      {showOcrModal && extractedDoc && (
        <OcrDataEditorModal
          isOpen={showOcrModal}
          onClose={() => setShowOcrModal(false)}
          document={extractedDoc}
          onSave={(updated) => setExtractedDoc(updated)}
          initialTab={activeTab === 'excel' ? 'excel' : 'word'}
        />
      )}
    </div>
  );
}

export default PdfToolsPage;


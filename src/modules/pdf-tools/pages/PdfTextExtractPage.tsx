import React, { useState, useRef } from 'react';
import {
  Languages,
  UploadCloud,
  FileText,
  Copy,
  Check,
  Download,
  Search,
  RotateCcw,
  Sparkles,
  FileCode,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { hybridPdfExtractorService } from '../services/hybridPdfExtractor.service';
import {
  SAMPLE_ENGLISH_PAYBILL_DOC,
  SAMPLE_GUJARATI_ORDER_DOC,
} from '../utils/sampleDocuments';
import type { ExtractedDocument, OcrProgressState } from '../types';
import { saveAs } from 'file-saver';
import { toast } from '@/shared/components/Toast';

export const PdfTextExtractPage: React.FC<{ showHeader?: boolean }> = ({ showHeader = true }) => {
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<OcrProgressState>({
    stage: 'idle',
    currentPage: 0,
    totalPages: 0,
    progressPercent: 0,
    currentMessage: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setExtractedDoc(null);

    try {
      const doc = await hybridPdfExtractorService.extractDocument(
        file,
        file.name,
        {
          mode: 'hybrid',
          language: 'eng+guj',
        },
        (p) => setProgress(p)
      );

      setExtractedDoc(doc);
      toast.success(`Extracted text from ${doc.pageCount} page(s) successfully!`);
    } catch (err: any) {
      console.error('[PdfTextExtractPage] Error:', err);
      toast.error(`Extraction failed: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = (type: 'gujarati' | 'english') => {
    setIsProcessing(true);
    setTimeout(() => {
      if (type === 'gujarati') {
        setExtractedDoc(SAMPLE_GUJARATI_ORDER_DOC);
      } else {
        setExtractedDoc(SAMPLE_ENGLISH_PAYBILL_DOC);
      }
      setIsProcessing(false);
      toast.success('Sample document loaded.');
    }, 300);
  };

  const rawText = extractedDoc?.allText || '';
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;

  const handleCopyText = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    toast.success('Text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!extractedDoc) return;
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const cleanName = (extractedDoc.fileName || 'extracted_text').replace(/\.[^/.]+$/, '');
    saveAs(blob, `${cleanName}_text.txt`);
  };

  const handleDownloadMarkdown = () => {
    if (!extractedDoc) return;
    let md = `# ${extractedDoc.fileName}\n\n`;
    extractedDoc.pages.forEach((p) => {
      md += `## Page ${p.pageNumber}\n\n`;
      p.paragraphs.forEach((para) => {
        if (para.isHeading) {
          md += `### ${para.text}\n\n`;
        } else {
          md += `${para.text}\n\n`;
        }
      });
      p.tables.forEach((t, tIdx) => {
        md += `\n**Table ${tIdx + 1}**\n\n`;
        t.rows.forEach((r, rIdx) => {
          const rowStr = r.cells.map((c) => c.text.replace(/\|/g, '-')).join(' | ');
          md += `| ${rowStr} |\n`;
          if (rIdx === 0) {
            md += `| ${r.cells.map(() => '---').join(' | ')} |\n`;
          }
        });
        md += '\n';
      });
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const cleanName = (extractedDoc.fileName || 'extracted_doc').replace(/\.[^/.]+$/, '');
    saveAs(blob, `${cleanName}_formatted.md`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in pb-12">
      {showHeader && (
        <PdfToolsNavHeader
          title="Gujarati &amp; English Text Extractor"
          subtitle="Searchable text stream extraction for government circulars, resolutions, and court orders"
          badge="Unicode Gujarati Ready"
          actions={
            extractedDoc ? (
              <button
                type="button"
                onClick={() => {
                  setExtractedDoc(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={13} />
                <span>New Document</span>
              </button>
            ) : undefined
          }
        />
      )}

      {!extractedDoc && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleProcessFile(e.dataTransfer.files[0]);
              }
            }}
            className="relative border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-500 rounded-2xl p-10 bg-purple-50/20 dark:bg-purple-950/10 hover:bg-purple-50/40 transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <Languages size={28} />
            </div>

            <div>
              <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                Choose a PDF or scanned circular image, or drag &amp; drop here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full UTF-8 support for Gujarati (ગુજરાતી) &amp; English text extraction
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-xs transition-colors"
            >
              <UploadCloud size={14} />
              Choose Document
            </button>
          </div>

          {/* Quick Demo Sample Loaders */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-slate-500 font-medium">Or try sample government records:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample('gujarati')}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-medium text-xs transition-colors"
              >
                <Sparkles size={13} />
                નમૂનો સરકારી હુકમ (Gujarati)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('english')}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-medium text-xs transition-colors"
              >
                <Sparkles size={13} />
                Sample Order (English)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress state */}
      {isProcessing && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {progress.currentMessage || 'Extracting bilingual text stream...'}
          </p>
          <div className="w-64 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Extracted Document View */}
      {extractedDoc && !isProcessing && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
          {/* Top Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Stats */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <FileText size={15} className="text-purple-600" />
                <span>{extractedDoc.fileName}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span className="text-slate-500 font-mono">{extractedDoc.pageCount} Pages</span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span className="text-slate-500 font-mono">{wordCount} Words</span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span className="text-slate-500 font-mono">{charCount} Chars</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search inside text */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find in text..."
                  className="pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Copy */}
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>

              {/* Download Markdown */}
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-semibold transition-colors"
              >
                <FileCode size={13} />
                <span>Markdown</span>
              </button>

              {/* Download TXT */}
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold shadow-xs transition-colors"
              >
                <Download size={13} />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          {/* Text Content Area */}
          <div className="p-6 bg-white dark:bg-slate-950 overflow-y-auto max-h-[600px] text-xs sm:text-sm font-sans leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap selection:bg-purple-200 dark:selection:bg-purple-900/60">
            {extractedDoc.pages.map((page) => (
              <div key={page.pageNumber} className="space-y-3 mb-8 last:mb-0">
                {extractedDoc.pageCount > 1 && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Page {page.pageNumber} of {extractedDoc.pageCount}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Engine: {extractedDoc.engineUsed} &bull; Confidence: {page.confidence}%
                    </span>
                  </div>
                )}

                <div className="leading-relaxed">
                  {page.rawText}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfTextExtractPage;

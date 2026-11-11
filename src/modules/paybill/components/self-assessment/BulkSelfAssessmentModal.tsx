import { useState, useMemo, useRef } from 'react';
import { Modal } from '@/shared/components/Modal';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import { SelfAssessmentDocument } from './SelfAssessmentDocument';
import {
  FileArchive,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  FileText,
  Settings2,
} from 'lucide-react';
import type { SelfAssessmentMemo, SelfAssessmentPrintFormat } from '../../types/selfAssessment';
import {
  selfAssessmentPdfService,
  type BulkSelfAssessmentExportProgress,
  type SelfAssessmentPdfEngineMode,
} from '../../services/selfAssessmentPdf.service';

export interface BulkSelfAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  financialYear: number;
  fyLabel: string;
  ayLabel: string;
  allMemos: SelfAssessmentMemo[];
  filteredHrpns?: Set<string>;
}

type FilterMode = 'all' | 'tax_payable' | 'zero_tax' | 'refund';

export function BulkSelfAssessmentModal({
  open,
  onClose,
  financialYear,
  fyLabel,
  ayLabel,
  allMemos,
  filteredHrpns,
}: BulkSelfAssessmentModalProps) {
  const hasFilterDifference =
    Boolean(filteredHrpns) &&
    filteredHrpns!.size > 0 &&
    filteredHrpns!.size < allMemos.length;

  const [scope, setScope] = useState<'all' | 'filtered'>('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [formatOverride, setFormatOverride] = useState<SelfAssessmentPrintFormat>('DANGS');
  const [pdfEngine, setPdfEngine] = useState<SelfAssessmentPdfEngineMode>('canvas');
  const [searchQuery, setSearchQuery] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState<BulkSelfAssessmentExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scope: All vs Filtered from parent directory
  const scopedMemos = useMemo(() => {
    if (scope === 'filtered' && hasFilterDifference && filteredHrpns) {
      return allMemos.filter((m) => filteredHrpns.has(m.hrpn));
    }
    return allMemos;
  }, [allMemos, scope, hasFilterDifference, filteredHrpns]);

  // Filter within modal by tax status, search, and apply format override
  const targetMemos = useMemo(() => {
    return scopedMemos
      .filter((m) => {
        const netTax = m.monthlyTds?.netTaxPayableOrRefund || 0;

        if (filterMode === 'tax_payable' && netTax <= 0) return false;
        if (filterMode === 'zero_tax' && netTax !== 0) return false;
        if (filterMode === 'refund' && netTax >= 0) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const name = (m.taxpayerName || '').toLowerCase();
          const hrpn = (m.hrpn || '').toLowerCase();
          const pan = (m.pan || '').toLowerCase();
          return name.includes(q) || hrpn.includes(q) || pan.includes(q);
        }

        return true;
      })
      .map((m) => ({
        ...m,
        preferredFormat: formatOverride,
      }));
  }, [scopedMemos, filterMode, searchQuery, formatOverride]);

  const handleStartExport = async () => {
    if (targetMemos.length === 0) return;

    setIsExporting(true);
    setIsCompleted(false);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await selfAssessmentPdfService.exportAllMemosPdfZip({
        financialYear,
        fyLabel,
        memos: targetMemos,
        mode: pdfEngine,
        getElementForMemo: (memo) =>
          document.getElementById(`self-assessment-doc-${memo.hrpn}`) ||
          document.getElementById(`memo-doc-card-${memo.hrpn}`),
        onProgress: (p) => setProgress(p),
        signal: controller.signal,
      });
      setIsCompleted(true);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setError('Export was cancelled by user.');
      } else {
        const message =
          err instanceof Error ? err.message : 'Failed to export self-assessment memos.';
        setError(message);
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handlePrintAll = () => {
    const container = document.getElementById('self-assessment-bulk-print-container');
    if (!container) return;

    popupNativePrint({
      elements: [container],
      title: `SelfAssessment_Register_FY${fyLabel}_AY${ayLabel}`,
      pageSize: 'A4',
      orientation: 'portrait',
      pageMargin: '3.5mm',
      customStyles: `
        .memo-bulk-wrapper {
          width: 100% !important;
        }
        .self-assessment-root {
          width: 100% !important;
          max-width: 202mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .self-assessment-root:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 3.5mm 4mm !important; }
          html, body {
            background: #fff !important;
            color: #000 !important;
            font-family: 'Times New Roman', Times, 'Liberation Serif', 'Lohit Gujarati', Shruti, Georgia, serif !important;
          }
        }
      `,
    });
  };

  const handleModalClose = () => {
    if (isExporting) {
      handleCancelExport();
    }
    setError(null);
    setIsCompleted(false);
    setProgress(null);
    onClose();
  };

  const percentage =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Bulk Export Self-Assessment Memos (ZIP / PDF)"
      maxWidth="full"
    >
      <div className="space-y-4 text-xs select-none">
        {/* Banner Summary */}
        <div className="flex items-start gap-3 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileArchive className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">
              Self-Assessment Memo Package (સ્વયં કર આકારણી) — FY {fyLabel} (AY {ayLabel})
            </h4>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Generate individual high-resolution A4 PDF memos (with Lohit Gujarati consent and statutory declaration) for staff and package them into a single downloadable .zip archive.
            </p>
          </div>
        </div>

        {/* Scope Selection (when directory filter active) */}
        {!isExporting && !isCompleted && hasFilterDifference && (
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Select Employees to Include:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  scope === 'all'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold">All Employees</div>
                  <div className="text-slate-500 text-2xs mt-0.5">
                    {allMemos.length} employees in directory
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  scope === 'filtered'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Filter className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold">Filtered Directory</div>
                  <div className="text-slate-500 text-2xs mt-0.5">
                    {filteredHrpns!.size} matching search/filter
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Filter and Format Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl">
          {/* Status Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({scopedMemos.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('tax_payable')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'tax_payable'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tax Payable ({scopedMemos.filter((m) => (m.monthlyTds?.netTaxPayableOrRefund || 0) > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('zero_tax')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'zero_tax'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Zero Balance ({scopedMemos.filter((m) => (m.monthlyTds?.netTaxPayableOrRefund || 0) === 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('refund')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'refund'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Refund Due ({scopedMemos.filter((m) => (m.monthlyTds?.netTaxPayableOrRefund || 0) < 0).length})
            </button>
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Settings2 size={12} /> Format:
            </span>
            <select
              value={formatOverride}
              onChange={(e) => setFormatOverride(e.target.value as SelfAssessmentPrintFormat)}
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-indigo-500"
            >
              <option value="DANGS">DTO Dangs / Personal (Gujarati Consent)</option>
              <option value="STANDARD">Standard Departmental 6-Section</option>
            </select>
          </div>

          {/* PDF Engine Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <FileText size={12} /> Engine:
            </span>
            <select
              value={pdfEngine}
              onChange={(e) => setPdfEngine(e.target.value as SelfAssessmentPdfEngineMode)}
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-indigo-500"
              title="Select PDF generation engine"
            >
              <option value="canvas">High-Fidelity Visual (Exact Match with Print View)</option>
              <option value="vector">Vector AutoTable (Fast Draft)</option>
            </select>
          </div>

          {/* Search Input & Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name / HRPN..."
                className="pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-48"
              />
            </div>

            <button
              type="button"
              disabled={isExporting || targetMemos.length === 0}
              onClick={handlePrintAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Printer size={13} /> Print ({targetMemos.length})
            </button>

            <button
              type="button"
              disabled={isExporting || targetMemos.length === 0}
              onClick={() => void handleStartExport()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Download size={13} />
              {isExporting ? 'Exporting…' : `Export ZIP (${targetMemos.length} PDFs)`}
            </button>
          </div>
        </div>

        {/* Feature Highlights when Idle */}
        {!isExporting && !isCompleted && (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Archive Contents Preview</span>
              <span className="font-mono text-2xs font-semibold px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                Self_Assessment_Memos_FY{fyLabel}.zip
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>
                  <strong>{targetMemos.length}</strong> individual A4 PDF files, one per employee.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 shrink-0" />
                <span>
                  Standardized file naming: <code className="text-2xs bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">Self_Assessment_Memo_[HRPN]_[Name]_FY{fyLabel}.pdf</code>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-blue-800 dark:text-blue-300 font-medium">
                  <strong>Need 1 combined PDF for the whole office?</strong> Click the <strong>Print</strong> button and choose <em>"Save as PDF"</em> in your browser print window.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Active Exporting Progress */}
        {isExporting && progress && (
          <div className="space-y-3 p-4 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>
                  {progress.status === 'preparing' && 'Preparing employee memos...'}
                  {progress.status === 'generating' && `Generating PDF ${progress.current} of ${progress.total}`}
                  {progress.status === 'zipping' && 'Compressing into ZIP archive...'}
                  {progress.status === 'completed' && 'Finishing download...'}
                </span>
              </div>
              <span className="tabular-nums font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
              <div className="truncate">
                {progress.currentEmployeeName && progress.status === 'generating' && (
                  <span>
                    Processing: <strong className="text-slate-700 dark:text-slate-200">{progress.currentEmployeeName}</strong>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCancelExport}
                className="text-rose-600 hover:text-rose-700 underline font-semibold cursor-pointer shrink-0 ml-2"
              >
                Cancel Export
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Export Complete!</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-xs">
              Successfully generated <strong>{targetMemos.length}</strong> employee PDF memos and downloaded <strong>Self_Assessment_Memos_FY{fyLabel}.zip</strong>.
            </p>
          </div>
        )}

        {/* Preview Container: renders target memos in DOM so html2canvas can capture them */}
        <div className="max-h-[55vh] overflow-y-auto app-scroll bg-slate-200/70 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div id="self-assessment-bulk-print-container" className="space-y-6 memo-bulk-wrapper">
            {targetMemos.map((memo) => (
              <div
                key={memo.id || memo.hrpn}
                id={`memo-doc-card-${memo.hrpn}`}
                className="bg-white shadow-md rounded-sm overflow-hidden"
                style={{ width: '210mm', minWidth: '210mm', margin: '0 auto' }}
              >
                <SelfAssessmentDocument memo={memo} id={`self-assessment-doc-${memo.hrpn}`} />
              </div>
            ))}

            {targetMemos.length === 0 && (
              <div className="text-center py-16 text-xs text-slate-400">
                No self-assessment memos match the selected filter or search query.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

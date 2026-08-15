import { useState } from 'react';
import { usePayBillImport } from '../hooks/usePayBillImport';
import { useUIStore } from '@/core/stores/ui-store';
import { PdfUploader } from '../components/PdfUploader';
import { PdfProcessingStatus } from '../components/PdfProcessingStatus';
import { BillMetadataCard } from '../components/BillMetadataCard';
import { ValidationSummary } from '../components/ValidationSummary';
import { ExtractionPreviewTable } from '../components/ExtractionPreviewTable';
import { ImportConfirmationDialog } from '../components/ImportConfirmationDialog';
import { OcrFallbackModal } from '../components/OcrFallbackModal';
import { PayBillRecordsArchive } from '../components/PayBillRecordsArchive';
import { PayBillAllowanceMatrixReport } from '../components/PayBillAllowanceMatrixReport';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Info,
  Archive,
  BarChart3,
  Calendar,
} from 'lucide-react';

type ModuleTab = 'import' | 'archive' | 'report';

export function PayBillImportPage() {
  const [activeTab, setActiveTab] = useState<ModuleTab>('import');
  const [reportTargetHrpn, setReportTargetHrpn] = useState<string | null>(null);

  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const {
    fileName,
    fileSize,
    processingState,
    metadata,
    records,
    reconciliation,
    summary,
    isImporting,
    importResult,
    error,
    processFile,
    processSampleData,
    processRawText,
    updateRecord,
    deleteRecord,
    importData,
    reset,
  } = usePayBillImport();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

  const handleConfirmImport = async () => {
    const res = await importData();
    if (res) {
      setShowConfirmModal(false);
    }
  };

  const handleViewReportForEmployee = (hrpn: string) => {
    setReportTargetHrpn(hrpn);
    setActiveTab('report');
  };

  const isReady = processingState.stage === 'READY' && records.length > 0;
  const isProcessing =
    processingState.stage !== 'IDLE' &&
    processingState.stage !== 'READY' &&
    processingState.stage !== 'ERROR';

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Pay Bill PDF Import &amp; Allowance System
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Extract employee earnings from Pay Bill Inner Sheets (Earning Side) &bull; Primary Key:{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">HRPN</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* FY Badge */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Calendar size={14} className="text-slate-500" />
            <span>FY {fyLabel}</span>
          </div>

          {activeTab === 'import' && records.length > 0 && (
            <button
              onClick={reset}
              disabled={isImporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {activeTab === 'import' && isReady && summary && (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isImporting || (summary ? summary.errorCount > 0 : false)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import {summary.readyCount} Records
            </button>
          )}
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl flex border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
            activeTab === 'import'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Upload size={15} className={activeTab === 'import' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
          <span>PDF Import &amp; Mapping</span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
            activeTab === 'archive'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Archive size={15} className={activeTab === 'archive' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
          <span>Imported Bills &amp; Records Archive</span>
        </button>

        <button
          onClick={() => {
            setReportTargetHrpn(null);
            setActiveTab('report');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
            activeTab === 'report'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <BarChart3 size={15} className={activeTab === 'report' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
          <span>Monthly Allowance Matrix Report</span>
        </button>
      </div>

      {/* TAB 1: PDF Import & Extraction */}
      {activeTab === 'import' && (
        <div className="space-y-5">
          {/* Global Error Banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Error during pay bill processing</p>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Import Success Banner */}
          {importResult && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-start justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">PDF Processed &amp; Imported Successfully!</p>
                  <p>
                    <b>{importResult.matchedCount}</b> employee records imported for <b>{importResult.month} (FY {importResult.financialYear})</b> under Bill <b>{importResult.billNo}</b>.
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400 text-[0.72rem]">
                    Earnings are now saved in the Bills Archive and available in the Allowance Matrix Report.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('report')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-50"
                >
                  View Matrix Report
                </button>
                <button
                  onClick={reset}
                  className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold"
                >
                  Import Another PDF
                </button>
              </div>
            </div>
          )}

          {/* Upload & Dropzone Area */}
          {!isReady && !importResult && (
            <PdfUploader
              fileName={fileName}
              fileSize={fileSize}
              isProcessing={isProcessing}
              onFileSelected={processFile}
              onLoadSample={processSampleData}
              onOpenOcrFallback={() => setShowOcrModal(true)}
              onClear={reset}
            />
          )}

          {/* Processing Status Stepper (7 stages) */}
          <PdfProcessingStatus state={processingState} />

          {/* Main Review Section (When Ready) */}
          {isReady && metadata && (
            <div className="space-y-5 animate-in fade-in">
              {/* Bill Metadata Card */}
              <BillMetadataCard metadata={metadata} />

              {/* Validation & Reconciliation Summary */}
              {summary && (
                <ValidationSummary
                  summary={summary}
                  reconciliation={reconciliation}
                />
              )}

              {/* Review & Inline Edit Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Employee Earnings Review Table
                    </h3>
                    <p className="text-xs text-slate-500">
                      Review and verify extracted allowances against Master Employee dataset before final import
                    </p>
                  </div>
                </div>

                <ExtractionPreviewTable
                  records={records}
                  onUpdateRecord={updateRecord}
                  onDeleteRecord={deleteRecord}
                />
              </div>

              {/* Bottom Action Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    All amounts are in Indian Rupees (INR). HRPN is used to link records with existing Master Employee entries.
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={reset}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancel / Reset
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isImporting || (summary ? summary.errorCount > 0 : false)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import Data ({summary?.readyCount || 0} Records)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Imported Bills Archive & Sortable Grid */}
      {activeTab === 'archive' && (
        <PayBillRecordsArchive
          financialYear={fy}
          onViewReportForEmployee={handleViewReportForEmployee}
        />
      )}

      {/* TAB 3: Monthly Allowance Matrix Report */}
      {activeTab === 'report' && (
        <PayBillAllowanceMatrixReport
          financialYear={fy}
          initialHrpn={reportTargetHrpn}
        />
      )}

      {/* Confirmation Modal */}
      {summary && metadata && (
        <ImportConfirmationDialog
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmImport}
          isImporting={isImporting}
          summary={summary}
          metadata={metadata}
        />
      )}

      {/* OCR / Raw Text Fallback Modal */}
      <OcrFallbackModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onSubmitText={processRawText}
      />
    </div>
  );
}

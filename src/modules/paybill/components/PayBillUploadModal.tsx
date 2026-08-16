import React, { useState } from 'react';
import { usePayBillImport } from '../hooks/usePayBillImport';
import { toast } from '@/shared/components/Toast';
import { PdfUploader } from './PdfUploader';
import { PdfProcessingStatus } from './PdfProcessingStatus';
import { BillMetadataCard } from './BillMetadataCard';
import { SmartAuditBanner } from './SmartAuditBanner';
import { ValidationSummary } from './ValidationSummary';
import { ExtractionPreviewTable } from './ExtractionPreviewTable';
import { DeductionPreviewTable } from './DeductionPreviewTable';
import { ImportConfirmationDialog } from './ImportConfirmationDialog';
import { OcrFallbackModal } from './OcrFallbackModal';
import { ComponentFormModal } from './ComponentFormModal';
import { BatchImportQueue } from './BatchImportQueue';
import { BatchMatrixPreview } from './BatchMatrixPreview';
import { PbButton } from './ui';
import type { DetectedComponentInfo } from '../types';
import {
  Upload,
  X,
  AlertCircle,
  RotateCcw,
  Save,
  Trash2,
  FileSearch,
  CheckCircle2,
} from 'lucide-react';

interface PayBillUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

const STEPS = [
  { id: 1, label: 'Upload PDF', icon: Upload },
  { id: 2, label: 'Review & Verify', icon: FileSearch },
  { id: 3, label: 'Import to Ledger', icon: Save },
];

export const PayBillUploadModal: React.FC<PayBillUploadModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const {
    fileName,
    fileSize,
    sheetType,
    batchQueue,
    isBatchProcessing,
    selectedBatchId,
    batchMatrix,
    processingState,
    metadata,
    records,
    deductionRecords,
    pdfDeductionTotals,
    reconciliation,
    summary,
    auditReport,
    existingBill,
    isImporting,
    error,
    setError,
    unknownComponents,
    dismissUnknownComponent,
    processFile,
    processSampleData,
    processSampleDeductionData,
    processRawText,
    addFilesToBatchQueue,
    processBatchQueue,
    importBatchToLedger,
    clearBatchQueue,
    removeBatchItem,
    selectBatchItem,
    quickAddEmployee,
    syncMasterPayScale,
    updateRecord,
    deleteRecord,
    importData,
    reset,
  } = usePayBillImport();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [componentPreset, setComponentPreset] = useState<{
    componentCode: string | null;
    componentName: string;
    type: 'EARNING' | 'DEDUCTION';
  } | null>(null);

  if (!isOpen) return null;

  const isDeduction = sheetType === 'DEDUCTION';
  const isReady =
    processingState.stage === 'READY' &&
    (records.length > 0 || deductionRecords.length > 0);
  const isProcessing =
    processingState.stage !== 'IDLE' &&
    processingState.stage !== 'READY' &&
    processingState.stage !== 'ERROR';

  const activeStep = batchMatrix ? 3 : isReady ? 2 : 1;

  const handleConfirmImport = async () => {
    const res = await importData();
    if (!res) return;

    if (!res.dbSync && res.dbWarning) {
      // Keep the modal open and surface the real persistence failure so the
      // user cannot think the data was saved to the system.
      setError(res.dbWarning);
      return;
    }

    toast.success('Pay bill imported and posted successfully.');
    setShowConfirmModal(false);
    if (onImportSuccess) onImportSuccess();
    onClose();
  };

  const handleSaveBatch = async () => {
    const res = await importBatchToLedger();
    if (res && res.imported > 0) {
      if (onImportSuccess) onImportSuccess();
      clearBatchQueue();
      reset();
      onClose();
    }
  };

  const handleClearBatch = () => {
    clearBatchQueue();
    reset();
  };

  const activeCount = isDeduction ? deductionRecords.length : records.length;
  const addableUnknownComponents = unknownComponents.filter(
    (c): c is DetectedComponentInfo & { type: 'EARNING' | 'DEDUCTION' } =>
      c.type === 'EARNING' || c.type === 'DEDUCTION'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Upload &amp; Extract Pay Bill PDF
                <span
                  className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${
                    isDeduction
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}
                >
                  {isDeduction ? 'Inner Sheet (Deduction Side)' : 'Inner Sheet (Earning Side)'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extract employee allowances &amp; deductions using HRPN coordinates &bull; Supports single or batch upload
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(records.length > 0 || deductionRecords.length > 0) && (
              <PbButton
                variant="secondary"
                icon={RotateCcw}
                onClick={reset}
                disabled={isImporting}
              >
                Reset
              </PbButton>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isDone = activeStep > s.id;
              const isActive = activeStep === s.id;
              return (
                <React.Fragment key={s.id}>
                  {idx > 0 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                        isDone ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isDone
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                          : isActive
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md ring-4 ring-blue-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                    </span>
                    <span
                      className={`text-[0.72rem] font-bold whitespace-nowrap ${
                        isActive
                          ? 'text-blue-700 dark:text-blue-300'
                          : isDone
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 app-scroll">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Error during PDF processing</p>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Unknown Component Detection Banner */}
          {addableUnknownComponents.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Unmatched payroll components detected
                  </p>
                  <p className="text-amber-800 dark:text-amber-300">
                    {addableUnknownComponents.length} column(s) in this bill
                    did not match the Component Master. Add them to the master so future imports resolve automatically.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {addableUnknownComponents.map((c) => (
                        <div
                          key={`${c.order}-${c.detectedText}`}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700"
                        >
                          <span className="font-mono text-amber-900 dark:text-amber-200">
                            {c.detectedText}
                            {c.componentCode ? ` (${c.componentCode})` : ''}
                          </span>
                          <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                            {c.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setComponentPreset({
                                componentCode: c.componentCode,
                                componentName: c.componentName,
                                type: c.type,
                              });
                              setShowComponentForm(true);
                            }}
                            className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                          >
                            Add to Master
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissUnknownComponent(c.componentCode || c.detectedText)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            aria-label="Dismiss"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Consolidated Batch Matrix (after Process All) */}
          {batchMatrix && (
            <div className="space-y-4 animate-in fade-in">
              <BatchMatrixPreview matrix={batchMatrix} />
            </div>
          )}

          {/* Upload & Dropzone Area */}
          {!batchMatrix && !isReady && (
            <div className="space-y-4">
              <PdfUploader
                fileName={fileName}
                fileSize={fileSize}
                isProcessing={isProcessing}
                onFileSelected={processFile}
                onBatchFilesSelected={addFilesToBatchQueue}
                onLoadSample={processSampleData}
                onLoadSampleDeduction={processSampleDeductionData}
                onOpenOcrFallback={() => setShowOcrModal(true)}
                onClear={reset}
              />

              {/* Batch Queue Manager */}
              <BatchImportQueue
                queue={batchQueue}
                isBatchProcessing={isBatchProcessing}
                onProcessQueue={processBatchQueue}
                onClearQueue={clearBatchQueue}
                onRemoveItem={removeBatchItem}
                onSelectFileToPreview={selectBatchItem}
                selectedFileId={selectedBatchId}
              />
            </div>
          )}

          {/* Processing Status Stepper */}
          <PdfProcessingStatus state={processingState} />

          {/* Review & Preview Workspace (When Ready) */}
          {isReady && metadata && (
            <div className="space-y-5 animate-in fade-in">
              {/* Bill Metadata Card */}
              <BillMetadataCard metadata={metadata} />

              {/* Smart Salary Audit & Anomaly Detection Banner (Earnings only) */}
              {!isDeduction && auditReport && (
                <SmartAuditBanner
                  auditReport={auditReport}
                  onQuickAddEmployee={(hrpn) => {
                    const targetRec = records.find((r) => r.row.hrpn === hrpn);
                    if (targetRec) quickAddEmployee(targetRec.row);
                  }}
                />
              )}

              {/* Validation & Reconciliation Summary */}
              {summary && !isDeduction && (
                <ValidationSummary
                  summary={summary}
                  reconciliation={reconciliation}
                />
              )}

              {/* Deduction Table or Earning Table */}
              {isDeduction ? (
                <DeductionPreviewTable
                  records={deductionRecords}
                  pdfTotals={pdfDeductionTotals}
                  onQuickAddEmployee={quickAddEmployee}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Employee Earnings Preview &amp; Verification
                      </h3>
                      <p className="text-xs text-slate-500">
                        Verify extracted allowances and mapping before final import into database
                      </p>
                    </div>
                  </div>

                  <ExtractionPreviewTable
                    records={records}
                    onUpdateRecord={updateRecord}
                    onDeleteRecord={deleteRecord}
                    onQuickAddEmployee={quickAddEmployee}
                    onSyncMasterPayScale={syncMasterPayScale}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {batchMatrix ? (
              isImporting ? (
                <span>Saving batch to ledger...</span>
              ) : (
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">{batchMatrix.months.length}</strong> month(s)
                  &nbsp;&bull;&nbsp;
                  <strong className="text-slate-800 dark:text-slate-200">{batchMatrix.totalEmployees}</strong> employee record(s)
                  &nbsp;&bull;&nbsp;
                  <strong className="text-slate-800 dark:text-slate-200">{batchMatrix.totalFiles}</strong> file(s) ready
                </span>
              )
            ) : isReady ? (
              <span>
                Ready to import <strong className="text-slate-800 dark:text-slate-200">{activeCount}</strong> records for <strong>{metadata?.month}</strong>
              </span>
            ) : (
              <span>Upload PDF or select a sample bill to extract employee data</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {batchMatrix ? (
              <>
                <PbButton variant="secondary" icon={Trash2} onClick={handleClearBatch} disabled={isImporting}>
                  Clear
                </PbButton>
                <PbButton
                  variant="primary"
                  icon={Save}
                  onClick={handleSaveBatch}
                  disabled={isImporting || batchMatrix.months.length === 0}
                >
                  Save to Ledger
                </PbButton>
              </>
            ) : (
              <>
                <PbButton variant="secondary" onClick={onClose} disabled={isImporting}>
                  Cancel
                </PbButton>

                {isReady && (
                  <PbButton
                    variant="primary"
                    icon={Upload}
                    onClick={() => {
                      if (isDeduction) {
                        handleConfirmImport();
                      } else {
                        setShowConfirmModal(true);
                      }
                    }}
                    disabled={isImporting || (summary ? summary.errorCount > 0 : false) || Boolean(existingBill)}
                  >
                    Insert Data into Module ({activeCount} Records)
                  </PbButton>
                )}
              </>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {summary && metadata && !isDeduction && (
          <ImportConfirmationDialog
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleConfirmImport}
            isImporting={isImporting}
            summary={summary}
            metadata={metadata}
            existingBill={existingBill}
          />
        )}

        {/* OCR / Raw Text Fallback Modal */}
        <OcrFallbackModal
          isOpen={showOcrModal}
          onClose={() => setShowOcrModal(false)}
          onSubmitText={processRawText}
        />

        {/* Add unknown component to Component Master */}
        <ComponentFormModal
          open={showComponentForm}
          onClose={() => setShowComponentForm(false)}
          component={null}
          preset={componentPreset}
          onSaved={() => {
            if (componentPreset) {
              dismissUnknownComponent(componentPreset.componentCode || componentPreset.componentName);
            }
            setShowComponentForm(false);
            setComponentPreset(null);
          }}
        />
      </div>
    </div>
  );
};
import { CheckCircle2, AlertCircle, AlertTriangle, HelpCircle, Loader2, ArrowRight, X } from 'lucide-react';
import type { PayBillImportSummary, PayBillMetadata } from '../types';

interface ImportConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isImporting: boolean;
  summary: PayBillImportSummary;
  metadata: PayBillMetadata;
}

export function ImportConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isImporting,
  summary,
  metadata,
}: ImportConfirmationDialogProps) {
  if (!isOpen) return null;

  const hasCriticalErrors = summary.errorCount > 0;
  const hasDuplicates = summary.duplicateCount > 0;
  const hasUnmatched = summary.notFoundCount > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Confirm Pay Bill Import
              </h3>
              <p className="text-xs text-slate-500">
                Month: <b>{metadata.month}</b> &bull; Bill No: <b>{metadata.billNo || 'Srt0299002201'}</b>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">Total PDF Records:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{summary.totalRecords}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Matched with Master Employee:
            </span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{summary.matchedCount}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Not Found in Master:
            </span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{summary.notFoundCount}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> Duplicate HRPNs:
            </span>
            <span className="font-mono font-bold text-orange-700 dark:text-orange-300">{summary.duplicateCount}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Critical Math / Format Errors:
            </span>
            <span className={`font-mono font-bold ${summary.errorCount > 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
              {summary.errorCount}
            </span>
          </div>
        </div>

        {/* Warnings / Error Notices */}
        {hasCriticalErrors ? (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cannot Proceed with Import</p>
              <p className="text-[0.72rem] mt-0.5">
                There are {summary.errorCount} critical validation errors. Please edit or remove invalid records in the review table before importing.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {hasUnmatched && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{summary.notFoundCount} records are not yet registered in Master Data. They will be stored in paybill import history.</span>
              </div>
            )}
            {hasDuplicates && (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-2.5 rounded-lg flex items-center gap-2 text-orange-800 dark:text-orange-300">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Duplicate HRPN detected in file. Ensure this is intentional.</span>
              </div>
            )}
            <p className="text-slate-500 text-[0.72rem] leading-relaxed">
              Importing will store the original pay bill earning records and update monthly salary data for {summary.matchedCount} matched employees.
            </p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isImporting || hasCriticalErrors || summary.totalRecords === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing {summary.totalRecords} Records...
              </>
            ) : (
              <>
                Import {summary.totalRecords} Records <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

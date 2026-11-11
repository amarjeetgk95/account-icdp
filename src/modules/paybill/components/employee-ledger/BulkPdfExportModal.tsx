import { useState, useRef } from 'react';
import { Modal } from '@/shared/components/Modal';
import {
  FileArchive,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Filter,
  FileText,
} from 'lucide-react';
import {
  paybillPdfService,
  type BulkEmployeeExportProgress,
} from '../../services/paybillPdf.service';
import type { PaybillDirectoryEntry } from '../../hooks/useEmployeeDirectory';

export interface BulkPdfExportModalProps {
  open: boolean;
  onClose: () => void;
  financialYear: number;
  fyLabel: string;
  officeName?: string;
  allEmployees: PaybillDirectoryEntry[];
  filteredEmployees?: PaybillDirectoryEntry[];
}

export function BulkPdfExportModal({
  open,
  onClose,
  financialYear,
  fyLabel,
  officeName,
  allEmployees,
  filteredEmployees,
}: BulkPdfExportModalProps) {
  const hasFilterDifference =
    Boolean(filteredEmployees) &&
    filteredEmployees!.length > 0 &&
    filteredEmployees!.length < allEmployees.length;

  const [scope, setScope] = useState<'all' | 'filtered'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState<BulkEmployeeExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const targetEmployees =
    scope === 'filtered' && hasFilterDifference ? filteredEmployees! : allEmployees;

  const handleStartExport = async () => {
    setIsExporting(true);
    setIsCompleted(false);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await paybillPdfService.exportAllEmployeesLedgerPdfZip({
        officeName,
        financialYear,
        fyLabel,
        employees: targetEmployees,
        onProgress: (p) => setProgress(p),
        signal: controller.signal,
      });
      setIsCompleted(true);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setError('Export was cancelled.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to export employee statements.';
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
      title="Export All Employee PDFs (ZIP)"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs select-none">
        {/* Header Summary */}
        <div className="flex items-start gap-3 p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileArchive className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">
              Annual Financial Statement Package — FY {fyLabel}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Generate individual high-fidelity A4 Landscape PDF statements for employees and package them into a single downloadable .zip archive.
            </p>
          </div>
        </div>

        {/* Scope Selection (when active filters exist) */}
        {!isExporting && !isCompleted && hasFilterDifference && (
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Select Employees to Include:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                  scope === 'all'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 ring-1 ring-blue-600/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold">All Employees</div>
                  <div className="text-slate-500 text-2xs mt-0.5">
                    {allEmployees.length} employees in directory
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                  scope === 'filtered'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 ring-1 ring-blue-600/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Filter className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold">Filtered Employees</div>
                  <div className="text-slate-500 text-2xs mt-0.5">
                    {filteredEmployees!.length} matching search/filter
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Feature Highlights when Idle */}
        {!isExporting && !isCompleted && (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Archive Contents Preview</span>
              <span className="font-mono text-2xs font-semibold px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                Employee_Ledgers_FY{fyLabel}.zip
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>
                  <strong>{targetEmployees.length}</strong> individual PDF files, one per employee.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 shrink-0" />
                <span>
                  Standardized file naming: <code className="text-2xs bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">Employee_Ledger_[HRPN]_[Name]_FY{fyLabel}.pdf</code>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 shrink-0" />
                <span>
                  Includes 12-Month allowances matrix, deductions, arrears, and net take-home pay.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Active Exporting Progress */}
        {isExporting && progress && (
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>
                  {progress.status === 'preparing' && 'Preparing annual employee records...'}
                  {progress.status === 'generating' && `Generating PDF ${progress.current} of ${progress.total}`}
                  {progress.status === 'zipping' && 'Compressing into ZIP archive...'}
                  {progress.status === 'completed' && 'Finishing download...'}
                </span>
              </div>
              <span className="tabular-nums font-mono text-blue-600 dark:text-blue-400 font-bold">
                {percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {progress.currentEmployeeName && progress.status === 'generating' && (
              <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                Processing: <strong className="text-slate-700 dark:text-slate-200">{progress.currentEmployeeName}</strong>
              </div>
            )}
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
              Successfully generated <strong>{targetEmployees.length}</strong> employee PDF statements and downloaded <strong>Employee_Ledgers_FY{fyLabel}.zip</strong>.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {isExporting ? (
            <button
              type="button"
              onClick={handleCancelExport}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel Export
            </button>
          ) : isCompleted ? (
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleModalClose}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleStartExport()}
                disabled={targetEmployees.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Start Export ({targetEmployees.length} PDFs)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

import React from 'react';
import type { BatchFileItem } from '../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Trash2,
  Calendar,
  Layers,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { PbButton } from './ui';

interface BatchImportQueueProps {
  queue: BatchFileItem[];
  isBatchProcessing: boolean;
  onProcessQueue: () => void;
  onClearQueue: () => void;
  onRemoveItem: (id: string) => void;
  onSelectFileToPreview: (item: BatchFileItem) => void;
  selectedFileId?: string | null;
  onRetryFailed?: () => void;
}

export const BatchImportQueue: React.FC<BatchImportQueueProps> = ({
  queue,
  isBatchProcessing,
  onProcessQueue,
  onClearQueue,
  onRemoveItem,
  onSelectFileToPreview,
  selectedFileId,
  onRetryFailed,
}) => {
  if (queue.length === 0) return null;

  const completedCount = queue.filter((f) => f.status === 'SUCCESS').length;
  const errorCount = queue.filter((f) => f.status === 'ERROR').length;
  const blockedCount = queue.filter((f) => f.status === 'BLOCKED').length;
  const pendingCount = queue.filter((f) => f.status === 'PENDING').length;
  const progressPercent = Math.round((completedCount / queue.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center font-bold">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Multi-Month Batch Upload Queue ({queue.length} Files)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completedCount} of {queue.length} processed
              {errorCount > 0 && <> &bull; <span className="text-red-500">{errorCount} error</span></>}
              {blockedCount > 0 && <> &bull; <span className="text-amber-600">{blockedCount} blocked</span></>}
              {pendingCount > 0 && <> &bull; <span className="text-slate-500">{pendingCount} pending</span></>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(errorCount > 0 || blockedCount > 0) && onRetryFailed && (
            <PbButton variant="secondary" icon={RotateCcw} onClick={onRetryFailed} disabled={isBatchProcessing} title="Reset failed/blocked files to pending for retry">
              Retry Failed
            </PbButton>
          )}
          <PbButton variant="secondary" icon={Trash2} onClick={onClearQueue} disabled={isBatchProcessing}>
            Clear Queue
          </PbButton>

          <PbButton
            variant="primary"
            icon={Play}
            onClick={onProcessQueue}
            disabled={isBatchProcessing || (completedCount === queue.length && blockedCount === 0 && errorCount === 0)}
          >
            {isBatchProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Processing Queue...
              </>
            ) : (
              <>Process All ({queue.length})</>
            )}
          </PbButton>
        </div>
      </div>

      {/* Progress Bar */}
      {isBatchProcessing && (
        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5">
          <div
            className="bg-blue-600 h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Files List Table */}
      <div className="divide-y divide-slate-100 dark:divide-slate-750 max-h-64 overflow-y-auto">
        {queue.map((item, idx) => {
          const isSelected = selectedFileId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => item.status === 'SUCCESS' && onSelectFileToPreview(item)}
              className={`p-3 flex items-center justify-between gap-3 text-xs transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-blue-950/30 font-semibold'
                  : 'hover:bg-slate-50/60 dark:hover:bg-slate-750/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-slate-400 font-mono w-4">{idx + 1}</span>
                <FileSpreadsheet size={18} className="text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 text-[0.7rem] text-slate-500 mt-0.5">
                    <span>{(item.size / 1024).toFixed(1)} KB</span>
                    {item.month && (
                      <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.2 rounded">
                        <Calendar size={10} /> {item.month}
                      </span>
                    )}
                    {item.recordCount !== undefined && (
                      <span>&bull; {item.recordCount} Employees</span>
                    )}
                    {item.grossTotal !== undefined && item.grossTotal > 0 && (
                      <span>&bull; Gross: ₹{item.grossTotal.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.confidence !== undefined && item.status !== 'PENDING' && item.status !== 'PARSING' && (
                  <span
                    className={`hidden sm:inline px-1.5 py-0.5 rounded text-[0.6rem] font-mono font-bold border ${
                      (item.confidence ?? 100) < 60
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
                        : (item.confidence ?? 100) < 80
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                    title={`Extraction confidence ${item.confidence}%`}
                  >
                    {item.confidence}%
                  </span>
                )}
                {item.status === 'PENDING' && (
                  <span className="px-2 py-0.5 rounded text-[0.7rem] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Ready
                  </span>
                )}
                {item.status === 'PARSING' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    <Loader2 size={11} className="animate-spin" /> Parsing...
                  </span>
                )}
                {item.status === 'SUCCESS' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                    <CheckCircle2 size={12} /> Parsed
                  </span>
                )}
                {item.status === 'ERROR' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-semibold bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200" title={item.error}>
                    <AlertCircle size={12} /> Error
                  </span>
                )}
                {item.status === 'BLOCKED' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" title={item.error}>
                    <ShieldAlert size={12} /> Blocked
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                  title="Remove from queue"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

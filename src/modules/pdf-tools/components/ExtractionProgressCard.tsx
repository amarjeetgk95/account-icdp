import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { OcrProgressState } from '../types';

interface ExtractionProgressCardProps {
  progress: OcrProgressState;
}

export const ExtractionProgressCard: React.FC<ExtractionProgressCardProps> = ({ progress }) => {
  const isCompleted = progress.stage === 'completed';
  const isError = progress.stage === 'error';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isError
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                : isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600'
            }`}
          >
            {isError ? (
              <AlertCircle size={18} />
            ) : isCompleted ? (
              <CheckCircle2 size={18} />
            ) : (
              <Loader2 size={18} className="animate-spin" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
              {progress.stage.replace(/_/g, ' ')}
            </h4>
            <p className="text-[0.72rem] text-slate-500">
              {progress.currentMessage || 'Processing document...'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
            {progress.progressPercent}%
          </span>
          <p className="text-[0.65rem] text-slate-400 font-medium">
            Page {progress.currentPage} of {progress.totalPages}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isError
              ? 'bg-rose-500'
              : isCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
          style={{ width: `${Math.max(5, Math.min(100, progress.progressPercent))}%` }}
        />
      </div>

      {isError && progress.error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg">
          {progress.error}
        </p>
      )}
    </div>
  );
};

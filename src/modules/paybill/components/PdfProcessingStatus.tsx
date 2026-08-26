import { Check, Loader2, AlertCircle, FileText, Search, Table, Key, Users, CheckCircle2 } from 'lucide-react';
import type { PayBillProcessingState, ProcessingStage } from '../types';

interface PdfProcessingStatusProps {
  state: PayBillProcessingState;
}

const STAGES: Array<{
  id: ProcessingStage;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'UPLOADED', label: 'PDF Uploaded', icon: FileText },
  { id: 'READING', label: 'Reading PDF', icon: Search },
  { id: 'DETECTING_TABLE', label: 'Detecting Table', icon: Table },
  { id: 'EXTRACTING_HRPN', label: 'Extracting HRPN', icon: Key },
  { id: 'MAPPING_EMPLOYEES', label: 'Mapping Employees', icon: Users },
  { id: 'VALIDATING_DATA', label: 'Validating Data', icon: CheckCircle2 },
  { id: 'READY', label: 'Ready for Review', icon: Check },
];

export function PdfProcessingStatus({ state }: PdfProcessingStatusProps) {
  if (state.stage === 'IDLE') return null;

  const currentIdx = STAGES.findIndex((s) => s.id === state.stage);
  const isError = state.stage === 'ERROR';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isError ? (
            <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
          ) : state.stage === 'READY' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          )}
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {isError ? 'Extraction Error' : state.stageName}
          </h4>
        </div>
        <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
          {state.progress}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isError
              ? 'bg-red-500'
              : state.stage === 'READY'
              ? 'bg-emerald-500'
              : 'bg-blue-600'
          }`}
          style={{ width: `${state.progress}%` }}
        />
      </div>

      {state.details && (
        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          {state.details}
        </p>
      )}

      {/* Stage Flow Stepper */}
      <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {STAGES.map((s, idx) => {
          const Icon = s.icon;
          const isCompleted = state.stage === 'READY' || (currentIdx !== -1 && idx < currentIdx);
          const isCurrent = state.stage === s.id;

          let statusClass = 'bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60';
          if (isCompleted) {
            statusClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 font-medium';
          } else if (isCurrent) {
            statusClass = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold ring-2 ring-blue-500/20';
          }

          return (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-all ${statusClass}`}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              ) : (
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
              )}
              <span className="truncate text-[0.72rem] leading-tight">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

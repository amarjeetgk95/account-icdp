import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { MappingStatus } from '../types';

interface MappingStatusBadgeProps {
  status: MappingStatus;
  nameMismatch?: boolean;
  message?: string;
}

export function MappingStatusBadge({ status, nameMismatch, message }: MappingStatusBadgeProps) {
  switch (status) {
    case 'MATCHED':
      return (
        <span
          title={message || (nameMismatch ? 'HRPN matched, but employee name differs' : 'HRPN matched with Master')}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            nameMismatch
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          }`}
        >
          {nameMismatch ? (
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          )}
          MATCHED
          {nameMismatch && <span className="text-[0.65rem] font-normal underline decoration-dotted">name diff</span>}
        </span>
      );

    case 'NOT_FOUND':
      return (
        <span
          title={message || 'HRPN not found in master employee dataset'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
        >
          <HelpCircle className="w-3 h-3 text-amber-500" />
          NOT_FOUND
        </span>
      );

    case 'DUPLICATE':
      return (
        <span
          title={message || 'Duplicate HRPN detected in this bill'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
        >
          <AlertTriangle className="w-3 h-3 text-orange-600" />
          DUPLICATE
        </span>
      );

    case 'INVALID_HRPN':
      return (
        <span
          title={message || 'Invalid or missing HRPN'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
        >
          <XCircle className="w-3 h-3 text-red-500" />
          INVALID_HRPN
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

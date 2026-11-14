import { X, Clock, Shield, User, History, ArrowRight } from 'lucide-react';
import { GRModal } from './GRModal';
import type { GRAuditLog } from '../types';

interface GRAuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: GRAuditLog[];
  grNumber?: string;
  isLoading?: boolean;
}

function getActionBadgeColor(action: string) {
  switch (action) {
    case 'CREATED':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';
    case 'UPDATED':
    case 'PDF_REPLACED':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200';
    case 'VISIBILITY_CHANGED':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200';
    case 'ARCHIVED':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200';
    case 'RESTORED':
      return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200';
    case 'DELETED':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
  }
}

export function GRAuditTrailModal({
  isOpen,
  onClose,
  logs,
  grNumber,
  isLoading,
}: GRAuditTrailModalProps) {
  return (
    <GRModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      maxHeightClass="max-h-[85vh]"
      ariaLabelledBy="gr-audit-title"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <History size={18} />
          </div>
          <div>
            <h3 id="gr-audit-title" className="text-xs font-bold text-slate-900 dark:text-white">
              Audit Trail & History
            </h3>
            {grNumber && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resolution: <strong className="text-slate-700 dark:text-slate-300">{grNumber}</strong>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No audit logs recorded for this document yet.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-bold uppercase rounded-md border ${getActionBadgeColor(
                      log.action
                    )}`}
                  >
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  {log.previous_visibility && log.new_visibility && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <span className="capitalize">{log.previous_visibility}</span>
                      <ArrowRight size={11} />
                      <span className="capitalize font-bold text-indigo-600 dark:text-indigo-400">
                        {log.new_visibility}
                      </span>
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={12} />
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span className="flex items-center gap-1.5">
                  {log.user_role === 'admin' ? (
                    <Shield size={12} className="text-amber-500" />
                  ) : (
                    <User size={12} className="text-slate-400" />
                  )}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {log.user_email || 'System User'}
                  </span>
                  <span className="text-xs uppercase font-bold text-slate-400">
                    ({log.user_role || 'Office'})
                  </span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </GRModal>
  );
}

import React, { useEffect, useState } from 'react';
import { X, History, Calendar, FileText, User, Layers, RefreshCw, AlertCircle } from 'lucide-react';
import type { PositionHistoryEntry } from '../types';
import {
  fetchEmployeePostingHistory,
  fetchPositionIncumbencyHistory,
} from '../repositories/positionBackend.repository';
import { useDialogBehaviour } from '@/shared/hooks/useDialogBehaviour';

export type PostingHistoryTarget =
  | { type: 'EMPLOYEE'; id: string; name: string; hrpn?: string }
  | { type: 'POSITION'; id: string; positionNo: string; postName: string };

interface PostingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PostingHistoryTarget | null;
}

export const PostingHistoryModal: React.FC<PostingHistoryModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const panelRef = useDialogBehaviour(onClose, isOpen);

  const [entries, setEntries] = useState<PositionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !target) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    const loadHistory = async () => {
      try {
        const data =
          target.type === 'EMPLOYEE'
            ? await fetchEmployeePostingHistory(target.id)
            : await fetchPositionIncumbencyHistory(target.id);

        if (isMounted) {
          setEntries(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to load posting history');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const isEmployeeMode = target.type === 'EMPLOYEE';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl focus:outline-none sm:max-h-[90vh] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-10 w-10 shrink-0 rounded-xl bg-blue-50 border border-blue-100 sm:flex items-center justify-center text-blue-600">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">
                {isEmployeeMode
                  ? 'Employee Posting Timeline'
                  : 'Position Incumbency Register'}
              </h2>
              <p className="truncate text-xs text-slate-500 font-medium">
                {isEmployeeMode
                  ? `${target.name} (HRPN: ${target.hrpn || '—'})`
                  : `Position No. ${target.positionNo} • ${target.postName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium text-slate-500">Loading history records...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No posting history records found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEmployeeMode
                  ? 'No transfer or posting changes have been logged for this employee yet.'
                  : 'No prior occupancy records are available for this position yet.'}
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {entries.map((item, idx) => {
                const isCurrent = !item.endDate;
                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white transition-all ${
                        isCurrent
                          ? 'border-emerald-600 ring-4 ring-emerald-100'
                          : 'border-slate-400 group-hover:border-blue-600'
                      }`}
                    />

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isEmployeeMode ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                              <Layers className="h-3 w-3" />
                              {item.positionNo !== '-' ? `Position #${item.positionNo}` : 'Position'} • {item.designationTitleGu}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                              <User className="h-3 w-3" />
                              {item.employeeNameGu || item.employeeName} (HRPN: {item.hrpnNo || '—'})
                            </span>
                          )}

                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Current (Active)
                            </span>
                          ) : item.relieveReason ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {item.relieveReason === 'TRANSFERRED'
                                ? 'Transferred'
                                : item.relieveReason === 'RETIRED'
                                ? 'Retired'
                                : item.relieveReason === 'PROMOTED'
                                ? 'Promoted'
                                : item.relieveReason}
                            </span>
                          ) : null}
                        </div>

                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.startDate}</span>
                          <span>→</span>
                          <span>{item.endDate || 'Present'}</span>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                        {item.budgetHeadName && (
                          <div>
                            <span className="text-slate-400">Budget Head: </span>
                            <span className="font-medium text-slate-700">{item.budgetHeadName}</span>
                          </div>
                        )}
                        {item.orderNo && (
                          <div className="flex items-center gap-1 font-mono">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-400">Order No: </span>
                            <span className="font-semibold text-slate-800">{item.orderNo}</span>
                            {item.orderDate && <span className="text-slate-400">({item.orderDate})</span>}
                          </div>
                        )}
                        {item.remarks && (
                          <div className="sm:col-span-2 text-slate-500 italic">
                            <span className="text-slate-400">Remarks: </span>
                            {item.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50/70 px-4 pb-safe pt-3 sm:px-6 sm:py-3.5">
          <button
            onClick={onClose}
            className="min-h-[42px] w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

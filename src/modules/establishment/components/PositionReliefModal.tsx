import React, { useState } from 'react';
import { X, Check, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import type { EstablishmentRecord } from '../types';
import { todayISODate } from '@/shared/utilities/date';
import { HrpnLookupInput, EmployeeHrpnHit } from './HrpnLookupInput';
import { useDialogBehaviour } from '@/shared/hooks/useDialogBehaviour';
import { relieveAndReassignPosition } from '../repositories/positionBackend.repository';

interface PositionReliefModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: EstablishmentRecord | null;
  onSuccess: () => void;
}

export const PositionReliefModal: React.FC<PositionReliefModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const panelRef = useDialogBehaviour(onClose, isOpen);

  const [relieveDate, setRelieveDate] = useState(todayISODate());
  const [reason, setReason] = useState<'TRANSFERRED' | 'RETIRED' | 'RESIGNED' | 'PROMOTED'>('TRANSFERRED');
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const [assignSuccessor, setAssignSuccessor] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null);
  const [newHrpn, setNewHrpn] = useState('');
  const [newEmployeeNameGu, setNewEmployeeNameGu] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleSuccessorPick = (hit: EmployeeHrpnHit) => {
    setNewEmployeeId(hit.id);
    setNewHrpn(hit.hrpn);
    setNewEmployeeNameGu(hit.nameGu);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (assignSuccessor && !newEmployeeId) {
      setErrorMsg('Please select a successor employee.');
      return;
    }

    try {
      setSubmitting(true);
      await relieveAndReassignPosition({
        positionId: record.id,
        relieveDate,
        reason,
        orderNo: orderNo.trim() || undefined,
        orderDate: orderDate || undefined,
        newEmployeeId: assignSuccessor ? newEmployeeId : null,
        remarks: remarks.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process handover');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-white shadow-2xl focus:outline-none sm:max-h-[90vh] sm:rounded-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-amber-50 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">
                Position Handover &amp; Relief
              </h2>
              <p className="truncate text-xs font-mono text-slate-500">
                {record.positionNo} • {record.postName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 sm:mx-6">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 text-xs sm:px-6">
          {/* Incumbent card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Current Occupant:</span>
            <div className="mt-1 flex justify-between items-center">
              <span className="font-bold text-slate-900 text-sm">{record.employeeName}</span>
              <span className="font-mono text-slate-600">{record.hrpnNo}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Relief Date *</label>
              <input
                type="date"
                value={relieveDate}
                onChange={(e) => setRelieveDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Relieve Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 font-medium"
              >
                <option value="TRANSFERRED">Transferred</option>
                <option value="RETIRED">Retired</option>
                <option value="PROMOTED">Promoted</option>
                <option value="RESIGNED">Resigned</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Order No.</label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="Order number..."
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Order Date</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
              />
            </div>
          </div>

          {/* Handover toggle */}
          <div className="border-t border-slate-200 pt-3">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={assignSuccessor}
                onChange={(e) => setAssignSuccessor(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 h-4 w-4"
              />
              <span>Assign successor immediately</span>
            </label>
            <p className="text-[11px] text-slate-500 ml-6">
              Leave unchecked if the post will remain Vacant.
            </p>
          </div>

          {assignSuccessor && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <label className="block font-semibold text-slate-700">
                Successor HRPN No. (Search &amp; Pick) *
              </label>
              <HrpnLookupInput
                value={newHrpn}
                onChange={setNewHrpn}
                onPick={handleSuccessorPick}
                placeholder="Enter successor HRPN..."
              />
              {newEmployeeNameGu && (
                <div className="text-emerald-700 font-semibold mt-1">
                  Selected: {newEmployeeNameGu} ({newHrpn})
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700">Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Handover remarks..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
            />
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 pb-safe pt-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-amber-700 sm:w-auto"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? 'Processing...' : 'Execute Handover'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

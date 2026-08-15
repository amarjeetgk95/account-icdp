import React, { useState, useEffect } from 'react';
import type { PayBillMetadata, PayBillTotalRow } from '../types';
import { paybillRepository } from '../repositories/paybill.repository';
import {
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';

interface PostToLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: PayBillMetadata | null;
  totals: PayBillTotalRow | null;
  financialYear: number;
  onSuccess?: (voucherNo: string) => void;
}

export const PostToLedgerModal: React.FC<PostToLedgerModalProps> = ({
  isOpen,
  onClose,
  metadata,
  totals,
  financialYear,
  onSuccess,
}) => {
  const [voucherDate, setVoucherDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [remarks, setRemarks] = useState<string>('Monthly salary bill expenditure posting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postedVoucher, setPostedVoucher] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If a voucher was already posted for this month, surface it instead of allowing a duplicate
  useEffect(() => {
    if (!isOpen || !metadata) return;
    let cancelled = false;
    paybillRepository
      .getPostedVoucher(metadata.month, financialYear)
      .then((v) => {
        if (cancelled) return;
        setPostedVoucher(v ? v.voucherNo : null);
        setError(null);
      })
      .catch(() => {
        // non-fatal; posting will dedupe at the repository level anyway
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, metadata, financialYear]);

  if (!isOpen || !metadata || !totals) return null;

  const handlePost = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await paybillRepository.postPayBillToLedger({
        month: metadata.month,
        financialYear,
        billNo: metadata.billNo,
        voucherDate,
        majorHead: metadata.majorHead || '2403-00-101-02-00',
        grossTotal: totals.grossAmount,
        basicPayTotal: totals.basicPay,
        daTotal: totals.da,
        hraTotal: totals.hra,
        claTotal: totals.cla,
        medTotal: totals.medicalAllowance,
        transTotal: totals.transportAllowance,
        specialPayTotal: totals.specialPay || 0,
        washingTotal: totals.washingAllowance || 0,
        nppTotal: totals.nonPrivatePracticeAllowance || 0,
        remarks,
      });

      setPostedVoucher(res.voucherNo);
      if (onSuccess) onSuccess(res.voucherNo);
    } catch (err: any) {
      setError(err.message || 'Failed to post salary voucher to ledger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Post Salary to Accounting Ledger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate expenditure journal voucher for {metadata.month}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {postedVoucher ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                Salary Voucher Successfully Posted!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Voucher Number: <strong className="font-mono">{postedVoucher}</strong>
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Major Head & Bill Details */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[0.7rem]">Major Budget Head</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {metadata.majorHead || '2403-00-101-02-00'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[0.7rem]">Bill Number</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {metadata.billNo}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[0.7rem]">Month / FY</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {metadata.month} (FY {financialYear})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[0.7rem]">Total Gross Amount</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    ₹{totals.grossAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Object Head Distribution */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-750 px-3 py-2 font-bold text-slate-700 dark:text-slate-200">
                  Object Head Breakdown
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-750 text-[0.72rem]">
                  <div className="px-3 py-1.5 flex justify-between">
                    <span>(0101) Pay / Basic Pay</span>
                    <span className="font-mono font-semibold">₹{totals.basicPay.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span>(0103) Dearness Allowance (DA)</span>
                    <span className="font-mono font-semibold">₹{totals.da.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span>(0110) House Rent Allowance (HRA)</span>
                    <span className="font-mono font-semibold">₹{totals.hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span>(0111) Compensatory Local Allowance (CLA)</span>
                    <span className="font-mono font-semibold">₹{totals.cla.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span>(0107) Medical Allowance</span>
                    <span className="font-mono font-semibold">₹{totals.medicalAllowance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span>(0113) Transport Allowance</span>
                    <span className="font-mono font-semibold">₹{totals.transportAllowance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Voucher Date & Remarks */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Narration / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!postedVoucher && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Posting...
                </>
              ) : (
                <>
                  <Send size={14} /> Post to Ledger
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

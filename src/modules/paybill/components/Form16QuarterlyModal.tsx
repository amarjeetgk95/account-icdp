import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/shared/components/Modal';
import { toast } from '@/shared/components/Toast';
import { useForm16Office24Q } from '../hooks/useForm16';
import { Landmark, Save, RefreshCw, Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';
import type { Form16Office24QSettings, Form16Quarter } from '../types/form16';
import { FORM16_QUARTERS, EMPTY_FORM16_24Q_SETTINGS } from '../types/form16';

interface Form16QuarterlyModalProps {
  open: boolean;
  onClose: () => void;
  financialYear: number;
  onSuccess?: () => void;
}

const QUARTER_DETAILS: Record<
  Form16Quarter,
  { label: string; months: string; filingDue: string }
> = {
  Q1: { label: 'Quarter 1', months: 'April – June', filingDue: '31st July' },
  Q2: { label: 'Quarter 2', months: 'July – September', filingDue: '31st October' },
  Q3: { label: 'Quarter 3', months: 'October – December', filingDue: '31st January' },
  Q4: { label: 'Quarter 4', months: 'January – March', filingDue: '31st May' },
};

export function Form16QuarterlyModal({
  open,
  onClose,
  financialYear,
  onSuccess,
}: Form16QuarterlyModalProps) {
  const { settings, isLoading, saveAsync, isSaving, applyToAllAsync, isApplying } =
    useForm16Office24Q(financialYear);

  const [formState, setFormState] = useState<Form16Office24QSettings>(() =>
    EMPTY_FORM16_24Q_SETTINGS(financialYear)
  );

  useEffect(() => {
    if (settings) {
      setFormState(settings);
    } else {
      setFormState(EMPTY_FORM16_24Q_SETTINGS(financialYear));
    }
  }, [settings, financialYear]);

  const updateQuarter = (
    quarter: Form16Quarter,
    field: 'receiptNumber' | 'filingDate' | 'challanHeading',
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          [field]: value,
        },
      },
    }));
  };

  const handleSaveAndApply = async () => {
    try {
      await saveAsync(formState);
      const updatedCount = await applyToAllAsync(formState);
      toast.success(
        `24Q Quarterly Return details saved and applied to ${updatedCount} employee certificates.`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save 24Q Quarterly settings.'
      );
    }
  };

  const fyLabel = `${financialYear}-${String(financialYear + 1).slice(-2)}`;

  // Count configured quarters
  const filledCount = useMemo(() => {
    return FORM16_QUARTERS.filter((q) => Boolean(formState.quarters[q]?.receiptNumber?.trim())).length;
  }, [formState]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Office 24Q Quarterly Return Manager"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Info Banner & Progress */}
        <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Landmark className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" size={20} />
            <div className="text-xs text-blue-950 dark:text-blue-200 space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-100">
                Office-Wide 24Q Acknowledgment Numbers (FY {fyLabel})
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Quarterly 24Q TDS filing acknowledgment / receipt numbers are uniform across all employees in the DDO office. Updating them here applies them across all active Form 16 certificates.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 shadow-2xs">
              {filledCount} / 4 Configured
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading 24Q settings…</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {FORM16_QUARTERS.map((q) => {
              const info = QUARTER_DETAILS[q];
              const current = formState.quarters[q] || { receiptNumber: '', filingDate: '' };
              const isFilled = Boolean(current.receiptNumber?.trim());

              return (
                <div
                  key={q}
                  className="p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xs space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                        {q}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {info.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">({info.months})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 hidden sm:inline-flex">
                        <Calendar size={11} /> Due: {info.filingDue}
                      </span>
                      {isFilled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={11} /> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          <Clock size={11} /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <div>
                      <label className="block text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                        24Q Receipt / Token Number *
                      </label>
                      <div className="relative">
                        <FileText
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          value={current.receiptNumber}
                          onChange={(e) =>
                            updateQuarter(
                              q,
                              'receiptNumber',
                              e.target.value.toUpperCase().trim()
                            )
                          }
                          placeholder="e.g. QWBYJLWA"
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                        Date of Filing / Book Entry (Optional)
                      </label>
                      <input
                        value={current.filingDate}
                        onChange={(e) => updateQuarter(q, 'filingDate', e.target.value)}
                        placeholder="e.g. 15-Jul-2025"
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || isApplying || isLoading}
            onClick={() => void handleSaveAndApply()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isSaving || isApplying ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Applying to All Employees…
              </>
            ) : (
              <>
                <Save size={13} />
                Save & Apply to All FY {fyLabel} Form-16s
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

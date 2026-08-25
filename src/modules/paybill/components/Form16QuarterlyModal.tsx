import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/Modal';
import { toast } from '@/shared/components/Toast';
import { useForm16Office24Q } from '../hooks/useForm16';
import { Landmark, Save, RefreshCw, Calendar, FileText } from 'lucide-react';
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
  Q1: { label: 'Quarter 1', months: 'March – May (Paid Apr–Jun)', filingDue: '31st July' },
  Q2: { label: 'Quarter 2', months: 'June – August (Paid Jul–Sep)', filingDue: '31st October' },
  Q3: { label: 'Quarter 3', months: 'September – November (Paid Oct–Dec)', filingDue: '31st January' },
  Q4: { label: 'Quarter 4', months: 'December – February (Paid Jan–Mar)', filingDue: '31st May' },
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Office 24Q Quarterly Return Manager"
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-start gap-3">
          <Landmark className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" size={18} />
          <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-semibold">
              Office-Wide 24Q Acknowledgment Numbers (FY {fyLabel})
            </p>
            <p className="text-blue-800 dark:text-blue-300">
              In Form-16 Part A, all employees share the same 24Q TDS filing acknowledgment /
              receipt numbers per quarter. Setting them here automatically updates all active
              employee Form-16 certificates for this financial year.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading 24Q settings…</div>
        ) : (
          <div className="space-y-3">
            {FORM16_QUARTERS.map((q) => {
              const info = QUARTER_DETAILS[q];
              const current = formState.quarters[q] || { receiptNumber: '', filingDate: '' };
              return (
                <div
                  key={q}
                  className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
                        {q}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {info.label}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">({info.months})</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar size={11} /> Due: {info.filingDue}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
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

import React, { useEffect, useState } from 'react';
import { X, Save, Plus, Percent, Landmark, Wallet, ArrowDownCircle, Settings2, ChevronUp, ChevronDown, RotateCcw, Lock } from 'lucide-react';
import { PbButton } from './ui';
import { orderedKeyList } from '../utils/columnOrder';
import { paybillRepository } from '../repositories/paybill.repository';
import { PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import type { PayBillSettings } from '../types';

interface PayBillSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: PayBillSettings) => void;
}

const fieldClass =
  'w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

export const PayBillSettingsModal: React.FC<PayBillSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<PayBillSettings | null>(null);
  const [daRatesText, setDaRatesText] = useState('50, 53, 46, 42, 38');
  const [manualAllowances, setManualAllowances] = useState<string[]>([]);
  const [manualDeductions, setManualDeductions] = useState<string[]>([]);
  const [earningOrder, setEarningOrder] = useState<string[]>([]);
  const [deductionOrder, setDeductionOrder] = useState<string[]>([]);
  const [newAllowanceName, setNewAllowanceName] = useState('');
  const [newDeductionName, setNewDeductionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    paybillRepository
      .getSettings()
      .then((s) => {
        setForm(s);
        setDaRatesText(s.daRates.length > 0 ? s.daRates.join(', ') : '50, 53, 46, 42, 38');
        setManualAllowances(s.manualAllowances || []);
        setManualDeductions(s.manualDeductions || []);
        setEarningOrder(s.earningColumnOrder || []);
        setDeductionOrder(s.deductionColumnOrder || []);
        setNewAllowanceName('');
        setNewDeductionName('');
        setError(null);
      })
      .catch(() => {
        setError('Could not load settings.');
      });
  }, [isOpen]);

  if (!isOpen || !form) return null;

  const set = (key: keyof PayBillSettings, value: string | number | undefined) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const earningBaseKeys = PAYBILL_EARNING_COLUMNS.filter((c) => c.key !== 'grossAmount').map((c) => c.key);
  const deductionBaseKeys = PAYBILL_DEDUCTION_COLUMNS.filter(
    (c) => c.key !== 'totalDeductions' && c.key !== 'netPay'
  ).map((c) => c.key);

  const earningOrderedKeys = orderedKeyList(earningBaseKeys, manualAllowances, earningOrder);
  const deductionOrderedKeys = orderedKeyList(deductionBaseKeys, manualDeductions, deductionOrder);

  const addParameter = (
    list: string[],
    setList: (v: string[]) => void,
    setOrder: React.Dispatch<React.SetStateAction<string[]>>,
    name: string
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (list.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return;
    setList([...list, trimmed]);
    setOrder((prev) => (prev.length > 0 ? [...prev, `manual::${trimmed}`] : prev));
  };

  const removeParameter = (
    list: string[],
    setList: (v: string[]) => void,
    setOrder: React.Dispatch<React.SetStateAction<string[]>>,
    name: string
  ) => {
    setList(list.filter((p) => p !== name));
    setOrder((prev) => prev.filter((k) => k !== `manual::${name}`));
  };

  const moveKey = (
    order: string[],
    setOrder: (v: string[]) => void,
    keys: string[],
    idx: number,
    dir: -1 | 1
  ) => {
    const next = order.length > 0 ? [...order] : [...keys];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
  };

  const handleSave = async () => {
    const daRates = daRatesText
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !Number.isNaN(n));

    if (daRates.length === 0) {
      setError('Enter at least one DA rate.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const saved = await paybillRepository.saveSettings({
        ...form,
        daRates,
        daHikeThreshold: Number(form.daHikeThreshold) || 50,
        basicPayChangeTolerance: Number(form.basicPayChangeTolerance) || 10,
        manualAllowances,
        manualDeductions,
        earningColumnOrder: earningOrder,
        deductionColumnOrder: deductionOrder,
      });
      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pay Bill Settings
              </h3>
              <p className="text-[0.7rem] text-slate-500 mt-0.5">
                DA rates & bill metadata defaults used by imports, audit and ledger posting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1 overflow-y-auto app-scroll">
          {/* DA / Audit settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50/80 to-slate-50/40 dark:from-indigo-950/30 dark:to-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                DA Rates & Audit
              </h4>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  DA Rates for this Financial Year (%)
                </label>
                <input
                  type="text"
                  value={daRatesText}
                  onChange={(e) => setDaRatesText(e.target.value)}
                  placeholder="e.g. 50, 53, 46, 42, 38"
                  className={fieldClass}
                />
                <p className="text-[0.65rem] text-slate-400 mt-1">
                  Comma-separated. Rates outside this list raise an audit INFO flag.
                </p>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  DA Hike Alert Above (%)
                </label>
                <input
                  type="number"
                  value={form.daHikeThreshold}
                  onChange={(e) => set('daHikeThreshold', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Basic Pay Change Tolerance (%)
                </label>
                <input
                  type="number"
                  value={form.basicPayChangeTolerance}
                  onChange={(e) => set('basicPayChangeTolerance', e.target.value)}
                  className={fieldClass}
                />
                <p className="text-[0.65rem] text-slate-400 mt-1">
                  Month-over-month basic-pay delta that raises an audit WARNING.
                </p>
              </div>
            </div>
          </div>

          {/* Bill metadata defaults */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50/80 to-slate-50/40 dark:from-blue-950/30 dark:to-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Bill Metadata Defaults
              </h4>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Default Bill No
                </label>
                <input
                  type="text"
                  value={form.billNo || ''}
                  onChange={(e) => set('billNo', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Major Head
                </label>
                <input
                  type="text"
                  value={form.majorHead || ''}
                  onChange={(e) => set('majorHead', e.target.value)}
                  placeholder="2403-00-101-02-00"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  DDO HRPN
                </label>
                <input
                  type="text"
                  value={form.ddoHrpn || ''}
                  onChange={(e) => set('ddoHrpn', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  DDO Name
                </label>
                <input
                  type="text"
                  value={form.ddoName || ''}
                  onChange={(e) => set('ddoName', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Office Name
                </label>
                <input
                  type="text"
                  value={form.officeName || ''}
                  onChange={(e) => set('officeName', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  DDO Code
                </label>
                <input
                  type="text"
                  value={form.ddoCode || ''}
                  onChange={(e) => set('ddoCode', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={form.department || ''}
                  onChange={(e) => set('department', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  TAN No
                </label>
                <input
                  type="text"
                  value={form.tanNo || ''}
                  onChange={(e) => set('tanNo', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Cardex No
                </label>
                <input
                  type="text"
                  value={form.cardexNo || ''}
                  onChange={(e) => set('cardexNo', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={(e) => set('address', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Mobile No
                </label>
                <input
                  type="text"
                  value={form.mobileNo || ''}
                  onChange={(e) => set('mobileNo', e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          {/* Allowance & deduction parameters */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50/80 to-slate-50/40 dark:from-emerald-950/30 dark:to-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Allowance Parameters
              </h4>
            </div>
            <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[0.65rem] text-slate-400">
                Use the arrows to set the display order in the Matrix &amp; Employee Ledger.
              </p>
              <button
                type="button"
                onClick={() => setEarningOrder([])}
                className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition shrink-0"
              >
                <RotateCcw className="w-3 h-3" /> Reset Order
              </button>
            </div>

            <ol className="space-y-1 mb-2">
              {earningOrderedKeys.map((key, idx) => {
                const isManual = key.startsWith('manual::');
                const manualLabel = isManual ? key.slice('manual::'.length) : null;
                const col = isManual
                  ? null
                  : PAYBILL_EARNING_COLUMNS.find((c) => c.key === key);
                const display = col?.label || manualLabel || key;
                return (
                  <li key={key} className="flex items-center gap-2">
                    <span className="w-5 text-right text-[0.68rem] text-slate-400 font-mono shrink-0">
                      {idx + 1}.
                    </span>
                    {isManual ? (
                      <span
                        className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-[0.7rem] font-semibold rounded-full px-2 py-0.5"
                        title="Manual parameter (editable in Employee Ledger)"
                      >
                        {manualLabel}
                        <button
                          type="button"
                          onClick={() =>
                            removeParameter(manualAllowances, setManualAllowances, setEarningOrder, manualLabel || '')
                          }
                          className="text-blue-400 hover:text-rose-500 transition"
                          aria-label={`Remove ${manualLabel}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[0.7rem] font-semibold rounded-full px-2 py-0.5"
                        title="Standard parameter (extracted from PDF)"
                      >
                        {display}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => moveKey(earningOrder, setEarningOrder, earningOrderedKeys, idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${display} up`}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveKey(earningOrder, setEarningOrder, earningOrderedKeys, idx, 1)}
                        disabled={idx === earningOrderedKeys.length - 1}
                        aria-label={`Move ${display} down`}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[0.68rem] text-slate-400 font-medium">Always last:</span>
              {PAYBILL_EARNING_COLUMNS.filter((c) => c.key === 'grossAmount').map((c) => (
                <span
                  key={c.key}
                  className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[0.7rem] font-semibold rounded-full px-2 py-0.5"
                >
                  <Lock className="w-3 h-3" />
                  {c.label}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAllowanceName}
                onChange={(e) => setNewAllowanceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addParameter(manualAllowances, setManualAllowances, setEarningOrder, newAllowanceName);
                    setNewAllowanceName('');
                  }
                }}
                placeholder="e.g. Festival Allowance"
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => {
                  addParameter(manualAllowances, setManualAllowances, setEarningOrder, newAllowanceName);
                  setNewAllowanceName('');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            </div>
          </div>

          {/* Manual deduction parameters */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-gradient-to-r from-rose-50/80 to-slate-50/40 dark:from-rose-950/30 dark:to-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Deduction Parameters
              </h4>
            </div>
            <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[0.65rem] text-slate-400">
                Use the arrows to set the display order in the Matrix &amp; Employee Ledger.
              </p>
              <button
                type="button"
                onClick={() => setDeductionOrder([])}
                className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition shrink-0"
              >
                <RotateCcw className="w-3 h-3" /> Reset Order
              </button>
            </div>

            <ol className="space-y-1 mb-2">
              {deductionOrderedKeys.map((key, idx) => {
                const isManual = key.startsWith('manual::');
                const manualLabel = isManual ? key.slice('manual::'.length) : null;
                const col = isManual
                  ? null
                  : PAYBILL_DEDUCTION_COLUMNS.find((c) => c.key === key);
                const display = col?.label || manualLabel || key;
                return (
                  <li key={key} className="flex items-center gap-2">
                    <span className="w-5 text-right text-[0.68rem] text-slate-400 font-mono shrink-0">
                      {idx + 1}.
                    </span>
                    {isManual ? (
                      <span
                        className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-[0.7rem] font-semibold rounded-full px-2 py-0.5"
                        title="Manual parameter (editable in Employee Ledger)"
                      >
                        {manualLabel}
                        <button
                          type="button"
                          onClick={() =>
                            removeParameter(manualDeductions, setManualDeductions, setDeductionOrder, manualLabel || '')
                          }
                          className="text-rose-400 hover:text-rose-600 transition"
                          aria-label={`Remove ${manualLabel}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[0.7rem] font-semibold rounded-full px-2 py-0.5"
                        title="Standard parameter (extracted from PDF)"
                      >
                        {display}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => moveKey(deductionOrder, setDeductionOrder, deductionOrderedKeys, idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${display} up`}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveKey(deductionOrder, setDeductionOrder, deductionOrderedKeys, idx, 1)}
                        disabled={idx === deductionOrderedKeys.length - 1}
                        aria-label={`Move ${display} down`}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[0.68rem] text-slate-400 font-medium">Always last:</span>
              {PAYBILL_DEDUCTION_COLUMNS.filter(
                (c) => c.key === 'totalDeductions' || c.key === 'netPay'
              ).map((c) => (
                <span
                  key={c.key}
                  className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[0.7rem] font-semibold rounded-full px-2 py-0.5"
                >
                  <Lock className="w-3 h-3" />
                  {c.label}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newDeductionName}
                onChange={(e) => setNewDeductionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addParameter(manualDeductions, setManualDeductions, setDeductionOrder, newDeductionName);
                    setNewDeductionName('');
                  }
                }}
                placeholder="e.g. Festival Advance Recovery"
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => {
                  addParameter(manualDeductions, setManualDeductions, setDeductionOrder, newDeductionName);
                  setNewDeductionName('');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 shrink-0">
          {error && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2 flex-1 min-w-0">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <PbButton variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </PbButton>
            <PbButton variant="primary" icon={Save} onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </PbButton>
          </div>
        </div>
      </div>
    </div>
  );
};

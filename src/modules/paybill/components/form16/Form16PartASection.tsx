import { Landmark, RotateCcw } from 'lucide-react';
import type { Form16Certificate, Form16QuarterEntry } from '../../types/form16';
import {
  form16Inr,
  form16TextInput,
  form16FieldLabel,
  type Form16CertUpdater,
} from './Form16EditorShared';

interface PartASectionProps {
  cert: Form16Certificate;
  updateQuarter: (idx: number, patch: Partial<Form16QuarterEntry>) => void;
  updateCert: Form16CertUpdater;
  /** Omitted when no payroll source exists — hides the Sync button (matches both hosts). */
  onSyncWithPayroll?: () => void;
}

/**
 * Part A (Quarters) tab: Fetched-from-Payroll banner + Sync button +
 * Period From/To + quarters table + totals. Identical in both editors
 * (standardized on the roomier page density).
 */
export function Form16PartASection({ cert, updateQuarter, updateCert, onSyncWithPayroll }: PartASectionProps) {
  const fy = cert.financialYear;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl gap-3">
        <div className="flex items-center gap-2.5">
          <Landmark size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-200">
              Fetched from Payroll Module (24Q Statement)
            </span>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Quarterly payments and TDS deductions are automatically derived from Payroll monthly returns.
            </p>
          </div>
        </div>
        {onSyncWithPayroll && (
          <button
            type="button"
            onClick={onSyncWithPayroll}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
          >
            <RotateCcw size={12} /> Sync from Payroll
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl">
        <div>
          <label className={form16FieldLabel}>Period From</label>
          <input
            value={cert.partA.periodFrom || ''}
            onChange={(e) =>
              updateCert((p) => ({
                ...p,
                partA: { ...p.partA, periodFrom: e.target.value },
              }))
            }
            className={form16TextInput}
            placeholder={`01-Apr-${fy}`}
          />
        </div>
        <div>
          <label className={form16FieldLabel}>Period To</label>
          <input
            value={cert.partA.periodTo || ''}
            onChange={(e) =>
              updateCert((p) => ({
                ...p,
                partA: { ...p.partA, periodTo: e.target.value },
              }))
            }
            className={form16TextInput}
            placeholder={`31-Mar-${fy + 1}`}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="py-2.5 pr-2 font-bold w-12 text-center">Qtr</th>
              <th className="py-2.5 pr-2 font-bold min-w-[140px]">24Q Receipt No</th>
              <th className="py-2.5 pr-2 font-bold text-right w-28">Gross Paid</th>
              <th className="py-2.5 pr-2 font-bold text-right w-28">TDS Deducted</th>
              <th className="py-2.5 pr-2 font-bold text-right w-28">TDS Deposited</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {cert.partA.quarters.map((q, idx) => (
              <tr key={q.quarter}>
                <td className="py-2.5 pr-2 font-bold text-center text-slate-700 dark:text-slate-200">
                  {q.quarter}
                </td>
                <td className="py-2.5 pr-2">
                  <input
                    value={q.receiptNumber}
                    onChange={(e) =>
                      updateQuarter(idx, { receiptNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. QWBYJLWA"
                    className="w-full text-xs px-2.5 py-1.5 font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </td>
                <td className="py-2.5 pr-2 text-right">
                  <div
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg num font-bold text-slate-700 dark:text-slate-200 text-right cursor-not-allowed select-all"
                    title="Gross paid is fetched from the employee ledger and is non-editable"
                  >
                    {form16Inr(q.amountPaid)}
                  </div>
                </td>
                <td className="py-2.5 pr-2 text-right">
                  <div
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg num font-bold text-rose-600 dark:text-rose-400 text-right cursor-not-allowed select-all"
                    title="TDS Deducted is fetched from the employee ledger and is non-editable"
                  >
                    {form16Inr(q.taxDeducted)}
                  </div>
                </td>
                <td className="py-2.5 pr-2 text-right">
                  <div
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg num font-bold text-emerald-600 dark:text-emerald-400 text-right cursor-not-allowed select-all"
                    title="TDS Deposited is equal to TDS Deducted and is non-editable"
                  >
                    {form16Inr(q.taxDeducted)}
                  </div>
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
              <td className="py-2.5 text-center">Total</td>
              <td />
              <td className="py-2.5 pr-2 text-right num text-xs">
                {form16Inr(cert.partA.quarters.reduce((s, q) => s + (Number(q.amountPaid) || 0), 0))}
              </td>
              <td className="py-2.5 pr-2 text-right num text-xs">
                {form16Inr(cert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0))}
              </td>
              <td className="py-2.5 pr-2 text-right num text-xs">
                {form16Inr(cert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeposited) || 0), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { Lock } from 'lucide-react';
import type { Form16Certificate, Form16ComputedTotals } from '../../types/form16';
import { formatINRWhole } from '@/shared/domain/currency';

/**
 * Shared kit for the two Form-16 editors (`Form16EditorPage` + `Form16EditorModal`).
 * The editors previously carried byte-identical copies of these helpers and the
 * Part B section (~470 duplicated lines). New editor UI must reuse this kit.
 */

/** ₹ + whole rupees, en-IN grouping — canonical helper re-exported for the Form-16 kit. */
export const form16Inr = formatINRWhole;

export const form16NumInput =
  'w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 num text-right font-medium text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition';
export const form16TextInput =
  'w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition';
export const form16FieldLabel =
  'block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';

export type Form16EditorTab = 'partB' | 'partA' | 'details';

/** Cert updater shared by both editors: setLocalCert((prev) => (prev ? fn(prev) : null)). */
export type Form16CertUpdater = (fn: (prev: Form16Certificate) => Form16Certificate) => void;

interface PartBSectionProps {
  cert: Form16Certificate;
  computedTotals: Form16ComputedTotals | null;
  grossAmountSource: number;
  updateCert: Form16CertUpdater;
}

/**
 * Part B (Salary) tab: official paybill card + non-salary declarations +
 * live 115BAC tax summary. Identical in both editors (standardized on the
 * roomier page density).
 */
export function Form16PartBSection({ cert, computedTotals, grossAmountSource, updateCert }: PartBSectionProps) {
  const setPartB = (patch: Partial<Form16Certificate['partB']>) =>
    updateCert((p) => ({ ...p, partB: { ...p.partB, ...patch } }));

  const numField = (
    label: string,
    value: number | undefined,
    onChange: (v: number) => void,
    opts?: { min?: number; placeholder?: string }
  ) => (
    <div>
      <label className={form16FieldLabel}>{label}</label>
      <input
        type="number"
        min={opts?.min}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={form16NumInput}
        placeholder={opts?.placeholder ?? '0'}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Official Paybill Salary Card */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <Lock size={15} className="text-amber-600 dark:text-amber-400" />
            <span>Official Paybill Salary Data</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            🔒 Fetched from Paybill (Read-Only)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-600 dark:text-slate-300">1(a) Gross Salary u/s 17(1)</span>
            <span className="num font-bold text-indigo-600 dark:text-indigo-400">
              {form16Inr(computedTotals?.grossSalary17_1 || grossAmountSource)}
            </span>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-600 dark:text-slate-300">1(b) Perquisites u/s 17(2)</span>
            <span className="num font-bold text-slate-500">₹0</span>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-600 dark:text-slate-300">1(c) Profits in lieu u/s 17(3)</span>
            <span className="num font-bold text-slate-500">₹0</span>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-600 dark:text-slate-300">1(d) Total Gross Salary</span>
            <span className="num font-bold text-indigo-700 dark:text-indigo-300">
              {form16Inr(computedTotals?.totalGrossSalary1d || grossAmountSource)}
            </span>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-600 dark:text-slate-300">2(a) Std. Deduction u/s 16(ia)</span>
            <span className="num font-bold text-emerald-600 dark:text-emerald-400">
              {form16Inr(computedTotals?.standardDeduction16ia || 75000)}
            </span>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60">
            <span className="font-bold text-amber-900 dark:text-amber-200">3. Income Chargeable (Salaries)</span>
            <span className="num font-bold text-amber-900 dark:text-amber-200">
              {form16Inr(computedTotals?.incomeChargeableSalaries || 0)}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          * Salary heads are automatically fetched from Paybill records. To modify official salary, adjust the respective bills in the Paybill module.
        </p>
      </div>

      {/* Non-Salary Declarations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {numField('1(e) Other Employer Salary', cert.partB.otherEmployerSalary, (v) => setPartB({ otherEmployerSalary: v }), { min: 0 })}
        {numField('4(a) House Property Income / Loss', cert.partB.housePropertyIncome, (v) => setPartB({ housePropertyIncome: v }), { placeholder: '0 (Negative for loss)' })}
        {numField('4(b) Other Sources Income', cert.partB.otherSourcesIncome, (v) => setPartB({ otherSourcesIncome: v }), { min: 0 })}
        {numField('7. Employer NPS u/s 80CCD(2)', cert.partB.nps80CCD2, (v) => setPartB({ nps80CCD2: v }), { min: 0 })}
        {numField('8. Agnipath u/s 80CCH', cert.partB.agnipath80CCH, (v) => setPartB({ agnipath80CCH: v }), { min: 0 })}
        {numField('16. Relief u/s 89 (Arrears)', cert.partB.relief89, (v) => setPartB({ relief89: v }), { min: 0 })}
        {numField('18. Tax Collected at Source (TCS)', cert.partB.taxCollectedAtSource, (v) => setPartB({ taxCollectedAtSource: v }), { min: 0 })}
      </div>

      {/* Live Tax Summary */}
      {computedTotals && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
          <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex justify-between">
            <span>Tax Computation (New Regime u/s 115BAC)</span>
            <span className="num text-indigo-600 dark:text-indigo-400 font-bold">
              Taxable Income: {form16Inr(computedTotals.totalTaxableIncome)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Tax on Total Income:</span>
              <span className="num font-semibold">
                {form16Inr(computedTotals.taxOnTotalIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rebate u/s 87A:</span>
              <span className="num font-semibold text-emerald-600">
                -{form16Inr(computedTotals.rebate87A)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cess (4%):</span>
              <span className="num font-semibold">
                {form16Inr(computedTotals.cess4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Tax Payable:</span>
              <span className="num font-semibold">
                {form16Inr(computedTotals.totalTaxPayable)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">TDS Deducted:</span>
              <span className="num font-semibold text-rose-600">
                -{form16Inr(computedTotals.tdsDeducted)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-xs">
              <span className="text-slate-800 dark:text-slate-100">
                Net Tax Payable / (Refund):
              </span>
              <span
                className={`num ${
                  computedTotals.netTaxPayable < 0
                    ? 'text-emerald-600'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {form16Inr(computedTotals.netTaxPayable)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

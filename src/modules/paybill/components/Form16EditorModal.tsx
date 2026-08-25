import { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/shared/components/Modal';
import { toast } from '@/shared/components/Toast';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import { useForm16TaxRules } from '../hooks/useForm16';
import {
  computeForm16Totals,
  validateCertificate,
  assessmentYearFor,
} from '../services/form16Calculation.service';
import { Form16Document, type Form16PartALayout } from './Form16Document';
import {
  Save,
  Printer,
  ShieldCheck,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Landmark,
  Calculator,
  Eye,
} from 'lucide-react';
import type {
  Form16Certificate,
  Form16QuarterEntry,
} from '../types/form16';

interface Form16EditorModalProps {
  open: boolean;
  onClose: () => void;
  cert: Form16Certificate | null;
  grossAmountSource: number;
  deductionsSource: Array<{ incomeTax: number; month: string }>;
  onSave: (cert: Form16Certificate) => Promise<void>;
  onStatusChange: (id: string, status: 'REVIEWED' | 'ISSUED' | 'VOIDED') => Promise<void>;
  isSaving?: boolean;
}

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const numInput =
  'w-full bg-transparent border border-slate-200 dark:border-slate-700 hover:border-blue-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-right text-slate-800 dark:text-slate-200 outline-none transition';
const textInput =
  'w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200';
const fieldLabel =
  'block text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';

type EditorTab = 'partB' | 'partA' | 'details';

export function Form16EditorModal({
  open,
  onClose,
  cert: initialCert,
  grossAmountSource,
  deductionsSource,
  onSave,
  onStatusChange,
  isSaving = false,
}: Form16EditorModalProps) {
  const [localCert, setLocalCert] = useState<Form16Certificate | null>(initialCert);
  const [activeTab, setActiveTab] = useState<EditorTab>('partB');
  const [isRefreshingEst, setIsRefreshingEst] = useState(false);
  const [partALayout, setPartALayout] = useState<Form16PartALayout>(() => {
    try {
      return (localStorage.getItem('form16_parta_layout') as Form16PartALayout) || 'traces';
    } catch {
      return 'traces';
    }
  });

  const handleToggleLayout = (layout: Form16PartALayout) => {
    setPartALayout(layout);
    try {
      localStorage.setItem('form16_parta_layout', layout);
    } catch {
      /* ignore */
    }
  };
  const { taxRulesConfig } = useForm16TaxRules();

  useEffect(() => {
    setLocalCert(initialCert);
  }, [initialCert]);

  const computedTotals = useMemo(() => {
    if (!localCert) return null;
    return computeForm16Totals({
      financialYear: localCert.financialYear,
      taxRegime: 'NEW',
      earnings: [{ grossAmount: grossAmountSource }],
      deductions: deductionsSource,
      partB: localCert.partB,
      taxRulesSettings: taxRulesConfig,
    });
  }, [localCert, grossAmountSource, deductionsSource, taxRulesConfig]);

  const liveCert: Form16Certificate | null = useMemo(() => {
    if (!localCert) return null;
    return {
      ...localCert,
      computedTotals,
    };
  }, [localCert, computedTotals]);

  const validationErrors = useMemo(() => {
    if (!liveCert) return [];
    return validateCertificate(liveCert);
  }, [liveCert]);

  if (!localCert || !liveCert) return null;

  const fy = localCert.financialYear;
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;
  const ayLabel = assessmentYearFor(fy);

  const updateCert = (fn: (prev: Form16Certificate) => Form16Certificate) => {
    setLocalCert((prev) => (prev ? fn(prev) : null));
  };

  const updateQuarter = (idx: number, patch: Partial<Form16QuarterEntry>) => {
    updateCert((prev) => {
      const quarters = prev.partA.quarters.map((q, i) => (i === idx ? { ...q, ...patch } : q));
      return { ...prev, partA: { ...prev.partA, quarters } };
    });
  };

  const handleAutoFillFromEstablishment = async () => {
    if (!localCert.hrpn) return;
    setIsRefreshingEst(true);
    try {
      const estList = await establishmentService
        .syncEmployees()
        .catch(() => establishmentService.loadEmployees());
      const norm = localCert.hrpn.trim().toLowerCase();
      const matched =
        estList.find((e) => (e.hrpnNo || '').trim().toLowerCase() === norm) ||
        estList.find(
          (e) =>
            localCert.employee.name &&
            e.name.trim().toLowerCase() === localCert.employee.name.trim().toLowerCase()
        );
      if (matched) {
        updateCert((prev) => ({
          ...prev,
          employee: {
            ...prev.employee,
            pan: matched.pan?.trim().toUpperCase() || prev.employee.pan,
            name: matched.name || prev.employee.name,
            designation: matched.designation || prev.employee.designation,
            address:
              matched.quartersAddress || matched.headquarter || prev.employee.address,
          },
        }));
        toast.success(
          `Fetched Establishment details for ${matched.name} (PAN: ${matched.pan || 'Not set'})`
        );
      } else {
        toast.info(`No matching establishment record found for HRPN ${localCert.hrpn}.`);
      }
    } catch {
      toast.error('Could not fetch establishment record.');
    } finally {
      setIsRefreshingEst(false);
    }
  };

  const handlePrint = () => {
    const docEl = document.getElementById('form16-editor-preview');
    if (!docEl) return;
    const empPan = localCert.employee.pan || localCert.hrpn || 'Employee';
    popupNativePrint({
      elements: [docEl],
      title: `Form16_${empPan}_AY${ayLabel}`,
      pageSize: 'A4',
      orientation: 'portrait',
      pageMargin: '5mm 6mm',
      customStyles: `
        #form16-single-page {
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 5mm 6mm !important; }
          html, body { background: #fff !important; color: #000 !important; font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important; font-size: 10pt !important; }
          .f16-title-main { font-size: 16.5pt !important; font-weight: 900 !important; }
          .f16-parta-title { font-size: 13pt !important; font-weight: 900 !important; }
          .f16-rule-sub { font-size: 10pt !important; font-weight: 600 !important; }
          .f16-cert-desc { font-size: 9.2pt !important; font-weight: 600 !important; }
          .f16-hdr-cell { font-size: 8.8pt !important; font-weight: 800 !important; }
          .f16-val-cell { font-size: 10.5pt !important; font-weight: 700 !important; }
          .f16-table th { font-size: 9.8pt !important; font-weight: 900 !important; padding: 1.3mm 2mm !important; }
          .f16-table td { font-size: 10pt !important; padding: 1.2mm 2mm !important; }
          .f16-num { font-size: 10.8pt !important; font-weight: 800 !important; }
          .f16-verify-box { font-size: 9.8pt !important; }
          .f16-verify-title { font-size: 10.5pt !important; font-weight: 900 !important; }
          .f16-verify-text { font-size: 9.8pt !important; }
          .f16-verify-grid { font-size: 10pt !important; }
        }
      `,
    });
  };

  const handleSave = async () => {
    if (!liveCert) return;
    try {
      await onSave(liveCert);
      toast.success('Form 16 certificate saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save certificate.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Form 16 Editor — ${localCert.employee.name || localCert.hrpn}`}
      maxWidth="full"
    >
      <div className="flex flex-col h-[85vh] -m-4">
        {/* Sub-Header / Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              HRPN: {localCert.hrpn}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {localCert.employee.name}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              FY {fyLabel} (AY {ayLabel})
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                localCert.status === 'ISSUED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : localCert.status === 'REVIEWED'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              {localCert.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Print A4 Form 16"
            >
              <Printer size={13} /> Print Preview
            </button>
            <button
              type="button"
              disabled={isSaving || localCert.status === 'ISSUED'}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Save size={13} /> {isSaving ? 'Saving…' : 'Save Draft'}
            </button>
            {localCert.status === 'DRAFT' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  await handleSave();
                  await onStatusChange(localCert.id, 'REVIEWED');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                <ShieldCheck size={13} /> Mark Reviewed
              </button>
            )}
            {localCert.status === 'REVIEWED' && (
              <button
                type="button"
                disabled={isSaving || validationErrors.length > 0}
                onClick={async () => {
                  await handleSave();
                  await onStatusChange(localCert.id, 'ISSUED');
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Send size={13} /> Issue Certificate
              </button>
            )}
          </div>
        </div>

        {/* Main Split-Screen Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Pane: Interactive Form Inputs */}
          <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto app-scroll p-4 space-y-4">
            {/* Tabs */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('partB')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'partB'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <Calculator size={13} /> Part B (Salary & Tax)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('partA')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'partA'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <Landmark size={13} /> Part A (Quarterly TDS)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'details'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <User size={13} /> Employee & Deductor
              </button>
            </div>

            {/* TAB 1: PART B (Salary & Tax Adjustments) */}
            {activeTab === 'partB' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      1(a) Gross Salary from Pay Bill
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {inr(computedTotals?.grossSalary17_1 || grossAmountSource)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      2(a) Standard Deduction u/s 16(ia)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {inr(computedTotals?.standardDeduction16ia || 75000)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200 dark:border-amber-900/60">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      3. Income Chargeable under Salaries
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {inr(computedTotals?.incomeChargeableSalaries || 0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>1(b) Perquisites u/s 17(2)</label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.perquisites17_2 || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, perquisites17_2: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>1(c) Profits in lieu u/s 17(3)</label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.profitsInLieu17_3 || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, profitsInLieu17_3: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>1(e) Other Employer Salary</label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.otherEmployerSalary || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, otherEmployerSalary: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>
                      2(a) Std Deduction Override (Auto ₹75,000)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.standardDeductionOverride ?? ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: {
                            ...p.partB,
                            standardDeductionOverride:
                              e.target.value === '' ? null : Number(e.target.value),
                          },
                        }))
                      }
                      className={numInput}
                      placeholder="Auto (75000)"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>
                      4(a) House Property Income / Loss
                    </label>
                    <input
                      type="number"
                      value={localCert.partB.housePropertyIncome || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, housePropertyIncome: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0 (Negative for loss)"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>4(b) Other Sources Income</label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.otherSourcesIncome || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, otherSourcesIncome: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>
                      7. Employer NPS u/s 80CCD(2)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.nps80CCD2 || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, nps80CCD2: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>8. Agnipath u/s 80CCH</label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.agnipath80CCH || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, agnipath80CCH: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>16. Relief u/s 89 (Arrears)</label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.relief89 || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: { ...p.partB, relief89: Number(e.target.value) || 0 },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel}>18. Tax Collected at Source (TCS)</label>
                    <input
                      type="number"
                      min={0}
                      value={localCert.partB.taxCollectedAtSource || ''}
                      onChange={(e) =>
                        updateCert((p) => ({
                          ...p,
                          partB: {
                            ...p.partB,
                            taxCollectedAtSource: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className={numInput}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Live Tax Computation Summary Panel */}
                {computedTotals && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
                    <div className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex justify-between">
                      <span>Tax Computation (New Regime u/s 115BAC)</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">
                        Taxable: {inr(computedTotals.totalTaxableIncome)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tax on Total Income:</span>
                        <span className="font-mono font-semibold">
                          {inr(computedTotals.taxOnTotalIncome)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rebate u/s 87A:</span>
                        <span className="font-mono font-semibold text-emerald-600">
                          -{inr(computedTotals.rebate87A)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cess (4%):</span>
                        <span className="font-mono font-semibold">
                          {inr(computedTotals.cess4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Tax Payable:</span>
                        <span className="font-mono font-semibold">
                          {inr(computedTotals.totalTaxPayable)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">TDS Deducted:</span>
                        <span className="font-mono font-semibold text-rose-600">
                          -{inr(computedTotals.tdsDeducted)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-800 dark:text-slate-100">
                          Net Tax Payable / (Refund):
                        </span>
                        <span
                          className={`font-mono ${
                            computedTotals.netTaxPayable < 0
                              ? 'text-emerald-600'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {inr(computedTotals.netTaxPayable)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PART A (Quarterly TDS) */}
            {activeTab === 'partA' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Receipt numbers and quarterly amounts are pre-filled from 24Q Quarterly Manager and
                  monthly paybill TDS records. You can fine-tune them here.
                </div>
                <div className="overflow-x-auto app-scroll">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[0.65rem] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2 pr-2 font-bold w-12 text-center">Qtr</th>
                        <th className="py-2 pr-2 font-bold min-w-[140px]">24Q Receipt No</th>
                        <th className="py-2 pr-2 font-bold text-right w-24">Gross Paid</th>
                        <th className="py-2 pr-2 font-bold text-right w-24">TDS Deducted</th>
                        <th className="py-2 pr-2 font-bold text-right w-24">TDS Deposited</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {localCert.partA.quarters.map((q, idx) => (
                        <tr key={q.quarter}>
                          <td className="py-2 pr-2 font-bold text-center text-slate-700 dark:text-slate-200">
                            {q.quarter}
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              value={q.receiptNumber}
                              onChange={(e) =>
                                updateQuarter(idx, { receiptNumber: e.target.value.toUpperCase() })
                              }
                              placeholder="e.g. QWBYJLWA"
                              className="w-full text-xs px-2 py-1 font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min={0}
                              value={q.amountPaid || ''}
                              onChange={(e) =>
                                updateQuarter(idx, { amountPaid: Number(e.target.value) || 0 })
                              }
                              className={numInput}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min={0}
                              value={q.taxDeducted || ''}
                              onChange={(e) =>
                                updateQuarter(idx, { taxDeducted: Number(e.target.value) || 0 })
                              }
                              className={numInput}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min={0}
                              value={q.taxDeposited || ''}
                              onChange={(e) =>
                                updateQuarter(idx, { taxDeposited: Number(e.target.value) || 0 })
                              }
                              className={numInput}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
                        <td className="py-2 text-center">Total</td>
                        <td />
                        <td className="py-2 pr-2 text-right font-mono text-xs">
                          {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.amountPaid) || 0), 0))}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-xs">
                          {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0))}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-xs">
                          {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeposited) || 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DETAILS (Employee & Deductor) */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <User size={14} className="text-purple-600" /> Employee Profile
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleAutoFillFromEstablishment()}
                      disabled={isRefreshingEst}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 rounded-md transition"
                    >
                      <RotateCcw size={11} className={isRefreshingEst ? 'animate-spin' : ''} />
                      Sync from Establishment
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={fieldLabel}>Employee Name *</label>
                      <input
                        value={localCert.employee.name}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            employee: { ...p.employee, name: e.target.value },
                          }))
                        }
                        className={textInput}
                      />
                    </div>
                    <div>
                      <label className={fieldLabel}>Employee PAN *</label>
                      <input
                        value={localCert.employee.pan}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            employee: {
                              ...p.employee,
                              pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                            },
                          }))
                        }
                        className={`${textInput} font-mono uppercase font-bold`}
                        placeholder="ABCDE1234F"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={fieldLabel}>Designation</label>
                      <input
                        value={localCert.employee.designation}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            employee: { ...p.employee, designation: e.target.value },
                          }))
                        }
                        className={textInput}
                      />
                    </div>
                    <div>
                      <label className={fieldLabel}>Address</label>
                      <input
                        value={localCert.employee.address}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            employee: { ...p.employee, address: e.target.value },
                          }))
                        }
                        className={textInput}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                    <Building2 size={14} className="text-blue-600" /> Deductor & Signatory
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={fieldLabel}>Deductor PAN</label>
                      <input
                        value={localCert.employer.pan}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            employer: {
                              ...p.employer,
                              pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                            },
                          }))
                        }
                        className={`${textInput} font-mono uppercase`}
                      />
                    </div>
                    <div>
                      <label className={fieldLabel}>Deductor TAN</label>
                      <input
                        value={localCert.employer.tan}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            employer: {
                              ...p.employer,
                              tan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                            },
                          }))
                        }
                        className={`${textInput} font-mono uppercase`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className={fieldLabel}>Signatory Name</label>
                      <input
                        value={localCert.signatory.name}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            signatory: { ...p.signatory, name: e.target.value },
                          }))
                        }
                        className={textInput}
                      />
                    </div>
                    <div>
                      <label className={fieldLabel}>Designation</label>
                      <input
                        value={localCert.signatory.designation}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            signatory: { ...p.signatory, designation: e.target.value },
                          }))
                        }
                        className={textInput}
                      />
                    </div>
                    <div>
                      <label className={fieldLabel}>Place</label>
                      <input
                        value={localCert.signatory.place}
                        onChange={(e) =>
                          updateCert((p) => ({
                            ...p,
                            signatory: { ...p.signatory, place: e.target.value },
                          }))
                        }
                        className={textInput}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Banner */}
            {validationErrors.length > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5 list-disc pl-3.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Ready for issue. All standard validations pass.
              </div>
            )}
          </div>

          {/* Right Pane: Real-Time Live Document A4 Preview */}
          <div className="w-full lg:w-1/2 flex flex-col bg-slate-100 dark:bg-slate-950/80 overflow-y-auto app-scroll p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-semibold">
                <Eye size={13} /> Live Form 16 A4 Preview
              </span>
              <div className="inline-flex items-center p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleToggleLayout('traces')}
                  className={`px-2 py-0.5 text-[0.7rem] font-bold rounded-md transition ${
                    partALayout === 'traces'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="Official TRACES CPC-TDS Government Layout"
                >
                  🏛️ TRACES Format
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayout('modern')}
                  className={`px-2 py-0.5 text-[0.7rem] font-bold rounded-md transition ${
                    partALayout === 'modern'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="Modern Executive Dual-Badge Layout"
                >
                  📄 Executive Layout
                </button>
              </div>
            </div>

            <div
              id="form16-editor-preview"
              className="bg-white text-black shadow-lg rounded-sm mx-auto w-full transition-all"
            >
              <Form16Document cert={liveCert} layout={partALayout} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

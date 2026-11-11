import React, { useState, useEffect } from 'react';
import type {
  SelfAssessmentMemo,
  SelfAssessmentChallan,
} from '../../types/selfAssessment';
import {
  recalculateSelfAssessmentMemo,
  suggestRemainingTds,
} from '../../services/selfAssessmentCalculation.service';
import { SelfAssessmentDocument } from './SelfAssessmentDocument';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import {
  Printer,
  Save,
  Sparkles,
  Calculator,
  User,
  Plus,
  Trash2,
  Building2,
  Download,
  Loader2,
} from 'lucide-react';
import { selfAssessmentPdfService } from '../../services/selfAssessmentPdf.service';
import { toast } from '@/shared/components/Toast';

const inr = (n: number | undefined | null) =>
  `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export interface ResolvedOfficeSettings {
  departmentName?: string;
  departmentDivision?: string;
  district?: string;
  officeAddress?: string;
  place?: string;
  treasuryOfficerDesignation?: string;
  treasuryOfficerName?: string;
}

interface SelfAssessmentEditorProps {
  initialMemo: SelfAssessmentMemo;
  onSave: (memo: SelfAssessmentMemo, syncWithForm16: boolean) => Promise<void>;
  isSaving?: boolean;
  settingsOfficeDetails?: ResolvedOfficeSettings;
}

export const SelfAssessmentEditor: React.FC<SelfAssessmentEditorProps> = ({
  initialMemo,
  onSave,
  isSaving = false,
  settingsOfficeDetails,
}) => {
  const [memo, setMemo] = useState<SelfAssessmentMemo>(() =>
    recalculateSelfAssessmentMemo(initialMemo)
  );
  const [syncWithForm16, setSyncWithForm16] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    setMemo(recalculateSelfAssessmentMemo(initialMemo));
  }, [initialMemo]);

  // Recalculates memo whenever numeric or formula-relevant fields change
  const updateMemoField = <K extends keyof SelfAssessmentMemo>(
    key: K,
    val: SelfAssessmentMemo[K]
  ) => {
    setMemo((prev) => {
      const next = { ...prev, [key]: val };
      return recalculateSelfAssessmentMemo(next);
    });
  };

  const handleFetchFromSettings = () => {
    if (!settingsOfficeDetails) {
      toast.info('No office settings configured in Settings section.');
      return;
    }
    setMemo((prev) => ({
      ...prev,
      departmentName: settingsOfficeDetails.departmentName || prev.departmentName,
      departmentDivision: settingsOfficeDetails.departmentDivision ?? prev.departmentDivision,
      district: settingsOfficeDetails.district ?? prev.district,
      officeAddress: settingsOfficeDetails.officeAddress || prev.officeAddress,
      place: settingsOfficeDetails.place || prev.place,
      treasuryOfficerDesignation:
        settingsOfficeDetails.treasuryOfficerDesignation || prev.treasuryOfficerDesignation,
      treasuryOfficerName:
        settingsOfficeDetails.treasuryOfficerName || prev.treasuryOfficerName,
    }));
    toast.success('Office details fetched from Settings section.');
  };

  const updateMonthlyField = (
    field: 'taxDeductedDec' | 'taxDeductedJan' | 'taxDeductedFeb' | 'delayPenaltyAmount' | 'otherTdsTcsCredits',
    val: number
  ) => {
    setMemo((prev) => {
      const nextMonthly = {
        ...prev.monthlyTds,
        [field]: Number(val) || 0,
      };
      const next = { ...prev, monthlyTds: nextMonthly };
      return recalculateSelfAssessmentMemo(next);
    });
  };

  const handleAutoDistributeRemaining = () => {
    const split = suggestRemainingTds(
      memo.working.totalTaxLiability,
      memo.monthlyTds.taxPaidUpToNov
    );
    setMemo((prev) => {
      const nextMonthly = {
        ...prev.monthlyTds,
        taxDeductedDec: split.dec,
        taxDeductedJan: split.jan,
        taxDeductedFeb: split.feb,
      };
      return recalculateSelfAssessmentMemo({ ...prev, monthlyTds: nextMonthly });
    });
    toast.success(
      `Allocated Dec: ${inr(split.dec)}, Jan: ${inr(split.jan)}, Feb: ${inr(split.feb)}`,
      'Auto-Distributed Remaining TDS'
    );
  };

  const handleAddChallan = () => {
    const newChallan: SelfAssessmentChallan = {
      id: `ch-${Date.now()}`,
      challanNo: '',
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
    };
    setMemo((prev) => {
      const nextChallans = [...prev.monthlyTds.challans, newChallan];
      const nextMonthly = { ...prev.monthlyTds, challans: nextChallans };
      return recalculateSelfAssessmentMemo({ ...prev, monthlyTds: nextMonthly });
    });
  };

  const handleRemoveChallan = (idx: number) => {
    setMemo((prev) => {
      const nextChallans = prev.monthlyTds.challans.filter((_, i) => i !== idx);
      const nextMonthly = { ...prev.monthlyTds, challans: nextChallans };
      return recalculateSelfAssessmentMemo({ ...prev, monthlyTds: nextMonthly });
    });
  };

  const handleUpdateChallan = (
    idx: number,
    field: keyof SelfAssessmentChallan,
    val: string | number
  ) => {
    setMemo((prev) => {
      const nextChallans = prev.monthlyTds.challans.map((c, i) =>
        i === idx ? { ...c, [field]: val } : c
      );
      const nextMonthly = { ...prev.monthlyTds, challans: nextChallans };
      return recalculateSelfAssessmentMemo({ ...prev, monthlyTds: nextMonthly });
    });
  };

  const handlePrint = () => {
    popupNativePrint({
      viewId: 'self-assessment-print-memo',
      title: `Self_Assessment_${memo.taxpayerName}_${memo.financialYear}`,
      pageSize: 'A4',
      orientation: 'portrait',
      pageMargin: '3.5mm',
      pageContainerSelector: '#self-assessment-print-memo, .self-assessment-root',
      signatureSelector: '.signature-block',
      customStyles: `
        @page {
          size: A4 portrait;
          margin: 3.5mm 4mm !important;
        }
        *, *:before, *:after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        html, body {
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: 'Times New Roman', Times, 'Liberation Serif', 'Lohit Gujarati', Shruti, Georgia, serif !important;
        }
        .self-assessment-root,
        .self-assessment-root * {
          font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important;
        }
        .self-assessment-root h1,
        .self-assessment-root h2,
        .self-assessment-root h3,
        .self-assessment-root h4 {
          font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important;
        }
        .font-guj, [lang="gu"],
        .self-assessment-root .font-guj,
        .self-assessment-root [lang="gu"] {
          font-family: 'Lohit Gujarati', Shruti, 'Nirmala UI', sans-serif !important;
        }
        #self-assessment-print-memo,
        .self-assessment-root {
          width: 100% !important;
          max-width: 202mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        .signature-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `,
    });
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const { fileName } = await selfAssessmentPdfService.downloadSingleMemoPdf(memo);
      toast.success(`Downloaded ${fileName}`, 'PDF Exported');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to download PDF.';
      toast.error(message, 'Download Failed');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSave = async () => {
    try {
      await onSave(memo, syncWithForm16);
      toast.success(
        syncWithForm16
          ? 'Memo saved and synchronized with Form 16 Part B.'
          : 'Memo saved successfully.',
        'Self-Assessment Memo Saved'
      );
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to save self-assessment memo.',
        'Save Failed'
      );
    }
  };

  const w = memo.working;
  const m = memo.monthlyTds;
  const isFull87ARebate = w.rebate87A > 0 && w.taxAfterRebate === 0;

  return (
    <div className="space-y-4">
      {/* Top Action & Control Bar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {memo.taxpayerName || 'Employee Self-Assessment Memo'}
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                AY {memo.assessmentYear}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                PAN: {memo.pan || '—'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {memo.departmentName || 'Office'}
              {memo.departmentDivision ? ` · ${memo.departmentDivision}` : ''}
            </p>
          </div>
        </div>

        {/* Format Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => updateMemoField('preferredFormat', 'PERSONAL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                memo.preferredFormat === 'PERSONAL' || memo.preferredFormat === 'DANGS'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Personal localized layout with Dec/Jan/Feb deduction schedule and Gujarati consent"
            >
              Personal Format
            </button>
            <button
              onClick={() => updateMemoField('preferredFormat', 'STANDARD')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                memo.preferredFormat === 'STANDARD'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Clean 6-section departmental format u/s 115BAC"
            >
              Standard Departmental
            </button>
          </div>

          {/* View Tab Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'editor'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Print Preview
            </button>
          </div>

          {/* Sync Checkbox */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 select-none">
            <input
              type="checkbox"
              checked={syncWithForm16}
              onChange={(e) => setSyncWithForm16(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium">Sync to Form 16 Part B</span>
          </label>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            title="Print Self-Assessment Memo"
          >
            <Printer className="w-3.5 h-3.5" /> Print Memo
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Download this memo as a high-resolution A4 PDF"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download PDF
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Memo'}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="no-print grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Total</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{inr(memo.grossTotalIncome)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Salary + External Sources</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Permitted Deductions</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">{inr(memo.totalPermittedDeductions)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Std ₹75k + u/s 115BAC</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net Taxable Total</p>
          <p className="text-lg font-bold text-indigo-700 mt-0.5">{inr(memo.taxableTotalIncome)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Rounded u/s 288A</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tax Liability</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
            {inr(w.totalTaxLiability)}
            {isFull87ARebate && (
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                87A REBATE
              </span>
            )}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Tax + Cess 4% after Relief</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net Balance</p>
          <p
            className={`text-lg font-bold mt-0.5 ${
              m.netTaxPayableOrRefund === 0
                ? 'text-emerald-600'
                : m.netTaxPayableOrRefund > 0
                ? 'text-amber-600'
                : 'text-blue-600'
            }`}
          >
            {inr(m.netTaxPayableOrRefund)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {m.netTaxPayableOrRefund === 0
              ? 'Exact Zero Balance'
              : m.netTaxPayableOrRefund > 0
              ? 'Payable Balance'
              : 'Refund Due'}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'preview' ? (
        <div className="bg-slate-200/80 p-4 sm:p-6 rounded-xl border border-slate-300 overflow-x-auto flex justify-center print:bg-transparent print:p-0 print:border-none print:m-0">
          <div className="shadow-2xl rounded-sm print:shadow-none">
            <SelfAssessmentDocument memo={memo} />
          </div>
        </div>
      ) : (
        <>
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (Inputs: Incomes, Deductions, Monthly TDS) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Section 1: Salary Income from Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> 1. Salary Income from Paybill Ledger & Overrides
                </h3>
                <span className="text-xs text-slate-500">
                  Live Ledger Total: <strong className="text-slate-800">{inr(memo.grossSalaryFromLedger)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Gross Salary Head (Live Ledger Calculation)
                  </label>
                  <input
                    type="number"
                    value={memo.grossSalaryTotal || ''}
                    onChange={(e) => updateMemoField('grossSalaryTotal', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Live sum from Paybill records (PAY+DA+D.PAY+HRA+CLA+MA+TA)</p>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Manual Override (Optional)
                  </label>
                  <input
                    type="number"
                    value={memo.grossSalaryOverride ?? ''}
                    placeholder="Leave blank to use ledger amount"
                    onChange={(e) =>
                      updateMemoField(
                        'grossSalaryOverride',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Overrides ledger salary when specified</p>
                </div>
              </div>
            </div>

            {/* Section 2: Non-Salary Incomes */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                2. Non-Salary Income Sources (Bank Interest, Pension, House Property)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Bank Interest (Savings/FD)</label>
                  <input
                    type="number"
                    value={memo.bankInterest || ''}
                    onChange={(e) => updateMemoField('bankInterest', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">NSC Interest</label>
                  <input
                    type="number"
                    value={memo.nscInterest || ''}
                    onChange={(e) => updateMemoField('nscInterest', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">House Property / Rent</label>
                  <input
                    type="number"
                    value={memo.housePropertyIncome || ''}
                    onChange={(e) => updateMemoField('housePropertyIncome', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Family Pension (Gross)</label>
                  <input
                    type="number"
                    value={memo.familyPensionGross || ''}
                    onChange={(e) => updateMemoField('familyPensionGross', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-emerald-600 font-medium">
                    u/s 57(iia) Ded: {inr(memo.familyPensionDeduction57iia)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Retirement Gratuity</label>
                  <input
                    type="number"
                    value={memo.retirementGratuity || ''}
                    onChange={(e) => updateMemoField('retirementGratuity', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Leave Salary u/s 10(10AA)</label>
                  <input
                    type="number"
                    value={memo.leaveSalaryEncashment || ''}
                    onChange={(e) => updateMemoField('leaveSalaryEncashment', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Honorarium / Bonus</label>
                  <input
                    type="number"
                    value={memo.honorariumBonus || ''}
                    onChange={(e) => updateMemoField('honorariumBonus', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Agricultural Income</label>
                  <input
                    type="number"
                    value={memo.agriculturalIncome || ''}
                    onChange={(e) => updateMemoField('agriculturalIncome', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Other Income Sources</label>
                  <input
                    type="number"
                    value={memo.otherIncomeSources || ''}
                    onChange={(e) => updateMemoField('otherIncomeSources', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Deductions */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                3. Permitted Deductions u/s 115BAC (New Tax Regime)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Standard Deduction u/s 16(ia)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={memo.standardDeduction16ia}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 text-slate-600 rounded-lg font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Capped at ₹75,000 / Salary</p>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    NPS Govt. Contribution u/s 80CCD(2)
                  </label>
                  <input
                    type="number"
                    value={memo.nps80CCD2 || ''}
                    onChange={(e) => updateMemoField('nps80CCD2', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave 0 if Govt. 14% share is not added to Gross Salary</p>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Relief under Section 89
                  </label>
                  <input
                    type="number"
                    value={memo.working?.relief89 || ''}
                    onChange={(e) => {
                      const r89 = Number(e.target.value) || 0;
                      setMemo((prev) => {
                        const nextWorking = { ...prev.working, relief89: r89 };
                        return recalculateSelfAssessmentMemo({ ...prev, working: nextWorking });
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Form 10E attached</p>
                </div>
              </div>
            </div>

            {/* Section 4: Advance TDS Distribution Planner */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    4. Advance TDS Distribution Schedule (Nov, Dec, Jan, Feb)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Remaining Tax to Deduct:{' '}
                    <strong className="text-indigo-700">
                      {inr(Math.max(0, w.totalTaxLiability - m.taxPaidUpToNov))}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoDistributeRemaining}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Distribute (3 Splits)
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Paid up to Nov {memo.financialYear}
                  </label>
                  <input
                    type="number"
                    value={m.taxPaidUpToNov || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setMemo((prev) => {
                        const nextMonthly = { ...prev.monthlyTds, taxPaidUpToNov: val };
                        return recalculateSelfAssessmentMemo({ ...prev, monthlyTds: nextMonthly });
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">From paybills parsed</p>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Dec {memo.financialYear} Deduction
                  </label>
                  <input
                    type="number"
                    value={m.taxDeductedDec || ''}
                    onChange={(e) => updateMonthlyField('taxDeductedDec', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Jan {memo.financialYear + 1} Deduction
                  </label>
                  <input
                    type="number"
                    value={m.taxDeductedJan || ''}
                    onChange={(e) => updateMonthlyField('taxDeductedJan', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Feb {memo.financialYear + 1} Deduction
                  </label>
                  <input
                    type="number"
                    value={m.taxDeductedFeb || ''}
                    onChange={(e) => updateMonthlyField('taxDeductedFeb', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    TCS / Other TDS (192(2B))
                  </label>
                  <input
                    type="number"
                    value={m.otherTdsTcsCredits || ''}
                    onChange={(e) => updateMonthlyField('otherTdsTcsCredits', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Form 16A / 27D</p>
                </div>
              </div>

              {/* Challan Entries */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Direct Challan Payments Deposited by Assessee
                  </span>
                  <button
                    type="button"
                    onClick={handleAddChallan}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3 h-3" /> Add Challan
                  </button>
                </div>

                {m.challans.map((ch, idx) => (
                  <div key={ch.id} className="grid grid-cols-12 gap-2 mb-2 items-center text-xs">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Challan No / CIN"
                        value={ch.challanNo}
                        onChange={(e) => handleUpdateChallan(idx, 'challanNo', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="date"
                        value={ch.date}
                        onChange={(e) => handleUpdateChallan(idx, 'date', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={ch.amount || ''}
                        onChange={(e) =>
                          handleUpdateChallan(idx, 'amount', Number(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-semibold text-right"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveChallan(idx)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Live Calculation & Gujarati Consent Block) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Slab Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                Income Tax Slab Working ({memo.assessmentYear})
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                {w.slabs.map((s, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-700">{s.label}</p>
                      <span className="text-[10px] text-slate-400">
                        {inr(s.taxableAmount)} @ {s.rate}%
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900">{inr(s.taxAmount)}</span>
                  </div>
                ))}

                <div className="py-1.5 flex justify-between font-semibold">
                  <span>Gross Tax on Normal Income</span>
                  <span>{inr(w.taxOnNormalIncome)}</span>
                </div>

                {w.rebate87A > 0 && (
                  <div className="py-1.5 flex justify-between text-emerald-600 font-semibold">
                    <span>Less: Rebate u/s 87A</span>
                    <span>-{inr(w.rebate87A)}</span>
                  </div>
                )}

                {w.surcharge > 0 && (
                  <div className="py-1.5 flex justify-between">
                    <span>Add: Surcharge</span>
                    <span>{inr(w.surcharge)}</span>
                  </div>
                )}

                <div className="py-1.5 flex justify-between">
                  <span>Add: Health & Cess @ 4%</span>
                  <span>{inr(w.cess4)}</span>
                </div>

                <div className="py-2 flex justify-between font-bold text-sm bg-slate-50 px-2 rounded-lg text-slate-900">
                  <span>Total Tax Liability</span>
                  <span>{inr(w.totalTaxLiability)}</span>
                </div>
              </div>
            </div>

            {/* Gujarati Consent Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Statutory Consent / <span lang="gu" className="font-guj">સંમતી પત્રક</span>
              </h4>
              <p lang="gu" className="font-guj text-xs text-amber-950 font-medium leading-relaxed">
                {memo.gujaratiConsentText && memo.gujaratiConsentText !== 'હું નવી કર યોજનામાં જોડાવા સંમતી આપું છું'
                  ? memo.gujaratiConsentText
                  : 'હું આથી બાંહેધરી આપું છું કે મેં આવકવેરા અધિનિયમ, ૧૯૬૧ ની કલમ ૧૧૫બીએસી હેઠળ નવી કર વ્યવસ્થા (New Tax Regime) નો વિકલ્પ પસંદ કરેલ છે.'}
              </p>
              <div className="text-[11px] text-amber-800 pt-1">
                Taxpayer: <strong className="uppercase">{memo.taxpayerName}</strong>
                <br />
                Place: <strong>{memo.place || memo.district || 'Surat'}</strong>
              </div>
            </div>

            {/* Office & Signatory Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Office &amp; Signatory Details
                </h4>
                {settingsOfficeDetails && (
                  <button
                    type="button"
                    onClick={handleFetchFromSettings}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                    title="Fetch and update office details from the Settings section"
                  >
                    <Building2 className="w-3 h-3" /> Fetch from Settings
                  </button>
                )}
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Office / Department Name</label>
                <input
                  type="text"
                  value={memo.departmentName}
                  onChange={(e) => updateMemoField('departmentName', e.target.value)}
                  placeholder="Deputy Director of Animal Husbandry"
                  className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">Department / Division</label>
                  <input
                    type="text"
                    value={memo.departmentDivision}
                    onChange={(e) => updateMemoField('departmentDivision', e.target.value)}
                    placeholder="Ahwa"
                    className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">District</label>
                  <input
                    type="text"
                    value={memo.district}
                    onChange={(e) => updateMemoField('district', e.target.value)}
                    placeholder="Dangs"
                    className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Office Address</label>
                <input
                  type="text"
                  value={memo.officeAddress || ''}
                  onChange={(e) => updateMemoField('officeAddress', e.target.value)}
                  placeholder="Patel Nagar, A.K. Road, Surat"
                  className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">Place of Signing</label>
                  <input
                    type="text"
                    value={memo.place}
                    onChange={(e) => updateMemoField('place', e.target.value)}
                    className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">DDO Designation / Title</label>
                  <input
                    type="text"
                    value={memo.treasuryOfficerDesignation}
                    onChange={(e) => updateMemoField('treasuryOfficerDesignation', e.target.value)}
                    className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Render hidden print document so Print Memo button works while on Editor tab */}
        <div className="hidden">
          <SelfAssessmentDocument memo={memo} />
        </div>
      </>
      )}
    </div>
  );
};

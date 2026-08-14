import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  X,
  ExternalLink,
} from 'lucide-react';
import type { DashboardData, QuarterReadinessData } from '../types';
import { formatCurrency } from '@/shared/utilities';

export interface FVUReadinessWidgetProps {
  data: DashboardData;
}

export function FVUReadinessWidget({ data }: FVUReadinessWidgetProps) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<'missing-pan' | 'zero-tax' | null>(null);

  // Extract raw lists & values with fallbacks
  const missingPANs = Array.isArray(data?.missingPANs) ? data.missingPANs : [];
  const zeroTaxEntries = Array.isArray(data?.zeroTaxEntries) ? data.zeroTaxEntries : [];
  const activeEmp = Math.max(0, data?.activeEmployees ?? 0);
  const pendingEmp = Math.max(0, data?.pendingEmployees ?? 0);
  const totalEmployees = Math.max(1, activeEmp + pendingEmp);
  
  const missingPanCount = missingPANs.length;
  const validPanCount = Math.max(0, totalEmployees - missingPanCount);
  const panValidityPct = Math.min(100, Math.max(0, Math.round((validPanCount / totalEmployees) * 100)));

  const zeroTaxCount = zeroTaxEntries.length;

  // Quarter readiness score
  const currentQKey = (data?.currentQuarter as keyof QuarterReadinessData) || 'Q1';
  const currentQR = data?.quarterReadiness?.[currentQKey] ?? {
    pct: data?.currentQuarterCompletion?.pct ?? 80,
    processed: 0,
    expected: 0,
  };
  const quarterPct = Math.min(100, Math.max(0, currentQR.pct ?? 80));

  // Compute Overall Filing Readiness Score (0-100)
  const quarterScoreComponent = quarterPct * 0.40;
  const panScoreComponent = panValidityPct * 0.30;
  const zeroTaxScoreComponent = zeroTaxCount === 0 ? 30 : Math.max(10, 30 - zeroTaxCount * 4);
  const challanScoreComponent = (data?.prevQuarterPending ?? 0) === 0 ? 15 : 8;

  const overallReadinessScore = Math.min(
    100,
    Math.max(0, Math.round(quarterScoreComponent + panScoreComponent + zeroTaxScoreComponent + challanScoreComponent))
  );

  // Score status
  const getReadinessTone = (score: number) => {
    if (score >= 90) {
      return {
        label: 'Ready for Filing',
        ringColor: 'stroke-indigo-600 dark:stroke-indigo-400',
        icon: ShieldCheck,
        textColor: 'text-indigo-600 dark:text-indigo-400',
      };
    }
    if (score >= 75) {
      return {
        label: 'Review Required',
        ringColor: 'stroke-amber-500 dark:stroke-amber-400',
        icon: AlertTriangle,
        textColor: 'text-amber-600 dark:text-amber-400',
      };
    }
    return {
      label: 'Action Required',
      ringColor: 'stroke-rose-500 dark:stroke-rose-400',
      icon: ShieldAlert,
      textColor: 'text-rose-600 dark:text-rose-400',
    };
  };

  const tone = getReadinessTone(overallReadinessScore);
  const ToneIcon = tone.icon;

  const handleAction = (actionType: 'missing-pan' | 'zero-tax') => {
    setActiveModal(actionType);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              FVU Filing Readiness
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-500/20">
              {data?.currentQuarter ?? 'Q1'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pre-audit verification for Form 24Q / 26Q NSDL filing
          </p>
        </div>

        <div className={`flex items-center gap-1.5 text-xs font-medium ${tone.textColor}`}>
          <ToneIcon className="w-3.5 h-3.5" />
          {tone.label}
        </div>
      </div>

      {/* Score + Checks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Score Ring */}
        <div className="lg:col-span-4 flex flex-col items-center text-center py-2">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${tone.ringColor} transition-all duration-1000 ease-out`}
                strokeDasharray={`${overallReadinessScore}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {overallReadinessScore}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {overallReadinessScore >= 90
              ? 'All checks passed'
              : `${missingPanCount + zeroTaxCount} items to resolve`}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            FY {data?.fy ?? '2026-27'}
          </p>
        </div>

        {/* Verification Checks */}
        <div className="lg:col-span-8 space-y-3">
          {/* Check 1: PAN */}
          <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 shrink-0">
              {missingPanCount === 0
                ? <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                : <AlertTriangle className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">PAN Validity</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{panValidityPct}%</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {missingPanCount === 0
                  ? `${validPanCount} PANs verified`
                  : `${missingPanCount} missing or invalid`}
              </p>
            </div>
          </div>

          {/* Check 2: Tax Regime */}
          <div className="flex items-start gap-3 py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="mt-0.5 shrink-0">
              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Zero Tax Entries</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{zeroTaxCount} flagged</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {zeroTaxCount === 0
                  ? 'All entries verified with declarations'
                  : `${zeroTaxCount} need audit verification`}
              </p>
            </div>
          </div>

          {/* Check 3: Challan */}
          <div className="flex items-start gap-3 py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="mt-0.5 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Challan Match</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Matched</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {formatCurrency(data?.ytdTax ?? 0)} reconciled
              </p>
            </div>
          </div>

          {/* Check 4: Quarterly Completeness */}
          <div className="flex items-start gap-3 py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="mt-0.5 shrink-0">
              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Data Completeness</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{quarterPct}%</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {currentQR.processed ?? 0} of {currentQR.expected ?? 3} months processed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleAction('missing-pan')}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium truncate">Fix PANs</span>
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums">{missingPanCount}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('zero-tax')}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium truncate">Zero Tax</span>
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums">{zeroTaxCount}</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Fix Missing PANs */}
      {activeModal === 'missing-pan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Missing PANs ({missingPanCount})
              </h4>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Section 206AA requires valid PANs. Missing PANs attract 20% TDS.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {missingPANs.length > 0 ? (
                missingPANs.map((name, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
                    <span className="text-[10px] text-slate-400">Missing</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  All PANs valid.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/payroll?tab=employees');
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                Employee Directory
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Zero Tax */}
      {activeModal === 'zero-tax' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Zero Tax Audit ({zeroTaxCount})
              </h4>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify zero-tax entries against Form 15G/15H or Section 197 certificates before filing.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {zeroTaxEntries.length > 0 ? (
                zeroTaxEntries.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item}</span>
                    <span className="text-[10px] text-slate-400">Nil Tax</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  All entries verified.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/reports');
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                Tax Reports
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}

export default FVUReadinessWidget;

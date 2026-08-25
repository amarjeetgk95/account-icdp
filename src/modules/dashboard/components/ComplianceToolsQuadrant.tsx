import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  X,
  ExternalLink,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { DashboardData, QuarterReadinessData } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface ComplianceToolsQuadrantProps {
  data: DashboardData;
}

export function ComplianceToolsQuadrant({ data }: ComplianceToolsQuadrantProps) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<'missing-pan' | 'zero-tax' | null>(null);

  const missingPANs = Array.isArray(data?.missingPANs) ? data.missingPANs : [];
  const zeroTaxEntries = Array.isArray(data?.zeroTaxEntries) ? data.zeroTaxEntries : [];
  const activeEmp = Math.max(0, data?.activeEmployees ?? 0);
  const pendingEmp = Math.max(0, data?.pendingEmployees ?? 0);
  const totalEmployees = Math.max(1, activeEmp + pendingEmp);

  const missingPanCount = missingPANs.length;
  const validPanCount = Math.max(0, totalEmployees - missingPanCount);
  const panValidityPct = Math.min(100, Math.max(0, Math.round((validPanCount / totalEmployees) * 100)));
  const zeroTaxCount = zeroTaxEntries.length;

  const currentQKey = (data?.currentQuarter as keyof QuarterReadinessData) || 'Q1';
  const currentQR = data?.quarterReadiness?.[currentQKey] ?? {
    pct: data?.currentQuarterCompletion?.pct ?? 80,
    processed: 0,
    expected: 0,
  };
  const quarterPct = Math.min(100, Math.max(0, currentQR.pct ?? 80));

  const quarterScoreComponent = quarterPct * 0.4;
  const panScoreComponent = panValidityPct * 0.3;
  const zeroTaxScoreComponent = zeroTaxCount === 0 ? 30 : Math.max(10, 30 - zeroTaxCount * 4);
  const challanScoreComponent = (data?.prevQuarterPending ?? 0) === 0 ? 15 : 8;

  const overallReadinessScore = Math.min(
    100,
    Math.max(0, Math.round(quarterScoreComponent + panScoreComponent + zeroTaxScoreComponent + challanScoreComponent))
  );

  const getReadinessTone = (score: number) => {
    if (score >= 90) {
      return {
        label: 'Ready for NSDL FVU',
        ringColor: 'stroke-indigo-600 dark:stroke-indigo-400',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        icon: ShieldCheck,
      };
    }
    if (score >= 75) {
      return {
        label: 'Review Required',
        ringColor: 'stroke-amber-500 dark:stroke-amber-400',
        textColor: 'text-amber-600 dark:text-amber-400',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Action Required',
      ringColor: 'stroke-rose-500 dark:stroke-rose-400',
      textColor: 'text-rose-600 dark:text-rose-400',
      icon: ShieldAlert,
    };
  };

  const tone = getReadinessTone(overallReadinessScore);
  const ToneIcon = tone.icon;

  const deadlines = data?.statutoryDeadlines;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-100 dark:ring-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Compliance Audit & Utilities
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              NSDL FVU verification & statutory deadlines
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 text-xs font-semibold ${tone.textColor}`}>
          <ToneIcon className="w-4 h-4" />
          <span>{tone.label}</span>
        </div>
      </div>

      {/* FVU Pre-Audit + Countdown Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Radial Gauge */}
        <div className="sm:col-span-5 flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${tone.ringColor} transition-all duration-1000 ease-out`}
                strokeDasharray={`${overallReadinessScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {overallReadinessScore}%
            </span>
          </div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Form 24Q {data?.currentQuarter ?? 'Q1'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {missingPanCount === 0 ? '✓ PANs verified' : `⚠️ ${missingPanCount} missing PAN`}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Challan: {formatCurrency(data?.ytdTax ?? 0)}
            </div>
          </div>
        </div>

        {/* Statutory Filing Countdown */}
        <div className="sm:col-span-7 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock size={12} className="text-indigo-500" />
              <span>Next Filing Due:</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {deadlines?.nextQuarterFilingDate ?? 'Oct 31, 2026'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Monthly TDS Deposit:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {deadlines?.nextTdsDepositDate ?? '7th of Month'}
            </span>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Days to deadline:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                (deadlines?.daysUntilFiling ?? 45) <= 14
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {deadlines?.daysUntilFiling ?? 45} Days Remaining
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Action Chips */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveModal('missing-pan')}
          className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="text-slate-700 dark:text-slate-300 truncate">Fix PANs</span>
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {missingPanCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('zero-tax')}
          className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="text-slate-700 dark:text-slate-300 truncate">Zero-Tax Audit</span>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {zeroTaxCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <span>Generate 24Q</span>
          <ArrowRight size={12} />
        </button>
      </div>



      {/* MODAL: Missing PANs */}
      {activeModal === 'missing-pan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-lg space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Missing PANs ({missingPanCount})
              </h4>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Section 206AA requires valid PANs. Deductees without PAN attract 20% higher TDS rate.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {missingPANs.length > 0 ? (
                missingPANs.map((name, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
                    <span className="text-[10px] text-rose-500 font-semibold">Missing PAN</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">All PANs valid.</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/payroll?tab=employees');
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
              >
                Employee Directory
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Zero Tax */}
      {activeModal === 'zero-tax' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-lg space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Zero Tax Audit ({zeroTaxCount})
              </h4>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify zero-tax entries against Form 15G/15H or Section 197 lower deduction certificates before filing.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {zeroTaxEntries.length > 0 ? (
                zeroTaxEntries.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Nil Tax</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">All entries verified.</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/reports');
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
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

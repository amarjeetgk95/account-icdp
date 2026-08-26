import React from 'react';
import { Receipt, Coins, Sparkles, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface SalaryPreviewCardProps {
  employeeName?: string;
  basicPay: number;
  grossPay: number;
  deductionsTotal: number;
  netTakeHome: number;
  effectiveDaPercent: number;
  onRecalculate?: () => void;
}

export const SalaryPreviewCard: React.FC<SalaryPreviewCardProps> = ({
  employeeName,
  basicPay,
  grossPay,
  deductionsTotal,
  netTakeHome,
  effectiveDaPercent,
  onRecalculate,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700/80">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 shrink-0">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Real-time Salary Overview
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
              {employeeName ? (
                <span>{employeeName}</span>
              ) : (
                <span className="text-slate-400 font-normal italic">New Employee Profile</span>
              )}
              {basicPay > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Basic: ₹{basicPay.toLocaleString('en-IN')}
                </span>
              )}
            </h3>
          </div>
        </div>

        {basicPay > 0 && onRecalculate && (
          <button
            type="button"
            onClick={onRecalculate}
            className="self-start lg:self-auto text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600/60 hover:bg-indigo-600 text-indigo-100 border border-indigo-400/40 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title={`Recalculate Gujarat statutory rules: DA ${effectiveDaPercent}%, NPS 10%, PT ₹200`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Recalculate 7th Pay Rules ({effectiveDaPercent}%)
          </button>
        )}
      </div>

      {/* Real-time KPI Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-3.5 border-t border-slate-700/80">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 sm:p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Basic Salary
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-white mt-0.5 block">
            ₹{basicPay.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-2.5 sm:p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center justify-between">
            Gross Earnings <TrendingUp className="h-3 w-3" />
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-300 mt-0.5 block">
            ₹{grossPay.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-2.5 sm:p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block flex items-center justify-between">
            Deductions <TrendingDown className="h-3 w-3" />
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-rose-300 mt-0.5 block">
            ₹{deductionsTotal.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-blue-950/60 border border-blue-700/60 rounded-xl p-2.5 sm:p-3 shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block flex items-center justify-between">
            Take-Home Net <CheckCircle2 className="h-3 w-3" />
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-blue-100 mt-0.5 block">
            ₹{netTakeHome.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};

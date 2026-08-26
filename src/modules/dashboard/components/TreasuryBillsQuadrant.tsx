import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  FilePlus,
  ArrowRight,
  ChevronRight,
  Landmark,
} from 'lucide-react';
import type { TreasurySummary } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface TreasuryBillsQuadrantProps {
  treasury: TreasurySummary;
  fy: number;
}

export function TreasuryBillsQuadrant({ treasury, fy }: TreasuryBillsQuadrantProps) {
  const navigate = useNavigate();

  const totalTreasuryDisbursements = (treasury?.gtr30GrossTotal ?? 0) + (treasury?.gtr44GrossTotal ?? 0);
  const totalBills = (treasury?.gtr30Count ?? 0) + (treasury?.gtr44Count ?? 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100 dark:ring-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Landmark size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Treasury & Bill Registers
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              GTR-30 Pay Bills & GTR-44 DC Contingency Bills
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          FY {fy}-{(fy + 1).toString().slice(-2)}
        </span>
      </div>

      {/* Primary Highlights Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Total Treasury Value
          </span>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
            {formatCurrency(totalTreasuryDisbursements)}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {totalBills} total bills booked
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Pending / Drafts
          </span>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
            {(treasury?.gtr30PendingCount ?? 0) + (treasury?.gtr44DraftCount ?? 0)}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Require submission / passing
          </span>
        </div>
      </div>

      {/* Module Split Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* GTR-30 Card */}
        <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  GTR-30 Pay Bills
                </span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                10-Page Format
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Registered:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {treasury?.gtr30Count ?? 0} Bills
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Gross Total:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatCurrency(treasury?.gtr30GrossTotal ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/gtr30/create')}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <FilePlus size={13} />
              <span>Create Bill</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/gtr30/list')}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs transition-colors cursor-pointer"
              title="View Register"
            >
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* GTR-44 Card */}
        <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  GTR-44 DC Bills
                </span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                Contingency
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Total Vouchers:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {treasury?.gtr44Count ?? 0} Bills
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Expenditure:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatCurrency(treasury?.gtr44GrossTotal ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/gtr44/create')}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <FilePlus size={13} />
              <span>Create DC Bill</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/gtr44/list')}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs transition-colors cursor-pointer"
              title="View DC Register"
            >
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Navigation Strip */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => navigate('/gtr30/employee-management')}
          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>GTR-30 Employee Management</span>
          <ChevronRight size={12} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/gtr44/list')}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <span>All Treasury Registers</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

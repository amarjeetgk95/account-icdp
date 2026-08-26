import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { MonthlyRoadmapData } from '../types';

interface SalaryMatrixQuadrantProps {
  roadmap: MonthlyRoadmapData[];
  pendingEmployees: number;
}

function safePct(value: number | undefined | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

function pendingNamesOf(month: MonthlyRoadmapData | undefined | null): string[] {
  return Array.isArray(month?.pendingNames) ? month.pendingNames : [];
}

export function SalaryMatrixQuadrant({
  roadmap,
  pendingEmployees,
}: SalaryMatrixQuadrantProps) {
  const navigate = useNavigate();
  const [selectedMonthName, setSelectedMonthName] = useState<string | null>(null);

  const months = Array.isArray(roadmap) ? roadmap : [];
  const selectedMonth = months.find((m) => m?.month === selectedMonthName) ?? null;
  const selectedPendingNames = selectedMonth ? pendingNamesOf(selectedMonth) : [];

  const getMonthClasses = (status: string, isCurrent: boolean, isSelected: boolean) => {
    if (isSelected) {
      return 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20';
    }

    if (isCurrent) {
      return 'border-indigo-500/80 dark:border-indigo-400/80 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 font-semibold';
    }

    switch (status) {
      case 'complete':
        return 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300';
      case 'partial':
        return 'border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300';
      case 'empty':
        return 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400';
      default: // idle
        return 'border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10 text-slate-400 dark:text-slate-600 opacity-60';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-100 dark:ring-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Salary TDS & 12-Month IT Matrix
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Monthly payroll cycle & employee income tax ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {pendingEmployees === 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle2 size={11} />
              Current Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              <AlertCircle size={11} />
              {pendingEmployees} Pending
            </span>
          )}
        </div>
      </div>

      {/* 12-Month Progression Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Financial Year Progression (Apr – Mar)
          </span>
          <span className="text-[10px] text-slate-400">
            Click any month to inspect roster
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {months.map((month, i) => {
            if (!month) return null;
            const monthName = month.month ?? '';
            const isSelected = monthName === selectedMonthName;
            const pct = safePct(month.pct);
            const pendingCount = pendingNamesOf(month).length;

            return (
              <button
                key={monthName || `month-${i}`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedMonthName(isSelected ? null : monthName);
                }}
                className={`group relative text-center p-2 rounded-xl border transition-all duration-150 cursor-pointer ${getMonthClasses(
                  month.status,
                  !!month.isCurrent,
                  isSelected
                )}`}
                title={`${monthName}: ${month.processed || 0}/${month.active || 0} processed (${pct}%)`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider">
                  {monthName.slice(0, 3)}
                </div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {pct}%
                </div>
                {month.isCurrent && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mx-auto mt-0.5" />
                )}
                {!month.future && !month.isCurrent && pendingCount > 0 && (
                  <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5 leading-none">
                    {pendingCount} left
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Month View if clicked */}
      {selectedMonth && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {selectedMonth.month} Roster — {selectedMonth.processed} of {selectedMonth.active} Complete ({safePct(selectedMonth.pct)}%)
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/payroll?month=${selectedMonth.month}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Fill {selectedMonth.month} Roster</span>
              <ChevronRight size={12} />
            </button>
          </div>

          {selectedPendingNames.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
              {selectedPendingNames.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : selectedMonth.future ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Future work month. Entries open when payroll cycle reaches {selectedMonth.month}.
            </p>
          ) : (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ All {selectedMonth.active} employees recorded for {selectedMonth.month}.
            </p>
          )}
        </div>
      )}

      {/* Deep Link Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => navigate('/payroll')}
          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Monthly Payroll Roster
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Gross, DA & TDS Deductions
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/paybill/matrix')}
          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              12-Month IT Matrix
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Allowance & Deduction Ledger
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => navigate('/payroll?tab=employees')}
          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>Employee Master Directory</span>
          <ChevronRight size={12} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/paybill/employee')}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <span>Individual Employee IT Ledger</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

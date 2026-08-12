import { useState } from 'react';
import type { MonthlyRoadmapData } from '../types';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Users } from 'lucide-react';

interface FYRoadmapProps {
  data: MonthlyRoadmapData[];
}

function safePct(value: number | undefined | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

function safeCount(value: number | undefined | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function pendingNamesOf(month: MonthlyRoadmapData | undefined | null): string[] {
  return Array.isArray(month?.pendingNames) ? month.pendingNames : [];
}

export function FYRoadmap({ data }: FYRoadmapProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const months = Array.isArray(data) ? data : [];
  const selectedMonth = months.find((m) => m?.month === selected) ?? null;
  const selectedPendingNames = selectedMonth ? pendingNamesOf(selectedMonth) : [];

  const statusStyles = {
    complete: 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    partial: 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    empty: 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
    idle: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500',
  };

  return (
    <div className="card p-5 dark:bg-slate-900 dark:border-slate-800/80 hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Financial Year Roadmap
            </h3>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              12-month salary processing status (Mar to Feb). Click a month to see remaining entries.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/payroll')}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors group"
        >
          Payroll Module
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-6 lg:grid-cols-12 gap-2 pb-2">
        {months.map((month, i) => {
          if (!month) return null;
          const monthName = month.month ?? '';
          const isSelected = monthName === selected;
          const pct = safePct(month.pct);
          const pendingCount = pendingNamesOf(month).length;
          return (
            <button
              key={monthName || `month-${i}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelected(isSelected ? null : monthName)}
              className={`group relative shrink-0 w-20 sm:w-auto text-center p-2.5 rounded-xl border transition-all cursor-pointer hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 snap-start ${
                statusStyles[month.status] || statusStyles.idle
              } ${month.isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 font-bold' : ''} ${
                isSelected ? 'shadow-md border-indigo-400 dark:border-indigo-500' : ''
              }`}
              title={`${monthName}: ${safeCount(month.processed)}/${safeCount(month.active)} processed (${pct}%) · ${pendingCount} remaining`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {monthName.slice(0, 3)}
              </div>
              <div className="text-xs font-black mt-1">
                {pct}%
              </div>
              {month.isCurrent && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
              )}
              {!month.future && pendingCount > 0 && (
                <span
                  className="absolute -bottom-1 -left-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[8px] font-black"
                  title={`${pendingCount} remaining entries`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedMonth && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {selectedMonth.month ?? ''} — Remaining Entries ({selectedPendingNames.length})
              </span>
            </div>
            <button
              onClick={() => navigate('/payroll')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors group"
            >
              Go to Payroll
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {selectedMonth.future ? (
            <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {selectedMonth.month ?? ''} salary is paid next month — entries open once it becomes the current month.
            </p>
          ) : selectedPendingNames.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {selectedPendingNames.map((name) => (
                <span
                  key={name}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold text-rose-700 dark:text-rose-300"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              All salary entries complete for {selectedMonth.month ?? ''}.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Complete (100%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Partial Data
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Empty / Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-800" /> Active Month
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-black">n</span> Remaining
          Entries
        </span>
      </div>
    </div>
  );
}

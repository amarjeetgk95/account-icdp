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

  const getMonthClasses = (status: string, isCurrent: boolean, isSelected: boolean) => {
    if (isSelected) {
      return 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100 shadow-[0_2px_8px_-2px_rgba(79,70,229,0.25)]';
    }
    
    let base = '';
    switch(status) {
      case 'complete':
      case 'partial':
        base = 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300';
        break;
      case 'empty':
        base = 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400';
        break;
      default: // idle
        base = 'bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 opacity-50';
    }

    if (isCurrent) {
      return `${base} border-indigo-500 dark:border-indigo-400`;
    }
    
    if (status === 'idle') {
      return `${base} border-slate-100 dark:border-slate-800`;
    }
    
    return `${base} border-slate-200 dark:border-slate-700`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)] p-5 transition-all">
      <div className="flex items-center gap-4 pb-4 mb-4 border-b border-slate-100/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-100 dark:ring-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Calendar size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
              Financial Year 12-Month Roadmap
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              12-month salary processing status (April to March). Click any month to inspect pending entries.
            </p>
          </div>
        </div>
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
              onClick={() => {
                setSelected(isSelected ? null : monthName);
              }}
              className={`group relative shrink-0 w-20 sm:w-auto text-center p-2.5 rounded-xl border transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 snap-start cursor-pointer ${getMonthClasses(month.status, !!month.isCurrent, isSelected)}`}
              title={`${monthName}: ${safeCount(month.processed)}/${safeCount(month.active)} processed (${pct}%) · ${pendingCount} remaining · Status: ${month.status}`}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {monthName.slice(0, 3)}
              </div>
              <div className="text-xs font-semibold mt-0.5 tabular-nums">
                {pct}%
              </div>
              {!month.future && pendingCount > 0 && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {pendingCount} left
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedMonth && (
        <div className="mt-4 pt-3 border-t border-slate-100/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {selectedMonth.month ?? ''} — Remaining Entries ({selectedPendingNames.length})
              </span>
            </div>
            <button
              onClick={() => navigate(`/payroll?month=${selectedMonth.month}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Fill {selectedMonth.month} Roster</span>
              <ChevronRight size={13} />
            </button>
          </div>
          {selectedMonth.future ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {selectedMonth.month ?? ''} salary is paid next month — entries open once it becomes the current month.
            </p>
          ) : selectedPendingNames.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {selectedPendingNames.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              All salary entries complete for {selectedMonth.month ?? ''}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

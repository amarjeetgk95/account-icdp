import { useEffect, useState } from 'react';
import { CalendarClock, Clock, RefreshCw } from 'lucide-react';
import { formatFinancialYear } from '@/shared/utilities/date';
import { formatRelativeTime } from '../utils/derive';
import type { StatutoryDeadlineInfo } from '../types';

interface DashboardHeaderProps {
  officeName: string;
  fy: number;
  entryMonthName?: string;
  filing?: StatutoryDeadlineInfo;
  updatedAt: number;
  isFetching: boolean;
  onRefresh: () => void;
}

function filingTone(days: number, hasData: boolean): string {
  if (!hasData) return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
  if (days <= 15) return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';
  if (days <= 45) return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';
}

export function DashboardHeader({
  officeName,
  fy,
  entryMonthName,
  filing,
  updatedAt,
  isFetching,
  onRefresh,
}: DashboardHeaderProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const hasData = updatedAt > 0;
  const updatedLabel = hasData ? `Updated ${formatRelativeTime(updatedAt, now)}` : 'Waiting for data';
  const days = filing?.daysUntilFiling ?? 0;
  const dueLabel = days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`;

  return (
    <div className="shrink-0 border-b border-slate-200/70 bg-white/80 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/60 sm:px-4 sm:py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xs font-extrabold tracking-tight text-slate-900 dark:text-white">
              {officeName || 'Account Branch'}
            </h1>
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.2 text-[11px] font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
              {formatFinancialYear(fy)}
            </span>
            {entryMonthName && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.2 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {entryMonthName} entry
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Clock size={11} className="text-slate-400" aria-hidden="true" />
            <span>{updatedLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filing && (
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 ${filingTone(days, hasData)}`}
              title={`${filing.nextQuarterName} due ${filing.nextQuarterFilingDate}`}
            >
              <CalendarClock size={13} aria-hidden="true" />
              <div className="leading-none">
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                  {filing.nextQuarterName}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold">
                  {filing.nextQuarterFilingDate} · {dueLabel}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="hidden sm:inline">{isFetching ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

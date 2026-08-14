import { Inbox } from 'lucide-react';
import { MONTHS } from '@/shared/constants';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { EmptyState } from '@/shared/components/EmptyState';
import {
  shortMonth,
  completionPercentage,
  computeCompletionSummary,
  completionBadgeClass,
  completionBarClass,
} from '../utils/completion';
import type { OfficeCompletion } from '../types';

interface EntryCompletionProps {
  data: OfficeCompletion[];
  isLoading: boolean;
}

export { computeCompletionSummary };

export function EntryCompletion({ data, isLoading }: EntryCompletionProps) {
  if (isLoading) {
    return (
      <div className="p-5">
        <SkeletonTable rows={4} cols={6} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={Inbox}
        title="No completion data yet."
        hint="Monthly status will appear here once offices begin data entry."
      />
    );
  }

  const { completeCount, avgPct } = computeCompletionSummary(data);

  return (
    <div className="overflow-x-auto admin-table ec-scroll">
      <div className="flex items-center gap-5 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shadow-sm" />
          Entered
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600 ring-1 ring-inset ring-slate-300/60 dark:ring-slate-500/40" />
          Pending
        </span>
      </div>
      <table className="table table-sm">
        <thead>
          <tr>
            <th className="ec-sticky-col">Office</th>
            <th className="text-center">FY</th>
            {MONTHS.map((m) => (
              <th key={m} className="text-center" title={m}>
                {shortMonth(m)}
              </th>
            ))}
            <th className="text-center">Completion</th>
          </tr>
        </thead>
        <tbody>
          {data.map((office) => {
            const filled = new Set(office.months || []);
            const pct = completionPercentage(office);
            const bar = completionBarClass(office);
            return (
              <tr key={office.office_id}>
                <td className="ec-sticky-col font-bold text-slate-900 dark:text-slate-100" title={office.office_name}>
                  {office.office_name}
                </td>
                <td className="text-center text-slate-500 dark:text-slate-400 tabular-nums">
                  {office.fy}-{String(office.fy + 1).slice(-2)}
                </td>
                {MONTHS.map((m) => (
                  <td key={m} className="text-center px-1">
                    <span
                      title={`${office.office_name} — ${m}${filled.has(m) ? '' : ' (missing)'}`}
                      className={
                        'inline-block w-4 h-4 rounded-full transition-all duration-150 ' +
                        (filled.has(m)
                          ? 'bg-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-600 ring-1 ring-inset ring-slate-300/60 dark:ring-slate-500/40')
                      }
                    />
                  </td>
                ))}
                <td className="text-center">
                  <div className="inline-flex flex-col items-center gap-1.5 w-24">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${completionBadgeClass(office)}`}
                    >
                      {pct}%
                    </span>
                    <div className="progress w-full dark:bg-slate-700/60">
                      <div
                        className={`progress-bar ${bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{completeCount}</span>{' '}
          of {data.length} offices complete
        </span>
        <span className="tabular-nums">
          Average{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">{avgPct}%</span>
        </span>
      </div>
    </div>
  );
}


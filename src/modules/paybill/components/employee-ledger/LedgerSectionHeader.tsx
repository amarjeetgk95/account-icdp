import { formatInr } from './format';

interface LedgerSectionHeaderProps {
  label: string;
  toneClasses: string;
  summary: { total: number; count: number };
  colSpan: number;
}

/**
 * Section header row for EARNING / DEDUCTION groups (static, non-collapsible):
 * - Clear group label `${label} (Rs.)`
 * - Clean row-count pill and sub-total badge
 */
export function LedgerSectionHeader({
  label,
  toneClasses,
  summary,
  colSpan,
}: LedgerSectionHeaderProps) {
  const isEarning = label.toUpperCase().includes('EARNING');

  return (
    <tr className={`border-y border-slate-200/80 dark:border-slate-800 ${toneClasses}`}>
      <td colSpan={colSpan} className="py-1 px-3">
        <div className="flex items-center gap-2 py-0.5 min-h-[26px] font-sans font-bold w-full text-left">
          <span className="tracking-wide text-xs uppercase font-extrabold text-slate-800 dark:text-slate-100">
            {label} (Rs.)
          </span>

          <span
            className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-full px-2 py-0.5 tabular-nums"
            title={`${summary.count} parameter row${summary.count === 1 ? '' : 's'} in this section`}
          >
            {summary.count} rows
          </span>

          <span
            className={`ml-auto font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border tabular-nums ${
              isEarning
                ? 'bg-blue-50/90 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80'
                : 'bg-rose-50/90 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'
            }`}
            title="Total sum across 12 months"
          >
            {formatInr(summary.total)}
          </span>
        </div>
      </td>
    </tr>
  );
}



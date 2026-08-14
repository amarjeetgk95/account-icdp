import type { LucideIcon } from 'lucide-react';

export type StatTone = 'indigo' | 'emerald' | 'amber' | 'sky' | 'violet' | 'rose';

const TONE_STYLES: Record<StatTone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100 group-hover:bg-indigo-100/70',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 group-hover:bg-emerald-100/70',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100 group-hover:bg-amber-100/70',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100 group-hover:bg-sky-100/70',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100 group-hover:bg-violet-100/70',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100 group-hover:bg-rose-100/70',
};

interface StatCardProps {
  label: string;
  value: number | string | undefined;
  /** Semantic tone — uses a preset icon background color */
  tone?: StatTone;
  /** CSS gradient string — overrides tone for custom icon backgrounds (admin use) */
  gradient?: string;
  /** Subtitle / hint text below the value */
  sub?: string;
  /** @deprecated Alias for `sub` — kept for backward compatibility */
  hint?: string;
  icon?: LucideIcon;
  /** Small icon in the top-right corner */
  deltaIcon?: LucideIcon;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  tone = 'indigo',
  gradient,
  sub,
  hint,
  icon: Icon,
  deltaIcon: DeltaIcon,
  onClick,
}: StatCardProps) {
  const display = value === undefined || value === null
    ? '—'
    : typeof value === 'number'
      ? (Number.isNaN(value) ? '—' : value.toLocaleString('en-IN'))
      : String(value);

  const subtitle = sub ?? hint;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
      className={`group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-[0_8px_24px_-12px_rgba(99,102,241,0.22)] animate-fade-in ${
        onClick
          ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          gradient ? (
            <span
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ background: gradient }}
            >
              <Icon size={18} strokeWidth={2} />
            </span>
          ) : (
            <div
              className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center transition-colors shrink-0 ${TONE_STYLES[tone] || TONE_STYLES.indigo}`}
            >
              <Icon size={18} strokeWidth={2} />
            </div>
          )
        )}
        {DeltaIcon && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700/60 text-slate-400 dark:text-slate-400">
            <DeltaIcon size={13} />
          </span>
        )}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-4">
        {label}
      </div>
      <div className="text-[1.7rem] leading-8 font-semibold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5 tabular-nums">
        {display}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          {subtitle}
        </div>
      )}
    </div>
  );
}

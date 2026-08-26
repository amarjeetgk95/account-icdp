import type { LucideIcon } from 'lucide-react';

type StatTone = 'indigo' | 'emerald' | 'amber' | 'sky' | 'violet' | 'rose';

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
  /** Compact density for dense dashboards — smaller padding/typography, modern flat look */
  compact?: boolean;
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
  compact = false,
}: StatCardProps) {
  const display = value === undefined || value === null
    ? '—'
    : typeof value === 'number'
      ? (Number.isNaN(value) ? '—' : value.toLocaleString('en-IN'))
      : String(value);

  const subtitle = sub ?? hint;

  // Compact = balanced modern — ~25% smaller card, but text stays comfortably readable
  const cardPadding = compact ? 'px-3.5 py-3' : 'p-4';
  const cardRadius = compact ? 'rounded-xl' : 'rounded-2xl';
  const labelSize = compact ? 'text-[11px] leading-none' : 'text-[11px]';
  const valueSize = compact ? 'text-[16px] leading-5' : 'text-lg leading-7';
  const subSize = compact ? 'text-xs leading-3.5' : 'text-xs';
  const iconBox = compact ? 'w-7 h-7 rounded-lg' : 'w-8 h-8 rounded-lg';
  const iconSize = compact ? 14 : 16;
  const topGap = compact ? 'mt-2' : 'mt-3';
  const hoverShadow = compact
    ? 'hover:shadow-none hover:border-slate-200 dark:hover:border-slate-700'
    : 'hover:shadow-[0_8px_24px_-12px_rgba(99,102,241,0.22)] hover:border-slate-300 dark:hover:border-slate-700';

  const accentBorder: Record<StatTone, string> = {
    indigo: 'border-l-indigo-500/80',
    emerald: 'border-l-emerald-500/80',
    amber: 'border-l-amber-500/80',
    sky: 'border-l-sky-500/80',
    violet: 'border-l-violet-500/80',
    rose: 'border-l-rose-500/80',
  };

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
      className={`group bg-white dark:bg-slate-900 border ${compact ? 'border-l-2' : ''} ${compact ? accentBorder[tone] || accentBorder.indigo : ''} border-slate-200/80 dark:border-slate-800 ${cardRadius} ${cardPadding} transition-all duration-200 ${hoverShadow} animate-fade-in ${
        onClick
          ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2'
          : ''
      }`}
    >
      <div className={`flex items-center justify-between gap-2 ${compact ? 'gap-2' : 'gap-3'} ${compact ? '' : 'items-start'}`}>
        <div className={`${labelSize} font-semibold uppercase tracking-wide ${compact ? 'tracking-[0.04em]' : ''} text-slate-500 dark:text-slate-400 truncate`}>
          {label}
        </div>
        {Icon && (
          gradient ? (
            <span
              className={`${iconBox} inline-flex items-center justify-center text-white shadow-sm shrink-0`}
              style={{ background: gradient }}
            >
              <Icon size={iconSize} strokeWidth={2} />
            </span>
          ) : (
            <div
              className={`${iconBox} ring-1 flex items-center justify-center transition-colors shrink-0 ${TONE_STYLES[tone] || TONE_STYLES.indigo}`}
            >
              <Icon size={iconSize} strokeWidth={2} />
            </div>
          )
        )}
        {DeltaIcon && !compact && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700/60 text-slate-400 dark:text-slate-400">
            <DeltaIcon size={13} />
          </span>
        )}
      </div>
      <div className={`${valueSize} font-semibold text-slate-900 dark:text-slate-100 tracking-tight ${topGap} tabular-nums truncate`}>
        {display}
      </div>
      {subtitle && (
        <div className={`${subSize} text-slate-400 dark:text-slate-500 ${compact ? 'mt-1 truncate' : 'mt-1.5'}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

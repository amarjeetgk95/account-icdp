import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'teal';
  trend?: string;
  pct?: number;
}

export function StatCard({ label, value, sub, icon: Icon, color = 'indigo', trend, pct }: StatCardProps) {
  const colorStyles = {
    emerald: {
      border: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
      text: 'text-emerald-700 dark:text-emerald-400',
      progress: 'bg-emerald-500',
    },
    amber: {
      border: 'border-l-amber-500',
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
      text: 'text-amber-700 dark:text-amber-400',
      progress: 'bg-amber-500',
    },
    indigo: {
      border: 'border-l-indigo-500',
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
      text: 'text-indigo-700 dark:text-indigo-300',
      progress: 'bg-indigo-600',
    },
    rose: {
      border: 'border-l-rose-500',
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
      text: 'text-rose-700 dark:text-rose-400',
      progress: 'bg-rose-500',
    },
    teal: {
      border: 'border-l-teal-500',
      iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400',
      text: 'text-teal-700 dark:text-teal-400',
      progress: 'bg-teal-500',
    },
  };

  const currentStyle = colorStyles[color] || colorStyles.indigo;
  const safePct = typeof pct === 'number' && Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;

  return (
    <div
      className={`card p-4 border-l-4 ${currentStyle.border} hover:shadow-lg transition-all dark:bg-slate-900 dark:border-slate-800/80 group flex flex-col min-h-[152px]`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label ?? ''}
        </span>
        {Icon && (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${currentStyle.iconBg}`}
          >
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="flex items-baseline justify-between gap-2 mt-1">
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            {value ?? '—'}
          </div>
          {trend && (
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>

        {pct !== undefined && (
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${currentStyle.progress}`}
              style={{ width: `${safePct}%` }}
            />
          </div>
        )}

        {sub && (
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const styles: Record<string, { dot: string; bar: string; text: string }> = {
    emerald: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    amber: { dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    indigo: { dot: 'bg-indigo-500', bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
    rose: { dot: 'bg-rose-500', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
    teal: { dot: 'bg-teal-500', bar: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400' },
  };

  const s = styles[color] ?? styles.indigo;
  const safePct = typeof pct === 'number' && Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;

  return (
    <div className="card p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-md transition-all group">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
          {label ?? ''}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
            {value ?? '—'}
          </div>
          {sub && (
            <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {sub}
            </div>
          )}
        </div>
        {Icon && (
          <Icon size={16} className={`${s.text} opacity-40 group-hover:opacity-70 transition-opacity shrink-0`} />
        )}
      </div>

      {pct !== undefined && (
        <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
            style={{ width: `${safePct}%` }}
          />
        </div>
      )}

      {trend && !pct && (
        <div className={`mt-1.5 text-[10px] font-bold ${s.text}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

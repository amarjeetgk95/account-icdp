import { useId } from 'react';

interface GaugeChartProps {
  percentage: number;
  label: string;
}

export function GaugeChart({ percentage, label }: GaugeChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const safePct = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  const offset = circumference - (safePct / 100) * circumference;

  return (
    <div className="card p-4 flex flex-col items-center justify-center dark:bg-slate-900 dark:border-slate-800/80 hover:shadow-lg transition-all">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
        {label ?? ''}
      </span>
      <div className="relative my-1">
        <svg width="116" height="116" className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <circle
            cx="58"
            cy="58"
            r={radius}
            fill="none"
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="9"
          />
          <circle
            cx="58"
            cy="58"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {safePct}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Progress
          </span>
        </div>
      </div>
      <div className="mt-1">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            safePct >= 100
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
          }`}
        >
          {safePct >= 100 ? 'Quarter Complete' : 'In Progress'}
        </span>
      </div>
    </div>
  );
}

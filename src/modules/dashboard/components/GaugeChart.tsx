import { num } from '@/shared/utilities';
import type { QuarterReadinessData } from '../types';

interface GaugeChartProps {
  label: string;
  percentage: number;
  processed?: number;
  expected?: number;
  quarters?: QuarterReadinessData;
}

const QUARTER_KEYS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
type Tone = 'emerald' | 'indigo' | 'amber' | 'rose';

const STROKE: Record<Tone, string> = {
  emerald: 'stroke-emerald-500 dark:stroke-emerald-400',
  indigo: 'stroke-indigo-600 dark:stroke-indigo-500',
  amber: 'stroke-amber-500 dark:stroke-amber-400',
  rose: 'stroke-rose-500 dark:stroke-rose-400',
};

const BADGE: Record<Tone, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  rose: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

const BAR: Record<Tone, string> = {
  emerald: 'bg-emerald-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

function toneOf(pct: number): Tone {
  return pct >= 100 ? 'emerald' : pct >= 50 ? 'indigo' : pct >= 25 ? 'amber' : 'rose';
}

export function GaugeChart({ label, percentage, processed, expected, quarters }: GaugeChartProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const safePct = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  const offset = circumference - (safePct / 100) * circumference;
  const tone = toneOf(safePct);

  const badgeLabel =
    safePct >= 100 ? 'Quarter Complete' : safePct >= 50 ? 'On Track' : safePct >= 25 ? 'At Risk' : 'Behind';

  return (
    <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label ?? ''}
        </span>
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${BADGE[tone]}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-4 shrink-0">
        <div className="relative shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              strokeWidth="7"
              className="stroke-slate-100 dark:stroke-slate-800"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`transition-all duration-700 ease-out ${STROKE[tone]}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {safePct}%
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              complete
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div>
            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Payroll Runs
            </span>
            <span className="block text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {num(processed)}
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500"> / {num(expected)}</span>
            </span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              processed this quarter
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
        {QUARTER_KEYS.map((q) => {
          const qd = quarters?.[q];
          const pct = Math.round(num(qd?.pct));
          return (
            <div key={q} className="flex items-center gap-2.5">
              <span className="w-6 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                {q}
              </span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${BAR[toneOf(pct)]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

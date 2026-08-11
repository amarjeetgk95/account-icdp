import type { QuarterReadiness, QuarterReadinessData } from '../types';
import { useNavigate } from 'react-router-dom';

interface QuarterReadinessProps {
  data: QuarterReadinessData;
}

const quarterLabels: Record<keyof QuarterReadinessData, string> = {
  Q1: 'Q1 (Apr-Jun)',
  Q2: 'Q2 (Jul-Sep)',
  Q3: 'Q3 (Oct-Dec)',
  Q4: 'Q4 (Jan-Mar)',
};

const quarterKeys: Array<keyof QuarterReadinessData> = ['Q1', 'Q2', 'Q3', 'Q4'];

const fallbackQuarter: QuarterReadiness = { pct: 0, processed: 0, expected: 0 };

export function QuarterReadiness({ data }: QuarterReadinessProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3.5">
      {quarterKeys.map((quarter) => {
        const info = data[quarter] ?? fallbackQuarter;
        const pct = Number.isFinite(info.pct) ? Math.min(100, Math.max(0, info.pct)) : 0;
        const processed = Number.isFinite(info.processed) ? info.processed : 0;
        const expected = Number.isFinite(info.expected) ? info.expected : 0;

        return (
          <button
            key={quarter}
            type="button"
            onClick={() => navigate('/reports')}
            className="w-full text-left p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {quarterLabels[quarter]}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                  {pct}%
                </span>
                {pct >= 100 && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md px-1.5 py-0.5">
                    Ready
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-2 bg-slate-200/70 dark:bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 100
                    ? 'bg-emerald-500'
                    : pct >= 50
                    ? 'bg-indigo-600 dark:bg-indigo-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 flex justify-between items-center">
              <span>{processed}/{expected} months completed</span>
              <span className="group-hover:translate-x-0.5 transition-transform text-indigo-500 font-semibold">View Statement →</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

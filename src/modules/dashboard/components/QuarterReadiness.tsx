import type { QuarterReadinessData } from '../types';

interface QuarterReadinessProps {
  data: QuarterReadinessData;
}

const quarterLabels: Record<string, string> = {
  Q1: 'Q1 (Apr-Jun)',
  Q2: 'Q2 (Jul-Sep)',
  Q3: 'Q3 (Oct-Dec)',
  Q4: 'Q4 (Jan-Mar)',
};

const quarterColors: Record<string, string> = {
  Q1: 'bg-gradient-to-r from-blue-600 to-blue-400',
  Q2: 'bg-gradient-to-r from-green-600 to-green-400',
  Q3: 'bg-gradient-to-r from-amber-500 to-amber-400',
  Q4: 'bg-gradient-to-r from-blue-600 to-blue-400',
};

export function QuarterReadiness({ data }: QuarterReadinessProps) {
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([quarter, info]) => (
        <div key={quarter} className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 w-20 flex-shrink-0">
            {quarterLabels[quarter]}
          </span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${quarterColors[quarter]}`}
              style={{ width: `${Math.min(100, info.pct)}%` }}
            />
          </div>
          <span className="text-xs font-extrabold text-slate-700 w-10 text-right">
            {info.pct}%
          </span>
          {info.pct >= 100 && (
            <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              Ready
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

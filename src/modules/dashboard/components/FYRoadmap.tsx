import type { MonthlyRoadmapData } from '../types';

interface FYRoadmapProps {
  data: MonthlyRoadmapData[];
}

export function FYRoadmap({ data }: FYRoadmapProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-200">
        <span className="text-blue-600">🛣️</span> Financial Year Roadmap
      </h3>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {data.map((month) => {
          const statusColors = {
            complete: 'bg-green-50 border-green-200',
            partial: 'bg-amber-50 border-amber-200',
            empty: 'bg-red-50 border-red-200',
            idle: 'bg-slate-50 border-slate-200',
          };
          const pctColors = {
            complete: 'text-green-700',
            partial: 'text-amber-700',
            empty: 'text-red-700',
            idle: 'text-slate-400',
          };

          return (
            <div
              key={month.month}
              className={`flex-1 min-w-[60px] text-center p-2 rounded-lg border transition-transform hover:-translate-y-0.5 ${
                statusColors[month.status]
              } ${month.isCurrent ? 'ring-2 ring-blue-500' : ''}`}
              title={`${month.month}: ${month.processed}/${month.active} entries (${month.pct}%)`}
            >
              <div className="text-[10px] font-bold text-slate-500 uppercase">
                {month.month.slice(0, 3)}
              </div>
              <div className={`text-sm font-extrabold ${pctColors[month.status]}`}>
                {month.pct}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>Complete
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>Empty
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-300"></span>Idle
        </span>
      </div>
    </div>
  );
}

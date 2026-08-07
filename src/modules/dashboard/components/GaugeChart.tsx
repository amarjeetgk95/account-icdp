interface GaugeChartProps {
  percentage: number;
  label: string;
}

export function GaugeChart({ percentage, label }: GaugeChartProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 90) return '#16A34A';
    if (pct >= 50) return '#2563EB';
    return '#F59E0B';
  };

  const getTextColor = (pct: number) => {
    if (pct >= 90) return 'text-green-700';
    if (pct >= 50) return 'text-blue-700';
    return 'text-amber-700';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
        <span className="text-blue-600">🎯</span> {label}
      </div>
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={getColor(percentage)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-extrabold ${getTextColor(percentage)}`}>
            {percentage}%
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase">
            Completion
          </span>
        </div>
      </div>
    </div>
  );
}

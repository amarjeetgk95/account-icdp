interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export function StatCard({ label, value, sub, icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
        {icon && <span className={colorClasses[color]}>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
      {sub && <div className="text-sm text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

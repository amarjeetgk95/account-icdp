import type { Task } from '../types';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
}

const SEVERITY_STYLES = {
  danger: {
    icon: AlertCircle,
    iconClass: 'text-rose-500 dark:text-rose-400',
    bgClass: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20 border-rose-100/60 dark:border-rose-900/30',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20 border-amber-100/60 dark:border-amber-900/30',
  },
  info: {
    icon: Info,
    iconClass: 'text-indigo-500 dark:text-indigo-400',
    bgClass: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border-indigo-100/60 dark:border-indigo-900/30',
  },
} as const;

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  payroll: { label: 'Payroll', color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  treasury: { label: 'Treasury', color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
  vendor: { label: 'Vendor TDS', color: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
  compliance: { label: 'Compliance', color: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300' },
};

export function TaskList({ tasks }: TaskListProps) {
  const navigate = useNavigate();

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <CheckCircle2 size={28} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          All Cross-Module Items Reconciled!
        </h4>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
          No urgent payroll, treasury, or compliance blockers for this office.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, idx) => {
        const style = SEVERITY_STYLES[task.severity] ?? SEVERITY_STYLES.info;
        const IconComponent = style.icon;
        const hasAction = Boolean(task.action);
        const categoryMeta = task.category ? CATEGORY_LABELS[task.category] : null;

        return (
          <div
            key={idx}
            onClick={() => hasAction && task.action && navigate(task.action)}
            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all group ${
              hasAction
                ? `cursor-pointer ${style.bgClass}`
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`shrink-0 ${style.iconClass}`}>
                <IconComponent size={16} />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {task.title || ''}
                  </span>
                  {categoryMeta && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${categoryMeta.color} shrink-0`}>
                      {categoryMeta.label}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {task.hint || ''}
                </div>
              </div>
            </div>

            {hasAction && (
              <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                <span className="text-[11px] font-medium hidden sm:inline-block">Resolve</span>
                <ChevronRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
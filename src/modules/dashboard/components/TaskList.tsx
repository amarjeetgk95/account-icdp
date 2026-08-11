import type { Task } from '../types';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  const navigate = useNavigate();

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">All Tasks Complete!</h4>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">No pending items requiring attention for this office.</p>
      </div>
    );
  }

  const severityStyles = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      icon: AlertCircle,
      badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
      badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      icon: Info,
      badge: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    },
  };

  return (
    <div className="space-y-2.5">
      {tasks.map((task, idx) => {
        const style = severityStyles[task.severity] || severityStyles.info;
        const IconComponent = style.icon;

        return (
          <button
            key={idx}
            type="button"
            onClick={() => task.action && navigate(task.action)}
            className="w-full text-left flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${style.bg}`}>
                <IconComponent size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {task.title || ''}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {task.hint || ''}
                </div>
              </div>
            </div>

            {task.action && (
              <span className="shrink-0 ml-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                Action
                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

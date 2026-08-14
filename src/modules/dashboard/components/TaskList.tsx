import type { Task } from '../types';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
}

const SEVERITY_STYLES = {
  danger: { icon: AlertCircle, iconClass: 'text-rose-500 dark:text-rose-400' },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-500 dark:text-amber-400' },
  info: { icon: Info, iconClass: 'text-indigo-400 dark:text-indigo-400' },
} as const;

export function TaskList({ tasks }: TaskListProps) {
  const navigate = useNavigate();

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-10 text-center">
        <CheckCircle2 size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">All Tasks Complete!</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          No pending items requiring attention for this office.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tasks.map((task, idx) => {
        const style = SEVERITY_STYLES[task.severity] ?? SEVERITY_STYLES.info;
        const IconComponent = style.icon;
        const hasAction = Boolean(task.action);

        return (
          <div
            key={idx}
            onClick={() => hasAction && task.action && navigate(task.action)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
              hasAction
                ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                : 'cursor-default'
            }`}
          >
            <span className={`shrink-0 ${style.iconClass}`}>
              <IconComponent size={16} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {task.title || ''}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {task.hint || ''}
              </div>
            </div>

            {hasAction && (
              <ChevronRight
                size={16}
                className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
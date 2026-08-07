import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="py-6 text-center text-green-700 font-bold">
        <span className="mr-2">✅</span>All clear! Nothing pending.
      </div>
    );
  }

  const severityStyles = {
    danger: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${severityStyles[task.severity]}`}
          >
            {task.severity === 'danger' ? '⚠️' : task.severity === 'warning' ? '🔔' : 'ℹ️'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800">{task.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{task.hint}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import {
  FilePlus,
  Receipt,
  Users,
  BarChart3,
  Building2,
  ScanText,
  FileSpreadsheet,
  ArrowUpRight,
} from 'lucide-react';

interface QuickAction {
  label: string;
  sublabel?: string;
  icon: typeof FilePlus;
  path: string;
  colorClass: string;
  badge?: string;
}

export function QuickLaunchDock() {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      label: 'New GTR-30',
      sublabel: 'Pay Bill',
      icon: FilePlus,
      path: '/gtr30/create',
      colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
    },
    {
      label: 'New GTR-44',
      sublabel: 'DC Bill',
      icon: Receipt,
      path: '/gtr44/create',
      colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    },
    {
      label: 'Monthly Payroll',
      sublabel: 'Salary Roster',
      icon: Users,
      path: '/payroll',
      colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/50',
    },
    {
      label: '12-Month Matrix',
      sublabel: 'IT Ledger',
      icon: BarChart3,
      path: '/paybill/matrix',
      colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800/80 hover:bg-purple-100 dark:hover:bg-purple-900/50',
    },
    {
      label: 'Vendor TDS (26Q)',
      sublabel: 'Party Ledger',
      icon: Building2,
      path: '/parties/overview',
      colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50',
    },
    {
      label: 'OCR Studio',
      sublabel: 'Bilingual Scan',
      icon: ScanText,
      path: '/pdf-tools/ocr',
      colorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200/80 dark:border-teal-800/80 hover:bg-teal-100 dark:hover:bg-teal-900/50',
    },
    {
      label: 'TDS Reports',
      sublabel: '24Q / 26Q',
      icon: FileSpreadsheet,
      path: '/reports',
      colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/50',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between px-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quick Launchpad
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Direct Module Shortcuts
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={`group flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${item.colorClass}`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate w-full">
                {item.label}
              </span>
              {item.sublabel && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full mt-0.5">
                  {item.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

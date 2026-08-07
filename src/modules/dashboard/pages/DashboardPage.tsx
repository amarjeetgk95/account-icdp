import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency } from '@/shared/utilities';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Users,
  Banknote,
  Receipt,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-12 w-12"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-700 mb-2">Could not load dashboard</h3>
        <p className="text-sm text-slate-500 mb-5">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button onClick={() => refetch()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Overview</h1>
          <p className="page-subtitle">Financial year progress, tasks, and system health</p>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GaugeCard percentage={data.currentQuarterCompletion.pct} label={data.currentQuarter + ' Completion'} />
        <StatTile icon={Users} label="Active Staff" value={String(data.activeEmployees)} sub={data.pendingEmployees > 0 ? data.pendingEmployees + ' pending' : 'All processed'} color="emerald" />
        <StatTile icon={Banknote} label="Total Outflow (YTD)" value={formatCurrency(data.ytdSalary)} color="amber" />
        <StatTile icon={Receipt} label="Total TDS (YTD)" value={formatCurrency(data.ytdTax)} color="red" />
      </div>

      {data.pendingEmployees > 0 && (
        <div className="card p-4 bg-indigo-50 border-indigo-200 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Banknote size={20} />
              </div>
              <div>
                <div className="font-bold text-indigo-900">
                  {data.pendingEmployees} employees pending salary entry for {data.entryMonthName || 'current month'}
                </div>
                <div className="text-sm text-indigo-700">
                  Complete entries to maintain quarter readiness
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/payroll')}
              className="btn btn-primary btn-sm"
            >
              Continue Entry →
            </button>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Financial Year Roadmap</h3>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {data.monthlyRoadmap.map((month) => (
            <div
              key={month.month}
              className={'flex-1 min-w-[64px] text-center p-2.5 rounded-lg border transition-colors ' +
                (month.status === 'complete' ? 'bg-emerald-50 border-emerald-200' :
                 month.status === 'partial' ? 'bg-amber-50 border-amber-200' :
                 month.status === 'empty' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200') +
                (month.isCurrent ? ' ring-2 ring-indigo-500 ring-offset-1' : '')}
            >
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{month.month.slice(0, 3)}</div>
              <div className={'text-base font-extrabold mt-0.5 ' +
                (month.status === 'complete' ? 'text-emerald-700' :
                 month.status === 'partial' ? 'text-amber-700' :
                 month.status === 'empty' ? 'text-red-700' : 'text-slate-400')}>
                {month.pct}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card">
          <div className="card-header">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">What&apos;s Due Now</h3>
            </div>
          </div>
          <div className="card-body">
            {data.tasks.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <div className="text-emerald-700 font-bold">All clear! Nothing pending.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.tasks.map((task, idx) => {
                  const TaskIcon = task.severity === 'danger' ? AlertCircle : task.severity === 'warning' ? AlertTriangle : AlertCircle;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => task.action && navigate(task.action)}
                    >
                      <div className={'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ' +
                        (task.severity === 'danger' ? 'bg-red-100 text-red-600' :
                         task.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600')}>
                        <TaskIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800">{task.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{task.hint}</div>
                      </div>
                      {task.action && (
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Quarterly Readiness</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            {Object.entries(data.quarterReadiness).map(([q, info]) => (
              <div key={q} className="cursor-pointer group" onClick={() => navigate('/reports')}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700 transition-colors">{q}</span>
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-indigo-800 transition-colors">{info.pct}%</span>
                </div>
                <div className="progress">
                  <div
                    className={'progress-bar transition-all group-hover:opacity-90 ' +
                      (info.pct >= 100 ? 'bg-emerald-500' : info.pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500')}
                    style={{ width: Math.min(100, info.pct) + '%' }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {info.processed}/{info.expected} months processed
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card">
          <div className="card-header">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Banknote size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Recent Transactions</h3>
            </div>
          </div>
          <div className="card-body">
            {data.recentTransactions.length === 0 ? (
              <div className="empty-state"><p className="empty-state-text">No recent transactions.</p></div>
            ) : (
              <table className="table">
                <thead><tr><th>Party</th><th className="text-right">Amount</th><th className="text-right">GST</th><th className="text-right">IT</th></tr></thead>
                <tbody>
                  {data.recentTransactions.map((tx, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{tx.partyName}</td>
                      <td className="text-right text-money">{formatCurrency(tx.amount)}</td>
                      <td className="text-right text-emerald-700 text-money">{formatCurrency(tx.gst)}</td>
                      <td className="text-right text-red-600 text-money">{formatCurrency(tx.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">System Alerts</h3>
            </div>
          </div>
          <div className="card-body space-y-1">
            <AlertItem label="Prev Qtr Pending" count={data.prevQuarterPending} severity="danger" />
            <AlertItem label="Zero Tax Entries" count={data.zeroTaxEntries.length} severity="warning" />
            <AlertItem label="Pending Staff" count={data.pendingEmployees} severity="info" />
            <AlertItem label="Missing PANs" count={data.missingPANs.length} severity="danger" />
            <AlertItem label="New Joiners" count={data.newJoinersThisMonth} severity="info" />
            <AlertItem label="Departures" count={data.departuresThisMonth} severity="info" />
            <AlertItem label="Vendors" count={data.vendorCount} severity="info" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, color }: { icon: LucideIcon; label: string; value: string; sub?: string; color: string }) {
  const iconColors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };
  return (
    <div className="stat-tile">
      <div className={'stat-tile-icon ' + (iconColors[color] || iconColors.indigo)}>
        <Icon size={18} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function GaugeCard({ percentage, label }: { percentage: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  return (
    <div className="stat-tile flex flex-col items-center">
      <div className="stat-label mb-3">{label}</div>
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#4f46e5" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-slate-800">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ label, count, severity }: { label: string; count: number; severity: string }) {
  const styles: Record<string, string> = {
    danger: 'text-red-700 bg-red-50 border-red-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    info: 'text-slate-600 bg-slate-50 border-slate-200',
  };
  return (
    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={'px-2.5 py-0.5 rounded-md text-xs font-bold border ' + (styles[severity] || styles.info)}>{count}</span>
    </div>
  );
}

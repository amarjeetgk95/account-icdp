import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency } from '@/shared/utilities';
import { useNavigate } from 'react-router-dom';
import { useOfficeName } from '@/modules/settings/hooks/useOfficeName';
import {
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Users,
  Banknote,
  Receipt,
  TrendingUp,
  Store,
  FileSpreadsheet,
  ArrowRight,
  Building,
  UserPlus,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { GaugeChart } from '../components/GaugeChart';
import { FYRoadmap } from '../components/FYRoadmap';
import { TaskList } from '../components/TaskList';
import { QuarterReadiness } from '../components/QuarterReadiness';
import { RecentTransactions } from '../components/RecentTransactions';
import { QuarterlyChart } from '../components/QuarterlyChart';
import type { QuarterReadinessData } from '../types';

const EMPTY_QUARTER_READINESS: QuarterReadinessData = {
  Q1: { pct: 0, processed: 0, expected: 0 },
  Q2: { pct: 0, processed: 0, expected: 0 },
  Q3: { pct: 0, processed: 0, expected: 0 },
  Q4: { pct: 0, processed: 0, expected: 0 },
};

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const navigate = useNavigate();
  const officeName = useOfficeName();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto dark:bg-slate-900 dark:border-slate-800">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-2">Could not load dashboard</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          {error instanceof Error ? error.message : 'An unexpected error occurred while fetching office data.'}
        </p>
        <button onClick={() => refetch()} className="btn btn-primary btn-sm mx-auto">
          <RefreshCw size={14} className="mr-1.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasPendingEntries = (data.pendingEmployees ?? 0) > 0;
  const hasNoData = (data.activeEmployees ?? 0) === 0 && (data.tasks?.length ?? 0) === 0;

  const currentQKey = data.currentQuarter as keyof QuarterReadinessData;
  const currentQR = data.quarterReadiness?.[currentQKey];

  const diagnosticItems = [
    { label: 'Prev Qtr Pending', count: data.prevQuarterPending ?? 0, severity: 'danger' as const, path: '/reports' },
    { label: 'Zero Tax Entries', count: data.zeroTaxEntries?.length ?? 0, severity: 'warning' as const, path: '/payroll' },
    { label: 'Pending Staff', count: data.pendingEmployees ?? 0, severity: 'info' as const, path: '/payroll' },
    { label: 'Missing PANs', count: data.missingPANs?.length ?? 0, severity: 'danger' as const, path: '/payroll' },
    { label: 'New Joiners', count: data.newJoinersThisMonth ?? 0, severity: 'info' as const, path: '/payroll' },
    { label: 'Departures', count: data.departuresThisMonth ?? 0, severity: 'info' as const, path: '/payroll' },
    { label: 'Total Parties', count: data.vendorCount ?? 0, severity: 'info' as const, path: '/parties' },
  ].filter((item) => !(item.severity === 'info' && item.count === 0));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Greeting Row */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <span>{`${getGreeting()} ${officeName}`}</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 normal-case tracking-normal">
            Last updated: {data.lastUpdated}
          </span>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:rotate-180 duration-500"
            title="Refresh Data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Half Page: Chart (left) | Flash Cards (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <QuarterlyChart salary={data.empQuarterlySalary ?? {}} tds={data.empQuarterlyTDS ?? {}} />
        </div>
        <div className="space-y-5">
          <GaugeChart
            percentage={data.currentQuarterCompletion?.pct ?? 0}
            label={`${data.currentQuarter} Readiness`}
            processed={currentQR?.processed}
            expected={currentQR?.expected}
            quarters={data.quarterReadiness}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <StatCard
              icon={Users}
              label="Active Employees"
              value={String(data.activeEmployees ?? 0)}
              sub={(data.pendingEmployees ?? 0) > 0 ? `${data.pendingEmployees} pending entry` : 'All entries updated'}
              color="emerald"
              pct={data.activeEmployees > 0 ? Math.round(((data.activeEmployees - (data.pendingEmployees ?? 0)) / data.activeEmployees) * 100) : 100}
              trend={data.newJoinersThisMonth > 0 ? `+${data.newJoinersThisMonth} joined` : undefined}
            />
            <StatCard
              icon={Banknote}
              label="Total Salary Outflow (YTD)"
              value={formatCurrency(data.ytdSalary ?? 0)}
              sub="Cumulative Gross + DA"
              color="indigo"
            />
            <StatCard
              icon={Receipt}
              label="Total TDS (YTD)"
              value={formatCurrency(data.ytdTax ?? 0)}
              sub="Tax Deductions Collected"
              color="rose"
            />
          </div>
        </div>
      </div>

      {/* Contextual Quick Actions Strip */}
      <div className="flex flex-wrap items-center gap-2.5">
        {hasPendingEntries ? (
          <>
            <button
              onClick={() => navigate('/payroll')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 hover:scale-[1.03] active:scale-95"
            >
              <Banknote size={15} />
              <span>Enter Salary</span>
            </button>
            <button
              onClick={() => navigate('/parties')}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 font-bold text-xs shadow-sm transition-all flex items-center gap-2 hover:scale-[1.03] active:scale-95"
            >
              <Store size={15} className="text-amber-600 dark:text-amber-400" />
              <span>Add Vendor Bill</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 font-bold text-xs shadow-sm transition-all flex items-center gap-2 hover:scale-[1.03] active:scale-95"
            >
              <FileSpreadsheet size={15} className="text-teal-600 dark:text-teal-400" />
              <span>24Q Statement</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 hover:scale-[1.03] active:scale-95"
            >
              <FileSpreadsheet size={15} />
              <span>File 24Q</span>
            </button>
            <button
              onClick={() => navigate('/parties')}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 font-bold text-xs shadow-sm transition-all flex items-center gap-2 hover:scale-[1.03] active:scale-95"
            >
              <Store size={15} className="text-amber-600 dark:text-amber-400" />
              <span>Add Vendor Bill</span>
            </button>
            <button
              onClick={() => navigate('/payroll')}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 font-bold text-xs shadow-sm transition-all flex items-center gap-2 hover:scale-[1.03] active:scale-95"
            >
              <Banknote size={15} />
              <span>Enter Salary</span>
            </button>
          </>
        )}
        <button
          onClick={() => refetch()}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:rotate-180 duration-500"
          title="Refresh Data"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Pending Entry Warning Banner */}
      {(data.pendingEmployees ?? 0) > 0 && (
        <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                {data.pendingEmployees} employees pending salary entry for {data.entryMonthName || 'current month'}
              </div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                Complete monthly entries to maintain 24Q quarterly report readiness.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/payroll')}
            className="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5"
          >
            <span>Continue Entry</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Empty / Onboarding State */}
      {hasNoData && (
        <div className="card p-8 text-center dark:bg-slate-900 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <UserPlus size={28} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-2">
            No employees registered yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
            Get started by adding your first employee. You can then begin recording salary entries and generating quarterly reports.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.03] active:scale-95"
          >
            Add Your First Employee
          </button>
        </div>
      )}

      {/* Financial Year 12-Month Roadmap Grid */}
      <FYRoadmap data={data.monthlyRoadmap ?? []} />

      {/* Two-Column Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Tasks & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Tasks Card */}
          <div className="card p-5 dark:bg-slate-900 dark:border-slate-800/80 hover:shadow-md transition-all">
            <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    What&apos;s Due Now
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    Action items requiring staff attention
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {data.tasks?.length ?? 0} {data.tasks?.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            <TaskList tasks={data.tasks ?? []} />
          </div>

          {/* Recent Transactions Card */}
          <div className="card p-5 dark:bg-slate-900 dark:border-slate-800/80 hover:shadow-md transition-all">
            <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Recent Party Transactions
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    Latest vendor 26Q & GST bill entries
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/parties')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors group"
              >
                All Parties
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <RecentTransactions transactions={data.recentTransactions ?? []} />
          </div>
        </div>

        {/* Right Column (1/3): Quarterly Readiness & System Health */}
        <div className="space-y-6">
          {/* Quarterly Readiness Card */}
          <div className="card p-5 dark:bg-slate-900 dark:border-slate-800/80 hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Quarterly Readiness
                </h3>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  24Q filing preparation status
                </p>
              </div>
            </div>

            <QuarterReadiness data={data.quarterReadiness ?? EMPTY_QUARTER_READINESS} currentQuarter={data.currentQuarter} />
          </div>

          {/* System Health Diagnostics Card */}
          <div className="card p-5 dark:bg-slate-900 dark:border-slate-800/80 hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Building size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  System Diagnostics
                </h3>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Office parameters & metrics check
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {diagnosticItems.map((item) => (
                <AlertItem key={item.label} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ label, count, severity, path }: { label: string; count: number; severity: string; path?: string }) {
  const navigate = useNavigate();

  const styles: Record<string, string> = {
    danger: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
    warning: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    info: 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
  };

  const safeCount = Number.isFinite(count) ? count : 0;

  return (
    <button
      type="button"
      onClick={() => path && navigate(path)}
      disabled={!path}
      className="w-full text-left flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group disabled:cursor-default"
    >
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {label}
      </span>
      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${styles[severity] || styles.info}`}>
        {safeCount}
      </span>
    </button>
  );
}

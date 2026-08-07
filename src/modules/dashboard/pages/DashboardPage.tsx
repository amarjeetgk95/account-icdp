import { useDashboard } from '../hooks/useDashboard';
import { FYRoadmap } from '../components/FYRoadmap';
import { GaugeChart } from '../components/GaugeChart';
import { StatCard } from '../components/StatCard';
import { TaskList } from '../components/TaskList';
import { QuarterReadiness } from '../components/QuarterReadiness';
import { RecentTransactions } from '../components/RecentTransactions';
import { formatCurrency } from '@/shared/utilities';

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-red-700 mb-2">Could not load dashboard</h3>
        <p className="text-sm text-slate-500 mb-4">
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
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operations Overview</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md">
              📅 FY {data.fy}-{data.fy + 1}
            </span>
            <span className="text-sm text-slate-500">Updated: {data.lastUpdated}</span>
          </div>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary">
          🔄 Refresh
        </button>
      </div>

      {/* FY Roadmap */}
      <div className="card p-5">
        <FYRoadmap data={data.monthlyRoadmap} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 flex flex-col items-center">
          <GaugeChart
            percentage={data.currentQuarterCompletion.pct}
            label={`${data.currentQuarter} Completion`}
          />
        </div>
        <StatCard
          label="Active Staff"
          value={data.activeEmployees}
          sub={
            data.pendingEmployees > 0
              ? `${data.pendingEmployees} pending this month`
              : 'All processed'
          }
          icon="👥"
          color="green"
        />
        <StatCard
          label="Total Outflow (YTD)"
          value={formatCurrency(data.ytdSalary)}
          icon="💰"
          color="yellow"
        />
        <StatCard
          label="Total TDS (YTD)"
          value={formatCurrency(data.ytdTax)}
          icon="🏦"
          color="red"
        />
      </div>

      {/* Tasks + Quarter Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <span className="text-red-600">📋</span> What's Due Now
          </h3>
          <TaskList tasks={data.tasks} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <span className="text-green-600">✅</span> Quarterly Filing Readiness
          </h3>
          <QuarterReadiness data={data.quarterReadiness} />
        </div>
      </div>

      {/* Recent Transactions + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <span>📊</span> Recent Vendor Transactions
          </h3>
          <RecentTransactions transactions={data.recentTransactions} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <span className="text-red-600">🔔</span> System Alerts
          </h3>
          <div className="space-y-2">
            <AlertItem label="Prev Qtr Pending" count={data.prevQuarterPending} severity="danger" />
            <AlertItem label="Zero Tax Entries" count={data.zeroTaxEntries.length} severity="warning" />
            <AlertItem label="Pending Staff (Month)" count={data.pendingEmployees} severity="info" />
            <AlertItem label="Missing PANs" count={data.missingPANs.length} severity="danger" />
            <AlertItem label="New Joiners" count={data.newJoinersThisMonth} severity="info" />
            <AlertItem label="Departures" count={data.departuresThisMonth} severity="info" />
            <AlertItem label="Unique Vendors" count={data.vendorCount} severity="info" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertItem({
  label,
  count,
  severity,
}: {
  label: string;
  count: number;
  severity: 'danger' | 'warning' | 'info';
}) {
  const styles = {
    danger: 'text-red-700 bg-red-50 border-red-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    info: 'text-slate-600 bg-slate-50 border-slate-200',
  };

  return (
    <div className="flex justify-between items-center py-2 px-2 rounded-lg hover:bg-slate-50 text-sm font-semibold">
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${styles[severity]}`}>
        {count}
      </span>
    </div>
  );
}

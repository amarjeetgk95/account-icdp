import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency } from '@/shared/utilities';
import { useNavigate } from 'react-router-dom';
import { useOfficeName } from '@/modules/settings/hooks/useOfficeName';
import {
  RefreshCw,
  AlertCircle,
  Users,
  Banknote,
  ShieldCheck,
  Clock,
  Landmark,
  ListTodo,
} from 'lucide-react';
import { StatCard } from '@/shared/components/StatCard';
import { QuickLaunchDock } from '../components/QuickLaunchDock';
import { SalaryMatrixQuadrant } from '../components/SalaryMatrixQuadrant';
import { TreasuryBillsQuadrant } from '../components/TreasuryBillsQuadrant';
import { VendorTdsQuadrant } from '../components/VendorTdsQuadrant';
import { ComplianceToolsQuadrant } from '../components/ComplianceToolsQuadrant';
import { TaskList } from '../components/TaskList';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { Skeleton, SkeletonCard, SkeletonTable } from '@/shared/components/Skeleton';
import { EmptyState } from '@/shared/components/EmptyState';

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const navigate = useNavigate();
  const officeName = useOfficeName();

  const fyMonth = ((new Date().getMonth() + 9) % 12) + 1;
  const fyProgress = Math.round((fyMonth / 12) * 100);

  if (isLoading) {
    return (
      <div className="h-full overflow-hidden flex flex-col p-4 space-y-4 max-w-7xl mx-auto w-full">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0">
          <SkeletonTable rows={5} cols={3} />
          <SkeletonTable rows={5} cols={3} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <EmptyState
          icon={AlertCircle}
          title="Could not load dashboard"
          hint={error instanceof Error ? error.message : 'An unexpected error occurred.'}
          action={
            <button onClick={() => refetch()} className="btn btn-primary btn-sm">
              <RefreshCw size={13} />
              Retry
            </button>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  // Cross-module total disbursements (Salary + GTR-30 + GTR-44)
  const totalDisbursements =
    (data.ytdSalary ?? 0) +
    (data.treasury?.gtr30GrossTotal ?? 0) +
    (data.treasury?.gtr44GrossTotal ?? 0);

  const totalTreasuryBills =
    (data.treasury?.gtr30Count ?? 0) + (data.treasury?.gtr44Count ?? 0);
  const pendingTreasuryBills =
    (data.treasury?.gtr30PendingCount ?? 0) + (data.treasury?.gtr44DraftCount ?? 0);

  // Attention Chips
  const attentionChips: { label: string; tone: 'amber' | 'rose' | 'indigo'; to: string }[] = [];
  if ((data.prevQuarterPending ?? 0) > 0) {
    attentionChips.push({
      label: `${data.prevQuarterPending} prev-quarter entries pending`,
      tone: 'amber',
      to: '/payroll',
    });
  }
  if ((data.missingPANs?.length ?? 0) > 0) {
    attentionChips.push({
      label: `${data.missingPANs.length} employees missing PAN`,
      tone: 'rose',
      to: '/payroll?tab=employees',
    });
  }
  if ((data.zeroTaxEntries?.length ?? 0) > 0) {
    attentionChips.push({
      label: `${data.zeroTaxEntries.length} zero-TDS entries`,
      tone: 'amber',
      to: '/reports',
    });
  }
  if (pendingTreasuryBills > 0) {
    attentionChips.push({
      label: `${pendingTreasuryBills} treasury bills draft/pending`,
      tone: 'indigo',
      to: '/gtr30/list',
    });
  }

  return (
    <div className="relative h-full overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
      {/* Workspace Header */}
      <div className="px-4 pt-3 shrink-0">
        <WorkspaceHeader
          eyebrow="Integrated Operations Command Center"
          title={officeName || 'Account Branch'}
          context={
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                title={`Month ${fyMonth} of the financial year (Apr–Mar)`}
              >
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <span
                    className="block h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
                    style={{ width: `${fyProgress}%` }}
                  />
                </span>
                Month {fyMonth}/12 (FY {data.fy}-{(data.fy + 1).toString().slice(-2)})
              </span>

              {data.statutoryDeadlines && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Clock size={11} className="text-indigo-500" />
                  {data.statutoryDeadlines.nextQuarterName} due {data.statutoryDeadlines.nextQuarterFilingDate}
                </span>
              )}
            </div>
          }
          actions={
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              title={data.lastUpdated ? `Last updated ${data.lastUpdated}` : 'Refresh dashboard'}
            >
              <RefreshCw size={14} />
            </button>
          }
        />
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 min-h-0 px-4 py-4 overflow-y-auto space-y-4">
        {/* 1. Quick Launchpad */}
        <QuickLaunchDock />

        {/* 2. Unified 4-KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <StatCard
            icon={Banknote}
            tone="emerald"
            label="Total Disbursements"
            value={formatCurrency(totalDisbursements)}
            sub="Salaries + GTR Bills (YTD)"
            onClick={() => navigate('/payroll')}
          />
          <StatCard
            icon={Users}
            tone="indigo"
            label="Active Staff"
            value={String(data.activeEmployees ?? 0)}
            sub={(data.pendingEmployees ?? 0) > 0 ? `${data.pendingEmployees} pending entry` : 'All updated'}
            onClick={() => navigate('/payroll?tab=employees')}
          />
          <StatCard
            icon={Landmark}
            tone="sky"
            label="Treasury Registers"
            value={`${totalTreasuryBills} Bills`}
            sub={pendingTreasuryBills > 0 ? `${pendingTreasuryBills} pending/draft` : 'GTR-30 & GTR-44'}
            onClick={() => navigate('/gtr30/list')}
          />
          <StatCard
            icon={ShieldCheck}
            tone="amber"
            label="NSDL FVU Readiness"
            value={`${data.quarterReadiness?.[(data.currentQuarter as keyof typeof data.quarterReadiness) || 'Q1']?.pct ?? 80}%`}
            sub={`${data.currentQuarter ?? 'Q1'} Pre-Audit Score`}
            onClick={() => navigate('/reports')}
          />
        </div>

        {/* 3. Attention Chips */}
        {attentionChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
              Alerts:
            </span>
            {attentionChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => navigate(chip.to)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                  chip.tone === 'rose'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950'
                    : chip.tone === 'amber'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950'
                      : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950'
                }`}
              >
                <AlertCircle size={11} />
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* 4. Four Operational Quadrants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch animate-fade-in animate-fade-in-delay-1">
          {/* Quadrant 1: Salary TDS & 12-Month IT Matrix */}
          <SalaryMatrixQuadrant
            roadmap={data.monthlyRoadmap ?? []}
            pendingEmployees={data.pendingEmployees ?? 0}
          />

          {/* Quadrant 2: Treasury & Bill Registers */}
          <TreasuryBillsQuadrant
            treasury={data.treasury}
            fy={data.fy}
          />

          {/* Quadrant 3: Vendor TDS (26Q) & GST */}
          <VendorTdsQuadrant
            vendorTds={data.vendorTds}
          />

          {/* Quadrant 4: Compliance Audit & Utilities */}
          <ComplianceToolsQuadrant
            data={data}
          />
        </div>

        {/* 5. Unified Bottom Feed: Cross-Module Tasks & Action Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-5 animate-fade-in animate-fade-in-delay-2">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ListTodo size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Action Queue & Open Tasks
              </h3>
            </div>
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
              {data.tasks?.length ?? 0} Items
            </span>
          </div>

          <TaskList tasks={data.tasks ?? []} />
        </div>
      </div>
    </div>
  );
}

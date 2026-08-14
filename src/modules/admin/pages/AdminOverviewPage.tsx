import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Shield,
  Building2,
  Briefcase,
  FileSpreadsheet,
  Store,
  Receipt,
  CalendarDays,
  TrendingUp,
  BarChart3,
  CircleAlert,
  FileBarChart,
  UserX,
} from 'lucide-react';
import { useSystemStats, useOfficeStats, useEntryCompletion, useDataEntryReport } from '../hooks/useAdmin';
import { EntryCompletion, computeCompletionSummary } from '../components/EntryCompletion';
import { OfficeStatsTable } from '../components/OfficeStatsTable';
import { DataEntryReport } from '../components/DataEntryReport';
import { AdminLayout } from '../components/AdminLayout';
import { StatCard } from '@/shared/components/StatCard';
import { useUIStore } from '@/core/stores/ui-store';
import { getSectionIcon } from '@/shared/icons';
import type { LucideIcon } from 'lucide-react';
import '../styles/overview.css';

interface StatCardDef {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  gradient: string;
  hint: string;
  deltaIcon?: LucideIcon;
}

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { activeOfficeId } = useUIStore();

  const { data: stats, error: statsError } = useSystemStats();
  const { data: officeStats } = useOfficeStats();
  const { data: completion, isLoading: isCompletionLoading, error: completionError } = useEntryCompletion();
  const { data: dataEntryReport } = useDataEntryReport();

  const handleSelectOffice = (officeId: string) => {
    navigate(`/admin/reports?office=${encodeURIComponent(officeId)}`);
  };

  const avgCompletion = useMemo(() => {
    if (!completion || completion.length === 0) return undefined;
    return computeCompletionSummary(completion).avgPct;
  }, [completion]);

  const statCards: StatCardDef[] = [
    {
      label: 'Total Users',
      value: stats?.users,
      icon: Users,
      gradient: 'linear-gradient(135deg, #3B82F6, #6366F1)',
      hint: 'accounts across all offices',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Admins',
      value: stats?.admins,
      icon: Shield,
      gradient: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
      hint: 'privileged system roles',
      deltaIcon: Shield,
    },
    {
      label: 'Suspended',
      value: stats?.suspended,
      icon: UserX,
      gradient: 'linear-gradient(135deg, #64748B, #94A3B8)',
      hint: 'accounts locked for security',
      deltaIcon: UserX,
    },
    {
      label: 'Offices',
      value: stats?.offices,
      icon: Building2,
      gradient: 'linear-gradient(135deg, #10B981, #0D9488)',
      hint: 'registered offices',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Employees',
      value: stats?.employees,
      icon: Briefcase,
      gradient: 'linear-gradient(135deg, #F59E0B, #F97316)',
      hint: 'staff on payroll',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Salary Records',
      value: stats?.salaries,
      icon: FileSpreadsheet,
      gradient: 'linear-gradient(135deg, #10B981, #34D399)',
      hint: 'records filed',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Vendors',
      value: stats?.parties,
      icon: Store,
      gradient: 'linear-gradient(135deg, #06B6D4, #0D9488)',
      hint: 'parties on file',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Transactions',
      value: stats?.transactions,
      icon: Receipt,
      gradient: 'linear-gradient(135deg, #4F46E5, #6366F1)',
      hint: 'entries this FY',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Current FY',
      value: stats ? `${stats.fy}-${String(stats.fy + 1).slice(-2)}` : undefined,
      icon: CalendarDays,
      gradient: 'linear-gradient(135deg, #F43F5E, #EC4899)',
      hint: 'fiscal year runs Apr–Mar',
      deltaIcon: CalendarDays,
    },
  ];

  return (
    <AdminLayout
      title="Overview"
      subtitle="Key metrics, data-entry completion, and office status"
      icon={getSectionIcon('overview')}
    >
      <div className="space-y-6">
        {statsError && (
          <div className="alert alert-danger rounded-xl animate-fade-in">
            <CircleAlert size={18} className="shrink-0 mt-0.5" />
            <span>
              Failed to load system stats:{' '}
              {statsError instanceof Error ? statsError.message : 'Unknown error'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            System overview, data-entry health across all offices, and aggregate figures.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/audit')}
              className="btn btn-outline btn-sm text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Audit Trail
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className="btn btn-outline btn-sm text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reports Drill-down
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="btn btn-primary btn-sm text-xs"
            >
              Manage Users
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="space-y-6">
          <section className="card admin-section-card animate-fade-in animate-fade-in-delay-1 rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <header className="card-header bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 shrink-0">
                  <TrendingUp size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-[0.95rem] text-slate-900 dark:text-white">
                    Monthly Data-Entry Completion
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Salary months entered for each office&apos;s current financial year
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-[11px] font-bold tabular-nums">
                {avgCompletion !== undefined ? `${avgCompletion}%` : '—'}
              </span>
            </header>
            <div className="p-0">
              {completionError && (
                <div className="p-4 m-4 alert alert-danger rounded-xl flex items-center gap-2">
                  <CircleAlert size={16} className="shrink-0" />
                  <span className="text-xs">
                    Failed to load entry completion: {completionError instanceof Error ? completionError.message : 'Unknown error'}
                  </span>
                </div>
              )}
              <EntryCompletion data={completion ?? []} isLoading={isCompletionLoading} />
            </div>
          </section>

          <section className="card admin-section-card animate-fade-in animate-fade-in-delay-2 rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <header className="card-header bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400 shrink-0">
                  <BarChart3 size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-[0.95rem] text-slate-900 dark:text-white">
                    Offices at a Glance
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Click a row to open its reports
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-2.5 py-1 text-[11px] font-bold tabular-nums">
                {officeStats ? officeStats.length : '—'} offices
              </span>
            </header>
            <div className="p-0">
              <OfficeStatsTable
                offices={officeStats ?? []}
                isLoading={!officeStats}
                activeOfficeId={activeOfficeId}
                onSelectOffice={handleSelectOffice}
              />
            </div>
          </section>

          <section className="card admin-section-card animate-fade-in animate-fade-in-delay-3 rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <header className="card-header bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 shrink-0">
                  <FileBarChart size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-[0.95rem] text-slate-900 dark:text-white">
                    Data Entry Summary
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Per-office data entry activity and financial totals
                  </span>
                </div>
              </div>
            </header>
            <div className="p-0">
              <DataEntryReport data={dataEntryReport ?? []} isLoading={!dataEntryReport} />
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

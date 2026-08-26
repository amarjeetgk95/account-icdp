import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Shield,
  Building2,
  Briefcase,
  FileSpreadsheet,
  Store,
  Receipt,
  CalendarDays,
  TrendingUp,
  BarChart3,
  FileBarChart,
  UserX,
  Upload,
  TriangleAlert,
} from 'lucide-react';
import { useSystemStats, useOfficeStats, useEntryCompletion, useDataEntryReport } from '../hooks/useAdmin';
import { EntryCompletion, computeCompletionSummary } from '../components/EntryCompletion';
import { OfficeStatsTable } from '../components/OfficeStatsTable';
import { DataEntryReport } from '../components/DataEntryReport';
import { AdminLayout } from '@/shared/components/AdminLayout';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { StatCard } from '@/shared/components/StatCard';
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
      label: 'Salary Imports',
      value: stats?.salary_imports,
      icon: FileSpreadsheet,
      gradient: 'linear-gradient(135deg, #10B981, #34D399)',
      hint: 'salary files filed',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Paybill Imports',
      value: stats?.paybill_imports,
      icon: Upload,
      gradient: 'linear-gradient(135deg, #06B6D4, #0D9488)',
      hint: 'PDF batches filed',
      deltaIcon: TrendingUp,
    },
    {
      label: 'Paybill Unmatched',
      value: stats?.paybill_unmatched,
      icon: TriangleAlert,
      gradient: 'linear-gradient(135deg, #F59E0B, #F97316)',
      hint: 'rows not matched to HRPN',
      deltaIcon: TriangleAlert,
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
      icon={getSectionIcon('overview')}
      actions={[
        { label: 'Audit Trail', icon: FileText, onClick: () => navigate('/admin/audit') },
        { label: 'Reports', icon: FileBarChart, onClick: () => navigate('/admin/reports') },
        { label: 'Manage Users', icon: Users, onClick: () => navigate('/admin/users'), variant: 'ghost' },
      ]}
    >
      <div className="space-y-5">
        {statsError && (
          <ErrorBanner title="Failed to load system stats:" error={statsError} className="animate-fade-in" />
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="space-y-5">
          <section className="card admin-section-card animate-fade-in animate-fade-in-delay-1 rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <header className="card-header bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 shrink-0">
                  <TrendingUp size={16} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-[0.95rem] text-slate-900 dark:text-white">
                    Monthly Data-Entry Completion
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-[11px] font-bold tabular-nums">
                {avgCompletion !== undefined ? `${avgCompletion}%` : '—'}
              </span>
            </header>
            <div className="p-0">
              {completionError && (
                <ErrorBanner
                  title="Failed to load entry completion:"
                  error={completionError}
                  className="m-4"
                />
              )}
              <EntryCompletion data={completion ?? []} isLoading={isCompletionLoading} />
            </div>
          </section>

          <section className="card admin-section-card animate-fade-in animate-fade-in-delay-2 rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <header className="card-header bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400 shrink-0">
                  <BarChart3 size={16} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-[0.95rem] text-slate-900 dark:text-white">
                    Offices at a Glance
                  </h3>
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
                onSelectOffice={handleSelectOffice}
              />
            </div>
          </section>

          <section className="card admin-section-card animate-fade-in animate-fade-in-delay-3 rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <header className="card-header bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 shrink-0">
                  <FileBarChart size={16} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-[0.95rem] text-slate-900 dark:text-white">
                    Data Entry Summary
                  </h3>
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

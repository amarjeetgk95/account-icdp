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
} from 'lucide-react';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  useSystemStats,
  useOfficeStats,
  useEntryCompletion,
  useDataEntryReport,
} from '../hooks/useAdmin';
import { EntryCompletion } from '../components/EntryCompletion';
import { OfficeStatsTable } from '../components/OfficeStatsTable';
import { DataEntryReport } from '../components/DataEntryReport';
import { AdminLayout } from '../components/AdminLayout';
import { useUIStore } from '@/core/stores/ui-store';
import type { LucideIcon } from 'lucide-react';
import '../styles/overview.css';

interface StatCard {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  gradient: string;
  hint: string;
  deltaIcon: LucideIcon;
}

const STAT_TINTS: Record<string, string> = {
  'Total Users': 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  Admins: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  Offices: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  Employees: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  'Salary Records': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  Vendors: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
  Transactions: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  'Current FY': 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
};

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
    const total = completion.reduce((sum, office) => {
      const filled = new Set(office.months || []).size;
      return sum + Math.round((filled / 12) * 100);
    }, 0);
    return Math.round(total / completion.length);
  }, [completion]);

  const statCards: StatCard[] = [
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
    <AdminLayout>
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

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            const DeltaIcon = card.deltaIcon;
            return (
              <div
                key={card.label}
                className={`stat-tile admin-overview-kpi group animate-fade-in animate-fade-in-delay-${Math.min(index, 3)} rounded-2xl dark:bg-slate-900 dark:border-slate-800`}
              >
                <span
                  className="absolute top-0 inset-x-0 h-1 opacity-80"
                  style={{ background: card.gradient }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="stat-label text-[0.65rem] dark:text-slate-400">{card.label}</p>
                    <h3 className="stat-value mt-1 text-lg dark:text-white">
                      {card.value !== undefined ? (
                        card.value
                      ) : (
                        <Skeleton className="h-6 w-12" />
                      )}
                    </h3>
                    <p className="stat-delta text-[0.65rem] text-slate-400 dark:text-slate-500 hidden sm:flex">
                      <DeltaIcon size={10} className="text-emerald-500 dark:text-emerald-400" />
                      {card.hint}
                    </p>
                  </div>
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300 ${STAT_TINTS[card.label]}`}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                  </span>
                </div>
              </div>
            );
          })}
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

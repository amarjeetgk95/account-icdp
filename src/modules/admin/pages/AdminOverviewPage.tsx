import { useNavigate } from 'react-router-dom';
import { Users, Shield, BarChart3, FileSpreadsheet, Clock, TrendingUp } from 'lucide-react';
import { useSystemStats, useOfficeStats, useEntryCompletion } from '../hooks/useAdmin';
import { EntryCompletion } from '../components/EntryCompletion';
import { OfficeStatsTable } from '../components/OfficeStatsTable';
import { AdminLayout } from '../components/AdminLayout';
import { useUIStore } from '@/core/stores/ui-store';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { activeOfficeId } = useUIStore();

  const { data: stats, error: statsError } = useSystemStats();
  const { data: officeStats } = useOfficeStats();
  const { data: completion } = useEntryCompletion();

  const handleSelectOffice = (officeId: string) => {
    navigate(`/admin/reports?office=${encodeURIComponent(officeId)}`);
  };

  const statCards = [
    { label: 'Total Users', value: stats?.users, icon: Users, iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'Admins', value: stats?.admins, icon: Shield, iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { label: 'Offices', value: stats?.offices, icon: BarChart3, iconBg: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    { label: 'Employees', value: stats?.employees, icon: Users, iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: 'Salary Records', value: stats?.salaries, icon: FileSpreadsheet, iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Vendors', value: stats?.parties, icon: Users, iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
    { label: 'Transactions', value: stats?.transactions, icon: BarChart3, iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    {
      label: 'Current FY',
      value: stats ? `${stats.fy}-${String(stats.fy + 1).slice(-2)}` : undefined,
      icon: Clock,
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {statsError && (
          <div className="alert alert-danger">
            Failed to load system stats: {statsError instanceof Error ? statsError.message : 'Unknown error'}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group"
              >
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{card.value ?? '-'}</h3>
                </div>
                <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${card.iconBg}`}>
                  <Icon size={20} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Monthly Data-Entry Completion</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Salary months entered for each office&apos;s current financial year
                </span>
              </div>
              <TrendingUp size={18} className="text-slate-400" />
            </div>
            <div className="card-body p-0">
              <EntryCompletion data={completion ?? []} isLoading={!completion} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Offices at a Glance</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Click a row to open its reports</span>
              </div>
              <BarChart3 size={18} className="text-slate-400" />
            </div>
            <div className="card-body p-0">
              <OfficeStatsTable
                offices={officeStats ?? []}
                isLoading={!officeStats}
                activeOfficeId={activeOfficeId}
                onSelectOffice={handleSelectOffice}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

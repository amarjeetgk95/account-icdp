import { useRef, useState } from 'react';
import { Users, Shield, BarChart3, FileSpreadsheet, Clock, RefreshCw, TrendingUp, Activity } from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useSystemStats,
  useOfficeStats,
  useUsers,
  useOffices,
  useCreateUser,
  useDataEntryReport,
  useEntryCompletion,
  useAuditLogs,
} from '../hooks/useAdmin';
import { UserList } from '../components/UserList';
import { OfficeStatsTable } from '../components/OfficeStatsTable';
import { CreateUserForm } from '../components/CreateUserForm';
import { DataEntryReport } from '../components/DataEntryReport';
import { AdminReports } from '../components/AdminReports';
import { EntryCompletion } from '../components/EntryCompletion';
import { AuditLog } from '../components/AuditLog';
import { useUIStore } from '@/core/stores/ui-store';
import type { CreateUserInput } from '../types';

type SectionId = 'overview' | 'users' | 'report';

const SECTIONS: { id: SectionId; path: string; title: string; subtitle: string; icon: React.ElementType }[] = [
  {
    id: 'overview',
    path: '/admin',
    title: 'System Overview',
    subtitle: 'Key metrics, data-entry completion, and office status',
    icon: Activity,
  },
  {
    id: 'users',
    path: '/admin/users',
    title: 'User Management',
    subtitle: 'Create users, assign roles, and review admin activity',
    icon: Users,
  },
  {
    id: 'report',
    path: '/admin/reports',
    title: 'Data Entry & Reports',
    subtitle: 'Cross-office data-entry summary and report drill-down',
    icon: FileSpreadsheet,
  },
];

export function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeSection = SECTIONS.find((s) => s.path === location.pathname)?.id ?? 'overview';

  const reportOfficeId = searchParams.get('office') ?? '';
  const [userStatus, setUserStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    path: string;
  } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuthStore();
  const { activeOfficeId } = useUIStore();

  const { data: stats, error: statsError } = useSystemStats();
  const { data: officeStats } = useOfficeStats();
  const {
    users,
    isLoading: usersLoading,
    isError: usersError,
    setUserRoleAsync,
    deleteUserAsync,
    isSettingRole,
    isDeleting,
  } = useUsers();
  const { data: offices, error: officesError } = useOffices();
  const createUser = useCreateUser();
  const { data: reportData } = useDataEntryReport();
  const { data: completion } = useEntryCompletion();
  const { data: auditLogs } = useAuditLogs();

  const showUserStatus = (type: 'success' | 'error' | 'info', message: string) => {
    setUserStatus({ type, message, path: location.pathname });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    if (type !== 'error') {
      statusTimer.current = setTimeout(() => setUserStatus(null), 4000);
    }
  };

  const handleSetRole = async (userId: string, role: 'admin' | 'office', officeId: string | null) => {
    try {
      await setUserRoleAsync({ userId, role, officeId });
      showUserStatus('success', `User role updated to ${role}.`);
    } catch (error) {
      showUserStatus('error', error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserAsync(userId);
      showUserStatus('success', 'User and office data deleted.');
    } catch (error) {
      showUserStatus('error', error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const handleCreateUser = (input: CreateUserInput) => createUser.mutateAsync(input);

  const handleSelectOffice = (officeId: string) => {
    navigate(`/admin/reports?office=${encodeURIComponent(officeId)}`);
  };

  const handleOfficeIdChange = (officeId: string) => {
    const params = new URLSearchParams(searchParams);
    if (officeId) params.set('office', officeId);
    else params.delete('office');
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
  };

  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];
  const ActiveIcon = section.icon;

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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <ActiveIcon size={20} />
          </div>
          <div>
            <h1 className="page-title">Admin Console</h1>
            <p className="page-subtitle">{section.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => {
            useAuthStore.getState().initialize();
          }}
          className="btn btn-ghost btn-sm text-xs"
          title="Refresh data"
        >
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </button>
      </div>

      <div className="step-nav">
        {SECTIONS.map((sec) => {
          const SecIcon = sec.icon;
          return (
            <button
              key={sec.id}
              onClick={() => navigate(sec.path)}
              className={`step-link ${activeSection === sec.id ? 'active' : ''}`}
            >
              <span className="step-num">
                <SecIcon size={10} />
              </span>
              {sec.title}
            </button>
          );
        })}
      </div>

      {activeSection === 'overview' && (
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
                  <h3 className="font-semibold text-slate-800">Monthly Data-Entry Completion</h3>
                  <span className="text-xs text-slate-500">
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
                  <h3 className="font-semibold text-slate-800">Offices at a Glance</h3>
                  <span className="text-xs text-slate-500">Click a row to open its reports</span>
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
      )}

      {activeSection === 'users' && (
        <div className="space-y-6">
          {officesError && (
            <div className="alert alert-danger">
              Failed to load offices: {officesError instanceof Error ? officesError.message : 'Unknown error'}
            </div>
          )}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-slate-800">Add User</h3>
                <span className="text-xs text-slate-500">Create a new user and assign them to an office</span>
              </div>
              <Users size={18} className="text-slate-400" />
            </div>
            <div className="card-body">
              <CreateUserForm
                offices={offices ?? []}
                onSubmit={handleCreateUser}
                isLoading={createUser.isPending}
              />
            </div>
          </div>

          {userStatus && userStatus.path === location.pathname && (
            <div
              className={
                'alert ' +
                (userStatus.type === 'success'
                  ? 'alert-success'
                  : userStatus.type === 'error'
                  ? 'alert-danger'
                  : 'alert-info')
              }
            >
              {userStatus.message}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-slate-800">Users & Roles</h3>
                <span className="text-xs text-slate-500">Manage user access and office assignments</span>
              </div>
              <Shield size={18} className="text-slate-400" />
            </div>
            <div className="card-body">
              {usersError && (
                <div className="alert alert-danger mb-4">
                  Failed to load users. Please refresh the page.
                </div>
              )}
              <UserList
                users={users}
                offices={offices ?? []}
                isLoading={usersLoading}
                isBusy={isSettingRole || isDeleting}
                onSetRole={handleSetRole}
                onDelete={handleDeleteUser}
                currentUserEmail={user?.email}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-slate-800">Admin Activity Log</h3>
                <span className="text-xs text-slate-500">Recent user & office actions</span>
              </div>
              <Clock size={18} className="text-slate-400" />
            </div>
            <div className="card-body p-0">
              <AuditLog data={auditLogs ?? []} isLoading={!auditLogs} />
            </div>
          </div>
        </div>
      )}

      {activeSection === 'report' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-slate-800">Data Entry Summary</h3>
                <span className="text-xs text-slate-500">Salary entry status across all offices</span>
              </div>
              <FileSpreadsheet size={18} className="text-slate-400" />
            </div>
            <div className="card-body p-0">
              <DataEntryReport data={reportData ?? []} isLoading={!reportData} />
            </div>
          </div>
          <AdminReports
            offices={offices ?? []}
            officesLoading={!offices}
            officeId={reportOfficeId}
            onOfficeIdChange={handleOfficeIdChange}
          />
        </div>
      )}
    </div>
  );
}

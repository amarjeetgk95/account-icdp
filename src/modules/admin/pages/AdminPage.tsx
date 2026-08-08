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
    { label: 'Total Users', value: stats?.users, color: 'border-blue-500', text: 'text-blue-600', icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Admins', value: stats?.admins, color: 'border-purple-500', text: 'text-purple-600', icon: Shield, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Offices', value: stats?.offices, color: 'border-green-500', text: 'text-green-600', icon: BarChart3, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Employees', value: stats?.employees, color: 'border-amber-500', text: 'text-amber-600', icon: Users, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'Salary Records', value: stats?.salaries, color: 'border-emerald-500', text: 'text-emerald-600', icon: FileSpreadsheet, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Vendors', value: stats?.parties, color: 'border-cyan-500', text: 'text-cyan-600', icon: Users, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
    { label: 'Transactions', value: stats?.transactions, color: 'border-indigo-500', text: 'text-indigo-600', icon: BarChart3, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    {
      label: 'Current FY',
      value: stats ? `${stats.fy}-${String(stats.fy + 1).slice(-2)}` : undefined,
      color: 'border-rose-500',
      text: 'text-rose-600',
      icon: Clock,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
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
          className="btn btn-ghost btn-sm"
          title="Refresh data"
        >
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </button>
      </div>

      <div className="step-nav">
        {SECTIONS.map((sec, _idx) => {
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
                <div key={card.label} className={`stat-tile stat-tile-accent ${card.color}`}>
                  <div className={`stat-tile-icon ${card.iconBg} ${card.iconColor}`}>
                    <Icon size={20} />
                  </div>
                  <div className="stat-label">{card.label}</div>
                  <div className={`stat-value ${card.text}`}>{card.value ?? '-'}</div>
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

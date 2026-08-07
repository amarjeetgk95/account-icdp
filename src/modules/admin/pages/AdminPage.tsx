import { useState } from 'react';
import { useAuthStore } from '@/core/auth/store';
import { useSystemStats, useOfficeStats, useUsers, useOffices, useCreateUser, useDataEntryReport } from '../hooks/useAdmin';
import { UserList } from '../components/UserList';
import { OfficeStatsTable } from '../components/OfficeStatsTable';
import { CreateUserForm } from '../components/CreateUserForm';
import { DataEntryReport } from '../components/DataEntryReport';
import { useUIStore } from '@/core/stores/ui-store';

type TabId = 'overview' | 'users' | 'report';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { user } = useAuthStore();
  const { activeOfficeId } = useUIStore();

  const { data: stats } = useSystemStats();
  const { data: officeStats } = useOfficeStats();
  const { users, isLoading: usersLoading, setUserRole, deleteUser } = useUsers();
  const { data: offices } = useOffices();
  const createUser = useCreateUser();
  const { data: reportData } = useDataEntryReport();

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'System Overview', icon: '📊' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'report', label: 'Data Entry Report', icon: '📋' },
  ];

  const handleSetRole = async (userId: string, role: 'admin' | 'office') => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (!confirm(`Change role of "${targetUser.email}" to ${role}?`)) return;
    setUserRole({ userId, role, officeId: targetUser.office_id });
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (!confirm(`⚠️ PERMANENTLY DELETE user "${targetUser.email}"?\n\nTheir account and office with ALL its data will be permanently deleted. This cannot be undone.`)) return;

    const code = prompt('Type "DELETE" to confirm:');
    if (code?.toUpperCase() !== 'DELETE') return;

    deleteUser(userId);
  };

  const handleCreateUser = async (input: { email: string; password: string; role: 'admin' | 'office'; officeName: string }) => {
    try {
      await createUser.mutateAsync(input);
      alert(`User ${input.email} created successfully!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin Console</h1>
        <p className="text-slate-500 mt-1">System-wide oversight, user management and per-office data entry reports.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats?.users ?? '—'} color="blue" />
              <StatCard label="Admins" value={stats?.admins ?? '—'} color="purple" />
              <StatCard label="Offices" value={stats?.offices ?? '—'} color="green" />
              <StatCard label="Current FY" value={stats ? `${stats.fy}-${(stats.fy + 1) % 100}` : '—'} color="amber" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Employees" value={stats?.employees ?? '—'} color="blue" />
              <StatCard label="Salary Records" value={stats?.salaries ?? '—'} color="green" />
              <StatCard label="Vendors" value={stats?.parties ?? '—'} color="amber" />
              <StatCard label="Party Transactions" value={stats?.transactions ?? '—'} color="red" />
            </div>

            {/* Office Details */}
            {stats?.officeName && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Office Details</h3>
                <p className="text-slate-600">{stats.officeName} — FY {stats.fy}-{(stats.fy + 1) % 100}</p>
              </div>
            )}

            {/* Office Stats Table */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
                Offices at a Glance
              </h3>
              <OfficeStatsTable
                offices={officeStats ?? []}
                isLoading={!officeStats}
                activeOfficeId={activeOfficeId}
              />
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Create User */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
                Add User
              </h3>
              <CreateUserForm
                offices={offices ?? []}
                onSubmit={handleCreateUser}
                isLoading={createUser.isPending}
              />
            </div>

            {/* User List */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
                Users & Roles
              </h3>
              <UserList
                users={users}
                isLoading={usersLoading}
                onSetRole={handleSetRole}
                onDelete={handleDeleteUser}
                currentUserEmail={user?.email}
              />
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
              Data Entry Summary
            </h3>
            <DataEntryReport data={reportData ?? []} isLoading={!reportData} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'red';
}) {
  const colors = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <div className="card p-4">
      <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${colors[color]}`}>
        {label}
      </div>
      <div className="text-xl font-extrabold text-slate-800">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
    </div>
  );
}

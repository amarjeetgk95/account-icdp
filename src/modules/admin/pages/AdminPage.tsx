import { useState } from 'react';
import { useAuthStore } from '@/core/auth/store';
import { useSystemStats, useOfficeStats, useUsers, useOffices, useCreateUser, useDataEntryReport } from '../hooks/useAdmin';
import { UserList } from '../components/UserList';
import { OfficeStatsTable } from '../components/OfficeStatsTable';
import { CreateUserForm } from '../components/CreateUserForm';
import { DataEntryReport } from '../components/DataEntryReport';
import { AdminReports } from '../components/AdminReports';
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
    { id: 'overview', label: 'System Overview', icon: 'O' },
    { id: 'users', label: 'User Management', icon: 'U' },
    { id: 'report', label: 'Data Entry Report', icon: 'R' },
  ];

  const handleSetRole = async (userId: string, role: 'admin' | 'office') => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    if (!confirm('Change role of "' + targetUser.email + '" to ' + role + '?')) return;
    setUserRole({ userId, role, officeId: targetUser.office_id });
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    if (!confirm('DELETE user "' + targetUser.email + '"? This cannot be undone.')) return;
    const code = prompt('Type DELETE to confirm:');
    if (code?.toUpperCase() !== 'DELETE') return;
    deleteUser(userId);
  };

  const handleCreateUser = async (input: { email: string; password: string; role: 'admin' | 'office'; officeName: string }) => {
    try {
      await createUser.mutateAsync(input);
      alert('User ' + input.email + ' created successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Console</h1>
          <p className="text-slate-500 text-sm mt-1">System-wide oversight and user management</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={"px-4 py-3 text-sm font-medium border-b-2 transition-colors " +
              (activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}
          >
            <span className="mr-2">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4"><div className="text-xs font-bold text-blue-600 uppercase">Total Users</div><div className="text-xl font-extrabold mt-1">{stats?.users ?? '-'}</div></div>
              <div className="card p-4"><div className="text-xs font-bold text-purple-600 uppercase">Admins</div><div className="text-xl font-extrabold mt-1">{stats?.admins ?? '-'}</div></div>
              <div className="card p-4"><div className="text-xs font-bold text-green-600 uppercase">Offices</div><div className="text-xl font-extrabold mt-1">{stats?.offices ?? '-'}</div></div>
              <div className="card p-4"><div className="text-xs font-bold text-amber-600 uppercase">Current FY</div><div className="text-xl font-extrabold mt-1">{stats ? stats.fy + '-' + ((stats.fy + 1) % 100) : '-'}</div></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4"><div className="text-xs font-bold text-blue-600 uppercase">Employees</div><div className="text-xl font-extrabold mt-1">{stats?.employees ?? '-'}</div></div>
              <div className="card p-4"><div className="text-xs font-bold text-green-600 uppercase">Salary Records</div><div className="text-xl font-extrabold mt-1">{stats?.salaries ?? '-'}</div></div>
              <div className="card p-4"><div className="text-xs font-bold text-amber-600 uppercase">Vendors</div><div className="text-xl font-extrabold mt-1">{stats?.parties ?? '-'}</div></div>
              <div className="card p-4"><div className="text-xs font-bold text-red-600 uppercase">Transactions</div><div className="text-xl font-extrabold mt-1">{stats?.transactions ?? '-'}</div></div>
            </div>

            {stats?.officeName && (
              <div className="card p-5"><h3 className="text-sm font-bold text-slate-800 mb-2">Office Details</h3><p className="text-slate-600">{stats.officeName}</p></div>
            )}

            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Offices at a Glance</h3></div>
              <div className="card-body"><OfficeStatsTable offices={officeStats ?? []} isLoading={!officeStats} activeOfficeId={activeOfficeId} /></div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Add User</h3></div>
              <div className="card-body"><CreateUserForm offices={offices ?? []} onSubmit={handleCreateUser} isLoading={createUser.isPending} /></div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Users & Roles</h3></div>
              <div className="card-body"><UserList users={users} isLoading={usersLoading} onSetRole={handleSetRole} onDelete={handleDeleteUser} currentUserEmail={user?.email} /></div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Data Entry Summary</h3></div>
              <div className="card-body"><DataEntryReport data={reportData ?? []} isLoading={!reportData} /></div>
            </div>
            <AdminReports offices={offices ?? []} officesLoading={!offices} />
          </div>
        )}
      </div>
    </div>
  );
}

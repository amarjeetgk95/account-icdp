import { useRef, useState } from 'react';
import { Users, Shield, Clock } from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { useLocation } from 'react-router-dom';
import { useUsers, useOffices, useCreateUser, useAuditLogs } from '../hooks/useAdmin';
import { UserList } from '../components/UserList';
import { CreateUserForm } from '../components/CreateUserForm';
import { AuditLog } from '../components/AuditLog';
import { AdminLayout } from '../components/AdminLayout';
import type { CreateUserInput } from '../types';

export function AdminUsersPage() {
  const location = useLocation();
  const { user } = useAuthStore();

  const [userStatus, setUserStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    path: string;
  } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {officesError && (
          <div className="alert alert-danger">
            Failed to load offices: {officesError instanceof Error ? officesError.message : 'Unknown error'}
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Add User</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Create a new user and assign them to an office</span>
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
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Users & Roles</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Manage user access and office assignments</span>
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
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Admin Activity Log</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Recent user & office actions</span>
            </div>
            <Clock size={18} className="text-slate-400" />
          </div>
          <div className="card-body p-0">
            <AuditLog data={auditLogs ?? []} isLoading={!auditLogs} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

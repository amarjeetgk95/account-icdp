import { useRef, useState } from 'react';
import { UserPlus, ShieldCheck, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUsers, useOffices, useCreateUser } from '../hooks/useAdmin';
import { UserList } from '../components/UserList';
import { CreateUserForm } from '../components/CreateUserForm';
import { AdminModal } from '../components/AdminModal';
import { AdminLayout } from '../components/AdminLayout';
import '../styles/users.css';
import type { CreateUserInput } from '../types';

export function AdminUsersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [userStatus, setUserStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    path: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const handleCreateUser = async (input: CreateUserInput): Promise<string> => {
    const message = await createUser.mutateAsync(input);
    showUserStatus('success', message);
    setModalOpen(false);
    return message;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 um-page">
        {officesError && (
          <div className="alert alert-danger animate-fade-in">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>
              Failed to load offices: {officesError instanceof Error ? officesError.message : 'Unknown error'}
            </span>
          </div>
        )}

        {userStatus && userStatus.path === location.pathname && (
          <div
            className={
              'alert animate-fade-in ' +
              (userStatus.type === 'success'
                ? 'alert-success'
                : userStatus.type === 'error'
                ? 'alert-danger'
                : 'alert-info')
            }
          >
            {userStatus.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : userStatus.type === 'error' ? (
              <XCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <Info size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{userStatus.message}</span>
          </div>
        )}

        <div className="admin-users-header">
          <div className="flex items-center gap-3">
            <span
              className="um-icon-tile"
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' }}
            >
              <ShieldCheck size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="admin-users-title">Users & Roles</h2>
              <p className="admin-users-sub">Manage user access and office assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/audit')}
              className="btn btn-outline btn-sm text-xs admin-users-audit-link"
            >
              View full audit trail
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <UserPlus size={14} />
              Add User
            </button>
          </div>
        </div>

        <div className="card um-card animate-fade-in">
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
      </div>

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User" maxWidth="max-w-lg">
        <CreateUserForm
          offices={offices ?? []}
          onSubmit={handleCreateUser}
          isLoading={createUser.isPending}
        />
      </AdminModal>
    </AdminLayout>
  );
}

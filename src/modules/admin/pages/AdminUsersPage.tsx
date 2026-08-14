import { useState, useMemo } from 'react';
import { UserPlus, Info, UserX, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { useNavigate } from 'react-router-dom';
import { useUsers, useOffices, useCreateUser } from '../hooks/useAdmin';
import { UserList } from '../components/UserList';
import { CreateUserForm } from '../components/CreateUserForm';
import { AdminModal } from '../components/AdminModal';
import { AdminLayout } from '../components/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { getSectionIcon } from '@/shared/icons';
import type { CreateUserInput } from '../types';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);

  const {
    users,
    isLoading: usersLoading,
    isError: usersError,
    setUserRoleAsync,
    setUserStatusAsync,
    deleteUserAsync,
    isSettingRole,
    isDeleting,
    isSettingStatus,
  } = useUsers();
  const { data: offices, error: officesError } = useOffices();
  const createUser = useCreateUser();

  const suspendedCount = useMemo(
    () => users.filter((u) => u.suspended).length,
    [users]
  );

  const handleSetRole = async (userId: string, role: 'admin' | 'office', officeId: string | null) => {
    try {
      await setUserRoleAsync({ userId, role, officeId });
      toast({ title: 'Role updated', description: `User role changed to ${role}.` });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleSetStatus = async (userId: string, suspended: boolean) => {
    try {
      await setUserStatusAsync({ userId, suspended });
      const target = users.find((u) => u.id === userId);
      toast({
        title: suspended ? 'User suspended' : 'User reactivated',
        description: suspended
          ? `${target?.email || 'User'} can no longer sign in.`
          : `${target?.email || 'User'} can sign in again.`,
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserAsync(userId);
      toast({ title: 'User deleted', description: 'User and their office data were removed.' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async (input: CreateUserInput): Promise<string> => {
    const message = await createUser.mutateAsync(input);
    toast({ title: 'User created', description: message });
    setModalOpen(false);
    return message;
  };

  return (
    <AdminLayout
      title="User Management"
      subtitle="Create users, assign roles, and review admin activity"
      icon={getSectionIcon('users')}
    >
      <div className="space-y-5">
        {officesError && (
          <div className="alert alert-danger rounded-xl animate-fade-in">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>
              Failed to load offices: {officesError instanceof Error ? officesError.message : 'Unknown error'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              Users: <strong className="tabular-nums font-bold">{users.length}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
              Admins: <strong className="tabular-nums font-bold">{users.filter((u) => u.role === 'admin').length}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
              Office Users:{' '}
              <strong className="tabular-nums font-bold">{users.filter((u) => u.role === 'office').length}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/15 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-900/50">
              <UserX size={11} /> Suspended:{' '}
              <strong className="tabular-nums font-bold">{suspendedCount}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-500/15 text-xs font-semibold text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/50">
              <UserCheck size={11} /> Active:{' '}
              <strong className="tabular-nums font-bold">{users.length - suspendedCount}</strong>
            </span>
            <button
              onClick={() => navigate('/admin/offices')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-500/20"
              title="Manage offices"
            >
              Office Management
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              Offices: <strong className="tabular-nums font-bold">{offices?.length ?? '—'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/audit')}
              className="btn btn-outline btn-sm text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View audit trail
            </button>
            <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
              <UserPlus size={14} />
              Add User
            </button>
          </div>
        </div>

        <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-1">
          <div className="card-body">
            {usersError && (
              <div className="alert alert-danger mb-4 rounded-xl">
                Failed to load users. Please refresh the page.
              </div>
            )}
            <UserList
              users={users}
              offices={offices ?? []}
              isLoading={usersLoading}
              isBusy={isSettingRole || isDeleting || isSettingStatus}
              onSetRole={handleSetRole}
              onSetStatus={handleSetStatus}
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

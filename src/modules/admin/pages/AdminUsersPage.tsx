import { useState, useMemo } from 'react';
import { UserPlus, UserX, FileText, Building2, Users, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { useNavigate } from 'react-router-dom';
import { useUsers, useOffices, useCreateUser } from '../hooks/useAdmin';
import { UserList } from '../components/UserList';
import { CreateUserForm } from '../components/CreateUserForm';
import { AdminLayout } from '@/shared/components/AdminLayout';
import { AdminModal } from '@/shared/components/AdminModal';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
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

  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
  const officeUserCount = useMemo(() => users.filter((u) => u.role === 'office').length, [users]);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, accent: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
    { label: 'Admins', value: adminCount, icon: ShieldCheck, accent: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' },
    { label: 'Office Users', value: officeUserCount, icon: Building2, accent: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
    { label: 'Suspended', value: suspendedCount, icon: UserX, accent: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300' },
  ];

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
      icon={getSectionIcon('users')}
      actions={[
        { label: 'Audit Trail', icon: FileText, onClick: () => navigate('/admin/audit') },
        {
          label: 'Add User',
          icon: UserPlus,
          onClick: () => setModalOpen(true),
          variant: 'primary',
        },
      ]}
    >
      <div className="space-y-4">
        {officesError && (
          <ErrorBanner title="Failed to load offices:" error={officesError} className="animate-fade-in" />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          {stats.map((stat) => (
            <div key={stat.label} className="card rounded-2xl p-4 admin-section-card">
              <div className="flex items-center gap-3">
                <span className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + stat.accent}>
                  <stat.icon size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none tabular-nums text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-1">
          <div className="card-body p-0">
            {usersError && (
              <ErrorBanner message="Failed to load users. Please refresh the page." className="mb-4 mx-4 sm:mx-5 mt-4" />
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

import { useState, useMemo } from 'react';
import { Search, Users, ShieldCheck, Building2, ArrowUp, ArrowDown, Trash2, UserRound } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { SkeletonTable } from '@/shared/components/Skeleton';
import type { UserInfo } from '../types';

interface UserListProps {
  users: UserInfo[];
  offices: { id: string; name: string; users: number }[];
  isLoading: boolean;
  isBusy?: boolean;
  onSetRole: (userId: string, role: 'admin' | 'office', officeId: string | null) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  currentUserEmail?: string;
}

type Dialog =
  | { type: 'delete'; user: UserInfo }
  | { type: 'role'; user: UserInfo; newRole: 'admin' | 'office' }
  | null;

export function UserList({ users, offices, isLoading, isBusy, onSetRole, onDelete, currentUserEmail }: UserListProps) {
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [roleOfficeId, setRoleOfficeId] = useState('');

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.office_name || '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const availableOffices = useMemo(
    () =>
      offices.filter(
        (o) => Number(o.users) === 0 || (dialog?.type === 'role' && dialog.user.office_id === o.id)
      ),
    [offices, dialog]
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('en-IN');
  };

  const openRoleDialog = (user: UserInfo, newRole: 'admin' | 'office') => {
    setDialog({ type: 'role', user, newRole });
    setRoleOfficeId(user.office_id || availableOffices[0]?.id || '');
  };

  const confirmRole = async () => {
    if (!dialog || dialog.type !== 'role') return;
    const target = dialog;
    try {
      await onSetRole(target.user.id, target.newRole, target.newRole === 'office' ? roleOfficeId || null : null);
      setDialog(null);
    } catch {
      setDialog(null);
    }
  };

  const confirmDelete = async () => {
    if (!dialog || dialog.type !== 'delete') return;
    try {
      await onDelete(dialog.user.id);
      setDialog(null);
    } catch {
      setDialog(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-full max-w-sm rounded-xl" />
        <SkeletonTable rows={4} cols={6} />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="empty-state py-14">
        <span className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
          <Users size={32} strokeWidth={1.5} className="text-slate-400 dark:text-slate-500" />
        </span>
        <p className="empty-state-text">No users found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="um-search search-input-wrapper max-w-sm">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            placeholder="Search email / office / role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
        </div>

        <div className="overflow-auto um-table max-h-[560px]">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Office</th>
                <th>Created</th>
                <th>Last Sign-in</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isCurrentUser = user.email.toLowerCase() === (currentUserEmail || '').toLowerCase();
                return (
                  <tr key={user.id}>
                    <td className="font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="hidden sm:inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          <UserRound size={13} strokeWidth={2} />
                        </span>
                        <span className="truncate max-w-[260px]">{user.email}</span>
                        {isCurrentUser && (
                          <span className="um-you-pill">
                            <UserRound size={9} /> you
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`um-chip ${
                          user.role === 'admin' ? 'um-chip-admin' : 'um-chip-office'
                        }`}
                      >
                        {user.role === 'admin' ? <ShieldCheck size={12} /> : <Building2 size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{user.office_name || '-'}</td>
                    <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{formatDate(user.created_at)}</td>
                    <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{formatDate(user.last_sign_in_at)}</td>
                    <td>
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() =>
                            openRoleDialog(user, user.role === 'admin' ? 'office' : 'admin')
                          }
                          disabled={isCurrentUser}
                          className="um-icon-btn"
                          title={user.role === 'admin' ? 'Demote to office user' : 'Promote to admin'}
                          aria-label={user.role === 'admin' ? 'Demote to office user' : 'Promote to admin'}
                        >
                          {user.role === 'admin' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                        </button>
                        <button
                          onClick={() => setDialog({ type: 'delete', user })}
                          disabled={isCurrentUser}
                          className="um-icon-btn um-icon-btn-danger"
                          title="Delete user and their office"
                          aria-label={`Delete ${user.email}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Search size={20} className="text-slate-400 dark:text-slate-500" />
                    </span>
                    <p className="empty-state-text">No users match your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={dialog?.type === 'role'}
        title={dialog?.type === 'role' && dialog.newRole === 'admin' ? 'Promote to Admin' : 'Demote to Office User'}
        danger={dialog?.type === 'role' && dialog.newRole === 'office'}
        busy={isBusy}
        confirmLabel={dialog?.type === 'role' && dialog.newRole === 'admin' ? 'Promote' : 'Demote'}
        onConfirm={confirmRole}
        onCancel={() => setDialog(null)}
      >
        {dialog?.type === 'role' && (
          <div className="text-sm text-slate-600 space-y-4">
            <p>
              {dialog.newRole === 'admin'
                ? `"${dialog.user.email}" will become a global admin with access to every office.`
                : `"${dialog.user.email}" will be limited to a single office.`}
            </p>
            {dialog.newRole === 'office' && (
              <div>
                <label className="label">Assign Office</label>
                <select
                  value={roleOfficeId}
                  onChange={(e) => setRoleOfficeId(e.target.value)}
                  className="input"
                >
                  <option value="">Select office...</option>
                  {availableOffices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                {availableOffices.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No office is available to assign. Create an office first.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.type === 'delete'}
        title="Delete User"
        message={
          <>
            This will permanently delete the user account for{' '}
            <strong>{dialog?.type === 'delete' ? dialog.user.email : ''}</strong> and their office&apos;s
            data. This cannot be undone.
          </>
        }
        danger
        requireText="DELETE"
        busy={isBusy}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}

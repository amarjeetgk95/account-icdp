import { useState, useMemo } from 'react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
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
      <div className="flex justify-center py-8">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return <div className="empty-state"><p>No users found.</p></div>;
  }

  return (
    <>
      <div className="space-y-4">
        <input
          type="search"
          placeholder="Search email / office / role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />

        <div className="overflow-x-auto">
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
                    <td className="font-medium">
                      {user.email}
                      {isCurrentUser && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          you
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          user.role === 'admin' ? 'badge-primary' : 'badge-success'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>{user.office_name || '-'}</td>
                    <td className="text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="text-slate-500">{formatDate(user.last_sign_in_at)}</td>
                    <td>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() =>
                            openRoleDialog(user, user.role === 'admin' ? 'office' : 'admin')
                          }
                          disabled={isCurrentUser}
                          className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={user.role === 'admin' ? 'Make office user' : 'Make admin'}
                        >
                          {user.role === 'admin' ? '↓ Demote' : '↑ Promote'}
                        </button>
                        <button
                          onClick={() => setDialog({ type: 'delete', user })}
                          disabled={isCurrentUser}
                          className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete user and their office"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

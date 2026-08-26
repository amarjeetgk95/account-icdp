import { useState, useMemo } from 'react';
import {
  Search,
  Users,
  ShieldCheck,
  Building2,
  ArrowUp,
  ArrowDown,
  Trash2,
  UserRound,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { AdminModal } from '@/shared/components/AdminModal';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { formatDate } from '@/shared/utilities';
import type { UserInfo } from '../types';

interface UserListProps {
  users: UserInfo[];
  offices: { id: string; name: string; users: number }[];
  isLoading: boolean;
  isBusy?: boolean;
  onSetRole: (userId: string, role: 'admin' | 'office', officeId: string | null) => Promise<void>;
  onSetStatus: (userId: string, suspended: boolean) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  onEdit?: (user: UserInfo) => void;
  currentUserEmail?: string;
}

type Dialog =
  | { type: 'delete'; user: UserInfo }
  | { type: 'role'; user: UserInfo; newRole: 'admin' | 'office' }
  | { type: 'suspend'; user: UserInfo; toSuspended: boolean }
  | null;

export function UserList({
  users,
  offices,
  isLoading,
  isBusy,
  onSetRole,
  onSetStatus,
  onDelete,
  onEdit,
  currentUserEmail,
}: UserListProps) {
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [roleOfficeId, setRoleOfficeId] = useState('');
  const [selected, setSelected] = useState<UserInfo | null>(null);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.office_name || '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.suspended ? 'suspended' : 'active').toLowerCase().includes(q)
    );
  });

  const availableOffices = useMemo(
    () =>
      offices.filter(
        (o) => Number(o.users) === 0 || (dialog?.type === 'role' && dialog.user.office_id === o.id)
      ),
    [offices, dialog]
  );

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

  const confirmSuspend = async () => {
    if (!dialog || dialog.type !== 'suspend') return;
    const target = dialog;
    try {
      await onSetStatus(target.user.id, target.toSuspended);
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
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No users found</p>
        <p className="text-xs text-slate-500 mt-1">Add your first user account to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, office, role..."
            className="input pl-9 h-9 text-xs w-full"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{filteredUsers.length}</strong> of {users.length} users
        </div>
      </div>

      <VirtualizedUserTable
        users={filteredUsers}
        currentUserEmail={currentUserEmail}
        onSelect={setSelected}
        onEdit={onEdit}
      />

      {/* User Detail Modal */}
      <AdminModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="User Account Details"
        maxWidth="max-w-md"
      >
        {selected && (
          <UserDetailBody
            user={selected}
            isCurrentUser={selected.email.toLowerCase() === (currentUserEmail || '').toLowerCase()}
            onEdit={() => {
              const u = selected;
              setSelected(null);
              onEdit?.(u);
            }}
            onSuspend={() => {
              setDialog({ type: 'suspend', user: selected, toSuspended: !selected.suspended });
              setSelected(null);
            }}
            onRole={() => {
              setDialog({
                type: 'role',
                user: selected,
                newRole: selected.role === 'admin' ? 'office' : 'admin',
              });
              setRoleOfficeId(selected.office_id || '');
              setSelected(null);
            }}
            onDelete={() => {
              setDialog({ type: 'delete', user: selected });
              setSelected(null);
            }}
          />
        )}
      </AdminModal>

      {/* Role Change Confirmation */}
      <ConfirmDialog
        open={dialog?.type === 'role'}
        title={`Change Role to ${dialog?.type === 'role' ? dialog.newRole : ''}`}
        message={
          dialog?.type === 'role' && dialog.newRole === 'office' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Select an office for <strong>{dialog.user.email}</strong>.
              </p>
              <select
                value={roleOfficeId}
                onChange={(e) => setRoleOfficeId(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="">No office assigned</option>
                {availableOffices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            `Promote ${dialog?.type === 'role' ? dialog.user.email : ''} to Admin? They will have full access across all offices.`
          )
        }
        busy={isBusy}
        confirmLabel="Update Role"
        onConfirm={confirmRole}
        onCancel={() => setDialog(null)}
      />

      {/* Suspend Confirmation */}
      <ConfirmDialog
        open={dialog?.type === 'suspend'}
        title={dialog?.type === 'suspend' && dialog.toSuspended ? 'Suspend User' : 'Reactivate User'}
        message={
          dialog?.type === 'suspend' && dialog.toSuspended
            ? `Suspend ${dialog.user.email}? They will not be able to log in.`
            : `Reactivate ${dialog?.type === 'suspend' ? dialog.user.email : ''}?`
        }
        danger={dialog?.type === 'suspend' && dialog.toSuspended}
        busy={isBusy}
        confirmLabel={dialog?.type === 'suspend' && dialog.toSuspended ? 'Suspend' : 'Reactivate'}
        onConfirm={confirmSuspend}
        onCancel={() => setDialog(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={dialog?.type === 'delete'}
        title="Delete User"
        message={
          <>
            Are you sure you want to permanently delete{' '}
            <strong>{dialog?.type === 'delete' ? dialog.user.email : ''}</strong>? This cannot be undone.
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

function VirtualizedUserTable({
  users,
  currentUserEmail,
  onSelect,
  onEdit,
}: {
  users: UserInfo[];
  currentUserEmail?: string;
  onSelect: (u: UserInfo) => void;
  onEdit?: (u: UserInfo) => void;
}) {
  return (
    <div className="um-table">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Office</th>
            <th>Status</th>
            <th>Created</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isCurrentUser = user.email.toLowerCase() === (currentUserEmail || '').toLowerCase();
            const missingOffice = user.role === 'office' && !user.office_name;
            return (
              <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td
                  className="font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap cursor-pointer"
                  onClick={() => onSelect(user)}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <span className="relative shrink-0">
                      <span
                        className={
                          'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold uppercase ' +
                          (user.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300')
                        }
                      >
                        {user.email.charAt(0) || '?'}
                      </span>
                      {isCurrentUser && (
                        <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[7px] font-bold leading-none border-2 border-white dark:border-slate-900">
                          you
                        </span>
                      )}
                    </span>
                    <span className="truncate max-w-[280px]">{user.email}</span>
                  </span>
                </td>
                <td>
                  <span className={`um-chip ${user.role === 'admin' ? 'um-chip-admin' : 'um-chip-office'}`}>
                    {user.role === 'admin' ? <ShieldCheck size={12} /> : <Building2 size={12} />}
                    {user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  {user.office_name ? (
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Building2 size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      {user.office_name}
                    </span>
                  ) : missingOffice ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900">
                      <AlertTriangle size={11} /> Not assigned
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <span
                    className={
                      'inline-flex items-center gap-1.5 text-xs font-semibold ' +
                      (user.suspended
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400')
                    }
                  >
                    <span
                      className={
                        'w-1.5 h-1.5 rounded-full ' +
                        (user.suspended ? 'bg-red-500' : 'bg-emerald-500')
                      }
                    />
                    {user.suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                  {user.created_at ? formatDate(user.created_at) : '-'}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(user);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit User"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelect(user)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="View Details"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserDetailBody({
  user,
  isCurrentUser,
  onEdit,
  onSuspend,
  onRole,
  onDelete,
}: {
  user: UserInfo;
  isCurrentUser: boolean;
  onEdit: () => void;
  onSuspend: () => void;
  onRole: () => void;
  onDelete: () => void;
}) {
  const missingOffice = user.role === 'office' && !user.office_name;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className={
            'flex items-center justify-center w-12 h-12 rounded-full text-base font-bold uppercase shrink-0 ' +
            (user.role === 'admin'
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300'
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300')
          }
        >
          {user.email.charAt(0) || <UserRound size={18} />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white break-all inline-flex items-center gap-2">
            {user.email}
            {isCurrentUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                you
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Joined {user.created_at ? formatDate(user.created_at) : '—'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Role</dt>
          <dd className="mt-1">
            <span className={`um-chip ${user.role === 'admin' ? 'um-chip-admin' : 'um-chip-office'}`}>
              {user.role === 'admin' ? <ShieldCheck size={12} /> : <Building2 size={12} />}
              {user.role}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</dt>
          <dd className="mt-1">
            <span
              className={
                'inline-flex items-center gap-1.5 text-xs font-semibold ' +
                (user.suspended ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')
              }
            >
              <span className={'w-1.5 h-1.5 rounded-full ' + (user.suspended ? 'bg-red-500' : 'bg-emerald-500')} />
              {user.suspended ? 'Suspended' : 'Active'}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Office</dt>
          <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            {user.office_name ? (
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={13} className="text-slate-400 dark:text-slate-500" />
                {user.office_name}
              </span>
            ) : missingOffice ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900">
                <AlertTriangle size={11} /> Not assigned
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">-</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Last Sign-in</dt>
          <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
          </dd>
        </div>
      </dl>

      {missingOffice && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>This office user has no office assigned, so they cannot see any employee or paybill data. Use Edit User to assign an office.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button onClick={onEdit} className="btn btn-primary">
          <Pencil size={14} /> Edit User &amp; Access
        </button>
        <button onClick={onSuspend} disabled={isCurrentUser} className="btn btn-outline">
          {user.suspended ? <UserCheck size={15} /> : <UserX size={15} />}
          {user.suspended ? 'Reactivate' : 'Suspend'}
        </button>
        <button onClick={onRole} disabled={isCurrentUser} className="btn btn-outline">
          {user.role === 'admin' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
          {user.role === 'admin' ? 'Demote' : 'Promote'}
        </button>
        <button onClick={onDelete} disabled={isCurrentUser} className="btn btn-danger ml-auto">
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </div>
  );
}

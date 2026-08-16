import { useState, useMemo } from 'react';
import { Search, Users, ShieldCheck, Building2, ArrowUp, ArrowDown, Trash2, UserRound, UserCheck, UserX, AlertTriangle, ChevronRight } from 'lucide-react';
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2">
            <Users size={15} className="text-indigo-500 dark:text-indigo-400" />
            All Users
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 tabular-nums">
              {filteredUsers.length}/{users.length}
            </span>
          </h3>
          <div className="um-search search-input-wrapper w-full sm:w-72">
            <Search size={16} className="search-icon" />
            <input
              type="search"
              placeholder="Search email / office / role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-10 text-center">
            <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Search size={20} className="text-slate-400 dark:text-slate-500" />
            </span>
            <p className="empty-state-text">No users match your search.</p>
          </div>
        ) : (
          <VirtualizedUserTable
            users={filteredUsers}
            currentUserEmail={currentUserEmail}
            onSelect={(u) => setSelected(u)}
          />
        )}
      </div>

      <AdminModal open={selected !== null} onClose={() => setSelected(null)} title="User Details" maxWidth="max-w-lg">
        {selected && <UserDetailBody user={selected} isCurrentUser={selected.email.toLowerCase() === (currentUserEmail || '').toLowerCase()} onSuspend={() => { setSelected(null); setDialog({ type: 'suspend', user: selected, toSuspended: !selected.suspended }); }} onRole={() => { setRoleOfficeId(selected.office_id || ''); setSelected(null); setDialog({ type: 'role', user: selected, newRole: selected.role === 'admin' ? 'office' : 'admin' }); }} onDelete={() => { setSelected(null); setDialog({ type: 'delete', user: selected }); }} />}</AdminModal>

      <ConfirmDialog
        open={dialog?.type === 'suspend'}
        title={dialog?.type === 'suspend' && dialog.toSuspended ? 'Suspend User' : 'Reactivate User'}
        message={
          dialog?.type === 'suspend' ? (
            <p>
              {dialog.toSuspended
                ? `Suspending "${dialog.user.email}" prevents them from signing in and accessing any office data.`
                : `Reactivating "${dialog.user.email}" restores their access.`}
            </p>
          ) : undefined
        }
        danger={dialog?.type === 'suspend' && dialog.toSuspended}
        requireText={dialog?.type === 'suspend' && dialog.toSuspended ? 'SUSPEND' : undefined}
        busy={isBusy}
        confirmLabel={dialog?.type === 'suspend' && dialog.toSuspended ? 'Suspend' : 'Reactivate'}
        onConfirm={confirmSuspend}
        onCancel={() => setDialog(null)}
      />

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

function VirtualizedUserTable({
  users,
  currentUserEmail,
  onSelect,
}: {
  users: UserInfo[];
  currentUserEmail?: string;
  onSelect: (u: UserInfo) => void;
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
            <th className="text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isCurrentUser = user.email.toLowerCase() === (currentUserEmail || '').toLowerCase();
            const missingOffice = user.role === 'office' && !user.office_name;
            return (
              <tr
                key={user.id}
                onClick={() => onSelect(user)}
                className="cursor-pointer"
                title="View user details"
              >
                <td className="font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
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
                  <span className="um-icon-btn inline-flex">
                    <ChevronRight size={15} />
                  </span>
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
  onSuspend,
  onRole,
  onDelete,
}: {
  user: UserInfo;
  isCurrentUser: boolean;
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
          <span>This office user has no office assigned, so they cannot see any employee or paybill data. Use Demote to Office User below to assign an office.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button onClick={onSuspend} disabled={isCurrentUser} className="btn btn-outline">
          {user.suspended ? <UserCheck size={15} /> : <UserX size={15} />}
          {user.suspended ? 'Reactivate' : 'Suspend'}
        </button>
        <button onClick={onRole} disabled={isCurrentUser} className="btn btn-outline">
          {user.role === 'admin' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
          {user.role === 'admin' ? 'Demote to Office User' : 'Promote to Admin'}
        </button>
        <button onClick={onDelete} disabled={isCurrentUser} className="btn btn-danger ml-auto">
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </div>
  );
}

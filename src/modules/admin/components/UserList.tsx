import { useState, useMemo, useRef } from 'react';
import { Search, Users, ShieldCheck, Building2, ArrowUp, ArrowDown, Trash2, UserRound, UserCheck, UserX } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { formatDateTime } from '@/shared/utilities';
import { useVirtualizer } from '@tanstack/react-virtual';
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

  const openRoleDialog = (user: UserInfo, newRole: 'admin' | 'office') => {
    setDialog({ type: 'role', user, newRole });
    setRoleOfficeId(user.office_id || availableOffices[0]?.id || '');
  };

    const openSuspendDialog = (user: UserInfo, toSuspended: boolean) => {
    setDialog({ type: 'suspend', user, toSuspended });
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
            onOpenRoleDialog={openRoleDialog}
            onOpenSuspendDialog={openSuspendDialog}
            onOpenDelete={(u) => setDialog({ type: 'delete', user: u })}
          />
        )}
      </div>

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
  onOpenRoleDialog,
  onOpenSuspendDialog,
  onOpenDelete,
}: {
  users: UserInfo[];
  currentUserEmail?: string;
  onOpenRoleDialog: (u: UserInfo, r: 'admin' | 'office') => void;
  onOpenSuspendDialog: (u: UserInfo, b: boolean) => void;
  onOpenDelete: (u: UserInfo) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 46;
  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  return (
    <div ref={parentRef} className="overflow-auto um-table h-[560px]">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Role</th>
            <th>Office</th>
            <th>Created</th>
            <th>Last Sign-in</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody style={{ height: `${users.length * ROW_HEIGHT}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const user = users[vr.index];
            const isCurrentUser = user.email.toLowerCase() === (currentUserEmail || '').toLowerCase();
            const canToggle = !isCurrentUser;
            return (
              <tr
                key={user.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${vr.start}px)`,
                }}
              >
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
                <td className="whitespace-nowrap">
                  {user.suspended ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 border border-red-200/60 dark:border-red-900">
                      <UserX size={11} /> Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900">
                      <UserCheck size={11} /> Active
                    </span>
                  )}
                </td>
                <td>
                  <span className={`um-chip ${user.role === 'admin' ? 'um-chip-admin' : 'um-chip-office'}`}>
                    {user.role === 'admin' ? <ShieldCheck size={12} /> : <Building2 size={12} />}
                    {user.role}
                  </span>
                </td>
                <td className="text-slate-600 dark:text-slate-300">{user.office_name || '-'}</td>
                <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                  {user.created_at ? formatDateTime(user.created_at) : '-'}
                </td>
                <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                  {user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : '-'}
                </td>
                <td>
                  <div className="flex justify-center gap-1">
                    <button onClick={() => onOpenSuspendDialog(user, !user.suspended)} disabled={!canToggle} className="um-icon-btn" title={user.suspended ? 'Reactivate user' : 'Suspend user'} aria-label={user.suspended ? `Reactivate ${user.email}` : `Suspend ${user.email}`}>
                      {user.suspended ? <UserCheck size={15} /> : <UserX size={15} />}
                    </button>
                    <button onClick={() => onOpenRoleDialog(user, user.role === 'admin' ? 'office' : 'admin')} disabled={isCurrentUser} className="um-icon-btn" title={user.role === 'admin' ? 'Demote to office user' : 'Promote to admin'} aria-label={user.role === 'admin' ? 'Demote to office user' : 'Promote to admin'}>
                      {user.role === 'admin' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                    </button>
                    <button onClick={() => onOpenDelete(user)} disabled={isCurrentUser} className="um-icon-btn um-icon-btn-danger" title="Delete user and their office" aria-label={`Delete ${user.email}`}>
                      <Trash2 size={15} />
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

import { UserPlus, Mail, ShieldCheck, Trash2, Building2, History, ScrollText, type LucideIcon } from 'lucide-react';
import { SkeletonTable } from '@/shared/components/Skeleton';
import type { AuditLogEntry } from '../types';

interface AuditLogProps {
  data: AuditLogEntry[];
  isLoading: boolean;
}

const ACTION_LABEL: Record<string, string> = {
  'user.created': 'User created',
  'user.invited': 'Invitation sent',
  'user.role_changed': 'Role changed',
  'user.deleted': 'User deleted',
  'office.created': 'Office created',
};

const ACTION_BADGE: Record<string, string> = {
  'user.created': 'badge-success',
  'user.invited': 'badge-info',
  'user.role_changed': 'badge-warning',
  'user.deleted': 'badge-danger',
  'office.created': 'badge-primary',
};

const ACTION_ICON: Record<string, LucideIcon> = {
  'user.created': UserPlus,
  'user.invited': Mail,
  'user.role_changed': ShieldCheck,
  'user.deleted': Trash2,
  'office.created': Building2,
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('en-IN');
}

export function AuditLog({ data, isLoading }: AuditLogProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="empty-state py-14">
        <span className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
          <ScrollText size={32} strokeWidth={1.5} className="text-slate-400 dark:text-slate-500" />
        </span>
        <p className="empty-state-text">No admin activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto um-table admin-audit max-h-[560px]">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
            <th>Performed By</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => {
            const details = entry.details as Record<string, unknown> | null;
            const detailText = details
              ? Object.entries(details)
                  .filter(([, v]) => v != null && v !== '')
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(' · ')
              : '-';
            const Icon = ACTION_ICON[entry.action] ?? History;
            return (
              <tr key={entry.id}>
                <td className="whitespace-nowrap">
                  <span className={`badge ${ACTION_BADGE[entry.action] || 'badge-neutral'}`}>
                    <Icon size={12} />
                    {ACTION_LABEL[entry.action] || entry.action}
                  </span>
                </td>
                <td className="font-bold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                  {entry.target_email || '-'}
                </td>
                <td>
                  <span
                    className="block max-w-[260px] truncate text-slate-500 dark:text-slate-400 text-[0.85rem]"
                    title={detailText}
                  >
                    {detailText}
                  </span>
                </td>
                <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{entry.admin_email || '-'}</td>
                <td className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium tabular-nums">
                  {formatTime(entry.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

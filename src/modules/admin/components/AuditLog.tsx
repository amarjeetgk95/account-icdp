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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('en-IN');
}

export function AuditLog({ data, isLoading }: AuditLogProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="empty-state"><p>No admin activity recorded yet.</p></div>;
  }

  return (
    <div className="overflow-x-auto">
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
            return (
              <tr key={entry.id}>
                <td>
                  <span className={`badge ${ACTION_BADGE[entry.action] || 'badge-neutral'}`}>
                    {ACTION_LABEL[entry.action] || entry.action}
                  </span>
                </td>
                <td className="font-medium">{entry.target_email || '-'}</td>
                <td className="text-slate-500">{detailText}</td>
                <td>{entry.admin_email || '-'}</td>
                <td className="text-slate-500">{formatTime(entry.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

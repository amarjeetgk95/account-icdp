import { useState, useMemo } from 'react';
import { Search, Download, Filter, FileText, Eye } from 'lucide-react';
import { useAdminAudit } from '../hooks/useAdminAudit';
import { filterAuditLogs, uniqueAuditUsers, uniqueAuditActions } from '../utils/filters';
import { AdminLayout } from '@/shared/components/AdminLayout';
import { AdminModal } from '@/shared/components/AdminModal';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { downloadCsv, formatDateTime, getErrorMessage } from '@/shared/utilities';
import { getSectionIcon } from '@/shared/icons';
import type { AuditLogEntry } from '../types';

export function AdminAuditPage() {
    const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const offset = (page - 1) * PAGE_SIZE;

  const { data: logs, isLoading, error, refetch, isFetching } = useAdminAudit(
    PAGE_SIZE,
    offset
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [activeDetailLog, setActiveDetailLog] = useState<AuditLogEntry | null>(null);

  const uniqueUsers = useMemo(() => uniqueAuditUsers(logs), [logs]);
  const uniqueActions = useMemo(() => uniqueAuditActions(logs), [logs]);
  const filteredLogs = useMemo(
    () =>
      filterAuditLogs(logs, {
        searchQuery,
        userFilter: selectedUser,
        actionFilter: selectedAction,
      }),
    [logs, searchQuery, selectedUser, selectedAction]
  );

  const hasNextPage = !!logs && logs.length === PAGE_SIZE;
  const hasPrevPage = page > 1;

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;

    const headers = ['ID', 'Date', 'Admin Email', 'Action', 'Target Email', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      formatDateTime(l.created_at),
      l.admin_email || 'System',
      l.action,
      l.target_email || '',
      l.details ? JSON.stringify(l.details) : '',
    ]);

    downloadCsv(`audit_logs_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportJSON = () => {
    if (!filteredLogs.length) return;

    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const getActionBadgeClass = (action?: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('create')) return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
    if (act.includes('delete') || act.includes('remove')) return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    if (act.includes('update') || act.includes('role')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

return (
     <AdminLayout
      title="Audit Trail"
      icon={getSectionIcon('audit')}
      actions={[
        {
          label: 'CSV',
          icon: Download,
          onClick: handleExportCSV,
          disabled: !filteredLogs.length,
          variant: 'ghost',
        },
        {
          label: 'JSON',
          icon: Download,
          onClick: handleExportJSON,
          disabled: !filteredLogs.length,
          variant: 'ghost',
        },
      ]}
      refreshAction={isFetching ? undefined : () => refetch()}
    >
      <div className="space-y-4">
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="input pl-9 text-xs w-full rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
                className="input text-xs w-full rounded-xl"
              >
                <option value="ALL">All Users / Admin Email</option>
                {uniqueUsers.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
                className="input text-xs w-full rounded-xl"
              >
                <option value="ALL">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card-body p-0">
            {error ? (
              <div className="p-4 alert alert-danger rounded-none">Failed to load audit logs: {getErrorMessage(error)}</div>
            ) : isLoading ? (
              <div className="p-5">
                <SkeletonTable rows={5} cols={6} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={searchQuery || selectedUser !== 'ALL' || selectedAction !== 'ALL' ? 'No matching audit records found' : 'No audit records yet'}
                hint="Try adjusting search parameters or filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4 w-16">ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Admin / Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target User</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono tabular-nums">#{log.id}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap tabular-nums">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {log.admin_email || <span className="text-slate-400 italic">System</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {log.target_email || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveDetailLog(log)}
                            className="btn btn-ghost btn-sm text-xs py-1 px-2.5"
                            aria-label={`View payload for audit entry ${log.id}`}
                          >
                            <Eye size={13} className="mr-1" />
                            View Payload
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                                </table>
              </div>
            )}

            {/* Pagination controls */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} · {logs?.length ?? 0} records shown{hasNextPage ? ' · more available' : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrevPage || isFetching}
                  className="btn btn-ghost btn-sm text-xs py-1 px-2.5"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage || isFetching}
                  className="btn btn-ghost btn-sm text-xs py-1 px-2.5"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payload Modal */}
      <AdminModal open={activeDetailLog !== null} onClose={() => setActiveDetailLog(null)} title={`Audit Entry Details #${activeDetailLog?.id ?? ''}`}>
        {activeDetailLog && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-slate-400 font-medium block">Action:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeDetailLog.action}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Admin / Actor:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeDetailLog.admin_email || 'System'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Details Payload:</span>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto text-[11px] font-mono border border-slate-800">
                {activeDetailLog.details
                  ? JSON.stringify(activeDetailLog.details, null, 2)
                  : 'No additional details payload.'}
              </pre>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setActiveDetailLog(null)} className="btn btn-secondary btn-sm text-xs">
                Close
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
}


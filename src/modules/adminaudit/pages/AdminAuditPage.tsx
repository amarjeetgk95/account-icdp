import { useState, useMemo } from 'react';
import { Search, Download, Filter, FileText, RefreshCw, Eye, X } from 'lucide-react';
import { useAdminAudit } from '../hooks/useAdminAudit';
import { AdminLayout } from '@/modules/admin/components/AdminLayout';
import type { AuditLogEntry } from '../types';

export function AdminAuditPage() {
  const { data: logs, isLoading, error, refetch, isFetching } = useAdminAudit(150);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [activeDetailLog, setActiveDetailLog] = useState<AuditLogEntry | null>(null);

  // Extract unique users and actions for filters
  const uniqueUsers = useMemo(() => {
    if (!logs) return [];
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.admin_email) set.add(log.admin_email);
      if (log.target_email) set.add(log.target_email);
    });
    return Array.from(set).sort();
  }, [logs]);

  const uniqueActions = useMemo(() => {
    if (!logs) return [];
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filter logs based on search query, user filter, and action filter
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (log.admin_email && log.admin_email.toLowerCase().includes(query)) ||
        (log.target_email && log.target_email.toLowerCase().includes(query)) ||
        log.action.toLowerCase().includes(query) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(query));

      const matchesUser =
        selectedUser === 'ALL' ||
        log.admin_email === selectedUser ||
        log.target_email === selectedUser;

      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;

      return matchesSearch && matchesUser && matchesAction;
    });
  }, [logs, searchQuery, selectedUser, selectedAction]);

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;

    const headers = ['ID', 'Date', 'Admin Email', 'Action', 'Target Email', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.created_at).toLocaleString(),
      l.admin_email || 'System',
      l.action,
      l.target_email || '',
      l.details ? JSON.stringify(l.details).replace(/"/g, '""') : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!filteredLogs.length) return;

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredLogs, null, 2)
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create')) return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
    if (act.includes('delete') || act.includes('remove')) return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    if (act.includes('update') || act.includes('role')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="card">
          <div className="card-header flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                Audit Logs Dashboard
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Track security operations, user role assignments, and administrative actions
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="btn btn-ghost btn-sm text-xs"
                title="Refresh audit logs"
              >
                <RefreshCw size={14} className={`mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExportCSV}
                disabled={!filteredLogs.length}
                className="btn btn-secondary btn-sm text-xs"
              >
                <Download size={14} className="mr-1.5" />
                Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                disabled={!filteredLogs.length}
                className="btn btn-secondary btn-sm text-xs"
              >
                <Download size={14} className="mr-1.5" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-xs w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400 shrink-0" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input text-xs w-full"
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
              <Filter size={16} className="text-slate-400 shrink-0" />
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="input text-xs w-full"
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
            {error && (
              <div className="p-4 alert alert-danger">
                Failed to load audit logs: {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            )}

            {isLoading ? (
              <div className="p-8 text-center text-slate-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                <p className="text-xs">Loading audit trail records...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No matching audit records found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting search parameters or filters</p>
              </div>
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
                        <td className="py-3 px-4 text-slate-400 font-mono">#{log.id}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
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
          </div>
        </div>
      </div>

      {/* Payload Modal */}
      {activeDetailLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  Audit Entry Details #{activeDetailLog.id}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(activeDetailLog.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
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
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setActiveDetailLog(null)}
                className="btn btn-secondary btn-sm text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

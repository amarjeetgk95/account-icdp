import type { AuditLogEntry, AuditLogFilterOptions } from '../types';

/**
 * Pure, testable filtering of an already-loaded page of audit entries.
 *
 * NOTE: the `admin_audit_list` RPC paginates by (limit, offset) on the server but
 * does not support server-side filtering by user/action/search. Filtering is
 * therefore applied to the current page; when a search/filter is active the UI
 * resets paging to page 1 so the most recent matching entries are shown first.
 */
export function filterAuditLogs(
  logs: AuditLogEntry[] | null | undefined,
  opts: AuditLogFilterOptions
): AuditLogEntry[] {
  if (!logs) return [];
  const query = (opts.searchQuery || '').toLowerCase().trim();
  const userFilter = opts.userFilter && opts.userFilter !== 'ALL' ? opts.userFilter : undefined;
  const actionFilter = opts.actionFilter && opts.actionFilter !== 'ALL' ? opts.actionFilter : undefined;

  return logs.filter((log) => {
    if (userFilter) {
      if (log.admin_email !== userFilter && log.target_email !== userFilter) return false;
    }
    if (actionFilter) {
      if (log.action !== actionFilter) return false;
    }
    if (query) {
      const inSearch =
        (log.admin_email && log.admin_email.toLowerCase().includes(query)) ||
        (log.target_email && log.target_email.toLowerCase().includes(query)) ||
        (log.action || '').toLowerCase().includes(query) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(query));
      if (!inSearch) return false;
    }
    return true;
  });
}

export function uniqueAuditUsers(logs: AuditLogEntry[] | null | undefined): string[] {
  if (!logs) return [];
  const set = new Set<string>();
  logs.forEach((log) => {
    if (log.admin_email) set.add(log.admin_email);
    if (log.target_email) set.add(log.target_email);
  });
  return Array.from(set).sort();
}

export function uniqueAuditActions(logs: AuditLogEntry[] | null | undefined): string[] {
  if (!logs) return [];
  const set = new Set<string>();
  logs.forEach((log) => {
    if (log.action) set.add(log.action);
  });
  return Array.from(set).sort();
}
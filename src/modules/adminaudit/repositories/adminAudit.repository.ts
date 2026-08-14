import { supabase } from '@/core/supabase/client';
import { rpcArray } from '@/shared/utilities';
import type { AuditLogEntry } from '../types';

export const adminAuditRepository = {
    async listAuditLogs(limit = 100, offset = 0): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase.rpc('admin_audit_list', {
        limit_count: limit,
        offset_count: offset,
      });
      if (error) {
        throw new Error(error.message || 'admin_audit_list RPC failed');
      }
      return rpcArray<AuditLogEntry>(data);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('Could not find the function') ||
          err.message.includes('Could not find the table'))
      ) {
                return this.listAuditLogsDirect(limit, offset);
      }
      throw err;
    }
  },
  async listAuditLogsDirect(limit = 100, offset = 0): Promise<AuditLogEntry[]> {
    const from = offset;
    const to = offset + limit - 1;
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('id, admin_email, action, target_email, details, created_at')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) {
      if (error.message.includes('Could not find the table')) {
        return [];
      }
      throw new Error(error.message || 'Failed to load audit logs');
    }
    return (data ?? []) as unknown as AuditLogEntry[];
  },
};

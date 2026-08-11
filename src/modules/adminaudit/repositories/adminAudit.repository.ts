import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { AuditLogEntry } from '../types';

function asArray<T>(data: Json | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as unknown as T[];
  return [];
}

export const adminAuditRepository = {
  async listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase.rpc('admin_audit_list', { limit_count: limit });
    if (error) throw error;
    return asArray<AuditLogEntry>(data);
  },
};

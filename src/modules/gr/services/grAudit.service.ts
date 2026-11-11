import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import type { Database } from '@/shared/database.types';
import type { Json } from '@/shared/json.types';
import type { GRAuditLog } from '../types';

type DBClient = SupabaseClient<Database>;
type AuditRow = Database['public']['Tables']['gr_audit_logs']['Row'];

export interface GRAuditLogInput {
  grId?: string | null;
  grNumber?: string | null;
  action: GRAuditLog['action'];
  previousVisibility?: string | null;
  newVisibility?: string | null;
  details?: Record<string, unknown> | null;
}

export class GRAuditService {
  constructor(private readonly client: DBClient = defaultSupabase) {}

  async logAction(params: GRAuditLogInput): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { error: rpcError } = await this.client.rpc('gr_log_action', {
      p_gr_id: params.grId || null,
      p_gr_number: params.grNumber || null,
      p_action: params.action,
      p_prev_visibility: params.previousVisibility || null,
      p_new_visibility: params.newVisibility || null,
      p_details: (params.details || null) as Json | null,
    });

    if (!rpcError) return;

    try {
      await this.client.from('gr_audit_logs').insert({
        gr_id: params.grId || null,
        gr_number: params.grNumber || null,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role || 'office',
        action: params.action,
        previous_visibility: params.previousVisibility || null,
        new_visibility: params.newVisibility || null,
        details: (params.details || null) as Json | null,
      });
    } catch (err) {
      console.warn('[GRAuditService] Could not write audit log:', err);
    }
  }

  async fetchAuditLogs(grId?: string, limit = 50): Promise<GRAuditLog[]> {
    let query = this.client
      .from('gr_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (grId) {
      query = query.eq('gr_id', grId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[GRAuditService] Could not fetch audit logs:', error.message);
      return [];
    }

    return (data || []).map((row: AuditRow) => ({
      id: row.id,
      gr_id: row.gr_id,
      gr_number: row.gr_number,
      user_id: row.user_id,
      user_email: row.user_email,
      user_role: row.user_role,
      action: row.action as GRAuditLog['action'],
      previous_visibility: row.previous_visibility,
      new_visibility: row.new_visibility,
      details: (row.details as Record<string, unknown> | null) ?? null,
      created_at: row.created_at || new Date().toISOString(),
    }));
  }
}

export const grAuditService = new GRAuditService();

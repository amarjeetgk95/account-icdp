import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type {
  SystemStats,
  UserInfo,
  OfficeStats,
  Office,
  DataEntryReportRow,
  OfficeCompletion,
  AuditLogEntry,
} from '../types';

function messageOf(data: Json | null, fallback: string): string {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
  }
  return fallback;
}

function asArray<T>(data: Json | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as unknown as T[];
  return [];
}

export const adminRepository = {
  async getSystemStats(): Promise<SystemStats> {
    const { data, error } = await supabase.rpc('get_system_stats').single();
    if (error) throw error;
    return data as unknown as SystemStats;
  },

  async getOfficeStats(): Promise<OfficeStats[]> {
    const { data, error } = await supabase.rpc('admin_office_stats');
    if (error) throw error;
    return asArray<OfficeStats>(data);
  },

  async listUsers(): Promise<UserInfo[]> {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) throw error;
    return asArray<UserInfo>(data);
  },

  async listOffices(): Promise<Office[]> {
    const { data, error } = await supabase.rpc('admin_list_offices');
    if (error) throw error;
    return asArray<Office>(data);
  },

  async setUserRole(userId: string, role: 'admin' | 'office', officeId: string | null): Promise<string> {
    const { data, error } = await supabase.rpc('admin_set_role', {
      user_id: userId,
      new_role: role,
      new_office_id: officeId,
    });
    if (error) throw error;
    return messageOf(data, 'Role updated');
  },

  async deleteUser(userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('admin_deleteUser', { user_id: userId });
    if (error) throw error;
    return messageOf(data, 'User deleted');
  },

  async createOffice(name: string, district: string): Promise<Office> {
    const { data, error } = await supabase.rpc('admin_create_office', {
      office_name: name,
      office_district: district,
    });
    if (error) throw error;
    return data as unknown as Office;
  },

  async createUser(email: string, password: string, role: string, officeId: string): Promise<string> {
    const { data, error } = await supabase.rpc('admin_create_user', {
      user_email: email,
      user_password: password,
      user_role: role,
      user_office_id: officeId,
    });
    if (error) throw error;
    return messageOf(data, 'User created');
  },

  async inviteUser(email: string, role: string, officeId: string): Promise<string> {
    const { data, error } = await supabase.rpc('admin_invite_user', {
      user_email: email,
      user_role: role,
      user_office_id: officeId,
    });
    if (error) throw error;
    return messageOf(data, 'Invitation created');
  },

  async getDataEntryReport(): Promise<DataEntryReportRow[]> {
    const { data, error } = await supabase.rpc('admin_data_entry_report');
    if (error) throw error;
    return asArray<DataEntryReportRow>(data);
  },

  async getEntryCompletion(): Promise<OfficeCompletion[]> {
    const { data, error } = await supabase.rpc('admin_entry_completion');
    if (error) throw error;
    return asArray<OfficeCompletion>(data);
  },

  async getFinancialYears(officeId: string): Promise<number[]> {
    const { data, error } = await supabase.rpc('admin_office_financial_years', {
      target_office_id: officeId,
    });
    if (error) throw error;
    return (data as unknown as number[]) || [];
  },

  async listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase.rpc('admin_audit_list', { limit_count: limit });
    if (error) throw error;
    return asArray<AuditLogEntry>(data);
  },
};

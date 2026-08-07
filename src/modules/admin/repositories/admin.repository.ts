import { supabase } from '@/core/supabase/client';
import type {
  SystemStats,
  UserInfo,
  OfficeStats,
  Office,
  DataEntryReportRow,
} from '../types';

export const adminRepository = {
  async getSystemStats(): Promise<SystemStats> {
    const { data, error } = await supabase.rpc('get_system_stats').single();
    if (error) throw error;
    return data as unknown as SystemStats;
  },

  async getOfficeStats(): Promise<OfficeStats[]> {
    const { data, error } = await supabase.rpc('admin_office_stats');
    if (error) throw error;
    return (data || []) as unknown as OfficeStats[];
  },

  async listUsers(): Promise<UserInfo[]> {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) throw error;
    return (data || []) as unknown as UserInfo[];
  },

  async listOffices(): Promise<Office[]> {
    const { data, error } = await supabase.rpc('admin_list_offices');
    if (error) throw error;
    return (data || []) as unknown as Office[];
  },

  async setUserRole(userId: string, role: 'admin' | 'office', officeId: string | null): Promise<string> {
    const { data, error } = await (supabase as any).rpc('admin_set_role', {
      user_id: userId,
      new_role: role,
      new_office_id: officeId,
    });
    if (error) throw error;
    return (data as any)?.message || 'Role updated';
  },

  async deleteUser(userId: string): Promise<string> {
    const { data, error } = await (supabase as any).rpc('admin_deleteUser', {
      user_id: userId,
    });
    if (error) throw error;
    return (data as any)?.message || 'User deleted';
  },

  async createOffice(name: string, district: string): Promise<Office> {
    const { data, error } = await (supabase as any).rpc('admin_create_office', {
      office_name: name,
      office_district: district,
    });
    if (error) throw error;
    return data as unknown as Office;
  },

  async createUser(email: string, password: string, role: string, officeId: string): Promise<string> {
    const { data, error } = await (supabase as any).rpc('admin_create_user', {
      user_email: email,
      user_password: password,
      user_role: role,
      user_office_id: officeId,
    });
    if (error) throw error;
    return (data as any)?.message || 'User created';
  },

  async getDataEntryReport(): Promise<DataEntryReportRow[]> {
    const { data, error } = await supabase.rpc('admin_data_entry_report');
    if (error) throw error;
    return (data || []) as unknown as DataEntryReportRow[];
  },
};
